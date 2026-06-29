"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Bubble {
  id: number;
  /** Pre-formatted token amount, e.g. "13.7M" / "658.3k" */
  value: string;
  /** Bubble fill colour */
  color: string;
  /** 0–100, percentage left within the container */
  x: number;
  /** 0–100, percentage from the bottom where the bubble appears */
  startBottom: number;
  /** small per-bubble start delay (seconds) so they don't pop in unison */
  delay: number;
  /** collected → plays pop animation before removal */
  state: "floating" | "collecting" | "gone";
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  color: string;
}

// ── Media query hook (SSR-safe via useSyncExternalStore) ──────────────────────

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerSnapshot = () => false;

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Bubble pool ─────────────────────────────────────────────────────────────────
// 24 distinct (amount, colour) combinations, picked at random. Amounts use
// k / M abbreviations (e.g. 13.7M, 658.3k); colours span a varied palette.

const BUBBLE_COMBOS: { v: string; c: string }[] = [
  { v: "13.7M", c: "#d97757" },
  { v: "658.3k", c: "#10a37f" },
  { v: "2.4M", c: "#c8943c" },
  { v: "88.1k", c: "#5a9fd4" },
  { v: "320.7k", c: "#8b6fc8" },
  { v: "1.2M", c: "#3a7d44" },
  { v: "47.9k", c: "#d0688f" },
  { v: "5.6M", c: "#2bb3a3" },
  { v: "196.4k", c: "#e08a3c" },
  { v: "9.1M", c: "#6d83c4" },
  { v: "412.8k", c: "#c75c5c" },
  { v: "27.3M", c: "#4aa882" },
  { v: "73.5k", c: "#b07cc8" },
  { v: "3.8M", c: "#cf7d4a" },
  { v: "540.2k", c: "#3fa0a8" },
  { v: "16.9M", c: "#d4733f" },
  { v: "124.6k", c: "#5fa052" },
  { v: "61.2M", c: "#9b6fb0" },
  { v: "8.4M", c: "#c95f7a" },
  { v: "235.1k", c: "#4f93cc" },
  { v: "1.9M", c: "#b5654d" },
  { v: "706.8k", c: "#7a9e3f" },
  { v: "34.2M", c: "#3a8f7a" },
  { v: "92.7k", c: "#cc6b9e" },
];

const MAX_VISIBLE = 3; // at most three bubbles on screen at once
// Two bubbles only overlap when they are close on BOTH axes, so a freshly
// rolled position is rejected only if some existing bubble is within MIN_DX%
// horizontally AND MIN_DY% vertically.
const MIN_DX = 28;
const MIN_DY = 18;
let nextId = 1;

function makeBubble(existing: Bubble[]): Bubble {
  const combo = BUBBLE_COMBOS[Math.floor(Math.random() * BUBBLE_COMBOS.length)];
  // Random scatter around the upper half of the tree, re-rolling the position
  // until it doesn't overlap any bubble already on screen.
  let x = 50;
  let startBottom = 50;
  for (let i = 0; i < 24; i++) {
    x = 10 + Math.random() * 80;
    startBottom = 14 + Math.random() * 66;
    const clash = existing.some(
      (e) => Math.abs(e.x - x) < MIN_DX && Math.abs(e.startBottom - startBottom) < MIN_DY,
    );
    if (!clash) break;
  }
  return {
    id: nextId++,
    value: combo.v,
    color: combo.c,
    x,
    startBottom,
    delay: Math.random() * 0.5,
    state: "floating",
  };
}

// ── BubbleEl ──────────────────────────────────────────────────────────────────

