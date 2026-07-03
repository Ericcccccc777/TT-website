"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
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
};

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

/**
 * Decoration placement mirrors the desktop app (sprites.py TREE_DEFS +
 * app.py DECO_ANCHOR_F / _deco_x / _deco_y):
 *   - All decoration sprites are authored at the apple-tree canvas scale
 *     (823 px tall), so each renders at nativeSize / 823 of the canvas side.
 *   - `anchor` = horizontal centre as a fraction of the soil strip
 *     (Ground.png, 531 px wide, centred under the tree).
 *   - `y` undefined → base sits on the ground line (canvas bottom, like the
 *     tree). A number → hanging: vertical centre at y × tree height.
 *   - `layer: "behind"` paints behind the tree (e.g. the torii gate).
 */
export interface DecorationDef {
  id: string;
  src: string;
  /** native sprite px (sheet decorations: one frame's px) */
  w: number;
  h: number;
  /** horizontal anchor along the soil strip: left 0.26 / center 0.5 / right 0.8 */
  anchor: number;
  /** hanging height as a fraction of tree height (undefined = on the ground) */
  y?: number;
  layer: "front" | "behind";
  /** extra per-decoration scale on top of the global factor (wind chimes 0.42) */
  scale?: number;
  /** sprite-sheet frame count — rendered cropped to frame 0 */
  sheetFrames?: number;
}

const SKINS: SkinDef[] = [
  { id: "apple", src: "AppleTree", available: true },
  { id: "cherry", src: "CherryTree", available: true },
  { id: "cactus", src: "Cactus", available: true },
  { id: "blossom", src: null, available: false },
];

// ── Desktop-app geometry basis (sprites.py / app.py) ──────────────────────────

/** Apple-tree canvas height (px) — the app's global decoration scale basis. */
const APPLE_NATIVE_H = 823;
/** Ground.png native width / apple height — the soil strip's share of the canvas. */
const SOIL_FRAC = 531 / APPLE_NATIVE_H;

/**
 * Per-skin decorations, straight from sprites.py TREE_DEFS (store price order).
 * Chest is handled separately as an interactive animated sprite-sheet widget.
 */
const DECORATIONS: Record<string, DecorationDef[]> = {
  apple: [
    { id: "fence", src: "/sprites/Fence.png", w: 193, h: 67, anchor: 0.5, layer: "front" },
    { id: "basket", src: "/sprites/Basket.png", w: 86, h: 60, anchor: 0.8, layer: "front" },
    {
      id: "swing",
      src: "/sprites/Swing.png",
      w: 90,
      h: 200,
      anchor: 0.72,
      y: 0.24,
      layer: "front",
    },
  ],
  cherry: [
    {
      id: "bambooFence",
      src: "/sprites/BambooFence.png",
      w: 193,
      h: 65,
      anchor: 0.5,
      layer: "front",
    },
    {
      id: "stoneLamp",
      src: "/sprites/StoneLamp_1.png",
      w: 100,
      h: 184,
      anchor: 0.8,
      layer: "front",
    },
    {
      id: "windChimes",
      src: "/sprites/WindChimes.png",
      w: 337,
      h: 431,
      anchor: 0.26,
      y: 0.5,
      layer: "front",
      scale: 0.42,
      sheetFrames: 7,
    },
    { id: "torii", src: "/sprites/Torii.png", w: 780, h: 674, anchor: 0.5, layer: "behind" },
  ],
  cactus: [
    {
      id: "brokenFence",
      src: "/sprites/BrokenFence.png",
      w: 193,
      h: 63,
      anchor: 0.5,
      layer: "front",
    },
  ],
};

/** Decoration equipped by default when a skin is selected (its fence). */
const DEFAULT_DECO: Record<string, string> = {
  apple: "fence",
  cherry: "bambooFence",
  cactus: "brokenFence",
};

/** CSS placement for a decoration inside the square tree canvas (all in %). */
function decoStyle(d: DecorationDef): React.CSSProperties {
  const k = ((d.scale ?? 1) / APPLE_NATIVE_H) * 100;
  const w = d.w * k;
  const h = d.h * k;
  const centerX = 50 + (d.anchor - 0.5) * SOIL_FRAC * 100;
  return {
    left: `${centerX - w / 2}%`,
    bottom: d.y === undefined ? 0 : `${d.y * 100 - h / 2}%`,
    width: `${w}%`,
    height: `${h}%`,
  };
}

// ── Chest sprite constants ─────────────────────────────────────────────────────
// Chest-sheet.png: 436 × 102, 4 frames each 109 × 102 (left = closed, right = open).
// Placement mirrors the desktop app: bottom-left on the soil strip
// (soil left edge + CHEST_MARGIN), same global scale as every decoration.

