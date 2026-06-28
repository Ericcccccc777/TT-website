"use client";

import React from "react";
import { useTranslations } from "next-intl";

// The full, dev-facing roadmap lives on GitHub; this section is the player-facing teaser.
const GITHUB_ROADMAP = "https://github.com/YimingRen111/Token-Forest/blob/main/docs/ROADMAP.md";

interface FutureItem {
  id: string;
  emoji: string;
  label: string;
  desc: string;
}

export function RoadmapSection() {
  const t = useTranslations("Roadmap");

  const ITEMS: FutureItem[] = [
    { id: "f1", emoji: "🍎", label: t("f1Label"), desc: t("f1Desc") },
    { id: "f2", emoji: "🛍️", label: t("f2Label"), desc: t("f2Desc") },
    { id: "f3", emoji: "🌗", label: t("f3Label"), desc: t("f3Desc") },
    { id: "f4", emoji: "✨", label: t("f4Label"), desc: t("f4Desc") },
  ];

  return (
    <section id="roadmap" className="bg-night-sky py-20" aria-labelledby="roadmap-heading">
      <div className="mx-auto max-w-4xl px-6">
        {/* Static star glyphs — drift subtly with scroll via star-ambient */}
        <div className="star-ambient pointer-events-none relative mb-2 h-8" aria-hidden>
          {["10%", "25%", "45%", "62%", "78%", "92%"].map((left, i) => (
            <span
              key={i}
              className="absolute text-leaf-light"
              style={{
                left,
                top: `${(i % 3) * 8}px`,
                fontSize: i % 2 === 0 ? 10 : 7,
                opacity: 0.5,
              }}
            >
              ✦
            </span>
          ))}
        </div>

        <h2
          id="roadmap-heading"
          className="reveal text-center text-leaf-light"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-display)",
            lineHeight: 1.25,
          }}
        >
          {t("heading")}
        </h2>
        <p
          className="reveal mx-auto mt-4 max-w-xl text-center"
          style={
            {
              "--reveal-delay": "80ms",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body)",
              color: "var(--color-text-muted-dark)",
              lineHeight: 1.7,
            } as React.CSSProperties
          }
        >
          {t("intro")}
        </p>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {ITEMS.map((item, i) => (
            <li
              key={item.id}
              className="reveal rounded-[2px] p-5"
              style={
                {
                  background: "var(--color-surface-panel)",
                  border: "var(--border-pixel)",
                  "--reveal-delay": `${(i % 2) * 80}ms`,
                } as React.CSSProperties
              }
            >
              <div className="mb-2 flex items-center gap-3">
                <span aria-hidden style={{ fontSize: "1.4rem", lineHeight: 1 }}>
                  {item.emoji}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "var(--text-caption)",
                    color: "var(--color-text-cream)",
                  }}
                >
                  {item.label}
                </span>
                <span
                  className="ml-auto whitespace-nowrap px-1.5 py-0.5"
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "0.55rem",
                    color: "var(--color-accent-gold)",
                    border: "1px dashed var(--color-accent-gold)",
                    borderRadius: "var(--radius-pixel)",
                  }}
                >
                  {t("soon")}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  color: "var(--color-text-muted-dark)",
                  lineHeight: 1.6,
                }}
              >
                {item.desc}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <a
            href={GITHUB_ROADMAP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block underline-offset-4 hover:underline"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-caption)",
              color: "var(--color-leaf-light)",
            }}
          >
            {t("fullRoadmap")}
          </a>
        </div>
      </div>
    </section>
  );
}
