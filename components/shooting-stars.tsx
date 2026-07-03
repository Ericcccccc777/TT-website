"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface Star {
  id: number;
  top: number; // % from the top of the sky layer
  dur: number; // crossing seconds
}

/**
 * Shooting-star spawner for the roadmap night sky — the tree-scene tumbleweed
 * spawner pattern: random 6–16s gaps, max one alive, never spawns under
 * reduced motion, fully stopped when `active` is false (section offscreen).
 */
export function ShootingStars({ active }: { active: boolean }) {
  const prefersReduced = usePrefersReducedMotion();
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    if (!active || prefersReduced) return;
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    const spawn = () => {
      if (!alive) return;
      const star: Star = {
        id: Math.random(),
        top: 6 + Math.random() * 34,
        dur: 1.2 + Math.random() * 0.5,
      };
      setStars([star]);
      later(() => setStars((s) => s.filter((x) => x.id !== star.id)), star.dur * 1000 + 200);
      later(spawn, 6000 + Math.random() * 10000);
    };
    later(spawn, 2500 + Math.random() * 5000);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      setStars([]);
    };
  }, [active, prefersReduced]);

  return (
    <>
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute left-0"
          style={{
            top: `${s.top}%`,
            animation: `shooting-star ${s.dur}s linear 1 both`,
          }}
          aria-hidden
        >
          {/* head + tail, pre-rotated to the flight slope */}
          <span
            className="block h-[2px] w-10"
            style={{
              transform: "rotate(17deg)",
              transformOrigin: "right center",
              background: "linear-gradient(90deg, transparent, #cfe8d6)",
            }}
          >
            <span
              className="absolute -right-[1px] -top-[1px] h-[4px] w-[4px]"
              style={{ background: "#f6f1e6" }}
            />
          </span>
        </span>
      ))}
    </>
  );
}
