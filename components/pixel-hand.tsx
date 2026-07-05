/**
 * Tiny pixel-art pointing hand (10×12 grid, crisp edges) — used by the
 * dashboard right-click demos on the homepage and the /dashboard How section.
 * Outline/fill colors default to the dark-screen variant.
 */
export function PixelHand({
  width = 11,
  outline = "#1e2521",
  fill = "#faf5ea",
}: {
  width?: number;
  outline?: string;
  fill?: string;
}) {
  return (
    <svg viewBox="0 0 10 12" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill={outline}>
        <rect x="3" y="0" width="2" height="1" />
        <rect x="2" y="1" width="1" height="4" />
        <rect x="5" y="1" width="1" height="3" />
        <rect x="6" y="4" width="3" height="1" />
        <rect x="9" y="5" width="1" height="3" />
        <rect x="1" y="5" width="1" height="2" />
        <rect x="0" y="5" width="1" height="1" />
        <rect x="1" y="7" width="1" height="2" />
        <rect x="2" y="9" width="1" height="1" />
        <rect x="3" y="10" width="5" height="1" />
        <rect x="8" y="9" width="1" height="1" />
      </g>
      <g fill={fill}>
        <rect x="3" y="1" width="2" height="4" />
        <rect x="3" y="5" width="3" height="4" />
        <rect x="6" y="5" width="3" height="4" />
        <rect x="2" y="7" width="1" height="2" />
        <rect x="3" y="9" width="5" height="1" />
      </g>
    </svg>
  );
}
