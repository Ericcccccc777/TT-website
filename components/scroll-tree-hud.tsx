import Image from "next/image";

/**
 * Scroll-progress tree HUD — a fixed pixel chip (bottom-right) whose tree
 * sprite grows stage 1→8 as the page scrolls, with a scrubbing XP bar and a
 * MAX ✦ blip at the bottom of the page. Pure CSS scroll-driven animation
 * (globals.css §SCROLL TREE HUD): zero JS, shown only ≥640px in browsers
 * supporting `animation-timeline: scroll()`, hidden under reduced motion.
 */

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function ScrollTreeHud() {
  return (
    <div className="scroll-hud pointer-events-none fixed bottom-4 right-4 z-40" aria-hidden>
      <div
        className="p-1"
        style={{
          border: "var(--border-pixel)",
          borderRadius: "var(--radius-pixel)",
          background: "var(--color-surface-card)",
          boxShadow: "var(--shadow-pixel)",
        }}
      >
        {/* sprite viewport: a vertical strip of the 8 stages, scrubbed by scroll */}
        <div className="relative h-11 w-11 overflow-hidden">
          <div className="hud-strip">
            {STAGES.map((s) => (
              <div key={s} className="flex h-11 w-11 items-end justify-center">
                <Image
                  src={`/sprites/AppleTree_${s}.png`}
                  alt=""
                  width={40}
                  height={40}
                  className="pixelated"
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: "contain",
                    objectPosition: "50% 100%",
                  }}
                />
              </div>
            ))}
          </div>
          <span
            className="hud-max absolute inset-x-0 top-0 text-center"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "0.4rem",
              color: "var(--color-leaf-deep)",
              lineHeight: 1,
              opacity: 0,
            }}
          >
            MAX✦
          </span>
        </div>

        {/* XP bar = page scroll progress */}
        <div
          className="relative mt-1 h-[6px] overflow-hidden"
          style={{
            border: "1px solid var(--color-soil)",
            borderRadius: "var(--radius-pixel)",
            background: "var(--color-surface-parchment)",
          }}
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
        </div>
      </div>
    </div>
  );
}
