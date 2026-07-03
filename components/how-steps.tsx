"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useInView } from "@/hooks/use-in-view";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * §how "工作原理" — three live demo boxes that PLAY the product loop instead
 * of describing it, chained by a connector line that draws in on scroll:
 *
 *   01 a mini terminal types a prompt, a token counter ticks up and an
 *      orange bubble inflates out of it
 *   02 a real, clickable bubble (pop + confetti + float label, then respawn)
 *   03 the actual AppleTree sprite grows 1→3 on entry; press-and-hold grows
 *      it all the way to stage 8 with an XP bar and a LV UP! blip
 *
 * Plus the privacy note restyled as a game save slot ("SAVE DATA · 0 bytes").
 *
 * Scroll choreography: the wrapper gets `stage-armed` after hydration (never
 * under reduced motion) and `stage-play` on first viewport entry; globals.css
 * `.seq-item` / `.how-connector-path` / `.demo-pop` rules run the sequence.
 * Server HTML is the final resting state, so no-JS / reduced-motion / old
 * browsers see a complete static section.
 */

interface StepCopy {
  num: string;
  title: string;
  body: string;
}

interface HowStepsProps {
  steps: readonly [StepCopy, StepCopy, StepCopy];
  privacyStrong: string;
  privacyBody: string;
  uploadedZero: string;
  holdToGrow: string;
  bubbleAria: string;
}

// Token count-up sequence for demo 01 (uneven steps — reads as live traffic)
const COUNT_SEQ = [0, 16, 48, 96, 152, 200, 256] as const;
// Latin-only typewriter line (CJK never gets typed letter-by-letter)
const TERMINAL_LINE = '$ claude "fix a bug"';

const emptySubscribe = () => () => {};

// ── Pixel sprites (inline crispEdges SVG, tree-scene style) ────────────────────

/** Classic pixel pointer hand, pointing up — the universal "click me". */
function PixelHand({ width = 14 }: { width?: number }) {
  return (
    <svg viewBox="0 0 10 12" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#1e2521">
        <rect x="3" y="0" width="2" height="1" />
        <rect x="2" y="1" width="1" height="4" />
        <rect x="5" y="1" width="1" height="3" />
        <rect x="6" y="4" width="3" height="1" />
        <rect x="9" y="5" width="1" height="3" />
        <rect x="1" y="5" width="1" height="2" />
        <rect x="0" y="5" width="1" height="1" />
        <rect x="1" y="7" width="1" height="2" />
        <rect x="2" y="9" width="1" height="1" />
        <rect x="3" y="10" width="5" height="1" />
        <rect x="8" y="9" width="1" height="1" />
      </g>
      <g fill="#faf5ea">
        <rect x="3" y="1" width="2" height="4" />
        <rect x="3" y="5" width="3" height="4" />
        <rect x="6" y="5" width="3" height="4" />
        <rect x="2" y="7" width="1" height="2" />
        <rect x="3" y="9" width="5" height="1" />
      </g>
    </svg>
  );
}

/** Pixel floppy disk — the save-slot icon. */
function PixelFloppy({ width = 26 }: { width?: number }) {
  return (
    <svg viewBox="0 0 14 14" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#3a7d44">
        <rect x="0" y="0" width="12" height="14" />
        <rect x="12" y="2" width="2" height="12" />
      </g>
      <rect x="3" y="0" width="6" height="5" fill="#243320" />
      <rect x="6" y="1" width="2" height="3" fill="#7bd88f" />
      <rect x="2" y="7" width="10" height="6" fill="#f3ede0" />
      <g fill="#7a5a3a">
        <rect x="3" y="9" width="8" height="1" />
        <rect x="3" y="11" width="6" height="1" />
      </g>
    </svg>
  );
}

