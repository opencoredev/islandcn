"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PRESETS } from "@/constants/presets";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/components/site/cn";

import { CustomOrderRun } from "./custom-run";
import { HEADER_SOFT_FOOT } from "./island-clearance";
import { PhoneScreen, SCREEN_HEIGHT, SCREEN_WIDTH, ScreenRun, ScreenStill } from "./phone-screen";
import { PlayButton } from "./play-button";
import type { EverydaySlug } from "./top-island";
import { NARROW } from "./use-narrow";
import { useReducedMotion } from "./use-reduced-motion";
import { useScrollStep } from "./use-scroll-story";
import { SiteLink } from "@/components/site/site-link";

/*
 * The tour of the presets, then the split, then the case for the playground, told on one screen of
 * its own. The names run down the page in big type, and the screen stays beside them (from lg) or
 * under the header (below lg): the name on the reading line lights up and plays on the screen's
 * island, arriving open and settling to compact, again and again until the next name takes over.
 * So the island turns into each preset as its name passes, at real size, in the same band as the
 * name. The page's own island at the top of the window plays nothing here: it leaves with the hero.
 *
 * With reduced motion the names stay lit, the screen holds one preset opened, and each name gets
 * a play button that puts its preset on the screen.
 */

/**
 * Every preset but the split, which gets its own step. Short names, so every step is one line at
 * every width.
 */
type PresetSlug = (typeof PRESETS)[number]["slug"];
type ListedSlug = Exclude<PresetSlug, "split">;
const isListed = (slug: PresetSlug): slug is ListedSlug => slug !== "split";
const SHORT_NAMES: Readonly<Partial<Record<ListedSlug, string>>> = { eta: "Ride ETA" };
const LISTED = PRESETS.flatMap((preset) => {
  const slug = preset.slug;
  return isListed(slug) ? [{ slug, title: SHORT_NAMES[slug] ?? preset.title }] : [];
});

/** What the screen plays at each step: a preset, the split, or the food order no preset ships. */
type TourSlug = EverydaySlug | "custom";

const STEPS: readonly TourSlug[] = [...LISTED.map((preset) => preset.slug), "split", "custom"];

const SPLIT_STEP = LISTED.length;
const CUSTOM_STEP = LISTED.length + 1;

/**
 * Below lg the screen sticks under the header and the names pass under it, so the reading line is
 * under the screen's foot: the name lit is the one right under the screen. A name stays lit for one
 * step's height of scroll (about 110 px on a phone), so the line sits that far down less the step's
 * top padding: a lit name never rises under the screen's soft foot before the next takes over.
 */
const LINE_UNDER_SCREEN = 96;

/** Where the screen sticks from lg: centred on the window, never closer than this to the header's edge (px). */
const WIDE_MIN_TOP = 88;

/** Below lg, where the stuck screen ends: the header (h-16), the lip over it (pt-5) and the screen without its list (px). */
const NARROW_SCREEN_FOOT = 64 + 20 + SCREEN_HEIGHT.search;

/**
 * Below lg, the band under the screen's foot that the names fade out in (px). A name, a line or a
 * button is gone by the time its top reaches the foot, so none is ever sliced by the screen's edge
 * (half-letters of "Incoming call" showed under it).
 */
const NARROW_FADE_BAND = 28;

/**
 * The screen's column width, its stuck place, the names' lead-in from lg, the fade under it below lg,
 * and where copy going up under the header is gone by (`--site-exit-line`), as custom properties.
 */
const TOUR_STYLE: CSSProperties &
  Record<"--tour-screen" | "--tour-top" | "--tour-lead" | "--tour-fade-line" | "--tour-fade-band" | "--site-exit-line", string> = {
  // A name is gone before it reaches the header's soft edge, not under it, where its descenders showed alone.
  "--site-exit-line": `${HEADER_SOFT_FOOT}px`,
  "--tour-fade-line": `${NARROW_SCREEN_FOOT + NARROW_FADE_BAND}px`,
  "--tour-fade-band": `${NARROW_FADE_BAND}px`,
  "--tour-screen": `${SCREEN_WIDTH}px`,
  "--tour-top": `max(${WIDE_MIN_TOP}px, calc(50svh - ${SCREEN_HEIGHT.list / 2}px))`,
  // The first name starts level with the screen's middle, where the reading line is.
  "--tour-lead": `${Math.round(SCREEN_HEIGHT.list / 2 - 48)}px`,
};

interface Run {
  slug: TourSlug;
  run: number;
}

