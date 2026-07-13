"use client";

/**
 * Web Forest concept prototype (docs/WEB_FOREST_PRODUCT_VISION.md §20.2).
 *
 * A horizontally explorable 2.5D pixel forest: four biomes, parallax layers,
 * the real tree/decoration sprites, biome particles, and a simulated desktop
 * link (energy orbs, pet-the-tree echo). Everything is fake data + local
 * state — no backend, no auth, no sync. Camera moves imperatively (refs, not
 * React state) so dragging stays smooth.
 *
 * Deliberately self-contained: all styles live in the <style> block below and
 * nothing outside app/forest-preview/ depends on this file.
 */

import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// ── World constants ────────────────────────────────────────────────────────────

const BIOME_W = 1500;
const WORLD_W = BIOME_W * 4;
const GROUND_H = 128;

type BiomeId = "apple" | "cherry" | "cactus" | "christmas";

interface BiomeDef {
  id: BiomeId;
  name: string;
  emoji: string;
  x: number; // world-space left edge
  sky: [string, string, string]; // top / mid / horizon
  groundTop: string;
  groundEdge: string;
}

const BIOMES: BiomeDef[] = [
  {
    id: "apple",
    name: "苹果果园",
    emoji: "🍎",
    x: 0,
    sky: ["#8fb8d0", "#c4dce8", "#e8d5a8"],
    groundTop: "#4d8f4a",
    groundEdge: "#6fae5c",
  },
  {
    id: "cherry",
    name: "樱花神社",
    emoji: "🌸",
    x: BIOME_W,
    sky: ["#5a5480", "#c98a96", "#f2d4b8"],
    groundTop: "#5f8f56",
    groundEdge: "#8fae72",
  },
  {
    id: "cactus",
    name: "仙人掌峡谷",
    emoji: "🌵",
    x: BIOME_W * 2,
    sky: ["#4a2c4d", "#c96a4a", "#f0b878"],
    groundTop: "#d0a05e",
    groundEdge: "#e0bc7e",
  },
  {
    id: "christmas",
    name: "冬日林地",
    emoji: "🎄",
    x: BIOME_W * 3,
    sky: ["#070d1c", "#122038", "#28405c"],
    groundTop: "#dfe8f2",
    groundEdge: "#f4f8fc",
  },
];

const biomeCenter = (b: BiomeDef) => b.x + BIOME_W / 2;

// ── Fake tree data (vision §9.2 tree profile fields) ───────────────────────────

interface TreeDef {
  id: string;
  biome: BiomeId;
  sprite: string;
  nw: number; // natural sprite size
  nh: number;
  h: number; // display height
  x: number; // world-space center of the trunk
  lift: number; // px the sprite's visual foot sits above its bounding box
  main?: boolean;
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
    id: "apple-main", biome: "apple", sprite: "AppleTree_8", nw: 759, nh: 823, h: 380, x: 770,
    lift: 18, main: true, name: "老苹果", kind: "苹果树", roman: "VIII", planted: "2026-04-21",
    days: 83, tokens: "93.4M", next: "已长满 🏆", recent: "2 小时前 · +1.2M",
    eco: "果园的篱笆修好了,鸟开始清晨来访",
  },
  {
    id: "apple-young", biome: "apple", sprite: "AppleTree_4", nw: 759, nh: 823, h: 216, x: 420,
    lift: 10, name: "小果", kind: "苹果树", roman: "IV", planted: "2026-06-30", days: 13,
    tokens: "6.8M", next: "距 V 阶段还需 3.2M", recent: "26 分钟前 · +0.4M",
    eco: "树下长出了第一丛白花",
  },
  {
    id: "cherry-main", biome: "cherry", sprite: "CherryTree_8", nw: 759, nh: 729, h: 348, x: 2330,
    lift: 16, main: true, name: "宵樱", kind: "樱花树", roman: "VIII", planted: "2026-05-02",
    days: 72, tokens: "271.5M", next: "已长满 🏆", recent: "昨天 · +3.1M",
    eco: "石灯点亮后,萤火虫多了起来",
  },
  {
    id: "cherry-young", biome: "cherry", sprite: "CherryTree_3", nw: 759, nh: 729, h: 190, x: 2030,
    lift: 9, name: "初瓣", kind: "樱花树", roman: "III", planted: "2026-07-01", days: 12,
    tokens: "5.1M", next: "距 IV 阶段还需 6.9M", recent: "1 小时前 · +0.2M",
    eco: "花瓣落进了小溪",
  },
  {
    id: "cactus-main", biome: "cactus", sprite: "Cactus_8", nw: 600, nh: 600, h: 285, x: 3815,
    lift: 12, main: true, name: "峡谷卫兵", kind: "仙人掌", roman: "VIII", planted: "2026-05-16",
    days: 58, tokens: "364.0M", next: "已长满 🏆", recent: "3 天前 · +0.9M",
    eco: "日落时会有滚草路过",
  },
  {
    id: "cactus-young", biome: "cactus", sprite: "Cactus_4", nw: 600, nh: 600, h: 150, x: 3540,
    lift: 7, name: "小刺", kind: "仙人掌", roman: "IV", planted: "2026-06-18", days: 25,
    tokens: "18.3M", next: "距 V 阶段还需 21.7M", recent: "5 小时前 · +0.6M",
    eco: "石缝里开了一朵沙漠花",
  },
  {
    id: "christmas-main", biome: "christmas", sprite: "ChristmasTree_8", nw: 698, nh: 1214, h: 430,
    x: 5345, lift: 14, main: true, name: "极夜星", kind: "圣诞树", roman: "VIII",
    planted: "2026-05-30", days: 44, tokens: "452.8M", next: "已长满 🏆",
    recent: "昨晚 · +2.4M", eco: "雪停的晚上能看到流星",
  },
  {
    id: "christmas-young", biome: "christmas", sprite: "ChristmasTree_4", nw: 698, nh: 1214,
    h: 225, x: 5030, lift: 8, name: "小雪杉", kind: "圣诞树", roman: "IV",
    planted: "2026-06-25", days: 18, tokens: "22.6M", next: "距 V 阶段还需 27.4M",
    recent: "40 分钟前 · +0.5M", eco: "树梢挂上了第一颗星",
  },
];

