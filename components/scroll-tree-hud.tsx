"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTreeSkin } from "@/hooks/use-tree-skin";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Scroll-progress tree HUD — a fixed pixel chip (bottom-right) whose tree
 * sprite grows stage 1→8 as the page scrolls, with a scrubbing XP bar and a
 * MAX ✦ blip at the bottom. The sprite species is bound to the showcase's
 * selected skin (useTreeSkin). Clicking it glides the page back to the top —
 * the scroll-driven timeline then shrinks the tree stage by stage for free.
 *
 * Growth scrubbing is pure CSS (globals.css §SCROLL TREE HUD): only shown
 * ≥640px in browsers supporting `animation-timeline: scroll()`, hidden under
 * reduced motion.
 */

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const SKIN_PREFIX: Record<string, string> = {
  apple: "AppleTree",
  cherry: "CherryTree",
  cactus: "Cactus",
  christmas: "ChristmasTree",
};

export function ScrollTreeHud({ backToTop }: { backToTop: string }) {
  const skin = useTreeSkin();
  const prefersReduced = usePrefersReducedMotion();
  const rafRef = useRef<number | null>(null);
  const prefix = SKIN_PREFIX[skin] ?? "AppleTree";

  // Cancel the glide if the user takes over (wheel / touch / keys) or unmount
  useEffect(() => {
    const cancel = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    return () => {
      cancel();
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, []);

  const scrollToTop = () => {
    const start = window.scrollY;
    if (start <= 0) return;
    if (prefersReduced) {
      window.scrollTo(0, 0);
      return;
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    // slow glide, distance-scaled (~2s for a full page) so the tree visibly
    // shrinks back through its stages on the way up
    const dur = Math.min(2400, 700 + start * 0.4);
    const t0 = performance.now();
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, Math.round(start * (1 - ease(p))));
      rafRef.current = p < 1 ? requestAnimationFrame(step) : null;
    };
    rafRef.current = requestAnimationFrame(step);
  };

  return (
    <div className="scroll-hud fixed bottom-4 right-4 z-40">
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={backToTop}
        title={backToTop}
        className="block cursor-pointer p-1 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-deep"
        style={{
          border: "var(--border-pixel)",
          borderRadius: "var(--radius-pixel)",
          background: "var(--color-surface-card)",
          boxShadow: "var(--shadow-pixel)",
        }}
      >
        {/* sprite viewport: a vertical strip of the 8 stages, scrubbed by scroll */}
        <span className="relative block h-14 w-14 overflow-hidden" aria-hidden>
          <span className="hud-strip block">
            {STAGES.map((s) => (
              <span key={s} className="flex h-14 w-14 items-end justify-center">
                <Image
                  src={`/sprites/${prefix}_${s}.png`}
                  alt=""
                  width={52}
                  height={52}
                  className="pixelated"
                  style={{
                    width: 52,
                    height: 52,
                    objectFit: "contain",
                    objectPosition: "50% 100%",
                  }}
                />
              </span>
            ))}
          </span>
          <span
            className="hud-max absolute inset-x-0 top-0 text-center"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "0.45rem",
              color: "var(--color-leaf-deep)",
              lineHeight: 1,
              opacity: 0,
            }}
          >
            MAX✦
          </span>
        </span>

        {/* XP bar = page scroll progress */}
        <span
          className="relative mt-1 block h-[7px] overflow-hidden"
          style={{
            border: "1px solid var(--color-soil)",
            borderRadius: "var(--radius-pixel)",
            background: "var(--color-surface-parchment)",
          }}
          aria-hidden
        >
          <span
            className="hud-xp block h-full"
            style={{ background: "var(--color-leaf-deep)", transformOrigin: "left" }}
          />
          {/* quarter notches */}
          {[25, 50, 75].map((m) => (
            <span
              key={m}
              className="absolute top-0 h-full w-px opacity-30"
              style={{ left: `${m}%`, background: "var(--color-soil)" }}
            />
          ))}
        </span>
      </button>
    </div>
  );
}
