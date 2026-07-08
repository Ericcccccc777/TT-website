import type { Metadata } from "next";
import React from "react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardMock } from "@/components/dashboard-mock";
import { InViewGate } from "@/components/in-view-gate";
import { PixelHand } from "@/components/pixel-hand";
import { getGlobalStats } from "@/lib/leaderboard";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/seo";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/json-ld";

const GITHUB_REPO = "https://github.com/Ericcccccc777/Token-Forest-P";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata("/dashboard", locale as Locale);
}

// Pixel label font: Silkscreen for latin, body font for CJK glyphs.
const PX = "var(--font-pixel), var(--font-body)";

function GitHubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, th, tnav, stats] = await Promise.all([
    getTranslations("DashboardPage"),
    getTranslations("Hero"),
    getTranslations("TopBar"),
    getGlobalStats(),
  ]);

  const treesCount = stats.totalTrees > 0 ? stats.totalTrees.toLocaleString(locale) : "—";
  const tokensCount =
    stats.totalTokens > 0
      ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
          stats.totalTokens,
        )
      : "—";

  // ── Section data ──────────────────────────────────────────────────────────
  const LAYERS = [
    {
      icon: "🌳",
      title: t("layerGrowthTitle"),
      body: t("layerGrowthBody"),
      chips: [0, 1, 2, 3].map((i) => t(`layerGrowthChip${i}`)),
    },
    {
      icon: "📊",
      title: t("layerUsageTitle"),
      body: t("layerUsageBody"),
      chips: [0, 1, 2, 3, 4].map((i) => t(`layerUsageChip${i}`)),
    },
    {
      icon: "💬",
      title: t("layerChatsTitle"),
      body: t("layerChatsBody"),
      chips: [0, 1, 2, 3].map((i) => t(`layerChatsChip${i}`)),
    },
  ];

  const WHY = [0, 1, 2, 3].map((i) => ({
    title: t(`why${i}Title`),
    body: t(`why${i}Body`),
  }));
  const WHY_ICONS: Array<React.ReactNode> = [
    <Image
      key="tree"
      src="/sprites/AppleTree_3.png"
      alt=""
      width={31}
      height={34}
      className="pixelated w-[31px]"
      aria-hidden
    />,
    "💬",
    "🔌",
    "🧮",
  ];

  const FAQ = [0, 1, 2, 3].map((i) => ({ q: t(`faq${i}Q`), a: t(`faq${i}A`) }));

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tnav("home"), path: "/" },
          { name: tnav("dashboard"), path: "/dashboard" },
        ]}
      />
      {/* FAQPage: the visible Q&A below IS this schema (same FAQ array). */}
      <FaqJsonLd items={FAQ.map((f) => ({ question: f.q, answer: f.a }))} />

      {/* Film grain overlay (site-wide pattern) */}
      <div className="grain-overlay" aria-hidden>
        <svg width="100%" height="100%">
          <filter id="grain-dash">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-dash)" />
        </svg>
      </div>

      {/* ── §1 Hero — dark split: copy left, live mock right ── */}
      <section
        className="relative overflow-hidden bg-surface-forest px-6 pb-20 pt-16 sm:pt-[72px]"
        aria-labelledby="dash-hero-heading"
      >
        {/* Ambient sparkles (hidden under reduced motion via .sparkle) */}
        <span
          className="sparkle absolute left-[6%] top-[10%] text-leaf-light"
          style={{ fontSize: 10, animation: "sparkle-pulse 2s ease-in-out infinite" }}
          aria-hidden
        >
          ✦
        </span>
        <span
          className="sparkle absolute left-[44%] top-[22%] text-leaf-light"
          style={{ fontSize: 8, animation: "sparkle-pulse 2s ease-in-out 0.7s infinite" }}
          aria-hidden
        >
          ✦
        </span>
        <span
          className="sparkle absolute bottom-[14%] left-[3%] text-leaf-light"
          style={{ fontSize: 7, animation: "sparkle-pulse 2s ease-in-out 1.3s infinite" }}
          aria-hidden
        >
          ✦
        </span>
        <span
          className="sparkle absolute right-[5%] top-[8%] text-leaf-light"
          style={{ fontSize: 9, animation: "sparkle-pulse 2s ease-in-out 1s infinite" }}
          aria-hidden
        >
          ✦
        </span>

        <div className="relative mx-auto grid max-w-5xl items-center gap-11 lg:grid-cols-[400px_1fr]">
          {/* Left: copy */}
          <div className="flex flex-col items-start">
            <span
              className="reveal font-pixel"
              style={{
                fontSize: 11,
                letterSpacing: "0.3em",
                color: "var(--color-accent-gold-light)",
              }}
            >
              DASHBOARD
            </span>
            <h1
              id="dash-hero-heading"
              className="reveal mt-5"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-neon)",
                lineHeight: 1.3,
              }}
            >
              <span
                className="neon-title neon-dark"
                style={{ "--neon-delay": "0s" } as React.CSSProperties}
              >
                {t("heading")}
              </span>
            </h1>
            <p
              className="reveal mt-[18px] font-bold"
              style={
                {
                  "--reveal-delay": "60ms",
                  fontFamily: "var(--font-body)",
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: "var(--color-text-cream)",
                } as React.CSSProperties
              }
            >
              {t("tagline")}
            </p>
            <p
              className="reveal mt-2.5"
              style={
                {
                  "--reveal-delay": "120ms",
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "var(--color-text-muted-dark)",
                } as React.CSSProperties
              }
            >
              {t("sub")}
            </p>
            <div
              className="reveal mt-7 flex flex-wrap gap-3.5"
              style={{ "--reveal-delay": "180ms" } as React.CSSProperties}
            >
              <Link
                href="/download"
                className="inline-flex items-center gap-2 rounded-[2px] bg-leaf-deep px-[22px] py-3 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
              >
                <svg viewBox="0 0 14 14" fill="currentColor" width="14" height="14" aria-hidden>
                  <path d="M7 1v7.293L4.854 6.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L7.5 8.293V1H7ZM1 11a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H1Z" />
                </svg>
                {t("ctaDownload")}
              </Link>
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[2px] px-5 py-2.5 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "var(--text-caption)",
                  background: "var(--color-surface-panel)",
                  border: "2px solid var(--color-leaf-deep)",
                }}
              >
                <GitHubIcon />
                GitHub
              </a>
            </div>
            <p
              className="reveal mt-5"
              style={
                {
                  "--reveal-delay": "240ms",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  color: "var(--color-text-muted-dark)",
                } as React.CSSProperties
              }
            >
              {th("privacyCopy")}
            </p>
          </div>

          {/* Right: interactive mock window */}
          <InViewGate className="reveal min-w-0">
            <DashboardMock />
          </InViewGate>
        </div>
      </section>

      {/* ── §2 Three layers (parchment) ── */}
      <section className="bg-surface-parchment px-6 py-20" aria-labelledby="dash-layers-heading">
        <div className="mx-auto max-w-5xl">
          <h2
            id="dash-layers-heading"
            className="reveal text-center"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-neon)",
              lineHeight: 1.25,
            }}
          >
            <span
              className="neon-title neon-light"
              style={{ "--neon-delay": "1.4s" } as React.CSSProperties}
            >
              {t("layersHeading")}
            </span>
          </h2>
          <p
            className="reveal mb-12 mt-3 text-center"
            style={
              {
                "--reveal-delay": "80ms",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                color: "var(--color-text-muted-light)",
              } as React.CSSProperties
            }
          >
            {t("layersSub")}
          </p>

          <div className="flex flex-col">
            {LAYERS.map((layer, i) => (
              <div
                key={layer.title}
                className="reveal grid items-center gap-4 py-6 sm:grid-cols-[72px_1fr] lg:grid-cols-[72px_1fr_300px] lg:gap-6"
                style={
                  {
                    "--reveal-delay": `${i * 80}ms`,
                    borderTop: "2px solid var(--color-text-forest)",
                    ...(i === LAYERS.length - 1
                      ? { borderBottom: "2px solid var(--color-text-forest)" }
                      : {}),
                  } as React.CSSProperties
                }
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-[2px] bg-surface-card shadow-pixel-sm"
                  style={{ border: "var(--border-pixel)", fontSize: 26 }}
                  aria-hidden
                >
                  {layer.icon}
                </span>
                <div>
                  <div style={{ fontFamily: PX, fontSize: 13, color: "var(--color-text-forest)" }}>
                    {layer.title}
                  </div>
                  <p
                    className="mt-1.5"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-small)",
                      lineHeight: 1.7,
                      color: "var(--color-text-muted-light)",
                    }}
                  >
                    {layer.body}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:col-start-2 lg:col-start-3 lg:justify-end">
                  {layer.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-[2px] px-2 py-[3px]"
                      style={{
                        border: "1px solid var(--color-soil)",
                        fontFamily: PX,
                        fontSize: 9,
                        color: "var(--color-soil)",
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §3 Why it's different (forest) ── */}
      <section className="bg-surface-forest px-6 py-20" aria-labelledby="dash-why-heading">
        <div className="mx-auto max-w-5xl">
          <h2
            id="dash-why-heading"
            className="reveal mb-12 text-center"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-neon)",
              lineHeight: 1.25,
            }}
          >
            <span
              className="neon-title neon-dark"
              style={{ "--neon-delay": "2.8s" } as React.CSSProperties}
            >
              {t("whyHeading")}
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((card, i) => (
              <div
                key={card.title}
                className="reveal flex flex-col gap-2.5 rounded-[2px] bg-surface-panel p-[18px] transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg"
                style={
                  {
                    "--reveal-delay": `${i * 80}ms`,
                    border: "2px solid var(--color-leaf-deep)",
                  } as React.CSSProperties
                }
              >
                <span
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-[2px]"
                  style={{
                    background: "rgb(58 125 68 / 25%)",
                    border: "1px solid var(--color-leaf-deep)",
                    ...(i > 0 ? { fontSize: 16 } : {}),
                  }}
                  aria-hidden
                >
                  {WHY_ICONS[i]}
                </span>
                <span style={{ fontFamily: PX, fontSize: 11, color: "var(--color-text-cream)" }}>
                  {card.title}
                </span>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    color: "var(--color-text-muted-dark)",
                  }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §4 How: three-step pipeline (parchment) ── */}
      <section className="bg-surface-parchment px-6 py-20" aria-labelledby="dash-how-heading">
        <div className="mx-auto max-w-5xl">
          <h2
            id="dash-how-heading"
            className="reveal mb-12 text-center"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-neon)",
              lineHeight: 1.25,
            }}
          >
            <span
              className="neon-title neon-light"
              style={{ "--neon-delay": "4.2s" } as React.CSSProperties}
            >
              {t("howHeading")}
            </span>
          </h2>

          <div className="grid items-stretch gap-4 md:grid-cols-[1fr_28px_1fr_28px_1.2fr]">
            {/* 01 */}
            <div
              className="reveal flex flex-col gap-2.5 rounded-[2px] bg-surface-card p-5 shadow-pixel-sm"
              style={{ border: "var(--border-pixel)" }}
            >
              <span className="font-pixel font-bold text-leaf-deep" style={{ fontSize: 20 }}>
                01
              </span>
              <span
                className="font-bold"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  color: "var(--color-text-forest)",
                }}
              >
                {t("how0Title")}
              </span>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  lineHeight: 1.7,
                  color: "var(--color-text-muted-light)",
                }}
              >
                {t("how0Body")}
              </p>
              <div className="mt-auto flex justify-center">
                <Image
                  src="/sprites/AppleTree_2.png"
                  alt=""
                  width={40}
                  height={43}
                  className="pixelated w-10"
                  aria-hidden
                />
              </div>
            </div>

            <span
              className="reveal hidden self-center font-pixel text-soil md:block"
              style={{ fontSize: 14 }}
              aria-hidden
            >
              ▶
            </span>
            <span
              className="reveal text-center font-pixel text-soil md:hidden"
              style={{ fontSize: 14 }}
              aria-hidden
            >
              ▼
            </span>

            {/* 02 */}
            <div
              className="reveal flex flex-col gap-2.5 rounded-[2px] bg-surface-card p-5 shadow-pixel-sm"
              style={
                { "--reveal-delay": "80ms", border: "var(--border-pixel)" } as React.CSSProperties
              }
            >
              <span className="font-pixel font-bold text-leaf-deep" style={{ fontSize: 20 }}>
                02
              </span>
              <span
                className="font-bold"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  color: "var(--color-text-forest)",
                }}
              >
                {t("how1Title")}
              </span>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  lineHeight: 1.7,
                  color: "var(--color-text-muted-light)",
                }}
              >
                {t("how1Body")}
              </p>
              <div
                className="mt-auto flex items-center justify-center gap-1.5 font-pixel"
                style={{ fontSize: 10, color: "var(--color-text-muted-light)" }}
                aria-hidden
              >
                <span>$ claude &quot;fix a bug&quot;</span>
                <span style={{ animation: "cursor-blink 1s steps(1) infinite" }}>▌</span>
              </div>
            </div>

            <span
              className="reveal hidden self-center font-pixel text-soil md:block"
              style={{ fontSize: 14 }}
              aria-hidden
            >
              ▶
            </span>
            <span
              className="reveal text-center font-pixel text-soil md:hidden"
              style={{ fontSize: 14 }}
              aria-hidden
            >
              ▼
            </span>

            {/* 03 — right-click menu mock */}
            <div
              className="reveal flex flex-col gap-2.5 rounded-[2px] bg-surface-card p-5 shadow-pixel-sm"
              style={
                { "--reveal-delay": "160ms", border: "var(--border-pixel)" } as React.CSSProperties
              }
            >
              <span className="font-pixel font-bold text-leaf-deep" style={{ fontSize: 20 }}>
                03
              </span>
              <span
                className="font-bold"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  color: "var(--color-text-forest)",
                }}
              >
                {t("how2Title")}
              </span>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  lineHeight: 1.7,
                  color: "var(--color-text-muted-light)",
                }}
              >
                {t("how2Body")}
              </p>
              <div
                className="relative mt-1 w-[190px] max-w-full rounded-lg bg-surface-panel p-1 shadow-pixel"
                style={{ border: "var(--border-pixel)" }}
                aria-hidden
              >
                <div
                  className="rounded-[5px] px-2.5 py-1.5 text-leaf-light"
                  style={{ background: "rgb(58 125 68 / 30%)", fontFamily: PX, fontSize: 10 }}
                >
                  {t("menuDashboard")}
                </div>
                <div
                  className="px-2.5 py-1.5"
                  style={{ fontFamily: PX, fontSize: 10, color: "var(--color-text-muted-dark)" }}
                >
                  {t("menuHide")}
                </div>
                <div
                  className="mx-2.5 my-1"
                  style={{ borderTop: "1px solid rgb(122 90 58 / 50%)" }}
                />
                <div
                  className="px-2.5 py-1.5"
                  style={{ fontFamily: PX, fontSize: 10, color: "var(--color-text-muted-dark)" }}
                >
                  {t("menuCapsule")}
                </div>
                <span className="absolute right-[30px] top-2">
                  <PixelHand width={15} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── §5 FAQ (forest) ── */}
      <section className="dash-faq bg-surface-forest px-6 py-20" aria-labelledby="dash-faq-heading">
        <div className="mx-auto max-w-3xl">
          <h2
            id="dash-faq-heading"
            className="reveal text-center"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-neon)",
              lineHeight: 1.25,
            }}
          >
            <span
              className="neon-title neon-dark"
              style={{ "--neon-delay": "5.6s" } as React.CSSProperties}
            >
              {t("faqHeading")}
            </span>
          </h2>
          <p
            className="reveal mb-10 mt-3 text-center"
            style={
              {
                "--reveal-delay": "80ms",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                color: "var(--color-text-muted-dark)",
              } as React.CSSProperties
            }
          >
            {t("faqSub")}
          </p>

          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <details
                key={item.q}
                open={i === 0}
                className="reveal rounded-[2px] bg-surface-panel"
                style={
                  {
                    "--reveal-delay": `${i * 60}ms`,
                    border: "2px solid var(--color-leaf-deep)",
                  } as React.CSSProperties
                }
              >
                <summary className="flex items-center gap-3 px-[18px] py-4">
                  <span
                    className="dash-faq-chev inline-block font-pixel text-leaf-light transition-transform duration-150"
                    style={{ fontSize: 11 }}
                    aria-hidden
                  >
                    ▸
                  </span>
                  <span
                    style={{
                      fontFamily: PX,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "var(--color-text-cream)",
                    }}
                  >
                    {item.q}
                  </span>
                </summary>
                <p
                  className="px-[18px] pb-[18px] pl-[41px] pt-3.5"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-small)",
                    lineHeight: 1.7,
                    color: "var(--color-text-muted-dark)",
                  }}
                >
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          <p
            className="reveal mt-7 text-center"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              lineHeight: 1.8,
              color: "rgb(138 173 145 / 75%)",
            }}
          >
            {t("faqNote0")}
            <br />
            {t("faqNote1")}
          </p>
        </div>
      </section>

      {/* ── §6 Bottom CTA (parchment) ── */}
      <section className="bg-surface-parchment px-6 py-20" aria-labelledby="dash-cta-heading">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Image
            src="/sprites/AppleTree_8.png"
            alt=""
            width={80}
            height={87}
            className="pixelated reveal mb-5 w-20"
            aria-hidden
          />
          <h2
            id="dash-cta-heading"
            className="reveal mb-3"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-neon)",
              lineHeight: 1.25,
            }}
          >
            <span
              className="neon-title neon-light"
              style={{ "--neon-delay": "7s" } as React.CSSProperties}
            >
              {t("ctaHeading")}
            </span>
          </h2>
          <p
            className="reveal mb-6 max-w-md"
            style={
              {
                "--reveal-delay": "60ms",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                lineHeight: 1.7,
                color: "var(--color-text-muted-light)",
              } as React.CSSProperties
            }
          >
            {t("ctaSub")}
          </p>

          {/* Global stats chips (live leaderboard data) */}
          <div
            className="reveal flex flex-wrap justify-center gap-3"
            style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
          >
            <span
              className="inline-flex items-center gap-2 rounded-[2px] px-3 py-1.5 text-leaf-deep"
              style={{ border: "1px solid var(--color-leaf-deep)", fontFamily: PX, fontSize: 10 }}
            >
              {t("ctaTrees", { count: treesCount })}
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-[2px] px-3 py-1.5"
              style={{
                border: "1px solid var(--color-accent-gold)",
                color: "var(--color-accent-gold)",
                fontFamily: PX,
                fontSize: 10,
              }}
            >
              {t("ctaTokens", { count: tokensCount })}
            </span>
          </div>

          <div
            className="reveal mt-6 flex flex-wrap justify-center gap-4"
            style={{ "--reveal-delay": "180ms" } as React.CSSProperties}
          >
            <Link
              href="/download"
              className="inline-flex items-center gap-2.5 rounded-[2px] bg-leaf-deep px-6 py-3 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              Windows
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center gap-2.5 rounded-[2px] bg-surface-card px-6 py-3 shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                border: "var(--border-pixel)",
                color: "var(--color-text-forest)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect
                  x="2"
                  y="3"
                  width="20"
                  height="15"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M7 8l3 3-3 3M13 14h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                />
              </svg>
              macOS
            </Link>
          </div>

          <p
            className="reveal mt-[18px]"
            style={
              {
                "--reveal-delay": "240ms",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-small)",
                color: "var(--color-text-muted-light)",
              } as React.CSSProperties
            }
          >
            {t.rich("ctaGithubNote", {
              link: (chunks) => (
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-leaf-deep"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </section>
    </>
  );
}
