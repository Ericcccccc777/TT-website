import type { HistoryEntry } from "./data";

/**
 * Score-history analysis for the /ranger admin console.
 *
 * Pure, server-side, computed at render time from leaderboard_history rows — it
 * does NOT depend on any database-side anti-cheat gate. It turns a raw list of
 * score changes into per-change derived metrics (interval, implied rate, % jump)
 * and a heuristic severity, plus an account-level summary. Everything here is
 * ADVISORY: it helps the admin's eye, it does not punish anyone. Bans stay a
 * manual decision.
 *
 * Two independent tests run per row:
 *
 *   1. The JUMP CEILING — how much a real machine could have produced in the
 *      elapsed time. Time-scaled, so hoarding does not read as cheating.
 *   2. The BUCKET SUMMARY — four aggregate numbers the desktop client derives
 *      from the Claude Code logs' own timestamps and uploads alongside the
 *      score. Optional (older clients omit it); when present it is the sharper
 *      test, because Σbuckets must equal the score delta the server itself
 *      computed. A tampered garden.json moves the score but not the logs, so
 *      the two stop agreeing.
 *
 * The client is untrusted, so a determined forger can fabricate a self-consistent
 * summary; the ceiling therefore always stays in force as a backstop. What the
 * summary buys is (a) honest heavy users stop being flagged, and (b) the cheapest
 * cheat — editing the cumulative number in garden.json — becomes self-evident.
 */
export const THRESHOLDS = {
  // ── 1. Jump ceiling: BURST + RATE × gap ────────────────────────────────────
  // Calibrated against a real heavy user's Claude Code logs (23 days, 7.6e9
  // tokens counted the same way the app counts them — in + out + cache_read +
  // cache_creation, where cache_read dominates):
  //
  //     window    real max tokens
  //      5 min          5.5e7
  //     30 min          2.05e8
  //      1 h            2.86e8
  //      8 h            5.54e8
  //     24 h            9.05e8
  //      7 d            3.51e9
  //
  // The previous absolute thresholds (watch at ≥1.5e8, suspicious at ≥5e8, both
  // blind to elapsed time) flagged that user's ORDINARY behaviour: a normal
  // 8-hour workday genuinely produces 5.5e8 tokens, and the desktop app freezes
  // bubble expiry while minimised, so a single click legitimately banks the whole
  // day at once. Any usable test has to scale with time.
  WATCH_BURST: 400_000_000, // 4e8 allowed regardless of gap …
  WATCH_RATE: 20_000, // … plus 20K tok/s of gap  (≈1.8–2.4× the real ceiling)
  SUS_BURST: 1_000_000_000, // 1e9 …
  SUS_RATE: 50_000, // … plus 50K tok/s of gap   (≈4–5× the real ceiling)

  // ── 2. Bucket summary ──────────────────────────────────────────────────────
  // Real max for a single aligned 5-minute window in those same logs: 4.7e7.
  BUCKET_SECONDS: 300,
  BUCKET_WATCH: 100_000_000, // 1e8 inside one 5-min window → watch      (≈2×)
  BUCKET_SUS: 200_000_000, // 2e8 inside one 5-min window → suspicious  (≈4×)
  SUM_TOL: 1_000, // tokens of slack when checking Σbuckets == delta

  // ── 3. Baseline plausibility ───────────────────────────────────────────────
  // A first-ever upload has no predecessor to compare against, which is a hole:
  // toggling the leaderboard off→on DELETEs the row, so the next upload arrives
  // as a fresh INSERT and lands here with no ceiling applied. Known real peak
  // lifetime total is ~2.3e9, so a brand-new row far above that wants a look.
  BASELINE_WATCH: 5_000_000_000,
  BASELINE_SUS: 20_000_000_000,

  // ── 4. Unchanged from before ───────────────────────────────────────────────
  HUGE_PCT: 900, // grew > 9x (900%) in one step → watch …
  PCT_MIN_BASE: 100_000_000, // … but only when the prior score was already ≥ 1e8.
  // The ONE legit big jump: the v2→v3 metric migration multiplies a saved total
  // by exactly ×100. Treat newScore ≈ oldScore×100 as legitimate, not fabrication.
  X100_TOL: 100,
} as const;

export type Severity = "baseline" | "normal" | "watch" | "suspicious";

