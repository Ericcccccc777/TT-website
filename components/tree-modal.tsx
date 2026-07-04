"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** One tree in the popup — main tree first, then the user's other trees. */
export interface TreeView {
  /** Sprite filename prefix, e.g. "AppleTree" | "CherryTree" | "Cactus". */
  prefix: string;
  /** Growth stage 1..8 — picks which sprite frame to show. */
  stage: number;
  /** Localised species name, e.g. "Apple Tree". */
  speciesLabel: string;
  /** This tree's own token count, pre-formatted for the locale. */
  tokensLabel: string;
  /** Localised "Stage n / 8" label. */
  stageLabel: string;
  /** alt text for the sprite (localised). */
  alt: string;
}

interface TreeModalButtonProps {
  /** Display name shown as the popup heading. */
  username: string;
  /** The user's trees — index 0 is the main (current) tree. */
  trees: TreeView[];
  /** aria-label / hover title for the trigger button (localised, includes username). */
  triggerLabel: string;
  /** Localised "Close" label for the dismiss button. */
  closeLabel: string;
  /** Localised token unit, e.g. "tokens". */
  tokensUnit: string;
  /** Localised "Main tree" badge label. */
  mainLabel: string;
}

/**
 * Leaderboard tree icon that opens a centred popup showing all of a user's
 * trees: the main (current) tree first, then any other grown trees, each with
 * its own token count and growth stage. Rendered through a portal to
 * document.body so the fixed overlay escapes the table's stacking contexts.
 * Dismisses on backdrop click or Escape.
 */
export function TreeModalButton({
  username,
  trees,
  triggerLabel,
  closeLabel,
  tokensUnit,
  mainLabel,
}: TreeModalButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  // Close on Escape + lock body scroll while the popup is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const main = trees[0];
  if (!main) return null;
  const others = trees.slice(1);
  const triggerSrc = `/sprites/${main.prefix}_${main.stage}.png`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        title={triggerLabel}
        className="shrink-0 rounded-[2px] p-0.5 transition-transform duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light active:scale-95"
        style={{ cursor: "pointer", background: "none", border: "none", lineHeight: 0 }}
      >
        <span
          className="animate-tree-breathe inline-block"
          style={{ transformOrigin: "bottom center" }}
          aria-hidden
        >
          <Image
            src={triggerSrc}
            alt=""
            width={24}
            height={24}
            className="pixelated"
            style={{ width: 24, height: 24, objectFit: "contain" }}
          />
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            style={{ background: "rgba(20, 30, 20, 0.6)" }}
            onClick={close}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={username}
              className="relative flex max-h-[85vh] w-full max-w-xs flex-col"
              style={{
                background: "var(--color-surface-card)",
                border: "var(--border-pixel)",
                borderRadius: "var(--radius-pixel)",
                boxShadow: "var(--shadow-pixel-gold)",
                padding: "1.25rem",
                animation: "row-slide-in 220ms ease both",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={close}
                aria-label={closeLabel}
                title={closeLabel}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center transition-transform duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light active:scale-95"
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.7rem",
                  color: "var(--color-text-muted-light)",
                  background: "var(--color-surface-panel)",
                  border: "1px solid var(--color-soil)",
                  borderRadius: "var(--radius-pixel)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>

              {/* Username heading */}
              <h2
                className="mb-3 shrink-0 pr-8 text-leaf-deep"
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "var(--text-caption)",
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {username}
              </h2>

              <div className="-mr-2 overflow-y-auto pr-2">
                {/* Main tree — large, with a "Main tree" badge */}
                <TreeBlock tree={main} tokensUnit={tokensUnit} badge={mainLabel} large />

                {/* Other trees — compact rows */}
                {others.length > 0 && (
                  <>
                    <div
                      className="my-3 h-px w-full"
                      style={{ background: "var(--color-soil)", opacity: 0.4 }}
                      aria-hidden
                    />
                    <ul className="flex flex-col gap-2">
                      {others.map((tree, i) => (
                        <li key={`${tree.prefix}-${i}`}>
                          <TreeBlock tree={tree} tokensUnit={tokensUnit} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ── Tree block ────────────────────────────────────────────────────────────────

function TreeBlock({
  tree,
  tokensUnit,
  badge,
  large = false,
}: {
  tree: TreeView;
  tokensUnit: string;
  badge?: string;
  large?: boolean;
}) {
  const src = `/sprites/${tree.prefix}_${tree.stage}.png`;

  if (large) {
    return (
      <div>
        <div className="relative mx-auto w-full max-w-[200px]">
          <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
            <Image
              src={src}
              alt={tree.alt}
              fill
              sizes="200px"
              className="pixelated object-contain object-bottom"
            />
          </div>
          <div className="relative h-8 w-full" aria-hidden>
            <Image
              src="/sprites/Ground.png"
              alt=""
              fill
              sizes="200px"
              className="pixelated object-cover"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2">
            <span
              className="text-leaf-deep"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
            >
              {tree.speciesLabel}
            </span>
            {badge && (
              <span
                className="rounded-[2px] px-1.5 py-0.5"
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "0.55rem",
                  color: "var(--color-text-cream)",
                  background: "var(--color-leaf-deep)",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <TokenLine tokensLabel={tree.tokensLabel} tokensUnit={tokensUnit} big />
          <span
            className="text-text-muted-light"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "0.6rem" }}
          >
            {tree.stageLabel}
          </span>
        </div>
      </div>
    );
  }

  // Compact row for the user's other trees
  return (
    <div
      className="flex items-center gap-3 rounded-[2px] p-2"
      style={{ background: "var(--color-surface-panel)", border: "1px solid var(--color-soil)" }}
    >
      <Image
        src={src}
        alt={tree.alt}
        width={44}
        height={44}
        className="pixelated shrink-0"
        style={{ width: 44, height: 44, objectFit: "contain" }}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className="truncate text-leaf-deep"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "0.7rem" }}
        >
          {tree.speciesLabel}
        </span>
        <TokenLine tokensLabel={tree.tokensLabel} tokensUnit={tokensUnit} />
        <span
          className="text-text-muted-light"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "0.55rem" }}
        >
          {tree.stageLabel}
        </span>
      </div>
    </div>
  );
}

function TokenLine({
  tokensLabel,
  tokensUnit,
  big = false,
}: {
  tokensLabel: string;
  tokensUnit: string;
  big?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span
        style={{
          fontFamily: "var(--font-brand)",
          fontSize: big ? "var(--text-body)" : "0.7rem",
          color: "var(--color-accent-gold)",
        }}
      >
        {tokensLabel}
      </span>
      <span
        className="text-text-muted-light"
        style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
      >
        {tokensUnit}
      </span>
    </span>
  );
}
