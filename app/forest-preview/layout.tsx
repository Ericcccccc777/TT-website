import type { Metadata } from "next";
import { Press_Start_2P, Silkscreen, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import "../globals.css";

// /forest-preview lives OUTSIDE app/[locale] (like /ranger), so it supplies its
// own <html>/<body> plus the shared font variables. It is a concept prototype
// for the web personal forest (docs/WEB_FOREST_PRODUCT_VISION.md) — fake data,
// no backend, intentionally unlisted: robots noindex and no nav links to it.

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});
const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});
const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
const notoSansSC = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "森林预览 · Token Forest",
  robots: { index: false, follow: false },
};

export default function ForestPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`${pressStart2P.variable} ${silkscreen.variable} ${jetBrainsMono.variable} ${notoSansSC.variable}`}
    >
      <body className="bg-surface-deepest font-body antialiased">{children}</body>
    </html>
  );
}
