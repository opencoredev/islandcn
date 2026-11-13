"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** The reading line, as a fraction of the window's height from the top. */
const READING_LINE = 0.5;

/** Runs `measure` now and on every scroll or resize, at most once a frame. */
const useOnScroll = (measure: () => void, enabled: boolean) => {
  const latest = useRef(measure);
  latest.current = measure;
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const run = () => {
      frame = 0;
      latest.current();
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(run);
    };
    run();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled]);
};

/** The middle of the window, where a story read down the page takes each step. */
const middleLine = () => window.innerHeight * READING_LINE;

/**
 * Which step of a scroll story sits on the reading line: the last step whose
 * top has crossed it, while the section spans the line. `null` above and below
 * the section, so a story can hand the island back when you scroll past it.
 * Scroll is the only input, so wheel, touch, keys and scrollbar drags all work.
 * `line` gives the reading line in px from the window's top; it defaults to the
 * window's middle.
 */
export const useScrollStep = (enabled: boolean, line: () => number = middleLine) => {
  const section = useRef<HTMLElement | null>(null);
  const steps = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const lineRef = useRef(line);
  lineRef.current = line;

  useOnScroll(() => {
    const root = section.current;
    if (!root) return;
    const line = lineRef.current();
    const box = root.getBoundingClientRect();
    if (box.top > line || box.bottom < line) {
      setActive(null);
      return;
    }
    let current: number | null = null;
    for (const [index, step] of steps.current.entries()) {
      if (step && step.getBoundingClientRect().top <= line) current = index;
    }
    setActive(current);
  }, enabled);

  useEffect(() => {
    if (!enabled) setActive(null);
  }, [enabled]);

  const stepRef = useCallback(
    (index: number) => (element: HTMLElement | null) => {
      steps.current[index] = element;
    },
    [],
  );

  return { section, stepRef, active };
};

/** The header row's lower edge, where anything scrolling up starts to fade (as `.site-exit-fade` does). */
const HEADER_EDGE = 64;

/** The longest stretch a fade runs over (`--site-exit-span` in globals.css). */
const EXIT_SPAN = 240;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** About t cubed, as `--site-exit-ease`: clear for most of the run, then quickly gone. */
const easeIn = (t: number) => t * t * t;

/**
 * Fades `block` the way `.site-exit-fade` does, for a block inside a sticky frame, where a view
 * timeline would see it under the header while the frame is stuck: nothing until its top reaches
 * the header's edge, then out over its own height (at most `EXIT_SPAN`). While the frame is stuck
 * (`lifting` false) it is left alone.
 */
const fadeAtHeader = (block: HTMLElement | null, lifting: boolean) => {
  if (!block) return;
  if (!lifting) {
    block.style.opacity = "";
    return;
  }
  const box = block.getBoundingClientRect();
  const under = HEADER_EDGE - box.top;
  block.style.opacity = under <= 0 ? "" : String(1 - easeIn(clamp01(under / Math.min(box.height, EXIT_SPAN))));
};

/**
 * How far the window has scrolled through a tall section with a sticky child,
 * from 0 (the section's top at the window's top) to 1 (its bottom at the
 * window's bottom). Once the sticky child comes unstuck and rises, `copy` fades
 * as it goes under the header (`fadeAtHeader`), the whole block at once.
 */
export const useScrollProgress = (enabled: boolean) => {
  const section = useRef<HTMLElement | null>(null);
  const copy = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useOnScroll(() => {
    const root = section.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const travel = box.height - window.innerHeight;
    setProgress(travel <= 0 ? 0 : Math.min(1, Math.max(0, -box.top / travel)));
    fadeAtHeader(copy.current, window.innerHeight - box.bottom > 0.5);
  }, enabled);

  useEffect(() => {
    if (!enabled && copy.current) copy.current.style.opacity = "";
  }, [enabled]);

  return { section, copy, progress };
};
