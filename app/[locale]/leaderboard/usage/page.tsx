import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProviderUsage, getModelUsage } from "@/lib/leaderboard-boards";
import { formatTokens, compactTokens } from "@/lib/leaderboard-format";
import { BoardTabs } from "@/components/leaderboard/board-tabs";
import { UsageBar, providerColor } from "@/components/leaderboard/usage-bars";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata, localizedUrl } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/json-ld";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ p?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const base = localizedMetadata("/leaderboard/usage", locale as Locale);
  const p = (await searchParams).p;
  if (!p) return base;
  // A filtered view is the same content sliced, and `p` comes from a vendor
  // string the desktop app derived from a local model name — not something to
  // let a crawler enumerate. Self-canonical + noindex, same as ?page on the
  // token board.
  return {
    ...base,
    alternates: { canonical: `${localizedUrl("/leaderboard/usage", locale as Locale)}?p=${p}` },
    robots: { index: false, follow: true },
  };
}

export default async function UsageBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rawProvider = (await searchParams).p;

  const [t, tnav, providers] = await Promise.all([
    getTranslations("LeaderboardPage"),
    getTranslations("TopBar"),
    getProviderUsage(),
  ]);

  // Only accept ?p= values that are actually on the board. An arbitrary string
  // would otherwise produce an empty model list that looks like a broken page
  // rather than a bad link.
  const selected =
    rawProvider && providers.rows.some((r) => r.provider === rawProvider) ? rawProvider : undefined;

  const models = await getModelUsage(selected);

  const tabs = { tokens: t("boardTokens"), value: t("boardValue"), usage: t("boardUsage") };

  const providerMax = providers.rows[0]?.tokens ?? 0;
  const modelMax = models.rows[0]?.tokens ?? 0;
  const providerTotal = providers.rows.reduce((s, r) => s + r.tokens, 0);
  const error = providers.error ?? models.error;

  return (
    <div className="min-h-screen bg-surface-parchment text-text-forest">
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tnav("home"), path: "/" },
          { name: tnav("leaderboard"), path: "/leaderboard" },
          { name: t("usageTitle"), path: "/leaderboard/usage" },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <BoardTabs active="usage" labels={tabs} />

        <div className="mb-8 text-center">
          <h1
            className="font-pixel text-display text-leaf-deep"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-display)" }}
          >
            {t("usageTitle")}
          </h1>
          <p
            className="mt-3 text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
          >
            {t("usageSubtitle")}
          </p>
        </div>

        {error && (
          <div
            className="mb-6 rounded-[2px] border-2 border-bubble-claude bg-surface-card px-4 py-3"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            <span className="text-bubble-claude">{t("errorPrefix")}</span>
            <span className="ml-1 text-text-muted-light">{error}</span>
          </div>
        )}

        {!error && providers.rows.length === 0 && (
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
              {t("usageEmptyHeading")}
            </p>
            <p
              className="mt-2 text-text-muted-light"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
            >
              {t("usageEmptyBody")}
            </p>
          </div>
        )}

        {providers.rows.length > 0 && (
          <>
            {/* ── Vendors ── */}
            <section className="mb-8">
              <h2
                className="mb-3 text-leaf-deep"
                style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
              >
                {t("usageVendorsHeading")}
              </h2>
              <ul
                className="overflow-hidden rounded-[2px] bg-surface-card/60"
                style={{ border: "var(--border-pixel)" }}
              >
                {providers.rows.map((row, i) => {
                  const share = providerTotal > 0 ? row.tokens / providerTotal : 0;
                  return (
                    <UsageBar
                      key={row.provider}
                      label={row.provider}
                      sublabel={t("usageModelCount", { n: row.models })}
                      value={compactTokens(row.tokens, locale)}
                      share={providerMax > 0 ? row.tokens / providerMax : 0}
                      color={providerColor(row.provider, i)}
                      href={
                        selected === row.provider
                          ? "/leaderboard/usage"
                          : `/leaderboard/usage?p=${encodeURIComponent(row.provider)}`
                      }
                      active={selected === row.provider}
                      ariaLabel={t("usageVendorAria", {
                        provider: row.provider,
                        tokens: formatTokens(row.tokens, locale),
                        pct: new Intl.NumberFormat(locale, {
                          style: "percent",
                          maximumFractionDigits: 1,
                        }).format(share),
                      })}
                      delayMs={i * 45}
                    />
                  );
                })}
              </ul>
            </section>

            {/* ── Models ── */}
            <section>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  className="text-leaf-deep"
                  style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                >
                  {selected
                    ? t("usageModelsOfHeading", { provider: selected })
                    : t("usageModelsHeading")}
                </h2>
                {models.total > models.rows.length && (
                  <span
                    className="text-text-muted-light"
                    style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
                  >
                    {t("usageModelsTruncated", {
                      shown: formatTokens(models.rows.length, locale),
                      total: formatTokens(models.total, locale),
                    })}
                  </span>
                )}
                {selected && (
                  <Link
                    href="/leaderboard/usage"
                    className="text-text-muted-light underline underline-offset-2 hover:text-leaf-deep"
                    style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
                  >
                    {t("usageClearFilter")}
                  </Link>
                )}
              </div>
              <ul
                className="overflow-hidden rounded-[2px] bg-surface-card/60"
                style={{ border: "var(--border-pixel)" }}
              >
                {models.rows.map((row, i) => (
                  <UsageBar
                    key={`${row.provider}/${row.model}`}
                    label={row.model}
                    sublabel={selected ? undefined : row.provider}
                    value={compactTokens(row.tokens, locale)}
                    share={modelMax > 0 ? row.tokens / modelMax : 0}
                    color={providerColor(
                      row.provider,
                      providers.rows.findIndex((p) => p.provider === row.provider),
                    )}
                    delayMs={i * 45}
                  />
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
