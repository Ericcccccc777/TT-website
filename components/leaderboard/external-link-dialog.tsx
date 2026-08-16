"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A project link, plus the confirmation step in front of it.
 *
 * The product owner chose this over screening what players may link to:
 * registering a host is free, so a blocklist is always a day behind, whereas
 * naming the destination works for any address.
 *
 * Three things here are load-bearing and easy to get wrong:
 *
 *  1. This stays a real `<a href>` with the right `rel`/`target`. Replacing it
 *     with a `<button>` would break middle-click, ⌘/Ctrl-click and "copy link
 *     address", and hide the destination from the status bar. We intercept a
 *     plain left-click only.
 *  2. Confirming opens with the *string* form of `window.open`. A bare
 *     `window.open(url, "_blank")` hands the destination a live `window.opener`
 *     pointing at this page, which the anchor's own `rel` cannot undo.
 *  3. The text shown — here and in the dialog — is the hostname, never the
 *     href. A 200-character path is exactly where a lookalike hides, and the
 *     link is the one field the database does not screen for zero-width or
 *     bidi characters.
 */
export function ExternalLinkDialog({
  href,
  hostname,
  title,
  body,
  confirmLabel,
  cancelLabel,
}: {
  href: string;
  hostname: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    linkRef.current?.focus();
  }, []);

  // Focus into the dialog when it opens; trap Tab inside it; Escape closes.
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>("button");
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <a
        ref={linkRef}
        href={href}
        target="_blank"
        // nofollow ugc on top of the usual pair: this is the one indexable page
        // that carries player-written links, and robots.ts allow-lists 15 AI
        // crawlers. Without it the board becomes a place to farm ranking.
        rel="noopener noreferrer nofollow ugc"
        onClick={(e) => {
          // Let the browser handle anything that is not a plain left-click.
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          setOpen(true);
        }}
        className="inline-flex max-w-full items-center gap-1 underline decoration-dotted underline-offset-2 hover:decoration-solid"
        style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
      >
        {hostname}
        <span aria-hidden>↗</span>
      </a>

      {/*
        Portalled to <body>, not rendered in place. Two reasons, both real:

         - the link sits inside a <p> in a table cell, and a <div> may not be a
           descendant of a <p> — React rewrites the tree and the page throws four
           hydration errors;
         - the panel lives inside an overflow-hidden wrapper, and the rows around
           it are animated with a transform. A transformed ancestor makes
           `position: fixed` resolve against that ancestor instead of the
           viewport, so an in-place modal would be clipped into the row.
      */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="w-full max-w-sm rounded-[2px] bg-surface-card p-5"
              style={{ border: "var(--border-pixel)" }}
            >
              <p
                className="text-leaf-deep"
                style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
              >
                {title}
              </p>
              <p
                className="mt-3 text-text-forest"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-body)",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {hostname}
              </p>
              <p
                className="mt-2 text-text-muted-light"
                style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
              >
                {body}
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-[2px] px-4 py-2 text-text-forest transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
                  style={{
                    border: "1px solid var(--color-soil)",
                    background: "var(--color-surface-parchment)",
                    fontFamily: "var(--font-pixel)",
                    fontSize: "var(--text-caption)",
                  }}
                >
                  {cancelLabel}
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={() => {
                    // String form, not `window.open(href, "_blank")` — see the
                    // component header. Without "noopener" the destination gets a
                    // live handle on this page.
                    window.open(href, "_blank", "noopener,noreferrer");
                    close();
                  }}
                  className="rounded-[2px] bg-leaf-deep px-4 py-2 text-text-cream shadow-pixel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
