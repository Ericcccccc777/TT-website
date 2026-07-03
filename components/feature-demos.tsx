import Image from "next/image";

/**
 * §features live demo screens — each feature card gets a small inset "screen"
 * that demonstrates the feature instead of just describing it:
 *
 *   1 realtime  — a mini activity monitor: orange (Claude) / green (Codex)
 *                 bars blip upward, a token bubble drifts up; hover runs 3×
 *   2 growth    — an 8-frame filmstrip; idle steps I→VIII; hovering a column
 *                 scrubs the big preview through the stages (pure CSS :has)
 *   3 privacy   — an "offline mode" toggle; hovering tries to flip it and it
 *                 snaps back with a red ✕ stamp: the app refuses to go online
 *   4 taskbar   — a mini desktop taskbar with a breathing stage-4 tree pet
 *   5 lb        — a 3-row micro-leaderboard whose top rows swap ranks; hover
 *                 slides in a "YOU · ???" row
 *
 * Server components — all motion is CSS keyframes (globals.css §FEATURE DEMO
 * SCREENS); the grid is wrapped in <InViewGate> so everything freezes via
 * `.scene-paused` when offscreen. Screens are decorative (aria-hidden); the
 * global reduced-motion kill leaves each in a sensible static frame.
 */

// ── Shared screen bezel ────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="demo-screen relative mb-1 h-[72px] overflow-hidden"
      style={{
        border: "1px solid var(--color-surface-ui)",
        borderRadius: "var(--radius-pixel)",
        background: "var(--color-surface-deepest)",
      }}
      aria-hidden
    >
      {children}
      {/* scanlines */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgb(255 255 255 / 4%) 0 1px, transparent 1px 3px)",
        }}
      />
    </div>
  );
}

// ── 1. Realtime activity monitor ───────────────────────────────────────────────

// (height %, duration s, delay s, claude|codex)
const BARS: Array<[number, number, number, "c" | "x"]> = [
  [34, 2.2, 0.0, "c"],
  [55, 3.1, 0.4, "x"],
  [42, 2.6, 0.9, "c"],
  [70, 3.6, 0.2, "c"],
  [30, 2.9, 1.3, "x"],
  [62, 2.4, 0.6, "x"],
  [48, 3.3, 1.7, "c"],
  [76, 2.7, 1.0, "x"],
  [38, 3.0, 2.1, "c"],
  [58, 2.5, 1.5, "x"],
  [45, 3.4, 0.3, "c"],
  [66, 2.8, 1.9, "x"],
];

export function RealtimeDemo() {
  return (
    <Screen>
      <div className="absolute inset-x-2 bottom-1.5 top-3 flex items-end gap-[3px]">
        {BARS.map(([h, dur, delay, kind], i) => (
          <span
            key={i}
            className="flex-1"
            style={{
              height: `${h}%`,
              background: kind === "c" ? "var(--color-bubble-claude)" : "var(--color-bubble-codex)",
              opacity: 0.85,
              transformOrigin: "bottom",
              animation: `bar-blip calc(${dur}s * var(--demo-speed, 1)) steps(2, end) ${delay}s infinite alternate`,
            }}
          />
        ))}
      </div>
      {/* a token bubble drifting off the feed */}
      <span
        className="absolute left-[64%] top-2 h-2 w-2 rounded-full"
        style={{
          background: "var(--color-bubble-claude)",
          border: "1px solid rgb(255 255 255 / 62%)",
          animation: "bubble-linger calc(5.5s * var(--demo-speed, 1)) ease-out 1s infinite",
        }}
      />
      <span
        className="absolute left-2 top-1.5"
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "0.45rem",
          color: "var(--color-text-muted-dark)",
          lineHeight: 1,
        }}
      >
        claude ▮ codex ▮
      </span>
    </Screen>
  );
}

// ── 2. Growth filmstrip with hover-scrub ───────────────────────────────────────

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

