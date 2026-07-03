import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLeaderboard, getGlobalStats } from "@/lib/leaderboard";
import { TreeModalButton } from "@/components/tree-modal";
import { PixelCrown } from "@/components/pixel-crown";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("leaderboardTitle");
  return { title, openGraph: { title }, twitter: { title } };
}

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

/** Sprite filename prefix for a tree species; unknown species fall back to apple. */
const TREE_PREFIX: Record<string, string> = {
  apple: "AppleTree",
  cherry: "CherryTree",
  cactus: "Cactus",
};

function treeSpritePrefix(tree: string): string {
  return TREE_PREFIX[tree] ?? "AppleTree";
}

/**
 * Turns an ISO 3166-1 alpha-2 code (what the desktop app stores in `region`)
 * into a flag emoji + a locale-aware country name. Returns null for empty or
 * malformed codes so the row simply renders without a flag.
 */
function regionInfo(code: string, locale: string): { flag: string; name: string } | null {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  const flag = String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  let name = cc;
  try {
    name = new Intl.DisplayNames([locale], { type: "region" }).of(cc) ?? cc;
  } catch {
    name = cc;
  }
  return { flag, name };
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
      <div className="bg-surface-card">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-6 py-6 sm:flex-row sm:justify-around">
          <StatChip
            label={t("globalTrees")}
            value={formatTokens(stats.totalTrees, locale)}
            unit={t("treeUnit")}
            icon={
              <span
                className="animate-tree-breathe inline-block"
                style={{ transformOrigin: "bottom center" }}
                aria-hidden
              >
                <Image
                  src="/sprites/AppleTree_5.png"
                  alt=""
                  width={22}
                  height={22}
                  className="pixelated"
                  style={{ width: 22, height: 22, objectFit: "contain", objectPosition: "50% 100%" }}
                />
              </span>
            }
          />
          <div className="hidden h-8 w-px bg-leaf-deep/40 sm:block" aria-hidden />
          <StatChip
            label={t("totalTokens")}
            value={formatTokens(stats.totalTokens, locale)}
            unit={t("tokenUnit")}
            icon={
              <svg viewBox="0 0 10 10" width={18} shapeRendering="crispEdges" aria-hidden>
                <g fill="#c8943c">
                  <rect x="3" y="1" width="4" height="8" />
                  <rect x="1" y="3" width="8" height="4" />
                  <rect x="2" y="2" width="6" height="6" />
                </g>
                <rect x="3" y="3" width="2" height="2" fill="#e8ba60" />
              </svg>
            }
          />
        </div>
      </div>

      {/* pixel ground divider under the banner */}
      <div className="relative h-5 w-full" aria-hidden>
        <Image src="/sprites/Ground.png" alt="" fill sizes="100vw" className="pixelated object-cover" />
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
              alt=""
              width={64}
              height={64}
              className="pixelated mx-auto mb-4 opacity-60"
              style={{ width: 64, height: 64, objectFit: "contain" }}
              aria-hidden
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
          <div className="overflow-x-auto">
            <div
              className="overflow-hidden rounded-[2px]"
              style={{ border: "var(--border-pixel)" }}
            >
              <table className="w-full border-collapse">
                <colgroup>
                  <col style={{ width: "3.5rem" }} />
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
                    const treePrefix = treeSpritePrefix(entry.tree);
                    const region = regionInfo(entry.region, locale);
                    // cap the entrance stagger so deep rows don't wait seconds
                    const animDelay = `${Math.min(i, 12) * 60}ms`;
                    return (
                      <tr
                        key={entry.id}
                        className="lb-row-light border-t border-leaf-deep/20 bg-surface-card/60"
                        style={{
                          animation: `row-slide-in 320ms ease both`,
                          animationDelay: animDelay,
                          fontFamily: "var(--font-body)",
                          fontSize: "var(--text-body)",
                        }}
                      >
                        <td
                          className="whitespace-nowrap px-4 py-3 font-bold leading-none"
                          style={{
                            fontFamily: "var(--font-pixel)",
                            fontSize: "var(--text-caption)",
                            color: medalColor ?? "var(--color-text-muted-light)",
                            boxShadow: medalColor ? `inset 3px 0 0 ${medalColor}` : undefined,
                          }}
                        >
                          {rank <= 3 ? `0${rank}` : rank}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <TreeModalButton
                              username={entry.username}
                              treePrefix={treePrefix}
                              stage={stage}
                              triggerLabel={t("treeViewAria", { username: entry.username })}
                              stageLabel={t("treeModalStage", { n: stage })}
                              treeAlt={t("treeModalAlt", { username: entry.username })}
                              closeLabel={t("treeModalClose")}
                            />
                            <span className="truncate text-text-forest">{entry.username}</span>
                            {rank === 1 && (
                              <span className="relative inline-flex shrink-0" aria-hidden>
                                <PixelCrown />
                                <span
                                  className="absolute -right-2 -top-1 text-accent-gold"
                                  style={{
                                    fontSize: 7,
                                    lineHeight: 1,
                                    animation: "star-twinkle 3.6s ease-in-out infinite",
                                  }}
                                >
                                  ✦
                                </span>
                              </span>
                            )}
                            {region && (
                              <span
                                role="img"
                                aria-label={region.name}
                                title={region.name}
                                className="shrink-0 leading-none"
                                style={{ fontSize: "1rem" }}
                              >
                                {region.flag}
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="hidden px-4 py-3 text-right text-accent-gold sm:table-cell"
                          style={{
                            fontFamily: "var(--font-pixel)",
                            fontSize: "var(--text-caption)",
                          }}
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

                </tbody>
              </table>
            </div>
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
            ).map((step, i) => (
              <li
                key={step.num}
                className="reveal flex gap-4"
                style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}
              >
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

function StatChip({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-text-muted-light"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
      >
        {label}
      </span>
      <span className="flex items-center gap-2">
        {icon}
        <span
          className="text-leaf-deep"
          style={{ fontFamily: "var(--font-brand)", fontSize: "var(--text-counter)" }}
        >
          {value}
        </span>
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
