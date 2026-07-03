/** Pixel crown for leaderboard champion rows (teaser + /leaderboard). */
export function PixelCrown({ width = 14 }: { width?: number }) {
  return (
    <svg viewBox="0 0 10 7" width={width} shapeRendering="crispEdges" aria-hidden>
      <g fill="#c8943c">
        <rect x="0" y="0" width="2" height="2" />
        <rect x="4" y="0" width="2" height="2" />
        <rect x="8" y="0" width="2" height="2" />
        <rect x="0" y="2" width="10" height="3" />
        <rect x="1" y="5" width="8" height="2" />
      </g>
      <g fill="#e8ba60">
        <rect x="2" y="3" width="2" height="1" />
        <rect x="6" y="3" width="2" height="1" />
      </g>
    </svg>
  );
}