function BubbleEl({
  bubble,
  onCollect,
  onExpire,
  ariaLabel,
}: {
  bubble: Bubble;
  onCollect: (id: number, value: string, color: string, x: number, y: number) => void;
  onExpire: (id: number) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick() {
    if (bubble.state !== "floating") return;
    const rect = ref.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top + rect.height / 2 : 0;
    onCollect(bubble.id, bubble.value, bubble.color, cx, cy);
  }

  if (bubble.state === "gone") return null;

  return (
    <button
      ref={ref}
      onClick={handleClick}
      aria-label={ariaLabel}
      tabIndex={-1}
      className="absolute cursor-pointer border-0 bg-transparent p-0"
      style={{
        left: `${bubble.x}%`,
        bottom: `${bubble.startBottom}%`,
        transform: "translateX(-50%)",
        zIndex: 10,
      }}
    >
      <span
        onAnimationEnd={(event) => {
          // Life-cycle animation finished while still floating → it faded out
          // uncollected. Retire it so the spawn cap frees up.
          if (event.target !== event.currentTarget) return;
          if (bubble.state === "floating") onExpire(bubble.id);
        }}
        style={{
          display: "block",
          animation:
            bubble.state === "collecting"
              ? "bubble-collect-full 220ms cubic-bezier(0.34,1.56,0.64,1) forwards"
              : `bubble-linger 4.2s ease-out ${bubble.delay}s both`,
        }}
      >
        <span
          className="flex select-none items-center justify-center"
          style={{
            minWidth: "3rem",
            height: "1.85rem",
            padding: "0 0.55rem",
            borderRadius: "9px",
            background: `radial-gradient(circle at 32% 26%, rgb(255 255 255 / 45%), rgb(255 255 255 / 0%) 50%), ${bubble.color}`,
            boxShadow: `0 0 10px ${bubble.color}59, 2px 2px 0 rgb(0 0 0 / 22%)`,
            border: "2px solid rgb(255 255 255 / 62%)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.6rem",
              lineHeight: 1,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
              wordBreak: "keep-all",
              overflowWrap: "normal",
              textShadow: "1px 1px 0 rgb(0 0 0 / 30%)",
            }}
          >
            {bubble.value}
          </span>
        </span>
      </span>
    </button>
  );
}

// ── Float label ───────────────────────────────────────────────────────────────

function FloatLabel({ x, y, value }: { x: number; y: number; value: string; id: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none fixed z-50"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        fontFamily: "var(--font-pixel)",
        fontSize: "0.6875rem",
        color: "var(--color-accent-gold)",
        animation: "float-label 250ms ease forwards",
        whiteSpace: "nowrap",
      }}
    >
      +{value}
    </span>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI_ANIMS = ["confetti-up", "confetti-down", "confetti-left", "confetti-right"] as const;

function ConfettiEl({ x, y, color, id }: { x: number; y: number; color: string; id: number }) {
  return (
    <>
      {CONFETTI_ANIMS.map((anim) => (
        <span
          key={`${id}-${anim}`}
          aria-hidden
          className="pointer-events-none fixed z-50"
          style={{
            left: x,
            top: y,
            width: 3,
            height: 3,
            background: color,
            animation: `${anim} 280ms ease forwards`,
          }}
        />
      ))}
    </>
  );
}

// ── TokenBubbles ──────────────────────────────────────────────────────────────

export function TokenBubbles({ className }: { className?: string }) {
  const t = useTranslations("TokenBubbles");
  const prefersReduced = usePrefersReducedMotion();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [labels, setLabels] = useState<{ id: number; x: number; y: number; value: string }[]>([]);
  const [confettis, setConfettis] = useState<Confetti[]>([]);

  // Bubble spawner — only runs when reduced motion is off. Calm cadence,
  // never more than MAX_VISIBLE on screen at once.
  useEffect(() => {
    if (prefersReduced) return;

    const seedTimer = setTimeout(() => {
      const first = makeBubble([]);
      const second = makeBubble([first]);
      setBubbles([first, second]);
    }, 0);

    const spawnInterval = setInterval(() => {
      setBubbles((prev) => {
        const alive = prev.filter((b) => b.state !== "gone");
        const floating = alive.filter((b) => b.state === "floating");
        if (floating.length >= MAX_VISIBLE) return prev;
        return [...alive, makeBubble(floating)];
      });
    }, 1600);

    const cleanupInterval = setInterval(() => {
      setBubbles((prev) => prev.filter((b) => b.state !== "gone"));
    }, 4000);

    return () => {
      clearTimeout(seedTimer);
      clearInterval(spawnInterval);
      clearInterval(cleanupInterval);
    };
  }, [prefersReduced]);

  const handleCollect = useCallback(
    (id: number, value: string, color: string, x: number, y: number) => {
      if (prefersReduced) {
        setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, state: "gone" } : b)));
        return;
      }

      // Ephemeral collect feedback (confetti burst + "+amount" float label).
      const confId = nextId++;
      setConfettis((c) => [...c, { id: confId, x, y, color }]);
      setTimeout(() => setConfettis((c) => c.filter((ci) => ci.id !== confId)), 300);

      const labelId = nextId++;
      setLabels((l) => [...l, { id: labelId, x, y, value }]);
      setTimeout(() => setLabels((l) => l.filter((li) => li.id !== labelId)), 300);

      setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, state: "collecting" } : b)));
      setTimeout(() => {
        setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, state: "gone" } : b)));
      }, 220);
    },
    [prefersReduced],
  );

  // Retire a bubble that faded out without being collected.
  const handleExpire = useCallback((id: number) => {
    setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, state: "gone" } : b)));
  }, []);

  // Reduced-motion fallback: two static token bubbles
  if (prefersReduced) {
    return (
      <div className={className} aria-hidden>
        <div className="flex h-full items-end justify-center gap-3 pb-2">
          {[BUBBLE_COMBOS[0], BUBBLE_COMBOS[1]].map((p) => (
            <span
              key={p.v}
              className="flex items-center justify-center text-white"
              style={{
                minWidth: "3rem",
                height: "1.85rem",
                padding: "0 0.55rem",
                borderRadius: "9px",
                background: `radial-gradient(circle at 32% 26%, rgb(255 255 255 / 45%), rgb(255 255 255 / 0%) 50%), ${p.c}`,
                border: "2px solid rgb(255 255 255 / 62%)",
                fontFamily: "var(--font-pixel)",
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.03em",
              }}
            >
              {p.v}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`pointer-events-none ${className ?? ""}`} aria-hidden>
        <div className="pointer-events-auto relative h-full w-full overflow-visible">
          {bubbles.map((b) => (
            <BubbleEl
              key={b.id}
              bubble={b}
              onCollect={handleCollect}
              onExpire={handleExpire}
              ariaLabel={t("collectAriaLabel", { tokens: b.value })}
            />
          ))}
        </div>
      </div>
      {labels.map((l) => (
        <FloatLabel key={l.id} {...l} />
      ))}
      {confettis.map((c) => (
        <ConfettiEl key={c.id} {...c} />
      ))}
    </>
  );
}