/** Plays `slug` while it is set, restarting each run as it ends. */
const useLoopedRun = (slug: TourSlug | null) => {
  const [run, setRun] = useState<Run | null>(null);
  useEffect(() => setRun(slug === null ? null : { slug, run: 0 }), [slug]);
  // A run can end twice (its driver and its lifetime at the same moment); only the first restarts it.
  const restart = (ended: number) => setRun((current) => (current === null || current.run !== ended ? current : { slug: current.slug, run: current.run + 1 }));
  return { run, restart };
};

/** The foot of the first line of text in `element` (viewport y), or null when it holds none. */
const firstLineFoot = (element: HTMLElement) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.textContent?.trim() === "") continue;
    range.selectNodeContents(node);
    const first = range.getClientRects()[0];
    if (first !== undefined) return first.bottom;
  }
  return null;
};

/**
 * A ref for a tour block that fades as one (a name, a heading and its copy, a play button under it),
 * timed on its first line: `--site-exit-foot` is everything under that line, so the block is gone as the
 * line reaches the header's soft edge. Timed on the whole block, the rows under the first kept it lit
 * while the first line's foot sat in that edge, and a slice of it showed under the header (council 22:
 * the "p" of "Upload"; "Ride or" over "delivery ETA"; a heading over its paragraph). `attach` also gets
 * the element, for the scroll story's step refs.
 */
const firstLineFade = (attach: ((element: HTMLElement | null) => void) | null) => (element: HTMLElement | null) => {
  attach?.(element);
  if (element === null) return;
  const measure = () => {
    const foot = firstLineFoot(element);
    if (foot === null) return;
    element.style.setProperty("--site-exit-foot", `${Math.max(0, Math.round(element.getBoundingClientRect().bottom - foot))}px`);
  };
  measure();
  const sizes = new ResizeObserver(measure);
  sizes.observe(element);
  return () => {
    sizes.disconnect();
    attach?.(null);
  };
};

const nameClass = "rounded-[12px] text-headline text-balance transition-colors duration-500 ease-out";

