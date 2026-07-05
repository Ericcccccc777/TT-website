"use client";

import { useEffect, useState } from "react";

/**
 * Themed pixel-art backdrop behind the showcase tree — one scene per skin:
 *   apple  → plain green day: drifting clouds, breathing sun, distant hills
 *   cherry → ukiyo-e dawn: Mt. Fuji, vermillion sun disc, mist bars, petals
 *   cactus → western desert: banded sunset, mesas, dust wisps, tumbleweeds
 *            rolling through at irregular intervals
 *
 * All three scenes stay mounted and crossfade on skin switch; inactive ones
 * get `.scene-paused` (globals.css) so their animations stop costing anything.
 * Everything animates via transform/opacity only. Purely decorative
 * (aria-hidden); under prefers-reduced-motion every element renders static
 * and no tumbleweeds spawn.
 */

/** Height (px) of the ground strip the scenes sit behind — the horizon line. */
const GROUND_H = 40;

interface SceneProps {
  active: boolean;
  prefersReduced: boolean;
}

export function TreeScene({ skin, prefersReduced }: { skin: string; prefersReduced: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AppleScene active={skin === "apple"} prefersReduced={prefersReduced} />
      <CherryScene active={skin === "cherry"} prefersReduced={prefersReduced} />
      <CactusScene active={skin === "cactus"} prefersReduced={prefersReduced} />
      <ChristmasScene active={skin === "christmas"} prefersReduced={prefersReduced} />
    </div>
  );
}

// ── Shared scene shell ─────────────────────────────────────────────────────────

