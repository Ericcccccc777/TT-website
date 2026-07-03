"use client";

import Image from "next/image";
import React from "react";
import { useTranslations } from "next-intl";
import { useInView } from "@/hooks/use-in-view";
import { ShootingStars } from "@/components/shooting-stars";

// The full, dev-facing roadmap lives on GitHub; this section is the player-facing teaser.
const GITHUB_ROADMAP = "https://github.com/YimingRen111/Token-Forest/blob/main/docs/ROADMAP.md";

/**
 * §roadmap "树的未来" — a star chart of the future:
 * - three-layer parallax star field (named view-timeline --roadmap-tl) with
 *   desynced twinkles, a pixel crescent moon and fireflies near the horizon
 * - a shooting star streaks across every 6–16s (spawner island)
 * - each roadmap card is a small toy: apples drop into a basket, the shop
 *   chest opens frame-by-frame, day/night crossfades the card's own sky,
 *   and the mystery card's silhouetted tree flashes into colour
 * All ambience is aria-hidden/pointer-events-none and freezes offscreen via
 * .scene-paused; reduced motion gets a static, fully-visible chart.
 */

interface FutureItem {
  id: string;
  kind: "apple" | "chest" | "daynight" | "mystery";
  label: string;
  desc: string;
}

// ── Star field config: layer → parallax depth; per-star twinkle desync ─────────
// (left %, top %, size px, layer, twinkle duration s, delay s, glyph)
const STARS: Array<[number, number, number, "far" | "mid" | "near", number, number, string]> = [
  [4, 8, 7, "far", 5.2, 0.0, "✦"],
  [14, 30, 6, "far", 6.4, 2.1, "·"],
  [22, 12, 8, "far", 4.6, 1.2, "✦"],
  [33, 26, 6, "far", 7.0, 3.4, "·"],
  [45, 6, 7, "far", 5.8, 0.7, "✦"],
  [58, 22, 6, "far", 6.2, 2.8, "·"],
  [71, 10, 8, "far", 4.9, 1.7, "✦"],
  [90, 24, 6, "far", 6.8, 0.4, "·"],
  [9, 48, 9, "mid", 5.5, 1.0, "✦"],
  [28, 42, 8, "mid", 6.6, 3.0, "✦"],
  [52, 38, 9, "mid", 4.8, 2.2, "✦"],
  [68, 46, 8, "mid", 6.0, 0.9, "✦"],
  [86, 40, 9, "mid", 5.4, 3.8, "✦"],
  [18, 60, 11, "near", 5.0, 1.5, "✦"],
  [47, 66, 10, "near", 6.3, 0.2, "✦"],
  [79, 58, 11, "near", 5.7, 2.6, "✦"],
];

// (left %, bottom px, drift keyframe, drift duration s, blink delay s)
const FIREFLIES: Array<
  [number, number, "bubble-drift-right" | "bubble-drift-left", number, number]
> = [
  [12, 40, "bubble-drift-right", 6.5, 0.0],
  [46, 70, "bubble-drift-left", 8.0, 1.4],
  [82, 52, "bubble-drift-right", 7.2, 2.6],
];

// ── Pixel sprites ──────────────────────────────────────────────────────────────

function PixelMoon({ width = 30 }: { width?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#e8e4d8">
        <rect x="3" y="0" width="5" height="1" />
        <rect x="2" y="1" width="3" height="1" />
        <rect x="1" y="2" width="3" height="2" />
        <rect x="0" y="4" width="3" height="4" />
        <rect x="1" y="8" width="3" height="2" />
        <rect x="2" y="10" width="3" height="1" />
        <rect x="3" y="11" width="5" height="1" />
        <rect x="8" y="1" width="2" height="1" />
        <rect x="9" y="10" width="2" height="1" />
      </g>
      <g fill="#c9c3b2">
        <rect x="2" y="4" width="1" height="2" />
        <rect x="4" y="7" width="1" height="1" />
      </g>
    </svg>
  );
}

function PixelApple({ width = 20 }: { width?: number }) {
  return (
    <svg viewBox="0 0 10 10" width={width} shapeRendering="crispEdges" aria-hidden>
      <rect x="4" y="0" width="2" height="2" fill="#7a5a3a" />
      <rect x="6" y="1" width="2" height="1" fill="#3a7d44" />
      <g fill="#c75c5c">
        <rect x="2" y="2" width="6" height="1" />
        <rect x="1" y="3" width="8" height="4" />
        <rect x="2" y="7" width="6" height="1" />
        <rect x="3" y="8" width="4" height="1" />
      </g>
      <rect x="2" y="3" width="1" height="2" fill="#e08a8a" />
    </svg>
  );
}

function PixelSunMini({ width = 18 }: { width?: number }) {
  return (
    <svg viewBox="0 0 10 10" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#e8ba60">
        <rect x="3" y="2" width="4" height="6" />
        <rect x="2" y="3" width="6" height="4" />
      </g>
      <g fill="#c8943c">
        <rect x="4" y="0" width="2" height="1" />
        <rect x="4" y="9" width="2" height="1" />
        <rect x="0" y="4" width="1" height="2" />
        <rect x="9" y="4" width="1" height="2" />
      </g>
    </svg>
  );
}

