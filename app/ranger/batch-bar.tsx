"use client";

import { useEffect, useState } from "react";

/**
 * Selection controls for the per-gain Release/Hold checkboxes.
 *
 * Deliberately a DOM island, not a state owner: the table is rendered on the
 * server and the checkboxes belong to a plain <form> outside it (associated by
 * the HTML `form` attribute, which is what lets the per-row action buttons stay
 * their own forms — nesting them would be invalid HTML). This component only
 * reads and toggles those inputs, so the table keeps working with JavaScript
 * off; all that is lost is the counter and the two select-all shortcuts.
 *
 * Every label arrives as a plain string. A Server Component cannot hand a
 * function across the boundary — doing so throws "Functions cannot be passed
 * directly to Client Components" at render time — so the count-dependent ones
 * are templates with {n}/{held}/{open} filled in here. The prop types are
 * `string` precisely so that mistake becomes a compile error rather than a
 * runtime one; it shipped as a runtime error once.
 */
export function BatchBar({
  formId,
  navKey,
  labels,
}: {
  formId: string;
  /** The navigation state that decides which tick-boxes exist: the open day, plus the
   *  filter and sort, since either can drop the open day out of the table entirely. They
   *  live inside the open day and ONLY there, so any of these changing replaces them
   *  wholesale without firing a `change` event — the counts below would otherwise keep
   *  describing check-boxes that no longer exist, and Release/Hold would submit an empty
   *  form while the bar still said "2 selected". */
  navKey?: string;
  labels: {
    selectAllHeld: string;
    selectAllOpen: string;
    clear: string;
    release: string;
    hold: string;
    countNone: string;
    countHeld: string;
    countOpen: string;
    countMixed: string;
    hintIdle: string;
    hintHeld: string;
    hintOpen: string;
    hintMixed: string;
  };
}) {
  const [held, setHeld] = useState(0);
  const [open, setOpen] = useState(0);

  const boxes = () =>
    Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[name="eventIds"][form="${formId}"]`),
    );

  const recount = () => {
    const on = boxes().filter((b) => b.checked);
    setHeld(on.filter((b) => b.dataset.held === "1").length);
    setOpen(on.filter((b) => b.dataset.held !== "1").length);
  };

  useEffect(() => {
    // Deferred, not synchronous: a setState in the effect body triggers a
    // cascading render (and the lint rule that forbids it). A frame later also
    // catches checkbox state the browser restored from bfcache on a back
    // navigation, which a mount-time read would miss.
    const id = requestAnimationFrame(recount);
    document.addEventListener("change", recount);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("change", recount);
    };
    // navKey: a soft navigation swaps the check-boxes out from under us without any event
    // we listen for, so re-run the count against the new DOM.
  }, [navKey]);

  const setAll = (pick: (b: HTMLInputElement) => boolean) => {
    boxes().forEach((b) => {
      b.checked = pick(b);
    });
    recount();
  };

  const total = held + open;
  const mixed = held > 0 && open > 0;

  // Release only ever adds tokens back; Hold only ever takes them away. Running
  // either across a mixed selection would quietly do the opposite of what the
  // admin means for half of it, so a mixed selection disables both and the bar
  // says why.
  const canRelease = held > 0 && open === 0;
  const canHold = open > 0 && held === 0;

  const fill = (tpl: string) =>
    tpl
      .replace("{n}", String(total))
      .replace("{held}", String(held))
      .replace("{open}", String(open));

  const count = !total
    ? labels.countNone
    : mixed
      ? fill(labels.countMixed)
      : held
        ? fill(labels.countHeld)
        : fill(labels.countOpen);

  const hint = !total
    ? labels.hintIdle
    : mixed
      ? labels.hintMixed
      : held
        ? labels.hintHeld
        : labels.hintOpen;

  const ghost =
    "ranger-btn rounded-[2px] px-2.5 py-1 text-[10px] text-text-forest " +
    "disabled:cursor-not-allowed disabled:opacity-35";
  const ghostStyle = {
    border: "1px solid var(--color-soil)",
    background: "var(--color-surface-parchment)",
  } as const;
  const action =
    "ranger-btn ranger-btn-lift rounded-[2px] px-3 py-1.5 text-[11px] shadow-pixel-sm " +
    "disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none";

  return (
    <div
      className="sticky bottom-0 z-10 mt-3 rounded-[2px]"
      style={{ border: "var(--border-pixel)", background: "var(--color-surface-parchment)" }}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button type="button" className={ghost} style={ghostStyle}
                  onClick={() => setAll((b) => b.dataset.held === "1")}>
            {labels.selectAllHeld}
          </button>
          <button type="button" className={ghost} style={ghostStyle}
                  onClick={() => setAll((b) => b.dataset.held !== "1")}>
            {labels.selectAllOpen}
          </button>
          <button type="button" className={ghost} style={ghostStyle} disabled={!total}
                  onClick={() => setAll(() => false)}>
            {labels.clear}
          </button>
        </div>

        <span
          className="ml-1 font-mono text-[11px]"
          style={{ color: mixed ? "#b45309" : "var(--color-text-muted-light)" }}
        >
          {count}
        </span>

        <span className="flex-1" />

        <button type="submit" form={formId} name="mode" value="release" disabled={!canRelease}
                className={`${action} bg-leaf-deep text-text-cream`}>
          {fill(labels.release)}
        </button>
        <button type="submit" form={formId} name="mode" value="hold" disabled={!canHold}
                className={`${action} bg-amber-700 text-white`}>
          {fill(labels.hold)}
        </button>
      </div>

      <p
        className="border-t px-3 py-1.5 text-[10px] leading-snug"
        style={{
          borderColor: "color-mix(in srgb, var(--color-soil) 25%, transparent)",
          color: mixed ? "#b45309" : "var(--color-text-muted-light)",
        }}
      >
        {hint}
      </p>
    </div>
  );
}
