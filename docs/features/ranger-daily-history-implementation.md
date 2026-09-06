# Ranger daily history — implementation notes

Manager-domain companion to `ranger-daily-history.md`. CEO does not need to read this.

## Component map

| Path                              | Role                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `lib/ranger/analysis.ts`          | new `groupByDay(display, full)` → `DayRow[]`; `monthsOf`, `utcDayKey`, `utcMonthKey`, `resolveMonthParam`; reuses `THRESHOLDS`, `fmtGap`, `fmtRate` |
| `lib/ranger/data.ts`              | history `.limit(200)` → `.limit(2000)` (see § Why the cap moves)                                            |
| `app/ranger/[userId]/page.tsx`    | day-grouped table, nested per-event rows, month picker above the charts, `month`/`day`/`expand` URL state   |
| `lib/ranger/i18n.ts`              | new keys, `en` + `zh` (weekday abbreviations, day-table headers, month picker, ceiling-share column, hints) |
| `components/ranger/charts.tsx`    | untouched — charts receive already-filtered point arrays                                                    |
| `app/ranger/batch-bar.tsx`        | recount now keyed on the open day (tick-boxes are swapped out by a soft nav with no `change` event)          |
| `lib/ranger/tests/daily-history.test.ts` | 30 tests, `npm test`, no framework — Node runs `.ts` and ships `node:test`                            |
| `tsconfig.json`                   | `allowImportingTsExtensions` — the runner needs explicit `.ts` specifiers                                    |
| `package.json`                    | `test` script                                                                                               |
| `.harness/scripts/precommit-cycles.sh` | the placeholder `madge --circular src/` never customised for this repo; it reported ENOENT as a cycle on every commit |
| `scripts/` (one-off, not shipped) | the data correction; run once against production, backup written outside the repo                           |

No new route, no new component file, no `"use client"` boundary. `/ranger` is
server-rendered with URL-driven filters and form-posting actions; this stays inside
that idiom.

## URL state

| Param    | Values                  | Absent means  |
| -------- | ----------------------- | ------------- |
| `view`   | `flagged`               | `all`         |
| `sort`   | `jump` \| `rate`        | `time`        |
| `month`  | `YYYY-MM`               | all months    |
| `day`    | `YYYY-MM-DD`            | no day open   |
| `expand` | history row id (number) | no event open |

`expand` is only honoured for an event inside the currently open `day`; changing
`day` drops `expand`. Changing `month` drops both `day` and `expand`.

`sort` semantics move from events to days: `jump` = biggest day gain, `rate` =
fastest day rate. `view=flagged` keeps days containing a `watch`/`suspicious`
event.

## The day aggregate

`groupByDay` runs over the **already-analysed** `AnalyzedRow[]` (so severity,
`trueDelta`, acknowledgement and hold state are settled before grouping) and buckets
on `at`'s **UTC** calendar date — the whole page already prints and thinks in UTC.

```ts
type DayRow = {
  key: string; // "2026-09-05"
  events: AnalyzedRow[]; // newest-first, as displayed
  count: number; // non-baseline events
  gain: number; // Σ (trueDelta ?? delta) over non-baseline events
  windowSeconds: number; // see below; 0 when unmeasurable
  rate: number | null; // gain / windowSeconds
  ceilingPct: number | null; // gain ÷ (SUS_BURST + SUS_RATE × windowSeconds)
  worstEventPct: number | null; // max per-event share of ITS OWN ceiling; shown when the day has anything flagged/acknowledged/over-ceiling
  severity: Severity; // max over the day's events
  flaggedCount: number; // events at watch|suspicious after acknowledgement
  acknowledgedCount: number; // events an admin ruled reviewed-OK (severity rewritten to normal)
  heldCount: number;
  heldTokens: number;
  baselineOnly: boolean; // the day holds nothing but the starting snapshot
};
```

**The window.** `windowSeconds = lastEventAt − max(dayStartUTC, prevEventAt)`, where
`prevEventAt` is the timestamp of the last event **before** this day across the whole
history (not just the filtered slice).

Only the OLDEST day has no `prevEventAt`, and there the answer depends on something the
day itself cannot see. `startsAtBaseline` — `fullAsc[0].oldScore === null` — decides it:

- **true** → the read really does begin at the player's baseline snapshot, so this is
  their first day and the window opens at its own first event (a single-event first day
  yields `0`).
