// Renderer for long-form SEO/GEO guide pages (e.g. /claude-code-cost).
// Server-rendered so all prose ships in the initial HTML (crawlable + citable).
// One <h1> per page (doc.title); every section heading is an <h2>/<h3>, so the
// heading hierarchy stays clean. The FAQ here is the VISIBLE copy — the page
// must also emit <FaqJsonLd> with the same q/a strings verbatim.

import type React from "react";
import { Link } from "@/i18n/navigation";

export type ArticleBlock =
  | { p: string }
  | { h2: string }
  | { h3: string }
  | { list: string[] }
  | { steps: string[] }
  | { table: { head: string[]; rows: string[][] } }
  | { callout: string }
  | { code: string }
  | { img: { src: string; alt: string; width: number; height: number } };

export type ArticleFaqItem = { q: string; a: string };

export type ArticleDoc = {
  /** Small kicker above the title, e.g. "GUIDE". */
  eyebrow: string;
  /** The one and only <h1>. */
  title: string;
  /** Lead paragraph under the title. */
  intro: string;
  /** Optional "Last updated …" line. */
  updated?: string;
  /** Body, in document order. */
  sections: ArticleBlock[];
  /** Optional FAQ — rendered as an accordion; mirror it with <FaqJsonLd>. */
  faq?: ArticleFaqItem[];
  /** "Read more" heading shown above the FAQ. */
  faqHeading?: string;
  /** Closing call-to-action card. hrefs are logical paths ("/download"). */
  cta: {
    heading: string;
    body: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
};

function Block({ block }: { block: ArticleBlock }) {
  if ("h2" in block) {
    return (
      <h2
        className="mt-10 text-leaf-deep"
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "var(--text-caption)",
          lineHeight: 1.4,
        }}
      >
        {block.h2}
      </h2>
    );
  }
  if ("h3" in block) {
    return (
      <h3
        className="mt-6 text-text-forest"
        style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}
      >
        {block.h3}
      </h3>
    );
  }
  if ("p" in block) {
    return (
      <p
        className="text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)", lineHeight: 1.7 }}
      >
        {block.p}
      </p>
    );
  }
  if ("list" in block) {
    return (
      <ul
        className="space-y-1.5 text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)", lineHeight: 1.6 }}
      >
        {block.list.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-leaf-light">✦</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if ("steps" in block) {
    return (
      <ol className="space-y-2.5">
        {block.steps.map((item, i) => (
          <li key={item} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] bg-leaf-deep text-text-cream"
              style={{ fontFamily: "var(--font-pixel)", fontSize: 11 }}
              aria-hidden
            >
              {i + 1}
            </span>
            <span
              className="text-text-muted-light"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                lineHeight: 1.6,
              }}
            >
              {item}
            </span>
          </li>
        ))}
      </ol>
    );
  }
  if ("callout" in block) {
    return (
      <p
        className="rounded-[2px] bg-surface-card px-4 py-3 text-text-forest"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-small)",
          fontWeight: 700,
          lineHeight: 1.7,
          border: "var(--border-pixel)",
        }}
      >
        {block.callout}
      </p>
    );
  }
  if ("code" in block) {
    return (
      <pre
        className="overflow-x-auto rounded-[2px] bg-surface-card px-4 py-3 text-text-forest"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-small)",
          fontWeight: 700,
          lineHeight: 1.8,
          border: "var(--border-pixel)",
          // Wrap long lines (e.g. the badge Markdown one-liner) so the whole snippet is
          // readable at a glance rather than clipped behind a horizontal scroll.
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {block.code}
      </pre>
    );
  }
  if ("img" in block) {
    // Plain <img>: the badge is a live SVG endpoint (not a static asset next/image
    // can optimize). max-width keeps it responsive; the intrinsic w/h avoid layout shift.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={block.img.src}
        alt={block.img.alt}
        width={block.img.width}
        height={block.img.height}
        className="my-2 h-auto max-w-full"
        style={{ imageRendering: "auto" }}
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-left"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
      >
        <thead>
          <tr>
            {block.table.head.map((cell) => (
              <th
                key={cell}
                className="bg-surface-card px-3 py-2 text-leaf-deep"
                style={{ border: "1px solid var(--color-soil)" }}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-text-muted-light">
          {block.table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 align-top"
                  style={{ border: "1px solid var(--color-soil)" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ArticleDocView({ doc }: { doc: ArticleDoc }) {
  return (
    <div className="min-h-screen bg-surface-parchment">
      <article className="mx-auto max-w-3xl px-6 py-14">
        {/* ── Header ── */}
        <span
          className="font-pixel text-leaf-deep"
          style={{ fontSize: 11, letterSpacing: "0.3em" }}
        >
          {doc.eyebrow}
        </span>
        <h1
          className="mt-4 text-leaf-deep"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-h1)",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {doc.title}
        </h1>
        <p
          className="mt-4 text-text-forest"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1.7,
          }}
        >
          {doc.intro}
        </p>
        {doc.updated && (
          <p
            className="mt-3 text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            {doc.updated}
          </p>
        )}

        {/* ── Body ── */}
        <div className="mt-4 space-y-3">
          {doc.sections.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>

        {/* ── FAQ ── */}
        {doc.faq && doc.faq.length > 0 && (
          <section className="mt-12">
            <h2
              className="text-leaf-deep"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                lineHeight: 1.4,
              }}
            >
              {doc.faqHeading ?? "FAQ"}
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {doc.faq.map((item, i) => (
                <details
                  key={item.q}
                  open={i === 0}
                  className="rounded-[2px] bg-surface-card"
                  style={{ border: "var(--border-pixel)" }}
                >
                  <summary
                    className="cursor-pointer px-4 py-3 text-text-forest"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 15,
                      fontWeight: 700,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.q}
                  </summary>
                  <p
                    className="px-4 pb-4 text-text-muted-light"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-small)",
                      lineHeight: 1.7,
                    }}
                  >
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <section
          className="mt-14 rounded-[2px] bg-surface-forest px-6 py-9 text-center"
          style={{ border: "2px solid var(--color-leaf-deep)" }}
        >
          <h2
            className="text-leaf-light"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-caption)",
              lineHeight: 1.4,
            }}
          >
            {doc.cta.heading}
          </h2>
          <p
            className="mx-auto mt-3 max-w-md text-text-muted-dark"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body)",
              lineHeight: 1.7,
            }}
          >
            {doc.cta.body}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href={doc.cta.primaryHref}
              className="inline-flex items-center gap-2 rounded-[2px] bg-leaf-deep px-6 py-3 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              {doc.cta.primaryLabel}
            </Link>
            {doc.cta.secondaryLabel && doc.cta.secondaryHref && (
              <Link
                href={doc.cta.secondaryHref}
                className="inline-flex items-center gap-2 rounded-[2px] bg-surface-card px-6 py-3 text-text-forest shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "var(--text-caption)",
                  border: "var(--border-pixel)",
                }}
              >
                {doc.cta.secondaryLabel}
              </Link>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}
