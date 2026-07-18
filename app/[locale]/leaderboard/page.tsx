import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLeaderboard, getGlobalStats, LEADERBOARD_PAGE_SIZE } from "@/lib/leaderboard";
import { TreeModalButton } from "@/components/tree-modal";
import { PixelCrown } from "@/components/pixel-crown";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata, localizedUrl } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/json-ld";

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const base = localizedMetadata("/leaderboard", locale as Locale);
  const pageParam = Number((await searchParams).page);
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  if (page === 1) return base;
  // Paginated views (?page=2, …) are low-value for search and would read as thin
  // duplicates of page one, so they self-canonical and stay out of the index.
  return {
    ...base,
    alternates: { canonical: `${localizedUrl("/leaderboard", locale as Locale)}?page=${page}` },
    robots: { index: false, follow: true },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type TFunc = Awaited<ReturnType<typeof getTranslations<"LeaderboardPage">>>;

function formatTokens(n: number, locale: string): string {
  return n.toLocaleString(locale);
}

/** Compact token count (e.g. 90M / 9000万) — fits the narrow per-tree cards. */
function compactTokens(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
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
  christmas: "ChristmasTree",
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

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const pageParam = Number((await searchParams).page);
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;

  const [t, tnav, ts, [{ entries, total, error }, stats]] = await Promise.all([
    getTranslations("LeaderboardPage"),
    getTranslations("TopBar"),
    getTranslations("TreeShowcase"),
    Promise.all([getLeaderboard(page), getGlobalStats()]),
  ]);

  const offset = (page - 1) * LEADERBOARD_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / LEADERBOARD_PAGE_SIZE));

  // Localised species names (reused from the homepage showcase), for the tree popup.
  const speciesLabel = (kind: string): string =>
    kind === "cherry"
      ? ts("skinCherry")
      : kind === "cactus"
        ? ts("skinCactus")
        : kind === "christmas"
          ? ts("skinChristmas")
          : ts("skinApple");

  return (
    <div className="min-h-screen bg-surface-parchment text-text-forest">
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tnav("home"), path: "/" },
          { name: tnav("leaderboard"), path: "/leaderboard" },
        ]}
      />
      {/* ── Global stats banner ── */}
      <div className="border-b-2 border-leaf-deep bg-surface-card">
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
                  style={{
                    width: 22,
                    height: 22,
                    objectFit: "contain",
                    objectPosition: "50% 100%",
                  }}
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
                    const rank = offset + i + 1;
                    const medalColor = MEDAL[rank];
                    // The user's trees for the popup — main (current) tree first.
                    const treeViews = entry.trees.map((tv) => {
                      const sStage = spriteStage(tv.stage_index);
                      return {
                        prefix: treeSpritePrefix(tv.kind),
                        stage: sStage,
                        speciesLabel: speciesLabel(tv.kind),
                        tokensLabel: compactTokens(tv.tokens, locale),
                        stageLabel: t("treeModalStage", { n: sStage }),
                        alt: t("treeModalAlt", { username: entry.username }),
                      };
                    });
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
                              trees={treeViews}
                              triggerLabel={t("treeViewAria", { username: entry.username })}
                              closeLabel={t("treeModalClose")}
                              tokensUnit={t("tokenUnit")}
                              mainLabel={t("treeModalMain")}
                              totalLabel={t("treeModalTotal")}
                              totalTokensLabel={formatTokens(entry.score, locale)}
                              prevLabel={t("treeModalPrev")}
                              nextLabel={t("treeModalNext")}
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

        {/* Pagination — only when there is more than one page (50 per page) */}
        {totalPages > 1 && (
          <nav
            className="mt-6 flex items-center justify-center gap-3"
            aria-label={t("paginationLabel")}
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
          >
            <PagerLink
              href={page - 1 <= 1 ? "/leaderboard" : `/leaderboard?page=${page - 1}`}
              disabled={page <= 1}
              label={`← ${t("paginationPrev")}`}
            />
            <span className="whitespace-nowrap text-text-muted-light">
              {t("paginationPageOf", { page, total: totalPages })}
            </span>
            <PagerLink
              href={`/leaderboard?page=${page + 1}`}
              disabled={page >= totalPages}
              label={`${t("paginationNext")} →`}
            />
          </nav>
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

        {/* ── Show your badge ── */}
        <div
          className="mt-10 rounded-[2px] bg-surface-card p-6"
          style={{ border: "var(--border-pixel)" }}
        >
          <h2
            className="mb-3 text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)" }}
          >
            {t("badgeHeading")}
          </h2>
          <p
            className="mb-4 text-text-muted-light"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-small)",
              lineHeight: 1.7,
            }}
          >
            {t("badgeBody")}
          </p>
          {/* Live badge sample from the SVG endpoint — always the current design. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/badge/demo.svg"
            alt={t("badgeAlt")}
            width={460}
            height={140}
            className="h-auto w-full max-w-[460px] rounded-[2px]"
          />
          <div className="mt-5">
            <Link
              href="/badge"
              className="inline-flex items-center gap-2 rounded-[2px] px-5 py-2.5 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                background: "var(--color-leaf-deep)",
                boxShadow: "var(--shadow-pixel)",
                color: "var(--color-text-cream)",
              }}
            >
              {t("badgeCta")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** A pager control: a pixel Link, or a dimmed non-interactive span at the ends. */
function PagerLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  const shared = "inline-flex items-center rounded-[2px] px-4 py-2";
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${shared} cursor-not-allowed opacity-40`}
        style={{
          background: "var(--color-surface-card)",
          border: "var(--border-pixel)",
          color: "var(--color-text-muted-light)",
        }}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${shared} transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
      style={{
        background: "var(--color-surface-card)",
        border: "var(--border-pixel)",
        boxShadow: "var(--shadow-pixel)",
        color: "var(--color-text-forest)",
      }}
    >
      {label}
    </Link>
  );
}

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