/** Verdict on the four uploaded bucket numbers, or null when the client sent none. */
export type BucketCheck = {
  n: number; // how many 5-min windows the delta was spread across
  max: number; // tokens in the busiest of them
  sum: number; // Σ over all of them — must equal the server-computed delta
  span: number; // seconds from the earliest window to the latest
  ok: boolean; // every consistency test passed
  sumMatches: boolean; // |sum − delta| ≤ SUM_TOL
  impliedRate: number; // max ÷ 300s — peak tokens/sec inside one window
  avgPerBucket: number;
  problems: string[]; // why !ok, if it isn't
};

export type AnalyzedRow = HistoryEntry & {
  gapSeconds: number | null; // time since the previous change (null for the first/baseline row)
  gapLabel: string; // "32h 58m" / "instant" / "—"
  rate: number | null; // implied tokens/sec over the gap (null for baseline)
  rateLabel: string; // "2.6K tok/s" / "—"
  jumpPct: number | null; // delta / oldScore * 100 (null when oldScore is null/0)
  ceiling: number | null; // the suspicious-level jump ceiling that applied (null for baseline)
  bucket: BucketCheck | null; // null when the client uploaded no summary
  severity: Severity;
  acknowledged: boolean; // an admin marked this specific change reviewed-OK
  signals: string[]; // human-readable reasons for the severity
};

export type HistorySummary = {
  changeCount: number; // real changes (excludes the baseline snapshot)
  totalGained: number; // sum of positive deltas (excludes baseline)
  baselineScore: number | null; // the pre-history accumulated total, if present
  currentScore: number | null;
  firstAt: string | null;
  lastAt: string | null;
  activeSpanLabel: string; // first → last change
  avgGapLabel: string; // mean interval between changes
  avgRateLabel: string; // totalGained / active span (coarse overall pace)
  peakRate: number | null;
  peakRateLabel: string;
  peakRateAt: string | null;
  largestJump: number | null;
  largestJumpAt: string | null;
  bucketRows: number; // rows that carried a verifiable bucket summary
  watchCount: number;
  suspiciousCount: number;
  verdict: "clean" | "watch" | "suspicious";
};

export type AnalyzedHistory = { rows: AnalyzedRow[]; summary: HistorySummary };

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

