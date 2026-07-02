"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TokenBubbles } from "./token-bubbles";

const GITHUB_URL = "https://github.com/YimingRen111/Token-Forest";

// ── SVG cloud ─────────────────────────────────────────────────────────────────

function CloudSvg({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 120 48"
      className={className}
      style={style}
      aria-hidden
      fill="white"
      opacity="0.55"
    >
      <ellipse cx="60" cy="32" rx="52" ry="18" />
      <ellipse cx="36" cy="26" rx="28" ry="18" />
      <ellipse cx="82" cy="24" rx="26" ry="16" />
    </svg>
  );
}

// ── Sparkle star spans ────────────────────────────────────────────────────────

const SPARKLE_POSITIONS = [
  { top: "12%", left: "42%", delay: "0s", size: 10 },
  { top: "8%", left: "58%", delay: "0.35s", size: 8 },
  { top: "20%", left: "35%", delay: "0.7s", size: 7 },
  { top: "15%", left: "66%", delay: "1.05s", size: 9 },
  { top: "28%", left: "48%", delay: "1.4s", size: 6 },
  { top: "22%", left: "72%", delay: "1.75s", size: 8 },
];

function Sparkles() {
  return (
    <>
      {SPARKLE_POSITIONS.map((s, i) => (
        <span
          key={i}
          className="sparkle pointer-events-none absolute"
          aria-hidden
          style={{
            top: s.top,
            left: s.left,
            animationDelay: s.delay,
            color: "var(--color-leaf-light)",
            fontSize: s.size,
          }}
        >
          ✦
        </span>
      ))}
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

export function Hero() {
  const t = useTranslations("Hero");
  const cloudRef = useRef<HTMLDivElement>(null);
  const grassRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let raf = 0;
    function onScroll() {
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        document.documentElement.style.setProperty("--scroll-y", `${y}px`);
        if (cloudRef.current) cloudRef.current.style.transform = `translateY(calc(${y}px * -0.25))`;
        if (grassRef.current) grassRef.current.style.transform = `translateY(calc(${y}px * -0.06))`;
      });
    }

    function onMotionChange() {
      if (mq.matches) {
        window.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(raf);
        if (cloudRef.current) cloudRef.current.style.transform = "";
        if (grassRef.current) grassRef.current.style.transform = "";
      } else {
        window.addEventListener("scroll", onScroll, { passive: true });
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", onMotionChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onMotionChange);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      className="relative overflow-hidden bg-day-sky"
      style={{ minHeight: "100svh" }}
      aria-label={t("ariaLabel")}
    >
      {/* ── Cloud parallax layer ── */}
      <div
        ref={cloudRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-0 will-change-transform"
        aria-hidden
      >
        <CloudSvg className="absolute left-[8%] top-[10%] w-36 sm:w-48" />
        <CloudSvg className="absolute right-[12%] top-[6%] w-28 sm:w-40" style={{ opacity: 0.4 }} />
        <CloudSvg
          className="absolute left-[30%] top-[18%] w-24 sm:w-32"
          style={{ opacity: 0.35 }}
        />
      </div>

      {/* ── Grass parallax layer ── */}
      <div
        ref={grassRef}
        className="pointer-events-none absolute inset-x-0 bottom-16 z-0 will-change-transform"
        aria-hidden
      >
        <svg viewBox="0 0 1440 48" className="w-full" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 48 Q 30 20 60 36 Q 90 52 120 32 Q 150 14 180 30 Q 210 46 240 28 Q 270 10 300 32 Q 330 52 360 36 Q 390 20 420 40 Q 450 56 480 34 Q 510 14 540 36 Q 570 54 600 32 Q 630 12 660 34 Q 690 52 720 36 Q 750 20 780 38 Q 810 52 840 30 Q 870 10 900 32 Q 930 52 960 34 Q 990 16 1020 36 Q 1050 54 1080 32 Q 1110 12 1140 36 Q 1170 56 1200 34 Q 1230 14 1260 36 Q 1290 54 1320 32 Q 1350 12 1380 36 Q 1410 56 1440 36 L1440 48 Z"
            fill="var(--color-leaf-deep)"
            opacity="0.35"
          />
        </svg>
      </div>

      {/* ── Ground strip ── */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-16" aria-hidden>
        <Image
          src="/sprites/Ground.png"
          alt=""
          fill
          sizes="100vw"
          className="pixelated object-cover object-bottom"
          priority
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-20 mx-auto flex max-w-5xl flex-col items-center px-6 pb-32 pt-16 sm:pt-20">
        {/* Tree + bubbles */}
        <div
          className="relative mb-8 flex w-[200px] items-end justify-center sm:w-[240px]"
          style={{ aspectRatio: "3 / 4" }}
        >
          {/* Token bubbles appear scattered AROUND the canopy (incl. its left
              & right sides), linger ~3s, drift up slightly, then fade. */}
          <TokenBubbles className="absolute -inset-x-10 top-0 bottom-[38%] z-30" />
          <div
            className="animate-tree-breathe absolute inset-0 z-20"
            style={{ transformOrigin: "bottom center" }}
          >
            <Image
              src="/sprites/AppleTree_8.png"
              alt={t("treeAlt")}
              fill
              sizes="(max-width: 640px) 200px, 240px"
              className="pixelated object-contain object-bottom"
              priority
            />
          </div>
          <div className="absolute inset-0 z-30">
            <Sparkles />
          </div>
        </div>

        {/* Brand wordmark */}
        <h1
          className="text-center text-leaf-deep"
          style={{
            fontFamily: "var(--font-brand)",
            fontSize: "clamp(1.25rem, 4vw, 2.5rem)",
            lineHeight: 1.2,
            textShadow: "var(--shadow-pixel-leaf)",
          }}
        >
          Token-Forest
        </h1>

        {/* Tagline */}
        <p
          className="mt-4 max-w-md text-center text-text-forest"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-h2)",
            lineHeight: 1.5,
            color: "var(--color-text-forest)",
          }}
        >
          {t("tagline")}
        </p>
        <p
          className="mt-2 max-w-sm text-center"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-body)",
            color: "var(--color-text-muted-light)",
          }}
        >
          {t("body")}
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex w-full max-w-xs flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
          <Link
            href="/download"
            className="inline-flex items-center justify-center gap-2 rounded-[2px] px-6 py-3 text-text-cream transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-caption)",
              background: "var(--color-leaf-deep)",
              boxShadow: "var(--shadow-pixel)",
              color: "var(--color-text-cream)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
              <path d="M7 1v7.293L4.854 6.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L7.5 8.293V1H7ZM1 11a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H1Z" />
            </svg>
            {t("downloadBtn")}
          </Link>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-[2px] px-6 py-3 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "var(--text-caption)",
              background: "var(--color-surface-parchment)",
              border: "var(--border-pixel)",
              boxShadow: "var(--shadow-pixel)",
              color: "var(--color-text-forest)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
            GitHub
          </a>
        </div>

        {/* Privacy micro-copy */}
        <p
          className="mt-6"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted-light)",
          }}
        >
          {t("privacyCopy")}
        </p>
      </div>
    </section>
  );
}
