import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRecentLeaderboard, hasProject, LEADERBOARD_PAGE_SIZE } from "@/lib/leaderboard";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata, localizedUrl } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { BoardTabs } from "@/components/leaderboard/board-tabs";
import { PeriodTabs } from "@/components/leaderboard/period-tabs";
import { ShowcaseCard } from "@/components/leaderboard/showcase-card";
import {
  regionInfo,
  formatTokens,
  compactTokens,
  spriteStage,
  treePrefix,
} from "@/lib/leaderboard-format";

/**
 * The rolling board: the same players as `/leaderboard`, ranked by what they
 * collected through the app in the last 30 days (0031).
 *
 * Why this route exists at all: the lifetime board ranks on a counter that only
 * goes up, so its order is settled — measured 2026-08-17, the leader holds 63.8%
 * of all tokens ever collected and 15 of 20 players are inside the bottom
 * 0.229%. "Use the app more and your project gets seen more" is therefore false
 * for most of the board. Over a 30-day window it is true for everyone, and true
 * again next month.
 *
 * How far up the board the empty-slot prompt goes. The prompt tells a player the
 * space beside their name is available; that is only worth saying where the space
 * is actually looked at. Five is a judgement, not a measurement — revisit it once
 * there is traffic data to revisit it with.
 */
const EMPTY_PROMPT_THROUGH_RANK = 5;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const base = localizedMetadata("/leaderboard/recent", locale as Locale);
  const pageParam = Number((await searchParams).page);
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  if (page === 1) return base;
  return {
    ...base,
    alternates: {
      canonical: `${localizedUrl("/leaderboard/recent", locale as Locale)}?page=${page}`,
    },
    robots: { index: false, follow: true },
  };
}

type TFunc = Awaited<ReturnType<typeof getTranslations<"LeaderboardPage">>>;

