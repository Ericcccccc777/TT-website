import { setRangerLangAction } from "@/app/ranger/actions";
import { LANGS, type Lang } from "@/lib/ranger/i18n";

/**
 * Language toggle for the /ranger admin console. A tiny form of submit buttons,
 * one per language, that set the `ranger_lang` cookie via a server action. Server
 * component — no client JS needed.
 */
export function RangerLangSwitcher({ current }: { current: Lang }) {
  return (
    <form action={setRangerLangAction} className="flex shrink-0 items-center gap-1">
      {LANGS.map((l) => {
        const active = l.code === current;
        return (
          <button
            key={l.code}
            type="submit"
            name="lang"
            value={l.code}
            aria-pressed={active}
            className="ranger-btn whitespace-nowrap rounded-[2px] px-2 py-1 text-[11px]"
            style={{
              border: "1px solid var(--color-soil)",
              background: active ? "var(--color-leaf-deep)" : "var(--color-surface-card)",
              color: active ? "var(--color-text-cream)" : "var(--color-text-forest)",
            }}
          >
            {l.label}
          </button>
        );
      })}
    </form>
  );
}
