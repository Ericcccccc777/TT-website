/**
 * The bordered note above a board, for the one or two sentences a visitor needs
 * in order to read the numbers correctly.
 *
 * It carries only standing caveats now. The coverage figure it used to lead
 * with ("covers 14.3% of all tokens counted") was removed by request, along with
 * the date per-model attribution started.
 */
export function DisclosureNote({ body, extra }: { body: string; extra?: string }) {
  return (
    <div
      className="mb-6 rounded-[2px] bg-surface-card px-4 py-3"
      style={{ border: "2px solid var(--color-accent-gold)" }}
    >
      <p
        className="text-text-muted-light"
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