export default async function RecentLeaderboardPage({
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

  const [t, tnav, ts, { entries, total, error }] = await Promise.all([
    getTranslations("LeaderboardPage"),
    getTranslations("TopBar"),
    getTranslations("TreeShowcase"),
    getRecentLeaderboard(page),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / LEADERBOARD_PAGE_SIZE));
  if (!error && page > totalPages) {
    redirect(`/${locale}/leaderboard/recent${totalPages > 1 ? `?page=${totalPages}` : ""}`);
  }
  const offset = (page - 1) * LEADERBOARD_PAGE_SIZE;

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
          { name: t("periodRecent"), path: "/leaderboard/recent" },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <BoardTabs
          active="tokens"
          labels={{ tokens: t("boardTokens"), value: t("boardValue"), usage: t("boardUsage") }}
        />

        <div className="mb-6 text-center">
          <h1
            className="text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-display)" }}
          >
            {t("recentTitle")}
          </h1>
          <p
            className="mx-auto mt-3 max-w-xl text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
          >
            {t("recentSubtitle")}
          </p>
        </div>

        <PeriodTabs
          active="recent"
          labels={{ recent: t("periodRecent"), lifetime: t("periodLifetime") }}
          hint={t("periodHint")}
        />

        {error && (
          <div
            className="mb-6 rounded-[2px] border-2 border-bubble-claude bg-surface-card px-4 py-3"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            <span className="text-bubble-claude">{t("errorPrefix")}</span>
            <span className="ml-1 text-text-muted-light">{error}</span>
          </div>
        )}

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
              {t("recentEmptyHeading")}
            </p>
            <p
              className="mt-2 text-text-muted-light"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
            >
              {t("recentEmptyBody")}
            </p>
          </div>
        )}

        {entries.length > 0 && (
          <>
            <p
              className="mb-4 text-text-muted-light"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              {t("recentPlayers", { n: total })}
            </p>
              <ol className="flex flex-col gap-3">
                {entries.map((entry, i) => {
                  const rank = offset + i + 1;
                  const treeViews = entry.trees.map((tv) => {
                    const sStage = spriteStage(tv.stage_index);
                    return {
                      prefix: treePrefix(tv.kind),
                      stage: sStage,
                      speciesLabel: speciesLabel(tv.kind),
                      tokensLabel: compactTokens(tv.tokens, locale),
                      stageLabel: t("treeModalStage", { n: sStage }),
                      alt: t("treeModalAlt", { username: entry.username }),
                    };
                  });
                  return (
                    <ShowcaseCard
                      key={entry.id}
                      rank={rank}
                      username={entry.username}
                      profileId={entry.id}
                      region={regionInfo(entry.region, locale)}
                      recentLabel={formatTokens(entry.recent_score ?? 0, locale)}
                      totalLabel={formatTokens(entry.score, locale)}
                      trees={treeViews}
                      project={
                        hasProject(entry)
                          ? {
                              name: entry.project_name as string,
                              desc: entry.project_desc ?? null,
                              url: entry.project_url ?? null,
                              image: entry.project_image ?? null,
                              updatedAt: entry.updated_at,
                            }
                          : null
                      }
                      showEmptyPrompt={rank <= EMPTY_PROMPT_THROUGH_RANK}
                      animDelay={`${Math.min(i, 12) * 60}ms`}
                      labels={{
                        treeViewAria: t("treeViewAria", { username: entry.username }),
                        treeModalClose: t("treeModalClose"),
                        treeModalMain: t("treeModalMain"),
                        treeModalTotal: t("treeModalTotal"),
                        treeModalPrev: t("treeModalPrev"),
                        treeModalNext: t("treeModalNext"),
                        tokensUnit: t("tokenUnit"),
                        recentLabel: t("recentTokenLabel"),
                        totalLabel: t("totalTokenLabel"),
                        projectLinkLabel: t("projectLinkLabel"),
                        projectLeaveTitle: t("projectLeaveTitle"),
                        projectLeaveBody: t("projectLeaveBody"),
                        projectLeaveConfirm: t("projectLeaveConfirm"),
                        projectLeaveCancel: t("projectLeaveCancel"),
                        emptyPrompt: t("projectEmptyPrompt"),
                      }}
                    />
                  );
                })}
              </ol>
          </>
        )}

        {totalPages > 1 && (
          <nav
            className="mt-6 flex items-center justify-center gap-3"
            aria-label={t("paginationLabel")}
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
          >
            <PagerLink
              href={page - 1 <= 1 ? "/leaderboard/recent" : `/leaderboard/recent?page=${page - 1}`}
              disabled={page <= 1}
              label={`← ${t("paginationPrev")}`}
            />
            <span className="whitespace-nowrap text-text-muted-light">
              {t("paginationPageOf", { page, total: totalPages })}
            </span>
            <PagerLink
              href={`/leaderboard/recent?page=${page + 1}`}
              disabled={page >= totalPages}
              label={`${t("paginationNext")} →`}
            />
          </nav>
        )}

        <ShowcaseHowTo t={t} />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * How to get a project onto this board.
 *
 * Sits on this page and not the lifetime one because this is where the projects
 * are visible: a reader has just scrolled past the thing the instructions
 * produce. The last step is the download button — the board is the only page
 * that can convert a reader into an installer, and until now it carried no way
 * to do it.
 */
function ShowcaseHowTo({ t }: { t: TFunc }) {
  const steps = [
    { num: "01", title: t("showcase01Title"), body: t("showcase01Body") },
    { num: "02", title: t("showcase02Title"), body: t("showcase02Body") },
    { num: "03", title: t("showcase03Title"), body: t("showcase03Body") },
  ] as const;

  return (
    <div
      className="mt-10 rounded-[2px] bg-surface-card p-6"
      style={{ border: "var(--border-pixel)" }}
    >
      <h2
        className="mb-2 text-leaf-deep"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)" }}
      >
        {t("showcaseHeading")}
      </h2>
      <p
        className="mb-5 text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)", lineHeight: 1.7 }}
      >
        {t("showcaseIntro")}
      </p>
      <ol className="space-y-4">
        {steps.map((step, i) => (
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
      <p
        className="mt-5 text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)", lineHeight: 1.7 }}
      >
        {t("showcaseNote")}
      </p>
      <div className="mt-5">
        <Link
          href="/download"
          className="inline-flex items-center gap-2 rounded-[2px] px-5 py-2.5 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-caption)",
            background: "var(--color-leaf-deep)",
            boxShadow: "var(--shadow-pixel)",
            color: "var(--color-text-cream)",
          }}
        >
          {t("showcaseCta")}
        </Link>
      </div>
    </div>
  );
}

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
