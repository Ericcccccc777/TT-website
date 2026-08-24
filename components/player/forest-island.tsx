import type { ReactElement } from "react";
import { spriteFile, STAGES } from "@/lib/leaderboard-format";

/**
 * A player's forest, as a place rather than as a row of boxes.
 *
 * ── Every species has a HOME, not a numbered slot ───────────────────────────
 * The first two builds sorted trees by token count into four generic plots, so
 * a christmas tree could land in the sunny south and a cactus beside the pond.
 * The island now has climates, and each species lives in its own:
 *
 *      christmas ── the far northern rim, snow on the ground and the cliff
 *      cactus ───── the dry east, sand and stones
 *      cherry ───── the west, beside the water
 *      apple ────── the middle, the homestead: fence, basket, swing
 *
 * The zones only exist when the player has that tree, so nothing appears as a
 * placeholder. This is why the island reads as a PLACE — the ground explains
 * why each tree is standing where it is. (CEO direction, 2026-08-22.)
 *
 * ── What decides what is on it ──────────────────────────────────────────────
 * Two numbers the player already earned: how many KINDS of tree (breadth) and
 * every tree's stage ADDED TOGETHER (depth, 0–32). Breadth brings the climates
 * in; depth brings the life — path, pond, field, lantern, waterfall, gate.
 * Nothing is a locked slot with a padlock: a player without the pond sees an
 * island with no pond, not a pond-shaped hole. docs/features/forest-island.md.
 *
 * ── Faults fixed from the reviewed builds ───────────────────────────────────
 * · *"Looks like a floating continent."* Every cliff column drops to one shared
 *   baseline that a mist sea swallows, with neighbouring peaks in the same
 *   mist. There is no visible underside, so nothing can float.
 * · *"Most of the ground is meaningless."* Zones, nodes and paths; decoration
 *   clusters where life is and leaves the rest quiet (art doc § 3.4).
 * · *"The swing is in the sky."* Furniture is now anchored to what it belongs
 *   to — the swing hangs from the apple tree's own branch, the fence stands in
 *   front of its tree, the basket in front of the fence.
 * · *"The terrace looks wrong."* Removed. It bought one depth cue and cost a
 *   floating sliver, a paint-order bug and a whole class of "which height is
 *   this?" questions. Zones carry the variety instead.
 *
 * ── Medium ─────────────────────────────────────────────────────────────────
 * Terrain is SVG in a pixel idiom: crispEdges, flat colour per facet, no
 * gradients, and a finer tile than before so the ground carries more texture.
 * Trees and furniture are the app's OWN sprites, nearest-neighbour scaled —
 * never smoothed, because the 8 growth stages are the payload. Palette from
 * docs/design/personal-homepage-art-style-reference.md § 13.3, cliff per § 9.1,
 * water per § 9.3.
 *
 * ── Determinism ────────────────────────────────────────────────────────────
 * `hash()` is a pure function of position. No clock, no randomness: an island
 * that rearranges itself between visits is a screensaver, not a place.
 */

export type IslandTree = {
  kind: string;
  stage_index: number;
  tokens: number;
};

// ── Projection ──────────────────────────────────────────────────────────────
/**
 * Tile size, twice reduced on CEO direction: 48×20 → 36×15 → 30×13. The island
 * keeps its screen size because the radii grow to match, so what actually
 * changes is GRAIN — 188 tiles, then 648, now 955. Every extra tile is another
 * place the ground can change colour, which is where the surface texture comes
 * from. The idiom stays pixel: flat colour per facet, hard edges, no gradients.
 */
const TW = 30;
const TH = 13;
const COLS = 48;
const ROWS = 38;
const OX = 528;
const OY = 20;

const sx = (c: number, r: number) => OX + (c - r) * (TW / 2);
const sy = (c: number, r: number) => OY + (c + r) * (TH / 2);

/** Deterministic 0–1 from a coordinate. Same island on every visit. */
function hash(c: number, r: number, salt = 0): number {
  const n = Math.sin(c * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

// ── Palette ─────────────────────────────────────────────────────────────────
const SKY = ["#f7f1ce", "#f2ecc9", "#ece6c4", "#e4debd"] as const;
const HILL = ["#ccd4cf", "#b3c4bd", "#9ab1a9"] as const;
/** Narrow, correlated ramps — variation without the quilt. */
const GREEN = ["#63855a", "#6b8d5e", "#739562", "#7b9a68", "#84a06c", "#8ba573"] as const;
const WARM = ["#a8a076", "#b0a87e", "#b7ae85", "#beb48c"] as const;
const SAND = ["#c9b88c", "#d2c096", "#c0ad81", "#d8c8a2"] as const;
const FROST = ["#c9d1ca", "#d4dad2", "#dee3db", "#e8ece5"] as const;
const CLIFF_BASE = "#b08a68";
const CLIFF_VERTS = ["#9b7c60", "#8f9484", "#7d8a6a", "#a1795c", "#87817a"] as const;
const CLIFF_SHADE = "#8a6a52";
const POND = ["#5d8792", "#6f97a0"] as const;
const POND_GLINT = "#dfe9e2";
const DIRT = ["#d4b284", "#caa671"] as const;
const STONE = "#9a9a7a";
const STONE_DARK = "#82826a";
const BLOSSOM = "#d8a19a";
const SNOW = "#eef2f0";
const REED = "#4f6f4a";
const BUSH = ["#5f8358", "#557a50"] as const;
const LOG = "#7a5c42";
const CROPS = [
  { soil: "#b5926a", sprout: "#6f8f5f" },
  { soil: "#a8845f", sprout: "#ca9772" },
  { soil: "#c2a878", sprout: "#d8c48e" },
] as const;

// ── Landform ────────────────────────────────────────────────────────────────
const CX = 23;
const CY = 18;
const RX = 20;
const RY = 15;

/** An ellipse gnawed at by the hash — ragged like land, not clean like a logo. */
function isLand(c: number, r: number): boolean {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  const dx = (c - CX) / RX;
  const dy = (r - CY) / RY;
  return dx * dx + dy * dy <= 1 + (hash(c, r, 3) - 0.5) * 0.16;
}

/**
 * Where each species lives.
 *
 * Screen position is what matters, and under this projection it is
 * `x = 528 + (c−r)·18`, `y = 20 + (c+r)·7.5` — horizontal is (c−r), depth is
 * (c+r). Choosing by grid coordinate is the trap that piled three trees into
 * one corner of the first build.
 *
 *   apple     (18,16) → x 564, y 275  centre, the homestead
 *   christmas (13, 4) → x 690, y 148  far north rim, between apple and cactus
 *   cactus    (36,12) → x 888, y 332  the far east, out on the sand
 *   cherry    ( 9,21) → x 312, y 245  west, above the pond
 */
const HOMES: Record<string, { c: number; r: number; scale: number }> = {
  /*
   * x = 528 + (c−r)·15, y = 20 + (c+r)·6.5.
   *
   * "Level with the christmas tree and slightly forward" means the same DEPTH
   * band, not the same screen column: putting them in one column stacked the
   * apple's canopy over the pine and the pine vanished. Side by side at a
   * similar depth, the apple a little forward, both read.
   */
  christmas: { c: 16, r: 6, scale: 0.86 }, // x 678, y 163 — northern rim
  apple: { c: 15, r: 15, scale: 1.0 }, // x 528, y 215 — level, forward, left
  cherry: { c: 12, r: 24, scale: 0.94 }, // x 348, y 254 — west, above the pond
  /*
   * Hard against the eastern coast, per the CEO. The desert is the one climate
   * with a natural edge — sand does not fade into grass, it stops at the rock —
   * so pushing the cactus out to (36,12) puts the sand's far side ON the
   * coastline (its rightmost tiles reach screen x 993, the island's own edge)
   * instead of leaving a ring of green between the desert and the sea. The
   * decorations need no move of their own: every one of them is anchored to
   * the tree's body, so hat, mine cart, broken fence and route sign travel
   * with it and keep their measured offsets.
   */
  cactus: { c: 36, r: 12, scale: 0.9 }, // x 888, y 332 — the far east, sand to the cliff
};
/** Somewhere to stand for a species the website has never heard of. */
const SPARE = [
  { c: 34, r: 26, scale: 0.86 },
  { c: 19, r: 19, scale: 0.8 },
] as const;

const POND_AT = { c: 14, r: 28, rx: 4.2, ry: 3.4 };
function isPond(c: number, r: number): boolean {
  const dx = (c - POND_AT.c) / POND_AT.rx;
  const dy = (r - POND_AT.r) / POND_AT.ry;
  return isLand(c, r) && dx * dx + dy * dy <= 1 + (hash(c, r, 9) - 0.5) * 0.5;
}

/**
 * Where the pond spills over the rim. Found by scanning, never hardcoded: the
 * coastline is hash-ragged, and a fixed coordinate landed on a tile that was
 * not there — the water fell out of open air beside the island.
 */
const POND_MOUTH = (() => {
  let best: { c: number; r: number } | null = null;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!isPond(c, r) || isLand(c, r + 1)) continue;
      if (!best || c + r > best.c + best.r) best = { c, r };
    }
  }
  return best ?? { c: POND_AT.c, r: POND_AT.r + 2 };
})();