// ── Static decorations (existing sprites) ──────────────────────────────────────

interface DecoDef {
  id: string;
  sprite: string;
  nw: number;
  nh: number;
  h: number;
  x: number;
  bottom: number; // offset above ground top (negative = tucked into ground)
  z: number;
  flip?: boolean;
}

const DECOS: DecoDef[] = [
  // apple orchard
  { id: "fence-a1", sprite: "Fence", nw: 193, nh: 67, h: 56, x: 180, bottom: -4, z: 4 },
  { id: "fence-a2", sprite: "Fence", nw: 193, nh: 67, h: 56, x: 1010, bottom: -4, z: 4 },
  { id: "fence-a3", sprite: "Fence", nw: 193, nh: 67, h: 56, x: 1160, bottom: -4, z: 4 },
  { id: "basket", sprite: "Basket", nw: 86, nh: 60, h: 50, x: 900, bottom: -2, z: 5 },
  // cherry shrine
  { id: "torii", sprite: "Torii", nw: 780, nh: 674, h: 306, x: 2180, bottom: -6, z: 1 },
  { id: "bfence-c1", sprite: "BambooFence", nw: 193, nh: 65, h: 54, x: 1720, bottom: -4, z: 4 },
  { id: "bfence-c2", sprite: "BambooFence", nw: 193, nh: 65, h: 54, x: 2700, bottom: -4, z: 4 },
  // cactus canyon
  { id: "bfence-x1", sprite: "BrokenFence", nw: 193, nh: 63, h: 52, x: 3585, bottom: -4, z: 4 },
  { id: "bfence-x2", sprite: "BrokenFence", nw: 193, nh: 63, h: 52, x: 3990, bottom: -4, z: 4, flip: true },
  // winter woodland
  { id: "fence-w1", sprite: "Fence", nw: 193, nh: 67, h: 56, x: 4890, bottom: -4, z: 4 },
  { id: "fence-w2", sprite: "Fence", nw: 193, nh: 67, h: 56, x: 5520, bottom: -4, z: 4 },
];

// Interactive prop positions
const LAMPS = [
  { id: "lamp-c1", x: 1950, h: 142 },
  { id: "lamp-c2", x: 2580, h: 142 },
  { id: "lamp-w1", x: 5170, h: 142 },
];
const SWING = { x: 615, h: 172 };
const CHEST = { x: 1085, fw: 109, fh: 102, scale: 1.15 };
const CHIME = { x: 2120, fw: 337, fh: 431, h: 112, hang: 118 }; // 挂在鸟居横梁下、避开树冠

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

interface Particle {
  left: number; // 0..1 within biome
  delay: number;
  dur: number;
  size: number;
  sway: number;
  color: string;
  kind: "fall" | "dust";
}

const PARTICLE_STYLES: Record<BiomeId, { colors: string[]; count: number; kind: "fall" | "dust" }> = {
  apple: { colors: ["#7fae5c", "#5d8f4a", "#c8943c"], count: 5, kind: "fall" },
  cherry: { colors: ["#f4b8c8", "#eda3b8", "#f9d2dc"], count: 10, kind: "fall" },
  cactus: { colors: ["#e0bc7e", "#d0a05e"], count: 6, kind: "dust" },
  christmas: { colors: ["#ffffff", "#dfe8f2"], count: 13, kind: "fall" },
};

const PARTICLES: Record<BiomeId, Particle[]> = (() => {
  const out = {} as Record<BiomeId, Particle[]>;
  BIOMES.forEach((b, bi) => {
    const rnd = mulberry32(1000 + bi * 77);
    const spec = PARTICLE_STYLES[b.id];
    out[b.id] = Array.from({ length: spec.count }, () => ({
      left: 0.05 + rnd() * 0.9,
      delay: -rnd() * 14,
      dur: spec.kind === "dust" ? 3.5 + rnd() * 3 : 9 + rnd() * 7,
      size: spec.kind === "dust" ? 2 : 3 + Math.round(rnd() * 3),
      sway: 18 + rnd() * 46,
      color: spec.colors[Math.floor(rnd() * spec.colors.length)] ?? spec.colors[0]!,
      kind: spec.kind,
    }));
  });
  return out;
})();

// Ground tufts (foreground parallax layer)
const TUFTS: { x: number; hue: string; w: number }[] = (() => {
  const rnd = mulberry32(4242);
  const hues: Record<BiomeId, string[]> = {
    apple: ["#3f7a3c", "#579448"],
    cherry: ["#4f7a48", "#7a9458"],
    cactus: ["#a87c48", "#8a6238"],
    christmas: ["#c8d6e6", "#aebfd4"],
  };
  const list: { x: number; hue: string; w: number }[] = [];
  BIOMES.forEach((b) => {
    for (let i = 0; i < 4; i++) {
      const cs = hues[b.id];
      list.push({
        x: b.x + 120 + rnd() * (BIOME_W - 240),
        hue: cs[Math.floor(rnd() * cs.length)] ?? cs[0]!,
        w: 34 + rnd() * 26,
      });
    }
  });
  return list;
})();

