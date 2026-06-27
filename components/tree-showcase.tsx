"use client";

import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

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
  mirrorX?: boolean;
}

const SKINS: SkinDef[] = [
  { id: "apple", src: "AppleTree", available: true },
  { id: "cherry", src: null, available: false },
  { id: "pine", src: null, available: false },
  { id: "blossom", src: null, available: false },
];

const DECORATIONS: DecorationDef[] = [
  {
    id: "fence",
    src: "/sprites/Fence.png",
    position: { bottom: 0, left: 0, width: "100%", height: 40 },
  },
  {
    id: "basket",
    src: "/sprites/Basket.png",
    position: { bottom: 0, right: 8, width: 40, height: 40 },
  },
  {
    id: "chest",
    src: "/sprites/Chest-sheet.png",
    position: { bottom: 0, left: 8, width: 40, height: 40 },
  },
];

// ── Stage dots ─────────────────────────────────────────────────────────────────

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
      className="mb-3 flex items-center justify-center gap-0.5 sm:gap-1.5"
      aria-label={ariaLabel}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          aria-label={stageBtnLabel(i + 1)}
          aria-pressed={active === i + 1}
          className="flex h-10 w-8 items-center justify-center transition-transform duration-100 hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light sm:h-2 sm:w-2"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span
            className="block h-2 w-2"
            style={{
              borderRadius: 0,
              background: active === i + 1 ? "var(--color-leaf-deep)" : "var(--color-surface-card)",
              border: active === i + 1 ? "none" : "1px solid var(--color-soil)",
            }}
          />
        </button>
      ))}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────

const STAGE_MAX = 5000;

function ProgressBar({ stage }: { stage: number }) {
  const tokens = Math.round((stage / 8) * STAGE_MAX);
  const pct = (stage / 8) * 100;
  return (
    <div className="mb-3 flex flex-col gap-1">
      <div
        className="relative h-2 w-full overflow-hidden"
        style={{
          borderRadius: "var(--radius-pixel)",
          border: "1px solid var(--color-soil)",
          background: "var(--color-surface-card)",
        }}
      >
        <div
          className="h-full transition-all duration-350 ease-in-out"
          style={{
            width: `${pct}%`,
            background: "var(--color-leaf-deep)",
            boxShadow: "inset 0 1px 0 var(--color-leaf-light)",
            borderRadius: "var(--radius-pixel)",
          }}
        />
      </div>
      <div
        className="text-right"
        style={{
          fontFamily: "var(--font-brand)",
          fontSize: "0.6rem",
          color: "var(--color-accent-gold)",
          lineHeight: 1,
        }}
      >
        {tokens.toLocaleString()} / {STAGE_MAX.toLocaleString()} tokens
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
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollSnapType: "x mandatory" }}
        role="group"
        aria-label={ariaLabel}
      >
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

// ── Decoration toggle buttons ─────────────────────────────────────────────────

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
      className="flex items-center gap-1.5 px-2.5 py-1.5 transition-[transform,box-shadow] duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
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

// ── Main component ─────────────────────────────────────────────────────────────

export function TreeShowcase() {
  const t = useTranslations("TreeShowcase");
  const [stage, setStage] = useState(8);
  const [prevStage, setPrevStage] = useState<number | null>(null);
  const [activeSkin, setActiveSkin] = useState("apple");
  const [equipped, setEquipped] = useState<Set<string>>(new Set(["fence"]));
  const [isShaking, setIsShaking] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const prefersReduced = usePrefersReducedMotion();
  const treeWrapperRef = useRef<HTMLDivElement>(null);

  const skinLabels: Record<string, string> = {
    apple: t("skinApple"),
  };

  const decoLabels: Record<string, string> = {
    fence: t("decoFence"),
    basket: t("decoBasket"),
    chest: t("decoChest"),
  };

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

  const activeSkinDef = SKINS.find((s) => s.id === activeSkin);
  const spriteBase = activeSkinDef?.src ?? "AppleTree";
  const treeSrc = `/sprites/${spriteBase}_${stage}.png`;
  const prevTreeSrc = prevStage ? `/sprites/${spriteBase}_${prevStage}.png` : null;

  return (
    <section
      className="bg-surface-parchment py-16"
      id="showcase"
      aria-labelledby="showcase-heading"
    >
      <div className="mx-auto max-w-xl px-4">
        <h2
          id="showcase-heading"
          className="mb-8 text-center text-leaf-deep"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-display)",
            lineHeight: 1.25,
          }}
        >
          {t("heading")}
        </h2>

        <StageDots
          active={stage}
          onChange={changeStage}
          ariaLabel={t("stageDotsAriaLabel")}
          stageBtnLabel={(n) => t("stageBtn", { n })}
        />
        <ProgressBar stage={stage} />

        <div className="relative mx-auto w-full max-w-[320px]">
          <div className="relative w-full overflow-visible" style={{ aspectRatio: "1 / 1" }}>
            <div
              ref={treeWrapperRef}
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
                  {on && <Image src={deco.src} alt="" fill className="pixelated object-contain" />}
                </div>
              );
            })}
          </div>

          <div className="relative h-10 w-full" aria-hidden>
            <Image src="/sprites/Ground.png" alt="" fill className="pixelated object-cover" />
          </div>
        </div>

        {/* Decoration toggles */}
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