/*
 * The apple tree's own ground — centred ON the tree, not beside it.
 *
 * The CEO's note was that the apple was not planted in the field, and it was
 * right: the field sat one node south, so the tree stood on a bare patch with
 * a farm nearby. Centring it on the tree's own tile makes the tree part of the
 * field, which is what a farm tree is.
 */
const FARM = { c0: 13, c1: 17, r0: 13, r1: 17 };
function isFarm(c: number, r: number): boolean {
  return (
    c >= FARM.c0 && c <= FARM.c1 && r >= FARM.r0 && r <= FARM.r1 && isLand(c, r) && !isPond(c, r)
  );
}

const HUB: [number, number] = [23, 20];

/** Routes: every node hangs off the hub, because § 9.9 asks that things relate
 *  by cause. A lantern beside a path is furniture; alone in a field it is litter. */
const SPUR: Record<string, [number, number][]> = {
  apple: [[15.6, 16], [18, 18], HUB],
  cherry: [[13.4, 24.6], [17, 22.4], HUB],
  cactus: [[35.4, 12.8], [32, 15.4], [28, 18], HUB],
  christmas: [[16.8, 7], [19, 12], [21, 16.4], HUB],
};
const EXIT: [number, number][] = [HUB, [21, 19.6], [25, 21.4], [28.4, 22.6]];

function pathTiles(kinds: string[]): Set<string> {
  const out = new Set<string>();
  const routes = [EXIT, ...kinds.map((k) => SPUR[k]).filter(Boolean)];
  for (const route of routes) {
    for (let i = 0; i < route.length - 1; i++) {
      const [c0, r0] = route[i];
      const [c1, r1] = route[i + 1];
      const steps = Math.ceil(Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0)) * 3);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const c = Math.round(c0 + (c1 - c0) * t);
        const r = Math.round(r0 + (r1 - r0) * t);
        if (isLand(c, r) && !isPond(c, r)) out.add(`${c},${r}`);
      }
    }
  }
  return out;
}

/**
 * Climate around a home, 0 at the edge and 1 at the centre. Only present
 * species have one, so a player without a cactus has no desert waiting for it.
 */
const CLIMATE_R: Record<string, [number, number]> = {
  christmas: [5.2, 4.4],
  cactus: [5.8, 4.8],
  // Not a ground tint like the other two — this radius only decides how far
  // the cherry's fallen petals reach.
  cherry: [4.6, 3.8],
};
function climate(c: number, r: number, kind: string, present: Set<string>): number {
  if (!present.has(kind)) return 0;
  const h = Object.hasOwn(HOMES, kind) ? HOMES[kind] : undefined;
  const rad = Object.hasOwn(CLIMATE_R, kind) ? CLIMATE_R[kind] : undefined;
  if (!h || !rad) return 0;
  const dx = (c - h.c) / rad[0];
  const dy = (r - h.r) / rad[1];
  // The ragged term keeps the frontier from being a clean oval — weather has
  // fingers, not a border.
  const d = Math.sqrt(dx * dx + dy * dy) - (hash(c, r, 41) - 0.5) * 0.26;
  return d >= 1 ? 0 : 1 - d;
}

// ── Where a tree's body actually is inside its sprite ───────────────────────

/**
 * Natural pixel size of each species' sprite, per growth stage.
 *
 * Per stage rather than per species because `CherryTree_1.png` is 729×759
 * while its seven siblings are 759×729 — transposed, presumably an export
 * accident upstream. One size for the whole species put a stage-1 cherry's
 * anchors off by the difference, and it is the kind of thing nobody would ever
 * find by looking.
 */
const SPRITE_WH: Record<string, [number, number][]> = {
  apple: Array.from({ length: 8 }, () => [759, 823] as [number, number]),
  cherry: [
    [729, 759],
    [759, 729],
    [759, 729],
    [759, 729],
    [759, 729],
    [759, 729],
    [759, 729],
    [759, 729],
  ],
  cactus: Array.from({ length: 8 }, () => [600, 600] as [number, number]),
  christmas: Array.from({ length: 8 }, () => [698, 1214] as [number, number]),
};

/**
 * The opaque bounding box of every growth stage, as ratios of the whole image
 * — measured off the files themselves, not guessed.
 *
 * This table is why decorations stopped floating. A sprite is mostly
 * transparent margin: a stage-1 apple occupies 18% of its image's width and
 * 36% of its height, and even a full-grown cactus is only half the width. Any
 * anchor expressed against the IMAGE therefore lands somewhere in the padding,
 * which is exactly how a cowboy hat ended up hovering in open air beside the
 * cactus it belongs on.
 *
 * Every decoration anchor below is expressed against the BODY: 0..1 across the
 * opaque box, 0 = ground at its bottom, 1 = its top.
 *
 * Regenerate with:
 *   python3 -c "from PIL import Image; ..."  # see docs/features/forest-island.md
 */
const BODY: Record<string, [number, number, number, number][]> = {
  apple: [
    [0.42, 0.642, 0.597, 1.0],
    [0.369, 0.566, 0.627, 1.0],
    [0.398, 0.558, 0.632, 1.0],
    [0.35, 0.467, 0.672, 1.0],
    [0.242, 0.258, 0.759, 1.0],
    [0.192, 0.19, 0.822, 1.0],
    [0.165, 0.107, 0.839, 1.0],
    [0.001, 0.005, 0.999, 1.0],
  ],
  cherry: [
    [0.407, 0.696, 0.569, 0.996],
    [0.418, 0.621, 0.605, 1.0],
    [0.332, 0.451, 0.693, 1.0],
    [0.29, 0.366, 0.692, 0.999],
    [0.269, 0.287, 0.729, 1.0],
    [0.181, 0.132, 0.817, 0.993],
    [0.0, 0.0, 1.0, 1.0],
    [0.0, 0.0, 1.0, 1.0],
  ],
  cactus: [
    [0.467, 0.828, 0.548, 1.0],
    [0.403, 0.728, 0.602, 1.0],
    [0.372, 0.67, 0.612, 1.0],
    [0.392, 0.575, 0.63, 1.0],
    [0.373, 0.473, 0.65, 1.0],
    [0.353, 0.38, 0.672, 1.0],
    [0.323, 0.277, 0.698, 1.0],
    [0.25, 0.092, 0.757, 1.0],
  ],
  christmas: [
    [0.341, 0.708, 0.63, 1.0],
    [0.355, 0.638, 0.67, 1.0],
    [0.245, 0.443, 0.759, 0.999],
    [0.17, 0.385, 0.808, 0.998],
    [0.139, 0.178, 0.864, 0.999],
    [0.093, 0.12, 0.905, 0.998],
    [0.07, 0.071, 0.951, 0.999],
    [0.0, 0.0, 1.0, 1.0],
  ],
};

/** The tree's visible body in screen space, given where and how big it is drawn. */
function bodyRect(kind: string, stageIdx: number, x: number, y: number, w: number, h: number) {
  const k = Object.hasOwn(SPRITE_WH, kind) ? kind : "apple";
  /*
   * Truncate before indexing. Clamping bounds the range but not the
   * integrality: a stage_index of 3.5 clamps to 3.5, and BODY[k][3.5] is
   * undefined, which then throws on bb[0]. `|| 0` also absorbs NaN, should the
   * upstream finite-check ever be relaxed.
   */
  const st = Math.min(7, Math.max(0, Math.trunc(stageIdx) || 0));
  const [NW, NH] = SPRITE_WH[k][st];
  const bb = BODY[k][st];
  // preserveAspectRatio="xMidYMax meet": uniform scale, centred, bottom-aligned.
  const s = Math.min(w / NW, h / NH);
  const sw = NW * s;
  const sh = NH * s;
  const x0 = x + (bb[0] - 0.5) * sw;
  const bot = y - (1 - bb[3]) * sh;
  return { x0, bot, w: (bb[2] - bb[0]) * sw, h: (bb[3] - bb[1]) * sh };
}

// ── Decorations, mirrored from the app's own catalogue ──────────────────────

/**
 * Transcribed from the desktop app's `src/sprites.py` TREE_DEFS.
 *
 * The anchor semantics are the APP's, not ours, so a thing stands here the way
 * it stands on the player's own desktop:
 *   pos    0..1 across the tree's ground — 0 left edge, 1 right edge
 *   y      0 = on the ground, 1 = treetop (so 0.24 is low on the trunk)
 *   layer  "behind" draws before the tree, "front" after it
 *   w      our display width in px — the app scales to its canvas and we scale
 *          to ours, but the ANCHORS above are copied verbatim
 *
 * `key` is the app's own unlock key, so the moment the app starts syncing which
 * decorations a player owns, this table already speaks its language.
 */
