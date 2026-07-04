// Twitter card reuses the same rendered card as Open Graph. The route config
// (runtime/alt/size/contentType) must be declared as static literals here —
// Next cannot statically parse re-exported config fields — so only the render
// function is imported.
import Image from "./opengraph-image";

export const runtime = "nodejs";
export const alt = "Token Forest — grow a pixel tree from your Claude Code & Codex tokens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default Image;
