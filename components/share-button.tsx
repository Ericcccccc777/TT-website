"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Send this to someone" — the same control on a player's page, on each rolling
 * board card, and on the download page.
 *
 * ── One label, never swapped ────────────────────────────────────────────────
 * The obvious design reads `navigator.share` on mount and says "Share" or
 * "Copy link" accordingly. It cannot be done without the label changing after
 * the page has already been painted — the server has no user agent, so the
 * first paint is always a guess — and the flip lands on precisely the devices
 * that DO have a panel. "Share" is true of both outcomes, so the word is fixed
 * and only the behaviour branches.
 *
 * ── The fallback chain has no dead end ──────────────────────────────────────
 *   native panel → clipboard → the address, revealed as selectable text
 *
 * Every branch ends in something the visitor can see. The last step exists
 * because a page served over plain http (or an older browser) has no clipboard
 * API at all, and a control that silently does nothing reads as broken.
 *
 * Two things here are easy to get wrong:
 *
 *  1. **A dismissal is not a failure.** Closing the system panel rejects with
 *     `AbortError`, the same shape a genuine error arrives in. Treating them
 *     alike either pesters someone who changed their mind, or strands someone
 *     whose panel is broken. Only `AbortError` returns early.
 *  2. **`navigator.clipboard` can be absent entirely**, which throws
 *     synchronously rather than rejecting. It sits inside the same `try` as the
 *     write for that reason — a separate `if` guard would need its own copy of
 *     the fallback and they would drift.
 */

type Variant = "solid" | "quiet";

const COPIED_MS = 2000;

export function ShareButton({
  url,
  shareTitle,
  shareText,
  label,
  copiedLabel,
  manualLabel,
  ariaLabel,
  variant = "quiet",
  className = "",
}: {
  /** Absolute URL. Built server-side by the caller — the board cards share a
   *  different page than the one they are on, so this is never `location.href`. */
  url: string;
  shareTitle: string;
  shareText: string;
  label: string;
  copiedLabel: string;
  manualLabel: string;
  ariaLabel: string;
  variant?: Variant;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const field = useRef<HTMLInputElement>(null);

  // A press while "Copied" is showing re-copies and restarts the clock; without
  // clearing first, the earlier timer would blank the label mid-way through the
  // second one.
  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  /** Same rewrite as the share path — see the note in `onClick`. */
  const shareUrl = useCallback(() => {
    if (typeof window === "undefined") return url;
    return url.startsWith(window.location.origin)
      ? url
      : url.replace(/^https?:\/\/[^/]+/, window.location.origin);
  }, [url]);

  const copy = useCallback(async () => {
    try {
      // Absent API throws here synchronously; a denied write rejects. Same catch.
      await navigator.clipboard.writeText(shareUrl());
      clearTimer();
      setState("copied");
      timer.current = setTimeout(() => setState("idle"), COPIED_MS);
    } catch {
      clearTimer();
      setState("manual");
    }
  }, [shareUrl, clearTimer]);

  const onClick = useCallback(async () => {
    /*
     * Share the address the visitor is actually on, when that differs from the
     * canonical one.
     *
     * Every URL this site emits is built from `siteUrl()`, which is the
     * production origin — correct for canonical tags, sitemaps and OG, and
     * correct for the link a real visitor shares. But on a dev server or a
     * preview deploy it means the share sheet is handed a production address,
     * and the OS then tries to fetch a preview for a page that is not deployed
     * there yet. The result looks like a broken share control: no icon, no
     * title card, nothing. It is not the icon that is missing — it is the page.
     *
     * So when the page is being viewed somewhere other than the canonical
     * origin, share the origin in front of the visitor. In production the two
     * are the same string and this is a no-op.
     */
    const here =
      typeof window !== "undefined" && !url.startsWith(window.location.origin)
        ? url.replace(/^https?:\/\/[^/]+/, window.location.origin)
        : url;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: here });
        return;
      } catch (err) {
        // Changed their mind — leave the control exactly as it was.
        //
        // Matched on `name` and nothing else. The spec-conforming rejection is
        // a DOMException, but a polyfill may throw a plain object, and a
        // cross-realm DOMException fails `instanceof` outright — every prototype
        // test here has a case that slips past it, and slipping past means
        // reading a dismissal as a failure and copying the link behind the
        // visitor's back.
        if (typeof err === "object" && err !== null && (err as { name?: unknown }).name === "AbortError") {
          return;
        }
        // Anything else: the panel is unusable, but the clipboard may not be.
      }
    }
    await copy();
  }, [shareTitle, shareText, url, copy]);

  // Reveal-and-select, once, when the manual fallback appears. Selecting spares
  // the visitor a drag across a long address on a phone.
  useEffect(() => {
    if (state === "manual") field.current?.select();
  }, [state]);

  const solid = variant === "solid";

  return (
    <span className={`inline-flex flex-col items-start gap-2 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-[2px] px-3 py-1.5 leading-none transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "var(--text-caption)",
          border: solid ? "var(--border-pixel)" : "1px solid var(--color-soil)",
          background: solid ? "var(--color-leaf-deep)" : "var(--color-surface-card)",
          color: solid ? "var(--color-text-cream)" : "var(--color-text-muted-light)",
          boxShadow: solid ? "var(--shadow-pixel)" : "none",
        }}
      >
        <ShareGlyph />
        <span aria-hidden>{state === "copied" ? copiedLabel : label}</span>
      </button>

      {/* The outcome, for anyone who cannot see the label change. */}
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? copiedLabel : ""}
      </span>

      {state === "manual" && (
        <span className="flex w-full max-w-full flex-col gap-1">
          <span
            className="text-text-muted-light"
            style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
          >
            {manualLabel}
          </span>
          <input
            ref={field}
            readOnly
            value={shareUrl()}
            aria-label={manualLabel}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full min-w-0 rounded-[2px] px-2 py-1"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-small)",
              border: "1px solid var(--color-soil)",
              background: "var(--color-surface-parchment)",
              color: "var(--color-text-forest)",
            }}
          />
        </span>
      )}
    </span>
  );
}

/** Three nodes and two arms — the share mark, drawn to sit on the pixel grid. */
function ShareGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false">
      <path
        d="M4.5 5.2 L7.5 3.4 M4.5 6.8 L7.5 8.6"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
      <rect x="0.5" y="4.5" width="3" height="3" fill="currentColor" />
      <rect x="8.5" y="1.5" width="3" height="3" fill="currentColor" />
      <rect x="8.5" y="7.5" width="3" height="3" fill="currentColor" />
    </svg>
  );
}