type Deco = {
  key: string;
  file: string;
  /** 0..1 across the tree's BODY — 0 its left edge, 1 its right edge. */
  pos: number;
  /** 0 = standing on the ground, 1 = the body's top. */
  y?: number;
  /** Screen-space nudge toward the viewer, in px. Some things want to stand a
   *  step in front of their tree rather than level with it, and depth is not
   *  something `pos`/`y` can say. */
  dy?: number;
  /** Hung from a branch: the sprite's TOP is pinned at `y` and it dangles from
   *  there, instead of standing with its bottom at `y`. */
  hang?: boolean;
  layer?: "front" | "behind";
  /** Display width as a fraction of the tree body's width. Relative rather than
   *  absolute so a decoration keeps its proportion on a sapling and on a
   *  full-grown tree alike. */
  rel: number;
};

const DECOR: Record<string, Deco[]> = {
  apple: [
    { key: "fence", file: "Fence.png", pos: 0.5, rel: 0.3, layer: "front" },
    // Close in against the trunk, per the CEO — out at the bed's edge it read
    // as an unrelated object that happened to be nearby.
    { key: "basket", file: "Basket.png", pos: 0.66, dy: 14, rel: 0.14, layer: "front" },
    /*
     * Hung from the LOWEST branch on the right, measured off AppleTree_8.png
     * at image (520, 555) → body (0.60, 0.33): measured from the render, the
     * ropes were landing ~18px right of the branch's woody span. The first
     * pass took the branch
     * above it and the swing sat too high in the canopy. The rope top is
     * pinned there and the seat dangles below, which is what `hang` means in
     * the app too. Earlier versions put the seat at that height instead and the
     * whole thing floated a tree's-width out in the open air.
     */
    { key: "swing", file: "Swing.png", pos: 0.6, y: 0.33, hang: true, rel: 0.1, layer: "front" },
  ],
  cherry: [
    { key: "bamboo_fence", file: "BambooFence.png", pos: 0.5, rel: 0.4, layer: "front" },
    // 70% of the tree's height, per the CEO. A gate you could not walk through
    // is not a gate; at its old size it was a trinket under the branches.
    { key: "torii", file: "Torii.png", pos: 0.5, rel: 0.94, layer: "behind" },
    // CEO override on the app's "right": on the left it clears the fence, and
    // pulled in close so it lights this tree rather than the empty grass.
    /*
     * Just clear of the gate's left post, not out on the cliff.
     *
     * The gate spans nearly the whole tree (rel 0.94 centred on 0.5), so its
     * posts stand at roughly 0.03 and 0.97 — anything between them overlaps it.
     * −0.28 cleared the gate and put the lamp out on the rim; −0.05 clears the
     * post and still stands on the tree's own ground.
     */
    { key: "stone_lamp", file: "StoneLamp_1.png", pos: -0.05, rel: 0.13, layer: "front" },
  ],
  cactus: [
    { key: "broken_fence", file: "BrokenFence.png", pos: 0.5, rel: 0.62, layer: "front" },
    { key: "mine_cart", file: "Mine.png", pos: 1.02, rel: 0.4, layer: "front" },
    /*
     * Sitting over the short middle head on the cactus's right, measured off
     * Cactus_8.png at image (363, 312) → body (0.70, 0.53). Dropped a little
     * below the tip so the brim rests ON it rather than hovering over it.
     */
    { key: "hat", file: "Hat.png", pos: 0.71, y: 0.46, rel: 0.32, layer: "front" },
    // Bigger and further left, per the CEO — it is a landmark, not a label.
    { key: "route_sign", file: "66Sign.png", pos: 1.34, rel: 0.34, layer: "behind" },
  ],
  christmas: [
    { key: "presents", file: "Presents.png", pos: 0.52, rel: 0.46, layer: "front" },
    { key: "snowman", file: "SnowMan.png", pos: 0.98, dy: 16, rel: 0.34, layer: "front" },
    { key: "snow_fence", file: "SnowFence.png", pos: 0.52, dy: 6, rel: 0.5, layer: "front" },
  ],
};

/** The soil a tree stands on. Christmas is snow, not the grey it used to be —
 *  the tree standing in it is a snow tree. */
const BED: Record<string, string> = {
  apple: "#a97f5c",
  cherry: "#bb9678",
  cactus: "#c2a877",
  christmas: "#dee5df",
};
const bedOf = (k: string): string => (Object.hasOwn(BED, k) ? BED[k] : BED.apple);

/** Native aspect (height ÷ width) of each decoration, so nothing is stretched. */
const DECO_ASPECT: Record<string, number> = {
  "Fence.png": 67 / 193,
  "BambooFence.png": 65 / 193,
  "BrokenFence.png": 63 / 193,
  "Basket.png": 60 / 86,
  "Swing.png": 200 / 90,
  "Torii.png": 674 / 780,
  "StoneLamp_1.png": 184 / 100,
  "Hat.png": 55 / 98,
  "66Sign.png": 319 / 130,
  "Mine.png": 155 / 200,
  "SnowMan.png": 252 / 200,
  "Presents.png": 112 / 206,
  "SnowFence.png": 62 / 190,
};
const decoAspect = (f: string): number => DECO_ASPECT[f] ?? 1;

/**
 * Does this tree show this decoration?
 *
 * **Growth decides, and growth is all we have.** The desktop app knows what a
 * player has bought and what they have put out; the board does not carry it, so
 * this site cannot read it. See docs/features/forest-island.md § 3.2 and § 6.
 *
 * The guess is not conservative in the way it first looks. In the app these are
 * BOUGHT, one at a time, with a currency each tree earns — there is no stage at
 * which the app hands one over — so this can differ from what a player owns in
 * either direction. What it does guarantee is that nothing lands on a tree too
 * young to carry it: no harvest basket on a seedling.
 *
 * There is deliberately no "if the app ever sends it" branch here. A field that
 * nothing writes is a contract nobody has agreed to, and the shape it would
 * arrive in is the app's decision to make, not one to guess in advance.
 */
function hasDeco(key: string, stageIdx: number, growth: number): boolean {
  const stage = stageIdx + 1;
  const gate: Record<string, boolean> = {
    fence: stage >= 4,
    bamboo_fence: stage >= 4,
    broken_fence: stage >= 3,
    snow_fence: stage >= 4,
    basket: stage >= 5,
    presents: stage >= 5,
    hat: stage >= 5,
    swing: stage >= 6,
    stone_lamp: growth >= 14,
    mine_cart: growth >= 16,
    snowman: growth >= 18,
    route_sign: growth >= 20,
    torii: growth >= 24,
  };
  // Own-property guard, not `?? false`: `gate` is a plain object literal, so
  // `gate.constructor` and `gate.toString` are truthy inherited values that
  // would sail past the fallback. The keys reaching here are our own today —
  // this costs nothing and stops that from being load-bearing.
  return Object.hasOwn(gate, key) ? gate[key] : false;
}

/** 0..STAGES-1, whatever arrived. `|| 0` absorbs NaN as well as −0. */
const stageOf = (t: IslandTree) => Math.min(STAGES - 1, Math.max(0, Math.trunc(t.stage_index) || 0));
const tokensOf = (t: IslandTree) => (Number.isFinite(t.tokens) ? t.tokens : 0);

const growthOf = (t: IslandTree[]) => t.reduce((n, x) => n + stageOf(x) + 1, 0);

// ── Frame, measured ─────────────────────────────────────────────────────────
const ISLAND = (() => {
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    frontY = -Infinity;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!isLand(c, r)) continue;
      const x = sx(c, r);
      x0 = Math.min(x0, x - TW / 2);
      x1 = Math.max(x1, x + TW / 2);
      y0 = Math.min(y0, sy(c, r));
      frontY = Math.max(frontY, sy(c, r) + TH);
    }
  }
  return { x0, x1, y0, frontY };
})();

/**
 * Headroom is measured from the tallest crown that can actually occur, not
 * guessed: the christmas tree stands at the back where the ground is highest
 * on screen, so it, not the biggest tree, sets the ceiling. Guessing left a
 * band of dead sky at the top, which the CEO called wasted.
 */
const TREE_H = 208;
const HEAD = (() => {
  let top = ISLAND.y0;
  for (const h of Object.values(HOMES)) top = Math.min(top, sy(h.c, h.r) - TREE_H * h.scale);
  return Math.max(30, ISLAND.y0 - top + 12);
})();

