"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny cross-island store binding the showcase's selected skin to the
 * scroll-progress HUD (separate client islands — no shared context root).
 * The showcase writes via setTreeSkin(); the HUD reads via useTreeSkin().
 */

export type TreeSkinId = "apple" | "cherry" | "cactus";

let current: TreeSkinId = "apple";
const listeners = new Set<() => void>();

export function setTreeSkin(skin: TreeSkinId) {
  if (skin === current) return;
  current = skin;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => current;
const getServerSnapshot = (): TreeSkinId => "apple";

export function useTreeSkin(): TreeSkinId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