- **false** → an earlier event exists that we do not hold: the read stopped at
  `HISTORY_LIMIT`, or the account predates 0006's capture trigger (which is the common
  case — `Ericccccc`'s oldest row carries `old_score = 7555701622`). The window is
  **unmeasurable**, `start` is `null`, and `windowSeconds` is `0`.

The false branch is not pedantry. Opening at the day's own first event shortens the
window to the slice we happen to hold, so the SAME day reads several times faster and
closer to the ceiling — measured on the reviewer's repro, 79,200s/20% became
7,200s/74%, which crosses from `normal` into `watch`. A severity that depends on where
the read stopped is worse than no number.

`windowSeconds < 1` ⇒ `rate` and `ceilingPct` are both `null`, rendered `—`. The floor
mirrors the per-event `effGap = Math.max(gapSeconds, 1)`: without it a day whose only
send lands at `00:00:00.500Z` reported 600M tok/s beside a window label reading
"instant", and won `sort=rate` outright.
`gain <= 0` ⇒ `ceilingPct` is `null` (a ceiling bounds production; a loss produced
nothing). `gain` may still be negative and is rendered as such.

**Why this window and not "since the previous send".** Every other number on the
line is scoped to the day; a window that reaches back across days would make the
rate answer a different question from the gain sitting next to it. The window
length is printed under the rate for exactly this reason — the number is only
readable with it.

**Ceiling tier.** `suspicious`, not `watch` — identical to the per-event
`headroomBars` chart the page already draws (`page.tsx`, chart 3), which is the
whole point of adopting this measure: chart and table now agree.

**Cost.** One pass, not one per day. `groupByDay` walks the day keys in ascending order
and advances a single index over `fullAsc`, because `keysAsc` only ever moves forward.
The obvious `fullAsc.filter(r => toMs(r.at) < dayMs)` inside the day loop is O(events ×
days) and measured 112 ms of blocking server CPU at 2000 rows over 400 days — the sizing
`HISTORY_LIMIT` was just raised to permit — against 4.2 ms for the single pass. This is a
`force-dynamic` route, so that cost is paid on every render.

**`worstEventPct` recomputes a ceiling that `analyzeHistory` left null.** Two verdicts
return before `ceiling` is assigned: `gain < 0` and the `isX100` migration whitelist
(`analysis.ts`, the `if (gain < 0) … else if (isX100) …` chain). Skipping those rows
would leave the clause's own precondition unreachable for exactly the shape an attacker
can choose — `newScore === oldScore × 100` is client-supplied and the client knows its
own score, so a 4.96e9 send wearing it produced **no day-level trace at all**. The
elapsed time is known either way, so `groupByDay` falls back to
`SUS_BURST + SUS_RATE × max(0, gapSeconds)` per event. A decrease then scores
`max(0, gain)/ceiling = 0` (harmless — the day is already `suspicious` from severity),
and the ×100 send scores 157% and is disclosed. `analyzeHistory` and the charts are
deliberately NOT touched: the whitelist still clears the row's severity, as it should.

`eventCeilPct` in `page.tsx` carries the **same** fallback, and must keep carrying it. The
per-event column is the drill-down for the day line's figure; if only the day line
recomputed, an admin following a red "worst send 157%" into the day would find a dash in
the very cell the alarm points at — the detail contradicting the summary that sent them
looking is worse than either number being absent.

## Month scoping

`monthsOf(rows)` returns the distinct `YYYY-MM` (UTC) present in the loaded history,
descending. The picker renders `All` plus those; it never offers a month with no rows,
so 3.1's "malformed or unknown month" path is reachable only by hand-editing the URL.

An unrecognised `month` value is coerced to "all" at parse time — the same posture
`view`/`sort` already take. It is never surfaced as an error.

When `month` is set, the four chart source arrays and the day list are all built from
`rows.filter(inMonth)`. The **account summary panel and the verdict banner are built
from the unfiltered `rows`** — deliberate, per spec § 2.3.5. `detectThrottling` also
stays unfiltered: it is an account-level shape test, and a one-month slice of it would
be noise.

## Requirements (EARS)

- WHEN the page renders the change history THE SYSTEM SHALL emit one row per UTC
  calendar day that holds at least one history entry, ordered by day descending.
- WHEN a day is grouped THE SYSTEM SHALL compute its gain as the sum of
  `trueDelta ?? delta` over that day's non-baseline entries, withheld entries included.
- WHEN a day's window is under one second THE SYSTEM SHALL render `—` for that day's
  rate and ceiling share, and SHALL NOT divide by zero or by a fraction.
