"use client";

import { useInView } from "@/hooks/use-in-view";

/**
 * Freezes every CSS animation inside while the wrapper is offscreen by
 * toggling the existing `.scene-paused` utility (tree-scene precedent).
 * Children stay server-rendered — this island only owns one class.
 */
export function InViewGate({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.05 });
  return (
    <div ref={ref} className={`${className ?? ""}${inView ? "" : " scene-paused"}`}>
      {children}
    </div>
  );
}
