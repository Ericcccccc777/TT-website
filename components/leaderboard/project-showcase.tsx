"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { panelId, panelLabelId } from "@/lib/leaderboard-format";

/**
 * The expandable project panel on the tokens board.
 *
 * Shape, and why it is this shape:
 *
 *  - The panel has to be a second `<tr>` holding one `<td colSpan={4}>`, sibling
 *    to the player row. A `<div>` or `<details>` is hoisted straight out of
 *    `<tbody>` by the HTML parser.
 *  - Only one panel opens at a time, so the state has to live above the rows —
 *    hence a context provider around `<tbody>`.
 *  - But the panel's *text* must be in the HTML from first paint (a settled
 *    product decision: the words are for search engines too). So the page
 *    renders that text on the server and passes it in as `children`; this file
 *    only decides whether the row is visible. The image is the exception — it
 *    mounts on open, because pictures are the expensive part.
 *
 * Everything here is the first of its kind in this repo: `aria-controls` appears
 * exactly once elsewhere (`components/top-bar.tsx:423`, which never restores
 * focus), and the one widget that does restore focus has no `aria-controls`.
 */

type Ctx = {
  openId: string | null;
  toggle: (id: string) => void;
  close: () => void;
  registerTrigger: (id: string, el: HTMLButtonElement | null) => void;
};

const ShowcaseContext = createContext<Ctx | null>(null);

export function ProjectShowcaseProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());

  const registerTrigger = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) triggers.current.set(id, el);
    else triggers.current.delete(id);
  }, []);

  // Closing always hands focus back to the control that closed it, so a
  // keyboard user is never dropped at the top of the document.
  const focusTrigger = useCallback((id: string) => {
    triggers.current.get(id)?.focus();
  }, []);

  // `openId` is read from this render rather than from a state updater: an
  // updater must be pure, and React 19 may run one more than once (eager
  // evaluation at dispatch, a discarded concurrent render, StrictMode) — which
  // would make .focus() a render-phase side effect. A click cannot land between
  // two renders, so the closed-over value is the current one.
  const toggle = useCallback(
    (id: string) => {
      if (openId === id) {
        setOpenId(null);
        focusTrigger(id);
        return;
      }
      setOpenId(id);
    },
    [openId, focusTrigger],
  );

  const close = useCallback(() => {
    if (!openId) return;
    setOpenId(null);
    focusTrigger(openId);
  }, [openId, focusTrigger]);

  // Escape closes the open panel from anywhere on the page. It has to be owned
  // here, not on the panel cell: the trigger renders into the PREVIOUS row, so
  // it is not a descendant of the cell and a handler there never sees the key —
  // which is exactly where focus sits right after opening a panel.
  //
  // Two guards, and both are load-bearing, because listening on the document
  // means claiming Escape for the whole page.
  //
  //  - A modal on top of the board (the link interstitial, the tree popup) owns
  //    Escape while it is up: the key must dismiss the dialog and leave the row
  //    underneath it alone. Asking the document rather than the event target
  //    also covers the instant after a dialog has moved focus to <body>.
  //  - A NON-modal widget that handles Escape itself — the top bar's language
  //    menu — is not covered by that check, and one press would otherwise close
  //    the menu AND collapse the panel AND yank focus across the page. Those
  //    widgets call preventDefault, and React's handlers run before this one
  //    (React listens on the app root, which is a descendant of the document),
  //    so an already-handled Escape arrives here marked. Nothing in the panel
  //    or its trigger calls preventDefault on Escape, so this cannot swallow
  //    the key we actually want.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId, close]);

  const value = useMemo<Ctx>(
    () => ({ openId, toggle, close, registerTrigger }),
    [openId, toggle, close, registerTrigger],
  );

  return <ShowcaseContext.Provider value={value}>{children}</ShowcaseContext.Provider>;
}

function useShowcase(): Ctx {
  const ctx = useContext(ShowcaseContext);
  if (!ctx) throw new Error("ProjectShowcase components must be inside ProjectShowcaseProvider");
  return ctx;
}

/** The small marker in the username cell. Rendered only for rows with a project. */
export function ProjectTrigger({
  id,
  labelOpen,
  labelClose,
}: {
  id: string;
  labelOpen: string;
  labelClose: string;
}) {
  const { openId, toggle, registerTrigger } = useShowcase();
  const open = openId === id;

  return (
    <button
      // Braces, not a concise body: React 19 treats a ref callback's return
      // value as a cleanup function and throws on anything else, so a callback
      // must never return whatever the function it calls happens to return.
      ref={(el) => {
        registerTrigger(id, el);
      }}
      type="button"
      onClick={() => toggle(id)}
      aria-expanded={open}
      aria-controls={panelId(id)}
      aria-label={open ? labelClose : labelOpen}
      title={open ? labelClose : labelOpen}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] leading-none text-leaf-deep transition-[transform,box-shadow] duration-100 hover:-translate-y-0.5 active:translate-y-0.5"
      style={{
        border: "1px solid var(--color-soil)",
        background: "var(--color-surface-parchment)",
        fontFamily: "var(--font-pixel)",
        fontSize: "10px",
      }}
    >
      <span aria-hidden>{open ? "▾" : "▸"}</span>
    </button>
  );
}

/**
 * The panel row. Always rendered for a row that has a project; `hidden` while
 * closed so it leaves the accessibility tree as well as the viewport — not
 * opacity or height, which would leave it readable to a screen reader and
 * findable by in-page search.
 */
export function ProjectPanelRow({
  id,
  colSpan,
  image,
  children,
}: {
  id: string;
  colSpan: number;
  image?: { src: string; width: number; height: number } | null;
  children: ReactNode;
}) {
  const { openId } = useShowcase();
  const open = openId === id;
  // Remember WHICH src failed, not merely that one did. The src carries a
  // cache-busting stamp derived from updated_at, so a replaced or repaired
  // picture arrives as a different URL — and a plain boolean would keep
  // suppressing it, because a router refresh can keep this component mounted.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <tr hidden={!open} className="border-t border-leaf-deep/10 bg-surface-parchment/60">
      <td id={panelId(id)} colSpan={colSpan} className="px-4 py-4">
        {/*
          min-w-0 everywhere: this cell sits inside an overflow-hidden wrapper
          around a w-full auto-layout table, so content that refuses to shrink is
          CLIPPED, not scrolled. The binding case is an 80-character description
          with no spaces in it — length, character set and word list are checked
          in the database, repetition is not.

          The region and its name live on this wrapper rather than on the <td>:
          overriding a cell's implicit role would take it out of the table's
          structural semantics. The name it points at is the project name the
          page renders as the first thing inside `children` — a panel is only
          ever rendered for a row that has one, so the target always exists.
        */}
        <div
          role="region"
          aria-labelledby={panelLabelId(id)}
          className="flex min-w-0 flex-wrap items-start gap-4"
        >
          {/* Mounted only when the row is open, and dropped silently if it 404s
              (which Storage answers as HTTP 400 — never status-check it). */}
          {open && image && failedSrc !== image.src && (
            <Image
              src={image.src}
              alt=""
              width={image.width}
              height={image.height}
              loading="lazy"
              onError={() => setFailedSrc(image.src)}
              className="shrink-0 rounded-[2px]"
              style={{
                width: image.width,
                height: image.height,
                objectFit: "contain",
                border: "1px solid var(--color-soil)",
                background: "var(--color-surface-card)",
              }}
            />
          )}
          <div className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>
            {children}
          </div>
        </div>
      </td>
    </tr>
  );
}
