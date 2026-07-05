import type { Locale } from "@/i18n/routing";
import { breadcrumbList, faqPage, homeGraph, softwareApplication, techArticle } from "@/lib/schema";

// Server components that render structured data as inline JSON-LD. No visible
// UI — render them anywhere inside a page's JSX. `dangerouslySetInnerHTML` is
// the standard, XSS-safe way to emit a schema script (the payload is our own
// JSON, never user input).

function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

/** WebSite + Organization + SoftwareApplication @graph — home page only. */
export function HomeJsonLd({ locale }: { locale: Locale }) {
  return <Script data={homeGraph(locale)} />;
}

/** SoftwareApplication node — reinforces the app entity on /download. */
export function SoftwareAppJsonLd({ locale }: { locale: Locale }) {
  return <Script data={{ "@context": "https://schema.org", ...softwareApplication(locale) }} />;
}

/** BreadcrumbList trail for a content/sub page. */
export function BreadcrumbJsonLd({
  items,
  locale,
}: {
  items: { name: string; path: string }[];
  locale: Locale;
}) {
  return <Script data={breadcrumbList(items, locale)} />;
}

/** FAQPage — the visible Q&A must match these strings verbatim. */
export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  return <Script data={faqPage(items)} />;
}

/** TechArticle — long-form guides. */
export function ArticleJsonLd(args: {
  headline: string;
  description: string;
  path: string;
  locale: Locale;
  datePublished: string;
  dateModified: string;
}) {
  return <Script data={techArticle(args)} />;
}
