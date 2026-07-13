"use client";

/**
 * Web Forest concept prototype v2 — single-screen "farm plot" layout.
 *
 * v1 was a horizontally scrolling strip of four biomes; feedback: it read as a
 * parade, not a forest. v2 is QQ-farm style: ONE contiguous plot of land seen
 * slightly from above, every tree planted together (main + young trees), with
 * themed corners (snow / sand / shrine) instead of separate zones. The whole
 * forest is visible at once; no camera. Depth comes from a perspective
 * trapezoid field, y-sorted occlusion and back-row shrink.
 *
 * Still fake data + local state only — no backend, no auth. Self-contained:
 * all styles live in the <style> block below.
 */

import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// ── Stage (design-space) constants — scaled to fit the viewport ────────────────

const STAGE_W = 1680;
const STAGE_H = 1050;
// Field trapezoid (the plot): back edge y=430, front edge y=1000
const FIELD = { backY: 430, frontY: 1000, backL: 310, backR: 1370, frontL: 90, frontR: 1590 };

// ── Fake tree data (vision §9.2 tree profile fields) ───────────────────────────

interface TreeDef {
  id: string;
  sprite: string;
  nw: number;
  nh: number;
  h: number; // display height at scale 1
  x: number; // stage-space trunk center
  y: number; // stage-space foot baseline (drives z-order)
  s: number; // depth scale (back rows shrink)
  main?: boolean;
  emoji: string;
  name: string;
  kind: string;
  roman: string;
  planted: string;
  days: number;
  tokens: string;
  next: string;
  recent: string;
  eco: string;
}

const TREES: TreeDef[] = [
  {
    id: "christmas-main", sprite: "ChristmasTree_8", nw: 698, nh: 1214, h: 350, x: 350, y: 585,
    s: 0.88, main: true, emoji: "🎄", name: "极夜星", kind: "圣诞树", roman: "VIII",
    planted: "2026-05-30", days: 44, tokens: "452.8M", next: "已长满 🏆",
    recent: "昨晚 · +2.4M", eco: "雪角的灯串亮起来了",
  },
  {
    id: "cactus-main", sprite: "Cactus_8", nw: 600, nh: 600, h: 250, x: 1330, y: 580,
    s: 0.88, main: true, emoji: "🌵", name: "峡谷卫兵", kind: "仙人掌", roman: "VIII",
    planted: "2026-05-16", days: 58, tokens: "364.0M", next: "已长满 🏆",
    recent: "3 天前 · +0.9M", eco: "沙地里开了一朵沙漠花",
  },
  {
    id: "cherry-main", sprite: "CherryTree_8", nw: 759, nh: 729, h: 300, x: 1120, y: 705,
    s: 0.95, main: true, emoji: "🌸", name: "宵樱", kind: "樱花树", roman: "VIII",
    planted: "2026-05-02", days: 72, tokens: "271.5M", next: "已长满 🏆",
    recent: "昨天 · +3.1M", eco: "石灯点亮后,萤火虫多了起来",
  },
  {
    id: "apple-main", sprite: "AppleTree_8", nw: 759, nh: 823, h: 330, x: 500, y: 860,
    s: 1, main: true, emoji: "🍎", name: "老苹果", kind: "苹果树", roman: "VIII",
    planted: "2026-04-21", days: 83, tokens: "93.4M", next: "已长满 🏆",
    recent: "2 小时前 · +1.2M", eco: "果园的篱笆修好了,鸟开始清晨来访",
  },
  {
    id: "apple-young", sprite: "AppleTree_4", nw: 759, nh: 823, h: 175, x: 745, y: 775,
    s: 1, emoji: "🍎", name: "小果", kind: "苹果树", roman: "IV", planted: "2026-06-30",
    days: 13, tokens: "6.8M", next: "距 V 阶段还需 3.2M", recent: "26 分钟前 · +0.4M",
    eco: "树下长出了第一丛白花",
  },
  {
    id: "cherry-young", sprite: "CherryTree_3", nw: 759, nh: 729, h: 140, x: 940, y: 625,
    s: 0.92, emoji: "🌸", name: "初瓣", kind: "樱花树", roman: "III", planted: "2026-07-01",
    days: 12, tokens: "5.1M", next: "距 IV 阶段还需 6.9M", recent: "1 小时前 · +0.2M",
    eco: "花瓣落进了小溪",
  },
  {
    id: "cactus-young", sprite: "Cactus_4", nw: 600, nh: 600, h: 110, x: 1462, y: 662,
    s: 0.92, emoji: "🌵", name: "小刺", kind: "仙人掌", roman: "IV", planted: "2026-06-18",
    days: 25, tokens: "18.3M", next: "距 V 阶段还需 21.7M", recent: "5 小时前 · +0.6M",
    eco: "石缝里开了一朵沙漠花",
  },
  {
    id: "christmas-young", sprite: "ChristmasTree_4", nw: 698, nh: 1214, h: 175, x: 185, y: 700,
    s: 0.95, emoji: "🎄", name: "小雪杉", kind: "圣诞树", roman: "IV", planted: "2026-06-25",
    days: 18, tokens: "22.6M", next: "距 V 阶段还需 27.4M", recent: "40 分钟前 · +0.5M",
    eco: "树梢挂上了第一颗星",
  },
];

// ── Static decorations (existing sprites; y drives z-order) ────────────────────

interface DecoDef {
  id: string;
  sprite: string;
  nw: number;
  nh: number;
  h: number;
  x: number;
  y: number;
  flip?: boolean;
  behind?: number; // optional z override (e.g. torii behind its tree)
}

