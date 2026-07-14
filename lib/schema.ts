import type { Locale } from "@/i18n/routing";
import {
  BCP47,
  DEMO_VIDEO,
  DEMO_VIDEO_DESCRIPTION,
  GITHUB_URL,
  OG_IMAGE,
  SITE_ALTERNATE_NAMES,
  SITE_NAME,
  siteUrl,
  localizedUrl,
  seoCopy,
} from "@/lib/seo";

// Pure JSON-LD builders. They return plain objects; the components in
// components/json-ld.tsx serialize them into <script type="application/ld+json">.
// Everything is intentionally factual — no aggregateRating/review (no real
// reviews exist; fabricating them is a Google spam-policy penalty risk).

type JsonObject = Record<string, unknown>;

/** The app's feature list, reused across SoftwareApplication nodes. */
const FEATURE_LIST = [
  "Real-time token bubbles from Claude Code & Codex",
  "8 growth stages, from seed to fruitful canopy",
  "4 tree species: Apple, Cherry Blossom, Cactus, and a festive Christmas tree",
  "Capsule mini-mode",
  "Opt-in global leaderboard",
  "Offline cost estimate dashboard",
  "4 UI languages (English, 中文, 日本語, 한국어)",
  "Local-first, offline, privacy-first — reads only token counts",
];

/** The SoftwareApplication node — the product entity. */
export function softwareApplication(locale: Locale): JsonObject {
  const base = siteUrl();
  return {
    "@type": "SoftwareApplication",
    "@id": `${base}/#app`,
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAMES,
    // A prose sentence answer engines can lift for "what is Token Forest?".
    // Reuses the localized home description (single source of truth).
    description: seoCopy("/", locale).description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Windows, macOS",
    inLanguage: BCP47[locale],
    url: localizedUrl("/", locale),
    downloadUrl: `${GITHUB_URL}/releases`,
    screenshot: OG_IMAGE.url,
    featureList: FEATURE_LIST,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
    },
    publisher: { "@id": `${base}/#organization` },
  };
}

/**
 * The demo video node. Google only honours this markup when the video is
 * actually on the page and prominent — the home page renders it inside the
 * "How it works" section, so this node lives in homeGraph and nowhere else.
 * thumbnailUrl must be absolute; the file is served from public/.
 */
export function videoObject(locale: Locale): JsonObject {
  const base = siteUrl();
  return {
    "@type": "VideoObject",
    "@id": `${base}/#demo-video`,
    name: DEMO_VIDEO.title,
    description: DEMO_VIDEO_DESCRIPTION[locale] ?? DEMO_VIDEO_DESCRIPTION.en,
    thumbnailUrl: [`${base}${DEMO_VIDEO.thumbnail}`],
    uploadDate: DEMO_VIDEO.uploadDate,
    duration: DEMO_VIDEO.duration,
    contentUrl: DEMO_VIDEO.watchUrl,
    embedUrl: DEMO_VIDEO.embedUrl,
    // The cut is English regardless of which locale's page embeds it.
    inLanguage: DEMO_VIDEO.inLanguage,
    publisher: { "@id": `${base}/#organization` },
    about: { "@id": `${base}/#app` },
  };
}

/** WebSite + Organization + SoftwareApplication + VideoObject @graph for the home page. */
export function homeGraph(locale: Locale): JsonObject {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: `${base}/${locale}`,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        inLanguage: BCP47[locale],
        publisher: { "@id": `${base}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: base,
        logo: `${base}/logo.svg`,
        sameAs: [GITHUB_URL],
      },
      softwareApplication(locale),
      videoObject(locale),
    ],
  };
}

/** BreadcrumbList from a list of { name, path }. */
export function breadcrumbList(
  items: { name: string; path: string }[],
  locale: Locale,
): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: localizedUrl(c.path, locale),
    })),
  };
}

/** FAQPage from Q&A pairs. Question/answer text MUST match the visible DOM. */
export function faqPage(items: { question: string; answer: string }[]): JsonObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}

/** TechArticle for long-form guides. Dates are ISO strings. */
export function techArticle(args: {
  headline: string;
  description: string;
  path: string;
  locale: Locale;
  datePublished: string;
  dateModified: string;
}): JsonObject {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: args.headline,
    description: args.description,
    inLanguage: BCP47[args.locale],
    mainEntityOfPage: localizedUrl(args.path, args.locale),
    image: OG_IMAGE.url,
    datePublished: args.datePublished,
    dateModified: args.dateModified,
    author: { "@id": `${base}/#organization` },
    publisher: { "@id": `${base}/#organization` },
  };
}
