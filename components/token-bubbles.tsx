"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// ── Types ──────────────────────────────────────────────────────────────────────

type BubbleKind = "claude" | "codex";

interface Bubble {
  id: number;
  kind: BubbleKind;
  tokens: number;
  /** 0–100, percentage left within the container */
  x: number;
  delay: number;
  /** +1 = drift right, -1 = drift left */
  driftDir: 1 | -1;
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

// ── Constants ─────────────────────────────────────────────────────────────────

const BUBBLE_COLORS: Record<BubbleKind, { bg: string; glow: string }> = {
  claude: {
    bg: "var(--color-bubble-claude)",
    glow: "var(--color-bubble-claude-glow)",
  },
  codex: {
    bg: "var(--color-bubble-codex)",
    glow: "var(--color-bubble-codex-glow)",
  },
};

const TOKEN_AMOUNTS = [42, 128, 256, 512, 88, 320, 64, 196];
let nextId = 1;

function makeBubble(kind: BubbleKind): Bubble {
  return {
    id: nextId++,
    kind,
    tokens: TOKEN_AMOUNTS[Math.floor(Math.random() * TOKEN_AMOUNTS.length)],
    x: 20 + Math.random() * 60,
    delay: Math.random() * 1.5,
    driftDir: Math.random() > 0.5 ? 1 : -1,
    state: "floating",
  };
}

// ── BubbleEl ──────────────────────────────────────────────────────────────────

function BubbleEl({
  bubble,
  onCollect,
  ariaLabel,
}: {
  bubble: Bubble;
  onCollect: (id: number, tokens: number, x: number, y: number) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { bg, glow } = BUBBLE_COLORS[bubble.kind];

  const driftAnim =
    bubble.driftDir === 1
      ? "bubble-drift-right 4s ease-in-out alternate infinite"
      : "bubble-drift-left 4s ease-in-out alternate infinite";

  function handleClick() {
    if (bubble.state !== "floating") return;
    const rect = ref.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top + rect.height / 2 : 0;
    onCollect(bubble.id, bubble.tokens, cx, cy);
  }

  if (bubble.state === "gone") return null;

  return (
    <button
      ref={ref}
      onClick={handleClick}
      aria-label={ariaLabel}
      className="absolute bottom-0 cursor-pointer border-0 bg-transparent p-0"
      style={{
        left: `${bubble.x}%`,
        transform: "translateX(-50%)",
        zIndex: 10,
      }}
    >
      <span
        style={{
          display: "block",
          animation:
            bubble.state === "collecting"
              ? "bubble-collect-full 220ms cubic-bezier(0.34,1.56,0.64,1) forwards"
              : `bubble-float-y 3.2s cubic-bezier(0.25,0.46,0.45,0.94) ${bubble.delay}s both`,
        }}
      >
        <span
          style={{
            display: "block",
            animation: bubble.state === "floating" ? driftAnim : undefined,
          }}
        >
          <span
            className="flex select-none items-center gap-1 rounded-full px-2.5 py-1"
            style={{
              background: bg,
              boxShadow: `0 0 8px ${glow}, 2px 2px 0 rgb(0 0 0 / 20%)`,
              fontFamily: "var(--font-pixel)",
              fontSize: "0.6rem",
              color: "#fff",
              letterSpacing: "0.02em",
              border: "1.5px solid rgb(255 255 255 / 25%)",
            }}
          >
            <span style={{ opacity: 0.85 }}>{bubble.kind === "claude" ? "CC" : "Cx"}</span>
            <span>{bubble.tokens}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

// ── Float label ───────────────────────────────────────────────────────────────

function FloatLabel({ x, y, tokens }: { x: number; y: number; tokens: number; id: number }) {
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
      +{tokens}
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
  const [labels, setLabels] = useState<{ id: number; x: number; y: number; tokens: number }[]>([]);
  const [confettis, setConfettis] = useState<Confetti[]>([]);

  // Bubble spawner — only runs when reduced motion is off
  useEffect(() => {
    if (prefersReduced) return;

    // Seed after a microtask so initial paint doesn't block
    const seedTimer = setTimeout(() => {
      setBubbles([makeBubble("claude"), makeBubble("codex")]);
    }, 0);

    const spawnInterval = setInterval(() => {
      setBubbles((prev) => {
        const floating = prev.filter((b) => b.state === "floating");
        if (floating.length >= 8) return prev;
        return [
          ...prev.filter((b) => b.state !== "gone"),
          makeBubble(Math.random() > 0.5 ? "claude" : "codex"),
        ];
      });
    }, 1800);

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
    (id: number, tokens: number, x: number, y: number) => {
      if (prefersReduced) {
        setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, state: "gone" } : b)));
        return;
      }

      // Find bubble kind before any state mutation
      setBubbles((prev) => {
        const found = prev.find((b) => b.id === id);
        const color =
          found?.kind === "claude" ? "var(--color-bubble-claude)" : "var(--color-bubble-codex)";

        // Side-effects inside setState updater are not ideal but acceptable for
        // one-shot ephemeral overlay state that doesn't feed into the tree.
        const confId = nextId++;
        setTimeout(() => {
          setConfettis((c) => [...c, { id: confId, x, y, color }]);
          setTimeout(() => setConfettis((c) => c.filter((ci) => ci.id !== confId)), 300);
        }, 0);

        const labelId = nextId++;
        setTimeout(() => {
          setLabels((l) => [...l, { id: labelId, x, y, tokens }]);
          setTimeout(() => setLabels((l) => l.filter((li) => li.id !== labelId)), 300);
        }, 0);

        return prev.map((b) => (b.id === id ? { ...b, state: "collecting" } : b));
      });

      setTimeout(() => {
        setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, state: "gone" } : b)));
      }, 220);
    },
    [prefersReduced],
  );

  // Reduced-motion fallback: static pills
  if (prefersReduced) {
    return (
      <div className={className} aria-hidden>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white"
          style={{
            background: "var(--color-bubble-claude)",
            fontFamily: "var(--font-pixel)",
            fontSize: "0.6rem",
          }}
        >
          CC 256
        </span>
        <span
          className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white"
          style={{
            background: "var(--color-bubble-codex)",
            fontFamily: "var(--font-pixel)",
            fontSize: "0.6rem",
          }}
        >
          Cx 128
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={`pointer-events-none relative ${className ?? ""}`} aria-hidden>
        <div className="pointer-events-auto relative h-full w-full overflow-visible">
          {bubbles.map((b) => (
            <BubbleEl
              key={b.id}
              bubble={b}
              onCollect={handleCollect}
              ariaLabel={t("collectAriaLabel", { tokens: b.tokens })}
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
