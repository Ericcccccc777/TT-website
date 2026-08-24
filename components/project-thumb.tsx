"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A project's picture in its frame — or nothing at all.
 *
 * **The frame lives inside this component, not around it.** That is the whole
 * point of the file. `docs/features/project-showcase.md` requires a picture that
 * cannot be loaded to leave the text standing alone: no gap, no broken-picture
 * icon, exactly what a player with no picture gets. A caller that drew the
 * frame itself and put an image inside would be left holding an empty box when
 * the load failed — which is the gap the spec forbids.
 *
 * Why this has to be a client component: Storage answers a missing object with
 * HTTP 400 rather than 404, so there is nothing useful to check ahead of time
 * from the server. The load either happens or it does not, and `onError` is the
 * only honest signal there is.
 *
 * A picture goes missing for real reasons — a player removed it and the removal
 * half-completed — and for boring ones — the visitor's connection faltered. In
 * both cases the honest thing to show is what we do have.
 */
export function ProjectThumb({
  src,
  size,
  className = "",
}: {
  src: string;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-[2px] ${className}`}
      style={{
        width: size,
        height: size,
        border: "1px solid var(--color-soil)",
        background: "var(--color-surface-parchment)",
      }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-full w-full"
        style={{ objectFit: "cover" }}
        aria-hidden
        onError={() => setFailed(true)}
      />
    </div>
  );
}
