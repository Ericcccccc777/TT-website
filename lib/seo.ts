import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

// ── Site identity ─────────────────────────────────────────────────────────────

/**
 * Canonical origin for every absolute URL the site emits (canonical tags,
 * hreflang, sitemap, JSON-LD, OG image). Driven by NEXT_PUBLIC_SITE_URL so
 * preview deploys can point at their own host; falls back to the production
 * domain. Trailing slash stripped so concatenation is always safe.
 */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://tokenforest.com.au"
  );
}

/** Canonical entity name — always the space form in metadata/JSON-LD/prose. */
export const SITE_NAME = "Token Forest";
/** Aliases so the hyphen wordmark + one-word forms resolve to one entity. */
export const SITE_ALTERNATE_NAMES = ["Token-Forest", "TokenForest"] as const;
/** The only real external identifier we can cite as sameAs. */
export const GITHUB_URL = "https://github.com/Ericcccccc777/Token-Forest-P";

/** next-intl uses short locale codes; map them to BCP-47 for hreflang keys. */
export const BCP47: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
};

/** Open Graph locale codes (og:locale / og:locale:alternate). */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  zh: "zh_CN",
  ja: "ja_JP",
  ko: "ko_KR",
};

/**
 * Site-wide social share image, served by app/opengraph-image.tsx at the app
 * root (locale-free URL). Stored absolute so it works in openGraph, twitter,
 * AND JSON-LD (schema.org needs absolute URLs). It MUST be set explicitly on
 * any page/helper that defines its own `openGraph`, because an explicit
 * openGraph block suppresses Next's automatic file-convention og:image.
 */
