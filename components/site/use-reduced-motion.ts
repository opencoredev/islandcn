"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

/**
 * The visitor's reduced-motion setting. `null` until hydration, because the
 * server can't know it: demos wait for a real answer instead of starting a
 * loop for one frame and then stopping it.
 */
export const useReducedMotion = (): boolean | null =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null,
  );