- WHEN the oldest day has no preceding entry AND the loaded history does not begin with
  a baseline entry THE SYSTEM SHALL treat that day's window as unmeasurable rather than
  opening it at the day's own first entry.
- WHEN a day contains an entry an admin has acknowledged THE SYSTEM SHALL report that
  count on the day line and SHALL keep the worst single entry's share visible.
- WHEN a day's gain is zero or negative THE SYSTEM SHALL render `—` for its ceiling
  share.
- WHEN a day contains only a baseline entry THE SYSTEM SHALL render `—` for gain, rate
  and ceiling share, label it as the starting snapshot, and exclude it from the
  "all days" count beside the filters.
- WHEN any entry inside a day carries severity `watch` or `suspicious` THE SYSTEM SHALL
  render that day at the highest such severity together with a count of flagged entries
  over total entries.
- WHEN a day contains any entry at severity `watch` or `suspicious`, any acknowledged
  entry, or any entry whose own share of its own ceiling exceeded 100%, THE SYSTEM SHALL
  render that worst entry's share alongside the day's own share — in the over-ceiling colour above 100%, muted
  below it — irrespective of the day's own share.
- WHEN a day contains no such entry THE SYSTEM SHALL render the day's own share alone.
- WHEN the history read returns the full 2000 rows THE SYSTEM SHALL render a truncation
  notice above the day list and SHALL NOT present the month picker as covering the
  player's whole record.
- WHEN the "flagged" view is active THE SYSTEM SHALL keep days containing at least one
  `watch`/`suspicious` entry OR whose `worstEventPct` exceeds 100, SHALL use that same
  predicate for the count on the chip, and SHALL render every entry of an opened day,
  not only the flagged ones.
- WHEN a sort is applied THE SYSTEM SHALL place baseline-only days last and rank days
  with no measurable rate below every day that has one.
- WHEN a day is not open THE SYSTEM SHALL NOT emit tick-boxes for its entries.
- WHEN the `month` parameter names a month with no entries, is malformed, or is absent
  THE SYSTEM SHALL render the unfiltered record and SHALL NOT surface an error.
- WHEN `month` is set THE SYSTEM SHALL build all four charts and the day list from that
  month's entries only, and SHALL build the account summary panel, verdict banner and
  throttle verdict from the full record.
- WHEN `day` changes THE SYSTEM SHALL drop `expand`; WHEN `month` changes THE SYSTEM
  SHALL drop both `day` and `expand`.
- THE SYSTEM SHALL read up to 2000 history entries per player.
- THE SYSTEM SHALL NOT alter any hold, release, acknowledge or ban behaviour.

## State Coordination Invariants

1. **Grouping happens after analysis, never before.** `analyzeHistory` needs each
   event's immediate predecessor to compute `gapSeconds`, `rate` and the ceiling it was
   judged against. Grouping first, or filtering by month first, would sever the first
   event of each group from its predecessor and silently re-judge it — an event that was
   `normal` would become a `baseline`-shaped orphan with no ceiling applied. **Order is
   load-bearing: analyse the full history → group → filter → sort.**

2. **The month filter must not reach `analyzeHistory` either.** Same reason, one level
   up: a month slice's first event would lose its predecessor and its interval, and its
   severity would change depending on which month you were looking at. Severity must be
   a property of the event, not of the view.

3. **`prevEventAt` for the day window comes from the unfiltered history.** If it came
   from the month slice, the first day of every month would measure its window from its
   own 00:00 regardless of whether the player synced at 23:50 the night before — making
   the first day of each month systematically look faster and closer to the ceiling than
   it was.

4. **A day's rolled-up ceiling share is not a substitute for the per-event one.** The
   day aggregate divides a day's gain by a day-length ceiling; a single send that
   produced 240% of what was possible in its own eleven minutes lands at perhaps 38%
   once spread across the day. `worstEventPct` is therefore computed from each event's
   own `ceiling` (already on `AnalyzedRow`, already the `suspicious` tier) and rendered
   whenever the day holds anything flagged or over-ceiling — never from the day aggregate. If this is ever dropped as
   redundant with the severity badge, the day view becomes a place to hide one bad send
   inside a busy day, which is the single failure mode this whole regrouping risks.

