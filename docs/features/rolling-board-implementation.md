# Rolling board — implementation notes

Manager-domain companion to `rolling-board.md`. CEO does not need to read this.

## Component map

| Path                                              | Role                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `supabase/migrations/0031_leaderboard_recent.sql` | `private.recent_gain(uuid)` + appends `recent_score` to `leaderboard_public`       |
| `lib/leaderboard.ts`                              | `getRecentLeaderboard()` / `getLeaderboard()`, both over `readBoard(page, window)` |
| `app/[locale]/leaderboard/recent/page.tsx`        | The rolling board route                                                            |
| `app/leaderboard/recent/page.tsx`                 | Non-locale stub, matching the other three boards                                   |
| `components/leaderboard/period-tabs.tsx`          | Window switcher, rendered on both token boards                                     |
| `components/leaderboard/showcase-card.tsx`        | One player as a card                                                               |
| `app/sitemap.ts`                                  | `/leaderboard/recent`, priority 0.7                                                |
| `messages/{en,zh,ja,ko}.json`                     | 23 keys added under `LeaderboardPage`                                              |

## Requirements (EARS)

- WHEN a visitor requests the rolling board THE SYSTEM SHALL order players by
  `recent_score` descending, then by `id` ascending.
- WHEN a player's `recent_score` is zero THE SYSTEM SHALL exclude them from both
  the rows and the pager count.
- WHEN `leaderboard_history` holds a row for a player whose `reason` is not
  `'update'` THE SYSTEM SHALL exclude that row's `delta` from `recent_gain`.
- WHEN the summed deltas for a player are negative THE SYSTEM SHALL report zero.
- WHEN a player's windowed sum exceeds their current `score` THE SYSTEM SHALL report
  their `score` instead.
- WHEN a player's rank is 5 or better and they have no project THE SYSTEM SHALL
  render the empty-slot prompt; otherwise it SHALL render nothing in that area.
- WHEN the rolling board's read fails THE SYSTEM SHALL render the error banner and
  the page shell, and SHALL NOT affect `/leaderboard`.
- THE SYSTEM SHALL NOT grant any role other than `service_role` direct SELECT on
  `public.leaderboard_history`.

## State Coordination Invariants

These are the ones that will break quietly. Each is load-bearing.

1. **The board is NOT a pure function of `leaderboard_history`.** It is
   `least(window aggregate, leaderboard.score)`, and that cap is the only thing
   keeping withheld gains from buying rank.

   0031 shipped without the cap on a reasoning error worth recording. It assumed
   held tokens never enter `delta`, because `delta` tracks `score`. The order is
   the other way round: a sync raises `score` and 0010's trigger records the
   positive delta; the hold happens **afterwards**, moving the increase into
   `held_tokens`, and because `score` is derived (`raw_score - held_tokens`,
   0016:71) it drops — **writing no history row at all.**

   Measured 2026-08-18 on `6ab041c7-e522-43f7-8817-de88afe2a086`: 18 history rows,
   last `new_score` 1,774,664,155, **not one negative delta**, against a live
   `score` of 14,105,962 and `held_tokens` of 1,760,558,193. Under 0031 alone that
   account ranked 3rd on the board at 1.43B. 0032 caps it to 14,105,962 — 8th.

   The cap is an identity transform for honest accounts: `score` is the sum of
   every awarded delta ever, so any window sum is a subset of it and can exceed it
   only when something removed tokens from `score` without recording it. Verified
   across all 20 rows — 1 account changed, the other 19 byte-identical.

   **Any migration that changes the `raw_score` / `held_tokens` / `score`
   relationship must come back and re-examine `private.recent_gain`.**

2. **`leaderboard_public` must keep `security_invoker = true`.** Without it 0005's
   ban policy stops applying to visitors. 0031 re-declares the view, so the flag
   has to be re-stated every time the view is touched — this is how 0025 took the
   whole board down.

3. **`recent_gain` must stay in `private`.** PostgREST does not expose that
   schema, so anon cannot call the function directly and enumerate per-account
   activity. A `public` equivalent with EXECUTE to anon is an oracle; that is
   exactly the mistake 0026 made with `project_visible` and 0028 had to undo.

4. **Anon must never hold SELECT on `leaderboard_history`.** That table is the
   per-sync timeline. The privacy notice explicitly refuses to publish it ("a
   5-minute-resolution record … would amount to a log of when you work and when
   you sleep"). The definer function exists precisely so the view can rank on an
   aggregate without the grant. Self-check 3.1 in 0031 asserts the 42501.

5. **Re-granting after `create or replace view`.** Postgres does not restore
   grants when a view is replaced. 0031 re-grants to `anon, authenticated,
service_role` — omitting `service_role` is what killed the entire `/ranger`
   console in 0025.

6. **The two boards must not share one select string.** `readBoard` spells out two
   literal column lists. The lifetime board omits `recent_score` so that deploying
   this code before applying 0031 degrades only the new page. Merging them would
   reintroduce the 0025-class ordering hazard. (They also have to be literals, not
   a variable — supabase-js infers the row type from the literal and collapses
   everything to `GenericStringError` otherwise.)

## Why `reason = 'update'` and not a plain 30-day slice

`insert` rows carry a player's entire pre-app history in one delta. Measured in
the 30-day window on 2026-08-17: 13 insert rows totalling 10,456,307,316 tokens —
**33% of everything in the window**. Including them puts a day-one installer at
the top of a board about the last month.

`backfill` (4 rows, 6.61B, an admin action from 0011) is excluded for the same
reason.

Coverage is unaffected by the exclusion — both algorithms yield 17 ranked players;
the leader's share moves from 66.3% to 56.0%.

## Performance

`recent_gain` is called per row, so ranking evaluates it across the table. Fine at
20 rows over the `leaderboard_history_user_at` index (0006). **Not fine at ten
thousand players** — at that point it needs a materialised view or a scheduled
rollup. Recorded here rather than pre-built.

## Accepted risks

- **No test coverage.** The repo has no test runner. Every claim above was checked
  by hand against production reads on 2026-08-17.
- **Publishing a windowed total is new information.** It is a single aggregate per
  player, the same shape as `score`, and derived server-side from data already
  held — so it does not touch the "never uploaded" list and needs no privacy
  notice change. It does let a reader tell recent activity from old activity, which
  `updated_at` already reveals more precisely. Flagged as a judgement, not an
  oversight; a _daily_ breakdown would be a different question and is refused.
- **`EMPTY_PROMPT_THROUGH_RANK = 5`** is a guess. There is no traffic data.