function compact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${Math.round(abs)}`;
}

export function fmtGap(seconds: number): string {
  if (seconds < 1) return "instant";
  const s = Math.round(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function fmtRate(tokPerSec: number): string {
  if (!isFinite(tokPerSec)) return "instant";
  return `${compact(tokPerSec)} tok/s`;
}

export function fmtTokens(n: number): string {
  return compact(n);
}

function fmtSigned(n: number): string {
  return (n > 0 ? "+" : "") + Math.round(n).toLocaleString("en");
}

/** How many tokens a real machine could plausibly have produced in `gapSeconds`. */
function jumpCeiling(gapSeconds: number, tier: "watch" | "suspicious"): number {
  const [burst, rate] =
    tier === "watch"
      ? [THRESHOLDS.WATCH_BURST, THRESHOLDS.WATCH_RATE]
      : [THRESHOLDS.SUS_BURST, THRESHOLDS.SUS_RATE];
  return burst + rate * Math.max(0, gapSeconds);
}

/**
 * Cross-examine the four numbers the client uploaded against the delta the SERVER
 * computed. `delta` is not client-supplied — it is `new_score − old_score` from
 * two rows the database itself wrote — so `sum === delta` is a claim the client
 * cannot dodge merely by inflating garden.json.
 */
function checkBuckets(e: HistoryEntry, delta: number): BucketCheck | null {
  const { bktN: n, bktMax: max, bktSum: sum, bktSpan: span } = e;
  // The client only asserts a summary when it can prove its own ledger accounts
  // for the whole delta; a partial or desynced ledger is uploaded as nothing at
  // all. So "absent" means "no evidence", never "suspicious".
  if (n === null || max === null || sum === null || span === null) return null;

  const problems: string[] = [];
  const sumMatches = Math.abs(sum - delta) <= THRESHOLDS.SUM_TOL;

  if (!sumMatches) {
    problems.push(
      `Bucket total (${fmtSigned(sum)}) does not match the score delta (${fmtSigned(delta)}) — ` +
        `the uploaded score is not backed by the token log.`,
    );
  }
  if (max > THRESHOLDS.BUCKET_SUS) {
    problems.push(
      `One 5-minute window holds ${fmtSigned(max)} tokens — beyond any real machine.`,
    );
  }
  if (n > 0 && n * THRESHOLDS.BUCKET_SECONDS > span + THRESHOLDS.BUCKET_SECONDS) {
    problems.push(
      `${n} five-minute windows cannot fit inside a ${fmtGap(span)} span — the buckets are fabricated.`,
    );
  }
  if (max > sum) {
    problems.push("Busiest window exceeds the total — internally inconsistent.");
  }
  if (n <= 0 && sum > 0) {
    problems.push("Tokens claimed with zero buckets — internally inconsistent.");
  }

  return {
    n,
    max,
    sum,
    span,
    ok: problems.length === 0,
    sumMatches,
    impliedRate: max / THRESHOLDS.BUCKET_SECONDS,
    avgPerBucket: n > 0 ? sum / n : 0,
    problems,
  };
}

export function analyzeHistory(
  entries: HistoryEntry[],
  acknowledgedIds: Set<number> = new Set(),
): AnalyzedHistory {
  // Incoming rows are newest-first; sort ascending so each row can see the one
  // before it. Tie-break by id for same-timestamp rows (backfill + first insert).
  const asc = [...entries].sort((a, b) => toMs(a.at) - toMs(b.at) || a.id - b.id);

  const analyzed: AnalyzedRow[] = asc.map((e, i) => {
    const prev = i > 0 ? asc[i - 1] : null;
    const isBaseline = e.oldScore === null;
    const gapSeconds = prev ? Math.max(0, (toMs(e.at) - toMs(prev.at)) / 1000) : null;

    let rate: number | null = null;
    let jumpPct: number | null = null;
    let ceiling: number | null = null;
    let bucket: BucketCheck | null = null;
    const signals: string[] = [];
    let severity: Severity = "normal";

    if (isBaseline) {
      // No predecessor ⇒ no ceiling to apply. All we can ask is whether the
      // starting total is itself believable. This is the off→on re-register path,
      // so it is not merely cosmetic.
      severity = "baseline";
      signals.push("Starting baseline — the accumulated total before per-change history began.");
      if (e.newScore >= THRESHOLDS.BASELINE_SUS) {
        severity = "suspicious";
        signals.push(
          `First-ever total is ${fmtSigned(e.newScore)} — far past any plausible lifetime usage.`,
        );
      } else if (e.newScore >= THRESHOLDS.BASELINE_WATCH) {
        severity = "watch";
        signals.push(
          `First-ever total is ${fmtSigned(e.newScore)} — unusually high for a fresh registration.`,
        );
      }
    } else {
      const effGap = gapSeconds === null ? null : Math.max(gapSeconds, 1);
      if (effGap !== null) rate = e.delta / effGap;
      if (e.oldScore && e.oldScore > 0) jumpPct = (e.delta / e.oldScore) * 100;

      bucket = checkBuckets(e, e.delta);

      const isX100 =
        e.oldScore !== null &&
        e.oldScore > 0 &&
        Math.abs(e.newScore - e.oldScore * 100) <= THRESHOLDS.X100_TOL;

      if (e.delta < 0) {
        severity = "suspicious";
        signals.push("Score DECREASED — scores normally only grow; a drop is a tamper signal.");
      } else if (isX100) {
        signals.push("Exact ×100 — matches the one-time v2→v3 metric migration (legit).");
      } else {
        const gap = gapSeconds ?? 0;
        const susCeiling = jumpCeiling(gap, "suspicious");
        const watchCeiling = jumpCeiling(gap, "watch");
        ceiling = susCeiling;

        // ── The bucket summary is the sharpest test we have; it runs first. ──
        if (bucket && !bucket.ok) {
          severity = "suspicious";
          signals.push(...bucket.problems);
        } else if (bucket && bucket.max > THRESHOLDS.BUCKET_WATCH) {
          severity = "watch";
          signals.push(
            `Busiest 5-minute window holds ${fmtSigned(bucket.max)} tokens ` +
              `(${fmtRate(bucket.impliedRate)}) — high, but not impossible.`,
          );
        }

        // ── The time-scaled ceiling. Always in force: a forged-but-consistent
        //    summary must not be able to launder an impossible jump. ──
        if (e.delta > susCeiling) {
          severity = "suspicious";
          signals.push(
            `Gained ${fmtSigned(e.delta)} in ${fmtGap(gap)} — over the ${fmtSigned(susCeiling)} ` +
              `ceiling for that interval.`,
          );
        } else if (severity === "normal" && e.delta > watchCeiling) {
          if (bucket?.ok) {
            // Spread across enough real 5-minute windows to explain itself: this
            // is the hoarded-bubble case the old absolute thresholds mangled.
            signals.push(
              `Large gain (${fmtSigned(e.delta)}) but accounted for: ${bucket.n} five-minute ` +
                `windows over ${fmtGap(bucket.span)}, busiest ${fmtSigned(bucket.max)}, total matches.`,
            );
          } else {
            severity = "watch";
            signals.push(
              `Gained ${fmtSigned(e.delta)} in ${fmtGap(gap)} — over the ${fmtSigned(watchCeiling)} ` +
                `ceiling for that interval.`,
            );
          }
        }

        if (
          severity === "normal" &&
          jumpPct !== null &&
          jumpPct > THRESHOLDS.HUGE_PCT &&
          (e.oldScore ?? 0) >= THRESHOLDS.PCT_MIN_BASE &&
          !bucket?.ok
        ) {
          severity = "watch";
          signals.push(`Grew ${Math.round(jumpPct)}% in one step.`);
        }

        if (severity === "normal" && signals.length === 0) {
          signals.push(
            bucket?.ok
              ? `Within normal bounds — ${bucket.n} five-minute windows, total matches the delta.`
              : "Within normal bounds.",
          );
        }
      }
    }

    // A server-set flag (from the future DB gate) always escalates to suspicious.
    if (e.flagged && severity !== "suspicious") {
      severity = "suspicious";
      signals.unshift(`Server-flagged${e.reason ? `: ${e.reason}` : ""}.`);
    }

    // An admin can acknowledge a flagged row as reviewed-OK → it renders normal
    // and leaves the flagged counts.
    const acknowledged = acknowledgedIds.has(e.id);
    if (acknowledged && (severity === "watch" || severity === "suspicious")) {
      signals.unshift("Reviewed OK — cleared by an admin.");
      severity = "normal";
    }

    return {
      ...e,
      gapSeconds,
      gapLabel: gapSeconds === null ? "—" : fmtGap(gapSeconds),
      rate,
      rateLabel: rate === null ? "—" : fmtRate(rate),
      jumpPct,
      ceiling,
      bucket,
      severity,
      acknowledged,
      signals,
    };
  });

  const real = analyzed.filter((r) => r.oldScore !== null);
  const totalGained = real.reduce((s, r) => s + Math.max(0, r.delta), 0);

  let peakRate: number | null = null;
  let peakRateAt: string | null = null;
  let largestJump: number | null = null;
  let largestJumpAt: string | null = null;
  for (const r of real) {
    if (r.rate !== null && (peakRate === null || r.rate > peakRate)) {
      peakRate = r.rate;
      peakRateAt = r.at;
    }
    if (largestJump === null || r.delta > largestJump) {
      largestJump = r.delta;
      largestJumpAt = r.at;
    }
  }

  const first = asc[0] ?? null;
  const last = asc[asc.length - 1] ?? null;
  const spanS = first && last ? Math.max(0, (toMs(last.at) - toMs(first.at)) / 1000) : 0;
  const gaps = real.map((r) => r.gapSeconds).filter((x): x is number => x !== null);
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
  const avgRate = spanS > 0 ? totalGained / spanS : null;

  const watchCount = analyzed.filter((r) => r.severity === "watch").length;
  const suspiciousCount = analyzed.filter((r) => r.severity === "suspicious").length;

  const summary: HistorySummary = {
    changeCount: real.length,
    totalGained,
    baselineScore: asc.find((r) => r.oldScore === null)?.newScore ?? null,
    currentScore: last?.newScore ?? null,
    firstAt: first?.at ?? null,
    lastAt: last?.at ?? null,
    activeSpanLabel: spanS ? fmtGap(spanS) : "—",
    avgGapLabel: avgGap === null ? "—" : fmtGap(avgGap),
    avgRateLabel: avgRate === null ? "—" : fmtRate(avgRate),
    peakRate,
    peakRateLabel: peakRate === null ? "—" : fmtRate(peakRate),
    peakRateAt,
    largestJump,
    largestJumpAt,
    bucketRows: analyzed.filter((r) => r.bucket !== null).length,
    watchCount,
    suspiciousCount,
    verdict: suspiciousCount > 0 ? "suspicious" : watchCount > 0 ? "watch" : "clean",
  };

  // Return newest-first for display.
  return { rows: [...analyzed].reverse(), summary };
}
