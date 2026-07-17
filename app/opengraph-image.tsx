import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Site-wide social share card (Open Graph + Twitter). At the app root so the served
// URL is locale-free (/opengraph-image) and lib/seo's OG_IMAGE can point at it.
// Generated at build time by next/og (Satori). Uses the default bundled font — all text
// is Latin, and pulling the brand pixel face would mean fetching a font over the network
// during the build. Embeds the pixel tree from disk as a data URL (Satori cannot fetch
// remote images).
//
// The composition mirrors the home-page hero — day sky, clouds, tree, wordmark beneath —
// and it is stacked VERTICALLY on purpose. Google crops this card to a square for the
// search thumbnail, and the previous side-by-side layout cropped down to a lone tree on a
// blank cream field: no sky, no brand, no name. A centred column survives that crop with
// the tree, the sky and "Token Forest" all still in frame.
export const runtime = "nodejs";
export const alt = "Token Forest — grow a pixel tree from your Claude Code & Codex tokens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const treeSrc = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/sprites/AppleTree_8.png"),
).toString("base64")}`;

/**
 * A hero cloud — the exact CloudSvg geometry from components/hero.tsx, shipped as an SVG
 * data URI rather than rebuilt from divs.
 *
 * The div version looked wrong and the reason is worth keeping: Satori applies `opacity`
 * to each element individually, not to the group. Three translucent white shapes therefore
 * accumulate alpha where they overlap, and the cloud renders as a pile of discs with every
 * seam showing. Putting `opacity` on the <svg> root composites the whole silhouette once.
 */
function cloudUri(opacity: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 48" fill="#ffffff" opacity="${opacity}">` +
    `<ellipse cx="60" cy="32" rx="52" ry="18"/>` +
    `<ellipse cx="36" cy="26" rx="28" ry="18"/>` +
    `<ellipse cx="82" cy="24" rx="26" ry="16"/>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function Cloud({
  left,
  top,
  width,
  opacity,
}: {
  left: number;
  top: number;
  width: number;
  opacity: number;
}) {
  return (
    <img
      src={cloudUri(opacity)}
      width={width}
      height={Math.round((width * 48) / 120)}
      style={{ position: "absolute", left, top }}
      alt=""
    />
  );
}

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        position: "relative",
        // The hero's day sky, same three stops (globals.css --color-sky-day-*).
        backgroundImage: "linear-gradient(180deg, #8fb8d0 0%, #c4dce8 52%, #e8d5a8 100%)",
      }}
    >
      <Cloud left={92} top={68} width={190} opacity={0.55} />
      <Cloud left={905} top={44} width={150} opacity={0.4} />
      <Cloud left={392} top={112} width={120} opacity={0.35} />

      {/* Centred column: tree, then the wordmark beneath it — the hero's own stacking. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          paddingBottom: 26,
        }}
      >
        <img src={treeSrc} width={252} height={274} style={{ objectFit: "contain" }} alt="" />

        <div
          style={{
            display: "flex",
            marginTop: 14,
            fontSize: 74,
            fontWeight: 800,
            color: "#2f6b39",
            letterSpacing: "-1px",
            lineHeight: 1.05,
          }}
        >
          Token Forest
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 16,
            maxWidth: 600,
            textAlign: "center",
            fontSize: 30,
            color: "#3f3222",
            lineHeight: 1.3,
          }}
        >
          Grow a pixel tree from the Claude Code &amp; Codex tokens you spend.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 14,
            fontSize: 24,
            color: "#6b5236",
          }}
        >
          Windows · macOS · Free · Local-first
        </div>
      </div>

      {/* ground */}
      <div style={{ display: "flex", width: "100%", height: 44, backgroundColor: "#3a7d44" }} />
    </div>,
    { ...size },
  );
}
