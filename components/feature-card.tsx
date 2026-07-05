// ── FeatureCard ────────────────────────────────────────────────────────────────
// Pure display component — hover choreography is CSS-only (globals.css
// §FEATURE CARD HOVER SUITE, gated behind (hover:hover) media), so this stays
// a server component even with a live demo screen slotted in.

interface FeatureCardProps {
  title: string;
  body?: string;
  bullets?: string[];
  accentColor?: "leaf" | "soil";
  badge?: string; // e.g. "规划中" or "即将推出"
  badgeTone?: "soon" | "live"; // "live" = green (shipped); default gold (coming)
  /** Optional live demo screen rendered above the title (see feature-demos.tsx). */
  demo?: React.ReactNode;
  className?: string;
}

function LeafCheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="leaf-check mt-0.5 shrink-0"
    >
      <circle cx="7" cy="7" r="6.5" stroke="var(--color-leaf-light)" strokeWidth="1.5" />
      <path
        d="M4 7l2 2 4-4"
        stroke="var(--color-leaf-light)"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function FeatureCard({
  title,
  body,
  bullets,
  accentColor = "leaf",
  badge,
  badgeTone = "soon",
  demo,
  className,
}: FeatureCardProps) {
  const accent = accentColor === "soil" ? "var(--color-soil)" : "var(--color-leaf-deep)";

  return (
    <div
      className={`group relative flex flex-col gap-2 overflow-hidden p-5 transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg${className ? ` ${className}` : ""}`}
      style={{
        background: "var(--color-surface-panel)",
        border: "2px solid var(--color-leaf-deep)",
        borderRadius: "var(--radius-pixel)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Left accent stripe — widens (transform only) on hover */}
      <span
        className="card-stripe absolute inset-y-0 left-0 w-1"
        style={{ background: accent, transformOrigin: "left" }}
        aria-hidden
      />

      {/* One-shot diagonal shine sweep on hover */}
      <span
        className="card-shine pointer-events-none absolute inset-y-0 w-1/3"
        style={{
          left: 0,
          transform: "translateX(-150%) skewX(-18deg)",
          background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 7%), transparent)",
        }}
        aria-hidden
      />

      {/* Live demo screen */}
      {demo && <div className="pl-3">{demo}</div>}

      {/* Title row */}
      <div className="flex items-center gap-2 pl-3">
        <span
          className="text-text-cream"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-caption)",
            lineHeight: 1.4,
          }}
        >
          {title}
        </span>
        {badge && (
          <span
            className="ml-auto flex shrink-0 items-center gap-1 px-1.5 py-0.5"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.55rem",
              color: badgeTone === "live" ? "var(--color-leaf-light)" : "var(--color-accent-gold)",
              border: `1px solid ${
                badgeTone === "live" ? "var(--color-leaf-light)" : "var(--color-accent-gold)"
              }`,
              borderRadius: "var(--radius-pixel)",
              opacity: 0.85,
            }}
          >
            {badgeTone === "live" && (
              <span
                className="live-dot inline-block h-[5px] w-[5px]"
                style={{ background: "var(--color-leaf-light)" }}
                aria-hidden
              />
            )}
            {badge}
          </span>
        )}
      </div>

      {/* Bullets or Body */}
      {bullets && bullets.length > 0 ? (
        <ul className="flex flex-col gap-1 pl-3">
          {bullets.map((item, i) => (
            <li key={i} className="flex gap-2">
              <LeafCheckIcon />
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  color: "var(--color-text-muted-dark)",
                  lineHeight: 1.6,
                }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : body ? (
        <p
          className="pl-3"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted-dark)",
            lineHeight: 1.6,
          }}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}
