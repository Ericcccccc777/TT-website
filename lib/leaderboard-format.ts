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
 * Returns null if the URL will not parse; the caller then shows no link at all.
 * The DB regex should make that impossible, but a row written before the
 * trigger existed would not have passed it.
 */
export function projectHostname(url: string): string | null {
  try {
    const h = new URL(url).hostname;
    return h.length > 0 ? h : null;
  } catch {
    return null;
  }
}

/**
 * Project image URL with a cache-busting token.
 *
 * The stored object name is pinned to `<user_id>.<ext>` forever, so a replaced
 * picture reuses the same URL. Next's optimizer takes
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
