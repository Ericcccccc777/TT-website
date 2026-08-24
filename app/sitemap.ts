import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedAlternates, siteUrl } from "@/lib/seo";
import { getProfileIdsWithProjects, isProfileListUnavailable } from "@/lib/leaderboard";

/*
 * Regenerated hourly rather than baked in at build time.
 *
 * The player-page section below reads the database. Left as the default static
 * export it would be frozen at whatever the board looked like on the last
 * deploy, so a player who filled their project in would stay undiscoverable
 * until some unrelated change happened to ship. An hour of staleness is nothing
 * to a crawler and costs one query an hour instead of one per request.
 */
export const revalidate = 3600;

// Runs outside request scope (no getTranslations/setRequestLocale) — every URL
// is built from lib/seo constants. Each indexable path is emitted once per
// locale, and every entry carries the full hreflang set so Google sees the
// language cluster. A path is added here ONLY in the commit that ships its
// page — never sitemap a 404.
const INDEXABLE_PATHS: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  // Fixed content edit date (ISO). Set for rarely-changing pages so lastmod does
  // not churn on every deploy; omit for pages whose content changes per build.
  lastmod?: string;
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/download", priority: 0.9, changeFrequency: "weekly" },
  { path: "/dashboard", priority: 0.8, changeFrequency: "monthly" },
  { path: "/leaderboard", priority: 0.7, changeFrequency: "hourly" },
  { path: "/leaderboard/recent", priority: 0.7, changeFrequency: "hourly" },
  { path: "/leaderboard/value", priority: 0.6, changeFrequency: "hourly" },
  { path: "/leaderboard/usage", priority: 0.6, changeFrequency: "hourly" },
  { path: "/badge", priority: 0.6, changeFrequency: "monthly", lastmod: "2026-07-17" },
  // Guide / GEO content pages
  { path: "/claude-code-cost", priority: 0.6, changeFrequency: "monthly", lastmod: "2026-07-11" },
  {
    path: "/claude-code-usage-limits",
    priority: 0.6,
    changeFrequency: "monthly",
    lastmod: "2026-07-11",
  },
  {
    path: "/ccusage-alternative",
    priority: 0.6,
    changeFrequency: "monthly",
    lastmod: "2026-07-11",
  },
  {
    path: "/track-claude-code-usage",
    priority: 0.6,
    changeFrequency: "monthly",
    lastmod: "2026-07-11",
  },
  {
    path: "/codex-usage-tracker",
    priority: 0.6,
    changeFrequency: "monthly",
    lastmod: "2026-07-15",
  },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly", lastmod: "2026-07-08" },
  { path: "/security", priority: 0.3, changeFrequency: "monthly", lastmod: "2026-07-08" },
  { path: "/terms", priority: 0.3, changeFrequency: "monthly", lastmod: "2026-07-09" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority, changeFrequency, lastmod } of INDEXABLE_PATHS) {
    const suffix = path === "/" ? "" : path;
    const languages = localizedAlternates(path);
    const lastModified = lastmod ? new Date(lastmod) : now;
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}${suffix}`,
        lastModified,
        changeFrequency,
        priority,
        alternates: { languages },
      });
    }
  }

  /*
   * Player pages, but only the ones carrying a project.
   *
   * This is the half of the deal the player can actually see: fill the form in
   * and your page becomes something a search engine is told about. The same
   * test decides `robots` on the page itself (`/p/[id]`), so this list can never
   * contain a noindex page — a sitemap advertising one is crawl budget spent on
   * a contradiction.
   *
   * The implication runs one way only, and deliberately: the query is capped, so
   * far enough down the board a player is indexable without being listed. That
   * is the harmless direction. They stay reachable from the board itself, which
   * is how a crawler would find them regardless.
   *
   * Reading the database is why this route revalidates hourly (see the top of
   * the file) instead of being baked in at build time: a deploy costs production
   * credits, so a player who filled their project in on a Tuesday should not have
   * to wait for unrelated work to ship before being discoverable.
   */
  /*
   * The throw stops HERE, and this is the one place it should.
   *
   * `getProfileIdsWithProjects` throws rather than returning an empty list,
   * because for every other caller "nobody has a project" and "we could not find
   * out" are different facts and conflating them fabricates an answer. But this
   * file is prerendered during the build, so letting the throw through would
   * mean a database blip during a deploy fails the whole deploy — over the least
   * important file on the site.
   *
   * So the trade-off is taken deliberately, at the boundary, where it is
   * visible: if we cannot list the player pages, we publish the rest of the
   * sitemap without them. That costs an hour of not being ANNOUNCED, and
   * nothing more — removal from a sitemap is not removal from an index, and
   * every one of those pages is still linked from the board, which is how a
   * crawler found them in the first place. `player-page.md` says the same thing
   * from the reader's side.
   *
   * Deliberately not swallowed inside the data function: a future caller that
   * needs the truth still gets it, and has to decide for itself.
   *
   * And only THAT failure is tolerated. A bare `catch` here would also swallow a
   * missing Supabase configuration — which throws before the query is even
   * built — and any plain mistake inside the function, turning a broken deploy
   * into a quietly shorter sitemap. Those still bring the build down, which is
   * where they belong.
   */
  let profileIds: string[] = [];
  try {
    profileIds = await getProfileIdsWithProjects();
  } catch (err) {
    if (!isProfileListUnavailable(err)) throw err;
    console.error("sitemap: player pages omitted this generation —", (err as Error).message);
  }
  for (const id of profileIds) {
    const path = `/p/${id}`;
    const languages = localizedAlternates(path);
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
        alternates: { languages },
      });
    }
  }

  return entries;
}
