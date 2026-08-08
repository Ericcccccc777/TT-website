import { Link } from "@/i18n/navigation";

/**
 * Vendors are open-ended — twelve today, more whenever someone routes a new
 * provider through the CLI — so a hand-picked brand colour per vendor does not
 * scale. Only the two the app has always had keep their own colour; everything
 * else takes a slot from the existing palette by position, deterministically.
 *
 * The colour never carries meaning on its own: every bar sits beside its vendor
 * name, so a repeat further down the list costs nothing.
 */
const FIXED: Record<string, string> = {
  claude: "var(--color-bubble-claude)",
  codex: "var(--color-bubble-codex)",
  unknown: "var(--color-text-muted-light)",
};

const RAMP = [
  "var(--color-leaf-deep)",
  "var(--color-accent-gold)",
  "var(--color-soil-light)",
  "var(--color-leaf-light)",
  "var(--color-accent-gold-light)",
  "var(--color-soil)",
];

export function providerColor(provider: string, index: number): string {
  return FIXED[provider] ?? RAMP[index % RAMP.length];
}

/**
 * One row of the vendor / model board: a horizontal bar whose width is the share
 * of the largest row, with the label and the raw number beside it.
 *
 * The whole row is a link when `href` is given (vendor rows drill into that
 * vendor's models); model rows are static. The bar itself is aria-hidden and the
 * link carries a full-sentence label, because a screen reader gets nothing from
 * "78% wide div".
 */
export function UsageBar({
  label,
  sublabel,
  value,
  share,
  color,
  href,
  active,
  ariaLabel,
  delayMs,
}: {
  label: string;
  sublabel?: string;
  value: string;
  /** 0–1, relative to the biggest row on this board. */
  share: number;
  color: string;
  href?: string;
  active?: boolean;
  ariaLabel?: string;
  delayMs?: number;
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className="mt-[3px] h-3 w-3 shrink-0 rounded-[1px]"
        style={{ background: color }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span
            className="truncate text-text-forest"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
            title={label}
          >
            {label}
            {sublabel && <span className="ml-2 text-text-muted-light">{sublabel}</span>}
          </span>
          <span
            className="shrink-0 text-accent-gold"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
          >
            {value}
          </span>
        </span>
        <span
          aria-hidden
          className="mt-1.5 block h-2 w-full rounded-[1px]"
          style={{ background: "color-mix(in srgb, var(--color-leaf-deep) 12%, transparent)" }}
        >
          <span
            className="block h-full origin-left rounded-[1px]"
            style={{
              background: color,
              // A hair of width on near-zero rows, so "used a little" never looks
              // identical to "not in the table".
              width: `${Math.max(share * 100, share > 0 ? 1.5 : 0)}%`,
              animation: "dash-grow-x 420ms ease both",
              animationDelay: `${Math.min(delayMs ?? 0, 600)}ms`,
            }}
          />
        </span>
      </span>
    </>
  );

  const base = "flex w-full items-start gap-3 px-3 py-3 text-left";

  if (!href) {
    return <li className={`${base} border-t border-leaf-deep/20`}>{inner}</li>;
  }

  return (
    <li className="border-t border-leaf-deep/20">
      <Link
        href={href}
        aria-label={ariaLabel}
        aria-current={active ? "true" : undefined}
        className={`${base} lb-row-light transition-colors`}
        style={
          active
            ? {
                background: "color-mix(in srgb, var(--color-leaf-light) 14%, transparent)",
                boxShadow: `inset 3px 0 0 ${color}`,
              }
            : undefined
        }
      >
        {inner}
      </Link>
    </li>
  );
}
