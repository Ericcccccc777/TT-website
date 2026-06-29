// Global not-found boundary. It renders through the pass-through root layout
// (app/layout.tsx), which intentionally has no <html>/<body> — those live in
// app/[locale]/layout.tsx. A not-found has no locale segment, so it must supply
// its own document tags, otherwise Next.js errors with
// "Missing <html> and <body> tags in the root layout".
import Link from "next/link";
import "./globals.css";

export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          padding: "2rem",
          textAlign: "center",
          background: "var(--color-surface-parchment)",
          color: "var(--color-text-forest)",
        }}
      >
        <span style={{ fontSize: "3rem", lineHeight: 1 }} aria-hidden>
          🌳
        </span>
        <h1
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "2.5rem",
            lineHeight: 1.1,
            color: "var(--color-leaf-deep)",
            margin: 0,
          }}
        >
          404
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "var(--color-text-muted-light)",
            maxWidth: "24rem",
            margin: 0,
          }}
        >
          This page didn&rsquo;t grow here. Let&rsquo;s head back to the forest.
        </p>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.8125rem",
            background: "var(--color-leaf-deep)",
            color: "var(--color-text-cream)",
            padding: "0.75rem 1.5rem",
            borderRadius: "2px",
            boxShadow: "var(--shadow-pixel)",
            textDecoration: "none",
          }}
        >
          &larr; Home
        </Link>
      </body>
    </html>
  );
}
