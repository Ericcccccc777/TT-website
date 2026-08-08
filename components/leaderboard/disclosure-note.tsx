/**
 * The bordered note above a board, for the one thing a visitor needs in order to
 * read the numbers correctly.
 *
 * It used to lead with a live coverage figure ("covers 14.3% of all tokens
 * counted") and the date per-model attribution started, and the value board used
 * to add a count of players missing from it. All of that was removed by the
 * product owner; what remains is a single sentence per board.
 */
export function DisclosureNote({ body }: { body: string }) {
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
    </div>
  );
}