/** Pixel padlock — jiggles on save-slot hover. */
function PixelPadlock({ width = 12 }: { width?: number }) {
  return (
    <svg viewBox="0 0 10 12" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#5a6b5e">
        <rect x="2" y="0" width="6" height="1" />
        <rect x="1" y="1" width="2" height="4" />
        <rect x="7" y="1" width="2" height="4" />
      </g>
      <rect x="0" y="5" width="10" height="7" fill="#3a7d44" />
      <rect x="4" y="7" width="2" height="3" fill="#f3ede0" />
    </svg>
  );
}

/** Mini token pill (hero bubble, shrunk). */
function MiniBubble({ value, color }: { value: string; color: string }) {
  return (
    <span
      className="flex select-none items-center justify-center"
      style={{
        minWidth: "2.4rem",
        height: "1.4rem",
        padding: "0 0.4rem",
        borderRadius: "7px",
        background: `radial-gradient(circle at 32% 26%, rgb(255 255 255 / 45%), rgb(255 255 255 / 0%) 50%), ${color}`,
        boxShadow: `2px 2px 0 rgb(0 0 0 / 22%)`,
        border: "2px solid rgb(255 255 255 / 62%)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "0.5rem",
          lineHeight: 1,
          fontWeight: 700,
          color: "#fff",
          textShadow: "1px 1px 0 rgb(0 0 0 / 30%)",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </span>
  );
}

// ── Demo 01: terminal → tokens → bubble ────────────────────────────────────────

function TerminalDemo({ playing, reduced }: { playing: boolean; reduced: boolean }) {
  // SSR/at-rest shows the final count; the entry play resets and ticks up.
  // No hover interaction by design — this box plays once, then just idles.
  const [count, setCount] = useState<number>(COUNT_SEQ[COUNT_SEQ.length - 1]);

  useEffect(() => {
    if (!playing || reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let i = 0;
    timers.push(
      setTimeout(() => {
        setCount(COUNT_SEQ[0]);
        const iv = setInterval(() => {
          i += 1;
          setCount(COUNT_SEQ[i]);
          if (i >= COUNT_SEQ.length - 1) clearInterval(iv);
        }, 130);
        timers.push(iv as unknown as ReturnType<typeof setTimeout>);
      }, 1200),
    );
    return () => timers.forEach(clearTimeout);
  }, [playing, reduced]);

  const animate = playing && !reduced;

  return (
    <div
      className="demo-pop relative z-[1] mb-4 h-24 w-full max-w-[240px] overflow-hidden"
      style={{
        border: "var(--border-pixel)",
        borderRadius: "var(--radius-pixel)",
        background: "var(--color-surface-deepest)",
      }}
      aria-hidden
    >
      <div className="absolute inset-0">
        {/* token counter */}
        <div className="absolute left-2 top-1.5 flex items-baseline gap-1">
          <span
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "0.6rem",
              color: "var(--color-bubble-claude)",
              lineHeight: 1,
            }}
          >
            {count}
          </span>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.45rem",
              color: "var(--color-text-muted-dark)",
              lineHeight: 1,
            }}
          >
            tokens
          </span>
        </div>

        {/* inflating bubble */}
        <div
          className="absolute right-3 top-2"
          style={{
            transformOrigin: "bottom center",
            animation: animate
              ? "bubble-inflate 900ms steps(1) 1300ms both, demo-bob 3.2s ease-in-out 2.4s infinite alternate"
              : undefined,
          }}
        >
          <MiniBubble value="256" color="var(--color-bubble-claude)" />
        </div>

        {/* mini terminal window */}
        <div
          className="absolute bottom-2 left-2 w-[152px] overflow-hidden"
          style={{
            border: "1px solid var(--color-surface-panel)",
            borderRadius: "var(--radius-pixel)",
            background: "var(--color-surface-ui)",
          }}
        >
          <div
            className="flex h-4 items-center gap-1 px-1.5"
            style={{ background: "var(--color-surface-panel)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#c75c5c" }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#c8943c" }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3a7d44" }} />
            <span
              className="ml-1"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.45rem",
                color: "var(--color-text-muted-dark)",
                lineHeight: 1,
              }}
            >
              claude
            </span>
          </div>
          <div className="flex items-center px-1.5 py-1.5">
            <span
              className="whitespace-nowrap"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.5rem",
                color: "var(--color-text-cream)",
                lineHeight: 1,
                animation: animate ? "type-on 1.1s steps(20, end) 250ms both" : undefined,
              }}
            >
              {TERMINAL_LINE}
            </span>
            <span
              className="animate-cursor-blink ml-0.5"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.5rem",
                color: "var(--color-leaf-light)",
                lineHeight: 1,
              }}
            >
              ▌
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Demo 02: a real clickable bubble ───────────────────────────────────────────

