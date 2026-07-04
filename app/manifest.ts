import type { MetadataRoute } from "next";

// PWA-lite manifest, served at /manifest.webmanifest and auto-linked by Next.
// start_url is "/en" (not "/") because localePrefix:"always" 307-redirects "/".
// Colors come from the parchment/leaf palette in app/globals.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Token Forest",
    short_name: "Token Forest",
    description:
      "A cozy pixel-art desktop pet that grows a tree from your Claude Code and Codex tokens.",
    start_url: "/en",
    scope: "/",
    display: "standalone",
    background_color: "#faf5ea",
    theme_color: "#3a7d44",
    lang: "en",
    categories: ["productivity", "developer", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