function PixelMoonMini({ width = 18 }: { width?: number }) {
  return (
    <svg viewBox="0 0 10 10" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#cfe8d6">
        <rect x="3" y="0" width="4" height="1" />
        <rect x="2" y="1" width="2" height="1" />
        <rect x="1" y="2" width="2" height="2" />
        <rect x="0" y="4" width="2" height="2" />
        <rect x="1" y="6" width="2" height="2" />
        <rect x="2" y="8" width="2" height="1" />
        <rect x="3" y="9" width="4" height="1" />
      </g>
    </svg>
  );
}

// ── Per-card toys ──────────────────────────────────────────────────────────────

function AppleToy() {
  return (
    <>
      {/* basket waiting in the corner */}
      <span className="pointer-events-none absolute bottom-2 right-3" aria-hidden>
        <Image
          src="/sprites/Basket.png"
          alt=""
          width={26}
          height={18}
          className="pixelated"
          style={{ width: 26, height: 18, objectFit: "contain", objectPosition: "50% 100%" }}
        />
      </span>
      {/* three apples drop into it on hover */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`apple-drop pointer-events-none absolute opacity-0`}
          style={{
            right: 10 + i * 9,
            bottom: 14,
            animationDelay: `${i * 140}ms`,
          }}
          aria-hidden
        >
          <PixelApple width={12} />
        </span>
      ))}
    </>
  );
}

function ChestToy() {
  return (
    <>
      {/* rising sparkles + price tag on hover */}
      <span
        className="chest-sparkle pointer-events-none absolute right-8 top-3 opacity-0 text-leaf-light"
        style={{ fontSize: 9, animationDelay: "120ms" }}
        aria-hidden
      >
        ✦
      </span>
      <span
        className="chest-sparkle pointer-events-none absolute right-4 top-5 opacity-0 text-accent-gold"
        style={{ fontSize: 7, animationDelay: "280ms" }}
        aria-hidden
      >
        ✦
      </span>
      <span
        className="chest-tag pointer-events-none absolute right-3 top-2 px-1 opacity-0"
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "0.5rem",
          color: "var(--color-accent-gold)",
          border: "1px solid var(--color-accent-gold)",
          borderRadius: "var(--radius-pixel)",
          background: "var(--color-surface-deepest)",
          lineHeight: 1.4,
        }}
        aria-hidden
      >
        ???
      </span>
    </>
  );
}

