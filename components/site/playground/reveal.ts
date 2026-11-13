"use client";

import { useEffect, useRef } from "react";

/*
 * A control that opens in place in the inspector (the icon grid, a disclosure, the full share link)
 * can open past the window's foot, where only a sliver of it showed (council 25). Opening one
 * scrolls the page just far enough that all of it shows, but never so far that the control's own
 * label goes up under the header (or, on a phone, under the pinned strip): what you pressed stays
 * in view, and a part taller than the window shows from its top.
 */

/** Room kept between what opened and the window's foot, and between its top and what covers the page's top (px). */
const REVEAL_AIR = 16;
/** The site header's height (px): it covers the page's top when nothing else does. */
const HEADER_PX = 64;

/** Where the page's top stops being covered: under the header, or under the phone's pinned strip. */
const coveredTop = () => {
  // The dock's foot line (playground.tsx): on a phone it marks the foot of the stage or the strip.
  const foot = document.querySelector<HTMLElement>("[data-pg-dock-foot]");
  const strip = foot !== null && foot.offsetParent !== null ? foot.getBoundingClientRect().bottom : 0;
  return Math.max(HEADER_PX, strip);
};

const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The span to bring into view, in viewport px: from the label that must stay in view to the foot of what opened. */
export interface RevealSpan {
  top: number;
  bottom: number;
}

/** Scrolls the page up by as much as `span` runs past the window's foot, keeping its top clear of the header. */
export const revealSpan = ({ top, bottom }: RevealSpan) => {
  const over = bottom + REVEAL_AIR - window.innerHeight;
  if (over <= 0) return;
  const room = top - coveredTop() - REVEAL_AIR;
  const by = Math.min(over, room);
  if (by < 1) return;
  window.scrollBy({ top: Math.round(by), behavior: prefersReduced() ? "auto" : "smooth" });
};

/**
 * Calls `measure` once each time `open` turns true (not on mount) and reveals the span it returns.
 * It runs after the commit, so `measure` sees the opened content laid out; content that eases open
 * should report its final foot, not its current one.
 */
export const useRevealOnOpen = (open: boolean, measure: () => RevealSpan | null) => {
  const was = useRef(open);
  const latest = useRef(measure);
  useEffect(() => {
    latest.current = measure;
  });
  useEffect(() => {
    const opened = open && !was.current;
    was.current = open;
    if (!opened) return;
    const span = latest.current();
    if (span !== null) revealSpan(span);
  }, [open]);
};
