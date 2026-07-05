"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Localised "Total" label for the grand total row. */
  totalLabel: string;
  /** The grand total across all trees, pre-formatted for the locale. */
  totalTokensLabel: string;
  /** aria-labels for the horizontal scroll arrows. */
  prevLabel: string;
  nextLabel: string;
}

// Ground patch geometry — the tree's base sinks SINK px into the soil so it
// always reads as planted, regardless of the sprite's aspect ratio.
const GROUND_H = 14;
const SINK = 4;

/**
 * Leaderboard tree icon that opens a centred popup showing all of a user's
 * trees side by side: the main (current) tree first, then any other grown
 * trees, each planted on the ground with its own token count and growth stage,
 * and a grand total at the bottom. On narrow screens the row scrolls
 * horizontally with prev/next buttons. Rendered through a portal to
 * document.body; dismisses on backdrop click or Escape.
 */
export function TreeModalButton({
  username,
  trees,
  triggerLabel,
  closeLabel,
  tokensUnit,
  mainLabel,
  totalLabel,
  totalTokensLabel,
  prevLabel,
  nextLabel,
}: TreeModalButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  const scrollByStep = useCallback((dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  // Close on Escape + lock body scroll while the popup is open; measure arrows.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // measure after the portal has laid out
    const raf = requestAnimationFrame(updateArrows);
    window.addEventListener("resize", updateArrows);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("resize", updateArrows);
      cancelAnimationFrame(raf);
    };
  }, [open, close, updateArrows]);

  const main = trees[0];
  if (!main) return null;
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
              className="relative flex max-h-[85vh] w-full max-w-sm flex-col"
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
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center transition-transform duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light active:scale-95"
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

              {/* Horizontal tree gallery with prev/next controls.
                  min-w-0 lets the flex column shrink this below its content
                  width so overflow-x-auto actually scrolls instead of widening
                  (and overflowing) the whole dialog on narrow screens. */}
              <div className="relative w-full min-w-0">
                <div
                  ref={scrollRef}
                  onScroll={updateArrows}
                  className="flex snap-x gap-3 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: "none" }}
                >
                  {trees.map((tree, i) => (
                    <TreeCard
                      key={`${tree.prefix}-${i}`}
                      tree={tree}
                      tokensUnit={tokensUnit}
                      badge={i === 0 ? mainLabel : undefined}
                    />
                  ))}
                </div>

                {canPrev && (
                  <ArrowButton dir="prev" label={prevLabel} onClick={() => scrollByStep(-1)} />
                )}
                {canNext && (
                  <ArrowButton dir="next" label={nextLabel} onClick={() => scrollByStep(1)} />
                )}
              </div>

              {/* Grand total */}
              <div
                className="mt-3 flex shrink-0 items-center justify-between border-t pt-3"
                style={{ borderColor: "var(--color-soil)" }}
              >
                <span
                  className="text-text-muted-light"
                  style={{ fontFamily: "var(--font-pixel)", fontSize: "0.65rem" }}
                >
                  {totalLabel}
                </span>
                <TokenLine tokensLabel={totalTokensLabel} tokensUnit={tokensUnit} big />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ── Tree card ─────────────────────────────────────────────────────────────────

function TreeCard({
  tree,
  tokensUnit,
  badge,
}: {
  tree: TreeView;
  tokensUnit: string;
  badge?: string;
}) {
  const src = `/sprites/${tree.prefix}_${tree.stage}.png`;

  return (
    <div className="flex w-[104px] shrink-0 snap-start flex-col items-center gap-1.5 text-center">
      {/* Tree planted on a ground patch — base sinks into the soil so it never
          floats, whatever the sprite's aspect ratio. */}
      <div className="relative h-[100px] w-full">
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden rounded-[2px]"
          style={{ height: GROUND_H }}
        >
          <Image
            src="/sprites/Ground.png"
            alt=""
            fill
            sizes="104px"
            className="pixelated object-cover"
          />
        </div>
        <div className="absolute inset-x-0 top-0" style={{ bottom: GROUND_H - SINK }}>
          <Image
            src={src}
            alt={tree.alt}
            fill
            sizes="104px"
            className="pixelated object-contain object-bottom"
          />
        </div>
      </div>

      {/* Species + optional "Main tree" badge */}
      <div className="flex flex-col items-center gap-0.5">
        {badge && (
          <span
            className="rounded-[2px] px-1.5 py-0.5"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "0.5rem",
              color: "var(--color-text-cream)",
              background: "var(--color-leaf-deep)",
            }}
          >
            {badge}
          </span>
        )}
        <span
          className="text-leaf-deep"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "0.62rem", lineHeight: 1.3 }}
        >
          {tree.speciesLabel}
        </span>
      </div>

      {/* This tree's own token count */}
      <TokenLine tokensLabel={tree.tokensLabel} tokensUnit={tokensUnit} />

      <span
        className="text-text-muted-light"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "0.52rem" }}
      >
        {tree.stageLabel}
      </span>
    </div>
  );
}

// ── Scroll arrow ──────────────────────────────────────────────────────────────

function ArrowButton({
  dir,
  label,
  onClick,
}: {
  dir: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`absolute top-[42px] flex h-8 w-8 -translate-y-1/2 items-center justify-center transition-transform duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-light active:scale-95 ${
        dir === "prev" ? "left-0" : "right-0"
      }`}
      style={{
        fontFamily: "var(--font-pixel)",
        fontSize: "0.8rem",
        color: "var(--color-text-cream)",
        background: "var(--color-leaf-deep)",
        border: "1px solid var(--color-soil)",
        borderRadius: "var(--radius-pixel)",
        boxShadow: "var(--shadow-pixel)",
        cursor: "pointer",
      }}
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

// ── Token line ────────────────────────────────────────────────────────────────

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
          fontSize: big ? "var(--text-body)" : "0.62rem",
          color: "var(--color-accent-gold)",
          whiteSpace: "nowrap",
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
