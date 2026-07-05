"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// Hydration-safe "am I on the client?" flag: false during SSR/hydration's
// server snapshot, true on the client — replaces the setState-in-effect
// mounted pattern without a cascading second render.
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

interface TreeModalButtonProps {
  /** Display name shown as the popup heading. */
  username: string;
  /** Sprite filename prefix, e.g. "AppleTree" | "CherryTree". */
  treePrefix: string;
  /** Growth stage 1..8 — picks which sprite frame to show. */
  stage: number;
  /** aria-label / hover title for the trigger button (localised, includes username). */
  triggerLabel: string;
  /** Localised "Stage n / 8" label shown under the enlarged tree. */
  stageLabel: string;
  /** alt text for the enlarged sprite (localised, includes username). */
  treeAlt: string;
  /** Localised "Close" label for the dismiss button. */
  closeLabel: string;
}

/**
 * Leaderboard tree icon that opens a centred popup with an enlarged, stage-aware
 * view of the user's tree (apple or cherry). Rendered through a portal to
 * document.body so the fixed overlay escapes the table's blur/animation
 * stacking contexts. Dismisses on backdrop click or Escape.
 */
export function TreeModalButton({
  username,
  treePrefix,
  stage,
  triggerLabel,
  stageLabel,
  treeAlt,
  closeLabel,
}: TreeModalButtonProps) {
  const [open, setOpen] = useState(false);
  const mounted = useMounted();

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

  const src = `/sprites/${treePrefix}_${stage}.png`;

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
            src={src}
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
              aria-label={treeAlt}
              className="relative w-full max-w-xs"
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
                className="mb-3 pr-8 text-leaf-deep"
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

              {/* Enlarged tree canvas + ground strip (echoes the homepage showcase) */}
              <div className="relative mx-auto w-full max-w-[220px]">
                <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
                  <Image
                    src={src}
                    alt={treeAlt}
                    fill
                    sizes="220px"
                    className="pixelated object-contain object-bottom"
                  />
                </div>
                <div className="relative h-8 w-full" aria-hidden>
                  <Image
                    src="/sprites/Ground.png"
                    alt=""
                    fill
                    sizes="220px"
                    className="pixelated object-cover"
                  />
                </div>
              </div>

              {/* Stage label */}
              <p
                className="mt-3 text-center text-text-muted-light"
                style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
              >
                {stageLabel}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
