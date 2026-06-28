import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/hero";
import { FeatureCard } from "@/components/feature-card";
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

  // ── How-it-works steps ────────────────────────────────────────────────────
  const HOW_STEPS = [
    {
      num: "01",
      title: t("step01Title"),
      body: t("step01Body"),
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="#D97757"
            opacity="0.2"
            stroke="#D97757"
            strokeWidth="2"
          />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#D97757"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
          >
            256
          </text>
        </svg>
      ),
    },
    {
      num: "02",
      title: t("step02Title"),
      body: t("step02Body"),
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="#10A37F"
            opacity="0.2"
            stroke="#10A37F"
            strokeWidth="2"
          />
          <path d="M10 16l4 4 8-8" stroke="#10A37F" strokeWidth="2.5" strokeLinecap="square" />
        </svg>
      ),
    },
    {
      num: "03",
      title: t("step03Title"),
      body: t("step03Body"),
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect x="14" y="20" width="4" height="8" fill="#7a5a3a" />
          <ellipse cx="16" cy="14" rx="9" ry="10" fill="#3a7d44" opacity="0.85" />
          <circle cx="12" cy="18" r="3" fill="#7bd88f" opacity="0.7" />
          <circle cx="20" cy="16" r="2.5" fill="#7bd88f" opacity="0.6" />
        </svg>
      ),
    },
  ] as const;

  // ── Feature grid data ─────────────────────────────────────────────────────
  const FEATURES: Array<{
    title: string;
    body?: string;
    bullets?: string[];
    accentColor: "leaf" | "soil";
    badge?: string;
  }> = [
    {
      title: tf("realtimeTitle"),
      bullets: [tf("realtimeBullet0"), tf("realtimeBullet1")],
      accentColor: "leaf",
    },
    {
      title: tf("growthTitle"),
      bullets: [tf("growthBullet0"), tf("growthBullet1")],
      accentColor: "soil",
    },
    {
      title: tf("privacyTitle"),
      bullets: [tf("privacyBullet0"), tf("privacyBullet1")],
      accentColor: "leaf",
    },
    {
      title: tf("taskbarTitle"),
      bullets: [tf("taskbarBullet0"), tf("taskbarBullet1")],
      accentColor: "soil",
    },
    {
      title: tf("fruitsTitle"),
      body: tf("fruitsBody"),
      accentColor: "leaf",
      badge: tf("fruitsBadge"),
    },
    {
      title: tf("shopTitle"),
      body: tf("shopBody"),
      accentColor: "soil",
      badge: tf("shopBadge"),
    },
    {
      title: tf("seasonsTitle"),
      body: tf("seasonsBody"),
      accentColor: "leaf",
      badge: tf("seasonsBadge"),
    },
    {
      title: tf("lbTitle"),
      body: tf("lbBody"),
      accentColor: "soil",
      badge: tf("lbBadge"),
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

      {/* ── 1. Hero ── */}
      <Hero />

      {/* ── 2. How it works ── */}
      <section id="how" className="bg-surface-parchment py-20" aria-labelledby="how-heading">
        <div className="mx-auto max-w-5xl px-6">
          <h2
            id="how-heading"
            className="mb-12 text-center text-leaf-deep"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
            }}
          >
            {t("heading")}
          </h2>

          <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
            {HOW_STEPS.map((step, i) => (
              <div
                key={step.num}
                className="flex flex-col items-center text-center sm:items-start sm:text-left"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: "var(--text-counter)",
                      color: "var(--color-accent-gold)",
                      lineHeight: 1,
                    }}
                  >
                    {step.num}
                  </span>
                  <span aria-hidden>{step.icon}</span>
                </div>
                <h3
                  className="mb-2 text-leaf-deep"
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "var(--text-h1)",
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-body)",
                    color: "var(--color-text-muted-light)",
                    lineHeight: 1.7,
                  }}
                >
                  {step.body}
                </p>
                {i < HOW_STEPS.length - 1 && (
                  <hr
                    className="mt-8 w-full sm:hidden"
                    style={{ borderColor: "var(--color-soil)", opacity: 0.4 }}
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>

          {/* Privacy note */}
          <div className="mx-auto mt-14 max-w-2xl rounded-[2px] border-2 border-leaf-deep/30 bg-surface-card px-6 py-4 text-center">
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-small)",
                color: "var(--color-text-muted-light)",
                lineHeight: 1.6,
              }}
            >
              🔒 <strong style={{ color: "var(--color-leaf-deep)" }}>{t("privacyStrong")}</strong>：
              {t("privacyBody")}
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Features ── */}
      <section id="features" className="bg-surface-forest py-20" aria-labelledby="features-heading">
        <div className="mx-auto max-w-5xl px-6">
          <h2
            id="features-heading"
            className="mb-10 text-center text-leaf-light"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
            }}
          >
            {tf("heading")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <FeatureCard
                key={f.title}
                title={f.title}
                body={f.body}
                bullets={f.bullets}
                accentColor={f.accentColor}
                badge={f.badge}
              />
            ))}
          </div>
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
            className="mb-3 text-center text-leaf-light"
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
            className="mb-10 text-center"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body)",
              color: "var(--color-text-muted-dark)",
            }}
          >
            {tlt("body")}
          </p>

          {/* Global stats chips */}
          <div className="mb-8 flex flex-wrap justify-center gap-8">
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
                {stats.totalTrees > 0 ? stats.totalTrees.toLocaleString() : "—"}
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
                {stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : "—"}
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

          {/* Mock leaderboard table */}
          <div className="overflow-hidden rounded-[2px]" style={{ border: "var(--border-pixel)" }}>
            <table className="w-full border-collapse">
              <colgroup>
                <col style={{ width: "2.5rem" }} />
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
                  },
                  { rank: "02", name: "nightcoder_x", tokens: "1,902,448", color: "#9ba8af" },
                  {
                    rank: "03",
                    name: "token_farmer",
                    tokens: "1,233,760",
                    color: "var(--color-soil-light)",
                  },
                ].map((row) => (
                  <tr
                    key={row.rank}
                    className="border-t border-leaf-deep/20"
                    style={{
                      background: "color-mix(in srgb, var(--color-surface-panel) 60%, transparent)",
                      backdropFilter: "blur(4px)",
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-body)",
                    }}
                  >
                    <td
                      className="px-4 py-3"
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
                        <Image
                          src="/sprites/AppleTree_8.png"
                          alt=""
                          width={20}
                          height={20}
                          className="pixelated shrink-0"
                          aria-hidden
                        />
                        <span style={{ color: "var(--color-text-cream)" }}>{row.name}</span>
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

                {/* Blurred YOUR TREE row */}
                <tr className="border-t border-leaf-deep/20">
                  <td
                    colSpan={3}
                    className="relative overflow-hidden p-0"
                    style={{
                      background: "color-mix(in srgb, var(--color-surface-panel) 60%, transparent)",
                    }}
                  >
                    <div
                      className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 px-4 py-3"
                      style={{
                        filter: "blur(4px)",
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-body)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "var(--text-caption)",
                          color: "var(--color-text-muted-dark)",
                        }}
                      >
                        ?
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-5 w-5 shrink-0"
                          style={{ background: "var(--color-surface-card)" }}
                        />
                        <span style={{ color: "var(--color-text-cream)" }}>YOUR TREE</span>
                      </div>
                      <span
                        className="text-right"
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "var(--text-caption)",
                          color: "var(--color-accent-gold)",
                        }}
                      >
                        ???
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="px-3 py-1"
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "var(--text-caption)",
                          color: "var(--color-accent-gold)",
                          background: "var(--color-surface-panel)",
                          border: "2px solid var(--color-accent-gold)",
                          borderRadius: "var(--radius-pixel)",
                        }}
                      >
                        {tlt("comingSoon")}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CTA */}
          <div className="mt-8 flex justify-center">
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
      <section id="download" className="bg-surface-parchment py-20" aria-labelledby="dl-heading">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Image
            src="/sprites/AppleTree_8.png"
            alt=""
            width={80}
            height={108}
            className="pixelated mx-auto mb-6"
            aria-hidden
          />
          <h2
            id="dl-heading"
            className="mb-4 text-leaf-deep"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-display)",
              lineHeight: 1.25,
            }}
          >
            {tdl("heading")}
          </h2>
          <p
            className="mx-auto mb-8 max-w-md"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body)",
              color: "var(--color-text-muted-light)",
              lineHeight: 1.7,
            }}
          >
            {tdl("body")}
          </p>

          {/* Terminal block */}
          <div
            className="mx-auto mb-8 flex max-w-sm items-center gap-3 rounded-[2px] px-4 py-3"
            style={{
              background: "var(--color-surface-deepest)",
              border: "2px solid var(--color-leaf-deep)",
            }}
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
          <div className="flex flex-wrap justify-center gap-4">
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
              github.com/YimingRen111/Token-Forest
            </a>{" "}
            {tdl("openSource")}
          </p>
        </div>
      </section>
    </>
  );
}