function SceneLayer({
  active,
  sky,
  children,
}: {
  active: boolean;
  sky: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ${
        active ? "opacity-100" : "scene-paused opacity-0"
      }`}
      style={{ background: sky }}
    >
      {children}
    </div>
  );
}

// ── Pixel sprites (inline SVG, crisp edges) ────────────────────────────────────

function PixelCloud({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 22 10" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#ffffff">
        <rect x="4" y="3" width="14" height="4" />
        <rect x="6" y="1" width="5" height="2" />
        <rect x="12" y="0" width="5" height="3" />
        <rect x="2" y="5" width="18" height="3" />
      </g>
      <rect x="2" y="8" width="18" height="1" fill="#dfe8ea" />
    </svg>
  );
}

/** Flat stratus variant — mixed with PixelCloud for a livelier sky. */
function PixelCloudFlat({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 26 8" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#ffffff">
        <rect x="2" y="3" width="22" height="3" />
        <rect x="5" y="1" width="7" height="2" />
        <rect x="15" y="2" width="6" height="1" />
      </g>
      <rect x="2" y="6" width="22" height="1" fill="#dfe8ea" />
    </svg>
  );
}

/** 8-bit sun with rays (apple day scene). */
function PixelSun({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 16 16" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#e8ba60">
        <rect x="5" y="4" width="6" height="8" />
        <rect x="4" y="5" width="8" height="6" />
        <rect x="6" y="3" width="4" height="10" />
      </g>
      <rect x="6" y="5" width="3" height="3" fill="#f5d78a" />
      <g fill="#e8ba60">
        {/* rays: N S E W + diagonals */}
        <rect x="7" y="0" width="2" height="2" />
        <rect x="7" y="14" width="2" height="2" />
        <rect x="0" y="7" width="2" height="2" />
        <rect x="14" y="7" width="2" height="2" />
        <rect x="2" y="2" width="2" height="2" />
        <rect x="12" y="2" width="2" height="2" />
        <rect x="2" y="12" width="2" height="2" />
        <rect x="12" y="12" width="2" height="2" />
      </g>
    </svg>
  );
}

/** Distant rolling hills (apple day scene) — panoramic stretch to frame width. */
function PixelHills() {
  return (
    <svg
      viewBox="0 0 80 14"
      width="100%"
      height={52}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* far hill (hazier green) */}
      <g fill="#79b183">
        <rect x="6" y="6" width="34" height="8" />
        <rect x="10" y="3" width="24" height="4" />
        <rect x="16" y="1" width="12" height="3" />
      </g>
      {/* near hill */}
      <g fill="#4f9959">
        <rect x="38" y="8" width="42" height="6" />
        <rect x="44" y="5" width="30" height="4" />
        <rect x="52" y="3" width="14" height="3" />
      </g>
    </svg>
  );
}

/** Mt. Fuji with stepped snow cap (cherry ukiyo-e scene) — wide, hazy, distant.
 *  Fills its wrapper's width (set a %-width on the positioned wrapper). */
function PixelFuji() {
  return (
    <svg
      viewBox="0 0 80 30"
      width="100%"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* hazy blue-grey slopes, gently widening steps */}
      <g fill="#7484a6">
        <rect x="34" y="4" width="12" height="3" />
        <rect x="31" y="7" width="18" height="3" />
        <rect x="27" y="10" width="26" height="3" />
        <rect x="23" y="13" width="34" height="3" />
        <rect x="18" y="16" width="44" height="3" />
        <rect x="13" y="19" width="54" height="3" />
        <rect x="7" y="22" width="66" height="3" />
        <rect x="0" y="25" width="80" height="5" />
      </g>
      {/* snow cap inset inside the silhouette so it contrasts against the slope */}
      <g fill="#f6f1e6">
        <rect x="36" y="5" width="8" height="2" />
        <rect x="33" y="7" width="14" height="3" />
        <rect x="30" y="10" width="7" height="2" />
        <rect x="39" y="10" width="9" height="3" />
        <rect x="33" y="12" width="5" height="2" />
        <rect x="44" y="13" width="4" height="2" />
      </g>
    </svg>
  );
}

/** Flat vermillion sun disc (cherry ukiyo-e scene). */
function PixelRedSun({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 12 12" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#d97757">
        <rect x="3" y="1" width="6" height="10" />
        <rect x="1" y="3" width="10" height="6" />
        <rect x="2" y="2" width="8" height="8" />
      </g>
    </svg>
  );
}

/** Setting sun with horizontal bands (cactus western scene). */
function PixelDesertSun({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 20 20" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#f0c268">
        <rect x="6" y="1" width="8" height="18" />
        <rect x="3" y="4" width="14" height="12" />
        <rect x="1" y="6" width="18" height="8" />
      </g>
      <rect x="8" y="3" width="5" height="4" fill="#f8dc96" />
      {/* retro banding slits */}
      <rect x="1" y="12" width="18" height="1" fill="#e09a52" />
      <rect x="1" y="15" width="18" height="2" fill="#e09a52" />
    </svg>
  );
}

/** Flat-top mesa silhouette (cactus western scene). Fills its wrapper's width. */
function PixelMesa({ tone }: { tone: string }) {
  return (
    <svg
      viewBox="0 0 40 14"
      width="100%"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: "block" }}
    >
      <g fill={tone}>
        <rect x="8" y="2" width="22" height="4" />
        <rect x="5" y="6" width="28" height="4" />
        <rect x="2" y="10" width="36" height="4" />
      </g>
    </svg>
  );
}

/**
 * Tumbleweed (cactus western scene) — modelled on a real dried Salsola ball:
 * a loose sphere of thin tangled twigs in straw tones, broken outline, twigs
 * poking out, plenty of air gaps.
 */
function PixelTumbleweed() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* broken outer ring, light straw */}
      <g fill="#c9a565">
        <rect x="6" y="0" width="4" height="1" />
        <rect x="10" y="1" width="2" height="1" />
        <rect x="12" y="2" width="1" height="2" />
        <rect x="13" y="4" width="1" height="3" />
        <rect x="14" y="8" width="1" height="2" />
        <rect x="13" y="10" width="1" height="2" />
        <rect x="11" y="12" width="2" height="1" />
        <rect x="6" y="13" width="4" height="1" />
        <rect x="4" y="12" width="2" height="1" />
        <rect x="2" y="10" width="1" height="2" />
        <rect x="1" y="6" width="1" height="3" />
        <rect x="2" y="3" width="1" height="2" />
        <rect x="4" y="1" width="2" height="1" />
      </g>
      {/* twigs poking out of the silhouette */}
      <g fill="#a8834e">
        <rect x="12" y="0" width="1" height="1" />
        <rect x="15" y="6" width="1" height="1" />
        <rect x="14" y="12" width="2" height="1" />
        <rect x="3" y="14" width="1" height="1" />
        <rect x="8" y="14" width="1" height="2" />
        <rect x="0" y="9" width="1" height="1" />
        <rect x="0" y="4" width="1" height="1" />
        <rect x="3" y="0" width="1" height="1" />
      </g>
      {/* inner tangle: criss-crossing strands with air gaps */}
      <g fill="#a8834e">
        <rect x="4" y="4" width="1" height="1" />
        <rect x="5" y="5" width="1" height="1" />
        <rect x="6" y="6" width="1" height="1" />
        <rect x="10" y="3" width="1" height="1" />
        <rect x="9" y="4" width="1" height="1" />
        <rect x="8" y="5" width="1" height="1" />
        <rect x="11" y="9" width="1" height="1" />
        <rect x="10" y="8" width="1" height="1" />
        <rect x="9" y="7" width="1" height="1" />
        <rect x="5" y="10" width="1" height="1" />
        <rect x="6" y="9" width="1" height="1" />
        <rect x="7" y="8" width="1" height="1" />
        <rect x="12" y="7" width="1" height="1" />
        <rect x="4" y="7" width="2" height="1" />
        <rect x="9" y="11" width="2" height="1" />
        <rect x="6" y="2" width="1" height="2" />
        <rect x="11" y="5" width="1" height="1" />
        <rect x="3" y="9" width="1" height="1" />
      </g>
      {/* sparse dark knots (depth) */}
      <g fill="#7a5a34">
        <rect x="7" y="6" width="2" height="2" />
        <rect x="5" y="12" width="2" height="1" />
        <rect x="12" y="10" width="1" height="1" />
        <rect x="3" y="5" width="1" height="1" />
        <rect x="10" y="1" width="1" height="1" />
      </g>
      {/* sun-bleached highlights */}
      <g fill="#e0c084">
        <rect x="7" y="1" width="2" height="1" />
        <rect x="2" y="7" width="1" height="1" />
        <rect x="13" y="8" width="1" height="1" />
        <rect x="7" y="12" width="1" height="1" />
      </g>
    </svg>
  );
}

/** Wind-blown newspaper: open double page with text lines (cactus scene). */
function PixelNewspaper() {
  return (
    <svg
      viewBox="0 0 12 10"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* two splayed pages — sun-yellowed old paper */}
      <rect x="0" y="2" width="6" height="7" fill="#e6d5a8" />
      <rect x="5" y="0" width="7" height="8" fill="#efe2ba" />
      {/* centre crease */}
      <rect x="5" y="0" width="1" height="8" fill="#bfa87e" />
      {/* age stains */}
      <g fill="#d8c290">
        <rect x="1" y="7" width="2" height="1" />
        <rect x="9" y="1" width="2" height="1" />
        <rect x="3" y="3" width="1" height="1" />
      </g>
      {/* text lines */}
      <g fill="#8f8266">
        <rect x="1" y="4" width="3" height="1" />
        <rect x="1" y="6" width="3" height="1" />
        <rect x="7" y="2" width="4" height="1" />
        <rect x="7" y="4" width="4" height="1" />
        <rect x="7" y="6" width="3" height="1" />
      </g>
    </svg>
  );
}

/** Cherry blossom petal — notched top (the sakura tell), shaded for a bit of
 *  form so the face-flip reads. Three tone sets for depth variety. */
function PixelPetal({ mid, dark, hi }: { mid: string; dark: string; hi: string }) {
  return (
    <svg
      viewBox="0 0 8 7"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: "block" }}
    >
      <g fill={mid}>
        <rect x="1" y="0" width="2" height="1" />
        <rect x="5" y="0" width="2" height="1" />
        <rect x="0" y="1" width="8" height="2" />
        <rect x="1" y="3" width="6" height="2" />
        <rect x="2" y="5" width="4" height="1" />
        <rect x="3" y="6" width="2" height="1" />
      </g>
      {/* underside shading */}
      <g fill={dark}>
        <rect x="1" y="4" width="6" height="1" />
        <rect x="2" y="5" width="4" height="1" />
        <rect x="6" y="1" width="1" height="2" />
      </g>
      {/* top-lit highlight around the notch */}
      <g fill={hi}>
        <rect x="1" y="1" width="2" height="1" />
        <rect x="5" y="1" width="1" height="1" />
      </g>
    </svg>
  );
}

const PETAL_TONES = [
  { mid: "#f0a8c2", dark: "#dd82a2", hi: "#f9ccdc" },
  { mid: "#f6c2d4", dark: "#e6a0b8", hi: "#fddce8" },
  { mid: "#e892ae", dark: "#d2708f", hi: "#f4b2ca" },
] as const;

// ── Apple: plain green day ─────────────────────────────────────────────────────

const CLOUDS = [
  { flat: false, top: 16, width: 70, dur: 78, delay: -12, opacity: 0.95, staticX: 70 },
  { flat: true, top: 34, width: 52, dur: 118, delay: -84, opacity: 0.55, staticX: 500 },
  { flat: false, top: 58, width: 46, dur: 108, delay: -62, opacity: 0.8, staticX: 400 },
  { flat: true, top: 84, width: 64, dur: 96, delay: -20, opacity: 0.7, staticX: 250 },
  { flat: false, top: 106, width: 42, dur: 124, delay: -100, opacity: 0.5, staticX: 540 },
  { flat: true, top: 130, width: 36, dur: 132, delay: -48, opacity: 0.4, staticX: 150 },
] as const;

function AppleScene({ active, prefersReduced }: SceneProps) {
  return (
    <SceneLayer
      active={active}
      sky="linear-gradient(180deg, var(--color-sky-day-top) 0%, var(--color-sky-day-mid) 55%, var(--color-sky-day-horizon) 100%)"
    >
      <div
        className="absolute"
        style={{
          top: 16,
          right: "5%",
          animation: prefersReduced ? undefined : "scene-sun-pulse 5s ease-in-out infinite",
        }}
      >
        <PixelSun width={46} />
      </div>
      {CLOUDS.map((c) => (
        <div
          key={c.top}
          className="absolute left-0"
          style={{
            top: c.top,
            opacity: c.opacity,
            ...(prefersReduced
              ? { transform: `translateX(${c.staticX}px)` }
              : {
                  animation: `scene-cloud-drift ${c.dur}s linear infinite`,
                  animationDelay: `${c.delay}s`,
                }),
          }}
        >
          {c.flat ? <PixelCloudFlat width={c.width} /> : <PixelCloud width={c.width} />}
        </div>
      ))}
      <div className="absolute inset-x-0" style={{ bottom: GROUND_H - 2 }}>
        <PixelHills />
      </div>
    </SceneLayer>
  );
}

// ── Cherry: ukiyo-e dawn ───────────────────────────────────────────────────────

// left = spawn column; fall = descent seconds; driftV/spinV pick which
// horizontal-drift + flip keyframe set; tone indexes PETAL_TONES. drift and
// spin run at fractions of `fall` (out of phase) so no two petals repeat.
const PETALS = [
  { left: "6%", size: 8, fall: 8.5, delay: -1, driftV: 1, spinV: 2, tone: 0 },
  { left: "17%", size: 7, fall: 11, delay: -6, driftV: 3, spinV: 1, tone: 1 },
  { left: "29%", size: 9, fall: 9.5, delay: -3.5, driftV: 2, spinV: 3, tone: 2 },
  { left: "40%", size: 7, fall: 12.5, delay: -9, driftV: 1, spinV: 1, tone: 0 },
  { left: "51%", size: 8, fall: 10, delay: -2, driftV: 3, spinV: 2, tone: 1 },
  { left: "62%", size: 7, fall: 13, delay: -11, driftV: 2, spinV: 3, tone: 2 },
  { left: "73%", size: 9, fall: 9, delay: -5, driftV: 1, spinV: 1, tone: 0 },
  { left: "84%", size: 7, fall: 11.5, delay: -7.5, driftV: 3, spinV: 2, tone: 1 },
  { left: "93%", size: 8, fall: 10.5, delay: -0.5, driftV: 2, spinV: 3, tone: 0 },
] as const;

const MISTS = [
  { top: 84, left: "58%", width: 110, dur: 12, delay: -3 },
  { top: 118, left: "7%", width: 96, dur: 10, delay: 0 },
  { top: 156, left: "72%", width: 76, dur: 13, delay: -5 },
] as const;

function CherryScene({ active, prefersReduced }: SceneProps) {
  return (
    <SceneLayer
      active={active}
      sky="linear-gradient(180deg, #f2d8dc 0%, #f9ece2 55%, #f3e0c8 100%)"
    >
      <div className="absolute" style={{ top: 20, right: "6%" }}>
        <PixelRedSun width={36} />
      </div>
      {/* distant Fuji on the left flank of the widescreen frame */}
      <div className="absolute" style={{ bottom: GROUND_H - 3, left: "3%", width: "31%" }}>
        <PixelFuji />
      </div>
      {MISTS.map((m) => (
        <div
          key={m.top}
          className="absolute"
          style={{
            top: m.top,
            left: m.left,
            width: m.width,
            height: 6,
            borderRadius: 3,
            background: "rgb(250 245 234 / 78%)",
            animation: prefersReduced
              ? undefined
              : `scene-mist-sway ${m.dur}s ease-in-out infinite`,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}
      {!prefersReduced &&
        PETALS.map((p) => (
          // Three out-of-phase layers: fall (Y) ▸ drift (X) ▸ spin+flip (sprite)
          <div
            key={p.left}
            className="absolute"
            style={{
              top: 0,
              left: p.left,
              animation: `scene-petal-fall ${p.fall}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          >
            <div
              style={{
                animation: `scene-petal-drift-${p.driftV} ${(p.fall * 0.66).toFixed(1)}s ease-in-out infinite`,
              }}
            >
              <div
                style={{
                  width: p.size,
                  height: Math.round((p.size * 7) / 8),
                  animation: `scene-petal-spin-${p.spinV} ${(p.fall * 0.5).toFixed(1)}s linear infinite`,
                }}
              >
                <PixelPetal {...PETAL_TONES[p.tone]} />
              </div>
            </div>
          </div>
        ))}
    </SceneLayer>
  );
}

