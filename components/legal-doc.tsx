// Renderer for legal/policy pages (/privacy, /security).
// The DOC CONTENT is the canonical policy text and must stay byte-identical to
// the same-version PRIVACY.md / SECURITY.md in the public product repo — edit
// those first, then mirror here (see docs/trust/PRIVACY_ARCHITECTURE.md in the
// desktop repo: one canonical text, verbatim mirrors, same version stamp).

export type LegalBlock =
  | { p: string }
  | { list: string[] }
  | { code: string }
  | { table: { head: string[]; rows: string[][] } };

export type LegalSection = { h?: string; blocks: LegalBlock[] };

export type LegalDoc = {
  title: string;
  meta: string[];
  sections: LegalSection[];
};

export function LegalDocView({ doc, note }: { doc: LegalDoc; note?: string }) {
  return (
    <div className="min-h-screen bg-surface-parchment">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <h1
          className="text-leaf-deep"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-h1)",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {doc.title}
        </h1>
        <div className="mt-3 space-y-1">
          {doc.meta.map((line) => (
            <p
              key={line}
              className="text-text-muted-light"
              style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
            >
              {line}
            </p>
          ))}
        </div>
        {note && (
          <p
            className="mt-4 rounded-[2px] bg-surface-card px-4 py-3 text-text-muted-light"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-small)",
              border: "var(--border-pixel)",
            }}
          >
            {note}
          </p>
        )}

        {doc.sections.map((section, si) => (
          <section key={si} className="mt-9">
            {section.h && (
              <h2
                className="text-leaf-deep"
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "var(--text-caption)",
                  lineHeight: 1.4,
                }}
              >
                {section.h}
              </h2>
            )}
            <div className="mt-3 space-y-3">
              {section.blocks.map((block, bi) => (
                <LegalBlockView key={bi} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if ("p" in block) {
    return (
      <p
        className="text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)", lineHeight: 1.7 }}
      >
        {block.p}
      </p>
    );
  }
  if ("list" in block) {
    return (
      <ul
        className="space-y-1.5 text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)", lineHeight: 1.6 }}
      >
        {block.list.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-leaf-light">✦</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if ("code" in block) {
    return (
      <pre
        className="overflow-x-auto rounded-[2px] bg-surface-card px-4 py-3 text-text-forest"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-small)",
          fontWeight: 700,
          lineHeight: 1.8,
          border: "var(--border-pixel)",
        }}
      >
        {block.code}
      </pre>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-left"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
      >
        <thead>
          <tr>
            {block.table.head.map((cell) => (
              <th
                key={cell}
                className="bg-surface-card px-3 py-2 text-leaf-deep"
                style={{ border: "1px solid var(--color-soil)" }}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-text-muted-light">
          {block.table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 align-top"
                  style={{ border: "1px solid var(--color-soil)" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
