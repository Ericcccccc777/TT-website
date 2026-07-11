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
 * Thresholds are deliberately conservative starting values — tune them as the
 * community's real usage distribution becomes clear (they are all in one place).
 */
export const THRESHOLDS = {
  // Calibrated to the desktop app's physics: score only advances when a human
  // clicks a bubble (≤5 on screen, each expiring 5 min after its turn), one
  // Claude message contributes at most ~its context window in cache_read
  // (~1–1.3M tokens), and the client syncs the cumulative total ~every 30 min.
  // So even an extreme, never-idle power user accrues only low tens of millions
  // per active 30-min window; ~5–10M tokens/min is the implausible line.
  //
  // Implied average rate = delta / interval.
  HARD_RATE: 200_000, // tok/s (~12M/min avg) → suspicious. Physically unreachable sustained.
  SOFT_RATE: 100_000, // tok/s (~6M/min avg) → watch.
  // Absolute single-step jump (one sync window).
  BIG_JUMP: 500_000_000, // ≥ +5e8 in ONE step → suspicious (far beyond a legit ~30-min window).
  WATCH_JUMP: 150_000_000, // ≥ +1.5e8 in one step → watch (large; the "sudden big increase" signal).
  // Relative explosion, guarded so early small-base growth doesn't cry wolf.
  HUGE_PCT: 900, // grew > 9x (900%) in one step → watch …
  PCT_MIN_BASE: 100_000_000, // … but only when the prior score was already ≥ 1e8.
  // The ONE legit big jump: the v2→v3 metric migration multiplies a saved total
  // by exactly ×100. Treat newScore ≈ oldScore×100 as legitimate, not fabrication.
  X100_TOL: 100, // tokens of rounding slack when matching the ×100 relationship.
} as const;

export type Severity = "baseline" | "normal" | "watch" | "suspicious";

export type AnalyzedRow = HistoryEntry & {
  gapSeconds: number | null; // time since the previous change (null for the first/baseline row)
  gapLabel: string; // "32h 58m" / "instant" / "—"
  rate: number | null; // implied tokens/sec over the gap (null for baseline)
  rateLabel: string; // "2.6K tok/s" / "—"
  jumpPct: number | null; // delta / oldScore * 100 (null when oldScore is null/0)
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

function fmtSigned(n: number): string {
  return (n > 0 ? "+" : "") + Math.round(n).toLocaleString("en");
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
    const signals: string[] = [];
    let severity: Severity = "normal";

    if (isBaseline) {
      severity = "baseline";
      signals.push("Starting baseline — the accumulated total before per-change history began.");
    } else {
      const effGap = gapSeconds === null ? null : Math.max(gapSeconds, 1);
      if (effGap !== null) rate = e.delta / effGap;
      if (e.oldScore && e.oldScore > 0) jumpPct = (e.delta / e.oldScore) * 100;

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
        if (rate !== null && rate > THRESHOLDS.HARD_RATE) {
          severity = "suspicious";
          signals.push(`Implausible average rate (${fmtRate(rate)}) — above the physical ceiling.`);
        }
        if (e.delta >= THRESHOLDS.BIG_JUMP) {
          severity = "suspicious";
          signals.push(`Huge single jump (${fmtSigned(e.delta)}) — beyond a legit ~30-min window.`);
        }
        if (severity === "normal" && rate !== null && rate > THRESHOLDS.SOFT_RATE) {
          severity = "watch";
          signals.push(`High burst rate (${fmtRate(rate)} over ${fmtGap(gapSeconds ?? 0)}).`);
        }
        if (severity === "normal" && e.delta >= THRESHOLDS.WATCH_JUMP) {
          severity = "watch";
          signals.push(`Large single jump (${fmtSigned(e.delta)}) over ${fmtGap(gapSeconds ?? 0)}.`);
        }
        if (
          severity === "normal" &&
          jumpPct !== null &&
          jumpPct > THRESHOLDS.HUGE_PCT &&
          (e.oldScore ?? 0) >= THRESHOLDS.PCT_MIN_BASE
        ) {
          severity = "watch";
          signals.push(`Grew ${Math.round(jumpPct)}% in one step.`);
        }
        if (severity === "normal") signals.push("Within normal bounds.");
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
      severity,
      acknowledged,
      signals,
    };
  });

  const real = analyzed.filter((r) => r.severity !== "baseline");
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
    watchCount,
    suspiciousCount,
    verdict: suspiciousCount > 0 ? "suspicious" : watchCount > 0 ? "watch" : "clean",
  };

  // Return newest-first for display.
  return { rows: [...analyzed].reverse(), summary };
}