const CONFETTI_ANIMS = ["confetti-up", "confetti-down", "confetti-left", "confetti-right"] as const;

function CollectDemo({
  playing,
  reduced,
  bubbleAria,
}: {
  playing: boolean;
  reduced: boolean;
  bubbleAria: string;
}) {
  const [bubbleState, setBubbleState] = useState<"floating" | "collecting" | "gone">("floating");
  const [respawnId, setRespawnId] = useState(0);
  const [burst, setBurst] = useState(false);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  const collect = () => {
    if (bubbleState !== "floating") return;
    if (reduced) {
      setBubbleState("gone");
      later(() => {
        setRespawnId((k) => k + 1);
        setBubbleState("floating");
      }, 900);
      return;
    }
    setBubbleState("collecting");
    setBurst(true);
    later(() => setBubbleState("gone"), 220);
    later(() => setBurst(false), 340);
    later(() => {
      setRespawnId((k) => k + 1);
      setBubbleState("floating");
    }, 1500);
  };

  const animate = playing && !reduced;

  return (
    <div
      className="demo-pop relative z-[1] mb-4 h-24 w-full max-w-[240px] overflow-hidden"
      style={{
        border: "var(--border-pixel)",
        borderRadius: "var(--radius-pixel)",
        background: "var(--color-surface-card)",
      }}
    >
      {/* bubble (a real button) */}
      {bubbleState !== "gone" && (
        <button
          key={respawnId}
          type="button"
          onClick={collect}
          aria-label={bubbleAria}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
        >
          <span
            className="block"
            style={{
              animation:
                bubbleState === "collecting"
                  ? "bubble-collect-full 220ms cubic-bezier(0.34,1.56,0.64,1) forwards"
                  : animate
                    ? "bubble-inflate 400ms steps(1) both, demo-bob 2.8s ease-in-out 0.5s infinite alternate"
                    : undefined,
            }}
          >
            <MiniBubble value="256" color="var(--color-bubble-codex)" />
          </span>
        </button>
      )}

      {/* pointing pixel hand */}
      {bubbleState === "floating" && (
        <span
          className="pointer-events-none absolute left-[58%] top-[62%]"
          style={{
            animation: animate ? "hand-nudge 700ms steps(2) infinite alternate" : undefined,
          }}
          aria-hidden
        >
          <PixelHand />
        </span>
      )}

      {/* collect burst: confetti + float label */}
      {burst && (
        <span className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
          {CONFETTI_ANIMS.map((anim) => (
            <span
              key={anim}
              className="absolute"
              style={{
                width: 3,
                height: 3,
                background: "var(--color-bubble-codex)",
                animation: `${anim} 280ms ease forwards`,
              }}
            />
          ))}
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.6875rem",
              color: "var(--color-leaf-deep)",
              animation: "float-label 320ms ease forwards",
            }}
          >
            +256
          </span>
        </span>
      )}
    </div>
  );
}

// ── Demo 03: press-and-hold to grow ────────────────────────────────────────────

