import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPlayer } from "@/lib/leaderboard";
import { spriteFile } from "@/lib/leaderboard-format";

/**
 * The picture that travels with a player's link.
 *
 * The site-wide card (app/opengraph-image.tsx) is what every other route sends,
 * and it is the same picture whoever shares it. On a page whose entire reason to
 * exist is "this one is mine" that is the wrong picture, so this route draws the
 * player's own tree, name, standing and project name instead.
 *
 * ── This address is checked for itself ──────────────────────────────────────
 * A chat app fetches the picture without ever loading the page, so the page
 * having passed a visibility check proves nothing here. This route runs the same
 * `getPlayer` the page runs and inherits the same withholding (hidden, banned,
 * or held by the anti-cheat rules). Anything it cannot resolve — for any reason,
 * including a database it cannot reach — draws the brand variant. See
 * docs/features/share-card.md § 2.3, § 3.2, § 3.9.
 *
 * ── Nothing here may wait forever ───────────────────────────────────────────
 * Every fetcher of this route is a crawler that will give up and show no card at
 * all, and a card that never arrives is the worst outcome the whole design
 * exists to avoid. Both awaits that leave this process are raced against an
 * explicit deadline, and every failure lands on a drawable fallback.
 */

export const runtime = "nodejs";

/*
 * Five minutes, not the hour `sitemap.ts` uses.
 *
 * That hour governs how fast a player becomes findable, where being late costs
 * nothing. This window governs how long a card outlives a TAKEDOWN — a project
 * pulled by a moderator (0029/0030), a player hidden, a player banned — because
 * regeneration is when eligibility is re-derived. These URLs are fetched only
 * when somebody actually shares a link, so the twelvefold shorter window costs
 * close to nothing.
 */
export const revalidate = 300;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Token Forest player's forest and standing";

/** Everything drawn that is not the player's own words. Latin by construction:
 *  the brand variant must never depend on a font we had to go and fetch. */
const FIXED_TEXT = "ALL TIME LAST 30 DAYS Token Forest #0123456789";

const SKY = "linear-gradient(180deg, #8fb8d0 0%, #c4dce8 52%, #e8d5a8 100%)";
const GROUND = "#3a7d44";
const INK = "#2f6b39";
const SOIL = "#3f3222";
const GOLD = "#c8943c";

const DB_TIMEOUT_MS = 2500;
const FONT_TIMEOUT_MS = 2500;

/**
 * A sprite as a data URL — Satori cannot fetch, so the bytes have to be inlined.
 *
 * Returns null rather than throwing. `spriteFile` already refuses to build a
 * filename out of anything but a known species, so a miss here means the file
 * is genuinely absent (a species shipped in the app before its art reached the
 * site, a bad deploy), and a card drawn without its tree still beats a route
 * that 500s at a crawler.
 */
