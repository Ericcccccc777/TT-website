import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Site-wide social share card (Open Graph + Twitter). At the app root so the
// served URL is locale-free (/opengraph-image) and lib/seo's OG_IMAGE can point
// at it. Generated at build time by next/og (Satori). Uses the default bundled
// font — all text is Latin — and embeds the pixel tree from disk as a data URL
// (Satori cannot fetch remote images).
export const runtime = "nodejs";
export const alt = "Token Forest — grow a pixel tree from your Claude Code & Codex tokens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const treeSrc = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/sprites/AppleTree_8.png"),
).toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#faf5ea",
        position: "relative",
      }}
    >
      {/* sky band */}
      <div style={{ display: "flex", height: 96, backgroundColor: "#c4dce8" }} />

      {/* main content */}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
          padding: "0 96px",
        }}
      >
        <img src={treeSrc} width={300} height={326} style={{ objectFit: "contain" }} alt="" />
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 800,
              color: "#3a7d44",
              letterSpacing: "-1px",
              lineHeight: 1.05,
            }}
          >
            Token Forest
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 36,
              color: "#4a3b28",
              lineHeight: 1.3,
            }}
          >
            Grow a pixel tree from the Claude Code &amp; Codex tokens you spend.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 26,
              color: "#7a5a3a",
            }}
          >
            Windows · macOS · Free · Local-first
          </div>
        </div>
      </div>

      {/* ground strip */}
      <div style={{ display: "flex", height: 40, backgroundColor: "#3a7d44" }} />
    </div>,
    { ...size },
  );
}
