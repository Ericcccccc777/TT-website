import { Link } from "@/i18n/navigation";

export type PeriodId = "recent" | "lifetime";

const PERIODS: { id: PeriodId; href: string }[] = [
  { id: "recent", href: "/leaderboard/recent" },
  { id: "lifetime", href: "/leaderboard" },
];

/**
 * Switcher between the two token boards: the rolling 30-day one and the lifetime
 * one.
 *
 * Sits *below* `BoardTabs`, not inside it. The three entries up there are three
 * different measures (tokens / value / vendor usage); these two are the same
 * measure over two windows. Folding them into one row of five would flatten that
 * distinction and imply the value board has windows too, which it does not.
 *
 * Two real routes and two `<Link>`s for the same reasons `BoardTabs` uses them:
 * the state is the URL, so a board is shareable, survives the back button, and
 * renders without JavaScript. `<nav>` + `aria-current`, never `role="tab"` —
 * that role promises assistive tech a panel swap that does not happen here.
 */
export function PeriodTabs({
  active,
  labels,
  hint,
}: {
  active: PeriodId;
  labels: Record<PeriodId, string>;
  hint: string;
}) {
  return (
    <div className="mb-8 flex flex-col items-center gap-2">
      <nav
        aria-label={hint}
        className="inline-flex gap-1 rounded-[2px] p-1"
        style={{
          border: "1px solid var(--color-soil)",
          background: "var(--color-surface-parchment)",
          fontFamily: "var(--font-pixel)",
          fontSize: "var(--text-caption)",
        }}
      >
        {PERIODS.map(({ id, href }) => {
          const on = id === active;
          return (
            <Link
              key={id}
              href={href}
              aria-current={on ? "page" : undefined}
              className="inline-flex min-h-[36px] items-center justify-center px-4 leading-none transition-colors duration-100"
              style={{
                borderRadius: 2,
                background: on ? "var(--color-leaf-deep)" : "transparent",
                color: on ? "var(--color-text-cream)" : "var(--color-text-muted-light)",
              }}
            >
              {labels[id]}
            </Link>
          );
        })}
      </nav>
      <p
        className="max-w-md text-center text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
      >
        {hint}
      </p>
    </div>
  );
}
