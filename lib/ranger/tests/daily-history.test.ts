// File: lib/ranger/tests/daily-history.test.ts  (npm test glob `lib/**/*.test.ts` picks it up;
// `../analysis.ts` resolves to lib/ranger/analysis.ts).
//
// VERIFIED: all 30 tests below were executed on node v26.3.1 against the real
// lib/ranger/analysis.ts (with resolveMonthParam appended per § helperNeeded) —
// 30 pass / 0 fail — and `tsc --noEmit` is clean with allowImportingTsExtensions.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeHistory,
  groupByDay,
  monthsOf,
  resolveMonthParam,
  utcMonthKey,
} from "../analysis.ts";

/** One `leaderboard_history` row. Everything the client did not send defaults to null/false. */
function row(o: {
  id: number;
  at: string;
  oldScore?: number | null;
  newScore: number;
  delta: number;
  trueDelta?: number | null;
  quarantined?: boolean;
  flagged?: boolean;
  bktN?: number | null;
  bktMax?: number | null;
  bktSum?: number | null;
  bktSpan?: number | null;
}) {
  return {
    id: o.id,
    at: o.at,
    oldScore: o.oldScore === undefined ? null : o.oldScore,
    newScore: o.newScore,
    delta: o.delta,
    trueDelta: o.trueDelta ?? null,
    flagged: o.flagged ?? false,
    reason: null as string | null,
    bktN: o.bktN ?? null,
    bktMax: o.bktMax ?? null,
    bktSum: o.bktSum ?? null,
    bktSpan: o.bktSpan ?? null,
    appVersion: null as string | null,
    quarantined: o.quarantined ?? false,
    holdReasons: o.quarantined ? ["wallclock"] : [],
    decidedBy: null as string | null,
    decidedAt: null as string | null,
  };
}

/** The starting snapshot: the first row ever kept for a player, with nothing before it. */
function baseline(id: number, at: string, newScore: number) {
  return row({ id, at, oldScore: null, newScore, delta: newScore });
}

/** Assert a float to 6 decimal places — percentages and rates carry IEEE dust
 *  (e.g. the 55% share in T16 comes back as 55.00000000000001). */
function near(actual: number | null, expected: number, msg?: string) {
  assert.ok(actual !== null, msg ?? "expected a number, got null");
  assert.ok(
    Math.abs((actual as number) - expected) < 1e-6,
    `${msg ?? ""} expected ≈${expected}, got ${actual}`,
  );
}

// ── T01 · 3.1 [Required automated test] / EARS "WHEN the month parameter names a month with no entries, is malformed, or
test("3.1 an unrecognised, malformed, absent or repeated month resolves to all months", () => {
  const available = ["2026-09", "2026-08"];
  assert.equal(resolveMonthParam("2026-13", available), null);
  assert.equal(resolveMonthParam("not-a-month", available), null);
  assert.equal(resolveMonthParam("2026-9", available), null);
  assert.equal(resolveMonthParam("2026-08-31", available), null);
  assert.equal(resolveMonthParam("2026-07", available), null);
  assert.equal(resolveMonthParam("", available), null);
  assert.equal(resolveMonthParam(undefined, available), null);
  assert.equal(resolveMonthParam(["2026-08", "2026-09"], available), null);
  assert.equal(resolveMonthParam("2026-08", available), "2026-08");
});