function sprite(file: string): string | null {
  try {
    const bytes = readFileSync(join(process.cwd(), "public/sprites", file));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

// ── Text preparation ─────────────────────────────────────────────────────────

/*
 * Pictographs are removed from anything drawn.
 *
 * The renderer resolves emoji by fetching an SVG per character from a public
 * CDN — a network call this route did not budget for and cannot put a deadline
 * on, on an endpoint whose entire audience is crawlers that give up. The name
 * still reaches the reader intact: chat apps show it as ordinary text beside the
 * picture, drawn by their own device. Only the drawing loses it.
 *
 * `Extended_Pictographic` rather than a hand-rolled block range: the blocks that
 * look like "the emoji ones" also hold ★ ✓ → † and similar, which real usernames
 * are decorated with, which the subset font does cover, and which no CDN is
 * consulted for. Stripping those would be removing characters for nothing.
 */
const PICTOGRAPH = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{20E3}]/gu;

function drawable(value: string | null | undefined): string {
  return (value ?? "").replace(PICTOGRAPH, "").trim();
}

/**
 * Truncate by visual width rather than by character count: at 64px a Chinese
 * name runs roughly twice as wide per character as a Latin one, so `slice(0,18)`
 * fits one alphabet and overflows the other.
 */
function clamp(value: string, maxUnits: number): string {
  let units = 0;
  let out = "";
  for (const ch of value) {
    const w = ch.codePointAt(0)! > 0x2e7f ? 2 : 1;
    if (units + w > maxUnits) return `${out}…`;
    units += w;
    out += ch;
  }
  return out;
}

// ── Font ─────────────────────────────────────────────────────────────────────

/** Anything above this needs a face we do not ship. Latin, Latin-1, Latin
 *  Extended-A/B and the IPA block all sit below it. */
const LATIN_CEILING = 0x02ff;

function needsSubset(text: string): boolean {
  for (const ch of text) if (ch.codePointAt(0)! > LATIN_CEILING) return true;
  return false;
}

/**
 * Which family covers this text.
 *
 * Order is load-bearing. Noto Sans SC covers neither kana nor hangul, so a
 * Japanese name mixing kanji with kana must resolve to JP (which covers both)
 * and a Korean one to KR — checking Han first would send both to SC and draw
 * boxes for exactly the characters that make the name Japanese or Korean.
 */
function family(text: string): string {
  if (/[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7FF]/.test(text)) return "Noto Sans KR";
  if (/[\u3040-\u30FF\u31F0-\u31FF]/.test(text)) return "Noto Sans JP";
  if (/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(text)) return "Noto Sans SC";
  return "Noto Sans";
}

/*
 * Google tailors this CSS to the User-Agent, and the modern one is served woff2,
 * which the renderer cannot parse — the card would come back with every glyph
 * silently missing. An ancient UA gets TrueType instead.
 *
 * That is an assumption about somebody else's server, so the result is checked
 * rather than trusted: the declared format is verified, and then the bytes
 * themselves are, because a URL can lie about what it serves.
 */
const ANCIENT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/533.20.25 (KHTML, like Gecko) Version/5.0.4 Safari/533.20.27";

const PARSEABLE_FORMAT = /^(truetype|opentype|woff)$/;
const PARSEABLE_SUFFIX = /\.(ttf|otf|woff)(\?|$)/i;

/**
 * sfnt magic numbers the renderer can open, as bytes.
 *
 * Compared numerically, not as a decoded string: TrueType's tag is
 * `00 01 00 00`, which cannot be written legibly as a string literal, and
 * decoding first would mangle any byte above 0x7F into a replacement character.
 * `wOF2` (77 4F 46 32) is deliberately absent — it is the case this catches.
 */
const SFNT_TAGS: readonly number[][] = [
  [0x00, 0x01, 0x00, 0x00], // TrueType
  [0x74, 0x72, 0x75, 0x65], // 'true'
  [0x74, 0x74, 0x63, 0x66], // 'ttcf'
  [0x4f, 0x54, 0x54, 0x4f], // 'OTTO'
  [0x77, 0x4f, 0x46, 0x46], // 'wOFF'
];

function isParseableFont(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 4) return false;
  const head = new Uint8Array(bytes, 0, 4);
  return SFNT_TAGS.some((tag) => tag.every((b, i) => head[i] === b));
}

/**
 * A subset of `family` containing only the characters this card draws — a few
 * kilobytes rather than a multi-megabyte CJK face.
 *
 * Returns null on every failure, and every failure means the same thing to the
 * caller: draw the card without the player's words. One deadline covers both
 * requests — a deadline per request would quietly permit twice the wait, which
 * is the mistake worth naming since the second fetch was added later.
 */
