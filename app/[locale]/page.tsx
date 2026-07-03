import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/hero";
import { HowSteps } from "@/components/how-steps";
import { FeatureCard } from "@/components/feature-card";
import {
  RealtimeDemo,
  GrowthFilmstripDemo,
  OfflineToggleDemo,
  TaskbarDemo,
  LeaderboardDemo,
} from "@/components/feature-demos";
import { InViewGate } from "@/components/in-view-gate";
import { PixelCrown } from "@/components/pixel-crown";
import { ScrollTreeHud } from "@/components/scroll-tree-hud";
import { TreeShowcase } from "@/components/tree-showcase";
import { RoadmapSection } from "@/components/roadmap-section";
import { getGlobalStats } from "@/lib/leaderboard";

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, stats] = await Promise.all([getTranslations("HowItWorks"), getGlobalStats()]);
  const tf = await getTranslations("Features");
  const tlt = await getTranslations("LeaderboardTeaser");
  const tdl = await getTranslations("DownloadCta");
  const th = await getTranslations("ScrollHud");

  // ── Feature grid data — each card carries a live demo screen ─────────────
  const FEATURES: Array<{
    title: string;
    body?: string;
    bullets?: string[];
    accentColor: "leaf" | "soil";
    badge?: string;
    badgeTone?: "soon" | "live";
    demo: React.ReactNode;
  }> = [
    {
      title: tf("realtimeTitle"),
      bullets: [tf("realtimeBullet0"), tf("realtimeBullet1")],
      accentColor: "leaf",
      demo: <RealtimeDemo />,
    },
    {
      title: tf("growthTitle"),
      bullets: [tf("growthBullet0"), tf("growthBullet1")],
      accentColor: "soil",
      demo: <GrowthFilmstripDemo />,
    },
    {
      title: tf("privacyTitle"),
      bullets: [tf("privacyBullet0"), tf("privacyBullet1")],
      accentColor: "leaf",
      demo: <OfflineToggleDemo offlineOn={tf("offlineOn")} />,
    },
    {
      title: tf("taskbarTitle"),
      bullets: [tf("taskbarBullet0"), tf("taskbarBullet1")],
      accentColor: "soil",
      demo: <TaskbarDemo />,
    },
    {
      title: tf("lbTitle"),
      body: tf("lbBody"),
      accentColor: "soil",
      badge: tf("lbBadge"),
      badgeTone: "live",
      demo: <LeaderboardDemo />,
    },
  ];

  return (
    <>
      {/* Film grain overlay */}
      <div className="grain-overlay" aria-hidden>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      {/* Scroll-progress tree HUD (pure CSS scroll timeline) */}
      <ScrollTreeHud backToTop={th("backToTop")} />

      {/* ── 1. Hero ── */}
      <Hero />

      {/* ── 2. How it works — live demo pipeline ── */}
      <section
        id="how"
        className="scroll-mt-20 bg-surface-parchment py-20"
        aria-labelledby="how-heading"
      >
        <div className="mx-auto max-w-5xl px-6">
          <h2
            id="how-heading"
            className="reveal mb-12 text-center text-leaf-deep"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
            }}
          >
            {t("heading")}
          </h2>

          <HowSteps
            steps={[
              { num: "01", title: t("step01Title"), body: t("step01Body") },
              { num: "02", title: t("step02Title"), body: t("step02Body") },
              { num: "03", title: t("step03Title"), body: t("step03Body") },
            ]}
            privacyStrong={t("privacyStrong")}
            privacyBody={t("privacyBody")}
            uploadedZero={t("uploadedZero")}
            holdToGrow={t("holdToGrow")}
            bubbleAria={t("tryBubbleAria")}
          />
        </div>
      </section>

      {/* ── 3. Features ── */}
      <section
        id="features"
        className="scroll-mt-20 bg-surface-forest py-20"
        aria-labelledby="features-heading"
      >
        <div className="mx-auto max-w-5xl px-6">
          <h2
            id="features-heading"
            className="reveal mb-10 text-center text-leaf-light"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
            }}
          >
            {tf("heading")}
          </h2>
          <InViewGate className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{ "--reveal-delay": `${(i % 2) * 80}ms` } as React.CSSProperties}
              >
                <FeatureCard
                  title={f.title}
                  body={f.body}
                  bullets={f.bullets}
                  accentColor={f.accentColor}
                  badge={f.badge}
                  badgeTone={f.badgeTone}
                  demo={f.demo}
                  className={`reveal ${i % 2 === 0 ? "reveal-left" : "reveal-right"}`}
                />
              </div>
            ))}
          </InViewGate>
        </div>
      </section>

      {/* ── 4. Interactive Tree Showcase ── */}
      <TreeShowcase />

      {/* ── 5. Roadmap ── */}
      <RoadmapSection />

      {/* ── 6. Leaderboard teaser ── */}
      <section
        id="leaderboard-teaser"
        className="bg-surface-forest py-20"
        aria-labelledby="lb-heading"
      >
        <div className="mx-auto max-w-3xl px-6">
          <h2
            id="lb-heading"
            className="reveal mb-3 text-center text-leaf-light"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {tlt("heading")}
          </h2>
          <p
            className="reveal mb-10 text-center"
            style={
              {
                "--reveal-delay": "80ms",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                color: "var(--color-text-muted-dark)",
              } as React.CSSProperties
            }
          >
            {tlt("body")}
          </p>

          {/* Global stats chips */}
          <div
            className="reveal mb-8 flex flex-wrap justify-center gap-8"
            style={{ "--reveal-delay": "160ms" } as React.CSSProperties}
          >
            <div className="flex flex-col items-center gap-1">
              <span
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "var(--text-caption)",
                  color: "var(--color-text-muted-dark)",
                }}
              >
                {tlt("totalTrees")}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "var(--text-counter)",
                  color: "var(--color-leaf-light)",
                }}
              >
                {stats.totalTrees > 0 ? stats.totalTrees.toLocaleString(locale) : "—"}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  color: "var(--color-text-muted-dark)",
                }}
              >
                {tlt("treeUnit")}
              </span>
            </div>
            <div
              className="hidden h-16 w-px sm:block"
              style={{ background: "var(--color-leaf-deep)", opacity: 0.4 }}
              aria-hidden
            />
            <div className="flex flex-col items-center gap-1">
              <span
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "var(--text-caption)",
                  color: "var(--color-text-muted-dark)",
                }}
              >
                {tlt("totalTokens")}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "var(--text-counter)",
                  color: "var(--color-leaf-light)",
                }}
              >
                {stats.totalTokens > 0 ? stats.totalTokens.toLocaleString(locale) : "—"}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  color: "var(--color-text-muted-dark)",
                }}
              >
                {tlt("tokenUnit")}
              </span>
            </div>
          </div>

          {/* Mock leaderboard table — rows slide in, ranks 1/2 trade places on
              a slow loop, the champion wears a crown; frozen offscreen */}
          <InViewGate>
            <div
              className="reveal overflow-x-auto rounded-[2px]"
              style={
                { "--reveal-delay": "240ms", border: "var(--border-pixel)" } as React.CSSProperties
              }
            >
              <table className="w-full border-collapse">
                <colgroup>
                  <col style={{ width: "3.5rem" }} />
                  <col />
                  <col style={{ width: "auto" }} />
                </colgroup>
                <thead>
                  <tr
                    className="bg-leaf-deep"
                    style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                  >
                    <th scope="col" className="px-4 py-2 text-left text-text-cream">
                      {tlt("rankHeader")}
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-text-cream">
                      {tlt("usernameHeader")}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right text-text-cream">
                      {tlt("tokensHeader")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      rank: "01",
                      name: "devwanderer",
                      tokens: "2,840,192",
                      color: "var(--color-accent-gold)",
                      swapClass: "lbt-swap-first",
                      crowned: true,
                    },
                    {
                      rank: "02",
                      name: "nightcoder_x",
                      tokens: "1,902,448",
                      color: "#9ba8af",
                      swapClass: "lbt-swap-second",
                      crowned: false,
                    },
                    {
                      rank: "03",
                      name: "token_farmer",
                      tokens: "1,233,760",
                      color: "var(--color-soil-light)",
                      swapClass: "",
                      crowned: false,
                    },
                  ].map((row, i) => (
                    <tr
                      key={row.rank}
                      className={`lb-row reveal reveal-right border-t border-leaf-deep/20 ${row.swapClass}`}
                      style={
                        {
                          "--reveal-delay": `${280 + i * 120}ms`,
                          fontFamily: "var(--font-body)",
                          fontSize: "var(--text-body)",
                        } as React.CSSProperties
                      }
                    >
                      <td
                        className="whitespace-nowrap px-4 py-3"
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "var(--text-caption)",
                          color: row.color,
                        }}
                      >
                        {row.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="animate-tree-breathe inline-block shrink-0"
                            style={{ transformOrigin: "bottom center" }}
                            aria-hidden
                          >
                            <Image
                              src="/sprites/AppleTree_8.png"
                              alt=""
                              width={20}
                              height={20}
                              className="pixelated"
                              style={{ width: 20, height: 20, objectFit: "contain" }}
                            />
                          </span>
                          <span style={{ color: "var(--color-text-cream)" }}>{row.name}</span>
                          {row.crowned && (
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
                          {i === 1 && (
                            <span
                              className="lbt-arrow shrink-0"
                              style={{
                                fontFamily: "var(--font-pixel)",
                                fontSize: "0.55rem",
                                color: "var(--color-leaf-light)",
                                opacity: 0,
                                lineHeight: 1,
                              }}
                              aria-hidden
                            >
                              ▲
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "var(--text-caption)",
                          color: "var(--color-accent-gold)",
                        }}
                      >
                        {row.tokens}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InViewGate>

          {/* CTA */}
          <div className="reveal mt-8 flex justify-center">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-[2px] px-6 py-3 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                background: "var(--color-leaf-deep)",
                boxShadow: "var(--shadow-pixel)",
                color: "var(--color-text-cream)",
              }}
            >
              {tlt("viewAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Download CTA ── */}
      <section
        id="download"
        className="scroll-mt-20 bg-surface-parchment py-20"
        aria-labelledby="dl-heading"
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Image
            src="/sprites/AppleTree_8.png"
            alt=""
            width={80}
            height={87}
            className="pixelated mx-auto mb-6"
            aria-hidden
          />
          <h2
            id="dl-heading"
            className="reveal mb-4 text-leaf-deep"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
            }}
          >
            {tdl("heading")}
          </h2>
          <p
            className="reveal mx-auto mb-8 max-w-md"
            style={
              {
                "--reveal-delay": "80ms",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                color: "var(--color-text-muted-light)",
                lineHeight: 1.7,
              } as React.CSSProperties
            }
          >
            {tdl("body")}
          </p>

          {/* Terminal block */}
          <div
            className="reveal mx-auto mb-8 flex max-w-sm items-center gap-3 rounded-[2px] px-4 py-3"
            style={
              {
                "--reveal-delay": "160ms",
                background: "var(--color-surface-deepest)",
                border: "2px solid var(--color-leaf-deep)",
              } as React.CSSProperties
            }
          >
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                color: "var(--color-text-muted-dark)",
                userSelect: "none",
              }}
            >
              PS&gt;
            </span>
            <code
              className="flex-1 text-left"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-small)",
                color: "var(--color-leaf-light)",
              }}
            >
              .\setup.ps1
            </code>
            <span
              className="animate-cursor-blink"
              aria-hidden
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                color: "var(--color-leaf-light)",
              }}
            >
              ▌
            </span>
          </div>

          {/* OS buttons */}
          <div
            className="reveal flex flex-wrap justify-center gap-4"
            style={{ "--reveal-delay": "240ms" } as React.CSSProperties}
          >
            <Link
              href="/download"
              className="inline-flex items-center gap-2.5 rounded-[2px] px-6 py-3 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                background: "var(--color-leaf-deep)",
                boxShadow: "var(--shadow-pixel)",
                color: "var(--color-text-cream)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              Windows
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center gap-2.5 rounded-[2px] px-6 py-3 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                background: "var(--color-surface-card)",
                border: "var(--border-pixel)",
                boxShadow: "var(--shadow-pixel)",
                color: "var(--color-text-forest)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              macOS / Linux
            </Link>
          </div>

          <p
            className="mt-6"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-small)",
              color: "var(--color-text-muted-light)",
            }}
          >
            <a
              href="https://github.com/YimingRen111/Token-Forest"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-leaf-deep"
            >
              GitHub
            </a>{" "}
            {tdl("openSource")}
          </p>
        </div>
      </section>
    </>
  );
}
