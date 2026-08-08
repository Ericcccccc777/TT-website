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