export const PresetChapter = () => {
  const reduced = useReducedMotion();
  const scrolling = reduced === false;
  const screen = useRef<HTMLDivElement | null>(null);
  const line = useCallback(() => {
    const box = screen.current?.getBoundingClientRect();
    if (!box) return window.innerHeight / 2;
    // A screen out of the window plays nothing: the reading line follows the screen, so without this
    // the first step lit (and its run looped) while the tour was still below the hero.
    if (box.bottom <= 0 || box.top >= window.innerHeight) return Number.NEGATIVE_INFINITY;
    return window.matchMedia(NARROW).matches ? box.bottom + LINE_UNDER_SCREEN : box.top + box.height / 2;
  }, []);
  const tour = useScrollStep(scrolling, line);
  // One ref per block, made once, so a re-render doesn't measure every block again.
  const fades = useMemo(() => ({ intro: firstLineFade(null), steps: STEPS.map((_, index) => firstLineFade(tour.stepRef(index))) }), [tour.stepRef]);
  const looping = useLoopedRun(tour.active === null ? null : STEPS[tour.active] ?? null);
  // With reduced motion, what the screen holds: the first preset until a play button picks another.
  const [held, setHeld] = useState<{ slug: TourSlug; run: number } | null>({ slug: "upload", run: 0 });
  const hold = (slug: TourSlug) => setHeld((current) => ({ slug, run: (current?.run ?? 0) + 1 }));

  const lit = (index: number) => !scrolling || tour.active === index;
  const playButton = (slug: TourSlug) =>
    reduced === true ? (
      <PlayButton className="mt-5" onPress={() => hold(slug)}>
        Run it on the screen
      </PlayButton>
    ) : null;

  const playing = scrolling ? looping.run : null;
  const still = reduced === true ? held : null;

  return (
    <section
      aria-labelledby="presets-title"
      className="mx-auto max-w-[1120px] px-5 pt-32 sm:px-8 lg:pb-[20svh]"
      style={TOUR_STYLE}
    >
      <div ref={fades.intro} className="site-exit-fade mx-auto flex max-w-[44rem] flex-col items-center gap-5 pb-12 text-center lg:pb-16">
        <h2 id="presets-title" className="text-headline text-balance">
          Made for what apps do.
        </h2>
        <p className="max-w-[32rem] text-lede text-balance text-site-muted">
          Each preset is one file. Install it as it is, or open it in the playground and change anything.
        </p>
      </div>

      <div
        ref={(element) => {
          tour.section.current = element;
        }}
        className="relative flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_var(--tour-screen)] lg:gap-x-16">
        {/*
         * The screen. Below lg it sticks under the header and runs edge to edge on a phone, with a soft
         * foot in the page's colour so the names slide under it instead of being cut at its edge. It
         * sits 20 px below the header on a lip in the page's colour: the header's own soft edge is 20 px
         * deep, and right under the header it washed out the top of the island. When the tour ends it fades
         * as it goes up under the header (`site-tour-stage-exit`), so no strip of it is left there. From lg
         * it sticks beside the names, centred on the window, and fades once it reaches the header.
         */}
        <div data-tour-stage className="sticky top-16 z-10 -mx-5 bg-site-bg pt-5 sm:mx-auto sm:w-full sm:max-w-(--tour-screen) site-exit-fade-lg site-tour-stage-exit lg:top-(--tour-top) lg:col-start-2 lg:row-start-1 lg:mx-0 lg:self-start lg:bg-transparent lg:pt-0">
          <PhoneScreen screenRef={screen} label="islandcn preset tour" list="lg" className="w-full sm:rounded-[14px]">
            {playing === null ? null : playing.slug === "custom" ? (
              <CustomOrderRun run={playing.run} onFinish={() => looping.restart(playing.run)} />
            ) : (
              <ScreenRun slug={playing.slug} run={playing.run} onFinish={() => looping.restart(playing.run)} />
            )}
            {still === null ? null : still.slug === "custom" ? (
              <CustomOrderRun run={still.run} onFinish={() => setHeld(null)} />
            ) : (
              <ScreenStill key={`${still.slug}-${still.run}`} slug={still.slug} />
            )}
          </PhoneScreen>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-site-bg to-transparent lg:hidden" />
        </div>

        {/*
         * From lg the names' column has no room under its last step: the cell, and so the screen's sticky range,
         * ends at the playground button, and the screen goes up with that step's text. With the room inside the
         * cell the screen stayed pinned beside an empty column for a screen's height after the text had gone
         * (council 27, 1512x982 at scroll 3600). The section keeps the room instead.
         */}
        <div className="flex flex-col items-center pt-4 pb-[16svh] text-center lg:col-start-1 lg:row-start-1 lg:items-start lg:pt-(--tour-lead) lg:pb-0 lg:text-left">
          <ol aria-label="Presets" className="flex w-full flex-col items-center lg:items-start">
            {LISTED.map((preset, index) => (
              <li key={preset.slug} ref={fades.steps[index]} className="site-exit-fade site-tour-step flex flex-col items-center py-[4svh] lg:items-start lg:py-[3.5svh]">
                <SiteLink
                  href={`${ROUTES.DOCS}/presets/${preset.slug}`}
                  className={cn(nameClass, "hover:text-site-ink", lit(index) ? "text-site-ink" : "text-site-muted")}
                >
                  {preset.title}
                </SiteLink>
                {playButton(preset.slug)}
              </li>
            ))}
          </ol>

          {/*
           * Below lg the split's step ends right under its caption and the playground's step starts 40 px above its
           * heading, so the screen turns to the food order while the caption is still fading under the screen's
           * foot and the heading is right under it. With 4svh under the caption and 8svh over the heading, the
           * caption was gone a step early: for 40 px of scroll the screen still split while "Shaped around your
           * app." was the only text to read, the caption a ghost under the screen (council 27, 390x844 at 2300).
           */}
          <div ref={fades.steps[SPLIT_STEP]} className="site-exit-fade site-tour-step flex flex-col items-center gap-4 pt-[4svh] pb-1.5 lg:items-start lg:py-[5svh]">
            <h2 id="split-title" className={cn(nameClass, lit(SPLIT_STEP) ? "text-site-ink" : "text-site-muted")}>
              Two at once.
            </h2>
            <p className="max-w-[30rem] text-lede text-balance text-site-muted">
              A second activity splits the island. The first keeps the pill, the second gets a bubble beside it.
            </p>
            {playButton("split")}
          </div>

          {/* One block, so it fades as one: faded line by line, its button was left alone on the page. */}
          <div ref={fades.steps[CUSTOM_STEP]} className="site-exit-fade site-tour-step flex flex-col items-center gap-4 pt-10 lg:items-start lg:pt-[8svh]">
            <h2 id="playground-title" className={cn(nameClass, "max-w-[12em]", lit(CUSTOM_STEP) ? "text-site-ink" : "text-site-muted")}>
              Shaped around your app.
            </h2>
            <p className="max-w-[30rem] text-lede text-balance text-site-muted">
              No preset ships a pizza order. This one was built in the playground: pick what each region shows, wire
              the buttons to your own actions, copy the code.
            </p>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
              <SiteLink
                href={ROUTES.PLAYGROUND}
                className="inline-flex h-12 items-center rounded-full bg-site-ink px-6 text-[17px] font-medium text-site-bg transition-[scale,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.96]"
              >
                Open the playground
              </SiteLink>
              {reduced === true ? (
                <PlayButton onPress={() => hold("custom")}>Run it on the screen</PlayButton>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
