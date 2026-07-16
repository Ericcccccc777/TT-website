import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedAlternates, siteUrl } from "@/lib/seo";

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
  { path: "/badge", priority: 0.6, changeFrequency: "monthly", lastmod: "2026-07-16" },
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

export default function sitemap(): MetadataRoute.Sitemap {
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

  return entries;
}