export function GrowthFilmstripDemo() {
  return (
    <Screen>
      <div className="film-scrub absolute inset-0">
        {/* big preview: 8 stacked frames; idle cycle steps through them */}
        <div className="absolute bottom-1.5 left-3 h-[52px] w-[52px]">
          {ROMAN.map((_, i) => (
            <span
              key={i}
              className={`film-frame absolute inset-0 film-frame-${i + 1}`}
              style={{ animationDelay: `${i * 0.8}s` }}
            >
              <Image
                src={`/sprites/AppleTree_${i + 1}.png`}
                alt=""
                width={52}
                height={52}
                className="pixelated"
                style={{ width: 52, height: 52, objectFit: "contain", objectPosition: "50% 100%" }}
              />
            </span>
          ))}
        </div>

        {/* filmstrip: 8 columns of mini sprite + numeral */}
        <div className="absolute bottom-1.5 left-[72px] right-2 top-2 grid grid-cols-8 items-end gap-[2px]">
          {ROMAN.map((numeral, i) => (
            <span
              key={numeral}
              className={`film-cell film-cell-${i + 1} flex flex-col items-center gap-0.5`}
            >
              <Image
                src={`/sprites/AppleTree_${i + 1}.png`}
                alt=""
                width={18}
                height={18}
                className="pixelated"
                style={{ width: 18, height: 18, objectFit: "contain", objectPosition: "50% 100%" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.4rem",
                  color: "var(--color-text-muted-dark)",
                  lineHeight: 1,
                }}
              >
                {numeral}
              </span>
            </span>
          ))}
        </div>

        {/* invisible hover zones over the filmstrip area (scrub) */}
        <div className="absolute bottom-0 left-[64px] right-0 top-0 z-10 grid grid-cols-8">
          {ROMAN.map((numeral, i) => (
            <span key={numeral} className={`film-zone film-zone-${i + 1}`} />
          ))}
        </div>
      </div>
    </Screen>
  );
}

// ── 3. Offline toggle that refuses to switch ───────────────────────────────────

function PixelCloudOff() {
  return (
    <svg viewBox="0 0 22 14" width={40} shapeRendering="crispEdges" aria-hidden>
      <g fill="#5a6b5e">
        <rect x="4" y="4" width="14" height="4" />
        <rect x="6" y="2" width="5" height="2" />
        <rect x="12" y="1" width="5" height="3" />
        <rect x="2" y="6" width="18" height="4" />
      </g>
      {/* strike */}
      <g fill="#c75c5c">
        <rect x="2" y="11" width="3" height="2" />
        <rect x="5" y="9" width="3" height="2" />
        <rect x="8" y="7" width="3" height="2" />
        <rect x="11" y="5" width="3" height="2" />
        <rect x="14" y="3" width="3" height="2" />
        <rect x="17" y="1" width="3" height="2" />
      </g>
    </svg>
  );
}

export function OfflineToggleDemo({ offlineOn }: { offlineOn: string }) {
  return (
    <Screen>
      <span className="absolute left-3 top-1/2 -translate-y-1/2">
        <PixelCloudOff />
      </span>

      {/* toggle */}
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.5rem",
            color: "var(--color-leaf-light)",
            lineHeight: 1,
          }}
        >
          {offlineOn} ON
        </span>
        <span
          className="relative inline-block h-[14px] w-[28px]"
          style={{
            border: "1px solid var(--color-leaf-light)",
            borderRadius: "var(--radius-pixel)",
            background: "var(--color-surface-panel)",
          }}
        >
          <span
            className="toggle-knob absolute right-[1px] top-[1px] h-[10px] w-[10px]"
            style={{ background: "var(--color-leaf-light)" }}
          />
        </span>
        {/* refusal stamp */}
        <span
          className="toggle-x absolute -left-5 top-1/2 -translate-y-1/2"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.9rem",
            color: "#c75c5c",
            opacity: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </span>
      </div>

      {/* modem light */}
      <span className="absolute bottom-1.5 left-3 flex items-center gap-1">
        <span
          className="live-dot inline-block h-[5px] w-[5px]"
          style={{ background: "var(--color-bubble-codex)" }}
        />
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "0.45rem",
            color: "var(--color-text-muted-dark)",
            lineHeight: 1,
          }}
        >
          0 B ↑
        </span>
      </span>
    </Screen>
  );
}

// ── 4. Taskbar pet ─────────────────────────────────────────────────────────────