export const OG_IMAGE = {
  url: `${siteUrl()}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "Token Forest — grow a pixel tree from your Claude Code & Codex tokens",
  type: "image/png",
} as const;

// ── URL helpers ───────────────────────────────────────────────────────────────

/** Normalize a logical path: "/" → "", "/x" stays, "x" → "/x". */
function normalizePath(path: string): string {
  if (path === "/" || path === "") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Absolute, locale-prefixed URL for a logical path (e.g. "/", "/faq"). */
export function localizedUrl(path: string, locale: Locale): string {
  return `${siteUrl()}/${locale}${normalizePath(path)}`;
}

/**
 * hreflang map for `alternates.languages` and the sitemap. Absolute URLs, keyed
 * by BCP-47, plus x-default → the English URL. Works in both page metadata
 * (Next accepts absolute) and MetadataRoute.Sitemap (which requires absolute).
 */
export function localizedAlternates(path: string): Record<string, string> {
  const p = normalizePath(path);
  const base = siteUrl();
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[BCP47[locale]] = `${base}/${locale}${p}`;
  }
  languages["x-default"] = `${base}/${routing.defaultLocale}${p}`;
  return languages;
}

// ── Per-route SEO copy ────────────────────────────────────────────────────────

export type SeoCopy = { title: string; description: string; keywords?: string[] };

/**
 * SEO copy source of truth, keyed by logical path. Developer-owned, English-
 * first: every path MUST have an `en` entry (the guaranteed fallback). Kept as
 * a typed record rather than the next-intl `Metadata` namespace because the
 * sitemap/robots/og/manifest/llms routes run outside request scope where
 * `getTranslations` is unavailable, and because this gives compile-time
 * coverage. Localized titles/descriptions for the three existing pages are
 * carried over from the message files so nothing regresses.
 */
export const SEO_COPY: Record<string, Partial<Record<Locale, SeoCopy>>> = {
  "/": {
    en: {
      title: "Token Forest — grow a pixel tree from your Claude Code & Codex tokens",
      description:
        "Token Forest is a cozy pixel-art desktop pet for Windows and macOS that grows a tree from the Claude Code and Codex tokens you spend. Local-first and offline — it reads only token counts, never your code. Free public beta.",
      keywords: [
        "Token Forest",
        "Claude Code token usage tracker",
        "Codex token tracker",
        "desktop pet for developers",
        "AI token visualizer",
        "Claude Code usage monitor",
      ],
    },
    zh: {
      title: "Token Forest — 让你的 Claude Code 和 Codex token 长成一棵树",
      description:
        "Token Forest 是一款 Windows 和 macOS 上的像素桌宠：你用 Claude Code 和 Codex 花掉的 token，会在桌面上长成一棵树。本地优先、离线运行，只读取 token 计数，从不读取你的代码。免费公测中。",
    },
    ja: {
      title: "Token Forest — Claude Code と Codex のトークンを木に育てよう",
      description:
        "Token Forest は Windows と macOS 向けのピクセルデスクトップペット。Claude Code や Codex で使ったトークンがデスクトップで木に育ちます。ローカル優先・オフラインで、コードではなくトークン数だけを読み取ります。無料公開ベータ。",
    },
    ko: {
      title: "Token Forest — Claude Code와 Codex 토큰을 나무로 키우세요",
      description:
        "Token Forest는 Windows와 macOS용 픽셀 데스크톱 펫입니다. Claude Code와 Codex로 사용한 토큰이 바탕화면에서 나무로 자랍니다. 로컬 우선·오프라인으로 코드가 아닌 토큰 수만 읽습니다. 무료 공개 베타.",
    },
  },
  "/download": {
    en: {
      title: "Download Token Forest — Windows & macOS, free",
      description:
        "Download Token Forest for Windows and macOS. A free desktop pet that grows a pixel tree from your Claude Code and Codex token usage — local, offline, privacy-first. Installers are being packaged.",
      keywords: [
        "download Token Forest",
        "Claude Code token tracker download",
        "Codex usage monitor Windows macOS",
      ],
    },
    zh: {
      title: "下载 Token Forest — Windows 与 macOS,免费",
      description:
        "在 Windows 和 macOS 上下载 Token Forest。一款免费桌宠,把你的 Claude Code 和 Codex token 用量长成一棵像素树——本地、离线、隐私优先。安装包打包中。",
    },
    ja: {
      title: "Token Forest をダウンロード — Windows と macOS、無料",
      description:
        "Windows と macOS で Token Forest をダウンロード。Claude Code と Codex のトークン使用量からピクセルツリーを育てる無料のデスクトップペット。ローカル・オフライン・プライバシー優先。インストーラーは準備中です。",
    },
    ko: {
      title: "Token Forest 다운로드 — Windows 및 macOS, 무료",
      description:
        "Windows와 macOS에서 Token Forest를 다운로드하세요. Claude Code와 Codex 토큰 사용량으로 픽셀 나무를 키우는 무료 데스크톱 펫 — 로컬, 오프라인, 프라이버시 우선. 설치 프로그램을 준비 중입니다.",
    },
  },
  "/leaderboard": {
    en: {
      title: "Token Forest Global Leaderboard",
      description:
        "See the biggest Token Forest trees worldwide. Grow the mightiest tree from the Claude Code and Codex tokens you spend and climb the opt-in global leaderboard.",
      keywords: ["Token Forest leaderboard", "Claude Code token leaderboard"],
    },
    zh: {
      title: "Token Forest 全球排行榜",
      description:
        "看看全球最大的 Token Forest 树。用你在 Claude Code 和 Codex 上花掉的 token 培育最强的树,登上自愿加入的全球排行榜。",
    },
    ja: {
      title: "Token Forest グローバルランキング",
      description:
        "世界中で最も大きな Token Forest の木をチェック。Claude Code と Codex で使ったトークンで最強の木を育て、任意参加のグローバルランキングを駆け上がろう。",
    },
    ko: {
      title: "Token Forest 글로벌 리더보드",
      description:
        "전 세계에서 가장 큰 Token Forest 나무를 확인하세요. Claude Code와 Codex로 사용한 토큰으로 가장 강한 나무를 키우고 선택적 참여 글로벌 리더보드에 오르세요.",
    },
  },
};

/** Resolve copy for a path+locale, falling back to English. */
export function seoCopy(path: string, locale: Locale): SeoCopy {
  const byLocale = SEO_COPY[path];
  return byLocale?.[locale] ?? byLocale?.en ?? { title: SITE_NAME, description: "" };
}

// ── The metadata engine ───────────────────────────────────────────────────────

/**
 * Build a page's `Metadata` from SEO_COPY: absolute title (so the layout's
 * "%s | Token Forest" template does not double-brand), description, keywords,
 * self-referential canonical, full hreflang set (+ x-default), and localized
 * OpenGraph/Twitter that always re-include OG_IMAGE (a page-level openGraph
 * block otherwise suppresses the file-convention image).
 */
export function localizedMetadata(path: string, locale: Locale): Metadata {
  const copy = seoCopy(path, locale);
  const canonical = localizedUrl(path, locale);
  const alternateLocales = routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]);

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: {
      canonical,
      languages: localizedAlternates(path),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale: alternateLocales,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [OG_IMAGE.url],
    },
  };
}