// Stars for the winter night sky
const STARS: { l: number; t: number; d: number }[] = (() => {
  const rnd = mulberry32(99);
  return Array.from({ length: 34 }, () => ({
    l: rnd() * 100,
    t: rnd() * 52,
    d: rnd() * 3,
  }));
})();

// ── Far / mid silhouette SVGs (procedural stand-in art, palette from sprites) ──

function FarScenery({ biome }: { biome: BiomeId }) {
  const w = 1360;
  const h = 300;
  if (biome === "apple") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <path d="M0 300 L0 208 L120 168 L260 196 L420 130 L560 178 L700 150 L860 196 L1020 148 L1180 186 L1360 160 L1360 300 Z" fill="#7fa06a" opacity="0.75" />
        <path d="M0 300 L0 244 L180 214 L340 238 L520 200 L700 232 L880 206 L1060 240 L1240 214 L1360 232 L1360 300 Z" fill="#5d8757" opacity="0.85" />
      </svg>
    );
  }
  if (biome === "cherry") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <path d="M0 300 L0 250 L200 216 L400 248 L1360 262 L1360 300 Z" fill="#6d6584" opacity="0.7" />
        <path d="M480 300 L680 96 L744 96 L940 300 Z" fill="#8a7f9e" />
        <path d="M652 128 L680 96 L744 96 L772 128 L744 142 L712 122 L684 144 Z" fill="#ece6f2" />
        <rect x="0" y="238" width={w} height="26" fill="#cbb8c8" opacity="0.45" />
      </svg>
    );
  }
  if (biome === "cactus") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <path d="M60 300 L60 170 L90 140 L250 140 L280 170 L280 300 Z" fill="#b06848" />
        <path d="M420 300 L420 120 L450 92 L640 92 L670 120 L670 300 Z" fill="#8a4e3c" />
        <path d="M900 300 L900 156 L930 128 L1120 128 L1150 156 L1150 300 Z" fill="#a05a40" />
        <rect x="0" y="252" width={w} height="48" fill="#6e3d33" opacity="0.85" />
      </svg>
    );
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d="M0 300 L0 230 Q170 176 340 226 Q510 270 680 226 Q850 180 1020 228 Q1190 268 1360 224 L1360 300 Z" fill="#ccd8e8" opacity="0.5" />
      <path d="M40 300 L110 190 L180 300 Z M200 300 L286 150 L372 300 Z M400 300 L470 206 L540 300 Z M980 300 L1066 148 L1152 300 Z M1180 300 L1250 200 L1320 300 Z" fill="#1d3145" />
      <path d="M600 300 L690 170 L780 300 Z M800 300 L870 216 L940 300 Z" fill="#16263a" />
    </svg>
  );
}

