"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// ── Types ──────────────────────────────────────────────────────────────────────

type Status = "done" | "soon" | "planned";

interface RoadmapItem {
  id: string;
  label: string;
  status: Status;
  desc: string;
}

// ── RoadmapSection ────────────────────────────────────────────────────────────

export function RoadmapSection() {
  const t = useTranslations("Roadmap");
  const prefersReduced = usePrefersReducedMotion();
  const timelineRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  const STATUS_STYLE: Record<Status, { label: string; color: string; border: string }> = {
    done: {
      label: t("statusDone"),
      color: "var(--color-leaf-light)",
      border: "var(--color-leaf-light)",
    },
    soon: {
      label: t("statusSoon"),
      color: "var(--color-accent-gold)",
      border: "var(--color-accent-gold)",
    },
    planned: {
      label: t("statusPlanned"),
      color: "var(--color-text-muted-dark)",
      border: "var(--color-surface-panel)",
    },
  };

  const ROADMAP: RoadmapItem[] = [
    { id: "m0", label: t("m0Label"), status: "done", desc: t("m0Desc") },
    { id: "m1", label: t("m1Label"), status: "done", desc: t("m1Desc") },
    { id: "m2", label: t("m2Label"), status: "soon", desc: t("m2Desc") },
    { id: "m3", label: t("m3Label"), status: "planned", desc: t("m3Desc") },
    { id: "m4", label: t("m4Label"), status: "planned", desc: t("m4Desc") },
    { id: "m5", label: t("m5Label"), status: "planned", desc: t("m5Desc") },
    { id: "m6", label: t("m6Label"), status: "planned", desc: t("m6Desc") },
  ];

  useEffect(() => {
    const timeline = timelineRef.current;
    const line = lineRef.current;
    if (!timeline || !line || prefersReduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          line.style.animation = "draw-line 1.2s ease forwards";
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(timeline);
    return () => observer.disconnect();
  }, [prefersReduced]);

  return (
    <section id="roadmap" className="bg-night-sky py-20" aria-labelledby="roadmap-heading">
      <div className="mx-auto max-w-3xl px-6">
        {/* Static star glyphs */}
        <div className="pointer-events-none relative mb-2 h-8" aria-hidden>
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
          className="mb-12 text-center text-leaf-light"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-display)",
            lineHeight: 1.25,
          }}
        >
          {t("heading")}
        </h2>

        {/* Timeline */}
        <div className="relative" ref={timelineRef}>
          {/* SVG vine spine */}
          <div
            className="pointer-events-none absolute left-5 top-0 h-full w-px sm:left-7"
            aria-hidden
          >
            <svg width="2" height="100%" style={{ display: "block" }}>
              <line
                ref={lineRef}
                x1="1"
                y1="0"
                x2="1"
                y2="100%"
                stroke="var(--color-leaf-light)"
                strokeWidth="2"
                strokeDasharray="1000"
                strokeDashoffset={prefersReduced ? 0 : 1000}
                opacity="0.6"
              />
            </svg>
          </div>

          <ol className="flex flex-col gap-6 pl-14 sm:pl-16">
            {ROADMAP.map((item) => {
              const st = STATUS_STYLE[item.status];
              return (
                <li key={item.id} className="relative">
                  {/* Node dot */}
                  <span
                    className="absolute -left-[2.35rem] top-1 h-3 w-3 sm:-left-[2.6rem]"
                    style={{
                      borderRadius: 0,
                      background:
                        item.status === "done"
                          ? "var(--color-leaf-light)"
                          : item.status === "soon"
                            ? "var(--color-accent-gold)"
                            : "var(--color-surface-panel)",
                      border: `2px solid ${st.border}`,
                    }}
                    aria-hidden
                  />

                  {/* Card */}
                  <div
                    className="rounded-[2px] p-4"
                    style={{
                      background: "var(--color-surface-panel)",
                      border: "var(--border-pixel)",
                    }}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-3">
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
                        className="px-1.5 py-0.5"
                        style={{
                          fontFamily: "var(--font-pixel)",
                          fontSize: "0.55rem",
                          color: st.color,
                          border: `1px solid ${st.border}`,
                          borderRadius: "var(--radius-pixel)",
                          borderStyle: item.status === "planned" ? "dashed" : "solid",
                        }}
                      >
                        {st.label}
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
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
