"use client";

import { type ReactNode, useCallback } from "react";

import { cn } from "./cn";

/*
 * A sideways-scrolling block (a long command, a docs code line) that shows when more is past an
 * edge: while it can scroll further right it carries `data-fade-end`, and once scrolled away from
 * its start `data-fade-start`. `.site-scroll-fade` in globals.css fades that edge out, so a line cut
 * at the edge reads as deliberate rather than as text that ends mid-word.
 */

/** Finds the element that scrolls, from the one the ref is on. */
type FindArea = (element: HTMLElement) => HTMLElement | null;

const self: FindArea = (element) => element;

/** A pixel of slack: a fractional layout width leaves scrollWidth a hair over clientWidth. */
const SLACK = 1;

/**
 * A callback ref for the scrolling element, or for an ancestor when `find` picks the scroller out
 * of it (a third-party block that takes no ref on its viewport). It keeps the edge attributes in
 * step with scrolling and with size changes of the block or its content (a web font arriving).
 */
export const useScrollFade = <T extends HTMLElement>(find: FindArea = self) =>
  useCallback(
    (element: T | null) => {
      const area = element === null ? null : find(element);
      if (area === null) return;
      const measure = () => {
        area.toggleAttribute("data-fade-start", area.scrollLeft > SLACK);
        area.toggleAttribute("data-fade-end", area.scrollLeft + area.clientWidth < area.scrollWidth - SLACK);
      };
      measure();
      area.addEventListener("scroll", measure, { passive: true });
      const sizes = new ResizeObserver(measure);
      sizes.observe(area);
      for (const child of area.children) sizes.observe(child);
      return () => {
        area.removeEventListener("scroll", measure);
        sizes.disconnect();
      };
    },
    [find],
  );

interface ScrollFadeProps {
  children: ReactNode;
  /** Classes on the scrolling box; it always gets `site-scroll-fade` and sideways scroll. Defaults to none. */
  className?: string;
}

/** A box that scrolls sideways when its content is wider, fading the edge that has more past it. */
export const ScrollFade = ({ children, className }: ScrollFadeProps) => {
  const ref = useScrollFade<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("site-scroll-fade overflow-x-auto overflow-y-hidden", className)}>
      {children}
    </div>
  );
};
