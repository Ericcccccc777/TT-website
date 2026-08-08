import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LEADERBOARD_PAGE_SIZE } from "@/lib/leaderboard";
import { getValueBoard } from "@/lib/leaderboard-boards";
import { MEDAL, regionInfo, formatTokens, formatUsd } from "@/lib/leaderboard-format";
import { BoardTabs } from "@/components/leaderboard/board-tabs";
import { DisclosureNote } from "@/components/leaderboard/disclosure-note";
import { PixelCrown } from "@/components/pixel-crown";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata, localizedUrl } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/json-ld";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const base = localizedMetadata("/leaderboard/value", locale as Locale);
  const pageParam = Number((await searchParams).page);
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  if (page === 1) return base;
  return {
    ...base,
    alternates: {
      canonical: `${localizedUrl("/leaderboard/value", locale as Locale)}?page=${page}`,
    },
    robots: { index: false, follow: true },
  };
}

export default async function ValueBoardPage({
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

  const [t, tnav, { entries, total, error }] = await Promise.all([
    getTranslations("LeaderboardPage"),
    getTranslations("TopBar"),
    getValueBoard(page),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / LEADERBOARD_PAGE_SIZE));
  if (page > totalPages) {
    redirect(`/${locale}/leaderboard/value${totalPages > 1 ? `?page=${totalPages}` : ""}`);
  }
  const offset = (page - 1) * LEADERBOARD_PAGE_SIZE;

  const tabs = { tokens: t("boardTokens"), value: t("boardValue"), usage: t("boardUsage") };

  return (
    <div className="min-h-screen bg-surface-parchment text-text-forest">
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tnav("home"), path: "/" },
          { name: tnav("leaderboard"), path: "/leaderboard" },
          { name: t("valueTitle"), path: "/leaderboard/value" },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <BoardTabs active="value" labels={tabs} />

        <div className="mb-8 text-center">
          <h1
            className="font-pixel text-display text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-display)" }}
          >
            {t("valueTitle")}
          </h1>
          <p
            className="mt-3 text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
          >
            {t("valueSubtitle")}
          </p>
        </div>

        {/*
          One sentence, by request: where the price comes from, that it can lag,
          and that this is what the tree is worth rather than money owed. The
          last clause is the only place on the site a visitor is told that.
        */}
        <DisclosureNote body={t("valueDisclosure")} />

        {error && (
          <div
            className="mb-6 rounded-[2px] border-2 border-bubble-claude bg-surface-card px-4 py-3"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            <span className="text-bubble-claude">{t("errorPrefix")}</span>
            <span className="ml-1 text-text-muted-light">{error}</span>
          </div>
        )}

        {!error && entries.length === 0 && (
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
              {t("valueEmptyHeading")}
            </p>
            <p
              className="mt-2 text-text-muted-light"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
            >
              {t("valueEmptyBody")}
            </p>
          </div>
        )}

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
                    <th scope="col" className="px-4 py-2 text-right text-text-cream">
                      {t("valueHeader")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const rank = offset + i + 1;
                    const medalColor = MEDAL[rank];
                    const region = regionInfo(entry.region, locale);
                    return (
                      <tr
                        key={entry.id}
                        className="lb-row-light border-t border-leaf-deep/20 bg-surface-card/60"
                        style={{
                          animation: "row-slide-in 320ms ease both",
                          animationDelay: `${Math.min(i, 12) * 60}ms`,
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
                          <span className="flex min-w-0 items-center gap-2">
                            {rank === 1 && (
                              <span className="relative inline-block" aria-hidden>
                                <PixelCrown />
                              </span>
                            )}
                            <span className="truncate">{entry.username}</span>
                            {region && (
                              <span title={region.name} aria-label={region.name}>
                                {region.flag}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="flex flex-col items-end gap-0.5">
                            <span
                              className="whitespace-nowrap text-accent-gold"
                              style={{
                                fontFamily: "var(--font-pixel)",
                                fontSize: "var(--text-caption)",
                              }}
                            >
                              <span className="text-text-muted-light" aria-hidden>
                                ≈{" "}
                              </span>
                              {formatUsd(entry.valueUsd, locale)}
                            </span>
                            {/*
                              How much of this number rests on a price borrowed
                              from an older model in the same family. Without it
                              a tree valued almost entirely by fallback looks
                              exactly like one priced from published rates.
                            */}
                            {entry.estimatedUsd > 0 && (
                              <span
                                className="whitespace-nowrap text-text-muted-light"
                                style={{
                                  fontFamily: "var(--font-body)",
                                  fontSize: "var(--text-small)",
                                }}
                              >
                                {entry.estimatedUsd >= entry.valueUsd
                                  ? t("valueAllBorrowed")
                                  : t("valueBorrowed", {
                                      amount: formatUsd(entry.estimatedUsd, locale),
                                    })}
                              </span>
                            )}
                            {entry.unpricedTokens > 0 && (
                              <span
                                className="whitespace-nowrap text-text-muted-light"
                                style={{
                                  fontFamily: "var(--font-body)",
                                  fontSize: "var(--text-small)",
                                }}
                              >
                                {t("valueUnpriced", {
                                  n: formatTokens(entry.unpricedTokens, locale),
                                })}
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <nav
            className="mt-6 flex items-center justify-center gap-3"
            aria-label={t("paginationLabel")}
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
          >
            <PagerLink
              href={
                page - 1 <= 1 ? "/leaderboard/value" : `/leaderboard/value?page=${page - 1}`
              }
              disabled={page <= 1}
              label={`← ${t("paginationPrev")}`}
            />
            <span className="whitespace-nowrap text-text-muted-light">
              {t("paginationPageOf", { page, total: totalPages })}
            </span>
            <PagerLink
              href={`/leaderboard/value?page=${page + 1}`}
              disabled={page >= totalPages}
              label={`${t("paginationNext")} →`}
            />
          </nav>
        )}
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
