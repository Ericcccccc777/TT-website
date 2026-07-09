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
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/download", priority: 0.9, changeFrequency: "weekly" },
  { path: "/dashboard", priority: 0.8, changeFrequency: "monthly" },
  { path: "/leaderboard", priority: 0.7, changeFrequency: "hourly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/security", priority: 0.3, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority, changeFrequency } of INDEXABLE_PATHS) {
    const suffix = path === "/" ? "" : path;
    const languages = localizedAlternates(path);
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}${suffix}`,
        lastModified: now,
        changeFrequency,
        priority,
        alternates: { languages },
      });
    }
  }

  return entries;
}
