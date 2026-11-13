"use client";

import { useSyncExternalStore } from "react";

/**
 * Below lg. There the header row holds only the mark and the menu, and an open island would span
 * the whole row, so the page island only ever shows compact and split views (see `IslandClearance`).
 */
export const NARROW = "(max-width: 1023.98px)";

const subscribeNarrow = (onChange: () => void) => {
  const media = window.matchMedia(NARROW);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

/** Whether the window is below lg. The server answers no. */
export const useNarrow = () =>
  useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
