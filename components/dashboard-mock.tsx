"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * §dashboard hero demo — an interactive mock of the desktop app's
 * "数据面板 / Dashboard" window (wooden frame + parchment inlay, from the
 * app's v2a design handoff; palette in globals.css §DASHBOARD).
 *
 * Behavior ported 1:1 from the approved design (1b):
 *  - three tabs (growth / usage / chats) auto-rotate every 4s
 *  - hovering the window pauses rotation; clicking a tab holds it 12s
 *  - entering the usage tab replays a 900ms cubic ease-out $ count-up
 *  - prefers-reduced-motion: no rotation, $ rendered at its final value
 * Numbers are fictional demo values on purpose (caption says so).
 */

const ROTATE_MS = 4000;
const HOLD_MS = 12000;
const COUNT_MS = 900;
const DOLLARS = 128.4;

// GitHub-style 26×7 heatmap — deterministic (same on server and client,
// so SSR markup hydrates cleanly). Formula from the design handoff.
const HEAT_LEVELS: number[] = (() => {
  const levels: number[] = [];
  for (let w = 0; w < 26; w++) {
    for (let d = 0; d < 7; d++) {
      const a = Math.abs(Math.sin(w * 2.9 + d * 5.7));
      const b = Math.abs(Math.sin(w * 0.83 + d * 1.7 + 2));
      let lvl = Math.floor(a * b * 6.2);
      if (d > 4 && lvl > 2) lvl -= 1;
      if (lvl > 4) lvl = 4;
      levels.push(lvl);
    }
  }
  return levels;
})();

const CHAT_ROWS = [
  { titleKey: "mockChat0", project: "token-forest", dot: "var(--dash-claude)", prompts: 14, cost: "$3.84" },
  { titleKey: "mockChat1", project: "tt-website", dot: "var(--dash-claude)", prompts: 6, cost: "$1.27" },
  { titleKey: "mockChat2", project: "dotfiles", dot: "var(--dash-codex)", prompts: 3, cost: "$0.42" },
  { titleKey: "mockChat3", project: "token-forest", dot: "var(--dash-claude)", prompts: 9, cost: "$2.18" },
] as const;

// 4-type cost split: [width %, color, legend key]
const COST_SEGMENTS = [
  [38, "#2e7d3c", "mockLegendCacheRead"],
  [34, "#d9a83c", "mockLegendOutput"],
  [18, "#8cc46a", "mockLegendCacheWrite"],
  [10, "#a07850", "mockLegendInput"],
] as const;

const HEAT_RAMP = [
  "var(--dash-heat-0)",
  "var(--dash-heat-1)",
  "var(--dash-heat-2)",
  "var(--dash-heat-3)",
  "var(--dash-heat-4)",
] as const;

// Pixel label font: Silkscreen for latin, body font for CJK glyphs.
const PX = "var(--font-pixel), var(--font-body)";
const MONO = "var(--font-mono), monospace";

function MockCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`dash-card${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

export function DashboardMock() {
  const t = useTranslations("DashboardPage");

  const [tab, setTabState] = useState(0);
  const [dollars, setDollars] = useState(DOLLARS.toFixed(2));
  const tabRef = useRef(0);
  const pausedRef = useRef(false);
  const holdRef = useRef(0);
  const rafRef = useRef(0);
  const reducedRef = useRef(false);

  const countUp = useCallback(() => {
    if (reducedRef.current) {
      setDollars(DOLLARS.toFixed(2));
      return;
    }
    cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / COUNT_MS);
      setDollars((DOLLARS * (1 - Math.pow(1 - p, 3))).toFixed(2));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const setTab = useCallback(
    (i: number) => {
      tabRef.current = i;
      setTabState(i);
      if (i === 1) countUp();
    },
    [countUp],
  );

  const clickTab = useCallback(
    (i: number) => {
      holdRef.current = Date.now();
      setTab(i);
    },
    [setTab],
  );

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedRef.current) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      if (Date.now() - holdRef.current < HOLD_MS) return;
      setTab((tabRef.current + 1) % 3);
    }, ROTATE_MS);
    return () => {
      clearInterval(id);
      cancelAnimationFrame(rafRef.current);
    };
  }, [setTab]);

  const TABS = [t("tabGrowth"), t("tabUsage"), t("tabChats")];

  return (
    <div>
      {/* ── Wooden window frame ── */}
      <div
        role="group"
        aria-label={t("mockTitle")}
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
        style={{
          width: "100%",
          background:
            "linear-gradient(180deg, var(--dash-wood-hi) 0%, var(--dash-wood-mid) 55%, var(--dash-wood-lo) 100%)",
          borderRadius: 10,
          boxShadow:
            "0 0 0 3px var(--dash-wood-edge), 6px 6px 0 rgb(0 0 0 / 40%), 0 0 64px rgb(123 216 143 / 14%), inset 0 3px 0 rgb(255 222 160 / 30%), inset 0 -4px 0 rgb(35 18 4 / 42%)",
        }}
      >
        {/* Title bar: nameplate + updated + refresh */}
        <div className="flex items-center gap-2.5 px-3.5 pb-1.5 pt-2.5">
          <span
            className="flex items-center gap-2"
            style={{
              background: "linear-gradient(180deg, #c08a45 0%, #a2692c 46%, #8a5620 100%)",
              border: "2px solid var(--dash-tab-edge)",
              borderRadius: 7,
              padding: "4px 12px",
              boxShadow:
                "inset 0 2px 0 rgb(255 226 170 / 38%), inset 0 -3px 0 rgb(40 20 5 / 38%), 0 3px 0 rgb(0 0 0 / 35%)",
            }}
          >
            <Image
              src="/sprites/AppleTree_4.png"
              alt=""
              width={16}
              height={16}
              className="pixelated h-4 w-4"
              aria-hidden
            />
            <span
              style={{
                fontFamily: PX,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#39220b",
                textShadow: "0 1px 0 rgb(255 230 180 / 55%)",
              }}
            >
              {t("mockTitle")}
            </span>
          </span>
          <span
            className="ml-auto hidden sm:block"
            style={{ fontSize: 11, color: "#ffe9bd", textShadow: "0 1px 0 rgb(40 18 2 / 80%)" }}
          >
            {t("mockUpdated")}
          </span>
          <span
            className="ml-auto inline-flex items-center gap-1.5 sm:ml-0"
            style={{
              background: "linear-gradient(180deg, #bd873f 0%, #996127 52%, #84511f 100%)",
              border: "2px solid var(--dash-tab-edge)",
              borderRadius: 7,
              padding: "5px 11px",
              boxShadow:
                "inset 0 2px 0 rgb(255 226 170 / 40%), inset 0 -3px 0 rgb(46 22 4 / 40%), 0 2px 0 var(--dash-wood-edge)",
              fontFamily: PX,
              fontSize: 10,
              color: "#ffeec9",
              textShadow: "0 1px 0 rgb(40 18 2 / 75%)",
            }}
            aria-hidden
          >
            <span>↻</span>
            <span>{t("mockRefresh")}</span>
          </span>
        </div>

        {/* Wooden tabs */}
        <div
          role="tablist"
          className="relative z-[2] -mb-[3px] flex items-end gap-[7px] px-3.5 pt-2"
        >
          {TABS.map((label, i) => (
            <button
              key={label}
              role="tab"
              type="button"
              aria-selected={tab === i}
              className={`dash-tab${tab === i ? " dash-tab-active" : ""}`}
              onClick={() => clickTab(i)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Parchment inlay */}
        <div
          className="relative mx-2.5 mb-2.5 overflow-hidden"
          style={{
            background: "var(--dash-parchment)",
            border: "3px solid var(--dash-line)",
            borderRadius: 7,
            boxShadow: "inset 0 5px 12px rgb(122 82 24 / 32%), 0 0 0 1px rgb(255 222 160 / 16%)",
          }}
        >
          {/* ── Tab 0: growth ── */}
          {tab === 0 && (
            <div
              key="growth"
              role="tabpanel"
              className="flex min-h-[396px] flex-col gap-3 p-3.5"
              style={{ animation: "dash-tab-in 0.35s ease-out both" }}
            >
              <MockCard className="grid grid-cols-[110px_1fr] gap-3 p-3 sm:grid-cols-[150px_1fr]">
                {/* Tree scene */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    border: "2px solid var(--dash-line)",
                    borderRadius: 7,
                    background:
                      "linear-gradient(180deg, var(--color-sky-day-top) 0%, var(--color-sky-day-mid) 60%, var(--color-sky-day-horizon) 100%)",
                    minHeight: 128,
                  }}
                >
                  <Image
                    src="/sprites/Ground.png"
                    alt=""
                    width={150}
                    height={20}
                    className="pixelated absolute inset-x-0 bottom-0 h-5 w-full object-cover"
                    aria-hidden
                  />
                  <Image
                    src="/sprites/AppleTree_6.png"
                    alt=""
                    width={88}
                    height={95}
                    className="pixelated absolute bottom-2.5 left-1/2 w-[72px] -translate-x-1/2 sm:w-[88px]"
                    style={{
                      animation: "tree-breathe 4.5s ease-in-out infinite alternate",
                      transformOrigin: "bottom center",
                    }}
                    aria-hidden
                  />
                </div>
                {/* Stage + XP */}
                <div className="flex flex-col justify-center gap-2">
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: PX, fontSize: 11.5, color: "var(--dash-ink-soft)" }}>
                      {t("mockTreeName")}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        background: "rgb(14 18 8 / 78%)",
                        border: "2px solid var(--dash-tab-edge)",
                        borderRadius: 6,
                        fontFamily: PX,
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#8fe8a0",
                      }}
                    >
                      Lv 6
                    </span>
                  </div>
                  <div
                    className="flex justify-between"
                    style={{ fontFamily: PX, fontSize: 11.5, color: "var(--dash-ink)" }}
                  >
                    <span>{t("mockStage")}</span>
                    <span>→ VII</span>
                  </div>
                  <div
                    className="overflow-hidden"
                    style={{
                      height: 17,
                      background: "var(--dash-slot)",
                      border: "2px solid var(--dash-line)",
                      borderRadius: 6,
                      boxShadow: "inset 0 2px 4px rgb(122 82 24 / 40%)",
                      padding: 2,
                    }}
                  >
                    <div
                      style={{
                        width: "68%",
                        height: "100%",
                        background: "linear-gradient(180deg, #a5ecb0 0%, #57a568 46%, #4f9e63 100%)",
                        boxShadow:
                          "inset 0 -3px 0 rgb(18 60 30 / 50%), inset 0 2px 0 rgb(255 255 255 / 40%)",
                        borderRadius: 3,
                        transformOrigin: "left",
                        animation: "dash-grow-x 0.8s ease-out both",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "rgb(51 33 13 / 65%)" }}>{t("mockToNext")}</div>
                </div>
              </MockCard>

              <div className="grid grid-cols-2 gap-3">
                <MockCard className="p-3">
                  <div style={{ fontFamily: PX, fontSize: 11.5, color: "var(--dash-ink-soft)" }}>
                    {t("mockPlanted")}
                  </div>
                  <div
                    className="mt-2"
                    style={{ fontFamily: MONO, fontWeight: 700, fontSize: 21, color: "var(--dash-ink)" }}
                  >
                    41
                    <span
                      style={{
                        marginLeft: 6,
                        fontFamily: "var(--font-body)",
                        fontSize: 12,
                        fontWeight: 400,
                        color: "rgb(51 33 13 / 65%)",
                      }}
                    >
                      {t("mockPlantedUnit")}
                    </span>
                  </div>
                </MockCard>
                <MockCard className="p-3">
                  <div style={{ fontFamily: PX, fontSize: 11.5, color: "var(--dash-ink-soft)" }}>
                    {t("mockEnergy")}
                  </div>
                  <div
                    className="mt-2"
                    style={{ fontFamily: MONO, fontWeight: 700, fontSize: 21, color: "var(--dash-ink)" }}
                  >
                    112.6M
                  </div>
                </MockCard>
              </div>

              <MockCard className="flex items-center justify-between px-3 py-[11px]">
                <span style={{ fontFamily: PX, fontSize: 11.5, color: "var(--dash-ink)" }}>
                  {t("mockTreeSoFar")}
                </span>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, color: "var(--dash-ink)" }}>
                  ≈ $128.40
                </span>
              </MockCard>

              {/* Species strip: apple active · cherry idle · cactus locked */}
              <div className="flex items-center gap-2 px-0.5">
                <span style={{ fontFamily: PX, fontSize: 9, color: "rgb(51 33 13 / 55%)" }}>
                  {t("mockSpecies")}
                </span>
                <span className="dash-card flex h-[34px] w-[34px] items-end justify-center">
                  <Image
                    src="/sprites/AppleTree_6.png"
                    alt=""
                    width={24}
                    height={26}
                    className="pixelated w-6"
                    aria-hidden
                  />
                </span>
                <span
                  className="flex h-[34px] w-[34px] items-end justify-center opacity-80"
                  style={{
                    background: "var(--dash-slot)",
                    border: "2px solid rgb(74 42 13 / 35%)",
                    borderRadius: 2,
                  }}
                >
                  <Image
                    src="/sprites/CherryTree_6.png"
                    alt=""
                    width={24}
                    height={26}
                    className="pixelated w-6"
                    aria-hidden
                  />
                </span>
                <span
                  className="relative flex h-[34px] w-[34px] items-end justify-center opacity-[0.65]"
                  style={{
                    background: "var(--dash-slot)",
                    border: "2px solid rgb(74 42 13 / 35%)",
                    borderRadius: 2,
                  }}
                >
                  <Image
                    src="/sprites/Cactus_6.png"
                    alt=""
                    width={24}
                    height={26}
                    className="pixelated w-6 grayscale-[0.7]"
                    aria-hidden
                  />
                  <span className="absolute -right-1.5 -top-1.5" style={{ fontSize: 10 }} aria-hidden>
                    🔒
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* ── Tab 1: usage ── */}
          {tab === 1 && (
            <div
              key="usage"
              role="tabpanel"
              className="flex min-h-[396px] flex-col gap-3 p-3.5"
              style={{ animation: "dash-tab-in 0.35s ease-out both" }}
            >
              <MockCard className="p-3">
                <div
                  className="flex justify-between gap-2"
                  style={{ fontFamily: PX, fontSize: 11.5, color: "var(--dash-ink-soft)" }}
                >
                  <span>{t("mockCostTitle")}</span>
                  <span className="text-right">{t("mockCostMeta")}</span>
                </div>
                <div
                  className="mt-2.5"
                  style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: "var(--dash-ink)" }}
                >
                  ≈ ${dollars}
                </div>
                <div
                  className="mt-3 flex overflow-hidden"
                  style={{
                    height: 16,
                    border: "2px solid var(--dash-line)",
                    borderRadius: 6,
                    boxShadow: "inset 0 2px 3px rgb(122 82 24 / 35%)",
                    background: "var(--dash-slot)",
                  }}
                >
                  {COST_SEGMENTS.map(([w, color], i) => (
                    <span
                      key={color}
                      style={{
                        width: `${w}%`,
                        background: color,
                        transformOrigin: "left",
                        animation: `dash-grow-x 0.6s ease-out ${i * 0.12}s both`,
                      }}
                    />
                  ))}
                </div>
                <div
                  className="mt-2 grid grid-cols-1 gap-x-2.5 gap-y-[3px] sm:grid-cols-2"
                  style={{ fontSize: 11, color: "rgb(51 33 13 / 75%)" }}
                >
                  {COST_SEGMENTS.map(([, color, key]) => (
                    <span key={key} className="flex items-center gap-[5px]">
                      <span className="h-[7px] w-[7px] shrink-0" style={{ background: color }} />
                      {t(key)}
                    </span>
                  ))}
                </div>
              </MockCard>

              {/* Per-model bars */}
              <MockCard className="flex items-center gap-2.5 px-3 py-2.5">
                <span className="h-[7px] w-[7px] shrink-0" style={{ background: "var(--dash-claude)" }} />
                <span
                  className="w-[104px] sm:w-[120px]"
                  style={{ fontFamily: PX, fontSize: 9, color: "var(--dash-ink)" }}
                >
                  claude-sonnet-4-5
                </span>
                <span
                  className="h-[9px] flex-1"
                  style={{ background: "var(--dash-slot)", border: "1px solid var(--dash-card-line)" }}
                >
                  <span
                    className="block h-full"
                    style={{
                      width: "72%",
                      background: "var(--dash-claude)",
                      transformOrigin: "left",
                      animation: "dash-grow-x 0.7s ease-out both",
                    }}
                  />
                </span>
                <span style={{ fontSize: 11, color: "rgb(51 33 13 / 75%)" }}>$89.10</span>
              </MockCard>
              <MockCard className="flex items-center gap-2.5 px-3 py-2.5">
                <span className="h-[7px] w-[7px] shrink-0" style={{ background: "var(--dash-codex)" }} />
                <span
                  className="w-[104px] sm:w-[120px]"
                  style={{ fontFamily: PX, fontSize: 9, color: "var(--dash-ink)" }}
                >
                  gpt-5-codex
                </span>
                <span
                  className="h-[9px] flex-1"
                  style={{ background: "var(--dash-slot)", border: "1px solid var(--dash-card-line)" }}
                >
                  <span
                    className="block h-full"
                    style={{
                      width: "38%",
                      background: "var(--dash-codex)",
                      transformOrigin: "left",
                      animation: "dash-grow-x 0.7s ease-out 0.15s both",
                    }}
                  />
                </span>
                <span style={{ fontSize: 11, color: "rgb(51 33 13 / 75%)" }}>$39.30</span>
              </MockCard>

              {/* Heatmap + burn rate */}
              <MockCard className="flex flex-wrap gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div style={{ fontFamily: PX, fontSize: 11.5, color: "var(--dash-ink-soft)" }}>
                    {t("mockHeatTitle")}
                  </div>
                  <div
                    className="mt-2 grid gap-[2px]"
                    style={{
                      gridTemplateRows: "repeat(7, 7px)",
                      gridAutoColumns: "7px",
                      gridAutoFlow: "column",
                      width: 232,
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                    aria-hidden
                  >
                    {HEAT_LEVELS.map((lvl, i) => (
                      <span key={i} style={{ background: HEAT_RAMP[lvl] }} />
                    ))}
                  </div>
                </div>
                <div
                  className="flex flex-col justify-end gap-1"
                  style={{ fontSize: 11, color: "rgb(51 33 13 / 65%)" }}
                >
                  <span style={{ fontFamily: PX, fontSize: 9, color: "rgb(51 33 13 / 55%)" }}>
                    BURN RATE
                  </span>
                  <span>{t("mockBurnTokens")}</span>
                  <span>{t("mockBurnCost")}</span>
                </div>
              </MockCard>
            </div>
          )}

          {/* ── Tab 2: chats ── */}
          {tab === 2 && (
            <div
              key="chats"
              role="tabpanel"
              className="flex min-h-[396px] flex-col p-3.5"
              style={{ animation: "dash-tab-in 0.35s ease-out both" }}
            >
              <MockCard className="flex-1 px-3 pb-2 pt-0.5">
                <div
                  className="grid grid-cols-[1fr_48px_64px] gap-2 py-[9px] sm:grid-cols-[1fr_92px_48px_64px]"
                  style={{ fontFamily: PX, fontSize: 8, color: "rgb(51 33 13 / 55%)" }}
                >
                  <span>{t("mockColChat")}</span>
                  <span className="hidden sm:block">{t("mockColProject")}</span>
                  <span>{t("mockColPrompts")}</span>
                  <span className="text-right">≈ $</span>
                </div>
                {CHAT_ROWS.map((row) => (
                  <div
                    key={row.titleKey}
                    className="grid grid-cols-[1fr_48px_64px] items-center gap-2 py-[11px] sm:grid-cols-[1fr_92px_48px_64px]"
                    style={{ borderTop: "1px solid rgb(74 42 13 / 25%)" }}
                  >
                    <span
                      className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ fontSize: 12, color: "var(--dash-ink)" }}
                    >
                      <span className="h-[7px] w-[7px] shrink-0" style={{ background: row.dot }} />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {t(row.titleKey)}
                      </span>
                    </span>
                    <span
                      className="hidden sm:block"
                      style={{ fontFamily: PX, fontSize: 9, color: "rgb(51 33 13 / 65%)" }}
                    >
                      {row.project}
                    </span>
                    <span style={{ fontSize: 11, color: "rgb(51 33 13 / 75%)" }}>
                      {t("mockPrompts", { count: row.prompts })}
                    </span>
                    <span
                      className="text-right"
                      style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, color: "var(--dash-ink)" }}
                    >
                      {row.cost}
                    </span>
                  </div>
                ))}
              </MockCard>
              <div className="flex items-center justify-between px-0.5 pt-2.5">
                <span style={{ fontSize: 11, color: "rgb(51 33 13 / 60%)" }}>{t("mockPageInfo")}</span>
                <span
                  className="flex items-center gap-2"
                  style={{ fontFamily: PX, fontSize: 9, color: "var(--dash-ink)" }}
                >
                  <span
                    className="flex h-[18px] w-[18px] items-center justify-center"
                    style={{ border: "2px solid var(--dash-card-line)", background: "var(--dash-card)" }}
                    aria-hidden
                  >
                    ◂
                  </span>
                  {t("mockPageNum")}
                  <span
                    className="flex h-[18px] w-[18px] items-center justify-center"
                    style={{ border: "2px solid var(--dash-card-line)", background: "var(--dash-card)" }}
                    aria-hidden
                  >
                    ▸
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demo disclaimer */}
      <p
        className="mt-3 text-center"
        style={{ fontSize: 12, color: "var(--color-text-muted-dark)", opacity: 0.85 }}
      >
        {t("mockCaption")}
      </p>
    </div>
  );
}