const MIST_TOP = ISLAND.frontY + 20;
/*
 * The rock is cut flat at BASE_Y, so that cut must never be visible: it has to
 * sit inside the cloud band, not below it. The clouds ride MIST_TOP with puffs
 * up to ~21px tall, so the cut goes far enough under that even the gaps
 * between puffs are still above it. A shallower value let the straight edge
 * show through wherever a puff dipped.
 */
const BASE_Y = MIST_TOP + 52;
const L = (() => {
  const mx = (ISLAND.x1 - ISLAND.x0) * 0.045;
  return {
    x: Math.round(ISLAND.x0 - mx),
    y: Math.round(ISLAND.y0 - HEAD),
    w: Math.round(ISLAND.x1 - ISLAND.x0 + mx * 2),
    h: Math.round(BASE_Y + 4 - (ISLAND.y0 - HEAD)),
  };
})();

/** One outline for the whole rock mass: the union of every land tile's column,
 *  every column ending on the same baseline. A gap is impossible by
 *  construction — a per-tile version produced a comb with sky between teeth. */
const CLIFF_PATH = (() => {
  const parts: string[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!isLand(c, r)) continue;
      // Interior tiles are entirely hidden behind the columns of the tiles in
      // front of them; only the exposed ring needs to be drawn.
      if (isLand(c + 1, r) && isLand(c, r + 1) && isLand(c + 1, r + 1)) continue;
      const x = sx(c, r);
      const y = sy(c, r);
      parts.push(
        `M${x - TW / 2},${y + TH / 2}L${x},${y}L${x + TW / 2},${y + TH / 2}` +
          `L${x + TW / 2},${BASE_Y}L${x - TW / 2},${BASE_Y}Z`,
      );
    }
  }
  return parts.join("");
})();

// ── Component ───────────────────────────────────────────────────────────────

type Placed = { depth: number; el: ReactElement };

