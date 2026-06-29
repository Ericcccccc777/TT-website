"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// ── Real growth thresholds from garden.py ─────────────────────────────────────

/** Cumulative token thresholds for each stage (index 0-7 = AppleTree_1..8). */
const STAGES = [
  { threshold: 0 }, // stage 1 — 幼枝   AppleTree_1
  { threshold: 500_000 }, // stage 2 — 树苗   AppleTree_2
  { threshold: 1_500_000 }, // stage 3 — 小树   AppleTree_3
  { threshold: 4_000_000 }, // stage 4 — 成树   AppleTree_4
  { threshold: 10_000_000 }, // stage 5 — 茂树   AppleTree_5
  { threshold: 22_000_000 }, // stage 6 — 大树   AppleTree_6
  { threshold: 45_000_000 }, // stage 7 — 繁茂   AppleTree_7
  { threshold: 90_000_000 }, // stage 8 — 硕果累累 AppleTree_8
] as const;

/** Roman numerals I..VIII for stage selector buttons. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

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

export interface DecorationDef {
  id: string;
  src: string;
  position: React.CSSProperties;
  /** How to fit the sprite inside the decoration area. Default: "contain". */
  objectFit?: "contain" | "cover";
  mirrorX?: boolean;
}

const SKINS: SkinDef[] = [
  { id: "apple", src: "AppleTree", available: true },
  { id: "cherry", src: null, available: false },
  { id: "pine", src: null, available: false },
  { id: "blossom", src: null, available: false },
];

/**
 * Fence and Basket only — Chest is handled separately as an
 * interactive animated sprite-sheet widget.
 *
 * Sizing rationale (tree canvas = 320 × 320 px):
 *   AppleTree native = 759 × 823 → SCALE_K ≈ 0.389
 *   Fence (193 × 67) at natural scale → ~75 × 26 px (too small).
 *   We scale ~2× to make decorations clearly visible.
 *   Fence: full-width band with cover fill.
 *   Basket: right-aligned at 64 × 45 px.
 */
const DECORATIONS: DecorationDef[] = [
  {
    id: "fence",
    src: "/sprites/Fence.png",
    // Full-width fence band at the tree base; objectFit: "cover" tiles horizontally.
    position: { bottom: 0, left: 0, width: "100%", height: 54 },
    objectFit: "cover",
  },
  {
    id: "basket",
    src: "/sprites/Basket.png",
    // Basket: right side, 64 × 45 px (≈2× natural scale for visibility).
    position: { bottom: 0, right: 12, width: 64, height: 45 },
    objectFit: "contain",
  },
];

// ── Chest sprite constants ─────────────────────────────────────────────────────
// Chest-sheet.png: 436 × 102, 4 frames each 109 × 102 (left = closed, right = open).

const CHEST_NATIVE_W = 109;
const CHEST_NATIVE_H = 102;
const CHEST_TOTAL_FRAMES = 4;
const CHEST_DISPLAY_H = 84; // display height in px (≈ 2× natural scale)
const CHEST_DISPLAY_W = Math.round((CHEST_NATIVE_W / CHEST_NATIVE_H) * CHEST_DISPLAY_H); // ≈ 90 px
const CHEST_SHEET_DISPLAY_W = CHEST_DISPLAY_W * CHEST_TOTAL_FRAMES;
const CHEST_FRAME_MS = 100; // ms per animation frame (matches Chest.json duration: 100)

type ChestState = "closed" | "opening" | "open" | "closing";

// ── Stage selector (Roman numerals) ───────────────────────────────────────────

function StageDots({
  active,
  onChange,
  ariaLabel,
  stageBtnLabel,
}: {
  active: number;
  onChange: (n: number) => void;
  ariaLabel: string;
  stageBtnLabel: (n: number) => string;
}) {
  return (
    <div
      className="mb-4 grid grid-cols-4 justify-items-center gap-2 sm:grid-cols-8"
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length: 8 }, (_, i) => {
        const isActive = active === i + 1;
        return (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            aria-label={stageBtnLabel(i + 1)}
            aria-pressed={isActive}
            className="flex items-center justify-center transition-[transform,box-shadow] duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light active:scale-95"
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
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span
              aria-hidden
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
          </button>
        );
      })}
    </div>
  );
}

// ── Progress bar (real token thresholds) ──────────────────────────────────────