function GrowDemo({
  playing,
  reduced,
  holdToGrow,
}: {
  playing: boolean;
  reduced: boolean;
  holdToGrow: string;
}) {
  // SSR/at-rest shows the autoplay's final stage
  const [stage, setStage] = useState(3);
  const [lvup, setLvup] = useState(false);
  // hide the "press here" affordance once the visitor has held the button
  const [discovered, setDiscovered] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdingKey = useRef(false);
  const interacted = useRef(false);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      if (holdTimer.current) clearInterval(holdTimer.current);
    };
  }, []);

  // Autoplay 1→3 when the stage sequence reaches this card
  useEffect(() => {
    if (!playing || reduced || interacted.current) return;
    const timersLocal: ReturnType<typeof setTimeout>[] = [];
    timersLocal.push(
      setTimeout(() => {
        if (interacted.current) return;
        setStage(1);
        let s = 1;
        const iv = setInterval(() => {
          if (interacted.current) {
            clearInterval(iv);
            return;
          }
          s += 1;
          setStage(s);
          if (s >= 3) clearInterval(iv);
        }, 520);
        timersLocal.push(iv as unknown as ReturnType<typeof setTimeout>);
      }, 1500),
    );
    return () => timersLocal.forEach(clearTimeout);
  }, [playing, reduced]);

  const bumpStage = () =>
    setStage((prev) => {
      const next = Math.min(8, prev + 1);
      if (next === 8 && prev !== 8) {
        setLvup(true);
        const t = setTimeout(() => {
          timers.current.delete(t);
          setLvup(false);
        }, 950);
        timers.current.add(t);
      }
      return next;
    });

  const startHold = () => {
    interacted.current = true;
    setDiscovered(true);
    if (holdTimer.current) clearInterval(holdTimer.current);
    bumpStage();
    holdTimer.current = setInterval(bumpStage, reduced ? 240 : 400);
  };

  const endHold = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  };

  return (
    <div className="demo-pop relative z-[1] mb-4 w-full max-w-[240px]">
      <button
        type="button"
        aria-label={holdToGrow}
        className="relative block h-24 w-full cursor-pointer overflow-hidden p-0 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light"
        style={{
          border: "var(--border-pixel)",
          borderRadius: "var(--radius-pixel)",
          background: "var(--color-surface-card)",
          boxShadow: "var(--shadow-pixel)",
          touchAction: "none",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          startHold();
        }}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !holdingKey.current) {
            e.preventDefault();
            holdingKey.current = true;
            startHold();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") {
            holdingKey.current = false;
            endHold();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* ground */}
        <span className="absolute inset-x-0 bottom-0 h-3" aria-hidden>
          <Image
            src="/sprites/Ground.png"
            alt=""
            fill
            sizes="240px"
            className="pixelated object-cover"
          />
        </span>

        {/* the tree — sprite swap with a grow-shake on each stage change */}
        <span
          key={stage}
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 ${reduced ? "" : "animate-grow-shake"}`}
          style={{ transformOrigin: "bottom center" }}
          aria-hidden
        >
          <Image
            src={`/sprites/AppleTree_${stage}.png`}
            alt=""
            width={64}
            height={64}
            className="pixelated"
            style={{ width: 64, height: 64, objectFit: "contain", objectPosition: "50% 100%" }}
          />
        </span>

        {/* "press here" affordance — the same pixel hand the visitor just met
            in demo 02, nudging at the tree until the first hold */}
        {!discovered && (
          <span
            className="pointer-events-none absolute right-[24%] top-[30%]"
            style={{
              animation:
                playing && !reduced ? "hand-nudge 700ms steps(2) infinite alternate" : undefined,
            }}
            aria-hidden
          >
            <PixelHand width={16} />
          </span>
        )}

        {/* LV UP! blip */}
        {lvup && (
          <span
            className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "0.55rem",
              color: "var(--color-leaf-deep)",
              animation: reduced ? undefined : "lvup-pop 900ms ease both",
            }}
            aria-hidden
          >
            LV UP!
          </span>
        )}

        {/* XP bar */}
        <span
          className="absolute bottom-1 left-2 right-2 block h-1.5 overflow-hidden"
          style={{
            border: "1px solid var(--color-soil)",
            borderRadius: "var(--radius-pixel)",
            background: "var(--color-surface-parchment)",
          }}
          aria-hidden
        >
          <span
            className="block h-full"
            style={{
              width: `${(stage / 8) * 100}%`,
              background: "var(--color-leaf-deep)",
              transition: reduced ? undefined : "width 180ms steps(2, end)",
            }}
          />
        </span>
      </button>

      {/* hint — leaf-deep so the "press & hold" instruction reads clearly */}
      <p
        className="mt-1.5 text-center"
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "0.6rem",
          color: "var(--color-leaf-deep)",
          lineHeight: 1,
        }}
      >
        {holdToGrow}
      </p>
    </div>
  );
}

// ── HowSteps ───────────────────────────────────────────────────────────────────

export function HowSteps({
  steps,
  privacyStrong,
  privacyBody,
  uploadedZero,
  holdToGrow,
  bubbleAria,
}: HowStepsProps) {
  const reduced = usePrefersReducedMotion();
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [ref, inView] = useInView<HTMLDivElement>({
    threshold: 0.3,
    rootMargin: "0px 0px -8% 0px",
    once: true,
  });

  const armed = hydrated && !reduced;
  const playing = armed && inView;

  const demos = [
    <TerminalDemo key="d1" playing={playing} reduced={reduced} />,
    <CollectDemo key="d2" playing={playing} reduced={reduced} bubbleAria={bubbleAria} />,
    <GrowDemo key="d3" playing={playing} reduced={reduced} holdToGrow={holdToGrow} />,
  ];

  return (
    <div ref={ref} className={`${armed ? "stage-armed" : ""} ${playing ? "stage-play" : ""}`}>
      <div className="relative">
        {/* connector line — draws 01 → 02 → 03 as the sequence plays */}
        <svg
          className="how-connector pointer-events-none absolute left-[7%] top-12 hidden h-[2px] w-[86%] sm:block"
          viewBox="0 0 1000 2"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="how-connector-path"
            d="M0 1 H1000"
            pathLength={1000}
            stroke="var(--color-soil-light)"
            strokeWidth={2}
            strokeDasharray={1000}
            strokeLinecap="square"
            fill="none"
            opacity={0.55}
          />
        </svg>

        <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="seq-item flex flex-col items-center text-center sm:items-start sm:text-left"
              style={{ "--seq-delay": `${i * 500}ms` } as React.CSSProperties}
            >
              {demos[i]}
              <div className="mb-2 flex items-center gap-3">
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
                <h3
                  className="text-leaf-deep"
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "var(--text-h1)",
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </h3>
              </div>
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
              {i < steps.length - 1 && (
                <hr
                  className="mt-8 w-full sm:hidden"
                  style={{ borderColor: "var(--color-soil)", opacity: 0.4 }}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Privacy note as a game save slot */}
      <div
        className="seq-item save-slot mx-auto mt-14 max-w-2xl"
        style={{ "--seq-delay": "1500ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-4 rounded-[2px] border-2 border-leaf-deep/30 bg-surface-card px-6 py-4">
          <span className="shrink-0" aria-hidden>
            <PixelFloppy />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <div className="mb-1 flex items-center gap-2">
              <span
                style={{
                  fontFamily: "var(--font-brand)",
                  fontSize: "0.5rem",
                  color: "var(--color-leaf-deep)",
                  lineHeight: 1,
                }}
              >
                SAVE DATA
              </span>
              <span className="save-slot-lock inline-block" aria-hidden>
                <PixelPadlock />
              </span>
              <span
                className="ml-auto whitespace-nowrap"
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.55rem",
                  color: "var(--color-text-muted-light)",
                  lineHeight: 1,
                }}
              >
                {uploadedZero}
              </span>
            </div>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-small)",
                color: "var(--color-text-muted-light)",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "var(--color-leaf-deep)" }}>{privacyStrong}</strong>：
              {privacyBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