export function ForestIsland({
  trees,
  className = "",
}: {
  trees: IslandTree[];
  className?: string;
}) {
  /*
   * `stage_index` and `tokens` live in a jsonb column the desktop app writes,
   * so neither is guaranteed to be a finite whole number, and the failure is
   * not cosmetic: a fractional stage indexes a slot that does not exist
   * (`BODY[k][3.5]` is `undefined`, which then throws on read), and a NaN one
   * poisons the growth total that every unlock on this island is measured
   * against. Either is a 500 on a public page, from one bad row.
   *
   * Cleaned once, here, so nothing downstream has to remember to — and cleaned
   * AFTER the slice, so the work stays proportional to what is drawn rather
   * than to however long the row happens to be.
   */
  const planted = [...trees]
    .sort((a, b) => tokensOf(b) - tokensOf(a))
    .slice(0, 4)
    .map((t) => ({ ...t, stage_index: stageOf(t), tokens: tokensOf(t) }));
  const growth = growthOf(planted);
  const clipId = `fi-${planted.length}-${growth}-${planted.reduce((n, t) => n + t.tokens, 0) % 99991}`;

  // Each tree to its climate; anything unrecognised takes a spare corner.
  let spare = 0;
  const standing = planted.map((t) => {
    // Same prototype-key hazard as DECOR: `HOMES["toString"]` is a function,
    // which would sail past `??` and then be read as {c, r, scale}.
    const known = Object.hasOwn(HOMES, t.kind);
    const home = known ? HOMES[t.kind] : SPARE[Math.min(spare++, SPARE.length - 1)];
    return { tree: t, home, known };
  });
  const present = new Set(standing.filter((s) => s.known).map((s) => s.tree.kind));

  const has = {
    path: growth >= 4,
    pond: present.size >= 2 || growth >= 8,
    // Tied to the apple tree, not to growth alone. The worked field IS the
    // apple's ground — it sits on its tile — so a player who reached the
    // threshold without an apple would get a farm with no farmer standing in
    // it. Same rule as the climates in § 3.3: the ground only exists where its
    // tree does.
    farm: growth >= 10 && present.has("apple"),
    waterfall: growth >= 16,
    ridge3: growth >= 26,
  };
  const scatter = Math.min(1, growth / 28);

  const track = has.path ? pathTiles([...present]) : new Set<string>();

  const beds = new Map<string, string>();
  for (const s of standing) {
    const soil = bedOf(s.tree.kind);
    for (const [dc, dr] of [
      [-1, -1],
      [-1, 0],
      [0, -1],
      [0, 0],
    ] as const)
      beds.set(`${s.home.c + dc},${s.home.r + dr}`, soil);
  }

  const content = new Set<string>([...track, ...beds.keys()]);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      if (has.pond && isPond(c, r)) content.add(`${c},${r}`);
      if (has.farm && isFarm(c, r)) content.add(`${c},${r}`);
    }
  const nearContent = (c: number, r: number) =>
    content.has(`${c + 1},${r}`) ||
    content.has(`${c - 1},${r}`) ||
    content.has(`${c},${r + 1}`) ||
    content.has(`${c},${r - 1}`);

  // ── Ground pass ──
  /*
   * The ground is emitted as one <path> per distinct colour, not one <polygon>
   * per tile.
   *
   * 955 land tiles is 955 identical diamonds differing only in `fill`, and at
   * one element each the page shipped ~2,070 SVG nodes — past Lighthouse's
   * 1,400-node budget on every profile, for a picture. Bucketing by colour
   * collapses them into roughly two dozen paths with no visual difference at
   * all: the tiles never overlap, so their paint order within a colour cannot
   * matter.
   */
  const ground = new Map<string, string[]>();
  const detail: ReactElement[] = [];
  for (let s = 0; s <= COLS + ROWS; s++) {
    for (let c = 0; c <= s && c < COLS; c++) {
      const r = s - c;
      if (r < 0 || r >= ROWS || !isLand(c, r)) continue;
      const key = `${c},${r}`;
      const x = sx(c, r);
      const y = sy(c, r);

      const pond = has.pond && isPond(c, r);
      const farm = has.farm && isFarm(c, r) && !pond;
      const onPath = track.has(key) && !pond && !farm;
      const bed = beds.get(key);
      const bank =
        !pond &&
        has.pond &&
        (isPond(c + 1, r) || isPond(c - 1, r) || isPond(c, r + 1) || isPond(c, r - 1));

      const snow = climate(c, r, "christmas", present);
      const dry = climate(c, r, "cactus", present);

      let fill: string;
      if (pond) fill = hash(c, r, 5) > 0.78 ? POND[1] : POND[0];
      else if (bed) fill = bed;
      else if (farm) fill = CROPS[(c * 2 + r) % CROPS.length].soil;
      // Snow wins over the path: a dirt track running across a snowfield is
      // bare earth where there should be none, and it was the single most
      // visible wrong thing in the north.
      else if (snow > 0.12 && snow >= dry) fill = FROST[Math.floor(hash(c, r, 43) * FROST.length)];
      else if (onPath) fill = DIRT[hash(c, r, 6) > 0.5 ? 0 : 1];
      else if (bank) fill = "#b3ab7d";
      else if (dry > 0.12) fill = SAND[Math.floor(hash(c, r, 44) * SAND.length)];
      else if (nearContent(c, r)) fill = GREEN[Math.floor(hash(c, r, 1) * GREEN.length)];
      else fill = groundTone(c, r);

      const bucket = ground.get(fill);
      const d = `M${x},${y}L${x + TW / 2},${y + TH / 2}L${x},${y + TH}L${x - TW / 2},${y + TH / 2}Z`;
      if (bucket) bucket.push(d);
      else ground.set(fill, [d]);

      const cy = y + TH / 2;
      const rim = !isLand(c + 1, r) || !isLand(c, r + 1) || !isLand(c - 1, r) || !isLand(c, r - 1);

      // ── detail ──
      if (pond) {
        if (hash(c, r, 51) > 0.68)
          detail.push(
            <rect
              key={`g${key}`}
              className="fi-glint"
              x={x - 7}
              y={cy - 1}
              width={10}
              height={2}
              fill={POND_GLINT}
              opacity={0.55}
            />,
          );
        if (hash(c, r, 52) > 0.82)
          detail.push(
            <g key={`lp${key}`}>
              <ellipse cx={x + 4} cy={cy + 2} rx={5} ry={2.5} fill="#6f8f5f" />
              <rect x={x + 2} y={cy} width={2} height={2} fill={BLOSSOM} />
            </g>,
          );
      } else if (bank && hash(c, r, 53) > 0.5) {
        detail.push(
          <g key={`re${key}`}>
            <rect x={x - 5} y={cy - 7} width={2} height={7} fill={REED} />
            <rect x={x - 1} y={cy - 10} width={2} height={10} fill={REED} />
            <rect x={x + 3} y={cy - 6} width={2} height={6} fill={REED} />
            <rect x={x + 6} y={cy - 2} width={6} height={3} fill={STONE} />
          </g>,
        );
      } else if (farm) {
        const crop = CROPS[(c * 2 + r) % CROPS.length];
        const rows: ReactElement[] = [];
        for (let i = 0; i < 3; i++) {
          const t = 0.26 + i * 0.24;
          const half = (TW / 2) * (1 - Math.abs(t - 0.5) * 2) * 0.84;
          rows.push(
            <line
              key={`f${i}`}
              x1={x - half}
              y1={y + TH * t - half / 2.4}
              x2={x + half}
              y2={y + TH * t + half / 2.4}
              stroke={CLIFF_SHADE}
              strokeWidth={1.5}
              opacity={0.42}
            />,
          );
          for (let d = -1; d <= 1; d++)
            rows.push(
              <rect
                key={`s${i}-${d}`}
                x={x + d * 8 - 1 + (i - 1) * 3}
                y={y + TH * t - 3}
                width={3}
                height={3}
                fill={crop.sprout}
              />,
            );
        }
        detail.push(<g key={`fa${key}`}>{rows}</g>);
      } else if (bed) {
        if ((c + r) % 2 === 0)
          detail.push(
            <polygon
              key={`bx${key}`}
              points={`${x},${y} ${x + TW / 2},${y + TH / 2} ${x},${y + TH} ${x - TW / 2},${y + TH / 2}`}
              fill="#000"
              opacity={0.05}
            />,
          );
        detail.push(
          <g key={`fu${key}`} stroke="#000" strokeWidth={1.4} opacity={0.15}>
            <line x1={x - TW / 4} y1={y + TH * 0.36} x2={x + TW / 4} y2={y + TH * 0.61} />
            <line x1={x - TW / 4} y1={y + TH * 0.6} x2={x + TW / 4} y2={y + TH * 0.85} />
          </g>,
        );
      } else if (onPath && snow <= 0.12) {
        if (hash(c, r, 56) > 0.52)
          detail.push(
            <rect key={`ss${key}`} x={x - 3} y={cy - 2} width={7} height={3} fill="#e0d0a8" />,
          );
      } else if (!rim) {
        // Nothing on a rim tile: something half over the lip reads as slipping
        // off the island.
        const d = scenery(
          c,
          r,
          cy,
          x,
          snow,
          dry,
          scatter,
          nearContent(c, r),
          climate(c, r, "cherry", present) > 0.35,
        );
        if (d) detail.push(d);
      }
    }
  }

  // ── Standing objects: ONE depth-sorted display list ──
  const placed: Placed[] = [];

  for (const { tree, home } of standing) {
    const x = sx(home.c, home.r);
    const y = sy(home.c, home.r);
    const h = Math.round(TREE_H * home.scale);
    const w = Math.round(h * 0.92);
    const stage = tree.stage_index + 1;

    placed.push({
      depth: y,
      el: (
        <g key={`tree-${tree.kind}`}>
          <Shadow x={x} y={y} w={w} />
          <image
            href={`/sprites/${spriteFile(tree.kind, tree.stage_index)}`}
            x={Math.round(x - w / 2)}
            y={Math.round(y - h)}
            width={w}
            height={h}
            preserveAspectRatio="xMidYMax meet"
            style={{ imageRendering: "pixelated" }}
          />
          {tree.kind === "cherry" && stage >= 4 && (
            <>
              {/*
                A hard boundary as well as tuned ranges. The distances above
                already keep blossom over its own bed, but a clip means no
                future tweak to a duration or a sway can quietly put petals on
                somebody else's ground again — the failure mode is silent, so it
                gets a guarantee rather than a promise.
              */}
              <clipPath id={`fi-petals-${tree.kind}`}>
                <ellipse cx={x} cy={y - h * 0.42} rx={w * 0.44} ry={h * 0.66} />
              </clipPath>
              <g clipPath={`url(#fi-petals-${tree.kind})`}>
                <Petals x={x} y={y} s={home.scale} />
              </g>
            </>
          )}
        </g>
      ),
    });

    /*
     * Decorations, placed against the tree's BODY rather than its sprite box.
     *
     * `pos` runs across the body (values past 0..1 sit deliberately clear of
     * the tree — the mine cart and the road sign are landmarks beside it, not
     * on it), `y` runs up it, and `rel` sizes each piece as a fraction of the
     * body's width so proportions hold from sapling to full grown.
     */
    const body = bodyRect(tree.kind, tree.stage_index, x, y, w, h);
    /*
     * `Object.hasOwn`, not `DECOR[kind] ?? []`. `tree.kind` is an unconstrained
     * jsonb key from the desktop app, so `constructor` returns the Object
     * function and `__proto__` returns Object.prototype — both truthy, so the
     * `??` never fires and `for…of` throws. That is a 500 on the player page
     * AND on the crawler-facing card route. This repo has been bitten by the
     * exact same shape once already (see lib/leaderboard-format.ts).
     */
    for (const d of Object.hasOwn(DECOR, tree.kind) ? DECOR[tree.kind] : []) {
      if (!hasDeco(d.key, tree.stage_index, growth)) continue;
      const dw = Math.max(8, Math.round(d.rel * body.w));
      const dh = Math.round(dw * decoAspect(d.file));
      const px = Math.round(body.x0 + d.pos * body.w);
      const anchorY = body.bot - (d.y ?? 0) * body.h + (d.dy ?? 0);
      // Hung pieces dangle from the anchor; everything else stands on it.
      const top = d.hang ? anchorY : anchorY - dh;
      const grounded = !d.y;
      placed.push({
        depth: d.layer === "behind" ? y - 4 : y + (grounded ? 14 : 4) + (d.dy ?? 0),
        el: (
          <g key={`${tree.kind}-${d.key}`}>
            {grounded && <Shadow x={px} y={anchorY} w={dw} />}
            <image
              href={`/sprites/${d.file}`}
              x={Math.round(px - dw / 2)}
              y={Math.round(top)}
              width={dw}
              height={dh}
              preserveAspectRatio="xMidYMax meet"
              style={{ imageRendering: "pixelated" }}
            />
          </g>
        ),
      });
    }
  }

  if (standing.length === 0) {
    const h = HOMES.apple;
    placed.push({
      depth: sy(h.c, h.r) + 8,
      el: (
        <Sprite
          key="fallow"
          file="BrokenFence.png"
          x={sx(h.c, h.r)}
          y={sy(h.c, h.r) + 14}
          w={104}
          h={34}
          shadow
        />
      ),
    });
  }

  if (has.waterfall && has.pond) {
    const { c, r } = POND_MOUTH;
    const x = sx(c, r);
    const y = sy(c, r);
    /*
     * The sheet is angled because the WALL is angled.
     *
     * Under this projection a tile is a diamond, so the rim it spills over is
     * one of the diamond's outward edges — a sloping line, not a horizontal
     * one. The cliff below is that edge extruded straight down (gravity is
     * still vertical on screen), which makes the falling sheet a parallelogram:
     * angled along the top, vertical down the sides. Drawing it as an upright
     * rectangle, as the first pass did, detached it from the rock and is what
     * read as "wrong perspective".
     *
     * Which edge faces out is decided from the neighbours, not assumed: the
     * south-west edge when the tile below is open, otherwise the south-east.
     */
    const swOpen = !isLand(c, r + 1);
    const a = swOpen ? { x: x, y: y + TH } : { x: x + TW / 2, y: y + TH / 2 };
    const b = swOpen ? { x: x - TW / 2, y: y + TH / 2 } : { x: x, y: y + TH };
    const drop = MIST_TOP - Math.max(a.y, b.y) + 18;

    /** A band inside the sheet, at t0..t1 across the rim, falling to `len`. */
    const band = (t0: number, t1: number, len: number, fill: string, key: string) => {
      const p0 = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 };
      const p1 = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 };
      return (
        <polygon
          key={key}
          points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p1.x},${p1.y + len} ${p0.x},${p0.y + len}`}
          fill={fill}
        />
      );
    };

    /**
     * Streaks of falling water.
     *
     * The first attempt slid one highlight from −12px to +12px and looped,
     * which snapped it back up at the end of every cycle — the jump the CEO
     * saw. Water cannot be animated that way: any single mark that travels a
     * finite distance has to teleport home eventually.
     *
     * The fix is to make the pattern PERIODIC and move it by exactly one
     * period. A ladder of dashes spaced `period` apart, translated `period`
     * over the cycle, ends the loop pixel-identical to how it started, so the
     * restart is invisible and the water simply keeps falling. Two ladders at
     * different periods and speeds give it some body.
     */
    const streaks = (t0: number, t1: number, period: number, fill: string, cls: string) => {
      const p0 = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 };
      const p1 = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 };
      const w = Math.max(2, Math.abs(p1.x - p0.x));
      const left = Math.min(p0.x, p1.x);
      const top = Math.min(p0.y, p1.y);
      const marks = [];
      // One extra period above and below, so a dash is always entering the top
      // and leaving the bottom rather than popping into existence.
      for (let k = -1; k * period < drop + period; k++) {
        marks.push(
          <rect
            key={k}
            x={Math.round(left)}
            y={Math.round(top + k * period)}
            width={Math.round(w)}
            height={Math.round(period * 0.55)}
            fill={fill}
          />,
        );
      }
      return (
        <g className={cls} style={{ ["--fi-period" as string]: `${period}px` }}>
          {marks}
        </g>
      );
    };

    placed.push({
      depth: 9999,
      el: (
        <g key="fall">
          {/* the spilling lip: the mouth tile's outward half, as water */}
          <polygon
            points={`${x},${y} ${x + TW / 2},${y + TH / 2} ${x},${y + TH} ${x - TW / 2},${y + TH / 2}`}
            fill={POND[0]}
          />
          {band(0.02, 0.99, drop, "#4e7481", "back")}
          {band(0.12, 0.9, drop, POND[1], "mid")}
          <clipPath id={`${clipId}-fall`}>
            {band(0.02, 0.99, drop, "#fff", "clip")}
          </clipPath>
          <g clipPath={`url(#${clipId}-fall)`}>
            {streaks(0.18, 0.44, 26, "#bcd6d2", "fi-stream")}
            {streaks(0.5, 0.72, 34, "#dcebe4", "fi-stream fi-stream-2")}
            {streaks(0.76, 0.92, 22, "#a8c6c4", "fi-stream fi-stream-3")}
          </g>
          {/*
            Spray, raised to straddle the mist line rather than sit under it.
            At the sheet's true foot it landed inside the opaque cloud band that
            MistSea paints afterwards, so it was drawn and then buried — visible
            in no render at all.
          */}
          <ellipse
            cx={(a.x + b.x) / 2}
            cy={(a.y + b.y) / 2 + drop - 24}
            rx={16}
            ry={5}
            fill={SKY[0]}
            opacity={0.8}
          />
          <ellipse
            cx={(a.x + b.x) / 2 - 6}
            cy={(a.y + b.y) / 2 + drop - 16}
            rx={11}
            ry={4}
            fill={SKY[0]}
            opacity={0.55}
          />
        </g>
      ),
    });
  }

  placed.sort((a, b) => a.depth - b.depth);

  return (
    <div className={`fi-bleed ${className}`}>
      <style>{CSS}</style>
      <svg
        viewBox={`${L.x} ${L.y} ${L.w} ${L.h}`}
        width="100%"
        role="presentation"
        aria-hidden
        shapeRendering="crispEdges"
        style={{ display: "block", height: "auto" }}
      >
        <defs>
          {/* The id carries the player's shape: two islands on one page would
              otherwise collide on a duplicate DOM id. */}
          <clipPath id={clipId}>
            <path d={CLIFF_PATH} />
          </clipPath>
        </defs>

        {SKY.map((col, i) => (
          <rect key={i} x={L.x} y={L.y + (L.h * i) / 5} width={L.w} height={L.h} fill={col} />
        ))}

        {has.ridge3 && <Ridge y={L.y + L.h * 0.3} fill={HILL[0]} seed={2} amp={44} />}
        <Ridge y={L.y + L.h * 0.37} fill={HILL[1]} seed={5} amp={36} />
        <Ridge y={L.y + L.h * 0.44} fill={HILL[2]} seed={8} amp={28} />
        <Spire x={L.x + L.w * 0.04} baseY={MIST_TOP + 10} h={104} w={82} tone={HILL[1]} />
        <Spire x={L.x + L.w * 0.96} baseY={MIST_TOP + 14} h={84} w={68} tone={HILL[2]} />

        {/*
          The mist behind the island, which is what makes the mountains STAND in
          cloud instead of being cut off by it.
          A ridge is a filled polygon: its silhouette on top, its body running
          all the way to the bottom of the frame. With nothing between the
          ridges and the island, that body showed either side of the island as a
          flat grey band lying across the picture — the one the CEO spotted
          above the clouds. Swallowing the feet here, before the island is
          drawn, removes it; the island then paints over this band anyway, so
          nothing in front is affected.
        */}
        <MistBand top={L.y + L.h * 0.47} seed={41} />

        <g clipPath={`url(#${clipId})`}>
          <rect x={L.x} y={L.y} width={L.w} height={L.h} fill={CLIFF_BASE} />
          {CLIFF_VERTICALS}
          {CLIFF_SEAMS}
          <rect
            x={L.x}
            y={MIST_TOP - 36}
            width={L.w}
            height={200}
            fill={CLIFF_SHADE}
            opacity={0.15}
          />
        </g>

        <g>
          {[...ground].map(([fill, ds]) => (
            <path key={fill} d={ds.join("")} fill={fill} />
          ))}
        </g>
        <g>{detail}</g>
        <g>{placed.map((p) => p.el)}</g>

        {present.has("christmas") && (
          <>
            <clipPath id="fi-snowfield">
              {/* The snowfield's own screen ellipse, plus headroom for the
                  column of falling flakes above it. */}
              <ellipse
                cx={sx(HOMES.christmas.c, HOMES.christmas.r)}
                cy={sy(HOMES.christmas.c, HOMES.christmas.r) - 70}
                rx={((CLIMATE_R.christmas[0] + CLIMATE_R.christmas[1]) * TW) / 2.6}
                ry={130}
              />
            </clipPath>
            <g clipPath="url(#fi-snowfield)">
              <Snowfall
            x={sx(HOMES.christmas.c, HOMES.christmas.r)}
            y={sy(HOMES.christmas.c, HOMES.christmas.r)}
            // Half the snowfield's own screen width, so flakes cannot drift out
            // of the snow they belong to.
            halfW={(CLIMATE_R.christmas[0] * TW) / 2.6}
              top={168}
              />
            </g>
          </>
        )}

        <MistSea />
      </svg>
    </div>
  );
}

