import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/ranger/auth";
import { getRangerUserDetail } from "@/lib/ranger/data";
import {
  analyzeHistory,
  fmtGap,
  fmtRate,
  THRESHOLDS,
  type AnalyzedRow,
  type Severity,
} from "@/lib/ranger/analysis";
import { getRangerLang, t, type Key, type Lang } from "@/lib/ranger/i18n";
import { RangerLangSwitcher } from "@/components/ranger/lang-switcher";
import { BarsChart, ChartCard, CumulativeChart } from "@/components/ranger/charts";
import { acknowledgeAction, banAction, unacknowledgeAction, unbanAction } from "../actions";

// Admin detail view — never indexed, never cached, always request-time (cookies).
export const metadata: Metadata = {
  title: "Ranger — User history",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function fmtTokens(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en");
}
function fmtSigned(n: number): string {
  return (n > 0 ? "+" : "") + Math.round(n).toLocaleString("en");
}
function fmtWhen(iso: string | null): string {
  return iso ? iso.replace("T", " ").slice(0, 16) + " UTC" : "—";
}
function fmtPct(p: number | null): string {
  if (p === null) return "—";
  return `${p > 0 ? "+" : ""}${p < 10 && p > -10 ? p.toFixed(1) : Math.round(p)}%`;
}

const SEV_TINT: Record<Severity, string | undefined> = {
  suspicious: "rgba(185,28,28,0.08)",
  watch: "rgba(217,119,6,0.09)",
  baseline: "rgba(0,0,0,0.03)",
  normal: undefined,
};

function SevBadge({
  severity,
  acknowledged,
  lang,
}: {
  severity: Severity;
  acknowledged: boolean;
  lang: Lang;
}) {
  if (acknowledged) {
    return (
      <span
        className="rounded-[2px] px-1.5 py-0.5 text-[10px]"
        style={{ background: "#15803d", color: "#fff" }}
      >
        {t(lang, "reviewedBadge")}
      </span>
    );
  }
  const map: Record<Severity, { key: Key; bg: string; fg: string } | null> = {
    suspicious: { key: "sevSuspicious", bg: "#b91c1c", fg: "#fff" },
    watch: { key: "sevWatch", bg: "#b45309", fg: "#fff" },
    baseline: { key: "sevBaseline", bg: "var(--color-soil)", fg: "var(--color-text-cream)" },
    normal: null,
  };
  const m = map[severity];
  if (!m) return <span className="text-[10px] opacity-45">{t(lang, "sevOk")}</span>;
  return (
    <span className="rounded-[2px] px-1.5 py-0.5 text-[10px]" style={{ background: m.bg, color: m.fg }}>
      {t(lang, m.key)}
    </span>
  );
}

/**
 * The breakdown behind one score increase.
 *
 * The desktop client buckets its tokens by the Claude Code log's OWN timestamps into
 * 5-minute windows and uploads four aggregates — never the per-window timeline, which
 * would be a minute-by-minute record of when this person works and sleeps. So this
 * panel can tell you "the busiest 5 minutes held 20M tokens", but not which 5 minutes.
 * That is the whole point, and it is enough: 480M banked across 96 unremarkable windows
 * is a hoarded workday; 480M inside one window is not a machine.
 *
 * The load-bearing line is the reconciliation. `sum` is the client's claim; `delta` is
 * what the SERVER computed from two rows it wrote itself. Editing garden.json moves the
 * score but not the token log, so the two stop agreeing — the cheater's own submission
 * contradicts itself.
 */
function BucketPanel({ row, lang }: { row: AnalyzedRow; lang: Lang }) {
  const b = row.bucket;
  const cell = "rounded-[2px] px-3 py-2";
  const cellStyle = { border: "1px solid var(--color-soil)", background: "var(--color-surface-parchment)" };

  if (!b) {
    // No evidence — NOT a red flag. Old clients cannot produce a summary, and a current
    // client that can't prove its ledger covers the whole delta declines to send one
    // rather than send a wrong one. Say which, so the admin doesn't over-read it.
    return (
      <div className={cell} style={cellStyle}>
        <p className="text-[11px] opacity-70">
          {t(lang, row.appVersion ? "bktNoneModern" : "bktNoneLegacy", {
            v: row.appVersion ?? "—",
          })}
        </p>
      </div>
    );
  }

  const stats: { label: string; value: string; hint?: string; bad?: boolean }[] = [
    {
      label: t(lang, "bktWindows"),
      value: String(b.n),
      hint: t(lang, "bktWindowsHint", { span: fmtGap(b.span) }),
    },
    {
      label: t(lang, "bktBusiest"),
      value: b.max.toLocaleString("en"),
      hint: fmtRate(b.impliedRate),
      bad: b.max > THRESHOLDS.BUCKET_WATCH,
    },
    {
      label: t(lang, "bktAvg"),
      value: Math.round(b.avgPerBucket).toLocaleString("en"),
      hint: t(lang, "bktAvgHint"),
    },
    {
      label: t(lang, "bktReconcile"),
      value: b.sumMatches ? t(lang, "bktMatch") : t(lang, "bktMismatch"),
      hint: `${b.sum.toLocaleString("en")} ${b.sumMatches ? "=" : "≠"} ${row.delta.toLocaleString("en")}`,
      bad: !b.sumMatches,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cell}
            style={{
              ...cellStyle,
              ...(s.bad ? { borderColor: "#b91c1c", background: "rgba(185,28,28,0.06)" } : {}),
            }}
          >
            <div className="text-[10px] tracking-wide uppercase opacity-55">{s.label}</div>
            <div
              className="font-mono text-[13px]"
              style={{ color: s.bad ? "#b91c1c" : "var(--color-text-forest)" }}
            >
              {s.value}
            </div>
            {s.hint && <div className="font-mono text-[10px] opacity-55">{s.hint}</div>}
          </div>
        ))}
      </div>

      {b.problems.length > 0 && (
        <ul
          className="rounded-[2px] px-3 py-2 text-[11px]"
          style={{ border: "1px solid #b91c1c", background: "rgba(185,28,28,0.06)", color: "#b91c1c" }}
        >
          {b.problems.map((p, i) => (
            <li key={i}>• {p}</li>
          ))}
        </ul>
      )}

      <p className="text-[10px] opacity-50">
        {t(lang, "bktFooter", {
          cap: THRESHOLDS.BUCKET_SUS.toLocaleString("en"),
          v: row.appVersion ?? "—",
        })}
      </p>
    </div>
  );
}

