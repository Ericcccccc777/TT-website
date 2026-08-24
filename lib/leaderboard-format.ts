/**
 * Formatting shared by the three leaderboard routes.
 *
 * Extracted when the value and usage boards arrived: three copies of the flag
 * lookup and the medal palette would have drifted the first time one of them was
 * touched. The token board keeps its own tree-sprite and relative-time helpers,
 * which only it uses.
 */

/** Rank colours for the top three, used for both the number and its left rail. */
export const MEDAL: Record<number, string> = {
  1: "#c8943c",
  2: "#9ba8af",
  3: "#a07850",
};

/**
 * Turns an ISO 3166-1 alpha-2 code (what the desktop app stores in `region`)
 * into a flag emoji plus a locale-aware country name. Returns null for empty or
 * malformed codes so the row simply renders without a flag.
 */
export function regionInfo(code: string, locale: string): { flag: string; name: string } | null {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  const flag = String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  let name = cc;
  try {
    name = new Intl.DisplayNames([locale], { type: "region" }).of(cc) ?? cc;
  } catch {
    name = cc;
  }
  return { flag, name };
}

/** Plain grouped number — "1,234,567". */
export function formatTokens(n: number, locale: string): string {
  return n.toLocaleString(locale);
}

/** Compact count — "90M" / "9000万" — for places too narrow for the full number. */
export function compactTokens(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/**
 * A dollar figure for display. Always an estimate, so the caller pairs it with a
 * "≈"; this only decides how many decimals are worth showing. Sub-cent amounts
 * would otherwise all render as "$0.00" and look like missing data rather than
 * like a very small number.
 */
export function formatUsd(n: number, locale: string): string {
  const digits = n > 0 && n < 0.01 ? 4 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

// ── Project showcase ──────────────────────────────────────────────────────────


/**
 * The part of a project link we are willing to print.
 *
 * Never render the raw href as text. `project_url` is the one player-written
 * field the database does not screen for zero-width or bidi characters
 * (0022 runs the screener over the name and the description only), and its
 * regex is case-insensitive and admits punycode. Parsing and printing only the
 * hostname strips the path, and renders a punycode host in its `xn--` form —
 * which is the honest thing to show.
 *
 * The protocol check is the load-bearing part, not the parse. `new URL()` accepts
 * anything with a scheme, and plenty of non-web schemes carry a hostname —
 * `javascript://example.com/%0A…`, `intent://example.com/…`, `vbscript://x.com/`
 * all parse and all report a perfectly ordinary hostname. The interstitial's
 * whole job is to tell the visitor where they are about to go, and it can only
 * show the hostname; without this check it would show `example.com` over a link
 * that hands the raw value to `window.open` and can invoke an OS protocol
 * handler. Requiring https also rejects plain http, which would silently
 * downgrade the visitor.
 *
 * Returns null if the URL will not parse or is not https; the caller then shows
 * no link at all. 0022 screens this on write and 0024 tightened it, so a stored
 * row should always pass — this is defence in depth against a row written with
 * the trigger disabled or through the service role, not a legacy-row path
 * (`project_url` and its validating trigger both arrived in 0022, so no row can
 * predate the check).
 */
export function projectHostname(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    return u.hostname.length > 0 ? u.hostname : null;
  } catch {
    return null;
  }
}

/**
 * Is this project image one of our own stored objects?
 *
 * The public board never needs this — it renders through `next/image`, whose
 * `remotePatterns` allow-list refuses anything else at request time. The admin
 * page does: it reads the BASE table on purpose, so it is the one surface that
 * sees rows the public view is refusing to show, and it renders the picture with
 * a plain `<img>`. Without a check, opening a player's page would make the
 * admin's browser fetch whatever host that row names — disclosing the admin's
 * IP, the time they looked, and the referrer. 0024 pins this on write, but a row
 * written before 0024 (or through the service role) is exactly the row an admin
 * is most likely to be looking at.
 *
 * Same three conditions `next.config.ts` pins: https, our Supabase origin, and
 * the public project-images path.
 */
export function isOwnProjectImage(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.origin === new URL(base).origin &&
      u.pathname.startsWith("/storage/v1/object/public/project-images/")
    );
  } catch {
    return false;
  }
}

/**
 * Project image URL with a cache-busting token.
 *
 * The stored object name is pinned to `<user_id>.<ext>`, so a replacement that
 * keeps the extension reuses the same URL (a webp -> png swap does change it).
 * Next's optimizer takes
 * `max(minimumCacheTTL, upstream max-age)` — 604800 against the origin's 300 —
 * so without a token a swapped image would serve stale for up to a week, which
 * is also a review-evasion hole.
 *
 * Verified safe: in next@16.2.9 `matchRemotePattern` skips the search check
 * when `search` is unset, so the query string does not break `remotePatterns`.
 */
export function bustedImageSrc(src: string, updatedAt: string): string {
  const stamp = Date.parse(updatedAt);
  if (!Number.isFinite(stamp)) return src;
  return `${src}${src.includes("?") ? "&" : "?"}v=${stamp}`;
}

/**
 * Tree sprite selection.
 *
 * Lived in the player page until the share card needed the same mapping. Two
 * consumers picking sprite filenames from the same two fields is exactly the
 * drift this file was extracted to prevent, so it moved down here rather than
 * being copied.
 */
export const STAGES = 8;

export const TREE_PREFIX: Record<string, string> = {
  apple: "AppleTree",
  cherry: "CherryTree",
  cactus: "Cactus",
  christmas: "ChristmasTree",
};

/**
 * Sprite files are 1-indexed; the stored stage is 0-indexed.
 *
 * Truncated before the clamp, not after. The stage arrives inside a jsonb
 * column the desktop app writes, so it is not guaranteed to be a whole number:
 * clamping alone bounds the range but not the integrality, and `3.5` would
 * survive to name `AppleTree_4.5.png` — a file that does not exist. On a board
 * that is a broken thumbnail; on the share card it is a read of a missing path,
 * which turns a fallback into a 500 on a crawler-facing address. `|| 0` absorbs
 * NaN in the same step.
 */
export function spriteStage(stageIndex: number): number {
  const i = Math.trunc(stageIndex) || 0;
  return Math.min(STAGES, Math.max(1, i + 1));
}

/**
 * The sprite filename prefix for a species, defaulting to the apple tree.
 *
 * `Object.hasOwn`, not `TREE_PREFIX[tree] ?? "AppleTree"`. `tree` is a plain
 * string column with no check constraint, written by the desktop app, so the
 * value `constructor` reaches this lookup and returns `Object` — which
 * stringifies into `function Object() { [native code] }`. On a board that is a
 * broken thumbnail; on the share card it is a `readFileSync` that throws, which
 * turns the "never fail outright" fallback into a 500 on a crawler-facing
 * address. `??` cannot catch it, because the prototype value is truthy.
 *
 * Exported so every caller gets the guard rather than re-deriving it — the
 * board pages need the bare prefix, the card needs a whole filename.
 */
export function treePrefix(tree: string): string {
  return Object.hasOwn(TREE_PREFIX, tree) ? TREE_PREFIX[tree] : "AppleTree";
}

/** `AppleTree_5.png` — the filename only, so each caller builds its own path. */
export function spriteFile(tree: string, stageIndex: number): string {
  return `${treePrefix(tree)}_${spriteStage(stageIndex)}.png`;
}