export function TaskbarDemo() {
  return (
    <Screen>
      {/* desktop */}
      <span
        className="absolute left-3 top-2 h-6 w-10 opacity-60"
        style={{
          border: "1px solid var(--color-surface-panel)",
          borderRadius: "var(--radius-pixel)",
        }}
      />
      <span
        className="absolute left-16 top-4 h-5 w-8 opacity-40"
        style={{
          border: "1px solid var(--color-surface-panel)",
          borderRadius: "var(--radius-pixel)",
        }}
      />

      {/* taskbar */}
      <span
        className="absolute inset-x-0 bottom-0 h-4"
        style={{
          background: "var(--color-surface-ui)",
          borderTop: "1px solid var(--color-surface-panel)",
        }}
      >
        <span
          className="absolute left-2 top-1 h-2 w-6"
          style={{ background: "var(--color-surface-panel)" }}
        />
        <span
          className="absolute left-9 top-1 h-2 w-6"
          style={{ background: "var(--color-surface-panel)" }}
        />
        <span
          className="absolute left-16 top-1 h-2 w-6"
          style={{ background: "var(--color-surface-panel)" }}
        />
      </span>

      {/* the pet tree, standing on the taskbar */}
      <span
        className="taskbar-shake absolute bottom-4 right-6 inline-block"
        style={{ transformOrigin: "bottom center" }}
      >
        <span className="animate-tree-breathe inline-block">
          <Image
            src="/sprites/AppleTree_4.png"
            alt=""
            width={34}
            height={34}
            className="pixelated"
            style={{ width: 34, height: 34, objectFit: "contain", objectPosition: "50% 100%" }}
          />
        </span>
      </span>

      {/* an occasional token bubble above the pet */}
      <span
        className="absolute bottom-[46px] right-7 h-2 w-2 rounded-full"
        style={{
          background: "var(--color-bubble-codex)",
          border: "1px solid rgb(255 255 255 / 62%)",
          animation: "bubble-linger 7s ease-out 2s infinite",
        }}
      />
    </Screen>
  );
}

// ── 5. Micro leaderboard ───────────────────────────────────────────────────────

const LB_ROWS = [
  { rank: "01", name: "devwanderer", w: "82%" },
  { rank: "02", name: "nightcoder_x", w: "64%" },
  { rank: "03", name: "token_farmer", w: "47%" },
] as const;

export function LeaderboardDemo() {
  return (
    <Screen>
      <div className="absolute inset-x-3 top-2 flex flex-col gap-[5px]">
        {LB_ROWS.map((row, i) => (
          <div
            key={row.rank}
            className={`flex items-center gap-1.5 ${i === 0 ? "lb-row-first" : ""} ${i === 1 ? "lb-row-second" : ""}`}
          >
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.45rem",
                color: i === 0 ? "var(--color-accent-gold)" : "var(--color-text-muted-dark)",
                lineHeight: 1,
              }}
            >
              {row.rank}
            </span>
            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "0.45rem",
                color: "var(--color-text-cream)",
                lineHeight: 1,
              }}
            >
              {row.name}
            </span>
            {i === 0 && (
              <span
                className="lb-arrow"
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.45rem",
                  color: "var(--color-leaf-light)",
                  opacity: 0,
                  lineHeight: 1,
                }}
              >
                ▲
              </span>
            )}
            <span
              className="ml-auto h-[5px]"
              style={{
                width: row.w,
                maxWidth: "40%",
                background: "var(--color-leaf-deep)",
                opacity: 0.7,
              }}
            />
          </div>
        ))}

        {/* YOU row slides in on hover */}
        <div className="lb-you flex items-center gap-1.5" style={{ opacity: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.45rem",
              color: "var(--color-leaf-light)",
              lineHeight: 1,
            }}
          >
            ??
          </span>
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.45rem",
              color: "var(--color-leaf-light)",
              lineHeight: 1,
            }}
          >
            YOU · ???
          </span>
          <span
            className="animate-cursor-blink"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.45rem",
              color: "var(--color-leaf-light)",
              lineHeight: 1,
            }}
          >
            ▌
          </span>
        </div>
      </div>
    </Screen>
  );
}
