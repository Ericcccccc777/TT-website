import type { Metadata } from "next";
import {
  Press_Start_2P,
  Silkscreen,
  Noto_Sans_SC,
  Noto_Sans_JP,
  Noto_Sans_KR,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
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

// ── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    keywords: [
      "Token-Forest",
      "Claude Code",
      "Codex",
      "desktop pet",
      "pixel art",
      "AI tokens",
      "token visualizer",
    ],
    openGraph: {
      title: t("homeTitle"),
      description: t("homeDescription"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("homeTitle"),
      description: t("homeDescription"),
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
      className={`${pressStart2P.variable} ${silkscreen.variable} ${bodyFontVariable}`}
    >
      <body className="flex min-h-screen flex-col bg-surface-parchment font-body text-[var(--color-text-forest)] antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <TopBar />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
