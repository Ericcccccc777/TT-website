"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useInView } from "@/hooks/use-in-view";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Mock leaderboard for the homepage teaser — a coherent "overtake" loop:
 * every ~9-13s the runner-up's token count ticks up until it PASSES the
 * leader, then the two rows trade places (FLIP-style translate), so the
 * top position always shows the higher number and rank 01 stays on top.
 * Rank/medal colours belong to the position, names travel with their rows.
 *
 * Runs only while in view; reduced motion renders the static table.
 */

interface Row {
  name: string;
  tokens: number;
}

const START: Row[] = [
  { name: "devwanderer", tokens: 2_840_192 },
  { name: "nightcoder_x", tokens: 1_902_448 },
  { name: "token_farmer", tokens: 1_233_760 },
];

const RANKS = [
  { label: "01", color: "var(--color-accent-gold)" },
  { label: "02", color: "#9ba8af" },
  { label: "03", color: "var(--color-soil-light)" },
] as const;

const COUNT_STEPS = 9;

export function TeaserTable({
  rankHeader,
  usernameHeader,
  tokensHeader,
  locale,
}: {
  rankHeader: string;
  usernameHeader: string;
  tokensHeader: string;
  locale: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLTableSectionElement>({ threshold: 0.2 });
  const [rows, setRows] = useState<Row[]>(START);
  const [swapping, setSwapping] = useState(false);
  const [rowH, setRowH] = useState(46);

  useEffect(() => {
    if (!inView || prefersReduced) return;
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };

    const cycle = () => {
      if (!alive) return;
      // 1) the challenger's count climbs past the leader
      let step = 0;
      const iv = setInterval(() => {
        step += 1;
        setRows((rs) => {
          const c = rs.map((r) => ({ ...r }));
          const target = c[0].tokens + 74_000 + Math.floor(Math.random() * 160_000);
          const remaining = target - c[1].tokens;
          c[1].tokens =
            step >= COUNT_STEPS
              ? target
              : c[1].tokens + Math.max(1, Math.ceil(remaining / (COUNT_STEPS - step + 1)));
          return c;
        });
        if (step >= COUNT_STEPS) {
          clearInterval(iv);
          timers.delete(iv as unknown as ReturnType<typeof setTimeout>);
          // 2) measure, then trade places
          const tr = ref.current?.querySelector("tr");
          if (tr) setRowH(tr.getBoundingClientRect().height);
          setSwapping(true);
          later(() => {
            setRows((rs) => {
              const c = [...rs];
              [c[0], c[1]] = [c[1], c[0]];
              return c;
            });
            setSwapping(false);
          }, 420);
        }
      }, 130);
      timers.add(iv as unknown as ReturnType<typeof setTimeout>);
      later(cycle, 9000 + Math.random() * 4000);
    };

    later(cycle, 3800);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      setRows(START);
      setSwapping(false);
    };
  }, [inView, prefersReduced]);

  return (
    <table className="w-full border-collapse">
      <colgroup>
        <col style={{ width: "3.5rem" }} />
        <col />
        <col style={{ width: "auto" }} />
      </colgroup>
      <thead>
        <tr
          className="bg-leaf-deep"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
        >
          <th scope="col" className="px-4 py-2 text-left text-text-cream">
            {rankHeader}
          </th>
          <th scope="col" className="px-4 py-2 text-left text-text-cream">
            {usernameHeader}
          </th>
          <th scope="col" className="px-4 py-2 text-right text-text-cream">
            {tokensHeader}
          </th>
        </tr>
      </thead>
      <tbody ref={ref}>
        {rows.map((row, i) => (
          <tr
            key={row.name}
            className="lb-row border-t border-leaf-deep/20"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body)",
              transform: swapping
                ? i === 0
                  ? `translateY(${rowH}px)`
                  : i === 1
                    ? `translateY(-${rowH}px)`
                    : undefined
                : undefined,
              transition: swapping ? "transform 380ms ease-in-out" : undefined,
            }}
          >
            <td
              className="whitespace-nowrap px-4 py-3"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                color: RANKS[i].color,
              }}
            >
              {RANKS[i].label}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="animate-tree-breathe inline-block shrink-0"
                  style={{ transformOrigin: "bottom center" }}
                  aria-hidden
                >
                  <Image
                    src="/sprites/AppleTree_8.png"
                    alt=""
                    width={20}
                    height={20}
                    className="pixelated"
                    style={{ width: 20, height: 20, objectFit: "contain" }}
                  />
                </span>
                <span style={{ color: "var(--color-text-cream)" }}>{row.name}</span>
              </div>
            </td>
            <td
              className="px-4 py-3 text-right"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "var(--text-caption)",
                color: "var(--color-accent-gold)",
              }}
            >
              {row.tokens.toLocaleString(locale)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