function MidScenery({ biome }: { biome: BiomeId }) {
  const w = 1360;
  const h = 170;
  if (biome === "apple") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        {[70, 300, 540, 800, 1060, 1270].map((cx, i) => (
          <g key={i} fill={i % 2 ? "#345c33" : "#3f6f3d"}>
            <rect x={cx - 7} y={112} width={14} height={40} fill="#4e3a26" />
            <circle cx={cx} cy={86} r={44} />
            <circle cx={cx - 30} cy={104} r={30} />
            <circle cx={cx + 30} cy={104} r={30} />
          </g>
        ))}
      </svg>
    );
  }
  if (biome === "cherry") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <path d="M180 170 L180 120 L150 120 L260 62 L370 120 L340 120 L340 170 Z" fill="#4a3350" />
        {[520, 760, 1020, 1240].map((cx, i) => (
          <g key={i} fill={i % 2 ? "#7a4a62" : "#8f5a72"}>
            <rect x={cx - 6} y={116} width={12} height={36} fill="#4e3a3a" />
            <circle cx={cx} cy={92} r={38} />
            <circle cx={cx - 26} cy={108} r={26} />
            <circle cx={cx + 26} cy={108} r={26} />
          </g>
        ))}
      </svg>
    );
  }
  if (biome === "cactus") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <path d="M120 170 L120 96 L146 70 L200 70 L226 96 L226 170 Z" fill="#5e3a30" />
        <path d="M1120 170 L1120 110 L1150 84 L1230 84 L1258 110 L1258 170 Z" fill="#5e3a30" />
        {[420, 660, 920].map((cx, i) => (
          <g key={i} fill="#4e5e38">
            <rect x={cx - 9} y={78} width={18} height={92} rx={6} />
            <rect x={cx - 34} y={96} width={12} height={34} rx={5} />
            <rect x={cx - 34} y={96} width={26} height={12} rx={5} />
            <rect x={cx + 22} y={110} width={12} height={30} rx={5} />
            <rect x={cx + 8} y={110} width={26} height={12} rx={5} />
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {[100, 320, 560, 820, 1080, 1280].map((cx, i) => (
        <g key={i}>
          <path d={`M${cx - 66} 170 L${cx} ${i % 2 ? 34 : 56} L${cx + 66} 170 Z`} fill="#0f1c2c" />
          <path d={`M${cx - 40} 118 L${cx} ${i % 2 ? 72 : 90} L${cx + 40} 118 Z`} fill="#22384e" opacity="0.8" />
        </g>
      ))}
    </svg>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const spritePath = (name: string) => `/sprites/${name}.png`;

interface OrbFx {
  id: number;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  color: string;
}
interface FloatFx {
  id: number;
  treeId: string;
  text: string;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ForestScene() {
  const reduced = usePrefersReducedMotion();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const layersRef = useRef<{ el: HTMLElement; f: number }[]>([]);
  const skyRefs = useRef<Map<BiomeId, HTMLElement>>(new Map());
  const camRef = useRef(0);
  const vwRef = useRef(1200);
  const vhRef = useRef(800);
  const panAnimRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startCam: number; lastX: number; v: number } | null>(null);
  const activeBiomeRef = useRef<BiomeId>("apple");
  const lastEchoRef = useRef(0);
  const petAccumRef = useRef<Record<string, number>>({});
  const fxIdRef = useRef(1);

  const [activeBiome, setActiveBiome] = useState<BiomeId>("apple");
  const [profileTree, setProfileTree] = useState<TreeDef | null>(null);
  const [photoMode, setPhotoMode] = useState(false);
  const [welcome, setWelcome] = useState(true);
  const [litLamps, setLitLamps] = useState<Record<string, boolean>>({ "lamp-w1": true });
  const [chestFrame, setChestFrame] = useState(0);
  const [chimeFrame, setChimeFrame] = useState(0);
  const [swinging, setSwinging] = useState(false);
  const [windBiome, setWindBiome] = useState<BiomeId | null>(null);
  const [windKey, setWindKey] = useState(0);
  const [echo, setEcho] = useState<string | null>(null);
  const [orbs, setOrbs] = useState<OrbFx[]>([]);
  const [floats, setFloats] = useState<FloatFx[]>([]);
  const [glowTree, setGlowTree] = useState<string | null>(null);
  const [swayTree, setSwayTree] = useState<string | null>(null);
  const [syncSecs, setSyncSecs] = useState(12);

  // ── camera ───────────────────────────────────────────────────────────────────

  const applyCam = useCallback((x: number) => {
    const vw = vwRef.current;
    const cam = clamp(x, 0, WORLD_W - vw);
    camRef.current = cam;
    layersRef.current.forEach(({ el, f }) => {
      el.style.transform = `translate3d(${-cam * f + (1 - f) * vw * 0.5}px, 0, 0)`;
    });
    // sky cross-fade by which biome the viewport center sits in. Narrow the
    // blend window (×1.7) so biome centers read pure and only borders mix,
    // then normalize so overlapping panes never sum below 1 (no dark seams).
    const p = clamp((cam + vw / 2) / BIOME_W - 0.5, 0, 3);
    const raw = BIOMES.map((_b, i) => Math.max(0, 1 - Math.abs(p - i) * 1.7));
    const sum = raw.reduce((a, v) => a + v, 0) || 1;
    BIOMES.forEach((b, i) => {
      const el = skyRefs.current.get(b.id);
      if (el) el.style.opacity = String((raw[i] ?? 0) / sum);
    });
    const nearest = BIOMES[Math.round(p)] ?? BIOMES[0]!;
    if (nearest.id !== activeBiomeRef.current) {
      activeBiomeRef.current = nearest.id;
      setActiveBiome(nearest.id);
    }
  }, []);

  const stopPan = useCallback(() => {
    if (panAnimRef.current !== null) {
      cancelAnimationFrame(panAnimRef.current);
      panAnimRef.current = null;
    }
  }, []);

  const panTo = useCallback(
    (targetWorldX: number) => {
      stopPan();
      const target = clamp(targetWorldX - vwRef.current / 2, 0, WORLD_W - vwRef.current);
      const step = () => {
        const d = target - camRef.current;
        if (Math.abs(d) < 0.8) {
          applyCam(target);
          panAnimRef.current = null;
          return;
        }
        applyCam(camRef.current + d * 0.13);
        panAnimRef.current = requestAnimationFrame(step);
      };
      panAnimRef.current = requestAnimationFrame(step);
    },
    [applyCam, stopPan],
  );

  // collect parallax layers / sky panes, then size + focus the apple main tree
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    layersRef.current = Array.from(vp.querySelectorAll<HTMLElement>("[data-fp-f]")).map((el) => ({
      el,
      f: Number(el.dataset.fpF),
    }));
    skyRefs.current = new Map(
      Array.from(vp.querySelectorAll<HTMLElement>("[data-fp-sky]")).map((el) => [
        el.dataset.fpSky as BiomeId,
        el,
      ]),
    );
    const measure = () => {
      vwRef.current = vp.clientWidth;
      vhRef.current = vp.clientHeight;
      applyCam(camRef.current);
    };
    measure();
    applyCam(770 - vwRef.current / 2);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [applyCam]);

  // ── drag / inertia / wheel / keyboard ───────────────────────────────────────

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const t = e.target as HTMLElement;
      if (t.closest("button, a, .fp-card, .fp-hud")) return;
      stopPan();
      dragRef.current = { startX: e.clientX, startCam: camRef.current, lastX: e.clientX, v: 0 };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [stopPan],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      d.v = d.lastX - e.clientX;
      d.lastX = e.clientX;
      applyCam(d.startCam + (d.startX - e.clientX));
    },
    [applyCam],
  );

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || Math.abs(d.v) < 2) return;
    let v = d.v * 1.1;
    const glide = () => {
      v *= 0.94;
      if (Math.abs(v) < 0.4) return;
      applyCam(camRef.current + v);
      panAnimRef.current = requestAnimationFrame(glide);
    };
    stopPan();
    panAnimRef.current = requestAnimationFrame(glide);
  }, [applyCam, stopPan]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      stopPan();
      applyCam(camRef.current + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY));
    },
    [applyCam, stopPan],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileTree(null);
        setPhotoMode(false);
        return;
      }
      if (e.key === "ArrowLeft") applyCam(camRef.current - 120);
      if (e.key === "ArrowRight") applyCam(camRef.current + 120);
      const n = Number(e.key);
      if (n >= 1 && n <= 4) panTo(biomeCenter(BIOMES[n - 1]!));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyCam, panTo]);

  // ── simulated desktop link ───────────────────────────────────────────────────

  const spawnOrb = useCallback(
    (tree?: TreeDef) => {
      const target =
        tree ?? TREES.find((t) => t.main && t.biome === activeBiomeRef.current) ?? TREES[0]!;
      const vw = vwRef.current;
      const vh = vhRef.current;
      const tx = target.x - camRef.current;
      if (tx < -80 || tx > vw + 80) return; // off-screen tree: skip the fx
      const ty = vh - GROUND_H - target.h * 0.66;
      const sx = vw * 0.5;
      const sy = vh - 26;
      const id = fxIdRef.current++;
      const claude = id % 2 === 1;
      setOrbs((o) => [...o, { id, sx, sy, dx: tx - sx, dy: ty - sy, color: claude ? "var(--color-bubble-claude)" : "var(--color-bubble-codex)" }]);
      window.setTimeout(() => {
        setOrbs((o) => o.filter((x) => x.id !== id));
        setGlowTree(target.id);
        const fid = fxIdRef.current++;
        setFloats((f) => [...f, { id: fid, treeId: target.id, text: claude ? "+1.2M" : "+0.6M" }]);
        setSyncSecs(0);
        window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== fid)), 1900);
        window.setTimeout(() => setGlowTree((g) => (g === target.id ? null : g)), 1400);
      }, 1250);
    },
    [],
  );

  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => {
      if (!document.hidden) spawnOrb();
    }, 10_000);
    return () => window.clearInterval(t);
  }, [reduced, spawnOrb]);

  useEffect(() => {
    const t = window.setInterval(() => setSyncSecs((s) => (s >= 46 ? 8 : s + 1)), 1000);
    return () => window.clearInterval(t);
  }, []);

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
    const b = activeBiomeRef.current;
    setWindBiome(b);
    setWindKey((k) => k + 1);
    if (b === "cherry") playChime();
    window.setTimeout(() => setWindBiome((w) => (w === b ? null : w)), 2600);
  }, [playChime]);

  // ── render helpers ──────────────────────────────────────────────────────────

  return (
    <div
      ref={viewportRef}
      className="fp-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {/* ── sky (screen-space, cross-faded per biome) ── */}
      {BIOMES.map((b) => (
        <div
          key={b.id}
          data-fp-sky={b.id}
          className="fp-sky"
          style={{
            background: `linear-gradient(180deg, ${b.sky[0]} 0%, ${b.sky[1]} 55%, ${b.sky[2]} 100%)`,
            opacity: b.id === "apple" ? 1 : 0,
          }}
          aria-hidden
        >
          {b.id === "apple" && <div className="fp-sun" style={{ left: "18%", top: "12%", background: "#fff3c8", boxShadow: "0 0 60px 22px rgba(255,240,190,0.65)" }} />}
          {b.id === "cherry" && <div className="fp-sun" style={{ left: "70%", top: "30%", background: "#ffd9c8", boxShadow: "0 0 54px 20px rgba(255,190,170,0.5)" }} />}
          {b.id === "cactus" && <div className="fp-sun fp-sun-lg" style={{ left: "40%", top: "42%", background: "#ffb868", boxShadow: "0 0 70px 30px rgba(255,150,80,0.55)" }} />}
          {b.id === "christmas" && (
            <>
              <div className="fp-moon" />
              {STARS.map((s, i) => (
                <span key={i} className="fp-star fp-anim" style={{ left: `${s.l}%`, top: `${s.t}%`, animationDelay: `${s.d}s` }} />
              ))}
            </>
          )}
        </div>
      ))}

      {/* ── far silhouettes ── */}
      <div className="fp-layer" data-fp-f="0.35" aria-hidden>
        {BIOMES.map((b) => (
          <div key={b.id} className="fp-scenery" style={{ left: biomeCenter(b) * 0.35 - 680, bottom: GROUND_H - 10 }}>
            <FarScenery biome={b.id} />
          </div>
        ))}
      </div>

      {/* ── mid silhouettes ── */}
      <div className="fp-layer" data-fp-f="0.62" aria-hidden>
        {BIOMES.map((b) => (
          <div key={b.id} className="fp-scenery" style={{ left: biomeCenter(b) * 0.62 - 680, bottom: GROUND_H - 6, opacity: 0.92 }}>
            <MidScenery biome={b.id} />
          </div>
        ))}
      </div>

      {/* ── ground ── */}
      <div className="fp-layer" data-fp-f="1" aria-hidden>
        <div className="fp-soil" />
        {BIOMES.map((b) => (
          <div
            key={b.id}
            className="fp-ground"
            style={{
              left: b.x - 80,
              width: BIOME_W + 160,
              background: `linear-gradient(180deg, ${b.groundEdge} 0%, ${b.groundTop} 14%, ${b.groundTop} 34%, #6b4a32 68%, #4a3423 100%)`,
            }}
          />
        ))}
        <div className="fp-path" />
      </div>

      {/* ── main content: trees, props, particles, fx ── */}
      <div className="fp-layer" data-fp-f="1">
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
              style={{ left: d.x - w / 2, bottom: GROUND_H + d.bottom, zIndex: d.z, transform: d.flip ? "scaleX(-1)" : undefined }}
            />
          );
        })}

        {/* swing (clickable) */}
        <button
          type="button"
          className="fp-prop"
          style={{ left: SWING.x - (90 / 200) * SWING.h * 0.5, bottom: GROUND_H - 2, zIndex: 4 }}
          onClick={() => {
            setSwinging(true);
            window.setTimeout(() => setSwinging(false), 4900);
          }}
          aria-label="秋千"
        >
          <Image
            src={spritePath("Swing")}
            alt=""
            width={Math.round((90 / 200) * SWING.h)}
            height={SWING.h}
            unoptimized
            loading="eager"
            draggable={false}
            className={swinging ? "fp-rock" : undefined}
            style={{ transformOrigin: "50% 8%" }}
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
              style={{ left: l.x - w / 2, bottom: GROUND_H - 2, zIndex: 4 }}
              onClick={() => setLitLamps((s) => ({ ...s, [l.id]: !s[l.id] }))}
              aria-label={lit ? "熄灭石灯" : "点亮石灯"}
            >
              {lit && <span className="fp-lampglow" />}
              <Image
                src={spritePath("StoneLamp_1")}
                alt=""
                width={Math.round(w)}
                height={l.h}
                unoptimized
                loading="eager"
                draggable={false}
                style={{ filter: lit ? "brightness(1.25) drop-shadow(0 0 10px rgba(255,200,110,0.9))" : undefined }}
              />
            </button>
          );
        })}

        {/* chest (sheet animation) */}
        <button
          type="button"
          className="fp-prop"
          style={{ left: CHEST.x - (CHEST.fw * CHEST.scale) / 2, bottom: GROUND_H - 4, zIndex: 5 }}
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

        {/* wind chime (sheet animation, hangs from the torii) */}
        <button
          type="button"
          className="fp-prop"
          style={{ left: CHIME.x - ((CHIME.fw / CHIME.fh) * CHIME.h) / 2, bottom: GROUND_H + CHIME.hang, zIndex: 3 }}
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

        {/* trees */}
        {TREES.map((t) => {
          const w = (t.nw / t.nh) * t.h;
          const float = floats.find((f) => f.treeId === t.id);
          return (
            <button
              key={t.id}
              type="button"
              className="fp-tree"
              style={{ left: t.x - w / 2, bottom: GROUND_H - t.lift, width: w, height: t.h, zIndex: t.main ? 3 : 2 }}
              onClick={() => setProfileTree(t)}
              onPointerMove={onPetMove(t)}
              aria-label={`${t.kind}「${t.name}」 · 阶段 ${t.roman}`}
            >
              <Image
                src={spritePath(t.sprite)}
                alt=""
                width={Math.round(w)}
                height={t.h}
                unoptimized
                loading="eager"
                draggable={false}
                className={swayTree === t.id ? "fp-sway" : undefined}
                style={{ transformOrigin: "50% 92%" }}
              />
              {glowTree === t.id && <span className="fp-canopyglow" />}
              {float && <span className="fp-float">{float.text}</span>}
              <span className="fp-treetag">{t.name} · {t.roman}</span>
            </button>
          );
        })}

        {/* per-biome ambient particles + wind bursts */}
        {!reduced &&
          BIOMES.map((b) => (
            <div key={b.id} className="fp-particles" style={{ left: b.x, width: BIOME_W }} aria-hidden>
              {PARTICLES[b.id].map((p, i) =>
                p.kind === "dust" ? (
                  <span
                    key={i}
                    className="fp-dust fp-anim"
                    style={{
                      left: `${p.left * 100}%`,
                      top: `${30 + ((i * 13) % 45)}%`,
                      width: 22,
                      height: 2,
                      background: p.color,
                      animationDuration: `${p.dur}s`,
                      animationDelay: `${p.delay}s`,
                    }}
                  />
                ) : (
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
                        animationDuration: `${p.dur}s`,
                        animationDelay: `${p.delay}s`,
                      } as React.CSSProperties
                    }
                  />
                ),
              )}
              {b.id === "cactus" && <span className="fp-tumbleweed fp-anim" aria-hidden />}
              {windBiome === b.id && (
                <span key={windKey} className="fp-gustwrap" aria-hidden>
                  {Array.from({ length: 14 }, (_, i) => (
                    <span
                      key={i}
                      className="fp-gust"
                      style={{
                        left: `${(i * 7.1) % 60}%`,
                        top: `${18 + ((i * 17) % 55)}%`,
                        background: PARTICLE_STYLES[b.id].colors[i % PARTICLE_STYLES[b.id].colors.length],
                        animationDelay: `${(i % 5) * 0.12}s`,
                      }}
                    />
                  ))}
                </span>
              )}
            </div>
          ))}
      </div>

      {/* ── foreground tufts ── */}
      <div className="fp-layer" data-fp-f="1.18" aria-hidden>
        {TUFTS.map((t, i) => (
          <svg key={i} className="fp-tuft" style={{ left: t.x * 1.18 - t.w / 2, bottom: 6 }} width={t.w} height={42} viewBox="0 0 40 42">
            <path d="M4 42 L10 16 L14 42 Z M14 42 L20 6 L26 42 Z M24 42 L31 18 L36 42 Z" fill={t.hue} />
          </svg>
        ))}
      </div>

      {/* ── screen-space fx: energy orbs ── */}
      {orbs.map((o) => (
        <span
          key={o.id}
          className="fp-orb"
          style={
            {
              left: o.sx,
              top: o.sy,
              background: o.color,
              boxShadow: `0 0 12px 4px ${o.color.includes("claude") ? "rgba(217,119,87,0.55)" : "rgba(16,163,127,0.5)"}`,
              "--dx": `${o.dx}px`,
              "--dy": `${o.dy}px`,
            } as React.CSSProperties
          }
          aria-hidden
        />
      ))}

      {/* ── HUD ── */}
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
            <button type="button" className="fp-btn" onClick={() => panTo(770)}>
              回到主树
            </button>
            <button type="button" className="fp-btn" onClick={blowWind}>
              🌬 吹风
            </button>
            <button type="button" className="fp-btn" onClick={() => spawnOrb()}>
              ⚡ 模拟桌面收取
            </button>
            <button type="button" className="fp-btn" onClick={() => setPhotoMode(true)}>
              📷 拍照
            </button>
          </div>

          <div className="fp-hud fp-hud-bc">
            {BIOMES.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`fp-pill${activeBiome === b.id ? " fp-pill-on" : ""}`}
                onClick={() => panTo(biomeCenter(b))}
              >
                {b.emoji} {b.name}
              </button>
            ))}
          </div>

          <div className="fp-hud fp-hud-br">概念原型 · 假数据 · 对应 M0/M1</div>
        </>
      )}

      {photoMode && <div className="fp-photohint">拍照模式 · 按 ESC 退出</div>}

      {/* desktop echo toast */}
      {echo && <div className="fp-echo">{echo}</div>}

      {/* ── tree profile card ── */}
      {profileTree && (
        <div className="fp-card" role="dialog" aria-label={`${profileTree.name} 的档案`}>
          <div className="fp-card-head">
            <span className="fp-card-title">
              {BIOMES.find((b) => b.id === profileTree.biome)?.emoji} {profileTree.name}
            </span>
            <span className="fp-card-stage">阶段 {profileTree.roman}</span>
            <button type="button" className="fp-card-x" onClick={() => setProfileTree(null)} aria-label="关闭">
              ✕
            </button>
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
              <li>🏮 樱花林的两盏石灯亮了一整晚</li>
              <li>❄️ 冬日林地下了第一场雪,雪地上有脚印</li>
            </ul>
            <button type="button" className="fp-btn fp-btn-lg" onClick={() => setWelcome(false)}>
              进入森林
            </button>
            <div className="fp-welcome-note">概念原型:数据为演示,拖动查看四个林区</div>
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
  position: fixed; inset: 0; overflow: hidden; touch-action: none;
  user-select: none; -webkit-user-select: none; overscroll-behavior: none;
  cursor: grab; background: #0a0f14; font-family: var(--font-body);
}
.fp-viewport:active { cursor: grabbing; }
.fp-sky { position: absolute; inset: 0; transition: none; }
.fp-sun { position: absolute; width: 74px; height: 74px; border-radius: 50%; }
.fp-sun-lg { width: 110px; height: 110px; }
.fp-moon {
  position: absolute; left: 72%; top: 10%; width: 66px; height: 66px; border-radius: 50%;
  background: #f2f4e8; box-shadow: inset -14px -8px 0 rgba(160,170,150,0.45), 0 0 44px 14px rgba(220,230,255,0.28);
}
.fp-star { position: absolute; width: 3px; height: 3px; background: #dfe8ff; animation: fp-twinkle 2.6s ease-in-out infinite; }
.fp-layer { position: absolute; inset: 0; width: ${WORLD_W}px; will-change: transform; pointer-events: none; }
.fp-layer .fp-tree, .fp-layer .fp-prop { pointer-events: auto; }
.fp-scenery { position: absolute; pointer-events: none; }
.fp-soil { position: absolute; left: -200px; right: -200px; width: ${WORLD_W + 400}px; bottom: 0; height: ${GROUND_H}px; background: linear-gradient(180deg,#7a5a3a 0%,#5a4028 40%,#3c2a1a 100%); }
.fp-ground { position: absolute; bottom: 0; height: ${GROUND_H}px; mask-image: linear-gradient(to right, transparent 0, #000 90px, #000 calc(100% - 90px), transparent 100%); }
.fp-path { position: absolute; left: 0; width: ${WORLD_W}px; bottom: 16px; height: 20px; background: #8a6a44; opacity: .85; border-top: 3px solid #a8845a; border-bottom: 3px solid #6a4e30; background-image: repeating-linear-gradient(90deg, transparent 0 46px, rgba(255,240,210,.28) 46px 58px); }
.fp-sprite, .fp-prop, .fp-tree { position: absolute; image-rendering: pixelated; }
.fp-sprite { pointer-events: none; }
.fp-prop { background: none; border: none; padding: 0; cursor: pointer; }
.fp-prop:focus-visible, .fp-tree:focus-visible { outline: 2px solid var(--color-leaf-light); outline-offset: 3px; }
.fp-prop img, .fp-tree img { image-rendering: pixelated; display: block; }
.fp-sheet { display: block; image-rendering: pixelated; background-repeat: no-repeat; }
.fp-tree { background: none; border: none; padding: 0; cursor: pointer; }
.fp-treetag {
  position: absolute; left: 50%; top: -6px; transform: translateX(-50%);
  font-family: var(--font-body); font-size: 12px; font-weight: 500; letter-spacing: .04em;
  color: #fff; background: rgba(20,28,22,.72); border: 1px solid rgba(255,255,255,.22);
  padding: 2px 8px; border-radius: 2px; opacity: 0; transition: opacity .18s; pointer-events: none; white-space: nowrap;
}
.fp-tree:hover .fp-treetag, .fp-tree:focus-visible .fp-treetag { opacity: 1; }
.fp-sway { animation: fp-sway .9s ease-in-out; }
.fp-canopyglow {
  position: absolute; left: 50%; top: 26%; width: 70%; height: 46%; transform: translateX(-50%);
  border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(255,235,150,.55) 0%, rgba(255,235,150,0) 68%);
  animation: fp-pulse .5s ease-in-out 3;
}
.fp-float {
  position: absolute; left: 50%; top: 8%; transform: translateX(-50%);
  font-family: var(--font-pixel); font-size: 15px; color: #ffe9a8;
  text-shadow: 2px 2px 0 rgba(0,0,0,.5); animation: fp-float 1.8s ease-out forwards; pointer-events: none;
}
.fp-lampglow {
  position: absolute; left: 50%; bottom: 44%; width: 190px; height: 190px; transform: translateX(-50%);
  border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(255,196,110,.5) 0%, rgba(255,196,110,0) 66%);
}
.fp-particles { position: absolute; top: 9%; bottom: ${GROUND_H - 26}px; pointer-events: none; overflow: hidden; }
.fp-fall { position: absolute; top: -4%; border-radius: 1px; animation-name: fp-fall; animation-timing-function: linear; animation-iteration-count: infinite; }
.fp-dust { position: absolute; border-radius: 1px; opacity: 0; animation-name: fp-dust; animation-timing-function: linear; animation-iteration-count: infinite; }
.fp-tumbleweed {
  position: absolute; bottom: 4px; left: 0; width: 34px; height: 34px; border-radius: 50%;
  border: 3px solid #8a6238; box-shadow: inset 0 0 0 2px rgba(138,98,56,.5), inset 8px 4px 0 -6px #8a6238, inset -8px -4px 0 -6px #8a6238;
  animation: fp-tumble 15s linear infinite; animation-delay: 3s;
}
.fp-gustwrap { position: absolute; inset: 0; }
.fp-gust { position: absolute; width: 5px; height: 5px; border-radius: 1px; opacity: 0; animation: fp-gust 2.1s ease-out forwards; }
.fp-tuft { position: absolute; pointer-events: none; opacity: .95; }
.fp-orb { position: absolute; width: 14px; height: 14px; border-radius: 50%; z-index: 40; pointer-events: none; animation: fp-orb 1.25s cubic-bezier(.3,.1,.3,1) forwards; }

.fp-hud { position: absolute; z-index: 50; font-family: var(--font-body); }
.fp-hud-tl {
  left: 16px; top: 14px; padding: 10px 14px; color: var(--color-text-cream);
  background: rgba(27,42,34,.88); border: 2px solid #0e1712; border-radius: var(--radius-pixel); box-shadow: var(--shadow-pixel);
}
.fp-brand { font-family: var(--font-brand); font-size: 9px; letter-spacing: .12em; color: var(--color-accent-gold-light); }
.fp-forestname { font-size: 16px; font-weight: 700; margin-top: 4px; }
.fp-syncline { font-size: 11.5px; margin-top: 4px; color: var(--color-text-muted-dark); display: flex; align-items: center; gap: 6px; }
.fp-dot { width: 7px; height: 7px; border-radius: 50%; background: #7bd88f; box-shadow: 0 0 6px 1px rgba(123,216,143,.8); }
.fp-hud-tr { right: 16px; top: 14px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 46vw; }
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
.fp-photohint { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 50; font-size: 12px; color: rgba(255,255,255,.85); background: rgba(20,26,22,.55); padding: 6px 12px; border-radius: 2px; font-family: var(--font-body); }
.fp-echo {
  position: absolute; left: 50%; top: 18px; transform: translateX(-50%); z-index: 60;
  font-family: var(--font-body); font-size: 13px; font-weight: 500; color: #1e2521;
  background: var(--color-surface-parchment); border: 2px solid var(--color-soil);
  border-radius: var(--radius-pixel); box-shadow: var(--shadow-pixel); padding: 9px 16px;
  animation: fp-pop .22s ease-out;
}

.fp-card {
  position: absolute; left: 16px; bottom: 16px; z-index: 55; width: min(340px, calc(100vw - 32px));
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

.fp-scrim { position: absolute; inset: 0; z-index: 70; background: rgba(8,15,12,.55); display: flex; align-items: center; justify-content: center; padding: 20px; }
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
  0% { transform: translate3d(0,-4vh,0) rotate(0deg); opacity: 0; }
  8% { opacity: .95; }
  50% { transform: translate3d(var(--sw,30px),40vh,0) rotate(160deg); }
  96% { opacity: .9; }
  100% { transform: translate3d(calc(var(--sw,30px) * -0.4),86vh,0) rotate(320deg); opacity: 0; }
}
@keyframes fp-dust { 0% { transform: translateX(0); opacity: 0; } 12% { opacity: .8; } 88% { opacity: .6; } 100% { transform: translateX(260px); opacity: 0; } }
@keyframes fp-tumble { 0% { transform: translateX(-60px) rotate(0); } 100% { transform: translateX(${BIOME_W + 120}px) rotate(1turn); } }
@keyframes fp-gust { 0% { transform: translate3d(0,0,0); opacity: 0; } 10% { opacity: .95; } 100% { transform: translate3d(52vw,9vh,0); opacity: 0; } }
@keyframes fp-twinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
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
  .fp-hud-tr { max-width: 60vw; gap: 6px; }
  .fp-btn { font-size: 11.5px; padding: 6px 8px; }
  .fp-pill { font-size: 11.5px; padding: 6px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .fp-anim, .fp-sway, .fp-rock, .fp-canopyglow, .fp-orb, .fp-tumbleweed { animation: none !important; }
}
`;