// ── Christmas: winter night ─────────────────────────────────────────────────────

/** Small pixel snowflake (reuses the petal fall/drift keyframes). */
function PixelSnow({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 5 5" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      <g fill="#ffffff">
        <rect x="2" y="0" width="1" height="5" />
        <rect x="0" y="2" width="5" height="1" />
        <rect x="1" y="1" width="1" height="1" />
        <rect x="3" y="1" width="1" height="1" />
        <rect x="1" y="3" width="1" height="1" />
        <rect x="3" y="3" width="1" height="1" />
      </g>
    </svg>
  );
}

/** Pale full moon with a couple of craters. */
function PixelMoon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      <g fill="#f2f0e0">
        <rect x="3" y="1" width="6" height="10" />
        <rect x="1" y="3" width="10" height="6" />
        <rect x="2" y="2" width="8" height="8" />
      </g>
      <g fill="#dcd8c0">
        <rect x="4" y="3" width="2" height="2" />
        <rect x="7" y="6" width="2" height="2" />
      </g>
    </svg>
  );
}

const SNOW = [
  { left: "5%", size: 5, fall: 9, delay: -1, driftV: 1 },
  { left: "13%", size: 4, fall: 12, delay: -5, driftV: 2 },
  { left: "22%", size: 6, fall: 10, delay: -3, driftV: 3 },
  { left: "31%", size: 4, fall: 13, delay: -8, driftV: 1 },
  { left: "40%", size: 5, fall: 9.5, delay: -2, driftV: 2 },
  { left: "49%", size: 4, fall: 11.5, delay: -6, driftV: 3 },
  { left: "58%", size: 6, fall: 10.5, delay: -4, driftV: 1 },
  { left: "67%", size: 4, fall: 12.5, delay: -9, driftV: 2 },
  { left: "76%", size: 5, fall: 9, delay: -1.5, driftV: 3 },
  { left: "85%", size: 4, fall: 13, delay: -7, driftV: 1 },
  { left: "92%", size: 6, fall: 10, delay: -3.5, driftV: 2 },
] as const;