const FENCE_FRONT_Y = 1012;
const DECOS: DecoDef[] = [
  // front fence row with a gate gap at x≈840 (path entrance)
  ...[150, 300, 450, 600, 750].map((x, i) => ({
    id: `fence-f${i}`, sprite: "Fence", nw: 193, nh: 67, h: 62, x, y: FENCE_FRONT_Y,
  })),
  ...[930, 1080, 1230, 1380, 1530].map((x, i) => ({
    id: `fence-g${i}`, sprite: "Fence", nw: 193, nh: 67, h: 62, x, y: FENCE_FRONT_Y,
  })),
  // back hedge: smaller fences along the back edge (perspective shrink)
  ...[420, 560, 700, 840, 980, 1120, 1260].map((x, i) => ({
    id: `fence-b${i}`, sprite: "Fence", nw: 193, nh: 67, h: 40, x, y: 442,
  })),
  // themed corners
  { id: "bfence-1", sprite: "BambooFence", nw: 193, nh: 65, h: 46, x: 1268, y: 715 },
  { id: "bfence-2", sprite: "BambooFence", nw: 193, nh: 65, h: 44, x: 968, y: 668 },
  { id: "xfence-1", sprite: "BrokenFence", nw: 193, nh: 63, h: 42, x: 1478, y: 590, flip: true },
  { id: "xfence-2", sprite: "BrokenFence", nw: 193, nh: 63, h: 44, x: 1210, y: 545 },
  { id: "torii", sprite: "Torii", nw: 780, nh: 674, h: 250, x: 1180, y: 668, behind: 640 },
  { id: "basket", sprite: "Basket", nw: 86, nh: 60, h: 52, x: 640, y: 878 },
];

const LAMPS = [
  { id: "lamp-1", x: 1002, y: 712, h: 118 },
  { id: "lamp-2", x: 1268, y: 748, h: 126 },
];
const SWING = { x: 322, y: 838, h: 168 };
const CHEST = { x: 705, y: 915, fw: 109, fh: 102, scale: 1.1 };
const CHIME = { x: 1122, y: 668, fw: 337, fh: 431, h: 96, topAt: 570 };

// ── Deterministic PRNG (same on server & client → no hydration mismatch) ──────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// function declaration (hoisted): module-init code below calls it via fieldRange
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** x-range of the field at a given y (linear interpolation of the trapezoid). */
function fieldRange(y: number): [number, number] {
  const t = clamp((y - FIELD.backY) / (FIELD.frontY - FIELD.backY), 0, 1);
  return [FIELD.backL + (FIELD.frontL - FIELD.backL) * t, FIELD.backR + (FIELD.frontR - FIELD.backR) * t];
}

// Scattered bushes / flowers / grass tufts (procedural stand-in vegetation)
interface BushDef { x: number; y: number; w: number; kind: "bush" | "flower" | "tuft" | "stone"; hue: string }
const BUSHES: BushDef[] = (() => {
  const rnd = mulberry32(20260713);
  const out: BushDef[] = [];
  const kinds: BushDef["kind"][] = ["bush", "tuft", "flower", "tuft", "bush", "flower", "stone", "tuft"];
  const hues = ["#3f7a3c", "#4d8f4a", "#579448", "#6fae5c"];
  for (let i = 0; i < 26; i++) {
    const y = 470 + rnd() * 500;
    const [lo, hi] = fieldRange(y);
    const x = lo + 40 + rnd() * (hi - lo - 80);
    // keep the middle path and tree feet breathable
    if (Math.abs(x - 840) < 60 && y > 700) continue;
    if (TREES.some((t) => Math.abs(t.x - x) < 70 && Math.abs(t.y - y) < 46)) continue;
    out.push({
      x, y,
      w: 26 + rnd() * 30,
      kind: kinds[Math.floor(rnd() * kinds.length)] ?? "tuft",
      hue: hues[Math.floor(rnd() * hues.length)] ?? "#4d8f4a",
    });
  }
  return out;
})();

// Localized ambient particles per corner
interface Emitter { id: string; x: number; y: number; w: number; h: number; colors: string[]; count: number }
const EMITTERS: Emitter[] = [
  { id: "em-cherry", x: 990, y: 380, w: 300, h: 330, colors: ["#f4b8c8", "#eda3b8", "#f9d2dc"], count: 7 },
  { id: "em-snow", x: 190, y: 210, w: 340, h: 380, colors: ["#ffffff", "#e8f0fa"], count: 8 },
  { id: "em-apple", x: 380, y: 540, w: 260, h: 320, colors: ["#7fae5c", "#c8943c"], count: 3 },
  { id: "em-dust", x: 1240, y: 430, w: 300, h: 160, colors: ["#e0bc7e"], count: 3 },
];
const PARTICLES = (() => {
  const rnd = mulberry32(777);
  return EMITTERS.map((em) => ({
    em,
    ps: Array.from({ length: em.count }, () => ({
      left: rnd(),
      delay: -rnd() * 12,
      dur: 7 + rnd() * 6,
      size: 3 + Math.round(rnd() * 3),
      sway: 14 + rnd() * 30,
      color: em.colors[Math.floor(rnd() * em.colors.length)] ?? em.colors[0]!,
    })),
  }));
})();

// Night stars + day clouds
const STARS = (() => {
  const rnd = mulberry32(99);
  return Array.from({ length: 40 }, () => ({ l: rnd() * 100, t: rnd() * 40, d: rnd() * 3 }));
})();
const CLOUDS = [
  { y: 64, s: 1, dur: 150, delay: -20 },
  { y: 150, s: 0.7, dur: 190, delay: -95 },
  { y: 34, s: 0.55, dur: 230, delay: -160 },
];

// ── Small helpers ──────────────────────────────────────────────────────────────

const spritePath = (name: string) => `/sprites/${name}.png`;
const Z = (y: number) => Math.round(y); // depth sort: lower on screen = in front

interface OrbFx { id: number; tx: number; ty: number; color: string; claude: boolean }
interface FloatFx { id: number; treeId: string; text: string }

// ── Main component ─────────────────────────────────────────────────────────────