// ── Ground tone ─────────────────────────────────────────────────────────────

function warmth(c: number, r: number): number {
  return (
    hash(Math.floor(c / 4), Math.floor(r / 4), 31) * 0.68 +
    hash(Math.floor(c / 8), Math.floor(r / 7), 33) * 0.32
  );
}
function groundTone(c: number, r: number): string {
  const lf = warmth(c, r);
  const ramp: readonly string[] = lf > 0.74 ? WARM : GREEN;
  const t = lf * 0.7 + hash(c, r, 1) * 0.3;
  return ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
}

// ── Scenery ─────────────────────────────────────────────────────────────────

/**
 * The small stuff. Density rides growth and clusters near whatever is going on,
 * and the KIND of thing follows the local climate — dry tufts and stones in the
 * desert, snow mounds and bare twigs in the cold, bushes and flowers elsewhere.
 */
function scenery(
  c: number,
  r: number,
  cy: number,
  x: number,
  snow: number,
  dry: number,
  scatter: number,
  near: boolean,
  petal: boolean,
): ReactElement | null {
  // Inside a climate the ground is busier: that density is what makes the
  // snowfield and the desert read as weather rather than as a recoloured patch.
  const zone = Math.max(snow, dry);
  const interest = (near ? 1 : 0.32) + zone * 1.5;
  if (hash(c, r, 21) >= (0.14 + 0.42 * scatter) * interest) return null;
  const k = hash(c, r, 22);
  const key = `d${c},${r}`;

  // Blossom is the cherry tree's, so it falls near the cherry tree. Scattered
  // island-wide it landed on the snowfield and on bare grass half a map away,
  // with nothing to explain it.
  /*
   * Same threshold the ground uses, deliberately.
   *
   * The fill switched to snow at 0.12 and the scenery switched at 0.14, so a
   * tile sitting between the two got a white surface and brown-grass props —
   * fallen logs lying on a snowfield, which is what those stray marks were.
   */
  if (snow > 0.12 && snow >= dry) {
    if (k < 0.45)
      return (
        <g key={key} fill={SNOW} opacity={0.85}>
          <rect x={x - 7} y={cy - 2} width={9} height={3} />
          <rect x={x + 2} y={cy} width={6} height={3} />
        </g>
      );
    if (k < 0.75)
      /*
       * A snow-capped shrub, not a bare twig.
       *
       * The twig was a brown upright with an arm off it, and on a white field
       * with nothing around it that silhouette reads as a stray glyph — both
       * the CEO and the review flagged it as a rendering artifact. A dark mass
       * with snow sitting on top reads as a plant under snow at any size.
       */
      return (
        <g key={key}>
          <ellipse cx={x} cy={cy - 3} rx={7} ry={4} fill="#4d6349" />
          <ellipse cx={x - 1} cy={cy - 5} rx={5} ry={3} fill={SNOW} opacity={0.9} />
        </g>
      );
    return (
      <polygon
        key={key}
        points={`${x},${cy - 4} ${x + 6},${cy} ${x},${cy + 4} ${x - 6},${cy}`}
        fill={STONE_DARK}
      />
    );
  }

  if (dry > 0.12) {
    if (k < 0.4)
      return (
        <g key={key} fill={STONE}>
          <rect x={x - 5} y={cy - 3} width={7} height={4} />
          <rect x={x + 3} y={cy - 1} width={4} height={3} />
        </g>
      );
    if (k < 0.7)
      return (
        <g key={key} fill={WARM[0]}>
          <rect x={x - 3} y={cy - 6} width={2} height={6} />
          <rect x={x} y={cy - 4} width={2} height={4} />
          <rect x={x + 3} y={cy - 5} width={2} height={5} />
        </g>
      );
    return (
      <g key={key} fill={SAND[0]}>
        <rect x={x - 6} y={cy - 1} width={12} height={2} />
      </g>
    );
  }

  /*
   * Grassland props only where there is actually grassland.
   *
   * Bailing on ANY trace of climate rather than on a matching threshold: the
   * two branches above and the ground fill each had their own cutoff, and a
   * tile that fell between them got a white surface with brown logs lying on
   * it. A shared number would fix today's mismatch; refusing to run at all
   * outside plain grass makes the whole class impossible.
   */
  if (snow > 0 || dry > 0) return null;

  if (k < 0.32) {
    const g = GREEN[Math.floor(hash(c, r, 23) * GREEN.length)];
    return (
      <g key={key} fill={g}>
        <rect x={x - 4} y={cy - 4} width={2} height={4} />
        <rect x={x - 1} y={cy - 6} width={2} height={6} />
        <rect x={x + 2} y={cy - 3} width={2} height={3} />
      </g>
    );
  }
  // A diamond, not an axis-aligned bar: every other thing on this island sits
  // on the isometric grid, so a square-on rectangle reads as debris dropped on
  // top of the picture rather than as a stone lying in the grass.
  if (k < 0.5)
    return (
      <polygon
        key={key}
        points={`${x},${cy - 4} ${x + 6},${cy} ${x},${cy + 4} ${x - 6},${cy}`}
        fill={STONE}
      />
    );
  if (k < 0.72)
    return (
      <g key={key}>
        <ellipse cx={x} cy={cy - 3} rx={7} ry={4} fill={BUSH[0]} />
        <ellipse cx={x - 2} cy={cy - 5} rx={4} ry={2.5} fill={BUSH[1]} />
      </g>
    );
  // A fallen log and a flower are both things that need a reason to be there.
  // Alone on empty turf they read as debris and as a dead pixel respectively,
  // so both wait for something to be near.
  if (!near) return null;
  if (k < 0.86)
    return (
      <g key={key}>
        <polygon points={`${x - 9},${cy - 1} ${x - 1},${cy - 5} ${x + 9},${cy} ${x + 1},${cy + 4}`} fill={LOG} />
        <polygon points={`${x - 9},${cy - 2} ${x - 1},${cy - 6} ${x + 9},${cy - 1} ${x + 1},${cy + 3}`} fill="#8f6f52" />
      </g>
    );
  const f = petal ? BLOSSOM : WARM[3];
  return (
    <g key={key} fill={f}>
      <rect x={x - 4} y={cy - 4} width={3} height={3} />
      <rect x={x + 1} y={cy - 6} width={3} height={3} />
      <rect x={x + 2} y={cy - 1} width={3} height={3} />
    </g>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

/** Contact shadow — grey-green, never black (§ 8.2): a black pool under a
 *  sprite reads as a hole in the ground, a cooled ground tone reads as shade. */
function Shadow({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <ellipse cx={x} cy={y + 2} rx={Math.round(w * 0.3)} ry={4} fill="#3e4a3a" opacity={0.22} />
  );
}

function Sprite({
  file,
  x,
  y,
  w,
  h,
  shadow = false,
}: {
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shadow?: boolean;
}) {
  return (
    <g>
      {shadow && <Shadow x={x} y={y} w={w} />}
      <image
        href={`/sprites/${file}`}
        x={Math.round(x - w / 2)}
        y={Math.round(y - h)}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMax meet"
        style={{ imageRendering: "pixelated" }}
      />
    </g>
  );
}

/**
 * Blossom coming off the cherry tree.
 *
 * Three things make it read as falling petals rather than as squares sliding
 * down. Each petal has its OWN duration and sideways travel, so they never move
 * as a block. Each rotates on its own axis, which is what a petal actually does
 * on the way down. And they start spread through the canopy's depth rather than
 * in a line, so the fall has thickness.
 *
 * **Every petal lands on this tree's own ground.** The fall distance is derived
 * from where the petal starts, not chosen independently, so one that begins
 * high falls further and one that begins low falls less — and all of them stop
 * at the same line just below the trunk. Independent distances is what had
 * blossom drifting a hundred pixels past the bed and onto other people's
 * ground.
 *
 * Every number comes from the petal's index — nothing is random, so the same
 * tree sheds the same way on every visit.
 */
function Petals({ x, y, s }: { x: number; y: number; s: number }) {
  const n = 14;
  const spread = 62 * s; // half-width, kept inside the canopy's own footprint
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const dx = ((i * 53) % 100) / 100 - 0.5;
        const depth = ((i * 31) % 100) / 100;
        const size = 3 + (i % 3);
        const dur = 7 + ((i * 17) % 60) / 10; // 7 – 13 s
        const sway = 10 + ((i * 23) % 22); // gentle, so it stays under the tree
        const startUp = (88 + depth * 92) * s; // how far above the base it begins
        return (
          <rect
            key={i}
            className="fi-petal"
            x={Math.round(x + dx * spread * 2)}
            y={Math.round(y - startUp)}
            width={size}
            height={size}
            fill={i % 4 === 0 ? "#e8bcb6" : BLOSSOM}
            style={{
              animationDuration: `${dur}s`,
              animationDelay: `-${((i * 37) % 90) / 10}s`,
              // Lands on the ground it fell from, every time.
              ["--fi-fall" as string]: `${Math.round(startUp + 8)}px`,
              ["--fi-sway" as string]: `${-sway}px`,
              ["--fi-spin" as string]: `${i % 2 ? 220 : -260}deg`,
            }}
          />
        );
      })}
    </g>
  );
}

