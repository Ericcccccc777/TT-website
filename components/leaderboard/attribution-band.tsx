/**
 * The band that tells a visitor how little of history these two boards cover.
 *
 * Per-model attribution shipped on 2026-07-29 and only counts bubbles popped
 * after that; older tokens were banked without a model name and cannot be
 * back-filled (that would mean reading logs from before the app was installed).
 * The slice is currently a few percent of all tokens ever counted.
 *
 * Without this band the boards are confidently wrong. Measured on a real
 * account: 71% of its lifetime tokens were Opus 4.8, but inside the attribution
 * window 96.6% were Opus 5 — the window says the opposite of the lifetime. Every
 * long-time player would read the wrong conclusion, persuasively.
 *
 * So it is a band, not a footnote, and it carries the live number rather than a
 * hard-coded one.
 */
export function AttributionBand({
  ratioLabel,
  sinceLabel,
  body,
  extra,
}: {
  ratioLabel: string;
  sinceLabel: string;
  body: string;
  extra?: string;
}) {
  return (
    <div
      className="mb-6 rounded-[2px] bg-surface-card px-4 py-3"
      style={{ border: "2px solid var(--color-accent-gold)" }}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className="text-accent-gold"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
        >
          {ratioLabel}
        </span>
        <span
          className="text-text-muted-light"
          style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
        >
          {sinceLabel}
        </span>
      </div>
      <p
        className="mt-2 text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
      >
        {body}
      </p>
      {extra && (
        <p
          className="mt-2 text-text-muted-light"
          style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
        >
          {extra}
        </p>
      )}
    </div>
  );
}