export function ForestScene() {
  const reduced = usePrefersReducedMotion();

  const fxIdRef = useRef(1);
  const lastEchoRef = useRef(0);
  const petAccumRef = useRef<Record<string, number>>({});

  const [scale, setScale] = useState(0.75);
  const [night, setNight] = useState(false);
  const [profileTree, setProfileTree] = useState<TreeDef | null>(null);
  const [photoMode, setPhotoMode] = useState(false);
  const [welcome, setWelcome] = useState(true);
  const [litLamps, setLitLamps] = useState<Record<string, boolean>>({ "lamp-2": true });
  const [chestFrame, setChestFrame] = useState(0);
  const [chimeFrame, setChimeFrame] = useState(0);
  const [swinging, setSwinging] = useState(false);
  const [windKey, setWindKey] = useState(0);
  const [windOn, setWindOn] = useState(false);
  const [echo, setEcho] = useState<string | null>(null);
  const [orbs, setOrbs] = useState<OrbFx[]>([]);
  const [floats, setFloats] = useState<FloatFx[]>([]);
  const [glowTree, setGlowTree] = useState<string | null>(null);
  const [swayTree, setSwayTree] = useState<string | null>(null);
  const [syncSecs, setSyncSecs] = useState(12);

  // scale the fixed-size stage to fit the viewport (whole forest always visible)
  useEffect(() => {
    const measure = () =>
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setSyncSecs((s) => (s >= 46 ? 8 : s + 1)), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileTree(null);
        setPhotoMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── simulated desktop link ───────────────────────────────────────────────────

  const spawnOrb = useCallback((tree?: TreeDef) => {
    const pool = TREES.filter((t) => t.main);
    const target = tree ?? pool[fxIdRef.current % pool.length] ?? TREES[0]!;
    const id = fxIdRef.current++;
    const claude = id % 2 === 1;
    setOrbs((o) => [
      ...o,
      {
        id,
        tx: target.x,
        ty: target.y - target.h * target.s * 0.62,
        color: claude ? "var(--color-bubble-claude)" : "var(--color-bubble-codex)",
        claude,
      },
    ]);
    window.setTimeout(() => {
      setOrbs((o) => o.filter((x) => x.id !== id));
      setGlowTree(target.id);
      const fid = fxIdRef.current++;
      setFloats((f) => [...f, { id: fid, treeId: target.id, text: claude ? "+1.2M" : "+0.6M" }]);
      setSyncSecs(0);
      window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== fid)), 1900);
      window.setTimeout(() => setGlowTree((g) => (g === target.id ? null : g)), 1400);
    }, 1250);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => {
      if (!document.hidden) spawnOrb();
    }, 10_000);
    return () => window.clearInterval(t);
  }, [reduced, spawnOrb]);

  const triggerEcho = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastEchoRef.current < 3000) return;
    lastEchoRef.current = now;
    setEcho(text);
    window.setTimeout(() => setEcho(null), 2600);
  }, []);

  const onPetMove = useCallback(
    (tree: TreeDef) => (e: React.PointerEvent) => {
      const acc = (petAccumRef.current[tree.id] ?? 0) + Math.abs(e.movementX) + Math.abs(e.movementY);
      if (acc > 150) {
        petAccumRef.current[tree.id] = 0;
        setSwayTree(tree.id);
        window.setTimeout(() => setSwayTree((s) => (s === tree.id ? null : s)), 950);
        triggerEcho(`🌲 桌面上的「${tree.name}」轻轻晃了晃`);
      } else {
        petAccumRef.current[tree.id] = acc;
      }
    },
    [triggerEcho],
  );

  // ── interactive props ───────────────────────────────────────────────────────

  const playChest = useCallback(() => {
    let f = 0;
    const open = window.setInterval(() => {
      f += 1;
      setChestFrame(f);
      if (f >= 3) {
        window.clearInterval(open);
        window.setTimeout(() => {
          const close = window.setInterval(() => {
            f -= 1;
            setChestFrame(f);
            if (f <= 0) window.clearInterval(close);
          }, 90);
        }, 1600);
      }
    }, 90);
    triggerEcho("✨ 宝箱里什么都没有 —— 但被你发现了");
  }, [triggerEcho]);

  const playChime = useCallback(() => {
    let f = 0;
    let loops = 0;
    const t = window.setInterval(() => {
      f = (f + 1) % 7;
      setChimeFrame(f);
      if (f === 0 && ++loops >= 2) {
        window.clearInterval(t);
        setChimeFrame(0);
      }
    }, 90);
  }, []);

  const blowWind = useCallback(() => {
    setWindOn(true);
    setWindKey((k) => k + 1);
    playChime();
    window.setTimeout(() => setWindOn(false), 2600);
  }, [playChime]);

  const focusTree = useCallback((t: TreeDef) => {
    setProfileTree(t);
    setSwayTree(t.id);
    window.setTimeout(() => setSwayTree((s) => (s === t.id ? null : s)), 950);
  }, []);

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`fp-viewport${night ? " fp-night" : ""}`}>
      {/* sky (screen space) */}
      <div className="fp-sky fp-sky-day" aria-hidden>
        <div className="fp-sun" />
        {!reduced &&
          CLOUDS.map((c, i) => (
            <svg
              key={i}
              className="fp-cloud fp-anim"
              style={{ top: c.y, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, transform: `scale(${c.s})` }}
              width="220" height="70" viewBox="0 0 220 70"
            >
              <ellipse cx="60" cy="46" rx="56" ry="22" fill="#ffffff" opacity="0.92" />
              <ellipse cx="120" cy="34" rx="48" ry="26" fill="#ffffff" opacity="0.92" />
              <ellipse cx="170" cy="48" rx="44" ry="18" fill="#ffffff" opacity="0.92" />
            </svg>
          ))}
      </div>
      <div className="fp-sky fp-sky-night" aria-hidden>
        <div className="fp-moon" />
        {STARS.map((s, i) => (
          <span key={i} className="fp-star fp-anim" style={{ left: `${s.l}%`, top: `${s.t}%`, animationDelay: `${s.d}s` }} />
        ))}
      </div>

      {/* stage: fixed 1680×1050 design space, scaled to fit, bottom-anchored */}
      <div className="fp-stage" style={{ transform: `translateX(-50%) scale(${scale})` }}>
        {/* ── the plot: perspective trapezoid field + themed patches + path ── */}
        <svg className="fp-fieldsvg" width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden>
          <defs>
            <linearGradient id="fpGrass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5d9a52" />
              <stop offset="0.5" stopColor="#4d8f4a" />
              <stop offset="1" stopColor="#3f7f40" />
            </linearGradient>
            <pattern id="fpRows" width="64" height="34" patternUnits="userSpaceOnUse" patternTransform="skewX(-16)">
              <rect width="64" height="17" fill="#000000" opacity="0.05" />
              <rect y="17" width="64" height="17" fill="#ffffff" opacity="0.04" />
            </pattern>
          </defs>
          {/* plateau side (soil thickness below the front edge) */}
          <path d={`M ${FIELD.frontL} ${FIELD.frontY} L ${FIELD.frontR} ${FIELD.frontY} L ${FIELD.frontR - 14} ${FIELD.frontY + 42} L ${FIELD.frontL + 14} ${FIELD.frontY + 42} Z`} fill="#5a4028" />
          <path d={`M ${FIELD.frontL + 14} ${FIELD.frontY + 42} L ${FIELD.frontR - 14} ${FIELD.frontY + 42} L ${FIELD.frontR - 30} ${FIELD.frontY + 50} L ${FIELD.frontL + 30} ${FIELD.frontY + 50} Z`} fill="#3c2a1a" />
          {/* field base + subtle farm rows */}
          <path d={`M ${FIELD.backL} ${FIELD.backY} L ${FIELD.backR} ${FIELD.backY} L ${FIELD.frontR} ${FIELD.frontY} L ${FIELD.frontL} ${FIELD.frontY} Z`} fill="url(#fpGrass)" />
          <path d={`M ${FIELD.backL} ${FIELD.backY} L ${FIELD.backR} ${FIELD.backY} L ${FIELD.frontR} ${FIELD.frontY} L ${FIELD.frontL} ${FIELD.frontY} Z`} fill="url(#fpRows)" />
          {/* back edge highlight */}
          <path d={`M ${FIELD.backL} ${FIELD.backY} L ${FIELD.backR} ${FIELD.backY} L ${FIELD.backR + 10} ${FIELD.backY + 14} L ${FIELD.backL - 10} ${FIELD.backY + 14} Z`} fill="#7cb668" opacity="0.9" />
          {/* themed corner patches: snow / sand / shrine moss */}
          <ellipse cx="345" cy="600" rx="255" ry="96" fill="#eef4fa" opacity="0.95" />
          <ellipse cx="255" cy="565" rx="130" ry="52" fill="#ffffff" opacity="0.65" />
          <ellipse cx="1345" cy="600" rx="230" ry="88" fill="#ddb572" opacity="0.95" />
          <ellipse cx="1420" cy="575" rx="110" ry="40" fill="#e8c88a" opacity="0.7" />
          <ellipse cx="1140" cy="720" rx="230" ry="80" fill="#6f9a58" opacity="0.85" />
          <ellipse cx="1140" cy="716" rx="150" ry="52" fill="#f4c8d4" opacity="0.28" />
          <ellipse cx="520" cy="880" rx="250" ry="86" fill="#5d9a52" opacity="0.8" />
          {/* dirt path: gate → center → forks */}
          <path d="M 810 1052 L 870 1052 L 862 900 Q 858 830 890 800 L 1050 745 L 1042 723 L 878 776 Q 836 786 826 850 L 818 900 Z" fill="#a8845a" opacity="0.95" />
          <path d="M 838 812 Q 760 770 668 776 L 560 800 L 556 782 L 662 758 Q 762 750 848 792 Z" fill="#a8845a" opacity="0.9" />
          <path d="M 842 806 Q 828 700 782 652 L 700 600 L 712 585 L 792 636 Q 848 688 860 800 Z" fill="#a8845a" opacity="0.8" />
          <path d="M 818 1046 L 858 1046 L 856 1000 L 822 1000 Z" fill="#c8a06a" opacity="0.6" />
        </svg>

        {/* scattered vegetation (y-sorted with everything else) */}
        {BUSHES.map((b, i) => (
          <svg
            key={i}
            className="fp-veg"
            style={{ left: b.x - b.w / 2, top: b.y - b.w, zIndex: Z(b.y) }}
            width={b.w}
            height={b.w}
            viewBox="0 0 40 40"
            aria-hidden
          >
            {b.kind === "bush" && (
              <>
                <circle cx="14" cy="30" r="10" fill={b.hue} />
                <circle cx="26" cy="28" r="12" fill={b.hue} />
                <circle cx="20" cy="22" r="9" fill="#6fae5c" />
              </>
            )}
            {b.kind === "tuft" && (
              <path d="M8 40 L14 18 L18 40 Z M16 40 L22 10 L28 40 Z M26 40 L33 20 L38 40 Z" fill={b.hue} />
            )}
            {b.kind === "flower" && (
              <>
                <path d="M18 40 L20 24 L22 40 Z" fill="#4d8f4a" />
                <circle cx="20" cy="20" r="6" fill="#f4b8c8" />
                <circle cx="20" cy="20" r="2.4" fill="#c8943c" />
              </>
            )}
            {b.kind === "stone" && (
              <>
                <ellipse cx="20" cy="32" rx="13" ry="8" fill="#9aa4ae" />
                <ellipse cx="16" cy="29" rx="6" ry="4" fill="#c2ccd4" />
              </>
            )}
          </svg>
        ))}

        {/* static decorations */}
        {DECOS.map((d) => {
          const w = (d.nw / d.nh) * d.h;
          return (
            <Image
              key={d.id}
              src={spritePath(d.sprite)}
              alt=""
              width={Math.round(w)}
              height={d.h}
              unoptimized
              loading="eager"
              draggable={false}
              className="fp-sprite"
              style={{
                left: d.x - w / 2,
                top: d.y - d.h,
                zIndex: Z(d.behind ?? d.y),
                transform: d.flip ? "scaleX(-1)" : undefined,
              }}
            />
          );
        })}

        {/* swing (clickable) */}
        <button
          type="button"
          className="fp-prop"
          style={{ left: SWING.x - (90 / 200) * SWING.h * 0.5, top: SWING.y - SWING.h, zIndex: Z(SWING.y) }}
          onClick={() => {
            setSwinging(true);
            window.setTimeout(() => setSwinging(false), 4900);
          }}
          aria-label="秋千"
        >
          <Image
            src={spritePath("Swing")} alt="" width={Math.round((90 / 200) * SWING.h)} height={SWING.h}
            unoptimized loading="eager" draggable={false}
            className={swinging ? "fp-rock" : undefined} style={{ transformOrigin: "50% 8%" }}
          />
        </button>

        {/* stone lamps (toggle light) */}
        {LAMPS.map((l) => {
          const lit = !!litLamps[l.id];
          const w = (100 / 184) * l.h;
          return (
            <button
              key={l.id}
              type="button"
              className="fp-prop"
              style={{ left: l.x - w / 2, top: l.y - l.h, zIndex: Z(l.y) }}
              onClick={() => setLitLamps((s) => ({ ...s, [l.id]: !s[l.id] }))}
              aria-label={lit ? "熄灭石灯" : "点亮石灯"}
            >
              {lit && <span className="fp-lampglow" />}
              <Image
                src={spritePath("StoneLamp_1")} alt="" width={Math.round(w)} height={l.h}
                unoptimized loading="eager" draggable={false}
                style={{ filter: lit ? "brightness(1.25) drop-shadow(0 0 10px rgba(255,200,110,0.9))" : undefined }}
              />
            </button>
          );
        })}

        {/* chest (sheet animation) */}
        <button
          type="button"
          className="fp-prop"
          style={{ left: CHEST.x - (CHEST.fw * CHEST.scale) / 2, top: CHEST.y - CHEST.fh * CHEST.scale, zIndex: Z(CHEST.y) }}
          onClick={() => chestFrame === 0 && playChest()}
          aria-label="宝箱"
        >
          <span
            className="fp-sheet"
            style={{
              width: CHEST.fw * CHEST.scale,
              height: CHEST.fh * CHEST.scale,
              backgroundImage: `url(${spritePath("Chest-sheet")})`,
              backgroundSize: `${436 * CHEST.scale}px ${CHEST.fh * CHEST.scale}px`,
              backgroundPosition: `${-chestFrame * CHEST.fw * CHEST.scale}px 0`,
            }}
          />
        </button>

        {/* wind chime (hangs from the torii beam) */}
        <button
          type="button"
          className="fp-prop"
          style={{ left: CHIME.x - ((CHIME.fw / CHIME.fh) * CHIME.h) / 2, top: CHIME.topAt, zIndex: Z(CHIME.y) }}
          onClick={playChime}
          aria-label="风铃"
        >
          <span
            className="fp-sheet"
            style={{
              width: (CHIME.fw / CHIME.fh) * CHIME.h,
              height: CHIME.h,
              backgroundImage: `url(${spritePath("WindChimes")})`,
              backgroundSize: `${(2359 / 431) * CHIME.h}px ${CHIME.h}px`,
              backgroundPosition: `${-chimeFrame * (CHIME.fw / CHIME.fh) * CHIME.h}px 0`,
            }}
          />
        </button>

        {/* trees (y-sorted; back rows shrink slightly) */}
        {TREES.map((t) => {
          const h = t.h * t.s;
          const w = (t.nw / t.nh) * h;
          const float = floats.find((f) => f.treeId === t.id);
          return (
            <button
              key={t.id}
              type="button"
              className="fp-tree"
              style={{ left: t.x - w / 2, top: t.y - h, width: w, height: h, zIndex: Z(t.y) }}
              onClick={() => setProfileTree(t)}
              onPointerMove={onPetMove(t)}
              aria-label={`${t.kind}「${t.name}」 · 阶段 ${t.roman}`}
            >
              <span className="fp-shadow" style={{ width: w * 0.68, height: Math.max(10, w * 0.13) }} />
              <Image
                src={spritePath(t.sprite)} alt="" width={Math.round(w)} height={Math.round(h)}
                unoptimized loading="eager" draggable={false}
                className={swayTree === t.id ? "fp-sway" : undefined}
                style={{ transformOrigin: "50% 92%" }}
              />
              {glowTree === t.id && <span className="fp-canopyglow" />}
              {float && <span className="fp-float">{float.text}</span>}
              <span className="fp-treetag">{t.name} · {t.roman}</span>
            </button>
          );
        })}

        {/* localized ambient particles + wind bursts */}
        {!reduced &&
          PARTICLES.map(({ em, ps }) => (
            <div key={em.id} className="fp-emitter" style={{ left: em.x, top: em.y, width: em.w, height: em.h }} aria-hidden>
              {ps.map((p, i) => (
                <span
                  key={i}
                  className="fp-fall fp-anim"
                  style={
                    {
                      left: `${p.left * 100}%`,
                      width: p.size,
                      height: p.size,
                      background: p.color,
                      "--sw": `${p.sway}px`,
                      "--fh": `${em.h}px`,
                      animationDuration: `${p.dur}s`,
                      animationDelay: `${p.delay}s`,
                    } as React.CSSProperties
                  }
                />
              ))}
              {windOn && (
                <span key={windKey} className="fp-gustwrap">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span
                      key={i}
                      className="fp-gust"
                      style={{
                        left: `${(i * 11) % 55}%`,
                        top: `${20 + ((i * 17) % 55)}%`,
                        background: em.colors[i % em.colors.length],
                        animationDelay: `${(i % 4) * 0.12}s`,
                      }}
                    />
                  ))}
                </span>
              )}
            </div>
          ))}

        {/* energy orbs fly to the tree inside stage space */}
        {orbs.map((o) => (
          <span
            key={o.id}
            className="fp-orb"
            style={
              {
                left: 840,
                top: STAGE_H - 12,
                background: o.color,
                boxShadow: `0 0 12px 4px ${o.claude ? "rgba(217,119,87,0.55)" : "rgba(16,163,127,0.5)"}`,
                "--dx": `${o.tx - 840}px`,
                "--dy": `${o.ty - (STAGE_H - 12)}px`,
              } as React.CSSProperties
            }
            aria-hidden
          />
        ))}

        {/* night dims the plot slightly (lamps carry the mood) */}
        <div className="fp-nightveil" aria-hidden />
      </div>

      {/* ── HUD (screen space) ── */}
      {!photoMode && (
        <>
          <div className="fp-hud fp-hud-tl">
            <div className="fp-brand">TOKEN FOREST</div>
            <div className="fp-forestname">Ethan 的森林</div>
            <div className="fp-syncline">
              <span className="fp-dot" /> 桌面在线(模拟) · 最近同步 {syncSecs} 秒前
            </div>
          </div>

          <div className="fp-hud fp-hud-tr">
            <button type="button" className="fp-btn" onClick={blowWind}>🌬 吹风</button>
            <button type="button" className="fp-btn" onClick={() => spawnOrb()}>⚡ 模拟桌面收取</button>
            <button type="button" className="fp-btn" onClick={() => setNight((n) => !n)}>
              {night ? "☀ 白天" : "🌙 夜晚"}
            </button>
            <button type="button" className="fp-btn" onClick={() => setPhotoMode(true)}>📷 拍照</button>
          </div>

          <div className="fp-hud fp-hud-bc">
            {TREES.filter((t) => t.main).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`fp-pill${profileTree?.id === t.id ? " fp-pill-on" : ""}`}
                onClick={() => focusTree(t)}
              >
                {t.emoji} {t.name}
              </button>
            ))}
          </div>

          <div className="fp-hud fp-hud-br">概念原型 v2 · 单屏农场式 · 假数据</div>
        </>
      )}

      {photoMode && <div className="fp-photohint">拍照模式 · 按 ESC 退出</div>}
      {echo && <div className="fp-echo">{echo}</div>}

      {/* ── tree profile card ── */}
      {profileTree && (
        <div className="fp-card" role="dialog" aria-label={`${profileTree.name} 的档案`}>
          <div className="fp-card-head">
            <span className="fp-card-title">{profileTree.emoji} {profileTree.name}</span>
            <span className="fp-card-stage">阶段 {profileTree.roman}</span>
            <button type="button" className="fp-card-x" onClick={() => setProfileTree(null)} aria-label="关闭">✕</button>
          </div>
          <div className="fp-card-rows">
            <div><span>树种</span><b>{profileTree.kind}{profileTree.main ? " · 主树" : ""}</b></div>
            <div><span>种下</span><b>{profileTree.planted} · {profileTree.days} 天</b></div>
            <div><span>累计成长</span><b>{profileTree.tokens} tokens</b></div>
            <div><span>下一阶段</span><b>{profileTree.next}</b></div>
            <div><span>最近成长</span><b>{profileTree.recent}</b></div>
          </div>
          <div className="fp-card-eco">🌿 {profileTree.eco}</div>
          <div className="fp-card-note">精确模型 / 会话 / 项目统计只在桌面 Dashboard,不随森林同步上传。</div>
        </div>
      )}

      {/* ── welcome-back summary (vision §9.4) ── */}
      {welcome && (
        <div className="fp-scrim">
          <div className="fp-welcome">
            <div className="fp-welcome-title">欢迎回来 🌲</div>
            <p>你离开的 5 天里:</p>
            <ul>
              <li>🍎 「老苹果」进入了第 VIII 阶段</li>
              <li>🏮 神社角的两盏石灯亮了一整晚</li>
              <li>❄️ 雪角下了第一场雪,雪地上有脚印</li>
            </ul>
            <button type="button" className="fp-btn fp-btn-lg" onClick={() => setWelcome(false)}>
              进入森林
            </button>
            <div className="fp-welcome-note">概念原型 v2:所有树种在同一块林地 · 数据为演示</div>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────────

const CSS = `
.fp-viewport {
  position: fixed; inset: 0; overflow: hidden; user-select: none; -webkit-user-select: none;
  overscroll-behavior: none; font-family: var(--font-body); background: #0a0f14;
}
.fp-sky { position: absolute; inset: 0; transition: opacity .9s ease; }
.fp-sky-day { background: linear-gradient(180deg, #8fb8d0 0%, #c4dce8 55%, #dfe8d8 100%); opacity: 1; }
.fp-sky-night { background: linear-gradient(180deg, #070d1c 0%, #122038 55%, #1e3350 100%); opacity: 0; }
.fp-night .fp-sky-day { opacity: 0; }
.fp-night .fp-sky-night { opacity: 1; }
.fp-sun {
  position: absolute; left: 12%; top: 9%; width: 84px; height: 84px; border-radius: 50%;
  background: #fff3c8; box-shadow: 0 0 64px 24px rgba(255,240,190,0.6);
}
.fp-moon {
  position: absolute; left: 78%; top: 8%; width: 64px; height: 64px; border-radius: 50%;
  background: #f2f4e8; box-shadow: inset -14px -8px 0 rgba(160,170,150,0.45), 0 0 44px 14px rgba(220,230,255,0.28);
}
.fp-star { position: absolute; width: 3px; height: 3px; background: #dfe8ff; animation: fp-twinkle 2.6s ease-in-out infinite; }
.fp-cloud { position: absolute; left: -240px; animation-name: fp-cloud; animation-timing-function: linear; animation-iteration-count: infinite; }
.fp-night .fp-cloud { opacity: .18; }

.fp-stage {
  position: absolute; left: 50%; bottom: 0; width: ${STAGE_W}px; height: ${STAGE_H}px;
  transform-origin: 50% 100%;
}
.fp-fieldsvg { position: absolute; left: 0; top: 0; z-index: 0; }
.fp-night .fp-fieldsvg { filter: brightness(.62) saturate(.85); }
.fp-nightveil { position: absolute; inset: 0; z-index: 2000; pointer-events: none; background: rgba(10,18,40,0); transition: background .9s ease; }
.fp-night .fp-nightveil { background: rgba(10,18,40,.18); }

.fp-veg { position: absolute; pointer-events: none; }
.fp-night .fp-veg { filter: brightness(.66); }
.fp-sprite { position: absolute; image-rendering: pixelated; pointer-events: none; }
.fp-night .fp-sprite, .fp-night .fp-tree img, .fp-night .fp-prop img, .fp-night .fp-sheet { filter: brightness(.72); }
.fp-night .fp-prop img[style*="drop-shadow"] { filter: brightness(1.2) drop-shadow(0 0 12px rgba(255,200,110,0.95)); }
.fp-prop { position: absolute; background: none; border: none; padding: 0; cursor: pointer; image-rendering: pixelated; }
.fp-prop:focus-visible, .fp-tree:focus-visible { outline: 2px solid var(--color-leaf-light); outline-offset: 3px; }
.fp-prop img, .fp-tree img { image-rendering: pixelated; display: block; position: relative; }
.fp-sheet { display: block; image-rendering: pixelated; background-repeat: no-repeat; }
.fp-tree { position: absolute; background: none; border: none; padding: 0; cursor: pointer; }
.fp-shadow {
  position: absolute; left: 50%; bottom: -4px; transform: translateX(-50%);
  background: radial-gradient(ellipse, rgba(20,30,20,.36) 0%, rgba(20,30,20,0) 70%); border-radius: 50%;
}
.fp-treetag {
  position: absolute; left: 50%; top: -8px; transform: translateX(-50%);
  font-family: var(--font-body); font-size: 15px; font-weight: 500; letter-spacing: .04em;
  color: #fff; background: rgba(20,28,22,.72); border: 1px solid rgba(255,255,255,.22);
  padding: 2px 9px; border-radius: 2px; opacity: 0; transition: opacity .18s; pointer-events: none; white-space: nowrap;
}
.fp-tree:hover .fp-treetag, .fp-tree:focus-visible .fp-treetag { opacity: 1; }
.fp-sway img, img.fp-sway { animation: fp-sway .9s ease-in-out; }
.fp-sway { animation: fp-sway .9s ease-in-out; }
.fp-canopyglow {
  position: absolute; left: 50%; top: 22%; width: 74%; height: 48%; transform: translateX(-50%);
  border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(255,235,150,.55) 0%, rgba(255,235,150,0) 68%);
  animation: fp-pulse .5s ease-in-out 3;
}
.fp-float {
  position: absolute; left: 50%; top: 4%; transform: translateX(-50%);
  font-family: var(--font-pixel); font-size: 17px; color: #ffe9a8;
  text-shadow: 2px 2px 0 rgba(0,0,0,.5); animation: fp-float 1.8s ease-out forwards; pointer-events: none;
}
.fp-lampglow {
  position: absolute; left: 50%; bottom: 40%; width: 210px; height: 210px; transform: translateX(-50%);
  border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(255,196,110,.5) 0%, rgba(255,196,110,0) 66%);
}
.fp-night .fp-lampglow { background: radial-gradient(circle, rgba(255,196,110,.72) 0%, rgba(255,196,110,0) 70%); }
.fp-emitter { position: absolute; pointer-events: none; overflow: hidden; z-index: 1500; }
.fp-fall { position: absolute; top: -6px; border-radius: 1px; animation-name: fp-fall; animation-timing-function: linear; animation-iteration-count: infinite; }
.fp-gustwrap { position: absolute; inset: 0; }
.fp-gust { position: absolute; width: 5px; height: 5px; border-radius: 1px; opacity: 0; animation: fp-gust 2.1s ease-out forwards; }
.fp-orb { position: absolute; width: 15px; height: 15px; border-radius: 50%; z-index: 1900; pointer-events: none; animation: fp-orb 1.25s cubic-bezier(.3,.1,.3,1) forwards; }

.fp-hud { position: absolute; z-index: 5000; font-family: var(--font-body); }
.fp-hud-tl {
  left: 16px; top: 14px; padding: 10px 14px; color: var(--color-text-cream);
  background: rgba(27,42,34,.88); border: 2px solid #0e1712; border-radius: var(--radius-pixel); box-shadow: var(--shadow-pixel);
}
.fp-brand { font-family: var(--font-brand); font-size: 9px; letter-spacing: .12em; color: var(--color-accent-gold-light); }
.fp-forestname { font-size: 16px; font-weight: 700; margin-top: 4px; }
.fp-syncline { font-size: 11.5px; margin-top: 4px; color: var(--color-text-muted-dark); display: flex; align-items: center; gap: 6px; }
.fp-dot { width: 7px; height: 7px; border-radius: 50%; background: #7bd88f; box-shadow: 0 0 6px 1px rgba(123,216,143,.8); }
.fp-hud-tr { right: 16px; top: 14px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 52vw; }
.fp-btn {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 500; cursor: pointer;
  color: var(--color-text-cream); background: rgba(27,42,34,.88);
  border: 2px solid #0e1712; border-radius: var(--radius-pixel); box-shadow: var(--shadow-pixel-sm);
  padding: 7px 11px; transition: transform .08s, background .12s;
}
.fp-btn:hover { background: rgba(42,62,50,.92); }
.fp-btn:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 rgb(0 0 0 / 30%); }
.fp-btn-lg { font-size: 14.5px; padding: 10px 22px; background: var(--color-leaf-deep); border-color: #1d3f24; }
.fp-btn-lg:hover { background: #468a51; }
.fp-hud-bc { left: 50%; bottom: 16px; transform: translateX(-50%); display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.fp-pill {
  font-family: var(--font-body); font-size: 12.5px; cursor: pointer; color: var(--color-text-cream);
  background: rgba(27,42,34,.85); border: 2px solid #0e1712; border-radius: 999px; padding: 7px 13px;
  box-shadow: var(--shadow-pixel-sm); transition: background .12s;
}
.fp-pill:hover { background: rgba(42,62,50,.92); }
.fp-pill-on { background: var(--color-leaf-deep); border-color: #1d3f24; font-weight: 700; }
.fp-hud-br { right: 14px; bottom: 14px; font-size: 11px; color: rgba(255,255,255,.75); background: rgba(20,26,22,.6); padding: 5px 9px; border-radius: 2px; }
.fp-photohint { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 5000; font-size: 12px; color: rgba(255,255,255,.85); background: rgba(20,26,22,.55); padding: 6px 12px; border-radius: 2px; font-family: var(--font-body); }
.fp-echo {
  position: absolute; left: 50%; top: 18px; transform: translateX(-50%); z-index: 6000;
  font-family: var(--font-body); font-size: 13px; font-weight: 500; color: #1e2521;
  background: var(--color-surface-parchment); border: 2px solid var(--color-soil);
  border-radius: var(--radius-pixel); box-shadow: var(--shadow-pixel); padding: 9px 16px;
  animation: fp-pop .22s ease-out;
}

.fp-card {
  position: absolute; left: 16px; bottom: 16px; z-index: 5500; width: min(340px, calc(100vw - 32px));
  background: var(--color-surface-parchment); border: 3px solid var(--color-soil);
  border-radius: var(--radius-pixel); box-shadow: var(--shadow-pixel-lg); padding: 14px 16px;
  color: var(--color-text-forest); animation: fp-pop .2s ease-out;
}
.fp-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.fp-card-title { font-size: 17px; font-weight: 700; }
.fp-card-stage { font-family: var(--font-pixel); font-size: 10px; color: var(--color-accent-gold); border: 1.5px solid var(--color-accent-gold); padding: 3px 7px; border-radius: 2px; }
.fp-card-x { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 14px; color: var(--color-text-muted-light); padding: 4px; }
.fp-card-rows { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.fp-card-rows > div { display: flex; justify-content: space-between; gap: 12px; }
.fp-card-rows span { color: var(--color-text-muted-light); }
.fp-card-eco { margin-top: 10px; font-size: 12.5px; background: rgba(58,125,68,.12); border-left: 3px solid var(--color-leaf-deep); padding: 7px 9px; }
.fp-card-note { margin-top: 9px; font-size: 11px; color: var(--color-text-muted-light); line-height: 1.5; }

.fp-scrim { position: absolute; inset: 0; z-index: 7000; background: rgba(8,15,12,.55); display: flex; align-items: center; justify-content: center; padding: 20px; }
.fp-welcome {
  width: min(430px, 92vw); background: var(--color-surface-parchment); color: var(--color-text-forest);
  border: 3px solid var(--color-soil); border-radius: var(--radius-pixel); box-shadow: var(--shadow-pixel-lg);
  padding: 22px 24px; text-align: center; animation: fp-pop .25s ease-out;
}
.fp-welcome-title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
.fp-welcome p { font-size: 13.5px; margin-bottom: 8px; }
.fp-welcome ul { text-align: left; font-size: 13.5px; line-height: 2; margin: 0 auto 16px; max-width: 320px; }
.fp-welcome-note { margin-top: 12px; font-size: 11px; color: var(--color-text-muted-light); }

@keyframes fp-fall {
  0% { transform: translate3d(0,0,0) rotate(0deg); opacity: 0; }
  8% { opacity: .95; }
  50% { transform: translate3d(var(--sw,24px),calc(var(--fh,300px) * .5),0) rotate(160deg); }
  96% { opacity: .9; }
  100% { transform: translate3d(calc(var(--sw,24px) * -0.4),var(--fh,300px),0) rotate(320deg); opacity: 0; }
}
@keyframes fp-gust { 0% { transform: translate3d(0,0,0); opacity: 0; } 10% { opacity: .95; } 100% { transform: translate3d(46vw,7vh,0); opacity: 0; } }
@keyframes fp-twinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes fp-cloud { 0% { left: -240px; } 100% { left: 100%; } }
@keyframes fp-sway { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-1.6deg); } 60% { transform: rotate(1.9deg); } 85% { transform: rotate(-.8deg); } }
@keyframes fp-pulse { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes fp-float { 0% { transform: translate(-50%,0); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(-50%,-52px); opacity: 0; } }
@keyframes fp-orb { 0% { transform: translate(0,0) scale(.7); opacity: .4; } 12% { opacity: 1; } 100% { transform: translate(var(--dx),var(--dy)) scale(1.05); opacity: .95; } }
@keyframes fp-rock { 0%,100% { transform: rotate(0); } 30% { transform: rotate(7deg); } 70% { transform: rotate(-7deg); } }
.fp-rock { animation: fp-rock 2.4s ease-in-out 2; }
@keyframes fp-pop { 0% { transform: scale(.86); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.fp-card, .fp-welcome, .fp-echo { transform-origin: 50% 100%; }

@media (max-width: 720px) {
  .fp-hud-tl { padding: 8px 10px; }
  .fp-forestname { font-size: 14px; }
  .fp-hud-tr { max-width: 62vw; gap: 6px; }
  .fp-btn { font-size: 11.5px; padding: 6px 8px; }
  .fp-pill { font-size: 11.5px; padding: 6px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .fp-anim, .fp-sway, .fp-rock, .fp-canopyglow, .fp-orb { animation: none !important; }
}
`;