function MysteryToy() {
  return (
    <span className="pointer-events-none absolute bottom-2 right-3 h-[34px] w-[34px]" aria-hidden>
      {/* silhouette (static filter on a non-animated node) */}
      <Image
        src="/sprites/CherryTree_8.png"
        alt=""
        width={34}
        height={34}
        className="pixelated absolute inset-0"
        style={{
          width: 34,
          height: 34,
          objectFit: "contain",
          objectPosition: "50% 100%",
          filter: "brightness(0)",
          opacity: 0.45,
        }}
      />
      {/* colour version flashes for 2 frames on hover */}
      <Image
        src="/sprites/CherryTree_8.png"
        alt=""
        width={34}
        height={34}
        className="pixelated mystery-color absolute inset-0 opacity-0"
        style={{ width: 34, height: 34, objectFit: "contain", objectPosition: "50% 100%" }}
      />
      <span
        className="absolute -left-4 bottom-1"
        style={{
          fontFamily: "var(--font-brand)",
          fontSize: "0.8rem",
          color: "var(--color-text-muted-dark)",
          lineHeight: 1,
        }}
      >
        ?
      </span>
    </span>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

export function RoadmapSection() {
  const t = useTranslations("Roadmap");
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.05 });

  const ITEMS: FutureItem[] = [
    { id: "f1", kind: "apple", label: t("f1Label"), desc: t("f1Desc") },
    { id: "f2", kind: "chest", label: t("f2Label"), desc: t("f2Desc") },
    { id: "f3", kind: "daynight", label: t("f3Label"), desc: t("f3Desc") },
    { id: "f4", kind: "mystery", label: t("f4Label"), desc: t("f4Desc") },
  ];

  return (
    <section
      ref={ref}
      id="roadmap"
      className="roadmap-sky-host relative scroll-mt-20 overflow-hidden bg-night-sky py-20"
      aria-labelledby="roadmap-heading"
    >
      {/* ── Ambient sky (behind content, frozen offscreen) ── */}
      <div
        className={`pointer-events-none absolute inset-0${inView ? "" : " scene-paused"}`}
        aria-hidden
      >
        {/* far / mid / near parallax star layers */}
        {(["far", "mid", "near"] as const).map((layer) => (
          <div key={layer} className={`absolute inset-0 parallax-${layer}`}>
            {STARS.filter(([, , , l]) => l === layer).map(
              ([left, top, size, , dur, delay, glyph], i) => (
                <span
                  key={i}
                  className="star-twinkle-el absolute text-leaf-light"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    fontSize: size,
                    lineHeight: 1,
                    animation: `star-twinkle ${dur}s ease-in-out ${delay}s infinite`,
                  }}
                >
                  {glyph}
                </span>
              ),
            )}
          </div>
        ))}

        {/* crescent moon rides the far layer's depth */}
        <div className="parallax-far absolute inset-0">
          <span
            className="absolute right-[8%] top-[7%]"
            style={{ animation: "scene-sun-pulse 7s ease-in-out infinite" }}
          >
            <PixelMoon />
          </span>
        </div>

        {/* fireflies near the horizon */}
        {FIREFLIES.map(([left, bottom, drift, dur, delay], i) => (
          <span
            key={i}
            className="absolute"
            style={{
              left: `${left}%`,
              bottom,
              animation: `${drift} ${dur}s ease-in-out ${delay}s infinite alternate`,
            }}
          >
            <span
              className="firefly-el block h-[3px] w-[3px]"
              style={{
                background: "var(--color-leaf-light)",
                boxShadow: "0 0 4px var(--color-leaf-light)",
                animation: `firefly-blink 3.4s ease-in-out ${delay + 0.6}s infinite`,
              }}
            />
          </span>
        ))}

        <ShootingStars active={inView} />
      </div>

      {/* ── Content ── */}
      <div className="relative z-[1] mx-auto max-w-4xl px-6">
        <h2
          id="roadmap-heading"
          className="reveal text-center text-leaf-light"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-display)",
            lineHeight: 1.25,
          }}
        >
          {t("heading")}
        </h2>
        <p
          className="reveal mx-auto mt-4 max-w-xl text-center"
          style={
            {
              "--reveal-delay": "80ms",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body)",
              color: "var(--color-text-muted-dark)",
              lineHeight: 1.7,
            } as React.CSSProperties
          }
        >
          {t("intro")}
        </p>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {ITEMS.map((item, i) => (
            <li
              key={item.id}
              className={`reveal group relative overflow-hidden rounded-[2px] p-5 ${
                item.kind === "daynight" ? "daynight-card" : ""
              }`}
              style={
                {
                  background: "var(--color-surface-panel)",
                  border: "var(--border-pixel)",
                  "--reveal-delay": `${(i % 2) * 80}ms`,
                } as React.CSSProperties
              }
            >
              {/* daylight overlay — the day/night card's own sky flips on hover */}
              {item.kind === "daynight" && (
                <span
                  className="day-overlay pointer-events-none absolute inset-0 opacity-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, var(--color-sky-day-top), var(--color-sky-day-mid) 55%, var(--color-sky-day-horizon))",
                    transition: "opacity 400ms ease",
                  }}
                  aria-hidden
                />
              )}

              <div className="relative z-[1]">
                <div className="mb-2 flex items-center gap-3">
                  {/* pixel icon per card */}
                  <span aria-hidden className="flex h-6 w-6 items-center justify-center">
                    {item.kind === "apple" && <PixelApple />}
                    {item.kind === "chest" && (
                      <span
                        className="chest-icon inline-block"
                        style={{
                          width: 24,
                          height: 22,
                          backgroundImage: "url('/sprites/Chest-sheet.png')",
                          backgroundSize: "400% 100%",
                          backgroundPosition: "0% 0",
                          imageRendering: "pixelated",
                        }}
                      />
                    )}
                    {item.kind === "daynight" && (
                      <span className="relative inline-block h-[18px] w-[18px]">
                        <span className="daynight-moon absolute inset-0">
                          <PixelMoonMini />
                        </span>
                        <span className="daynight-sun absolute inset-0 opacity-0">
                          <PixelSunMini />
                        </span>
                      </span>
                    )}
                    {item.kind === "mystery" && (
                      <span
                        style={{
                          fontFamily: "var(--font-brand)",
                          fontSize: "0.9rem",
                          color: "var(--color-accent-gold)",
                          lineHeight: 1,
                        }}
                      >
                        ✦
                      </span>
                    )}
                  </span>
                  <span
                    className="daynight-text"
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "var(--text-caption)",
                      color: "var(--color-text-cream)",
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="soon-badge ml-auto whitespace-nowrap px-1.5 py-0.5"
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.55rem",
                      color: "var(--color-accent-gold)",
                      border: "1px dashed var(--color-accent-gold)",
                      borderRadius: "var(--radius-pixel)",
                    }}
                  >
                    {t("soon")}
                  </span>
                </div>
                <p
                  className="daynight-text"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-small)",
                    color: "var(--color-text-muted-dark)",
                    lineHeight: 1.6,
                  }}
                >
                  {item.desc}
                </p>
              </div>

              {/* toys layered above the overlay, below nothing clickable */}
              {item.kind === "apple" && <AppleToy />}
              {item.kind === "chest" && <ChestToy />}
              {item.kind === "mystery" && <MysteryToy />}
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <a
            href={GITHUB_ROADMAP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block underline-offset-4 hover:underline"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-caption)",
              color: "var(--color-leaf-light)",
            }}
          >
            ▸ {t("fullRoadmap")}
            <span className="animate-cursor-blink ml-1" aria-hidden>
              ▌
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
