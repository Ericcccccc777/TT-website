"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Fraction of the element that must be visible to count as in view. */
  threshold?: number;
  /** IntersectionObserver rootMargin, e.g. "0px 0px -10% 0px". */
  rootMargin?: string;
  /** Stop observing after the first time the element enters the viewport. */
  once?: boolean;
}

/**
 * Thin IntersectionObserver wrapper — the site's single scroll-trigger
 * primitive (scroll-*scrubbing* stays on CSS `animation-timeline`; this is
 * for one-shot narrative triggers and offscreen freezing).
 *
 * SSR-safe: `inView` is false on the server and until the observer fires,
 * so server HTML must always be the final, fully-visible state.
 */
export function useInView<T extends HTMLElement>({
  threshold = 0.3,
  rootMargin = "0px",
  once = false,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView] as const;
}
