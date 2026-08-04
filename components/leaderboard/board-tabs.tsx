import { Link } from "@/i18n/navigation";

export type BoardId = "tokens" | "value" | "usage";

const BOARDS: { id: BoardId; href: string }[] = [
  { id: "tokens", href: "/leaderboard" },
  { id: "value", href: "/leaderboard/value" },
  { id: "usage", href: "/leaderboard/usage" },
];

/**
 * Switcher across the three boards.
 *
 * Three real routes and three `<Link>`s, not a client-side tab widget: the state
 * is the URL, so a board is shareable, works with the back button, and renders
 * without JavaScript. For the same reason the markup is `<nav>` + `aria-current`
 * and NOT `role="tab"` — that role promises assistive tech a panel swap that
 * never happens here.
 *
 * The active tab borrows the pressed state the pixel buttons already use
 * elsewhere: shadow removed and shifted 1px down-right, so it reads as pushed in
 * rather than as a different-coloured chip.
 */
export function BoardTabs({ active, labels }: { active: BoardId; labels: Record<BoardId, string> }) {
  return (
    <nav
      aria-label={labels.tokens}
      className="mb-8 grid grid-cols-3 gap-2 sm:mx-auto sm:max-w-lg"
      style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
    >
      {BOARDS.map(({ id, href }) => {
        const on = id === active;
        return (
          <Link
            key={id}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-[2px] px-2 text-center leading-tight transition-[transform,box-shadow] duration-100 ${
              on ? "" : "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg"
            }`}
            style={{
              border: "var(--border-pixel)",
              background: on ? "var(--color-leaf-deep)" : "var(--color-surface-card)",
              color: on ? "var(--color-text-cream)" : "var(--color-text-forest)",
              boxShadow: on ? "none" : "var(--shadow-pixel)",
              transform: on ? "translate(1px, 1px)" : undefined,
            }}
          >
            {labels[id]}
          </Link>
        );
      })}
    </nav>
  );
}
