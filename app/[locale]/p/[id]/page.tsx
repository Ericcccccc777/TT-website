import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPlayer, hasProject } from "@/lib/leaderboard";
import type { Locale } from "@/i18n/routing";
import { localizedAlternates, localizedUrl, SITE_NAME, OG_LOCALE } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import { ExternalLinkDialog } from "@/components/leaderboard/external-link-dialog";
import {
  MEDAL,
  regionInfo,
  formatTokens,
  projectHostname,
  bustedImageSrc,
  spriteFile,
  spriteStage,
  STAGES,
} from "@/lib/leaderboard-format";
import { ShareButton } from "@/components/share-button";
import { ProjectThumb } from "@/components/project-thumb";
import { ForestIsland } from "@/components/player/forest-island";

/**
 * A player's own page — the thing they can actually send to someone.
 *
 * Until this route existed, filling in a project produced nothing a player could
 * point at: the board is one long page and a row cannot be linked to. Everything
 * on offer here (a permalink for a CV, a target for the badge, a page a search
 * engine can index) depends on that one fact.
 *
 * Addressed by the board row's public id, not the account id — see `getPlayer`.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const profile = await getPlayer(id);
  if (!profile) return { title: { absolute: SITE_NAME }, robots: { index: false, follow: false } };

  const t = await getTranslations({ locale, namespace: "PlayerPage" });
  const { entry } = profile;
  const path = `/p/${id}`;
  const canonical = localizedUrl(path, locale as Locale);
  const showProject = hasProject(entry);

  const cardUrl = `${canonical}/opengraph-image`;
  const title = t("metaTitle", { username: entry.username });
  /*
   * The player's own words never go in here.
   *
   * `docs/features/project-showcase.md` draws the line between the page BODY,
   * where a project's name and description are shown deliberately and where
   * search engines are welcome to read them, and this — the description we hand
   * a search engine as OUR summary of the page. Putting player-written text in
   * the second means publishing unreviewed words as the site's own voice, in a
   * search result, under our name. The body is theirs; this line is ours.
   *
   * Whether the page is indexed at all still turns on having a project; only
   * the wording does not.
   */
  const description = t("metaDesc", { username: entry.username });

  return {
    title: { absolute: title },
    description,
    alternates: { canonical, languages: localizedAlternates(path) },
    /*
     * Indexed only when there is a project on the page.
     *
     * A profile with nothing but a username and a number is a thin page, and a
     * few hundred of them would dilute the handful of guide pages that actually
     * rank. A profile with a project is real content and a real reward — the
     * indexed page linking to their work is the one concrete thing a player gets
     * back for filling the form in.
     */
    robots: showProject ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "profile",
      locale: OG_LOCALE[locale as Locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      /*
       * This player's own card, not the site-wide one.
       *
       * Referenced explicitly rather than left to Next's file-convention
       * injection: lib/seo.ts documents that an explicit `openGraph` block
       * suppresses it, and this function has one. The image route lives at the
       * same path plus `/opengraph-image`.
       */
      images: [{ url: cardUrl, width: 1200, height: 630, alt: title, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cardUrl],
    },
  };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Two namespaces on purpose: the leaving-the-site dialog, the link label and
  // the token unit already exist under LeaderboardPage and are word-for-word the
  // same here. Copying them into PlayerPage would give one sentence two homes in
  // four languages, and they would drift.
  const [t, tl, ts, tsh, profile] = await Promise.all([
    getTranslations("PlayerPage"),
    getTranslations("LeaderboardPage"),
    getTranslations("TreeShowcase"),
    getTranslations("Share"),
    getPlayer(id),
  ]);

  // A missing row, a deleted player and a banned one all land here. Telling them
  // apart would confirm to a stranger that a particular banned player exists.
  if (!profile) notFound();

  const { entry, lifetimeRank, recentRank } = profile;
  const region = regionInfo(entry.region, locale);
  const showProject = hasProject(entry);
  const projectHost = entry.project_url ? projectHostname(entry.project_url) : null;
  const medal = MEDAL[lifetimeRank];

  const speciesLabel = (kind: string): string =>
    kind === "cherry"
      ? ts("skinCherry")
      : kind === "cactus"
        ? ts("skinCactus")
        : kind === "christmas"
          ? ts("skinChristmas")
          : ts("skinApple");

  const joined = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(entry.created_at));

  return (
    <div className="min-h-screen bg-surface-parchment text-text-forest">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/leaderboard/recent"
          className="inline-flex items-center gap-1 text-text-muted-light hover:text-leaf-deep"
          style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
        >
          ← {t("back")}
        </Link>

        {/* ── Identity ── */}
        <header className="mt-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Image
            src={`/sprites/${spriteFile(entry.tree, entry.stage_index)}`}
            alt=""
            width={96}
            height={96}
            className="pixelated shrink-0"
            style={{ width: 96, height: 96, objectFit: "contain", objectPosition: "50% 100%" }}
            aria-hidden
            priority
          />
          <div className="min-w-0">
            <h1
              className="flex flex-wrap items-center justify-center gap-2 text-leaf-deep sm:justify-start"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)" }}
            >
              <span className="break-all">{entry.username}</span>
              {region && (
                <span
                  role="img"
                  aria-label={region.name}
                  title={region.name}
                  className="leading-none"
                >
                  {region.flag}
                </span>
              )}
            </h1>
            <p
              className="mt-2 text-text-muted-light"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
            >
              {t("joined", { date: joined })}
            </p>
            {/*
              Without this, nothing on the page ever says it can be sent to
              anyone — which is the one thing the page exists to make possible.
              The URL is built here rather than read from the browser so all
              three call sites of this control follow one rule.
            */}
            <div className="mt-4 flex justify-center sm:justify-start">
              <ShareButton
                url={localizedUrl(`/p/${id}`, locale as Locale)}
                shareTitle={entry.username}
                shareText={t("shareText", { username: entry.username })}
                label={tsh("share")}
                copiedLabel={tsh("copied")}
                manualLabel={tsh("copyManual")}
                ariaLabel={t("shareAria", { username: entry.username })}
                variant="solid"
              />
            </div>
          </div>
        </header>

        {/* ── Standing ── */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <RankCard
            label={t("rankLifetime")}
            rank={lifetimeRank}
            tokens={formatTokens(entry.score, locale)}
            unit={tl("tokenUnit")}
            accent={medal}
          />
          <RankCard
            label={t("rankRecent")}
            rank={recentRank}
            tokens={
              recentRank ? formatTokens(entry.recent_score ?? 0, locale) : t("rankRecentNone")
            }
            unit={recentRank ? tl("tokenUnit") : ""}
            accent={recentRank ? MEDAL[recentRank] : undefined}
          />
        </div>

        {/* ── The forest ── */}
        {/*
          `overflow-x: visible` overrides the site-wide `section { overflow-x:
          clip }` from globals.css. That rule exists to stop narrow phones
          scrolling sideways, and it was silently cropping the island back to
          the text column however wide the island asked to be. Safe to lift
          here because the island sizes itself from the VIEWPORT — it is never
          wider than the screen, so there is nothing for the clip to protect
          against on this one section.
        */}
        <section className="mt-10" style={{ overflowX: "visible" }}>
          <h2
            className="mb-4 text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)" }}
          >
            {t("forestHeading")}
          </h2>
          {/*
            The island first, then the same facts as text.
            The picture is decoration and is skipped by a screen reader; every
            species, stage and total it depicts is written out in the list below
            it, so nothing about this player's forest lives only in pixels
            (docs/features/forest-island.md § 3.8).
          */}
          <ForestIsland
            trees={entry.trees}
            /*
              Bleeds past the text column into the page's side margins. The
              island is the one thing on this page that wants to be looked AT
              rather than read, and at the column's width it was small with
              wasted air above and below it. The negative margins are capped
              below the narrowest margin the container leaves, so the page
              never gains a horizontal scrollbar.
            */
            className="mb-5"
          />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {entry.trees.map((tv, i) => {
              const stage = spriteStage(tv.stage_index);
              return (
                <li
                  key={`${tv.kind}-${i}`}
                  className="reveal flex flex-col items-center gap-2 rounded-[2px] p-3"
                  style={{
                    border: "var(--border-pixel)",
                    background: "var(--color-surface-card)",
                    boxShadow: "var(--shadow-pixel)",
                    ["--reveal-delay" as string]: `${i * 80}ms`,
                  }}
                >
                  <Image
                    src={`/sprites/${spriteFile(tv.kind, tv.stage_index)}`}
                    alt=""
                    width={64}
                    height={64}
                    className="pixelated"
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: "contain",
                      objectPosition: "50% 100%",
                    }}
                    aria-hidden
                  />
                  <span
                    className="text-text-forest"
                    style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                  >
                    {speciesLabel(tv.kind)}
                  </span>
                  {/*
                    Stage as a bar as well as a number: eight small blocks read as
                    "how far along" at a glance, which the digits alone do not.
                  */}
                  <span
                    className="flex gap-[2px]"
                    role="img"
                    aria-label={t("treeStage", { n: stage, total: STAGES })}
                  >
                    {Array.from({ length: STAGES }, (_, s) => (
                      <span
                        key={s}
                        className="block h-[6px] w-[4px]"
                        style={{
                          background:
                            s < stage ? "var(--color-leaf-deep)" : "var(--color-rule, #d8d3c4)",
                          opacity: s < stage ? 1 : 0.35,
                        }}
                      />
                    ))}
                  </span>
                  <span
                    className="text-accent-gold"
                    style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                  >
                    {formatTokens(tv.tokens, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── The project ── */}
        <section className="mt-10">
          <h2
            className="mb-4 text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-h1)" }}
          >
            {t("projectHeading")}
          </h2>
          {showProject ? (
              <div
                className="flex flex-col gap-4 rounded-[2px] p-5 sm:flex-row"
                style={{
                  border: "var(--border-pixel)",
                  background: "var(--color-surface-card)",
                  boxShadow: "var(--shadow-pixel)",
                }}
              >
                {entry.project_image && (
                  <ProjectThumb
                    src={bustedImageSrc(entry.project_image, entry.updated_at)}
                    size={160}
                    className="self-center sm:self-start"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-leaf-deep"
                    style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                  >
                    {entry.project_name}
                  </p>
                  {entry.project_desc && (
                    <p
                      className="mt-3 text-text-forest"
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-body)",
                        lineHeight: 1.7,
                      }}
                    >
                      {entry.project_desc}
                    </p>
                  )}
                  {entry.project_url && projectHost && (
                    <p
                      className="mt-4 text-text-muted-light"
                      style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
                    >
                      <span className="mr-1">{tl("projectLinkLabel")}</span>
                      <ExternalLinkDialog
                        href={entry.project_url}
                        hostname={projectHost}
                        title={tl("projectLeaveTitle")}
                        body={tl("projectLeaveBody")}
                        confirmLabel={tl("projectLeaveConfirm")}
                        cancelLabel={tl("projectLeaveCancel")}
                      />
                    </p>
                  )}
                </div>
              </div>
          ) : (
            <div
              className="rounded-[2px] px-5 py-6 text-center"
              style={{ border: "1px dashed var(--color-soil)" }}
            >
              <p
                className="text-text-muted-light"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  lineHeight: 1.7,
                }}
              >
                {t("noProject", { username: entry.username })}
              </p>
            </div>
          )}
        </section>

        {/* ── CTA ── */}
        <div
          className="mt-10 rounded-[2px] p-6 text-center"
          style={{ border: "var(--border-pixel)", background: "var(--color-surface-card)" }}
        >
          <p
            className="mb-4 text-text-muted-light"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-small)",
              lineHeight: 1.7,
            }}
          >
            {t("ctaBody")}
          </p>
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
            {t("cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RankCard({
  label,
  rank,
  tokens,
  unit,
  accent,
}: {
  label: string;
  rank: number | null;
  tokens: string;
  unit: string;
  accent?: string;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-[2px] p-4"
      style={{
        border: "var(--border-pixel)",
        background: "var(--color-surface-card)",
        boxShadow: "var(--shadow-pixel)",
        borderLeft: accent ? `6px solid ${accent}` : undefined,
      }}
    >
      <span
        className="leading-none"
        style={{
          fontFamily: "var(--font-brand)",
          fontSize: "var(--text-counter)",
          color: accent ?? "var(--color-text-muted-light)",
        }}
      >
        {rank ? `#${rank}` : "—"}
      </span>
      <span className="min-w-0">
        <span
          className="block text-text-muted-light"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
        >
          {label}
        </span>
        <span
          className="mt-1 block text-accent-gold"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
        >
          {tokens}
          {unit && <span className="ml-1 text-text-muted-light">{unit}</span>}
        </span>
      </span>
    </div>
  );
}