// ── T02 · 3.1 [Required automated test] — the end-to-end pass criterion ("exactly as if no month had been chosen")
test("3.1 ?month=2026-13 renders byte-identical output to no month at all", () => {
  const entries = [
    row({ id: 3, at: "2026-09-01T00:00:00.000Z", oldScore: 1_144_000_000, newScore: 1_244_000_000, delta: 100_000_000 }),
    row({ id: 2, at: "2026-08-31T23:59:59.000Z", oldScore: 1_072_000_000, newScore: 1_144_000_000, delta: 72_000_000 }),
    row({ id: 1, at: "2026-08-31T21:59:59.000Z", oldScore: 1_000_000_000, newScore: 1_072_000_000, delta: 72_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const months = monthsOf(entries);
  assert.deepEqual(months, ["2026-09", "2026-08"]);

  const month = resolveMonthParam("2026-13", months);
  assert.equal(month, null);
  const scoped = month === null ? rows : rows.filter((r) => utcMonthKey(r.at) === month);
  const days = groupByDay(scoped, rows);

  assert.deepEqual(days.map((d) => d.key), ["2026-09-01", "2026-08-31"]);
  assert.deepEqual(days.map((d) => d.count), [1, 2]);
  assert.deepEqual(days.map((d) => d.gain), [100_000_000, 144_000_000]);
  // 2026-08-31 is the oldest day of a read that does NOT begin at the player's baseline
  // snapshot, so there is an earlier event we cannot see and its window is unmeasurable.
  assert.equal(days[1].windowSeconds, 0);
  assert.deepEqual(days, groupByDay(rows, rows));
});

// ── T03 · 3.1 / 2.3.2 + impl § Month scoping ("monthsOf(rows) returns the distinct YYYY-MM (UTC) present in the loaded h
test("3.1 monthsOf lists the distinct UTC months newest-first, keeps a baseline-only month, and survives an empty history", () => {
  const rows = [
    row({ id: 20, at: "2026-08-01T12:00:00.000Z", oldScore: 1_000_000_000, newScore: 1_100_000_000, delta: 100_000_000 }),
    row({ id: 40, at: "2026-09-01T00:00:00.000Z", oldScore: 1_200_000_000, newScore: 1_300_000_000, delta: 100_000_000 }),
    baseline(10, "2025-12-31T23:00:00.000Z", 1_000_000_000),
    row({ id: 30, at: "2026-08-31T23:59:59.000Z", oldScore: 1_100_000_000, newScore: 1_200_000_000, delta: 100_000_000 }),
  ];
  assert.deepEqual(monthsOf(rows), ["2026-09", "2026-08", "2025-12"]);
  assert.deepEqual(monthsOf([]), []);
  assert.deepEqual(
    monthsOf([
      row({ id: 2, at: "2026-09-02T09:00:00.000Z", oldScore: 1_000_000_000, newScore: 1_100_000_000, delta: 100_000_000 }),
      baseline(1, "2026-07-04T08:00:00.000Z", 1_000_000_000),
    ]),
    ["2026-09", "2026-07"],
  );
});

// ── T04 · 3.1 second paragraph ("a month offered by the picker that holds nothing after the only-flagged filter")
test("3.1 a real month with nothing flagged yields an empty flagged list, not an error", () => {
  const entries = [
    row({ id: 4, at: "2026-09-01T01:00:00.000Z", oldScore: 1_260_000_000, newScore: 1_460_000_000, delta: 200_000_000 }),
    row({ id: 3, at: "2026-09-01T00:20:00.000Z", oldScore: 1_100_000_000, newScore: 1_260_000_000, delta: 160_000_000 }),
    row({ id: 2, at: "2026-08-31T23:50:00.000Z", oldScore: 1_000_000_000, newScore: 1_100_000_000, delta: 100_000_000 }),
    row({ id: 1, at: "2026-08-31T20:00:00.000Z", oldScore: 900_000_000, newScore: 1_000_000_000, delta: 100_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const month = resolveMonthParam("2026-09", monthsOf(entries));
  const scoped = rows.filter((r) => utcMonthKey(r.at) === month);
  const days = groupByDay(scoped, rows);

  assert.equal(days.length, 1);
  assert.equal(days[0].flaggedCount, 0);
  assert.equal(days[0].severity, "normal");
  assert.deepEqual(days.filter((d) => d.flaggedCount > 0), []);
});

// ── T05 · 3.2 [Required automated test] / EARS "WHEN a day contains only a baseline entry THE SYSTEM SHALL render — for 
test("3.2 a day holding only the starting snapshot dashes gain, rate and ceiling share and is not a counted day", () => {
  const entries = [
    row({ id: 2, at: "2026-03-02T02:46:40Z", oldScore: 1_000_000_000, newScore: 1_300_000_000, delta: 300_000_000 }),
    baseline(1, "2026-03-01T09:00:00Z", 1_000_000_000),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.deepEqual(days.map((d) => d.key), ["2026-03-02", "2026-03-01"]);
  const b = days[1];
  assert.equal(b.baselineOnly, true);
  assert.equal(b.events.length, 1);
  assert.equal(b.count, 0);
  assert.equal(b.gain, 0);
  assert.equal(b.windowSeconds, 0);
  assert.equal(b.rate, null);
  assert.equal(b.ceilingPct, null);
  assert.equal(b.worstEventPct, null);
  assert.equal(b.severity, "baseline");
  assert.equal(b.flaggedCount, 0);

  assert.equal(days[0].baselineOnly, false);
  assert.equal(days[0].count, 1);
  assert.equal(days[0].gain, 300_000_000);
  assert.equal(days[0].windowSeconds, 10_000);
  assert.equal(days[0].rate, 30_000);
  assert.equal(days[0].ceilingPct, 20);
  assert.equal(days.filter((d) => !d.baselineOnly).length, 1);
});

// ── T06 · 3.2 boundary (the day is NOT baseline-only) + EARS "gain = Σ trueDelta ?? delta over NON-BASELINE entries"
test("3.2 a day holding the snapshot AND a real send is a counted day, with the snapshot out of count and gain", () => {
  const entries = [
    row({ id: 2, at: "2026-04-01T03:46:40Z", oldScore: 2_000_000_000, newScore: 2_300_000_000, delta: 300_000_000 }),
    baseline(1, "2026-04-01T01:00:00Z", 2_000_000_000),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days.length, 1);
  assert.equal(days[0].key, "2026-04-01");
  assert.equal(days[0].baselineOnly, false);
  assert.equal(days[0].events.length, 2);
  assert.equal(days[0].count, 1);
  assert.equal(days[0].gain, 300_000_000);
  assert.equal(days[0].windowSeconds, 10_000);
  assert.equal(days[0].rate, 30_000);
  assert.equal(days[0].ceilingPct, 20);
  assert.equal(days[0].flaggedCount, 0);
  assert.equal(days.filter((d) => !d.baselineOnly).length, 1);
});

// ── T07 · 3.2 crossed with 3.5 — baselineOnly is about composition, not severity
test("3.2 a baseline-only day whose snapshot is itself flagged still dashes every figure and still leaves the day count", () => {
  const entries = [
    row({ id: 2, at: "2026-08-02T02:46:40Z", oldScore: 6_000_000_000, newScore: 6_300_000_000, delta: 300_000_000 }),
    baseline(1, "2026-08-01T07:00:00Z", 6_000_000_000),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  const b = days[1];
  assert.equal(b.key, "2026-08-01");
  assert.equal(b.baselineOnly, true);
  assert.equal(b.severity, "watch");
  assert.equal(b.flaggedCount, 1);
  assert.equal(b.count, 0);
  assert.equal(b.gain, 0);
  assert.equal(b.windowSeconds, 0);
  assert.equal(b.rate, null);
  assert.equal(b.ceilingPct, null);
  assert.equal(b.worstEventPct, null);

  assert.equal(days[0].severity, "normal");
  assert.equal(days[0].flaggedCount, 0);
  assert.equal(days[0].ceilingPct, 20);
  assert.equal(days.filter((d) => !d.baselineOnly).length, 1);
});

// ── T08 · 3.2 + 3.6 — count excludes the snapshot while events.length does not; withheld send still in gain
test("3.2/3.6 the snapshot sharing a day with a withheld send: count 1, events 2, snapshot out of gain", () => {
  const entries = [
    baseline(40, "2026-03-01T09:00:00Z", 1_000_000_000),
    row({ id: 41, at: "2026-03-01T10:00:00Z", oldScore: 1_000_000_000, newScore: 1_150_000_000, delta: 150_000_000, quarantined: true }),
  ];
  const { rows, summary } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days.length, 1);
  assert.equal(days[0].events.length, 2);
  assert.equal(days[0].count, 1);
  assert.equal(days[0].gain, 150_000_000);
  assert.equal(days[0].baselineOnly, false);
  assert.equal(days[0].heldCount, 1);
  assert.equal(days[0].heldTokens, 150_000_000);
  assert.equal(days[0].windowSeconds, 3600);
  near(days[0].rate, 41_666.666666666664);
  near(days[0].ceilingPct, 12.711864406779661);
  assert.equal(summary.totalGained, 150_000_000);
  assert.equal(days[0].gain, summary.totalGained);
});

// ── T09 · 3.3 [Required automated test] / EARS "WHEN a day's gain is zero or negative THE SYSTEM SHALL render — for its 
test("3.3 a day whose sends cancel to exactly zero dashes the ceiling share but still reports a rate of 0", () => {
  const entries = [
    row({ id: 4, at: "2026-05-10T05:33:20Z", oldScore: 1_700_000_000, newScore: 1_200_000_000, delta: -500_000_000 }),
    row({ id: 3, at: "2026-05-10T02:00:00Z", oldScore: 1_200_000_000, newScore: 1_700_000_000, delta: 500_000_000 }),
    row({ id: 2, at: "2026-05-09T12:00:00Z", oldScore: 1_000_000_000, newScore: 1_200_000_000, delta: 200_000_000 }),
    baseline(1, "2026-05-08T12:00:00Z", 1_000_000_000),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.deepEqual(days.map((d) => d.key), ["2026-05-10", "2026-05-09", "2026-05-08"]);
  assert.equal(days[0].count, 2);
  assert.equal(days[0].gain, 0);
  assert.equal(days[0].windowSeconds, 20_000);
  assert.equal(days[0].rate, 0);
  assert.equal(days[0].ceilingPct, null);
  assert.equal(days[0].baselineOnly, false);
  assert.equal(days[0].severity, "suspicious");
  assert.equal(days[0].flaggedCount, 1);
  assert.equal(days[2].baselineOnly, true);
  assert.equal(days.filter((d) => !d.baselineOnly).length, 2);
});

// ── T10 · 3.3 [Required automated test] "A day where the score went down"
test("3.3 a day summing negative keeps its negative gain and negative rate but dashes the ceiling share", () => {
  const entries = [
    row({ id: 3, at: "2026-06-02T04:10:00Z", oldScore: 2_100_000_000, newScore: 1_700_000_000, delta: -400_000_000 }),
    row({ id: 2, at: "2026-06-02T01:00:00Z", oldScore: 2_000_000_000, newScore: 2_100_000_000, delta: 100_000_000 }),
    baseline(1, "2026-06-01T12:00:00Z", 2_000_000_000),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.deepEqual(days.map((d) => d.key), ["2026-06-02", "2026-06-01"]);
  assert.equal(days[0].count, 2);
  assert.equal(days[0].gain, -300_000_000);
  assert.equal(days[0].windowSeconds, 15_000);
  assert.equal(days[0].rate, -20_000);
  assert.equal(days[0].ceilingPct, null);
  assert.equal(days[0].severity, "suspicious");
  assert.equal(days[0].flaggedCount, 1);
  assert.equal(days[1].baselineOnly, true);
  assert.equal(days[1].gain, 0);
  assert.equal(days[1].rate, null);
  assert.equal(days.filter((d) => !d.baselineOnly).length, 1);
});

// ── T11 · 3.3 + State Coordination Invariant 5 (the boundary where the invariant as written is FALSE)
test("3.3 + invariant 5 boundary: a negative day makes Σ day.gain differ from summary.totalGained by exactly the clamped loss", () => {
  const entries = [
    row({ id: 50, at: "2026-07-01T10:00:00Z", oldScore: 2_000_000_000, newScore: 2_300_000_000, delta: 300_000_000 }),
    row({ id: 51, at: "2026-07-02T10:00:00Z", oldScore: 2_300_000_000, newScore: 2_000_000_000, delta: -300_000_000 }),
  ];
  const { rows, summary } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days[0].key, "2026-07-02");
  assert.equal(days[0].gain, -300_000_000);
  assert.equal(days[0].ceilingPct, null);
  assert.equal(days[0].windowSeconds, 36_000);
  near(days[0].rate, -8333.333333333334);
  assert.equal(days[1].gain, 300_000_000);
  assert.equal(days[1].windowSeconds, 0);
  assert.equal(days[1].rate, null);

  const sum = days.reduce((s, d) => s + d.gain, 0);
  assert.equal(sum, 0);
  assert.equal(summary.totalGained, 300_000_000);
  assert.notEqual(sum, summary.totalGained);
  assert.equal(summary.totalGained - sum, 300_000_000);
});

// ── T12 · 3.5 [Required automated test] / EARS "SHALL render that day at the highest such severity together with a count
test("3.5 a day holding a watch send and a suspicious send carries the higher severity, a count of 2, and the worse share", () => {
  const entries = [
    baseline(1, "2026-09-08T23:00:00Z", 2_000_000_000),
    row({ id: 2, at: "2026-09-09T06:00:00Z", oldScore: 2_000_000_000, newScore: 3_130_000_000, delta: 1_130_000_000 }),
    row({ id: 3, at: "2026-09-09T06:05:00Z", oldScore: 3_130_000_000, newScore: 4_652_500_000, delta: 1_522_500_000 }),
    row({ id: 4, at: "2026-09-09T20:00:00Z", oldScore: 4_652_500_000, newScore: 4_760_000_000, delta: 107_500_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  assert.equal(rows.find((r) => r.id === 2)!.severity, "watch");
  assert.equal(rows.find((r) => r.id === 3)!.severity, "suspicious");

  const days = groupByDay(rows, rows);
  assert.equal(days[0].key, "2026-09-09");
  assert.equal(days[0].events.length, 3);
  assert.equal(days[0].count, 3);
  assert.equal(days[0].gain, 2_760_000_000);
  assert.equal(days[0].windowSeconds, 72_000);
  assert.equal(days[0].ceilingPct, 60);
  assert.equal(days[0].severity, "suspicious");
  assert.equal(days[0].flaggedCount, 2);
  assert.equal(days[0].worstEventPct, 150);
  near(days[0].rate, 38_333.333333333336);
  assert.equal(days[1].baselineOnly, true);
  assert.equal(days[1].severity, "baseline");
});

// ── T13 · 3.5b [Required automated test] + State Coordination Invariant 4 — the single failure mode the regrouping risks
test("3.5b a day at 40% of its own ceiling that contains a send at 180% of ITS OWN ceiling discloses both", () => {
  const entries = [
    baseline(1, "2026-09-04T23:50:00Z", 1_000_000_000),
    row({ id: 2, at: "2026-09-05T00:00:00Z", oldScore: 1_000_000_000, newScore: 1_100_000_000, delta: 100_000_000 }),
    row({ id: 3, at: "2026-09-05T12:00:00Z", oldScore: 1_100_000_000, newScore: 1_200_000_000, delta: 100_000_000 }),
    row({ id: 4, at: "2026-09-05T22:56:40Z", oldScore: 1_200_000_000, newScore: 1_238_000_000, delta: 38_000_000 }),
    row({ id: 5, at: "2026-09-05T23:00:00Z", oldScore: 1_238_000_000, newScore: 3_056_000_000, delta: 1_818_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days[0].key, "2026-09-05");
  assert.equal(days[0].events.length, 4);
  assert.equal(days[0].count, 4);
  assert.equal(days[0].gain, 2_056_000_000);
  assert.equal(days[0].windowSeconds, 82_800);
  assert.equal(days[0].ceilingPct, 40);
  assert.equal(days[0].worstEventPct, 180);
  assert.equal(days[0].severity, "suspicious");
  assert.equal(days[0].flaggedCount, 1);
  assert.equal(days[0].heldCount, 0);
  assert.equal(days[0].heldTokens, 0);
  near(days[0].rate, 24_830.917874396135);
  assert.ok(days[0].ceilingPct! < 100 && days[0].worstEventPct! > 100);

  assert.equal(days[1].key, "2026-09-04");
  assert.equal(days[1].baselineOnly, true);
  assert.equal(days[1].worstEventPct, null);
});

// ── T14 · 3.5b [Required automated test] — the "merely marked as worth watching" arm, under 100%
test("3.5b a day whose worst send is only watch-level at 60% still surfaces that share (muted, not null)", () => {
  const entries = [
    baseline(1, "2026-09-05T23:30:00Z", 2_000_000_000),
    row({ id: 2, at: "2026-09-06T08:00:00Z", oldScore: 2_000_000_000, newScore: 2_100_000_000, delta: 100_000_000 }),
    row({ id: 3, at: "2026-09-06T08:10:00Z", oldScore: 2_100_000_000, newScore: 2_718_000_000, delta: 618_000_000 }),
    row({ id: 4, at: "2026-09-06T20:00:00Z", oldScore: 2_718_000_000, newScore: 2_920_000_000, delta: 202_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  assert.equal(rows.find((r) => r.id === 3)!.severity, "watch");

  const days = groupByDay(rows, rows);
  assert.equal(days[0].key, "2026-09-06");
  assert.equal(days[0].count, 3);
  assert.equal(days[0].gain, 920_000_000);
  assert.equal(days[0].windowSeconds, 72_000);
  assert.equal(days[0].ceilingPct, 20);
  assert.equal(days[0].worstEventPct, 60);
  assert.notEqual(days[0].worstEventPct, null);
  assert.equal(days[0].severity, "watch");
  assert.equal(days[0].flaggedCount, 1);
  near(days[0].rate, 12_777.777777777777);
});

// ── T15 · 3.5b [Required automated test] / EARS "WHEN a day contains no such entry THE SYSTEM SHALL render the day's own
test("3.5b a day with nothing marked in it and nothing over its own ceiling shows its own share alone", () => {
  const entries = [
    baseline(1, "2026-09-06T23:00:00Z", 1_000_000_000),
    row({ id: 2, at: "2026-09-07T09:00:00Z", oldScore: 1_000_000_000, newScore: 1_200_000_000, delta: 200_000_000 }),
    row({ id: 3, at: "2026-09-07T12:00:00Z", oldScore: 1_200_000_000, newScore: 1_316_000_000, delta: 116_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days[0].key, "2026-09-07");
  assert.equal(days[0].count, 2);
  assert.equal(days[0].gain, 316_000_000);
  assert.equal(days[0].windowSeconds, 43_200);
  assert.equal(days[0].ceilingPct, 10);
  assert.equal(days[0].worstEventPct, null);
  assert.equal(days[0].severity, "normal");
  assert.equal(days[0].flaggedCount, 0);
  near(days[0].rate, 7314.814814814815);
  assert.equal(days[1].worstEventPct, null);
});

// ── T16 · 3.5b [Required automated test] — the arithmetic arm ("any send that exceeded its own ceiling") survives acknow
test("3.5b an acknowledged send that was 250% of its own ceiling is still disclosed after the badge goes quiet", () => {
  const entries = [
    baseline(1, "2026-09-07T22:00:00Z", 1_000_000_000),
    row({ id: 2, at: "2026-09-08T10:00:00Z", oldScore: 1_000_000_000, newScore: 1_100_000_000, delta: 100_000_000 }),
    row({ id: 3, at: "2026-09-08T10:03:20Z", oldScore: 1_100_000_000, newScore: 3_625_000_000, delta: 2_525_000_000 }),
    row({ id: 4, at: "2026-09-08T22:00:00Z", oldScore: 3_625_000_000, newScore: 3_728_000_000, delta: 103_000_000 }),
  ];
  const { rows } = analyzeHistory(entries, new Set([3]));
  const ack = rows.find((r) => r.id === 3)!;
  assert.equal(ack.severity, "normal");
  assert.equal(ack.acknowledged, true);
  assert.equal(ack.ceiling, 1_010_000_000);

  const days = groupByDay(rows, rows);
  assert.equal(days[0].key, "2026-09-08");
  assert.equal(days[0].count, 3);
  assert.equal(days[0].gain, 2_728_000_000);
  assert.equal(days[0].windowSeconds, 79_200);
  assert.equal(days[0].severity, "normal");
  assert.equal(days[0].flaggedCount, 0);
  assert.equal(days[0].worstEventPct, 250);
  near(days[0].ceilingPct, 55);
  near(days[0].rate, 34_444.444444444445);
});

// ── T17 · 3.5b — CHARACTERIZATION of the acknowledgement gap (defect D9). Update this test when § 3.5b rules.
test("3.5b acknowledging the only watch-level send (60% of its ceiling) keeps its share on the day line", () => {
  // Acknowledgement rewrites severity to normal, which used to make this day byte-
  // identical to a day that never held anything — the acknowledgement was visible in
  // the old top-level list and would have been buried by the regrouping. `acknowledgedCount`
  // is in the disclosure gate precisely so the share survives the badge going quiet.
  const entries = [
    baseline(1, "2026-09-05T23:30:00Z", 2_000_000_000),
    row({ id: 2, at: "2026-09-06T08:00:00Z", oldScore: 2_000_000_000, newScore: 2_100_000_000, delta: 100_000_000 }),
    row({ id: 3, at: "2026-09-06T08:10:00Z", oldScore: 2_100_000_000, newScore: 2_718_000_000, delta: 618_000_000 }),
    row({ id: 4, at: "2026-09-06T20:00:00Z", oldScore: 2_718_000_000, newScore: 2_920_000_000, delta: 202_000_000 }),
  ];
  const { rows } = analyzeHistory(entries, new Set([3]));
  assert.equal(rows.find((r) => r.id === 3)!.severity, "normal");
  const days = groupByDay(rows, rows);
  assert.equal(days[0].ceilingPct, 20);
  assert.equal(days[0].severity, "normal");
  assert.equal(days[0].flaggedCount, 0);
  assert.equal(days[0].acknowledgedCount, 1);
  assert.equal(days[0].worstEventPct, 60);
});

// ── T18 · 3.5b — CHARACTERIZATION of the null-ceiling gap (defect D3), score-decrease arm
test("3.5b CHARACTERIZATION: a flagged send with no ceiling contributes nothing, so the worst-send figure names an unflagged send", () => {
  // The day is suspicious because of the decrease (id 2, ceiling null); the 11.79%
  // printed beside it belongs to the innocent +500M send (id 3). See defect D3.
  const entries = [
    baseline(1, "2026-09-01T00:00:00Z", 10_000_000_000),
    row({ id: 2, at: "2026-09-02T02:00:00Z", oldScore: 10_000_000_000, newScore: 7_000_000_000, delta: -3_000_000_000 }),
    row({ id: 3, at: "2026-09-02T20:00:00Z", oldScore: 7_000_000_000, newScore: 7_500_000_000, delta: 500_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  assert.equal(rows.find((r) => r.id === 2)!.severity, "suspicious");
  assert.equal(rows.find((r) => r.id === 2)!.ceiling, null);
  assert.equal(rows.find((r) => r.id === 3)!.severity, "normal");

  const days = groupByDay(rows, rows);
  assert.equal(days[0].key, "2026-09-02");
  assert.equal(days[0].severity, "suspicious");
  assert.equal(days[0].flaggedCount, 1);
  assert.equal(days[0].ceilingPct, null);
  near(days[0].worstEventPct, 11.79245283018868);
});

// ── T19 · 3.5b — CHARACTERIZATION of the null-ceiling gap (defect D3), ×100-whitelist arm; this is the hiding place 3.5b
test("3.5b a ×100-shaped send of 4.96e9 is disclosed on the day line even though the whitelist clears its severity", () => {
  // newScore === oldScore × 100 is attacker-choosable: the client uploads the cumulative
  // total and knows its own score. The bracketing 00:00:30 / 23:59:30 sends stretch the
  // day window so the day's own share stays under 100%. See defect D3.
  const entries = [
    baseline(1, "2026-08-30T00:00:00Z", 50_000_000),
    row({ id: 2, at: "2026-09-03T23:59:00Z", oldScore: 50_000_000, newScore: 50_000_000, delta: 0 }),
    row({ id: 3, at: "2026-09-04T00:00:30Z", oldScore: 50_000_000, newScore: 50_100_000, delta: 100_000 }),
    row({ id: 4, at: "2026-09-04T12:00:00Z", oldScore: 50_100_000, newScore: 5_010_000_000, delta: 4_959_900_000 }),
    row({ id: 5, at: "2026-09-04T23:59:30Z", oldScore: 5_010_000_000, newScore: 5_010_100_000, delta: 100_000 }),
  ];
  const { rows, summary } = analyzeHistory(entries);
  const big = rows.find((r) => r.id === 4)!;
  assert.equal(big.severity, "normal");
  assert.equal(big.ceiling, null);

  const days = groupByDay(rows, rows);
  assert.equal(days[0].key, "2026-09-04");
  assert.equal(days[0].gain, 4_960_100_000);
  assert.equal(days[0].windowSeconds, 86_370);
  assert.equal(days[0].severity, "normal");
  assert.equal(days[0].flaggedCount, 0);
  // newScore === oldScore × 100 is attacker-choosable, and the whitelist clears the
  // row's severity AND leaves its `ceiling` null. Recomputing the ceiling from the
  // elapsed time is what stops the day line going silent over 4.96 billion tokens.
  // 4,959,900,000 ÷ (SUS_BURST + SUS_RATE × 43,170s) = 4,959,900,000 ÷ 3,158,500,000
  near(days[0].worstEventPct, 157.0334019312965);
  assert.ok(days[0].worstEventPct! > 100);
  near(days[0].ceilingPct, 93.26125787346055);
  assert.equal(summary.verdict, "clean");
});

// ── T20 · 3.6 [Required automated test] / EARS "gain … withheld entries included"
test("3.6 a day mixing a normal send and a withheld send counts both in gain and reports the withheld part", () => {
  const entries = [
    row({ id: 10, at: "2026-09-04T23:30:00Z", oldScore: 1_000_000_000, newScore: 1_100_000_000, delta: 100_000_000 }),
    row({ id: 11, at: "2026-09-05T00:30:00Z", oldScore: 1_100_000_000, newScore: 1_200_000_000, delta: 100_000_000 }),
    row({ id: 12, at: "2026-09-05T01:00:00Z", oldScore: 1_200_000_000, newScore: 1_218_000_000, delta: 18_000_000, quarantined: true }),
  ];
  const { rows, summary } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days[0].key, "2026-09-05");
  assert.equal(days[0].count, 2);
  assert.equal(days[0].events.length, 2);
  assert.equal(days[0].gain, 118_000_000);
  assert.equal(days[0].heldCount, 1);
  assert.equal(days[0].heldTokens, 18_000_000);
  assert.equal(days[0].windowSeconds, 3600);
  assert.equal(days[0].ceilingPct, 10);
  assert.equal(days[0].flaggedCount, 0);
  near(days[0].rate, 32_777.77777777778);

  assert.equal(days[1].key, "2026-09-04");
  assert.equal(days[1].gain, 100_000_000);
  assert.equal(days[1].heldCount, 0);
  assert.equal(days[1].windowSeconds, 0);
  assert.equal(days[1].rate, null);
  assert.equal(days[0].gain + days[1].gain, 218_000_000);
  assert.equal(summary.totalGained, 218_000_000);
});

// ── T21 · 3.6 [Required automated test] ("the signal column notes how many were withheld and how much") + the trueDelta 
test("3.6 heldTokens reports the real increase, not a re-insert's restated total", () => {
  const entries = [
    row({ id: 70, at: "2026-04-09T23:00:00Z", oldScore: 3_000_000_000, newScore: 3_100_000_000, delta: 100_000_000 }),
    row({ id: 71, at: "2026-04-10T01:00:00Z", oldScore: 3_100_000_000, newScore: 3_400_000_000, delta: 3_400_000_000, trueDelta: 300_000_000, quarantined: true }),
  ];
  const { rows, summary } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days[0].key, "2026-04-10");
  assert.equal(days[0].count, 1);
  assert.equal(days[0].gain, 300_000_000);
  assert.equal(days[0].heldCount, 1);
  assert.equal(days[0].heldTokens, 300_000_000);
  assert.notEqual(days[0].heldTokens, 3_400_000_000);
  assert.equal(days[0].windowSeconds, 3600);
  near(days[0].ceilingPct, 25.423728813559322);
  near(days[0].rate, 83_333.33333333333);
  assert.equal(days.reduce((s, d) => s + d.gain, 0), 400_000_000);
  assert.equal(summary.totalGained, 400_000_000);
});

// ── T22 · 3.6 / EARS "gain = Σ trueDelta ?? delta" — both arms of the ??, incl. the § 4 re-insert restatement
test("3.6 gain takes trueDelta when present and delta otherwise", () => {
  const restated = analyzeHistory([
    row({ id: 30, at: "2026-08-14T23:50:00Z", oldScore: 17_000_000_000, newScore: 17_219_846_933, delta: 219_846_933 }),
    row({ id: 31, at: "2026-08-15T00:10:00Z", oldScore: 17_219_846_933, newScore: 17_433_498_018, delta: 17_433_498_018, trueDelta: 213_651_085 }),
  ]);
  const a = groupByDay(restated.rows, restated.rows);
  assert.equal(a[0].key, "2026-08-15");
  assert.equal(a[0].count, 1);
  assert.equal(a[0].gain, 213_651_085);
  assert.notEqual(a[0].gain, 17_433_498_018);
  assert.equal(a[0].windowSeconds, 600);
  near(a[0].ceilingPct, 20.742823786407765);
  near(a[0].rate, 356_085.14166666666);
  assert.equal(a[1].gain, 219_846_933);
  assert.equal(a[1].windowSeconds, 0);
  assert.equal(a[1].rate, null);
  assert.equal(restated.summary.totalGained, 433_498_018);

  const plain = analyzeHistory([
    row({ id: 20, at: "2026-06-10T08:00:00Z", oldScore: 5_000_000_000, newScore: 5_200_000_000, delta: 200_000_000 }),
    row({ id: 21, at: "2026-06-10T09:00:00Z", oldScore: 5_200_000_000, newScore: 5_590_000_000, delta: 390_000_000 }),
  ]);
  const b = groupByDay(plain.rows, plain.rows);
  assert.equal(b.length, 1);
  assert.equal(b[0].gain, 590_000_000);
  // Oldest day of a read that does not begin at a baseline → window unmeasurable. The
  // gain above is the subject of this test and is unaffected by the window.
  assert.equal(b[0].windowSeconds, 0);
  assert.equal(b[0].ceilingPct, null);
  assert.equal(b[0].rate, null);
  assert.equal(plain.summary.totalGained, 590_000_000);
});

// ── T23 · 3.6 + State Coordination Invariant 5 (the case where the invariant DOES hold)
test("3.6 + invariant 5: with no negative entry, Σ day.gain equals summary.totalGained across withheld and restated rows", () => {
  const entries = [
    row({ id: 60, at: "2026-05-20T22:00:00Z", oldScore: 1_000_000_000, newScore: 1_100_000_000, delta: 100_000_000 }),
    row({ id: 61, at: "2026-05-21T01:00:00Z", oldScore: 1_100_000_000, newScore: 1_180_000_000, delta: 80_000_000, quarantined: true }),
    row({ id: 62, at: "2026-05-21T02:00:00Z", oldScore: 1_180_000_000, newScore: 1_400_000_000, delta: 1_400_000_000, trueDelta: 220_000_000 }),
    row({ id: 63, at: "2026-05-21T03:00:00Z", oldScore: 1_400_000_000, newScore: 1_450_000_000, delta: 50_000_000, quarantined: true }),
  ];
  const { rows, summary } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days[0].key, "2026-05-21");
  assert.equal(days[0].count, 3);
  assert.equal(days[0].gain, 350_000_000);
  assert.equal(days[0].heldCount, 2);
  assert.equal(days[0].heldTokens, 130_000_000);
  assert.equal(days[0].windowSeconds, 10_800);
  near(days[0].rate, 32_407.40740740741);
  assert.equal(days[1].gain, 100_000_000);
  assert.equal(days[1].windowSeconds, 0);
  assert.equal(days.reduce((s, d) => s + d.gain, 0), 450_000_000);
  assert.equal(summary.totalGained, 450_000_000);
});

// ── T24 · 2.1.3 + 3.4 + impl § The day aggregate (windowSeconds = lastEventAt − max(dayStartUTC, prevEventAt))
test("invariant 3: a sync at 23:50 on day N makes day N+1's window open at 00:00, not at its own first send", () => {
  const entries = [
    row({ id: 3, at: "2026-03-11T06:00:00Z", oldScore: 1_111_200_000, newScore: 1_201_200_000, delta: 90_000_000 }),
    row({ id: 2, at: "2026-03-11T02:00:00Z", oldScore: 1_050_000_000, newScore: 1_111_200_000, delta: 61_200_000 }),
    row({ id: 1, at: "2026-03-10T23:50:00Z", oldScore: 1_000_000_000, newScore: 1_050_000_000, delta: 50_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.deepEqual(days.map((d) => d.key), ["2026-03-11", "2026-03-10"]);
  assert.equal(days[0].count, 2);
  assert.equal(days[0].gain, 151_200_000);
  assert.equal(days[0].windowSeconds, 21_600);
  assert.equal(days[0].rate, 7000);
  near(days[0].ceilingPct, 7.269230769230769);
  assert.equal(days[1].count, 1);
  assert.equal(days[1].gain, 50_000_000);
  assert.equal(days[1].windowSeconds, 0);
  assert.equal(days[1].rate, null);
  assert.equal(days[1].ceilingPct, null);
});

// ── T25 · State Coordination Invariant 3 — prevEventAt comes from the UNFILTERED history
test("invariant 3 REGRESSION: filtering the display to day N+1 must not change day N+1's window", () => {
  const entries = [
    row({ id: 3, at: "2026-03-11T06:00:00Z", oldScore: 1_111_200_000, newScore: 1_201_200_000, delta: 90_000_000 }),
    row({ id: 2, at: "2026-03-11T02:00:00Z", oldScore: 1_050_000_000, newScore: 1_111_200_000, delta: 61_200_000 }),
    row({ id: 1, at: "2026-03-10T23:50:00Z", oldScore: 1_000_000_000, newScore: 1_050_000_000, delta: 50_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const display = rows.filter((r) => r.at.startsWith("2026-03-11"));

  const days = groupByDay(display, rows);
  assert.equal(days.length, 1);
  assert.equal(days[0].key, "2026-03-11");
  assert.equal(days[0].gain, 151_200_000);
  assert.equal(days[0].windowSeconds, 21_600);
  assert.equal(days[0].rate, 7000);
  near(days[0].ceilingPct, 7.269230769230769);

  // The discriminator: anchoring on the slice loses the 23:50 predecessor entirely, and
  // the slice does not begin at a baseline either — so the day stops being measurable
  // at all. Either way it is NOT the 21,600s the correct call above produces, which is
  // the whole point: `full` must be the unfiltered history.
  const wrong = groupByDay(display, display);
  assert.notEqual(wrong[0].windowSeconds, days[0].windowSeconds);
  assert.equal(wrong[0].windowSeconds, 0);
  assert.equal(wrong[0].rate, null);
});

// ── T26 · State Coordination Invariant 3 under the month picker ("the first day of every month would … look systematical
test("invariant 3: the first day of a month keeps its 00:00 anchor under the month picker", () => {
  const entries = [
    row({ id: 11, at: "2026-04-01T09:00:00Z", oldScore: 5_050_000_000, newScore: 5_374_000_000, delta: 324_000_000 }),
    row({ id: 10, at: "2026-03-31T23:50:00Z", oldScore: 5_000_000_000, newScore: 5_050_000_000, delta: 50_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const april = rows.filter((r) => utcMonthKey(r.at) === "2026-04");

  const days = groupByDay(april, rows);
  assert.equal(days.length, 1);
  assert.equal(days[0].key, "2026-04-01");
  assert.equal(days[0].gain, 324_000_000);
  assert.equal(days[0].windowSeconds, 32_400);
  assert.equal(days[0].rate, 10_000);
  near(days[0].ceilingPct, 12.366412213740457);

  const wrong = groupByDay(april, april);
  assert.equal(wrong[0].windowSeconds, 0);
  assert.equal(wrong[0].rate, null);
});

// ── T27 · 2.3.5 + State Coordination Invariants 1–2 + EARS "WHEN month is set … SHALL build the account summary panel … 
test("2.3.5 with a month set the day list is scoped while the account summary stays whole-account", () => {
  const entries = [
    row({ id: 4, at: "2026-09-01T01:00:00.000Z", oldScore: 1_260_000_000, newScore: 1_460_000_000, delta: 200_000_000 }),
    row({ id: 3, at: "2026-09-01T00:20:00.000Z", oldScore: 1_100_000_000, newScore: 1_260_000_000, delta: 160_000_000 }),
    row({ id: 2, at: "2026-08-31T23:50:00.000Z", oldScore: 1_000_000_000, newScore: 1_100_000_000, delta: 100_000_000 }),
    row({ id: 1, at: "2026-08-31T20:00:00.000Z", oldScore: 900_000_000, newScore: 1_000_000_000, delta: 100_000_000 }),
  ];
  const { rows, summary } = analyzeHistory(entries);
  const month = resolveMonthParam("2026-09", monthsOf(entries));
  assert.equal(month, "2026-09");
  const scoped = rows.filter((r) => utcMonthKey(r.at) === month);
  const days = groupByDay(scoped, rows);

  assert.equal(days.length, 1);
  assert.equal(days[0].key, "2026-09-01");
  assert.deepEqual(days[0].events.map((e) => e.id), [4, 3]);
  assert.equal(days[0].count, 2);
  assert.equal(days[0].gain, 360_000_000);
  assert.equal(days[0].windowSeconds, 3600);
  assert.equal(days[0].rate, 100_000);
  near(days[0].ceilingPct, 30.508474576271187);
  assert.equal(days[0].severity, "normal");
  assert.equal(days[0].flaggedCount, 0);

  assert.equal(summary.totalGained, 560_000_000);
  assert.equal(summary.changeCount, 4);
  assert.equal(summary.largestJump, 200_000_000);
  assert.equal(summary.largestJumpAt, "2026-09-01T01:00:00.000Z");
  assert.equal(summary.verdict, "clean");
  assert.notEqual(summary.totalGained, days[0].gain);
});

// ── T28 · 3.4 [Smoke test only] — pinned anyway because it is the window rule the whole day line rests on
test("3.4 away three days then one sync: the window is that day's 8 hours, not three days and eight hours", () => {
  const entries = [
    row({ id: 21, at: "2026-04-04T08:00:00Z", oldScore: 2_100_000_000, newScore: 2_388_000_000, delta: 288_000_000 }),
    row({ id: 20, at: "2026-04-01T08:00:00Z", oldScore: 2_000_000_000, newScore: 2_100_000_000, delta: 100_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.deepEqual(days.map((d) => d.key), ["2026-04-04", "2026-04-01"]);
  assert.equal(days[0].gain, 288_000_000);
  assert.equal(days[0].windowSeconds, 28_800);
  assert.equal(days[0].rate, 10_000);
  near(days[0].ceilingPct, 11.80327868852459);
  assert.equal(days[1].windowSeconds, 0);
  assert.equal(days[1].rate, null);
  assert.equal(days[1].ceilingPct, null);
});

// ── T29 · EARS "WHEN a day's window is zero seconds THE SYSTEM SHALL render — for that day's rate and ceiling share, and
test("a zero-length window dashes rate and ceiling share without dividing by zero", () => {
  const first = analyzeHistory([
    row({ id: 30, at: "2026-06-15T14:30:00Z", oldScore: 800_000_000, newScore: 860_000_000, delta: 60_000_000 }),
  ]);
  const a = groupByDay(first.rows, first.rows);
  assert.equal(a.length, 1);
  assert.equal(a[0].count, 1);
  assert.equal(a[0].gain, 60_000_000);
  assert.equal(a[0].windowSeconds, 0);
  assert.equal(a[0].rate, null);
  assert.equal(a[0].ceilingPct, null);
  assert.equal(a[0].rateLabel, "—");
  assert.equal(a[0].windowLabel, "—");

  const midnight = analyzeHistory([
    row({ id: 41, at: "2026-05-02T00:00:00Z", oldScore: 3_036_000_000, newScore: 3_072_000_000, delta: 36_000_000 }),
    row({ id: 40, at: "2026-05-01T23:00:00Z", oldScore: 3_000_000_000, newScore: 3_036_000_000, delta: 36_000_000 }),
  ]);
  const b = groupByDay(midnight.rows, midnight.rows);
  assert.deepEqual(b.map((d) => d.key), ["2026-05-02", "2026-05-01"]);
  assert.equal(b[0].gain, 36_000_000);
  assert.equal(b[0].windowSeconds, 0);
  assert.equal(b[0].rate, null);
  assert.equal(b[0].ceilingPct, null);

  const twoDays = analyzeHistory([
    row({ id: 11, at: "2026-07-02T02:46:40Z", oldScore: 800_000_000, newScore: 1_100_000_000, delta: 300_000_000 }),
    row({ id: 10, at: "2026-07-01T08:00:00Z", oldScore: 500_000_000, newScore: 800_000_000, delta: 300_000_000 }),
  ]);
  const c = groupByDay(twoDays.rows, twoDays.rows);
  assert.equal(c[1].windowSeconds, 0);
  assert.equal(c[1].gain, 300_000_000);
  assert.equal(c[1].rate, null);
  assert.equal(c[1].ceilingPct, null);
  assert.equal(c[0].windowSeconds, 10_000);
  assert.equal(c[0].rate, 30_000);
  assert.equal(c[0].ceilingPct, 20);
  assert.equal(c.filter((d) => !d.baselineOnly).length, 2);
});

// ── T30 · 2.1.1 + EARS "one row per UTC calendar day … ordered by day descending"
test("UTC day boundary: 23:59:59Z and 00:00:00Z fall in different days, and midnight belongs to the day it opens", () => {
  const entries = [
    row({ id: 3, at: "2026-09-01T00:00:00.000Z", oldScore: 1_144_000_000, newScore: 1_244_000_000, delta: 100_000_000 }),
    row({ id: 2, at: "2026-08-31T23:59:59.000Z", oldScore: 1_072_000_000, newScore: 1_144_000_000, delta: 72_000_000 }),
    row({ id: 1, at: "2026-08-31T21:59:59.000Z", oldScore: 1_000_000_000, newScore: 1_072_000_000, delta: 72_000_000 }),
  ];
  const { rows } = analyzeHistory(entries);
  const days = groupByDay(rows, rows);

  assert.equal(days.length, 2);
  assert.deepEqual(days.map((d) => d.key), ["2026-09-01", "2026-08-31"]);
  assert.deepEqual(days[0].events.map((e) => e.id), [3]);
  assert.equal(days[0].count, 1);
  assert.equal(days[0].gain, 100_000_000);
  assert.equal(days[0].windowSeconds, 0);
  assert.equal(days[0].rate, null);
  assert.equal(days[0].ceilingPct, null);
  assert.deepEqual(days[1].events.map((e) => e.id), [2, 1]);
  assert.equal(days[1].count, 2);
  assert.equal(days[1].gain, 144_000_000);
  // Oldest day, read does not begin at a baseline → unmeasurable. The day KEY and the
  // event membership either side of midnight are what this test exists to pin.
  assert.equal(days[1].windowSeconds, 0);
  assert.equal(days[1].rate, null);
  assert.equal(days[1].ceilingPct, null);
  assert.deepEqual(monthsOf(entries), ["2026-09", "2026-08"]);
});