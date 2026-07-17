import { getSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * Embeddable "my Token Forest" badge — a live SVG a developer pastes into their
 * GitHub profile README:
 *
 *   [![My Token Forest](https://tokenforest.com.au/badge/<user_id>.svg)](https://tokenforest.com.au/en/leaderboard)
 *
 * Every README that carries it is a free impression + a backlink — the WakaTime /
 * github-readme-stats growth loop. The image regenerates from live leaderboard data,
 * so a developer's badge updates itself as their tree grows; they never touch the README.
 *
 * SVG (not next/og PNG) on purpose: lighter, crisp at any size, and it is what GitHub's
 * image proxy renders for shields.io-style badges.
 *
 * PRIVACY: reads through the ANON client, so the public-read RLS policy (migration 0005)
 * filters out banned/hidden rows automatically — a banned user's badge is indistinguishable
 * from a stranger's (both fall through to the neutral badge), so the badge never reveals a
 * ban. It exposes only fields already public on the leaderboard for opted-in users
 * (username, species, token total, rank); nothing new leaves the DB.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // we set our own Cache-Control; don't let Next fully static it

// Brand palette (globals.css --color-*).
const C = {
  parchment: "#faf5ea",
  card: "#f3ede0",
  sky: "#c4dce8",
  leaf: "#3a7d44",
  leafLight: "#7bd88f",
  ink: "#1e2521",
  muted: "#5a6b5e",
  gold: "#c8943c",
  soil: "#7a5a3a",
};

/** XML-escape — the username is user-controlled and goes into SVG text; never inject it raw. */
function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** Compact token count: 6.9B / 340M / 12K. */
function compact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(n));
}

function title(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** A small pixel tree, drawn from the icon.svg geometry, translated into `x,y`. */
function pixelTree(x: number, y: number, u = 3): string {
  const r = (px: number, py: number, w: number, h: number, fill: string) =>
    `<rect x="${x + px * u}" y="${y + py * u}" width="${w * u}" height="${h * u}" fill="${fill}"/>`;
  return [
    r(2, 0, 12, 10, C.leaf), // canopy
    r(1, 2, 14, 7, C.leaf),
    r(2, 2, 3, 3, C.leafLight), // highlight
    r(11, 4, 3, 3, C.gold), // apple
    r(7, 10, 2, 6, C.soil), // trunk
  ].join("");
}

const W = 460;
const H = 140;

function badgeSvg(inner: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" font-family="'Segoe UI',system-ui,-apple-system,sans-serif">
  <title>${esc(label)}</title>
  <rect width="${W}" height="${H}" rx="10" fill="${C.parchment}" stroke="${C.soil}" stroke-width="2"/>
  <rect width="${W}" height="30" rx="10" fill="${C.sky}"/>
  <rect y="20" width="${W}" height="10" fill="${C.sky}"/>
  <rect y="${H - 8}" width="${W}" height="8" rx="0" fill="${C.leaf}"/>
  <rect y="${H - 10}" width="${W}" height="4" fill="${C.leaf}"/>
  ${inner}
</svg>`;
}

/** The neutral badge shown for unknown / not-opted-in / banned ids — no personal data. */
function neutralSvg(): string {
  const inner = `
  ${pixelTree(28, 40, 3)}
  <text x="120" y="58" fill="${C.leaf}" font-size="20" font-weight="700">Token Forest</text>
  <text x="120" y="84" fill="${C.muted}" font-size="14">Grow a tree from your Claude Code &amp; Codex tokens</text>
  <text x="120" y="108" fill="${C.gold}" font-size="13" font-weight="700">tokenforest.com.au</text>`;
  return badgeSvg(inner, "Token Forest");
}

/**
 * The badge interior. The token count is the hero — bold, large, and green so it
 * reads at a glance; the species and stage trail it in muted small text.
 */
function badgeInner(username: string, rank: number, score: number, speciesStage: string): string {
  return `
  ${pixelTree(28, 42, 3)}
  <text x="120" y="50" fill="${C.leaf}" font-size="13" font-weight="700" letter-spacing="1">TOKEN FOREST</text>
  <text x="120" y="76" fill="${C.ink}" font-size="20" font-weight="700">${esc(username.slice(0, 22))}</text>
  <rect x="${W - 92}" y="40" width="72" height="30" rx="6" fill="${C.leaf}"/>
  <text x="${W - 56}" y="60" fill="#ffffff" font-size="17" font-weight="800" text-anchor="middle">#${rank}</text>
  <text x="120" y="112"><tspan fill="${C.leaf}" font-size="22" font-weight="800">${compact(score)} tokens</tspan><tspan fill="${C.muted}" font-size="13" dx="7">· ${esc(speciesStage)}</tspan></text>`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId: raw } = await ctx.params;
  // The badge URL ends in .svg by convention; the route param captures it.
  const userId = raw.replace(/\.svg$/i, "").trim();

  const svgHeaders = {
    "Content-Type": "image/svg+xml; charset=utf-8",
    // Cached at the CDN for 10 min — the badge is hit on every README view; never hammer the DB.
    // Stale-while-revalidate keeps it instant while it refreshes in the background.
    "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=600",
  };

  // A stable sample badge for the /badge landing page and docs — fixed, plausible data,
  // tied to no real user (so it can't break or expose anyone). "Username" is a
  // placeholder so it reads as a template of what your own badge will look like.
  if (userId === "demo") {
    const inner = badgeInner("Username", 1, 1_200_000_000, "Apple · stage 6");
    return new Response(
      badgeSvg(inner, "Username — 1.2B tokens · Apple · stage 6 — #1 on Token Forest"),
      { headers: svgHeaders },
    );
  }

  // Basic uuid sanity — avoids a pointless DB round-trip on garbage paths.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  if (!isUuid) {
    return new Response(neutralSvg(), { headers: svgHeaders });
  }

  try {
    const client = getSupabaseServerClient();
    // Anon read → public-read RLS excludes banned rows, so a banned user returns nothing here.
    const { data: row } = await client
      .from("leaderboard")
      .select("username, score, stage_index, tree")
      .eq("user_id", userId)
      .maybeSingle();

    if (!row) {
      return new Response(neutralSvg(), { headers: svgHeaders });
    }

    const score = Number(row.score ?? 0);
    // Rank = how many non-banned rows outscore me, + 1. Anon count → RLS excludes banned.
    const { count } = await client
      .from("leaderboard")
      .select("*", { count: "exact", head: true })
      .gt("score", score);
    const rank = (count ?? 0) + 1;

    const username = (row.username as string | null)?.trim() || "Anonymous";
    const species = title((row.tree as string | null) || "apple");
    const stage = Number(row.stage_index ?? 0);
    const speciesStage = `${species} · stage ${stage}`;
    const label = `${username} — ${compact(score)} tokens · ${speciesStage} — #${rank} on Token Forest`;

    const inner = badgeInner(username, rank, score, speciesStage);

    return new Response(badgeSvg(inner, label), { headers: svgHeaders });
  } catch {
    // Never break a README with a broken image — fall back to the neutral badge.
    return new Response(neutralSvg(), { headers: svgHeaders });
  }
}
