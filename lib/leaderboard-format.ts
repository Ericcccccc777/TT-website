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
 * The two element ids the project panel is wired together with, derived from the
 * row id: the panel cell that `aria-controls` points at, and the project name
 * that names the panel (`aria-labelledby`).
 *
 * They live here, not beside the components, because the two ends are rendered
 * on opposite sides of the server/client line — the panel and its trigger are in
 * a `"use client"` module, the project name is rendered by the page — and a
 * Server Component cannot call a function exported from a client module.
 */
export const panelId = (id: string) => `project-panel-${id}`;
export const panelLabelId = (id: string) => `project-panel-label-${id}`;

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
