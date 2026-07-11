import type { Metadata } from "next";
import { Press_Start_2P, Silkscreen, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import "../globals.css";

// /ranger lives OUTSIDE app/[locale], so the locale layout that normally
// provides <html>/<body> does not wrap it. This segment root supplies them
// (plus the shared font variables + globals) so the admin page renders with the
// site's styling and Next has its required root tags.

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
  robots: { index: false, follow: false },
};

export default function RangerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${silkscreen.variable} ${jetBrainsMono.variable} ${notoSansSC.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-surface-parchment font-body text-[var(--color-text-forest)] antialiased">
        {children}
      </body>
    </html>
  );
}