const STARS = [
  { top: 22, left: "14%", o: 0.9 },
  { top: 40, left: "30%", o: 0.55 },
  { top: 30, left: "52%", o: 0.8 },
  { top: 54, left: "70%", o: 0.5 },
  { top: 18, left: "82%", o: 0.7 },
] as const;

function ChristmasScene({ active, prefersReduced }: SceneProps) {
  return (
    <SceneLayer
      active={active}
      sky="linear-gradient(180deg, #26365a 0%, #45608a 55%, #8ba7c4 100%)"
    >
      {/* moon top-right */}
      <div className="absolute" style={{ top: 18, right: "8%" }}>
        <PixelMoon size={30} />
      </div>
      {/* static stars (visible under reduced motion too) */}
      {STARS.map((s) => (
        <span
          key={s.left}
          className="absolute"
          style={{
            top: s.top,
            left: s.left,
            width: 2,
            height: 2,
            background: "#eef2ff",
            opacity: s.o,
          }}
          aria-hidden
        />
      ))}
      {/* settled snow along the horizon */}
      <div
        className="absolute inset-x-0"
        style={{ bottom: GROUND_H - 4, height: 8, background: "rgb(238 244 255 / 55%)" }}
        aria-hidden
      />
      {/* falling snow — reuses the petal fall (Y) + drift (X) keyframes */}
      {!prefersReduced &&
        SNOW.map((s) => (
          <div
            key={s.left}
            className="absolute"
            style={{
              top: 0,
              left: s.left,
              animation: `scene-petal-fall ${s.fall}s linear infinite`,
              animationDelay: `${s.delay}s`,
            }}
          >
            <div
              style={{
                animation: `scene-petal-drift-${s.driftV} ${(s.fall * 0.66).toFixed(1)}s ease-in-out infinite`,
              }}
            >
              <PixelSnow size={s.size} />
            </div>
          </div>
        ))}
    </SceneLayer>
  );
}

