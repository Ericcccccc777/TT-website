import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLeaderboard, getGlobalStats } from "@/lib/leaderboard";

export const revalidate = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

type TFunc = Awaited<ReturnType<typeof getTranslations<"LeaderboardPage">>>;

function formatTokens(n: number, locale: string): string {
  return n.toLocaleString(locale);
}

function relativeTime(iso: string, t: TFunc): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t("relativeJustNow");
  if (minutes < 60) return t("relativeMinutes", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("relativeHours", { n: hours });
  const days = Math.floor(hours / 24);
  return t("relativeDays", { n: days });
}

function spriteStage(stageIndex: number): number {
  return Math.min(8, Math.max(1, stageIndex + 1));
}

const MEDAL: Record<number, string> = {
  1: "#c8943c",
  2: "#9ba8af",
  3: "#a07850",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, [{ entries, error }, stats]] = await Promise.all([
    getTranslations("LeaderboardPage"),
    Promise.all([getLeaderboard(), getGlobalStats()]),
  ]);

  return (
    <div className="min-h-screen bg-surface-parchment text-text-forest">
      {/* ── Global stats banner ── */}
      <div className="border-b-2 border-leaf-deep bg-surface-card">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-6 py-6 sm:flex-row sm:justify-around">
          <StatChip
            label={t("globalTrees")}
            value={formatTokens(stats.totalTrees, locale)}
            unit={t("treeUnit")}
          />
          <div className="hidden h-8 w-px bg-leaf-deep/40 sm:block" aria-hidden />
          <StatChip
            label={t("totalTokens")}
            value={formatTokens(stats.totalTokens, locale)}
            unit={t("tokenUnit")}
          />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1
            className="font-pixel text-display text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-display)" }}
          >
            {t("title")}
          </h1>
          <p
            className="mt-3 text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
          >
            {t("subtitle")}
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div
            className="mb-6 rounded-[2px] border-2 border-bubble-claude bg-surface-card px-4 py-3"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            <span className="text-bubble-claude">{t("errorPrefix")}</span>
            <span className="ml-1 text-text-muted-light">{error}</span>
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && !error && (
          <div className="py-20 text-center">
            <Image
              src="/sprites/AppleTree_1.png"
              alt="seedling"
              width={64}
              height={64}
              className="pixelated mx-auto mb-4 opacity-60"
            />
            <p
              className="text-text-muted-light"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              {t("emptyHeading")}
            </p>
            <p
              className="mt-2 text-text-muted-light"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
            >
              {t("emptyBody")}
            </p>
          </div>
        )}

        {/* Leaderboard table */}
        {entries.length > 0 && (
          <div className="overflow-hidden rounded-[2px]" style={{ border: "var(--border-pixel)" }}>
            <table className="w-full border-collapse">
              <colgroup>
                <col style={{ width: "3rem" }} />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr
                  className="bg-leaf-deep"
                  style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                >
                  <th scope="col" className="px-4 py-2 text-left text-text-cream">
                    {t("rankHeader")}
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-text-cream">
                    {t("usernameHeader")}
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-2 text-right text-text-cream sm:table-cell"
                  >
                    {t("tokensHeader")}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right text-text-cream">
                    {t("updatedHeader")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => {
                  const rank = i + 1;
                  const medalColor = MEDAL[rank];
                  const stage = spriteStage(entry.stage_index);
                  const animDelay = `${i * 60}ms`;
                  return (
                    <tr
                      key={entry.id}
                      className="border-t border-leaf-deep/20 bg-surface-card/60 backdrop-blur-sm"
                      style={{
                        animation: `row-slide-in 320ms ease both`,
                        animationDelay: animDelay,
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-body)",
                      }}
                    >
                      <td
                        className="px-4 py-3 font-bold leading-none"
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "var(--text-caption)",
                          color: medalColor ?? "var(--color-text-muted-light)",
                        }}
                      >
                        {rank <= 3 ? `0${rank}` : rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Image
                            src={`/sprites/AppleTree_${stage}.png`}
                            alt={`stage ${stage}`}
                            width={24}
                            height={24}
                            className="pixelated shrink-0"
                          />
                          <span className="truncate text-text-forest">{entry.username}</span>
                        </div>
                      </td>
                      <td
                        className="hidden px-4 py-3 text-right text-accent-gold sm:table-cell"
                        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                      >
                        {formatTokens(entry.score, locale)}
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-3 text-right text-text-muted-light"
                        style={{ fontSize: "var(--text-small)" }}
                      >
                        {relativeTime(entry.updated_at, t)}
                      </td>
                    </tr>
                  );
                })}

                {/* Blurred YOUR TREE placeholder row */}
                <tr className="border-t border-leaf-deep/20 bg-surface-card/60">
                  <td colSpan={4} className="relative overflow-hidden p-0">
                    <div
                      className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-x-4 px-4 py-3"
                      style={{
                        filter: "blur(4px)",
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-body)",
                      }}
                    >
                      <span
                        className="text-text-muted-light"
                        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                      >
                        {entries.length + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-[2px] bg-leaf-deep/15" />
                        <span className="text-text-forest">YOUR TREE</span>
                      </div>
                      <span
                        className="hidden text-right text-accent-gold sm:block"
                        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                      >
                        0
                      </span>
                      <span
                        className="text-right text-text-muted-light"
                        style={{ fontSize: "var(--text-small)" }}
                      >
                        —
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="rounded-[2px] bg-surface-forest px-3 py-1 text-accent-gold"
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "var(--text-caption)",
                          border: "2px solid var(--color-accent-gold)",
                        }}
                      >
                        {t("comingSoon")}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── How to join ── */}
        <div
          className="mt-10 rounded-[2px] bg-surface-card p-6"
          style={{ border: "var(--border-pixel)" }}
        >
          <h2
            className="mb-5 text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)" }}
          >
            {t("howToHeading")}
          </h2>
          <ol className="space-y-4">
            {(
              [
                { num: "01", title: t("howTo01Title"), body: t("howTo01Body") },
                { num: "02", title: t("howTo02Title"), body: t("howTo02Body") },
                { num: "03", title: t("howTo03Title"), body: t("howTo03Body") },
              ] as const
            ).map((step) => (
              <li key={step.num} className="flex gap-4">
                <span
                  className="shrink-0 text-accent-gold"
                  style={{ fontFamily: "var(--font-brand)", fontSize: "var(--text-counter)" }}
                >
                  {step.num}
                </span>
                <div>
                  <div
                    className="text-text-forest"
                    style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                  >
                    {step.title}
                  </div>
                  <div
                    className="mt-1 text-text-muted-light"
                    style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
                  >
                    {step.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatChip({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-text-muted-light"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
      >
        {label}
      </span>
      <span
        className="text-leaf-deep"
        style={{ fontFamily: "var(--font-brand)", fontSize: "var(--text-counter)" }}
      >
        {value}
      </span>
      <span
        className="text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
      >
        {unit}
      </span>
    </div>
  );
}