5. **The day's gain includes withheld entries**, exactly as `HistorySummary.totalGained`
   does — neither regards `quarantined`. The two agree on any history with no decrease.
   They do NOT agree in general, and the earlier wording of this invariant was simply
   false: `totalGained` clamps each row with `Math.max(0, …)` while the day gain does not,
   so on a history containing a decrease `Σ day.gain` is lower by exactly the magnitude of
   the clamped losses. Both numbers render on one screen (`aGained` in the summary panel,
   the Delta column in the table), so the discrepancy is visible — but do **not** "fix" the
   day gain to match: CEO spec § 3.3 requires the day to print the negative figure. Pinned
   from both sides by tests T11 (they differ, by exactly the loss) and T23 (they agree).

## Why the cap moves from 200 to 2000

`getRangerUserDetail` caps the history read at 200 rows. Measured 2026-09-06:
`Ericccccc` 182, `SmilingMiles` 152, `彦祖` 67. At the current pace the busiest account
crosses 200 within weeks, and when it does the month picker starts offering a set of
months that quietly excludes the oldest ones — the picker would be lying, which is worse
than the truncation it inherits. 2000 rows is ~5 years of the busiest current account and
still one bounded query.

2000 is still a cap, so the truncation notice ships with it rather than waiting: when the
read comes back with exactly `limit` rows, the page says the record is cut off. Costs one
comparison and removes the class of bug entirely.

## The data correction (one-off)

Target: `Ericccccc`, `fa9ae52a-b8cc-4a7c-b3ff-e141574f8f28`.

| id  | field                 | from              | to            |
| --- | --------------------- | ----------------- | ------------- |
| 82  | `true_delta`          | `8053570953`      | `497869331`   |
| 485 | (whole row)           | `17219846933 → 0` | **deleted**   |
| 486 | `old_score`           | `0`               | `17219846933` |
| 486 | `delta`, `true_delta` | `17433498018`     | `213651085`   |

`new_score` on 486 is **not** touched (`17433498018`), which is what keeps every
downstream number identical.

**Why these three and not others.** Row 82's `delta` (`497869331`) and its bucket
evidence (`bkt_sum = 497869331`) already agree with each other; only `true_delta` holds
the full running total, which is the 0016 re-insert restatement applied to a row that was
not a re-insert. Row 486's `bkt_sum` is `213651085`, which is exactly
`17433498018 − 17219846933` — the client's own evidence says the reset was cosmetic.

**Blast radius, checked before writing:**

- `leaderboard.score` / `raw_score` / `held_tokens` — not read from, not written by this
  change. Total stays `27330944887`.
- **`HistorySummary.totalGained` and `largestJump` DO change**, and are meant to.
  `analyzeHistory` sums `max(0, trueDelta ?? delta)`, which is precisely the corrupted
  field: `totalGained` falls by `7555701622 + 17219846933 = 24775548555`, and
  `largestJump` falls from `17433498018` to the true maximum `678235491` (id 560,
  2026-08-27). Row 485 contributes nothing either way — its `trueDelta` is negative and
  already clamped to 0. This is an admin-only panel with no public surface; the numbers
  it shows today are wrong and the correction is what fixes them.
- `private.recent_gain` (0032) sums `delta` for `reason = 'update'` inside a 30-day
  window, then caps at `score`. 15 Aug is inside today's window; before the change the
  pair contributes `−17219846933 + 17433498018 = +213651085`, after it row 486 alone
  contributes `+213651085`. Identical. 18 Jul is outside any 30-day window.
- Triggers: `leaderboard_capture_history` fires on `public.leaderboard`, not on
  `leaderboard_history`. Editing history fires nothing.
- `leaderboard_history_reviews` references history ids; check for a row against 485
  before deleting and remove it in the same transaction if present.
- Row 486's `hold_reasons` (`{wallclock}`) and `decided_by` are left alone — they record a
  judgement a human actually made. They render only when `quarantined` is true, which it
  is not.

**Procedure:**

1. Dump the three rows to a JSON file outside the repository.
2. Record, before touching anything: `leaderboard.score` for this player, and
   `private.recent_gain(uid)` — the live 30-day figure, not the reasoning above about
   what it should be.
3. Apply the three writes (82's `true_delta`, 485's deletion, 486's `old_score` +
   `delta` + `true_delta`), plus any `leaderboard_history_reviews` row keyed on 485.
4. Re-read both numbers and assert they are byte-identical to step 2. If `recent_gain`
   moved, restore from the dump — the reasoning was wrong and the spec's central claim
   with it.

Step 2/4 exists because the argument that `recent_gain` is unchanged is a derivation,
and derivations about production data are checked, not trusted. 15 August is inside the
current window, so this is the one place the claim can actually fail.