/**
 * Snow over the christmas tree's field.
 *
 * Deliberately unlike the petals: snow falls slower, straighter and denser, and
 * it does not spin — a flake tumbling like a leaf reads as ash. The only shared
 * machinery is the per-item timing, so neither weather ever pulses in step.
 *
 * Bounded to the snowfield the same way the blossom is bounded to its canopy:
 * the spread is a fraction of the field's own half-width, and each flake's fall
 * is derived from its start so it settles on the snow rather than carrying on
 * into the grass beyond.
 */
function Snowfall({ x, y, halfW, top }: { x: number; y: number; halfW: number; top: number }) {
  const n = 22;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const dx = ((i * 47) % 100) / 100 - 0.5;
        const size = 2 + (i % 2);
        const dur = 9 + ((i * 29) % 70) / 10; // 9 – 16 s
        const startUp = top - ((i * 17) % 46); // spread through the column
        return (
          <rect
            key={i}
            className="fi-snow"
            x={Math.round(x + dx * halfW * 1.5)}
            y={Math.round(y - startUp)}
            width={size}
            height={size}
            fill="#ffffff"
            opacity={0.55 + (i % 3) * 0.15}
            style={{
              animationDuration: `${dur}s`,
              animationDelay: `-${((i * 43) % 100) / 10}s`,
              ["--fi-fall" as string]: `${Math.round(startUp + 6)}px`,
              ["--fi-sway" as string]: `${i % 2 ? 7 : -7}px`,
            }}
          />
        );
      })}
    </g>
  );
}

/** Vertical strokes over the cliff base — layered rock per § 9.1, in place of
 *  the flat brown that read as cardboard. Player-independent, built once. */
const CLIFF_VERTICALS = (() => {
  const out: ReactElement[] = [];
  let x = L.x;
  let i = 0;
  while (x < L.x + L.w) {
    const w = 7 + Math.round(hash(i, 7, 17) * 13);
    if (hash(i, 3, 18) > 0.35)
      out.push(
        <rect
          key={`v${i}`}
          x={x}
          y={L.y}
          width={w}
          height={L.h}
          fill={CLIFF_VERTS[Math.floor(hash(i, 9, 19) * CLIFF_VERTS.length)]}
          opacity={0.55}
        />,
      );
    x += w + 3 + Math.round(hash(i, 11, 20) * 9);
    i++;
  }
  return out;
})();

/** A few near-horizontal seams — § 9.1 wants mostly vertical with a little
 *  bedding showing through. */
