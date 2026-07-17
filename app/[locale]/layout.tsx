import type { Metadata } from "next";
import {
  Press_Start_2P,
  Silkscreen,
  JetBrains_Mono,
  Noto_Sans_SC,
  Noto_Sans_JP,
  Noto_Sans_KR,
} from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { routing, type Locale } from "@/i18n/routing";
import { OG_IMAGE, OG_LOCALE, SITE_NAME, siteUrl } from "@/lib/seo";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import "../globals.css";

// ── Fonts ──────────────────────────────────────────────────────────────────
// Press Start 2P: brand wordmark + token counter numerics only.
const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

// Silkscreen: pixel UI labels, section headings, buttons, captions.
const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

// JetBrains Mono: numeric readouts in the dashboard mock — matches the
// desktop app's v2a handoff, which sets all numbers in JetBrains Mono.
const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Body fonts — one per CJK locale. All define --font-body; only the matching
// locale's .variable class is added to <html> so the correct font wins.
const notoSansSC = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const notoSansKR = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// ── Static params ──────────────────────────────────────────────────────────
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The four locales above are the ONLY valid values for this segment. Refusing
// dynamic params means any other value (e.g. a browser hitting
// /apple-touch-icon.png, which bypasses the i18n middleware as a dotted path
// and would otherwise match [locale]="apple-touch-icon.png") is a 404 BEFORE
// this subtree renders — so page-body Intl calls like toLocaleString(locale)
// never run with a non-BCP-47 string and throw a 500.
export const dynamicParams = false;

// ── Metadata (site-wide defaults) ─────────────────────────────────────────────
// Per-page identity (title/canonical/hreflang) lives in each page via
// lib/seo's localizedMetadata; the home page owns the home title. This layer
// only sets what every route shares: metadataBase, the title template, default
// OG/Twitter, and webmaster verification. Icons/manifest/apple-icon are served
// by the app/ file conventions (icon.svg, manifest.ts, apple-icon.tsx) and
// auto-linked, so they are intentionally not duplicated here.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = locale as Locale;
  const bing = process.env.BING_SITE_VERIFICATION;

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      template: `%s | ${SITE_NAME}`,
      default: "Token Forest — grow a pixel tree from your Claude Code & Codex tokens",
    },
    description:
      "A cozy pixel-art desktop pet for Windows and macOS that grows a tree from the Claude Code and Codex tokens you spend. Local-first, offline, free public beta.",
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[loc],
      url: `${siteUrl()}/${locale}`,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      images: [OG_IMAGE.url],
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      other: bing ? { "msvalidate.01": bing } : undefined,
    },
  };
}

// ── Root Layout ────────────────────────────────────────────────────────────
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Reject unknown locales (e.g. browser requests for /apple-touch-icon.png that
  // fall through to this catch-all segment) with a 404 instead of rendering the
  // page with a garbage locale and crashing on Intl calls like toLocaleString.
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enable static rendering
  setRequestLocale(locale);

  // Load messages for the client provider
  const messages = await getMessages();

  // Pick the right CJK body font per locale
  const bodyFontVariable =
    locale === "ja"
      ? notoSansJP.variable
      : locale === "ko"
        ? notoSansKR.variable
        : notoSansSC.variable;

  return (
    <html
      lang={locale}
      className={`${pressStart2P.variable} ${silkscreen.variable} ${jetBrainsMono.variable} ${bodyFontVariable}`}
    >
      <body className="flex min-h-screen flex-col bg-surface-parchment font-body text-[var(--color-text-forest)] antialiased">
        {/* Privacy-friendly, cookieless analytics — no-ops until the env var is
            set (so dev/preview stay clean). */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
        <NextIntlClientProvider messages={messages} locale={locale}>
          <TopBar />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