async function subsetFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const deadline = AbortSignal.timeout(FONT_TIMEOUT_MS);
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family(text)).replace(/%20/g, "+")}:wght@700&text=${encodeURIComponent(text)}`;

    const css = await fetch(url, {
      headers: { "User-Agent": ANCIENT_UA },
      signal: deadline,
    }).then((r) => (r.ok ? r.text() : ""));

    const match = css.match(/src:\s*url\((https:\/\/[^)]+)\)(?:\s*format\('([^']+)'\))?/);
    if (!match) return null;

    const [, href, format] = match;
    const declared = format ? PARSEABLE_FORMAT.test(format) : false;
    if (!declared && !PARSEABLE_SUFFIX.test(href)) return null;

    const bytes = await fetch(href, { signal: deadline }).then((r) =>
      r.ok ? r.arrayBuffer() : null,
    );
    if (!bytes || !isParseableFont(bytes)) return null;
    return bytes;
  } catch {
    return null;
  }
}

// ── Composition ──────────────────────────────────────────────────────────────

function Card({
  treeSrc,
  name,
  lifetimeRank,
  recentRank,
  project,
}: {
  treeSrc: string | null;
  name: string | null;
  lifetimeRank: number | null;
  recentRank: number | null;
  project: string | null;
}) {
  const personal = name !== null || lifetimeRank !== null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        backgroundImage: SKY,
      }}
    >
      {/*
        Bottom-aligned, not centred. A stage-1 sapling occupies a small corner of
        its sprite canvas, so a vertically centred box leaves it floating in mid
        air — which reads as a rendering bug rather than as a young tree. Anchored
        to the ground strip, every stage from sapling to full canopy stands on the
        same line and a small tree simply looks small.
      */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: personal ? "flex-start" : "center",
          padding: "0 72px",
          gap: 40,
        }}
      >
        {treeSrc && (
          <img
            src={treeSrc}
            width={340}
            height={368}
            style={{ objectFit: "contain", flexShrink: 0 }}
            alt=""
          />
        )}

        {personal && (
          <div
            style={{ display: "flex", flexDirection: "column", minWidth: 0, paddingBottom: 76 }}
          >
            {name && (
              <div
                style={{
                  display: "flex",
                  fontSize: 64,
                  fontWeight: 700,
                  color: INK,
                  lineHeight: 1.1,
                }}
              >
                {name}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "row", gap: 48, marginTop: 26 }}>
              {lifetimeRank !== null && <Rank value={lifetimeRank} caption="ALL TIME" />}
              {recentRank !== null && <Rank value={recentRank} caption="LAST 30 DAYS" />}
            </div>

            {project && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 30,
                  gap: 14,
                }}
              >
                {/* A drawn square, not a glyph — a subset font is only asked for
                    the characters we listed, and a marker is not one of them. */}
                <div style={{ display: "flex", width: 14, height: 14, backgroundColor: GOLD }} />
                <div style={{ display: "flex", fontSize: 34, color: SOIL }}>{project}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: personal ? "flex-end" : "center",
          padding: "0 88px 22px",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: INK }}>
          Token Forest
        </div>
      </div>

      <div style={{ display: "flex", width: "100%", height: 40, backgroundColor: GROUND }} />
    </div>
  );
}

function Rank({ value, caption }: { value: number; caption: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
        #{value}
      </div>
      <div style={{ display: "flex", marginTop: 8, fontSize: 22, color: SOIL, letterSpacing: 2 }}>
        {caption}
      </div>
    </div>
  );
}

// ── Route ────────────────────────────────────────────────────────────────────

/**
 * Resolve `work`, or null if it has not settled within `ms`.
 *
 * A module-level helper rather than an inline race in the route: the timer has
 * to be cleared in a `finally` (left pending it keeps the function alive for the
 * whole budget even when the query answered in 40ms), and a reassigned local
 * inside the route body is what the React compiler's immutability rule rejects
 * — reasonably, since it cannot tell an image route from a component.
 */
async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * `params` is awaited rather than read directly: Next made route params a
 * promise for pages and handlers and the metadata-file convention has not
 * always agreed with them across versions. Awaiting a plain object returns the
 * object, so this is correct under either shape.
 */
export default async function Image(props: {
  params: Promise<{ locale: string; id: string }> | { locale: string; id: string };
}) {
  const { id } = await props.params;

  // `getPlayer` takes no abort signal, so the bound is applied around it. The
  // orphaned query is left to settle on its own; what matters is that this
  // route stops waiting and draws something.
  const profile = await withDeadline(getPlayer(id).catch(() => null), DB_TIMEOUT_MS);

  if (!profile) return brandCard();

  const { entry, lifetimeRank, recentRank } = profile;
  const treeSrc = treeOf(entry);
  const name = clamp(drawable(entry.username), 20);
  const project = clamp(drawable(entry.project_name), 44);

  // The same card minus the player's own words. Built once and used for every
  // outcome in which those words cannot be drawn — the subset never arrived, or
  // it arrived and the renderer rejected it. Both must land here: re-drawing the
  // WORDED card with the built-in Latin face would put boxes where the name is,
  // which is the one thing UB2 forbids.
  const bare = (
    <Card
      treeSrc={treeSrc}
      name={null}
      lifetimeRank={lifetimeRank}
      recentRank={recentRank}
      project={null}
    />
  );

  // One decision for both strings: a Latin name beside a Chinese project name is
  // the case that makes name-only detection wrong, and a subset covering one but
  // not the other would draw boxes for the other.
  const words = `${name}${project}`;
  let font: ArrayBuffer | null = null;
  if (needsSubset(words)) {
    font = await subsetFont(`${words}${FIXED_TEXT}`);
    if (!font) return draw(bare);
  }

  return draw(
    <Card
      treeSrc={treeSrc}
      name={name || null}
      lifetimeRank={lifetimeRank}
      recentRank={recentRank}
      project={project || null}
    />,
    font,
    bare,
  );
}

function treeOf(entry: { tree: string; stage_index: number }): string | null {
  return sprite(spriteFile(entry.tree, entry.stage_index));
}

function brandCard(): Promise<Response> {
  return draw(
    <Card
      treeSrc={sprite("AppleTree_8.png")}
      name={null}
      lifetimeRank={null}
      recentRank={null}
      project={null}
    />,
  );
}

/**
 * The one place an `ImageResponse` is constructed, so the "never fail outright"
 * rule has a single home.
 *
 * **The buffer is drained inside the `try` on purpose.** `next/og` renders
 * inside the async `start()` of a `ReadableStream`, so the constructor returns
 * before a single glyph has been laid out and a bare
 * `try { return new ImageResponse(...) }` catches nothing — a font the renderer
 * rejects would escape as a broken stream, which is exactly the "no card at all
 * in the chat thread" outcome every fallback exists to prevent. Awaiting
 * `arrayBuffer()` here forces the failure to happen where it can be caught.
 *
 * **`bare` is a different node, not the same one re-drawn.** The only way a
 * font-supplied draw fails is the font, so retrying without it means retrying
 * with the built-in Latin face — and the node that needed the font is precisely
 * the node whose text that face cannot draw. Re-rendering it would trade a
 * broken stream for a card full of boxes. Callers that supply a font supply the
 * text-less card to fall back to.
 *
 * **The caching header is set here rather than inherited.** `next/og` sends
 * `public, max-age=0, must-revalidate`, so the five-minute window promised in
 * the spec would exist only in the framework's own cache — not in any CDN or
 * chat app between us and the reader. No `stale-while-revalidate`: it would
 * quietly extend a takedown's wait past the number the spec promises.
 */
async function draw(
  node: ReactElement,
  font?: ArrayBuffer | null,
  bare?: ReactElement,
): Promise<Response> {
  const render = async (element: ReactElement, withFont: ArrayBuffer | null | undefined) => {
    const res = new ImageResponse(element, {
      ...size,
      fonts: withFont
        ? [{ name: "Card", data: withFont, weight: 700 as const, style: "normal" as const }]
        : undefined,
    });
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", `public, max-age=${revalidate}, s-maxage=${revalidate}`);
    return new Response(await res.arrayBuffer(), { status: 200, headers });
  };

  try {
    return await render(node, font);
  } catch {
    return render(bare ?? node, undefined);
  }
}