function ProgressBar({ stage }: { stage: number }) {
  const stageIndex = stage - 1; // 0..7
  const isMaxStage = stageIndex >= STAGES.length - 1;

  const curThreshold = STAGES[stageIndex]?.threshold ?? 0;
  const nextThreshold = isMaxStage ? null : STAGES[stageIndex + 1].threshold;

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
                  className="relative flex h-12 w-12 items-center justify-center transition-transform duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
                  style={{
                    borderRadius: "var(--radius-pixel)",
                    border: isActive
                      ? "2px solid var(--color-leaf-deep)"
                      : "1px solid var(--color-soil)",
                    boxShadow: isActive ? "var(--shadow-pixel-gold)" : undefined,
                    transform: isActive ? "scale(1.08)" : undefined,
                    background: "var(--color-surface-card)",
                    cursor: "pointer",
                  }}
                >
                  <Image
                    src={`/sprites/${skin.src}_4.png`}
                    alt={label}
                    width={36}
                    height={36}
                    className="pixelated"
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

// ── Decoration toggle button (fence / basket) ─────────────────────────────────

function DecorationToggle({
  deco,
  label,
  active,
  onToggle,
}: {
  deco: DecorationDef;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      title={label}
      className="flex min-h-[44px] items-center gap-1.5 px-2.5 py-2 transition-[transform,box-shadow] duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
      style={{
        fontFamily: "var(--font-pixel)",
        fontSize: "var(--text-caption)",
        background: active ? "var(--color-leaf-deep)" : "var(--color-surface-card)",
        color: active ? "var(--color-text-cream)" : "var(--color-text-muted-light)",
        boxShadow: active ? "none" : "var(--shadow-pixel)",
        transform: active ? "translate(2px, 2px)" : undefined,
        border: "1px solid var(--color-soil)",
        borderRadius: 0,
        cursor: "pointer",
      }}
    >
      <Image
        src={deco.src}
        alt=""
        width={16}
        height={16}
        className="pixelated shrink-0"
        aria-hidden
      />
      {label}
    </button>
  );
}

// ── Chest toggle button (in decoration group) ─────────────────────────────────
// Shows frame 0 (closed chest) as the icon preview.

function ChestToggleButton({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      title={label}
      className="flex min-h-[44px] items-center gap-1.5 px-2.5 py-2 transition-[transform,box-shadow] duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
      style={{
        fontFamily: "var(--font-pixel)",
        fontSize: "var(--text-caption)",
        background: active ? "var(--color-leaf-deep)" : "var(--color-surface-card)",
        color: active ? "var(--color-text-cream)" : "var(--color-text-muted-light)",
        boxShadow: active ? "none" : "var(--shadow-pixel)",
        transform: active ? "translate(2px, 2px)" : undefined,
        border: "1px solid var(--color-soil)",
        borderRadius: 0,
        cursor: "pointer",
      }}
    >
      {/* Chest closed frame (frame 0) from sprite sheet via background-image */}
      <div
        className="shrink-0"
        style={{
          width: 16,
          height: 16,
          backgroundImage: "url('/sprites/Chest-sheet.png')",
          backgroundSize: `${16 * CHEST_TOTAL_FRAMES}px 16px`,
          backgroundPosition: "0 0",
          imageRendering: "pixelated",
          flexShrink: 0,
        }}
        aria-hidden
      />
      {label}
    </button>
  );
}

// ── Animated Chest widget ─────────────────────────────────────────────────────

function ChestWidget({
  frame,
  chestState,
  onToggle,
  teaserText,
  openLabel,
  closeLabel,
  prefersReduced,
}: {
  frame: number;
  chestState: ChestState;
  onToggle: () => void;
  teaserText: string;
  openLabel: string;
  closeLabel: string;
  prefersReduced: boolean;
}) {
  const bgX = frame * CHEST_DISPLAY_W;
  const isOpen = chestState === "open";

  return (
    <div
      className="absolute flex flex-col items-start"
      style={{ bottom: 0, left: 12, zIndex: 6 }}
      aria-hidden={false}
    >
      {/* Speech bubble teaser — only visible when fully open */}
      {isOpen && (
        <div
          className="relative mb-1 whitespace-nowrap px-2 py-1"
          style={{
            background: "var(--color-surface-panel)",
            border: "2px solid var(--color-accent-gold)",
            borderRadius: "var(--radius-pixel)",
            fontFamily: "var(--font-pixel)",
            fontSize: "0.5rem",
            color: "var(--color-accent-gold)",
            boxShadow: "var(--shadow-pixel-gold)",
            animation: prefersReduced
              ? "none"
              : "chest-bubble-in 200ms cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {teaserText}
          {/* Arrow pointing down toward chest */}
          <span
            className="absolute"
            style={{
              bottom: -7,
              left: 10,
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "7px solid var(--color-accent-gold)",
            }}
            aria-hidden
          />
          {/* Arrow fill (inner colour) */}
          <span
            className="absolute"
            style={{
              bottom: -4,
              left: 12,
              width: 0,
              height: 0,
              borderLeft: "2px solid transparent",
              borderRight: "2px solid transparent",
              borderTop: "4px solid var(--color-surface-panel)",
            }}
            aria-hidden
          />
        </div>
      )}

      {/* Chest sprite button */}
      <button
        onClick={onToggle}
        aria-label={isOpen ? closeLabel : openLabel}
        className="transition-[filter] duration-100 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light active:scale-95"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "block",
          animation: !prefersReduced && chestState === "closed" ? undefined : undefined,
        }}
      >
        <div
          style={{
            width: CHEST_DISPLAY_W,
            height: CHEST_DISPLAY_H,
            backgroundImage: "url('/sprites/Chest-sheet.png')",
            backgroundSize: `${CHEST_SHEET_DISPLAY_W}px ${CHEST_DISPLAY_H}px`,
            backgroundPosition: `-${bgX}px 0`,
            imageRendering: "pixelated",
          }}
        />
      </button>
    </div>
  );
}

// ── Main TreeShowcase component ────────────────────────────────────────────────

export function TreeShowcase() {
  const t = useTranslations("TreeShowcase");
  const [stage, setStage] = useState(8);
  const [prevStage, setPrevStage] = useState<number | null>(null);
  const [activeSkin, setActiveSkin] = useState("apple");
  // fence and basket via equipped Set; chest controlled separately
  const [equipped, setEquipped] = useState<Set<string>>(new Set(["fence"]));
  const [chestVisible, setChestVisible] = useState(false);
  const [chestFrame, setChestFrame] = useState(0);
  const [chestState, setChestState] = useState<ChestState>("closed");
  const [isShaking, setIsShaking] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const prefersReduced = usePrefersReducedMotion();
  const chestAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const skinLabels: Record<string, string> = {
    apple: t("skinApple"),
  };

  const decoLabels: Record<string, string> = {
    fence: t("decoFence"),
    basket: t("decoBasket"),
    chest: t("decoChest"),
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

  const changeSkin = useCallback(
    (id: string) => {
      if (id === activeSkin || !SKINS.find((s) => s.id === id)?.available) return;
      if (prefersReduced) {
        setActiveSkin(id);
        return;
      }
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setIsFading(true);
        setActiveSkin(id);
        setTimeout(() => setIsFading(false), 200);
      }, 150);
    },
    [activeSkin, prefersReduced],
  );

  const toggleDeco = useCallback((id: string) => {
    setEquipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Chest open/close with sprite-sheet animation ──────────────────────────
  const toggleChest = useCallback(() => {
    if (chestAnimRef.current) clearTimeout(chestAnimRef.current);

    if (chestState === "closed" || chestState === "closing") {
      setChestState("opening");
      if (prefersReduced) {
        setChestFrame(CHEST_TOTAL_FRAMES - 1);
        setChestState("open");
        return;
      }
      let frame = 0;
      const advance = () => {
        frame++;
        if (frame >= CHEST_TOTAL_FRAMES - 1) {
          setChestFrame(CHEST_TOTAL_FRAMES - 1);
          setChestState("open");
        } else {
          setChestFrame(frame);
          chestAnimRef.current = setTimeout(advance, CHEST_FRAME_MS);
        }
      };
      chestAnimRef.current = setTimeout(advance, CHEST_FRAME_MS);
    } else {
      // open or opening → close
      setChestState("closing");
      if (prefersReduced) {
        setChestFrame(0);
        setChestState("closed");
        return;
      }
      let frame = CHEST_TOTAL_FRAMES - 1;
      const advance = () => {
        frame--;
        if (frame <= 0) {
          setChestFrame(0);
          setChestState("closed");
        } else {
          setChestFrame(frame);
          chestAnimRef.current = setTimeout(advance, CHEST_FRAME_MS);
        }
      };
      chestAnimRef.current = setTimeout(advance, CHEST_FRAME_MS);
    }
  }, [chestState, prefersReduced]);

  // Reset chest animation when hidden
  useEffect(() => {
    if (!chestVisible) {
      if (chestAnimRef.current) clearTimeout(chestAnimRef.current);
      setChestFrame(0);
      setChestState("closed");
    }
  }, [chestVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chestAnimRef.current) clearTimeout(chestAnimRef.current);
    };
  }, []);

  const activeSkinDef = SKINS.find((s) => s.id === activeSkin);
  const spriteBase = activeSkinDef?.src ?? "AppleTree";
  const treeSrc = `/sprites/${spriteBase}_${stage}.png`;
  const prevTreeSrc = prevStage ? `/sprites/${spriteBase}_${prevStage}.png` : null;

  return (
    <section
      className="bg-surface-parchment py-20"
      id="showcase"
      aria-labelledby="showcase-heading"
    >
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h2
          id="showcase-heading"
          className="mb-8 text-center text-leaf-deep"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-display)",
            lineHeight: 1.25,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {t("heading")}
        </h2>

        {/* Stage selector — Roman numerals, ≥44px tap targets */}
        <StageDots
          active={stage}
          onChange={changeStage}
          ariaLabel={t("stageDotsAriaLabel")}
          stageBtnLabel={(n) => t("stageBtn", { n })}
        />

        {/* Progress bar — real token thresholds, h-4 thickness */}
        <ProgressBar stage={stage} />

        {/* ── Tree + decorations canvas ── */}
        <div className="relative mx-auto w-full max-w-[320px]">
          <div className="relative w-full overflow-visible" style={{ aspectRatio: "1 / 1" }}>
            {/* Tree sprite with shake + crossfade */}
            <div
              className={`animate-tree-breathe absolute inset-0 ${isShaking ? "animate-grow-shake" : ""}`}
              style={{ transformOrigin: "bottom center" }}
            >
              {prevTreeSrc && (
                <Image
                  src={prevTreeSrc}
                  alt=""
                  fill
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
                className="pixelated object-contain object-bottom"
                style={{
                  opacity: prevTreeSrc ? (isFading ? 1 : 0) : 1,
                  transition: prevTreeSrc && !prefersReduced ? "opacity 350ms ease" : "none",
                  zIndex: 2,
                }}
                priority={stage === 8}
              />
            </div>

            {/* Fence and Basket decorations */}
            {DECORATIONS.map((deco) => {
              const on = equipped.has(deco.id);
              return (
                <div
                  key={deco.id}
                  className="pointer-events-none absolute"
                  style={{
                    ...deco.position,
                    zIndex: 5,
                    animation: on
                      ? prefersReduced
                        ? undefined
                        : "decoration-enter 350ms cubic-bezier(0.34,1.56,0.64,1) forwards"
                      : prefersReduced
                        ? undefined
                        : "decoration-exit 180ms ease forwards",
                    opacity: on ? 1 : 0,
                  }}
                  aria-hidden
                >
                  {on && (
                    <Image
                      src={deco.src}
                      alt=""
                      fill
                      className="pixelated"
                      style={{ objectFit: deco.objectFit ?? "contain" }}
                    />
                  )}
                </div>
              );
            })}

            {/* Animated Chest widget */}
            {chestVisible && (
              <ChestWidget
                frame={chestFrame}
                chestState={chestState}
                onToggle={toggleChest}
                teaserText={t("chestTeaserShop")}
                openLabel={t("openChest")}
                closeLabel={t("closeChest")}
                prefersReduced={prefersReduced}
              />
            )}
          </div>

          {/* Ground strip */}
          <div className="relative h-10 w-full" aria-hidden>
            <Image src="/sprites/Ground.png" alt="" fill className="pixelated object-cover" />
          </div>
        </div>

        {/* Decoration toggle group (fence, basket, chest) */}
        <div className="mt-4 flex justify-center">
          <div
            className="inline-flex divide-x overflow-hidden"
            style={{ border: "var(--border-pixel)" }}
            role="group"
            aria-label={t("decorationGroupAriaLabel")}
          >
            {DECORATIONS.map((deco) => (
              <DecorationToggle
                key={deco.id}
                deco={deco}
                label={decoLabels[deco.id] ?? deco.id}
                active={equipped.has(deco.id)}
                onToggle={() => toggleDeco(deco.id)}
              />
            ))}
            <ChestToggleButton
              label={decoLabels["chest"] ?? t("decoChest")}
              active={chestVisible}
              onToggle={() => setChestVisible((v) => !v)}
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