export default async function RangerUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect("/ranger");

  const lang = await getRangerLang();
  const { userId } = await params;
  const sp = await searchParams;
  const view = sp.view === "flagged" ? "flagged" : "all";
  const sort = sp.sort === "jump" || sp.sort === "rate" ? sp.sort : "time";
  const expand = typeof sp.expand === "string" ? Number(sp.expand) : null;

  const { row, history, acknowledgedIds, error } = await getRangerUserDetail(userId);
  const { rows, summary } = analyzeHistory(history, new Set(acknowledgedIds));

  // Filter + sort. Baseline rows are excluded from the jump/rate sorts because their
  // "delta" is the whole accumulated pre-history total, not a single step — it would
  // always win. Test on oldScore, NOT severity: a baseline row can now come back
  // watch/suspicious (an implausible first-ever total is the off→on re-register hole),
  // so severity no longer identifies it.
  const isBaseline = (r: (typeof rows)[number]) => r.oldScore === null;
  let display = rows;
  if (view === "flagged") {
    display = display.filter((r) => r.severity === "watch" || r.severity === "suspicious");
  }
  if (sort === "jump") {
    display = [...display].filter((r) => !isBaseline(r)).sort((a, b) => b.delta - a.delta);
  } else if (sort === "rate") {
    display = [...display]
      .filter((r) => !isBaseline(r))
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }

  const base = `/ranger/${userId}`;
  const href = (nextView: string, nextSort: string, nextExpand: number | null = null) => {
    const p = new URLSearchParams();
    if (nextView !== "all") p.set("view", nextView);
    if (nextSort !== "time") p.set("sort", nextSort);
    if (nextExpand !== null) p.set("expand", String(nextExpand));
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };

  const verdict = summary.verdict;
  const vs =
    verdict === "suspicious"
      ? { bg: "rgba(185,28,28,0.10)", fg: "#b91c1c", border: "#b91c1c" }
      : verdict === "watch"
        ? { bg: "rgba(217,119,6,0.12)", fg: "#b45309", border: "#b45309" }
        : { bg: "rgba(21,128,61,0.10)", fg: "#15803d", border: "#15803d" };
  const verdictText =
    verdict === "suspicious"
      ? t(lang, "verdictSuspicious", { n: summary.suspiciousCount })
      : verdict === "watch"
        ? t(lang, "verdictWatch", { n: summary.watchCount })
        : t(lang, "verdictClean", { n: summary.changeCount });

  const allCount = rows.filter((r) => !isBaseline(r)).length;
  const flaggedCount = summary.watchCount + summary.suspiciousCount;

  // ── Chart data. `rows` is newest-first; charts read left-to-right, so reverse. ──
  const asc = [...rows].reverse();
  const ms = (iso: string) => new Date(iso).getTime();

  // 1. The score as it actually stood over time (baseline included — it is where the
  //    curve starts).
  const cumulative = asc.map((r) => ({
    t: ms(r.at),
    v: r.newScore,
    severity: r.severity,
    label: `${fmtWhen(r.at)} · ${fmtTokens(r.newScore)}${isBaseline(r) ? "" : ` (${fmtSigned(r.delta)})`}`,
  }));

  // 2. What each sync added. Baseline excluded: its "delta" is the whole pre-history
  //    total, so including it would dwarf every real step and flatten the chart.
  const changes = asc.filter((r) => !isBaseline(r));
  const deltaBars = changes.map((r) => ({
    t: ms(r.at),
    v: Math.max(0, r.delta),
    severity: r.severity,
    label: `${fmtWhen(r.at)} · ${fmtSigned(r.delta)} over ${r.gapLabel}`,
  }));

  // 3. THE judgement chart: each gain as a % of what was physically possible in the time
  //    that had passed. This is the whole fix in one picture — a hoarded workday and a
  //    quick sync both land low, because the ceiling grew with the wait. Only fabrication
  //    crosses 100%. (A raw ceiling overlay would not work: at an 8-hour gap the ceiling is
  //    billions, which would squash every honest bar to nothing.)
  const headroomBars = changes
    .filter((r) => r.ceiling !== null && r.ceiling > 0)
    .map((r) => ({
      t: ms(r.at),
      v: (Math.max(0, r.delta) / (r.ceiling as number)) * 100,
      severity: r.severity,
      label: `${fmtWhen(r.at)} · ${Math.round((Math.max(0, r.delta) / (r.ceiling as number)) * 100)}% of the ${fmtSigned(r.ceiling as number)} ceiling for ${r.gapLabel}`,
    }));

  // 4. The evidence: the busiest 5-minute window inside each gain. Only rows whose client
  //    sent a summary appear — an empty chart here means "old clients", not "nothing wrong".
  const bucketBars = changes
    .filter((r) => r.bucket !== null)
    .map((r) => ({
      t: ms(r.at),
      v: r.bucket!.max,
      severity: r.severity,
      label: `${fmtWhen(r.at)} · busiest window ${fmtTokens(r.bucket!.max)} (${r.bucket!.n} windows over ${fmtGap(r.bucket!.span)})`,
    }));

  // Table columns — right-align the numeric metrics for a clean, scannable grid.
  const cols: { label: string; align: "left" | "right" }[] = [
    { label: t(lang, "thWhen"), align: "left" },
    { label: t(lang, "thInterval"), align: "left" },
    { label: t(lang, "thChange"), align: "left" },
    { label: t(lang, "thDelta"), align: "right" },
    { label: t(lang, "thRate"), align: "right" },
    { label: t(lang, "thJump"), align: "right" },
    { label: t(lang, "thSignal"), align: "left" },
  ];

  return (
    <main className="min-h-screen bg-surface-parchment">
      <div className="mx-auto w-[90%] max-w-[1600px] px-6 py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/ranger"
            className="font-body text-small text-leaf-deep underline underline-offset-2"
          >
            {t(lang, "backToRanger")}
          </Link>
          <RangerLangSwitcher current={lang} />
        </div>

        {/* Header: name + id + verdict */}
        <header className="mt-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1
              className="text-leaf-deep"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)", lineHeight: 1.3 }}
            >
              {row?.username || t(lang, "unknownUser")}
            </h1>
            {row?.banned && (
              <span className="rounded-[2px] bg-red-700 px-1.5 py-0.5 text-[10px] text-white">
                {t(lang, "hiddenBadge")}
              </span>
            )}
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-[var(--color-text-muted-light)]">{userId}</p>

          {/* Verdict banner — the page's headline judgement */}
          <div
            className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-[2px] px-4 py-3 font-body text-small"
            style={{
              background: vs.bg,
              border: `1px solid ${vs.border}`,
              borderLeft: `4px solid ${vs.border}`,
              color: vs.fg,
            }}
          >
            <strong style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-small)" }}>
              {verdict === "clean" ? t(lang, "cleanTag") : t(lang, "reviewTag")}
            </strong>
            <span>{verdictText}</span>
            <span className="opacity-70">{t(lang, "advisory")}</span>
          </div>
        </header>

        {error && (
          <p
            className="mt-4 rounded-[2px] bg-surface-card px-4 py-3 font-body text-small text-red-700"
            style={{ border: "var(--border-pixel)" }}
          >
            {t(lang, "detailLoadError", { e: error })}
          </p>
        )}

        {!error && !row && (
          <p
            className="mt-4 rounded-[2px] bg-surface-card px-4 py-3 font-body text-small text-text-muted-light"
            style={{ border: "var(--border-pixel)" }}
          >
            {t(lang, "noRow")}
          </p>
        )}

        {/* Summary: account facts + computed analysis */}
        {row && (
          <Panel title={t(lang, "sectAccount")} className="mt-6">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 px-5 py-4 font-body text-small text-text-muted-light sm:grid-cols-3">
              <Field label={t(lang, "fTokens")} value={fmtTokens(row.score)} />
              <Field label={t(lang, "fRegion")} value={row.region || "—"} />
              <Field label={t(lang, "fMainTree")} value={row.tree || "—"} />
              <Field label={t(lang, "fFirstSeen")} value={fmtWhen(row.createdAt)} />
              <Field label={t(lang, "fLastActive")} value={fmtWhen(row.updatedAt)} />
              <Field
                label={t(lang, "fStatus")}
                value={
                  row.banned
                    ? `${t(lang, "statusHidden")}${row.banReason ? ` — ${row.banReason}` : ""}`
                    : t(lang, "statusVisible")
                }
              />
            </dl>
          </Panel>
        )}

        <Panel title={t(lang, "sectAnalysis")} className="mt-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 px-5 py-4 font-body text-small text-text-muted-light sm:grid-cols-4">
            <Field label={t(lang, "aTracked")} value={String(summary.changeCount)} />
            <Field label={t(lang, "aGained")} value={fmtTokens(summary.totalGained)} />
            <Field label={t(lang, "aActiveSpan")} value={summary.activeSpanLabel} />
            <Field label={t(lang, "aAvgInterval")} value={summary.avgGapLabel} />
            <Field label={t(lang, "aOverallPace")} value={summary.avgRateLabel} />
            <Field label={t(lang, "aPeakRate")} value={summary.peakRateLabel} hint={fmtWhen(summary.peakRateAt)} />
            <Field
              label={t(lang, "aLargestJump")}
              value={summary.largestJump === null ? "—" : fmtSigned(summary.largestJump)}
              hint={fmtWhen(summary.largestJumpAt)}
            />
            <Field label={t(lang, "aWatchSusp")} value={`${summary.watchCount} / ${summary.suspiciousCount}`} />
          </dl>
        </Panel>

        {/* Charts. Built from the same rows the table below shows — the table IS the
            table view the palette's relief rule asks for, so nothing here is gated
            behind colour. Every scale is derived from the data at render time. */}
        <section className="mt-8">
          <h2
            className="text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h2)", lineHeight: 1.3 }}
          >
            {t(lang, "sectCharts")}
          </h2>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartCard title={t(lang, "chCumulative")} note={t(lang, "chCumulativeNote")}>
              <CumulativeChart points={cumulative} empty={t(lang, "chEmpty")} />
            </ChartCard>

            <ChartCard title={t(lang, "chDeltas")} note={t(lang, "chDeltasNote")}>
              <BarsChart bars={deltaBars} empty={t(lang, "chEmpty")} />
            </ChartCard>

            <ChartCard title={t(lang, "chHeadroom")} note={t(lang, "chHeadroomNote")}>
              <BarsChart
                bars={headroomBars}
                empty={t(lang, "chEmpty")}
                refLine={100}
                refLabel={t(lang, "chCeiling")}
                yMaxHint={120}
                clampAt={200}
                percent
              />
            </ChartCard>

            <ChartCard title={t(lang, "chBusiest")} note={t(lang, "chBusiestNote")}>
              <BarsChart
                bars={bucketBars}
                empty={t(lang, "chNoEvidence")}
                refLine={THRESHOLDS.BUCKET_SUS}
                refLabel={t(lang, "chWindowCap")}
              />
            </ChartCard>
          </div>
        </section>

        {/* History: title + toolbar + table */}
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <h2
              className="text-leaf-deep"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h2)", lineHeight: 1.3 }}
            >
              {t(lang, "sectHistory")}
            </h2>

            {/* Filter + sort controls — two segmented groups */}
            <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
              <SegGroup
                label={t(lang, "cView")}
                items={[
                  { key: "all", label: `${t(lang, "cAll")} (${allCount})`, href: href("all", sort), active: view === "all" },
                  { key: "flagged", label: `${t(lang, "cFlagged")} (${flaggedCount})`, href: href("flagged", sort), active: view === "flagged" },
                ]}
              />
              <SegGroup
                label={t(lang, "cSort")}
                items={[
                  { key: "time", label: t(lang, "cNewest"), href: href(view, "time"), active: sort === "time" },
                  { key: "jump", label: t(lang, "cBiggestJump"), href: href(view, "jump"), active: sort === "jump" },
                  { key: "rate", label: t(lang, "cFastestRate"), href: href(view, "rate"), active: sort === "rate" },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="overflow-hidden rounded-[2px]" style={{ border: "var(--border-pixel)" }}>
              <table
                className="w-full border-collapse text-left"
                style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
              >
                <thead>
                  <tr
                    className="bg-leaf-deep"
                    style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                  >
                    {cols.map((c, i) => (
                      <th
                        key={i}
                        scope="col"
                        className={`px-3 py-2.5 text-text-cream ${c.align === "right" ? "text-right" : "text-left"}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-text-muted-light">
                  {display.map((h) => {
                    const showMarkOk =
                      !h.acknowledged && (h.severity === "watch" || h.severity === "suspicious");
                    const open = expand === h.id;
                    const tint = h.acknowledged ? "rgba(21,128,61,0.06)" : SEV_TINT[h.severity];
                    return (
                      <Fragment key={h.id}>
                      <tr
                        className="border-t border-leaf-deep/20"
                        style={{ background: tint }}
                      >
                        <td className="px-3 py-2.5 align-top font-mono text-[11px] whitespace-nowrap">
                          {/* Clicking the timestamp opens the breakdown below it. URL state,
                              server-rendered — same idiom as the segmented controls, no client JS. */}
                          <Link
                            href={href(view, sort, open ? null : h.id)}
                            scroll={false}
                            className="ranger-btn inline-flex items-center gap-1 underline-offset-2 hover:underline"
                          >
                            <span aria-hidden className="opacity-50">{open ? "▾" : "▸"}</span>
                            {fmtWhen(h.at)}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 align-top whitespace-nowrap">{h.gapLabel}</td>
                        <td className="px-3 py-2.5 align-top font-mono text-[11px] whitespace-nowrap">
                          {fmtTokens(h.oldScore)} → {fmtTokens(h.newScore)}
                        </td>
                        <td
                          className="px-3 py-2.5 align-top text-right font-mono whitespace-nowrap"
                          style={{ color: h.delta < 0 ? "#b91c1c" : "var(--color-text-forest)" }}
                        >
                          {fmtSigned(h.delta)}
                        </td>
                        <td className="px-3 py-2.5 align-top text-right font-mono whitespace-nowrap">
                          {h.rateLabel}
                        </td>
                        <td className="px-3 py-2.5 align-top text-right font-mono whitespace-nowrap">
                          {fmtPct(h.jumpPct)}
                        </td>
                        <td className="px-3 py-2.5 align-top text-[11px]">
                          <div className="flex items-start gap-2">
                            <SevBadge severity={h.severity} acknowledged={h.acknowledged} lang={lang} />
                            <span className="opacity-80">{h.signals.join(" ")}</span>
                          </div>
                          {showMarkOk && (
                            <form action={acknowledgeAction} className="mt-1.5">
                              <input type="hidden" name="historyId" value={h.id} />
                              <input type="hidden" name="userId" value={userId} />
                              <button
                                type="submit"
                                className="ranger-btn rounded-[2px] px-2 py-0.5 text-[10px] text-text-forest"
                                style={{ border: "1px solid var(--color-soil)", background: "var(--color-surface-parchment)" }}
                              >
                                {t(lang, "markOk")}
                              </button>
                            </form>
                          )}
                          {h.acknowledged && (
                            <form action={unacknowledgeAction} className="mt-1.5">
                              <input type="hidden" name="historyId" value={h.id} />
                              <input type="hidden" name="userId" value={userId} />
                              <button type="submit" className="ranger-btn text-[10px] underline underline-offset-2 opacity-70">
                                {t(lang, "undo")}
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr style={{ background: tint }}>
                          <td colSpan={7} className="px-3 pb-4">
                            <BucketPanel row={h} lang={lang} />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                  {display.length === 0 && (
                    <tr className="border-t border-leaf-deep/20">
                      <td colSpan={7} className="px-3 py-8 text-center text-text-muted-light">
                        {history.length === 0 ? t(lang, "noHistory") : t(lang, "noMatch")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Decision */}
        {row && (
          <section
            className="mt-8 rounded-[2px] bg-surface-card px-5 py-4"
            style={{ border: "var(--border-pixel)" }}
          >
            <h2
              className="text-leaf-deep"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h2)", lineHeight: 1.3 }}
            >
              {t(lang, "decision")}
            </h2>
            <div className="mt-3">
              {row.banned ? (
                <form action={unbanAction}>
                  <input type="hidden" name="userId" value={row.userId} />
                  <button
                    type="submit"
                    className="ranger-btn rounded-[2px] bg-leaf-deep px-4 py-2 text-text-cream shadow-pixel-sm"
                    style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-small)" }}
                  >
                    {t(lang, "unhideBtn")}
                  </button>
                </form>
              ) : (
                <form action={banAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="userId" value={row.userId} />
                  <input
                    type="text"
                    name="reason"
                    placeholder={t(lang, "reasonPh")}
                    className="w-56 rounded-[2px] bg-surface-parchment px-3 py-2 text-small text-text-forest"
                    style={{ border: "var(--border-pixel)" }}
                  />
                  <button
                    type="submit"
                    className="ranger-btn rounded-[2px] bg-red-700 px-4 py-2 text-white shadow-pixel-sm"
                    style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-small)" }}
                  >
                    {t(lang, "hideBtn")}
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        <p className="mt-8 font-body text-[11px] text-[var(--color-text-muted-light)]">
          {t(lang, "detailFooter")}
        </p>
      </div>
    </main>
  );
}

/** Titled card wrapper — matches the leaderboard's parchment-card treatment. */
function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[2px] bg-surface-card ${className ?? ""}`}
      style={{ border: "var(--border-pixel)" }}
    >
      <h2
        className="border-b border-leaf-deep/25 px-5 py-2.5 text-leaf-deep"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide opacity-60">{label}</dt>
      <dd className="mt-0.5 font-medium text-text-forest">{value}</dd>
      {hint && hint !== "—" && <dd className="text-[10px] opacity-50">{hint}</dd>}
    </div>
  );
}

/** Segmented control: a labeled group of joined nav links with one active. */
function SegGroup({
  label,
  items,
}: {
  label: string;
  items: { key: string; label: React.ReactNode; href: string; active: boolean }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-text-muted-light"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
      >
        {label}
      </span>
      <div
        role="group"
        className="inline-flex overflow-hidden rounded-[2px]"
        style={{ border: "var(--border-pixel)" }}
      >
        {items.map((it, i) => (
          <Link
            key={it.key}
            href={it.href}
            aria-current={it.active ? "true" : undefined}
            className="ranger-btn flex items-center px-3 py-1.5 font-body text-[11px] whitespace-nowrap transition-colors"
            style={{
              borderLeft: i === 0 ? undefined : "var(--border-pixel)",
              background: it.active ? "var(--color-leaf-deep)" : "var(--color-surface-card)",
              color: it.active ? "var(--color-text-cream)" : "var(--color-text-forest)",
            }}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
