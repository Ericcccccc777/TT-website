/**
 * Server-rendered SVG charts for the /ranger admin console.
 *
 * No client JS, no charting library: the rest of /ranger is deliberately
 * server-rendered (URL-driven filters, form-posting actions), and a chart library
 * would drag a "use client" boundary and a bundle into a page that has neither.
 * These are plain <svg> elements built from the same data the tables already show.
 * Hover uses <title>, which the browser renders natively — enough for an admin tool.
 *
 * Scales are computed from the data on every render (that is the point — a user with
 * 12k tokens and a user with 12 billion both get a readable axis). Ticks land on
 * round numbers via niceTicks(); the token axis picks its own unit (K / M / B) from
 * the range, and the time axis picks its own granularity from the span.
 *
 * Colours: single-series charts use the page's own leaf-deep; anything carrying a
 * verdict reuses the SAME red/amber the severity badges and row tints already use,
 * so the chart and the table speak one language. The multi-user comparison uses a
 * CVD-validated categorical set (worst adjacent ΔE 24.2 on this parchment surface);
 * four of its hues sit under 3:1 contrast, so every line is DIRECTLY LABELLED at its
 * end and repeated in the legend — identity never rests on colour alone.
 */

// ── Palette ───────────────────────────────────────────────────────────────────
const INK = "#1e2521"; // --color-text-forest
const MUTED = "#5a6b5e"; // --color-text-muted-light
const GRID = "rgba(30,37,33,0.10)";
const AXIS = "rgba(30,37,33,0.28)";
const SURFACE = "#faf5ea"; // --color-surface-parchment: the ring/gap colour
const SERIES = "#3a7d44"; // --color-leaf-deep
const SEV_COLOR: Record<string, string> = {
  suspicious: "#b91c1c",
  watch: "#b45309",
  baseline: "#7a5a3a",
  normal: SERIES,
};

/** CVD-validated on #faf5ea (worst adjacent ΔE 24.2). Assigned in fixed order — never cycled. */
export const CATEGORICAL = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#e87ba4",
  "#eb6834",
] as const;
export const MAX_SERIES = CATEGORICAL.length;

// ── Scales ────────────────────────────────────────────────────────────────────

/**
 * Round tick steps (1 / 2 / 5 × 10ⁿ) covering [0, max]. This is what makes the axis
 * "optimise itself" to the data: 12k tokens gets 0/3k/6k/9k/12k, 12 billion gets
 * 0/3B/6B/9B/12B — same code, same shape, no hardcoded ceiling anywhere.
 */
export function niceTicks(max: number, target = 5): number[] {
  if (!isFinite(max) || max <= 0) return [0, 1];
  const raw = max / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  // Round the TOP TICK UP past max — never merely up to it. Stopping at the last tick
  // ≤ max leaves the axis shorter than the data, so the tallest bar in every chart gets
  // clipped and wears the "over the axis" marker. On this page that marker means "we could
  // not draw how far past the ceiling this went", i.e. it reads as an accusation — and it
  // would have appeared on the single biggest HONEST sync in every user's history.
  const top = Math.ceil(max / step - 1e-9) * step;
  const out: number[] = [];
  for (let i = 0; i * step <= top + step * 1e-9; i++) out.push(i * step);
  if (out.length < 2) out.push(step);
  return out;
}

/** One unit for the whole axis, chosen from its top tick — so ticks read 0 / 1.5B / 3B, not raw digits. */
export function axisUnit(max: number): { div: number; suffix: string } {
  if (max >= 1e9) return { div: 1e9, suffix: "B" };
  if (max >= 1e6) return { div: 1e6, suffix: "M" };
  if (max >= 1e3) return { div: 1e3, suffix: "K" };
  return { div: 1, suffix: "" };
}

export function fmtAxis(v: number, u: { div: number; suffix: string }): string {
  if (v === 0) return "0"; // "0B" reads like a unit of zero-bytes; the baseline is just zero
  const n = v / u.div;
  const s = n >= 100 || Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1);
  return `${s}${u.suffix}`;
}

export function fmtFull(v: number): string {
  return Math.round(v).toLocaleString("en");
}

