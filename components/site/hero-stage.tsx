"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "./cn";
import { PhoneScreen, ScreenRun, ScreenStill } from "./phone-screen";
import { useCoverPageIsland } from "./site-island";
import type { EverydaySlug } from "./top-island";
import { useReducedMotion } from "./use-reduced-motion";

/*
 * The hero's product shot: a crop of the top of an app's screen, with the real
 * island at real size and at its real place. Each activity arrives the way a
 * new live activity does, opened to its expanded view long enough to read, then
 * settles to compact just before the next one comes in. The first screen opens
 * on music, the fullest expanded view, so the component reads at its real
 * weight before any copy.
 *
 * The screen is an app, so the island has something to sit on (`PhoneScreen`):
 * a status bar, then a plain list app of our own under it, which an expanded
 * island opens over with its shadow. On a phone it shows the same two rows as
 * on a wide screen, whole under the tallest expanded view.
 *
 * It has its own provider, so the window's island stays idle while it plays,
 * and the window's island hides while this screen is on show (see
 * `useCoverPageIsland`): one island at a time. It plays only while the hero
 * is on screen. With reduced motion nothing plays by itself: the screen holds
 * one activity, opened, and the pills under it swap in another.
 *
 * Every collapse narrows to about idle width and shows an empty pill for about
 * 0.3 s before the compact view widens back in. That is the simulator's own
 * collapse (reference/MEASUREMENTS.md, "collapse": width undershoots to 104.8 at
 * +0.33 s, compact content from +0.40 s), not a hand-off through idle: the
 * island goes from expanded to compact in one change. Likewise a new activity
 * opening over the last one's compact view runs the engine's `swap`, which
 * passes near idle the way the measured `swap` does.
 */

const CYCLE = ["now-playing", "upload", "eta", "incoming-call", "timer", "transfer", "battery", "split"] as const satisfies readonly EverydaySlug[];

type HeroSlug = (typeof CYCLE)[number];

const NAMES = {
  upload: "Upload",
  "now-playing": "Now playing",
  eta: "Ride",
  "incoming-call": "Incoming call",
  timer: "Timer",
  transfer: "Transfer",
  battery: "Battery",
  split: "Two at once",
} as const satisfies Record<HeroSlug, string>;

/** The share of the stage that has to be visible for it to play. */
const VISIBLE = 0.4;

/** The header row the stage scrolls under (h-16): the page's island returns once the stage is behind it. */
const HEADER_HEIGHT = 64;

export const HeroStage = () => {
  const stage = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  // The hero opens the page, so it plays from the first commit; the observer stops it once it scrolls away.
  const [visible, setVisible] = useState(true);
  // Starts covered: the hero is the first thing on the page, so the page's island waits from the first paint.
  const [onScreen, setOnScreen] = useState(true);
  const [step, setStep] = useState(0);
  // With reduced motion, the activity held on the screen; the first one until a pill picks another.
  const [picked, setPicked] = useState(0);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const playing = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting === true), { threshold: VISIBLE });
    // Any part of the stage below the header counts as on screen.
    const showing = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting === true), {
      rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px`,
    });
    playing.observe(element);
    showing.observe(element);
    return () => {
      playing.disconnect();
      showing.disconnect();
    };
  }, []);

  useCoverPageIsland(onScreen);

  const autoplay = visible && reduced === false;
  const index = reduced === true ? picked : step % CYCLE.length;
  const slug = CYCLE[index] ?? null;
  const playing = slug !== null && autoplay;
  // Reduced motion holds a still from the first paint after hydration, on screen or not: nothing in it moves by itself.
  const still = slug !== null && reduced === true;

  // A run can end twice (its driver and its lifetime at the same moment); only the first one moves on.
  const finish = (run: number) => setStep((value) => (value === run ? value + 1 : value));

  const pick = (at: number) => {
    if (reduced === true) setPicked(at);
    // Always forward, so the run key changes even when the same activity is picked again.
    else setStep((value) => value - (value % CYCLE.length) + CYCLE.length + at);
  };

  return (
    <figure className="flex w-full flex-col items-center gap-3 sm:gap-4">
      <PhoneScreen
        screenRef={stage}
        label="islandcn demo"
        // The list shows at every width: on a phone it ended at the search field, and the island sat on it with nothing of the app under.
        list="always"
        // `site-hero-exit`: a tall card of colour, so it fades faster than copy once it reaches the header.
        className="site-hero-exit w-[calc(100%+2.5rem)] sm:w-full sm:max-w-(--screen-width) sm:rounded-[14px]"
      >
        {playing && slug !== null ? <ScreenRun slug={slug} run={step} onFinish={() => finish(step)} /> : null}
        {still && slug !== null ? <ScreenStill slug={slug} /> : null}
      </PhoneScreen>
      <figcaption className="site-exit-fade flex w-full flex-col items-center gap-2.5 pt-1">
        {/*
         * The name of what is playing, then one small pill per activity, the current one stretched
         * like a compact island. It reads like a carousel's page dots, not a row of tags (the nine
         * named chips that were here read as a template's filter bar). Each pill is a button with
         * the activity's name, so it still picks one.
         */}
        <p aria-live="polite" className="text-[13px] font-medium text-site-muted">
          {slug === null ? null : NAMES[slug]}
        </p>
        <div role="group" aria-label="Play an activity" className="flex items-center">
          {CYCLE.map((name, at) => {
            const current = index === at;
            return (
              <button
                key={name}
                type="button"
                aria-label={NAMES[name]}
                aria-pressed={current}
                onClick={() => pick(at)}
                className="group grid h-8 cursor-pointer place-items-center px-1 outline-offset-2"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none",
                    current ? "w-5 bg-site-ink" : "w-2 bg-site-muted/40 group-hover:bg-site-muted",
                  )}
                />
              </button>
            );
          })}
        </div>
      </figcaption>
    </figure>
  );
};