const CLIFF_SEAMS = (() => {
  const out: ReactElement[] = [];
  for (let i = 0; i < 7; i++) {
    const y = MIST_TOP - 78 + i * 13 + Math.round(hash(i, 5, 23) * 8);
    out.push(
      <rect key={`s${i}`} x={L.x} y={y} width={L.w} height={2} fill={CLIFF_SHADE} opacity={0.18} />,
    );
  }
  return out;
})();

function Ridge({ y, fill, seed, amp }: { y: number; fill: string; seed: number; amp: number }) {
  const pts: string[] = [];
  for (let i = 0; i <= 30; i++) {
    const px = Math.round(L.x + (i / 30) * L.w);
    const py = Math.round(y - hash(i, seed, seed) * amp);
    pts.push(`${px},${py}`);
  }
  return (
    <polygon points={`${L.x},${y + L.h} ${pts.join(" ")} ${L.x + L.w},${y + L.h}`} fill={fill} />
  );
}

/**
 * A soft-topped band of cloud that fills everything below it.
 *
 * Used twice: once behind the island to drown the distant ridges' feet, and
 * once in front to drown the cliff's cut base. Both times the job is the same —
 * hide where a shape stops being drawn, so it reads as receding into air rather
 * than as ending.
 */
function MistBand({ top, seed }: { top: number; seed: number }) {
  const puffs: ReactElement[] = [];
  for (let i = 0; i < 22; i++) {
    puffs.push(
      <ellipse
        key={i}
        cx={L.x + (i / 21) * L.w + (hash(i, 1, seed) - 0.5) * 46}
        cy={top + (hash(i, 2, seed) - 0.4) * 20}
        rx={40 + hash(i, 3, seed) * 44}
        ry={11 + hash(i, 4, seed) * 9}
        fill={SKY[hash(i, 5, seed) > 0.5 ? 0 : 1]}
      />,
    );
  }
  return (
    <g>
      {puffs}
      <rect x={L.x} y={top + 8} width={L.w} height={L.y + L.h - top} fill={SKY[1]} />
    </g>
  );
}

/** A neighbouring peak in the same mist — the island belongs to a range, not
 *  to a void. */
function Spire({
  x,
  baseY,
  h,
  w,
  tone,
}: {
  x: number;
  baseY: number;
  h: number;
  w: number;
  tone: string;
}) {
  return (
    <g>
      <polygon
        points={`${x - w / 2},${baseY} ${x - w / 5},${baseY - h * 0.72} ${x},${baseY - h} ${x + w / 4},${baseY - h * 0.6} ${x + w / 2},${baseY}`}
        fill={tone}
      />
      <polygon
        points={`${x - w / 5},${baseY - h * 0.72} ${x},${baseY - h} ${x + w / 4},${baseY - h * 0.6} ${x + w / 8},${baseY - h * 0.35} ${x - w / 8},${baseY - h * 0.4}`}
        fill={GREEN[4]}
        opacity={0.5}
      />
    </g>
  );
}

/** The cloud sea the mountain stands in. */
function MistSea() {
  const puffs: ReactElement[] = [];
  for (let i = 0; i < 20; i++) {
    const x = L.x + (i / 19.2) * L.w + (hash(i, 1, 61) - 0.5) * 40;
    puffs.push(
      <ellipse
        key={`a${i}`}
        cx={x}
        cy={MIST_TOP + (hash(i, 4, 64) - 0.3) * 16}
        rx={44 + hash(i, 2, 62) * 42}
        ry={12 + hash(i, 3, 63) * 8}
        fill={SKY[hash(i, 5, 65) > 0.5 ? 0 : 1]}
        opacity={0.9}
      />,
    );
  }
  for (let i = 0; i < 10; i++) {
    puffs.push(
      <ellipse
        key={`b${i}`}
        cx={L.x + (i / 9.1) * L.w + (hash(i, 6, 66) - 0.5) * 60}
        cy={MIST_TOP - 13 - hash(i, 7, 67) * 11}
        rx={32 + hash(i, 8, 68) * 24}
        ry={8 + hash(i, 9, 69) * 5}
        fill={SKY[0]}
        opacity={0.55}
      />,
    );
  }
  // Wisps at the frame's sides so the fog envelops rather than underlines
  // (§ 3.1, § 28.3).
  for (let i = 0; i < 2; i++)
    puffs.push(
      <ellipse
        key={`w${i}`}
        cx={i === 0 ? L.x + 24 : L.x + L.w - 24}
        cy={L.y + L.h * (0.42 + hash(i, 15, 75) * 0.1)}
        rx={60 + hash(i, 16, 76) * 28}
        ry={11 + hash(i, 17, 77) * 6}
        fill={SKY[0]}
        opacity={0.5}
      />,
    );
  // Mist lapping the flanks at uneven heights — a level waterline reads as a
  // bathtub.
  for (let i = 0; i < 6; i++)
    puffs.push(
      <ellipse
        key={`f${i}`}
        cx={i < 3 ? L.x + 26 + i * 42 : L.x + L.w - 26 - (i - 3) * 48}
        cy={MIST_TOP - 24 - hash(i, 11, 71) * 32}
        rx={28 + hash(i, 12, 72) * 20}
        ry={9 + hash(i, 13, 73) * 5}
        fill={SKY[0]}
        opacity={0.7}
      />,
    );
  return (
    <g>
      {puffs}
      <rect x={L.x} y={MIST_TOP + 9} width={L.w} height={L.y + L.h - MIST_TOP - 9} fill="#ede4c2" />
      <rect x={L.x} y={L.y + L.h - 14} width={L.w} height={14} fill={SKY[0]} />
    </g>
  );
}

const CSS = `
/*
 * The island bleeds past the text column into the page's side margins.
 *
 * Two earlier attempts failed for different reasons worth recording. Tailwind
 * negative-margin utilities put the class names in the HTML but no rule was
 * ever generated. Owning the rule here fixed that and still did nothing —
 * because globals.css carries a site-wide "section { overflow-x: clip }" rule to
 * keep phones from scrolling sideways, and this picture lives inside a
 * <section>. A negative margin cannot escape a clip.
 *
 * So the width is taken from the VIEWPORT rather than from the column: the box
 * is min(100vw - 2rem, 1060px) wide and re-centred on the viewport by pulling
 * half the difference back. It never exceeds the viewport, so the clip has
 * nothing to cut and no scrollbar can appear.
 */
.fi-bleed {
  width: min(calc(100vw - 2rem), 1060px);
  max-width: none;
  margin-left: calc(50% - min(calc(50vw - 1rem), 530px));
  margin-right: 0;
}
.fi-petal { animation: fi-drift 10s linear infinite; transform-origin: 50% 50%; }
.fi-snow  { animation: fi-snow 12s linear infinite; }
.fi-glint { animation: fi-shimmer 5s ease-in-out infinite; }
.fi-stream   { animation: fi-stream 1.15s linear infinite; }
.fi-stream-2 { animation-duration: 1.75s; }
.fi-stream-3 { animation-duration: 0.85s; }
/* Each petal reads its own distance, drift and spin from custom properties, so
   fourteen of them share one keyframe without ever moving as a block. */
@keyframes fi-drift {
  0%   { transform: translate(0,0) rotate(0deg);                              opacity: 0; }
  12%  { opacity: 1; }
  55%  { transform: translate(calc(var(--fi-sway) * 0.35), calc(var(--fi-fall) * 0.5))
                    rotate(calc(var(--fi-spin) * 0.5)); }
  88%  { opacity: 1; }
  100% { transform: translate(var(--fi-sway), var(--fi-fall)) rotate(var(--fi-spin));
         opacity: 0; }
}

/* Snow: slower, straighter, no spin. A flake that tumbles reads as ash. */
@keyframes fi-snow {
  0%   { transform: translate(0,0);                                   opacity: 0; }
  10%  { opacity: 1; }
  50%  { transform: translate(var(--fi-sway), calc(var(--fi-fall) * 0.5)); }
  90%  { opacity: 1; }
  100% { transform: translate(0, var(--fi-fall));                     opacity: 0; }
}


@keyframes fi-shimmer {
  0%, 100% { opacity: 0.2; transform: translateX(0); }
  50%      { opacity: 0.6; transform: translateX(7px); }
}
/* Exactly one period: the last frame is identical to the first, so the loop
   has no visible restart. */
@keyframes fi-stream {
  from { transform: translateY(0); }
  to   { transform: translateY(var(--fi-period)); }
}
@media (prefers-reduced-motion: reduce) {
  .fi-petal, .fi-snow, .fi-glint, .fi-stream { animation: none; }
  /* Still visible, just still: the weather is part of the picture, not an
     embellishment that can be dropped. */
  .fi-petal, .fi-snow { opacity: 1; }
}
`;