/** Time ticks whose granularity follows the span: minutes → hours → days → months. */
function timeTicks(minMs: number, maxMs: number, count = 5): number[] {
  if (!(maxMs > minMs)) return [minMs];
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(minMs + ((maxMs - minMs) * i) / (count - 1));
  return out;
}

function fmtTimeTick(ms: number, spanMs: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  if (spanMs < 2 * 864e5) return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; // < 2 days → HH:MM
  if (spanMs < 400 * 864e5) return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; // < ~13 months → M/D
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}`;
}

// ── Chart chrome ──────────────────────────────────────────────────────────────

const W = 960;
const H = 300;
const PAD = { top: 16, right: 74, bottom: 30, left: 62 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

function Frame({
  yTicks,
  yMax,
  xTicks,
  xMin,
  xMax,
  xFmt,
  percent,
  children,
}: {
  yTicks: number[];
  yMax: number;
  xTicks: number[];
  xMin: number;
  xMax: number;
  xFmt: (v: number) => string;
  percent?: boolean; // the y values are already a ratio — label them as such, not as tokens
  children: React.ReactNode;
}) {
  const u = percent
    ? { div: 1, suffix: "%" }
    : axisUnit(yTicks[yTicks.length - 1] ?? yMax);
  const y = (v: number) => PAD.top + PH - (v / yMax) * PH;
  const x = (v: number) => PAD.left + (xMax > xMin ? ((v - xMin) / (xMax - xMin)) * PW : PW / 2);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
    >
      {/* Gridlines: hairline, solid, recessive — they must never compete with the data. */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          <text
            x={PAD.left - 8}
            y={y(t) + 3.5}
            textAnchor="end"
            fontSize={11}
            fill={MUTED}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {fmtAxis(t, u)}
          </text>
        </g>
      ))}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={PAD.top + PH}
        y2={PAD.top + PH}
        stroke={AXIS}
        strokeWidth={1}
      />
      {xTicks.map((t, i) => (
        <text
          key={i}
          x={x(t)}
          y={H - 10}
          textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
          fontSize={11}
          fill={MUTED}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {xFmt(t)}
        </text>
      ))}
      {children}
    </svg>
  );
}

export function ChartCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <figure
      className="rounded-[2px] bg-surface-card px-4 pt-3 pb-2"
      style={{ border: "var(--border-pixel)" }}
    >
      <figcaption className="mb-1">
        <div
          className="text-leaf-deep"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
        >
          {title}
        </div>
        {note && <div className="mt-0.5 text-[10px] text-text-muted-light opacity-75">{note}</div>}
      </figcaption>
      {children}
    </figure>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[140px] items-center justify-center text-[11px] text-text-muted-light opacity-60">
      {label}
    </div>
  );
}

// ── 1. Cumulative score over time ─────────────────────────────────────────────

export type TimePoint = { t: number; v: number; severity?: string; label?: string };

export function CumulativeChart({ points, empty }: { points: TimePoint[]; empty: string }) {
  if (points.length < 2) return <Empty label={empty} />;

  const xMin = points[0].t;
  const xMax = points[points.length - 1].t;
  const yTicks = niceTicks(Math.max(...points.map((p) => p.v)));
  const yMax = yTicks[yTicks.length - 1];
  const y = (v: number) => PAD.top + PH - (v / yMax) * PH;
  const x = (t: number) => PAD.left + (xMax > xMin ? ((t - xMin) / (xMax - xMin)) * PW : PW / 2);

  // A cumulative total is a step function — it only moves when a sync lands. Drawing it
  // as a smooth slope would invent growth between the points that never happened.
  const d = points
    .map((p, i) => (i === 0 ? `M${x(p.t)},${y(p.v)}` : `H${x(p.t)}V${y(p.v)}`))
    .join(" ");
  const area = `${d} V${y(0)} H${x(points[0].t)} Z`;
  const span = xMax - xMin;

  return (
    <Frame
      yTicks={yTicks}
      yMax={yMax}
      xTicks={timeTicks(xMin, xMax)}
      xMin={xMin}
      xMax={xMax}
      xFmt={(t) => fmtTimeTick(t, span)}
    >
      <path d={area} fill={SERIES} fillOpacity={0.1} />
      <path d={d} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => {
        const c = SEV_COLOR[p.severity ?? "normal"] ?? SERIES;
        const flagged = p.severity === "watch" || p.severity === "suspicious";
        // Only the flagged points get a dot. A marker on all 200 of them would be noise —
        // the line already carries the shape; the dots carry the story.
        if (!flagged && i !== points.length - 1) return null;
        return (
          <circle
            key={i}
            cx={x(p.t)}
            cy={y(p.v)}
            r={flagged ? 5 : 4}
            fill={c}
            stroke={SURFACE}
            strokeWidth={2}
          >
            <title>{p.label ?? fmtFull(p.v)}</title>
          </circle>
        );
      })}
    </Frame>
  );
}

// ── 2. Per-change bars (delta, % of ceiling, busiest window …) ────────────────

export type Bar = { t: number; v: number; severity?: string; label: string };

export function BarsChart({
  bars,
  empty,
  refLine,
  refLabel,
  yMaxHint,
  clampAt,
  percent,
}: {
  bars: Bar[];
  empty: string;
  refLine?: number; // a threshold drawn across the plot (ceiling / 100% line)
  refLabel?: string;
  percent?: boolean; // y is a ratio, not a token count
  yMaxHint?: number; // keep the axis at least this tall (so a lone tiny bar isn't full-height)
  /**
   * Hard cap on the axis, for charts where one fabricated value would otherwise flatten
   * every honest one — a cheat at 90,000% of the ceiling makes a 20% axis-mate invisible.
   * Bars past the cap are drawn to the cap and marked; their true value stays in the
   * tooltip and in the table below, so nothing is hidden, only bounded.
   */
  clampAt?: number;
}) {
  if (bars.length === 0) return <Empty label={empty} />;

  let dataMax = Math.max(...bars.map((b) => b.v), refLine ?? 0, yMaxHint ?? 0);
  if (clampAt !== undefined) dataMax = Math.min(dataMax, clampAt);
  const yTicks = niceTicks(dataMax);
  const yMax = yTicks[yTicks.length - 1];
  const y = (v: number) => PAD.top + PH - (Math.min(v, yMax) / yMax) * PH;

  const xMin = bars[0].t;
  const xMax = bars[bars.length - 1].t;
  const span = xMax - xMin;
  // Time-positioned bars: bar i sits at its own timestamp, so a burst of syncs clusters
  // and a quiet week leaves a gap — the spacing is data, not a cosmetic rhythm.
  const slot = PW / Math.max(bars.length, 1);
  const bw = Math.max(2, Math.min(24, slot - 2)); // ≤24px, 2px surface gap between neighbours
  const x = (t: number) =>
    PAD.left + (xMax > xMin ? ((t - xMin) / (xMax - xMin)) * (PW - bw) : (PW - bw) / 2);

  return (
    <Frame
      yTicks={yTicks}
      yMax={yMax}
      xTicks={timeTicks(xMin, xMax)}
      xMin={xMin}
      xMax={xMax}
      xFmt={(t) => fmtTimeTick(t, span)}
      percent={percent}
    >
      {bars.map((b, i) => {
        const c = SEV_COLOR[b.severity ?? "normal"] ?? SERIES;
        const top = y(b.v);
        const h = Math.max(1, PAD.top + PH - top);
        const r = Math.min(4, bw / 2, h); // 4px rounded data-end, square at the baseline
        const bx = x(b.t);
        const clipped = b.v > yMax;
        return (
          <g key={i}>
            <path
              d={`M${bx},${top + r} a${r},${r} 0 0 1 ${r},${-r} h${bw - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} h${-bw} Z`}
              fill={c}
            >
              <title>{b.label}</title>
            </path>
            {clipped && (
              // Say so when a bar runs off the top. Silently cropping it would make a
              // 90,000% fabrication look the same as a 210% one.
              <text x={bx + bw / 2} y={top - 4} textAnchor="middle" fontSize={9} fill={c}>
                ▲
              </text>
            )}
          </g>
        );
      })}
      {refLine !== undefined && refLine <= yMax && (
        <>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(refLine)}
            y2={y(refLine)}
            stroke="#b91c1c"
            strokeWidth={2}
            strokeOpacity={0.5}
          />
          {refLabel && (
            <text x={W - PAD.right + 6} y={y(refLine) + 3.5} fontSize={10} fill="#b91c1c">
              {refLabel}
            </text>
          )}
        </>
      )}
    </Frame>
  );
}

// ── 3. Multi-user comparison ──────────────────────────────────────────────────

export type Series = { key: string; name: string; points: { t: number; v: number }[]; banned?: boolean };

export function MultiLineChart({ series, empty }: { series: Series[]; empty: string }) {
  const live = series.filter((s) => s.points.length > 0);
  if (live.length === 0) return <Empty label={empty} />;

  const all = live.flatMap((s) => s.points);
  const xMin = Math.min(...all.map((p) => p.t));
  const xMax = Math.max(...all.map((p) => p.t));
  const yTicks = niceTicks(Math.max(...all.map((p) => p.v)));
  const yMax = yTicks[yTicks.length - 1];
  const y = (v: number) => PAD.top + PH - (v / yMax) * PH;
  const x = (t: number) => PAD.left + (xMax > xMin ? ((t - xMin) / (xMax - xMin)) * PW : PW / 2);
  const span = xMax - xMin;

  // Colour follows the ENTITY (its index in the list handed to us), never its current
  // rank — so filtering or a lead change never repaints the survivors.
  //
  // End-labels: walk the finishers from highest to lowest and push each one down until it
  // clears the previous. Two players who finish neck-and-neck would otherwise print their
  // names on top of each other — and this chart's whole accessibility story rests on those
  // labels being readable (four of the eight hues are under 3:1 here).
  const placed: { i: number; s: Series; ly: number }[] = [];
  const byEnd = live
    .map((s, i) => ({ i, s, endV: s.points[s.points.length - 1].v }))
    .sort((a, b) => b.endV - a.endV);
  for (const e of byEnd) {
    const want = y(e.endV) + 3.5;
    const prev = placed.length ? placed[placed.length - 1].ly : -Infinity;
    placed.push({ i: e.i, s: e.s, ly: Math.max(want, prev + 11) });
  }

  return (
    <Frame
      yTicks={yTicks}
      yMax={yMax}
      xTicks={timeTicks(xMin, xMax)}
      xMin={xMin}
      xMax={xMax}
      xFmt={(t) => fmtTimeTick(t, span)}
    >
      {live.map((s, i) => {
        const c = CATEGORICAL[i % MAX_SERIES];
        const d = s.points
          .map((p, j) => (j === 0 ? `M${x(p.t)},${y(p.v)}` : `H${x(p.t)}V${y(p.v)}`))
          .join(" ");
        return (
          <g key={s.key}>
            <path
              d={d}
              fill="none"
              stroke={c}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeDasharray={s.banned ? "5 3" : undefined}
            >
              {/* One string, not `{a} — {b}`: React only accepts a single text child in
                  <title>, and an interpolated pair silently becomes an array. */}
              <title>{`${s.name} — ${fmtFull(s.points[s.points.length - 1].v)} tokens`}</title>
            </path>
            <circle
              cx={x(s.points[s.points.length - 1].t)}
              cy={y(s.points[s.points.length - 1].v)}
              r={4}
              fill={c}
              stroke={SURFACE}
              strokeWidth={2}
            />
          </g>
        );
      })}
      {/* Direct end-labels. Not decoration: four of the eight hues fall under 3:1 on this
          surface, so the palette's relief rule REQUIRES visible labels (or a table). */}
      {placed.map((e) => (
        <text
          key={e.s.key}
          x={W - PAD.right + 6}
          y={e.ly}
          fontSize={10}
          fill={CATEGORICAL[e.i % MAX_SERIES]}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {e.s.name.length > 9 ? e.s.name.slice(0, 8) + "…" : e.s.name}
        </text>
      ))}
    </Frame>
  );
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5 text-[10px]" style={{ color: INK }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              background: CATEGORICAL[i % MAX_SERIES],
              display: "inline-block",
              borderRadius: 2,
            }}
          />
          <span className="opacity-80">{s.name}</span>
          {s.banned && <span className="opacity-50">(hidden)</span>}
        </li>
      ))}
    </ul>
  );
}
