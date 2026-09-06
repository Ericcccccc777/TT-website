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
  problems: Signal[]; // why !ok, if it isn't
};

/**
 * A reason, not a sentence. The analyser runs on the server with no notion of
 * the admin's language, so it emits a key plus its numbers and the page renders
 * it through lib/ranger/i18n. Adding a language never touches this file.
 */
export type Signal = { key: string; p?: Record<string, string | number> };

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
  signals: Signal[]; // structured reasons; rendered per-language by the page
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

  const problems: Signal[] = [];
  const sumMatches = Math.abs(sum - delta) <= THRESHOLDS.SUM_TOL;

  if (!sumMatches) {
    problems.push({ key: "sigSumMismatch", p: { sum: fmtSigned(sum), delta: fmtSigned(delta) } });
  }
  if (max > THRESHOLDS.BUCKET_SUS) {
    problems.push({ key: "sigWindowImpossible", p: { max: fmtSigned(max) } });
  }
  if (n > 0 && n * THRESHOLDS.BUCKET_SECONDS > span + THRESHOLDS.BUCKET_SECONDS) {
    problems.push({ key: "sigWindowsDontFit", p: { n, span: fmtGap(span) } });
  }
  if (max > sum) {
    problems.push({ key: "sigMaxOverSum" });
  }
  if (n <= 0 && sum > 0) {
    problems.push({ key: "sigZeroBuckets" });
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
    const signals: Signal[] = [];
    let severity: Severity = "normal";

    if (isBaseline) {
      // No predecessor ⇒ no ceiling to apply. All we can ask is whether the
      // starting total is itself believable. This is the off→on re-register path,
      // so it is not merely cosmetic.
      severity = "baseline";
      signals.push({ key: "sigBaseline" });
      if (e.newScore >= THRESHOLDS.BASELINE_SUS) {
        severity = "suspicious";
        signals.push({ key: "sigBaselineSus", p: { v: fmtSigned(e.newScore) } });
      } else if (e.newScore >= THRESHOLDS.BASELINE_WATCH) {
        severity = "watch";
        signals.push({ key: "sigBaselineWatch", p: { v: fmtSigned(e.newScore) } });
      }
    } else {
      const effGap = gapSeconds === null ? null : Math.max(gapSeconds, 1);
      // trueDelta over delta wherever available (migration 0016): a re-insert
      // restates the WHOLE score as `delta`, so rate/jump/bucket checks computed
      // from it read a lifetime of tokens as one instant gain and invent
      // suspicion for anyone who merely toggled the leaderboard off and on.
      const gain = e.trueDelta ?? e.delta;
      if (effGap !== null) rate = gain / effGap;
      if (e.oldScore && e.oldScore > 0) jumpPct = (gain / e.oldScore) * 100;

      bucket = checkBuckets(e, gain);

      const isX100 =
        e.oldScore !== null &&
        e.oldScore > 0 &&
        Math.abs(e.newScore - e.oldScore * 100) <= THRESHOLDS.X100_TOL;

      if (gain < 0) {
        severity = "suspicious";
        signals.push({ key: "sigDecreased" });
      } else if (isX100) {
        signals.push({ key: "sigX100" });
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
          signals.push({
            key: "sigBusyWindow",
            p: { max: fmtSigned(bucket.max), rate: fmtRate(bucket.impliedRate) },
          });
        }

        // ── The time-scaled ceiling. Always in force: a forged-but-consistent
        //    summary must not be able to launder an impossible jump. ──
        if (gain > susCeiling) {
          severity = "suspicious";
          signals.push({
            key: "sigOverCeiling",
            p: { gain: fmtSigned(gain), gap: fmtGap(gap), ceiling: fmtSigned(susCeiling) },
          });
        } else if (severity === "normal" && gain > watchCeiling) {
          if (bucket?.ok) {
            // Spread across enough real 5-minute windows to explain itself: this
            // is the hoarded-bubble case the old absolute thresholds mangled.
            signals.push({
              key: "sigLargeButAccounted",
              p: {
                gain: fmtSigned(gain), n: bucket.n,
                span: fmtGap(bucket.span), max: fmtSigned(bucket.max),
              },
            });
          } else {
            severity = "watch";
            signals.push({
              key: "sigOverCeiling",
              p: { gain: fmtSigned(gain), gap: fmtGap(gap), ceiling: fmtSigned(watchCeiling) },
            });
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
          signals.push({ key: "sigGrewPct", p: { pct: Math.round(jumpPct) } });
        }

        if (severity === "normal" && signals.length === 0) {
          signals.push(
            bucket?.ok
              ? { key: "sigNormalWithBuckets", p: { n: bucket.n } }
              : { key: "sigNormal" },
          );
        }
      }
    }

    // A server-set flag (from the future DB gate) always escalates to suspicious.
    if (e.flagged && severity !== "suspicious") {
      severity = "suspicious";
      signals.unshift({ key: "sigServerFlagged", p: { reason: e.reason ?? "" } });
    }

    // An admin can acknowledge a flagged row as reviewed-OK → it renders normal
    // and leaves the flagged counts.
    const acknowledged = acknowledgedIds.has(e.id);
    if (acknowledged && (severity === "watch" || severity === "suspicious")) {
      signals.unshift({ key: "sigReviewedOk" });
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
  // trueDelta throughout (0016): `delta` restates the whole score on a re-insert.
  const totalGained = real.reduce((s, r) => s + Math.max(0, r.trueDelta ?? r.delta), 0);

  let peakRate: number | null = null;
  let peakRateAt: string | null = null;
  let largestJump: number | null = null;
  let largestJumpAt: string | null = null;
  for (const r of real) {
    if (r.rate !== null && (peakRate === null || r.rate > peakRate)) {
      peakRate = r.rate;
      peakRateAt = r.at;
    }
    const g = r.trueDelta ?? r.delta;
    if (largestJump === null || g > largestJump) {
      largestJump = g;
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

// ── Quarantine explanations + throttling detection (migration 0016) ──────────
// Two separate jobs, both aimed at the same problem: an admin looking at a held
// row cannot tell from `peak,rate` what actually happened, and a patient cheat
// that stays just under every threshold produces no held rows at all.

/** Machine hold code -> i18n keys. The sentences live in lib/ranger/i18n. */
export const HOLD_REASON_KEYS: Record<string, { short: string; why: string }> = {
  peak: { short: "hrPeak", why: "hrPeakWhy" },
  rate: { short: "hrRate", why: "hrRateWhy" },
  wallclock: { short: "hrWallclock", why: "hrWallclockWhy" },
  relaunder: { short: "hrRelaunder", why: "hrRelaunderWhy" },
  impossible_windows: { short: "hrWindows", why: "hrWindowsWhy" },
};

export function explainHold(reasons: string[]): { short: string; why: string }[] {
  return reasons.map((r) => HOLD_REASON_KEYS[r] ?? { short: "hrUnknown", why: "hrUnknown" });
}


/** How close an event sat to each ceiling, 0..1+ (1 = exactly at the limit). */
function ceilingLoads(e: HistoryEntry, gain: number, gapSeconds: number | null): number[] {
  const out: number[] = [];
  if (e.bktMax !== null) out.push(e.bktMax / 300 / 250_000);
  if (e.bktN && e.bktSum !== null) out.push(e.bktSum / ((e.bktN * 300) / 3600) / 400e6);
  if (gapSeconds && gapSeconds > 0) {
    // Mirrors the DB rule: only the part no bucket vouches for.
    const remainder = gain - (e.bktSum ?? 0);
    if (remainder > 0) out.push(remainder / (gapSeconds / 3600) / 600e6);
  }
  return out;
}

export type ThrottleVerdict = {
  hugging: number;    // events sitting at or above 60% of some ceiling
  measured: number;   // events where any ceiling could be measured at all
  ratio: number;
  suspicious: boolean;
};

/**
 * A cheat that throttles itself never trips a rule, so no single event looks
 * wrong. What it cannot hide is the SHAPE: real work varies wildly and rarely
 * approaches the ceiling, while a governed loop parks just underneath it and
 * stays there. This reports that shape; it holds nothing by itself, it only
 * tells a human where to look.
 */
export function detectThrottling(rows: AnalyzedRow[]): ThrottleVerdict {
  let hugging = 0;
  let measured = 0;
  for (const r of rows) {
    // Held events are excluded: they already have a verdict, and counting them
    // would let this panel claim "nothing was held" on an account that plainly
    // had something held.
    if (r.quarantined) continue;
    const loads = ceilingLoads(r, r.trueDelta ?? r.delta, r.gapSeconds ?? null);
    if (!loads.length) continue;
    measured += 1;
    // No upper bound. The rules hold only on STRICTLY exceeding a threshold, so
    // a load of exactly 1 is both legal and the most perfectly throttled value
    // there is — excluding it would leave a gap sitting on the line itself.
    if (Math.max(...loads) >= 0.6) hugging += 1;
  }
  const ratio = measured ? hugging / measured : 0;
  // Needs a run, not a coincidence: 4+ events and over half of them hugging.
  const suspicious = measured >= 4 && ratio > 0.5;
  return { hugging, measured, ratio, suspicious };
}

// ── Day grouping (ranger-daily-history) ──────────────────────────────────────
// The per-event list is unreadable for an active account: 182 rows arriving in
// half-hour bursts, each a number that means nothing alone. The question an admin
// actually arrives with is "what kind of day was this". So the analysed rows get
// regrouped into UTC calendar days — AFTER analysis, never before, because every
// event's severity, interval and ceiling are computed against its immediate
// predecessor and grouping first would sever the first event of each group from it.

const SEV_RANK: Record<Severity, number> = {
  normal: 0,
  baseline: 1,
  watch: 2,
  suspicious: 3,
};

/** UTC calendar day of an ISO timestamp: "2026-09-05". The whole page thinks in UTC. */
export function utcDayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** UTC calendar month: "2026-09". */
export function utcMonthKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 7);
}

/** Distinct months present in these rows, newest first. Drives the month picker. */
export function monthsOf(rows: HistoryEntry[]): string[] {
  return [...new Set(rows.map((r) => utcMonthKey(r.at)))].sort((a, b) => b.localeCompare(a));
}

/**
 * Coerce a `?month=` query param to a month this player actually has, or null (= all
 * months). Membership in `available` — which is `monthsOf(history)` — is the whole
 * test: there is no format validation and no error channel, so a malformed month and a
 * well-formed month the player has no records in necessarily collapse into the same
 * "show the full record" outcome (spec § 3.1). Never throws.
 */
export function resolveMonthParam(
  raw: string | string[] | undefined,
  available: string[],
): string | null {
  return typeof raw === "string" && available.includes(raw) ? raw : null;
}

export type DayRow = {
  key: string; // "2026-09-05"
  dayMs: number; // UTC midnight
  events: AnalyzedRow[]; // newest-first, as displayed
  count: number; // non-baseline events
  gain: number; // Σ (trueDelta ?? delta), withheld events included
  windowSeconds: number; // 0 when unmeasurable
  windowLabel: string;
  rate: number | null;
  rateLabel: string;
  ceilingPct: number | null; // the day's gain as a share of the day's own ceiling
  /**
   * The worst SINGLE event's share of ITS OWN ceiling. This is the whole reason a
   * day view is safe to ship: a send that produced 240% of what was possible in its
   * own eleven minutes lands near 38% once averaged across a busy day. Carried
   * whenever the day holds anything flagged or over-ceiling, so the rolled-up number
   * is never the only thing on screen for a day that has something in it.
   */
  worstEventPct: number | null;
  severity: Severity; // highest in the day
  flaggedCount: number; // events left at watch|suspicious after acknowledgement
  /** Events an admin ruled reviewed-OK. Their severity was rewritten to normal, so
   *  without this count a day holding one is byte-identical to a day holding nothing —
   *  and the acknowledgement, which used to be visible in the top-level list, would be
   *  buried inside a collapsed day with no hint on the outside. */
  acknowledgedCount: number;
  heldCount: number;
  heldTokens: number;
  baselineOnly: boolean; // holds nothing but the starting snapshot
};

/**
 * Group analysed rows into days.
 *
 * `display` is the (possibly month-filtered) slice to render. `full` is the WHOLE
 * analysed history and is used for one thing only: finding the last event before a
 * day started, which anchors that day's measurement window. Taking it from `display`
 * would make the first day of every month measure from its own 00:00 regardless of
 * whether the player synced at 23:50 the night before — every month's opening day
 * would read systematically faster and closer to the ceiling than it was.
 */
export function groupByDay(display: AnalyzedRow[], full: AnalyzedRow[]): DayRow[] {
  const fullAsc = [...full].sort((a, b) => toMs(a.at) - toMs(b.at) || a.id - b.id);

  const buckets = new Map<string, AnalyzedRow[]>();
  for (const r of display) {
    const k = utcDayKey(r.at);
    const arr = buckets.get(k);
    if (arr) arr.push(r);
    else buckets.set(k, [r]);
  }

  // Ascending so the scan below can walk `fullAsc` once instead of re-filtering it per
  // day. At the sizing HISTORY_LIMIT now permits (2000 rows over ~400 days) the filter
  // form cost 112ms of blocking server CPU per render; this costs one pass.
  const keysAsc = [...buckets.keys()].sort();
  const days: DayRow[] = [];
  let fi = 0; // first index in fullAsc at or after the current day's start
  for (const key of keysAsc) {
    const unsorted = buckets.get(key) as AnalyzedRow[];
    // Newest-first inside the day, matching how the page has always listed events.
    const events = [...unsorted].sort((a, b) => toMs(b.at) - toMs(a.at) || b.id - a.id);
    const dayMs = Date.parse(`${key}T00:00:00.000Z`);
    const dayEnd = dayMs + 864e5;
    const real = events.filter((r) => r.oldScore !== null);
    const baselineOnly = real.length === 0;

    const gain = real.reduce((s, r) => s + (r.trueDelta ?? r.delta), 0);

    // The window: from the previous event — or the day's own start, whichever is
    // later — to the last event of the day. Everything else on the line is scoped
    // to the day, so a window reaching back across days would make the rate answer
    // a different question from the gain sitting beside it.
    const lastAt = Math.max(...events.map((r) => toMs(r.at)));
    // `keysAsc` only moves forward, so `fi` only moves forward too.
    while (fi < fullAsc.length && toMs(fullAsc[fi].at) < dayMs) fi += 1;
    const prevAt = fi > 0 ? toMs(fullAsc[fi - 1].at) : null;
    // Only the OLDEST day has no predecessor, and "no predecessor" means one of two very
    // different things. If the oldest row we hold is the player's baseline snapshot we
    // are genuinely looking at their first day, and it opens at its own first event. If
    // it is not — a read truncated at HISTORY_LIMIT, or an account whose history predates
    // the capture trigger — there IS an earlier event we cannot see, and opening at the
    // day's first event would shorten the window to the part we happen to hold: the day
    // then reads several times too fast and can cross a severity threshold on nothing but
    // where the read stopped. Unmeasurable is the honest answer, and it is the posture the
    // rest of this file already takes (absent evidence is never evidence).
    const startsAtBaseline = fullAsc.length > 0 && fullAsc[0].oldScore === null;
    const start =
      prevAt !== null
        ? Math.max(dayMs, prevAt)
        : startsAtBaseline
          ? Math.min(...events.map((r) => toMs(r.at)))
          : null;
    const windowSeconds =
      baselineOnly || start === null ? 0 : Math.max(0, (Math.min(lastAt, dayEnd) - start) / 1000);

    // Floored at one second, mirroring the per-event path (`effGap`). A day whose only
    // send lands in the first moments after midnight otherwise divides by a fraction and
    // reports a rate inflated by orders of magnitude — beside a window label reading
    // "instant" — which then wins the "fastest day" sort outright.
    const measurable = windowSeconds >= 1;
    const rate = measurable ? gain / windowSeconds : null;
    const dayCeiling = THRESHOLDS.SUS_BURST + THRESHOLDS.SUS_RATE * windowSeconds;
    // A ceiling bounds production; a loss produced nothing, so it gets no share.
    const ceilingPct = !baselineOnly && gain > 0 && measurable ? (gain / dayCeiling) * 100 : null;

    let severity: Severity = "normal";
    let flaggedCount = 0;
    let acknowledgedCount = 0;
    let heldCount = 0;
    let heldTokens = 0;
    let worst: number | null = null;
    for (const r of events) {
      if (SEV_RANK[r.severity] > SEV_RANK[severity]) severity = r.severity;
      if (r.severity === "watch" || r.severity === "suspicious") flaggedCount += 1;
      if (r.acknowledged) acknowledgedCount += 1;
      if (r.quarantined) {
        heldCount += 1;
        heldTokens += r.trueDelta ?? r.delta;
      }
      // `r.ceiling` is left null by analyzeHistory for the two verdicts that return
      // early — a decrease, and the ×100 metric-migration whitelist. Skipping those
      // rows here would mean a send shaped like the whitelist could carry billions of
      // tokens and leave NO day-level trace at all, which is precisely the hiding place
      // this figure exists to close. The elapsed time is known either way, so the
      // ceiling is computable either way; recompute it rather than skip the row.
      const evCeiling =
        r.ceiling ??
        (r.oldScore === null
          ? null
          : THRESHOLDS.SUS_BURST + THRESHOLDS.SUS_RATE * Math.max(0, r.gapSeconds ?? 0));
      if (evCeiling !== null && evCeiling > 0) {
        const pct = (Math.max(0, r.trueDelta ?? r.delta) / evCeiling) * 100;
        if (worst === null || pct > worst) worst = pct;
      }
    }

    days.push({
      key,
      dayMs,
      events,
      count: real.length,
      gain,
      windowSeconds,
      windowLabel: windowSeconds > 0 ? fmtGap(windowSeconds) : "—",
      rate,
      rateLabel: rate === null ? "—" : fmtRate(rate),
      ceilingPct,
      // Shown only when the day actually holds something — otherwise every quiet day
      // would carry a second number that says nothing. `acknowledgedCount` is in the
      // test on purpose: acknowledgement rewrites severity to normal, so without it a
      // day whose flagged send an admin has already ruled on goes completely silent and
      // becomes indistinguishable from a day that never had one.
      worstEventPct:
        worst !== null && (flaggedCount > 0 || acknowledgedCount > 0 || worst > 100)
          ? worst
          : null,
      severity,
      flaggedCount,
      acknowledgedCount,
      heldCount,
      heldTokens,
      baselineOnly,
    });
  }

  return days.sort((a, b) => b.dayMs - a.dayMs);
}