// ── Cactus: western desert ─────────────────────────────────────────────────────

interface Weed {
  id: number;
  dur: number; // crossing time (s)
  size: number; // px
  spinDur: number; // s per full roll cycle
  /** depth: rolls in front of the cactus (nearer, bigger, lower) or behind it */
  front: boolean;
  bottom: number; // ground offset px — nearer weeds sit lower on the ground
}

interface Paper {
  id: number;
  dur: number; // crossing time (s)
  size: number; // sheet width px
  bottom: number; // flight base height px (above the tumbleweeds)
  front: boolean;
  bobV: number; // which vertical-flight keyframe set (1–3)
  flipV: number; // which tumble keyframe set (1–3)
}

/** In front of every canvas layer (tree z2 / decos z5 / chest z6). */
const NEAR_DRIFTER_Z = 7;

const DUSTS = [
  { bottom: GROUND_H + 26, height: 3, width: 46, dur: 30, delay: -4 },
  { bottom: GROUND_H + 64, height: 2, width: 34, dur: 42, delay: -24 },
] as const;

function CactusScene({ active, prefersReduced }: SceneProps) {
  const [weeds, setWeeds] = useState<Weed[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);

  // Tumbleweed spawner: irregular gaps (2.2–11.7 s); each weed randomly rolls
  // in front of or behind the cactus — nearer ones bigger, lower and faster.
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
      const front = Math.random() < 0.5;
      const dur = (front ? 6.5 : 9) + Math.random() * 4.5;
      const weed: Weed = {
        id: Math.random(),
        dur,
        size: front ? 26 + Math.round(Math.random() * 14) : 15 + Math.round(Math.random() * 9),
        spinDur: 0.9 + Math.random() * 1.1,
        front,
        bottom: front ? GROUND_H - 18 + Math.random() * 8 : GROUND_H - 4 + Math.random() * 6,
      };
      setWeeds((ws) => [...ws.slice(-2), weed]);
      later(() => setWeeds((ws) => ws.filter((w) => w.id !== weed.id)), dur * 1000 + 300);
      later(spawn, 2200 + Math.random() * 9500);
    };
    later(spawn, 900 + Math.random() * 2600);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      setWeeds([]);
    };
  }, [active, prefersReduced]);

  // Newspaper spawner: rarer than the weeds, flies above them on the gusts.
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
      const dur = 6 + Math.random() * 3;
      const paper: Paper = {
        id: Math.random(),
        dur,
        size: 16 + Math.round(Math.random() * 10),
        bottom: GROUND_H + 100 + Math.random() * 110,
        front: Math.random() < 0.45,
        bobV: 1 + Math.floor(Math.random() * 3),
        flipV: 1 + Math.floor(Math.random() * 3),
      };
      setPapers((ps) => [...ps.slice(-1), paper]);
      later(() => setPapers((ps) => ps.filter((p) => p.id !== paper.id)), dur * 1000 + 300);
      later(spawn, 9000 + Math.random() * 17000);
    };
    later(spawn, 5000 + Math.random() * 9000);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      setPapers([]);
    };
  }, [active, prefersReduced]);

  return (
    <SceneLayer
      active={active}
      sky="linear-gradient(180deg, #e09a52 0%, #edc27e 48%, #ecd7a4 100%)"
    >
      {/* low sun on the horizon, in the gap between the left mesa and the tree */}
      <div className="absolute" style={{ bottom: GROUND_H + 2, left: "27%" }}>
        <PixelDesertSun width={62} />
      </div>
      <div className="absolute" style={{ bottom: GROUND_H - 2, left: "-2%", width: "24%" }}>
        <PixelMesa tone="#b0784a" />
      </div>
      <div className="absolute" style={{ bottom: GROUND_H - 2, right: "-3%", width: "30%" }}>
        <PixelMesa tone="#96603a" />
      </div>
      {DUSTS.map((d) => (
        <div
          key={d.bottom}
          className="absolute left-0"
          style={{
            bottom: d.bottom,
            width: d.width,
            height: d.height,
            borderRadius: 2,
            background: "#d9b878",
            opacity: prefersReduced ? 0.35 : undefined,
            ...(prefersReduced
              ? { transform: "translateX(140px)" }
              : {
                  animation: `scene-dust-drift ${d.dur}s linear infinite`,
                  animationDelay: `${d.delay}s`,
                }),
          }}
        />
      ))}
      {weeds.map((w) => (
        <div
          key={w.id}
          className="absolute left-0"
          style={{
            bottom: w.bottom,
            zIndex: w.front ? NEAR_DRIFTER_Z : undefined,
            opacity: w.front ? 1 : 0.85,
            animation: `scene-tumble-x ${w.dur}s linear 1 both`,
          }}
        >
          <div style={{ animation: `scene-tumble-hop ${w.dur}s ease-in-out 1 both` }}>
            <div
              style={{
                width: w.size,
                height: w.size,
                animation: `scene-tumble-spin ${w.spinDur}s linear infinite`,
              }}
            >
              <PixelTumbleweed />
            </div>
          </div>
        </div>
      ))}
      {papers.map((p) => (
        <div
          key={p.id}
          className="absolute left-0"
          style={{
            bottom: p.bottom,
            zIndex: p.front ? NEAR_DRIFTER_Z : undefined,
            opacity: 0.95,
            animation: `scene-paper-x ${p.dur}s linear 1 both`,
          }}
        >
          <div style={{ animation: `scene-paper-bob-${p.bobV} ${p.dur}s linear 1 both` }}>
            <div
              style={{
                width: p.size,
                height: Math.round((p.size * 10) / 12),
                animation: `scene-paper-flip-${p.flipV} ${p.dur}s linear 1 both`,
              }}
            >
              <PixelNewspaper />
            </div>
          </div>
        </div>
      ))}
    </SceneLayer>
  );
}