**Applied 2026-09-05.** The writes are one-off and live in no committed script — this
table and this record ARE the artifact. A guard refused to write unless all four fields of
all three rows matched the values above exactly; they did. Backup written outside the repo
first. Measured either side of the writes, all five byte-identical:

| | before | after |
| --- | --- | --- |
| `leaderboard.score` | 27,403,046,360 | 27,403,046,360 |
| `raw_score` | 27,403,046,360 | 27,403,046,360 |
| `held_tokens` | 0 | 0 |
| `leaderboard_public.score` | 27,403,046,360 | 27,403,046,360 |
| `leaderboard_public.recent_score` (30d) | 13,326,767,293 | 13,326,767,293 |

One review row keyed on 485 existed and was removed in the same pass. As predicted, the
admin-only summary DID move: `totalGained` 44,622,893,293 → 19,847,344,738 and
`largestJump` 17,433,498,018 → 678,235,491 (2026-08-27, id 560) — the panel being
corrected, with no public surface involved.


## Defects the adversarial pass found, and where they went

Twelve agents reviewed the first implementation — five deriving tests from the spec with
the day-grouping code withheld from them, six attacking the code on distinct lenses, one
synthesising. Thirteen findings survived. What happened to each:

**Fixed in code**

| # | Defect | Fix |
| - | ------ | --- |
| 1 | "Flagged (N)" chip counted a baseline-excluded array while the table filtered a different one — a day whose only entry was a flagged starting snapshot rendered under a chip reading 0 | group once (`grouped`), derive both counts and both filters from it |
| 2 | `view=flagged` dropped a day whose worst send was 250% of its own ceiling, because the predicate read `flaggedCount` alone and acknowledgement zeroes it — § 3.5b says the disclosure holds "regardless of the filter in effect" | `isFlaggedDay` = `flaggedCount > 0 \|\| (worstEventPct ?? 0) > 100`, used by the filter AND the chip |
| 3 | A `×100`-shaped send of 4.96e9 left no day-level trace: the whitelist returns before `ceiling` is assigned, so the row could not contribute to `worstEventPct` | recompute the ceiling per event in `groupByDay` |
| 4 | The oldest day borrowed the "player's first day" rule, so a truncated read made an honest day read 74% instead of 20% and cross into `watch` | `startsAtBaseline` — unmeasurable unless the record demonstrably starts at the beginning |
| 5 | Acknowledging a send under 100% erased every day-level trace of it; the old top-level list showed its "reviewed" badge | `acknowledgedCount` on `DayRow`, in the disclosure gate and on the day line |
| 6 | No lower floor on the day window: a send at `00:00:00.500Z` reported 600M tok/s beside "instant" and won `sort=rate` | floor at 1s, mirroring `effGap` |
| 7 | The month-scoped empty state said "no records in this month", which was false in 100% of the states it could render (a set month provably has rows; the flagged filter emptied it) | branch on the cause |
| 8 | `expand` was the only URL param not coerced; junk became `NaN` and was written back into every link as `expand=NaN` | `/^\d+$/` guard, matching every other param |
| 9 | `fmtCeil` rounded while the red gate tested the raw value, so 99.6% and 100.4% both printed "100%", one of them green | `Math.floor` |
| 10 | `sort=rate`'s `?? -1` interleaved unmeasurable days between real numbers; `sort=jump` ranked a baseline day (synthetic gain 0, rendered "—") above a real loss | park baseline-only last, `-Infinity` sentinel |
| 11 | `groupByDay` called twice per render with identical arguments — 550ms of blocking CPU at the documented 2000-row sizing | hoisted (same edit as #1) |
| 12 | Opening a different day swapped the tick-boxes out with no `change` event, so the batch bar kept claiming N selected while the form carried none | `openDay` in the effect's dependency list |

**Fixed in the spec, not the code**

| # | Finding | Resolution |
| - | ------- | ---------- |
| 13 | State Coordination Invariant 5 asserted the day gains and `totalGained` agree. They cannot, on any history with a decrease | invariant reworded above; the day aggregate is the side that is right, per CEO § 3.3 |

**Known and deliberately left**

On a day whose only flagged entry is a decrease, `worstEventPct` names the largest
*producing* send (a decrease produces nothing, so it scores 0). The figure is accurate
and the day already carries the `suspicious` badge and its flagged count, so nothing is
hidden — but the label "worst send" is doing double duty. Not worth a second column.
