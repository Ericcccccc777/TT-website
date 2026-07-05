"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useInView } from "@/hooks/use-in-view";
import { setTreeSkin, type TreeSkinId } from "@/hooks/use-tree-skin";
import { TreeScene } from "@/components/tree-scene";

// ── Real growth thresholds from garden.py ─────────────────────────────────────

/**
 * Cumulative token thresholds per stage (index 0-7 = {Prefix}_1..8), per tree
 * kind — mirrors garden.py STAGE_TOKENS. Later trees grow slower: max stage
 * costs apple 90M / cherry 270M / cactus 360M.
 */
const STAGE_TOKENS: Record<string, number[]> = {
  apple: [0, 500_000, 1_500_000, 4_000_000, 10_000_000, 22_000_000, 45_000_000, 90_000_000],
  cherry: [0, 1_500_000, 4_500_000, 12_000_000, 30_000_000, 66_000_000, 135_000_000, 270_000_000],
  cactus: [0, 2_000_000, 6_000_000, 16_000_000, 40_000_000, 88_000_000, 180_000_000, 360_000_000],
  christmas: [
    0, 2_500_000, 7_500_000, 20_000_000, 50_000_000, 110_000_000, 225_000_000, 450_000_000,
  ],
};

/** Roman numerals I..VIII for the stage indicator. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

/** How long each growth stage is shown before the carousel advances. */
const STAGE_ROTATE_MS = 3200;

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = Math.round(n / 1_000);
    return `${k}K`;
  }
  return n.toString();
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SkinDef {
  id: string;
  /** sprite filename prefix under /sprites/; null = placeholder */
  src: string | null;
  available: boolean;
}

const SKINS: SkinDef[] = [
  { id: "apple", src: "AppleTree", available: true },
  { id: "cherry", src: "CherryTree", available: true },
  { id: "cactus", src: "Cactus", available: true },
  { id: "christmas", src: "ChristmasTree", available: true },
];

// ── Stage indicator (Roman numerals — display only, the carousel drives it) ───

function StageDots({ active, ariaLabel }: { active: number; ariaLabel: string }) {
  return (
    <div
      className="mb-4 grid grid-cols-4 justify-items-center gap-2 sm:grid-cols-8"
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length: 8 }, (_, i) => {
        const isActive = active === i + 1;
        return (
          <span
            key={i}
            className="flex items-center justify-center transition-[background,border-color,box-shadow] duration-200"
            style={{
              width: 38,
              height: 44,
              flexShrink: 0,
              background: isActive ? "var(--color-leaf-deep)" : "var(--color-surface-card)",
              border: `2px solid ${isActive ? "var(--color-leaf-light)" : "var(--color-soil)"}`,
              borderRadius: "var(--radius-pixel)",
              boxShadow: isActive
                ? "2px 2px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)"
                : "1px 1px 0 rgba(0,0,0,0.2)",
            }}
            aria-hidden
          >
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.5rem",
                lineHeight: 1,
                color: isActive ? "var(--color-leaf-light)" : "var(--color-text-muted-light)",
                userSelect: "none",
              }}
            >
              {ROMAN[i]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ── Progress bar (real token thresholds) ──────────────────────────────────────

function ProgressBar({ stage, thresholds }: { stage: number; thresholds: number[] }) {
  const stageIndex = stage - 1; // 0..7
  const isMaxStage = stageIndex >= thresholds.length - 1;

  const curThreshold = thresholds[stageIndex] ?? 0;
  const nextThreshold = isMaxStage ? null : thresholds[stageIndex + 1];

  // Demo value: 35% progress into the current stage so the bar is visually interesting.
  const demoTokens = isMaxStage
    ? curThreshold
    : Math.round(curThreshold + 0.35 * (nextThreshold! - curThreshold));

  const pct = isMaxStage
    ? 100
    : ((demoTokens - curThreshold) / (nextThreshold! - curThreshold)) * 100;

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      {/* Bar track — h-4 (16 px) so it's clearly visible */}
      <div
        className="relative h-4 w-full overflow-hidden"
        style={{
          borderRadius: "var(--radius-pixel)",
          border: "2px solid var(--color-soil)",
          background: "var(--color-surface-card)",
        }}
      >
        <div
          className="h-full transition-all duration-500 ease-in-out"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(to right, var(--color-leaf-deep), var(--color-leaf-light))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
            borderRadius: "var(--radius-pixel)",
          }}
        />
        {/* Quarter-mark notches */}
        {([25, 50, 75] as const).map((mark) => (
          <span
            key={mark}
            className="pointer-events-none absolute top-0 h-full w-px opacity-20"
            style={{ left: `${mark}%`, background: "var(--color-surface-deepest)" }}
            aria-hidden
          />
        ))}
      </div>

      {/* Token counter row */}
      <div
        className="flex items-center justify-between"
        style={{
          fontFamily: "var(--font-brand)",
          fontSize: "0.55rem",
          lineHeight: 1,
        }}
      >
        <span style={{ color: "var(--color-accent-gold)" }}>
          {formatTokenCount(demoTokens)} tokens
        </span>
        {nextThreshold !== null ? (
          <span style={{ color: "var(--color-text-muted-light)" }}>
            → {formatTokenCount(nextThreshold)}
          </span>
        ) : (
          <span style={{ color: "var(--color-leaf-light)" }}>✦ MAX</span>
        )}
      </div>
    </div>
  );
}