const CHEST_NATIVE_W = 109;
const CHEST_NATIVE_H = 102;
const CHEST_TOTAL_FRAMES = 4;
const CHEST_FRAME_MS = 100; // ms per animation frame (matches Chest.json duration: 100)
/** width as % of the tree canvas side (109 / 823, like every decoration) */
const CHEST_W_PCT = (CHEST_NATIVE_W / APPLE_NATIVE_H) * 100;
/** left offset % — soil strip left edge + the app's CHEST_MARGIN (12 px at 300 px tree height) */
const CHEST_LEFT_PCT = 50 - (SOIL_FRAC * 100) / 2 + (12 / 300) * 100;

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
        background: active
          ? "color-mix(in srgb, var(--color-leaf-light) 34%, var(--color-surface-card))"
          : "var(--color-surface-card)",
        color: active ? "var(--color-leaf-deep)" : "var(--color-text-muted-light)",
        // selected = pressed-in pixel key: soft green fill + inset, stays put (no shift)
        boxShadow: active ? "inset 2px 2px 0 rgba(58, 125, 68, 0.3)" : "var(--shadow-pixel)",
        border: "1px solid var(--color-soil)",
        borderRadius: 0,
        cursor: "pointer",
      }}
    >
      {deco.sheetFrames ? (
        // Sheet decoration: crop to frame 0 for the icon (like the chest button)
        <div
          className="shrink-0"
          style={{
            width: 16,
            height: 16,
            backgroundImage: `url('${deco.src}')`,
            backgroundSize: `${16 * deco.sheetFrames}px 16px`,
            backgroundPosition: "0 0",
            imageRendering: "pixelated",
          }}
          aria-hidden
        />
      ) : (
        <Image
          src={deco.src}
          alt=""
          width={16}
          height={16}
          className="pixelated shrink-0"
          style={{ width: 16, height: 16, objectFit: "contain" }}
          aria-hidden
        />
      )}
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
        background: active
          ? "color-mix(in srgb, var(--color-leaf-light) 34%, var(--color-surface-card))"
          : "var(--color-surface-card)",
        color: active ? "var(--color-leaf-deep)" : "var(--color-text-muted-light)",
        // selected = pressed-in pixel key: soft green fill + inset, stays put (no shift)
        boxShadow: active ? "inset 2px 2px 0 rgba(58, 125, 68, 0.3)" : "var(--shadow-pixel)",
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
  const isOpen = chestState === "open";

  return (
    <div
      className="absolute flex flex-col items-start"
      style={{ bottom: 0, left: `${CHEST_LEFT_PCT}%`, width: `${CHEST_W_PCT}%`, zIndex: 6 }}
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
          width: "100%",
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: `${CHEST_NATIVE_W} / ${CHEST_NATIVE_H}`,
            backgroundImage: "url('/sprites/Chest-sheet.png')",
            backgroundSize: `${CHEST_TOTAL_FRAMES * 100}% 100%`,
            // frame n of N: background-position-x = n / (N − 1) — %-based so the
            // sheet scales with the responsive canvas
            backgroundPosition: `${(frame / (CHEST_TOTAL_FRAMES - 1)) * 100}% 0`,
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
    cherry: t("skinCherry"),
    cactus: t("skinCactus"),
  };

  const decoLabels: Record<string, string> = {
    fence: t("decoFence"),
    basket: t("decoBasket"),
    swing: t("decoSwing"),
    bambooFence: t("decoBambooFence"),
    stoneLamp: t("decoStoneLamp"),
    windChimes: t("decoWindChimes"),
    torii: t("decoTorii"),
    brokenFence: t("decoBrokenFence"),
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
      // Each skin owns its decoration set (like the app) — equip its fence.
      const applySkin = () => {
        setActiveSkin(id);
        setEquipped(new Set([DEFAULT_DECO[id]]));
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
  const activeDecos = DECORATIONS[activeSkin] ?? [];

  // One decoration layer ("behind" paints under the tree, "front" above it),
  // placed/sized per the desktop app via decoStyle().
  const renderDecoLayer = (layer: "front" | "behind") =>
    activeDecos
      .filter((d) => d.layer === layer)
      .map((deco) => {
        const on = equipped.has(deco.id);
        return (
          <div
            key={deco.id}
            className="pointer-events-none absolute"
            style={{
              ...decoStyle(deco),
              zIndex: layer === "behind" ? 1 : 5,
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
            {on &&
              (deco.sheetFrames ? (
                // Sprite-sheet decoration (wind chimes): crop to frame 0
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage: `url('${deco.src}')`,
                    backgroundSize: `${deco.sheetFrames * 100}% 100%`,
                    backgroundPosition: "0 0",
                    imageRendering: "pixelated",
                  }}
                />
              ) : (
                <Image
                  src={deco.src}
                  alt=""
                  fill
                  // rendered width in px at the canvas's 320 px max — for srcset selection
                  sizes={`${Math.round((320 * deco.w * (deco.scale ?? 1)) / APPLE_NATIVE_H)}px`}
                  className="pixelated object-contain"
                />
              ))}
          </div>
        );
      });

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

        {/* Progress bar — real token thresholds for the active skin, h-4 thickness */}
        <ProgressBar stage={stage} thresholds={STAGE_TOKENS[activeSkin] ?? STAGE_TOKENS.apple} />

        {/* ── Cinematic diorama: widescreen themed backdrop, tree centred ── */}
        <div
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
              {/* Behind-layer decorations (e.g. torii) — painted under the tree */}
              {renderDecoLayer("behind")}

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

              {/* Front-layer decorations */}
              {renderDecoLayer("front")}

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

        {/* Decoration toggle group (active skin's decorations + chest) */}
        <div className="mt-4 flex justify-center">
          <div
            className="inline-flex flex-wrap justify-center divide-x overflow-hidden"
            style={{ border: "var(--border-pixel)" }}
            role="group"
            aria-label={t("decorationGroupAriaLabel")}
          >
            {activeDecos.map((deco) => (
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
