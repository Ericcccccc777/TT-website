// Root layout required by Next.js App Router.
// The actual <html>/<body> structure and locale setup lives in app/[locale]/layout.tsx.
import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo";

// Set metadataBase at the very root so EVERY route — including the global 404
// and non-locale routes outside app/[locale] — resolves social image and
// canonical URLs against the real origin instead of localhost.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