// ── Skin strip ─────────────────────────────────────────────────────────────────

function SkinStrip({
  activeSkin,
  onSelect,
  ariaLabel,
  skinLabels,
  comingSoon,
}: {
  activeSkin: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  skinLabels: Record<string, string>;
  comingSoon: string;
}) {
  return (
    <div className="mt-3">
      <div className="flex flex-wrap justify-center gap-2 pt-1" role="group" aria-label={ariaLabel}>
        {SKINS.map((skin) => {
          const label = skinLabels[skin.id] ?? comingSoon;
          const isActive = activeSkin === skin.id;
          return (
            <div key={skin.id} style={{ scrollSnapAlign: "center", flexShrink: 0 }}>
              {skin.available ? (
                <button
                  onClick={() => onSelect(skin.id)}
                  aria-pressed={isActive}
                  aria-label={label}
                  className="relative flex h-12 w-12 items-end justify-center overflow-hidden transition-transform duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
                  style={{
                    borderRadius: "var(--radius-pixel)",
                    border: isActive
                      ? "2px solid var(--color-leaf-deep)"
                      : "1px solid var(--color-soil)",
                    boxShadow: isActive ? "var(--shadow-pixel-gold)" : undefined,
                    transform: isActive ? "scale(1.08)" : undefined,
                    background: "var(--color-surface-card)",
                    // breathing room so the tree's roots don't clip on the base edge
                    paddingBottom: 4,
                    cursor: "pointer",
                  }}
                >
                  {/* Stage-5 sprite (the app's tab-icon stage), oversized and
                      bottom-anchored so the transparent canvas margins crop
                      away and the tree fills the button. Inline box: immune
                      to the dev-time stylesheet-loading race. */}
                  <Image
                    src={`/sprites/${skin.src}_5.png`}
                    alt={label}
                    width={54}
                    height={54}
                    className="pixelated shrink-0"
                    style={{
                      width: 54,
                      height: 54,
                      // the sprite intentionally overflows the 44px button window;
                      // undo preflight's max-width:100% or it clamps width only
                      maxWidth: "none",
                      objectFit: "contain",
                      objectPosition: "50% 100%",
                    }}
                  />
                </button>
              ) : (
                <div
                  className="group relative flex h-12 w-12 cursor-not-allowed items-center justify-center"
                  style={{
                    borderRadius: "var(--radius-pixel)",
                    border: "1px dashed",
                    borderColor: "color-mix(in srgb, var(--color-soil) 50%, transparent)",
                    background: "var(--color-surface-card)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "var(--text-caption)",
                      color: "var(--color-text-muted-light)",
                    }}
                  >
                    +
                  </span>
                  <span
                    className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      fontFamily: "var(--font-pixel)",
                      fontSize: "0.55rem",
                      background: "var(--color-surface-panel)",
                      color: "var(--color-accent-gold)",
                      borderRadius: "var(--radius-pixel)",
                      border: "1px solid var(--color-accent-gold)",
                    }}
                  >
                    {comingSoon}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main TreeShowcase component ────────────────────────────────────────────────

export function TreeShowcase() {
  const t = useTranslations("TreeShowcase");
  const [stage, setStage] = useState(8);
  const [prevStage, setPrevStage] = useState<number | null>(null);
  const [activeSkin, setActiveSkin] = useState("apple");
  const [isShaking, setIsShaking] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const prefersReduced = usePrefersReducedMotion();
  // the auto-carousel only runs while the diorama is on screen
  const [frameRef, inView] = useInView<HTMLDivElement>({ threshold: 0.25 });

  const skinLabels: Record<string, string> = {
    apple: t("skinApple"),
    cherry: t("skinCherry"),
    cactus: t("skinCactus"),
    christmas: t("skinChristmas"),
  };

  // ── Stage / skin change with shake+fade animation ──────────────────────────
  const changeStage = useCallback(
    (next: number) => {
      if (next === stage) return;
      if (prefersReduced) {
        setStage(next);
        return;
      }
      setIsShaking(true);
      setPrevStage(stage);
      setTimeout(() => {
        setIsShaking(false);
        setIsFading(true);
        setStage(next);
        setTimeout(() => {
          setPrevStage(null);
          setIsFading(false);
        }, 350);
      }, 150);
    },
    [stage, prefersReduced],
  );

  // Auto-carousel: the tree grows 1→8 on a loop while visible. changeStage's
  // identity changes with `stage`, so this re-arms after every advance — each
  // stage holds for STAGE_ROTATE_MS. Reduced motion keeps the static stage-8.
  useEffect(() => {
    if (!inView || prefersReduced) return;
    const timer = setInterval(() => {
      changeStage((stage % 8) + 1);
    }, STAGE_ROTATE_MS);
    return () => clearInterval(timer);
  }, [inView, prefersReduced, stage, changeStage]);

  const changeSkin = useCallback(
    (id: string) => {
      if (id === activeSkin || !SKINS.find((s) => s.id === id)?.available) return;
      const applySkin = () => {
        setActiveSkin(id);
        setTreeSkin(id as TreeSkinId); // keep the scroll HUD's sprite in sync
      };
      if (prefersReduced) {
        applySkin();
        return;
      }
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setIsFading(true);
        applySkin();
        setTimeout(() => setIsFading(false), 200);
      }, 150);
    },
    [activeSkin, prefersReduced],
  );

  const activeSkinDef = SKINS.find((s) => s.id === activeSkin);
  const spriteBase = activeSkinDef?.src ?? "AppleTree";
  const treeSrc = `/sprites/${spriteBase}_${stage}.png`;
  const prevTreeSrc = prevStage ? `/sprites/${spriteBase}_${prevStage}.png` : null;

  return (
    <section
      className="scroll-mt-20 bg-surface-parchment py-20"
      id="showcase"
      aria-labelledby="showcase-heading"
    >
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h2
          id="showcase-heading"
          className="mb-8 text-center text-leaf-deep"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-neon)",
            lineHeight: 1.25,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          <span
            className="neon-title neon-light"
            style={{ "--neon-delay": "0.7s" } as React.CSSProperties}
          >
            {t("heading")}
          </span>
        </h2>

        {/* Stage indicator — follows the carousel */}
        <StageDots active={stage} ariaLabel={t("stageDotsAriaLabel")} />

        {/* Progress bar — real token thresholds for the active skin, h-4 thickness */}
        <ProgressBar stage={stage} thresholds={STAGE_TOKENS[activeSkin] ?? STAGE_TOKENS.apple} />

        {/* ── Cinematic diorama: widescreen themed backdrop, tree centred ── */}
        <div
          ref={frameRef}
          className="relative mx-auto w-full max-w-[640px] overflow-hidden pt-5"
          style={{
            border: "var(--border-pixel)",
            borderRadius: "var(--radius-pixel)",
            boxShadow: "var(--shadow-pixel)",
          }}
        >
          {/* Skin-themed scene behind tree + ground (crossfades on switch) */}
          <TreeScene skin={activeSkin} prefersReduced={prefersReduced} />

          {/* Tree column — canvas keeps its 320px geometry, centred in the frame */}
          <div className="relative mx-auto w-full max-w-[320px]">
            <div className="relative w-full overflow-visible" style={{ aspectRatio: "1 / 1" }}>
              {/* Tree sprite with shake + crossfade */}
              <div
                className={`animate-tree-breathe absolute inset-0 ${isShaking ? "animate-grow-shake" : ""}`}
                style={{ transformOrigin: "bottom center", zIndex: 2 }}
              >
                {prevTreeSrc && (
                  <Image
                    src={prevTreeSrc}
                    alt=""
                    fill
                    sizes="320px"
                    className="pixelated object-contain object-bottom"
                    style={{
                      opacity: isFading ? 0 : 1,
                      transition: prefersReduced ? "none" : "opacity 350ms ease",
                      zIndex: 1,
                    }}
                    aria-hidden
                  />
                )}
                <Image
                  src={treeSrc}
                  alt={t("treeAlt", { stage })}
                  fill
                  sizes="320px"
                  className="pixelated object-contain object-bottom"
                  style={{
                    opacity: prevTreeSrc ? (isFading ? 1 : 0) : 1,
                    transition: prevTreeSrc && !prefersReduced ? "opacity 350ms ease" : "none",
                    zIndex: 2,
                  }}
                  priority={stage === 8}
                />
              </div>
            </div>
          </div>

          {/* Ground strip — full frame width */}
          <div className="relative h-10 w-full" aria-hidden>
            <Image
              src="/sprites/Ground.png"
              alt=""
              fill
              sizes="640px"
              className="pixelated object-cover"
            />
          </div>
        </div>

        {/* Skin strip */}
        <SkinStrip
          activeSkin={activeSkin}
          onSelect={changeSkin}
          ariaLabel={t("skinStripAriaLabel")}
          skinLabels={skinLabels}
          comingSoon={t("comingSoon")}
        />

        <p
          className="mt-4 text-center"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted-light)",
          }}
        >
          {t("caption")}
        </p>
      </div>
    </section>
  );
}
