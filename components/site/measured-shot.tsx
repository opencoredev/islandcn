"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MEASURED } from "@/constants/island";
import { type IslandPresentation, IslandView, colourLuma, islandMetrics, islandMotion, keylineAlphaFor } from "@/lib/island";

import { cn } from "./cn";
import { scaledMetrics } from "./scaled-metrics";
import { useReducedMotion } from "./use-reduced-motion";
import { useScrollProgress } from "./use-scroll-story";
import { SITE_BACKDROP, useSiteTheme } from "./use-site-theme";

/*
 * The product shot: the island drawn large, from the same engine, stepping
 * through idle, compact and the split on its measured springs as you scroll.
 * It shows the reference app's own content (an orange circle and "42", a blue
 * one and "7"), which is what the numbers beside it were measured with.
 *
 * The large island is the real renderer with every length in its metrics
 * scaled up, so it is laid out at the larger size and stays sharp. With
 * reduced motion the section is short and a picker chooses the state.
 */

const STATES = ["idle", "compact", "split"] as const;
type ShotState = (typeof STATES)[number];

const Circle = ({ color, scale }: { color: string; scale: number }) => (
  <span aria-hidden style={{ display: "block", width: 22 * scale, height: 22 * scale, borderRadius: "50%", background: color }} />
);
/**
 * The reference's "42" sets 19.08 pt wide in SF (what the measured 156.85 pt pill leaves for it
 * after the engine's paddings). Other fonts set it a few tenths wider or narrower, which would draw
 * a pill that disagrees with the number printed under it, so the figure takes that width whatever
 * the font; the text is centred in it. Other figures keep their own width.
 */
const FIGURE_WIDTH: Readonly<Record<string, number>> = { "42": 19.08 };

const Figure = ({ children, scale }: { children: string; scale: number }) => {
  const width = FIGURE_WIDTH[children];
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: width === undefined ? undefined : width * scale,
        textAlign: "center",
        color: "#fff",
        fontSize: 15 * scale,
        fontWeight: 600,
        lineHeight: 1.15,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

/** The reference app's content at `scale`: plain shapes in its own colours (reference/ios-sample). */
const presentationFor = (state: ShotState, scale: number): IslandPresentation => {
  const primary = { leading: <Circle color="#FF9500" scale={scale} />, trailing: <Figure scale={scale}>42</Figure> };
  const secondary = { leading: <Circle color="#0A84FF" scale={scale} />, trailing: <Figure scale={scale}>7</Figure> };
  switch (state) {
    case "idle":
      return { kind: "idle" };
    case "compact":
      return { kind: "compact", ...primary };
    case "split":
      return { kind: "minimal", attached: primary.leading, detached: secondary.leading, split: { attached: primary, detached: secondary } };
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
};

interface Fact {
  label: string;
  value: string;
  unit: string;
}

const { idle, top, compact, minimal, keyline } = islandMetrics;
const { shape } = islandMotion;
const springFact = (spring: { response: number; dampingFraction: number }): Fact => ({
  label: "Spring",
  value: `${spring.response} / ${spring.dampingFraction}`,
  unit: "response, damping",
});

const STATE_INFO = {
  idle: {
    label: "Idle",
    facts: [
      { label: "Size", value: `${idle.width} × ${idle.height}`, unit: "pt" },
      { label: "From the top", value: `${top}`, unit: "pt" },
      springFact(shape.dismiss),
    ],
  },
  compact: {
    label: "Compact",
    facts: [
      { label: "Size", value: `${MEASURED.compact.width} × ${compact.height}`, unit: "pt" },
      { label: "Corner radius", value: (compact.height / 2).toFixed(2), unit: "pt" },
      springFact(shape.appear),
    ],
  },
  split: {
    label: "Split",
    facts: [
      { label: "Pill and bubble", value: `${MEASURED.split.pill} + ${MEASURED.split.bubble}`, unit: "pt" },
      { label: "Gap", value: `${minimal.gap}`, unit: "pt" },
      springFact(shape.split),
    ],
  },
} as const satisfies Record<ShotState, { label: string; facts: readonly Fact[] }>;

/**
 * The split is wider on the right than the left: the pill ends at the sensor's right edge and grows
 * left (109.4 pt), the bubble ends 117.4 pt right of centre. Under a centred heading that read as
 * off-centre, so the split figure moves left by half the difference. Pill and bubble keep their
 * true positions relative to each other; only the pair is centred.
 */
const SPLIT_RIGHT = idle.width / 2 + MEASURED.split.gap + MEASURED.split.bubble;
const SPLIT_LEFT = MEASURED.split.pill - idle.width / 2;
const SPLIT_CENTRING = (SPLIT_RIGHT - SPLIT_LEFT) / 2;
/** The centring follows the split's own spring time, roughly: it settles in about half a second. */
const CENTRING_EASE = "transform 520ms cubic-bezier(0.32, 0.72, 0, 1)";

/** Half the widest state (the split), measured from the screen's centre: its bubble ends 117.4 pt right of it. */
const HALF_SPAN = 120;
/** How long the idle ring waits on the way back to idle: about the dismiss spring's time to reach the idle size. */
const IDLE_RING_DELAY_MS = 380;
/** The pill's top gap, its height and the same gap below. */
const STAGE_HEIGHT = top * 2 + compact.height;
const MAX_SCALE = 5.5;
/** Everything in the sticky shot but the island, at its tallest: header, title, picker, numbers and the gaps. */
const SHOT_CHROME = 600;

/**
 * The largest scale, up to 5.5x, at which the split's span fits the column and
 * the whole shot (title, island, picker, numbers) fits the window. Whole
 * hundredths, so a resize doesn't re-lay the island out on every pixel.
 */
const fitScale = ({ width, height }: { width: number; height: number }) => {
  const byWidth = width / (HALF_SPAN * 2);
  const byHeight = (height - SHOT_CHROME) / STAGE_HEIGHT;
  return Math.round(Math.max(1, Math.min(MAX_SCALE, byWidth, byHeight)) * 100) / 100;
};

/** The large island. */
const Shot = ({ state, reduced }: { state: ShotState; reduced: boolean }) => {
  const frame = useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = useState<{ width: number; height: number } | null>(null);
  const theme = useSiteTheme();

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => setRoom({ width: element.clientWidth, height: window.innerHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const scale = room === null ? null : fitScale(room);
  const ringAlpha = keylineAlphaFor(colourLuma(SITE_BACKDROP[theme]) ?? 1, islandMetrics);
  const metrics = useMemo(() => (scale === null ? undefined : scaledMetrics(scale)), [scale]);

  return (
    // It fades out quickly once it reaches the header (`site-exit-fade` over 96 px): the black shape
    // passing under the header whole showed as a dark band behind the wordmark and the nav.
    <div ref={frame} className="site-exit-fade relative w-full [--site-exit-span:96px]" style={{ height: STAGE_HEIGHT * (scale ?? 4) }}>
      {/*
       * On the black page the idle island is black on black, as the hardware is. A soft light
       * behind the shot gives it a silhouette, the way a product is lit on a dark stage.
       *
       * Every state carries the measured keyline, scaled with everything else: 1.5 pt of white at
       * the strength the simulator measured over this page (0.16 over black, none on the white
       * page). The engine draws it on compact and split; idle has none on the hardware, where the
       * cutout is the island, so the same ring is drawn here around the idle shape. Otherwise the
       * idle edge fell from the light to black in one pixel and the shape had no outline at all.
       */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -inset-y-1/2 hidden bg-[radial-gradient(closest-side,rgb(255_255_255/0.14),transparent)] dark:block"
      />
      {scale === null ? null : (
        <div
          className="absolute inset-0"
          style={{
            transform: state === "split" ? `translateX(${-SPLIT_CENTRING * scale}px)` : undefined,
            transition: reduced ? undefined : CENTRING_EASE,
          }}
        >
          {ringAlpha > 0 ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 rounded-full"
              style={{
                top: top * scale,
                width: idle.width * scale,
                height: idle.height * scale,
                marginLeft: (-idle.width * scale) / 2,
                boxShadow: `0 0 0 ${(keyline.width * scale).toFixed(2)}px rgb(255 255 255 / ${ringAlpha})`,
                opacity: state === "idle" ? 1 : 0,
                // Leaving idle it goes at once, as the engine's ring grows in with the pill; back at idle it waits for the pill to shrink to it.
                transition: reduced ? undefined : `opacity 200ms ease-out ${state === "idle" ? IDLE_RING_DELAY_MS : 0}ms`,
              }}
            />
          ) : null}
          <IslandView
            presentation={presentationFor(state, scale)}
            contentKey={state}
            metrics={metrics}
            label="The island, drawn large"
            liveLabel={`${STATE_INFO[state].label} island`}
            keyline="auto"
            backdrop={SITE_BACKDROP[theme]}
          />
        </div>
      )}
    </div>
  );
};

const Facts = ({ state }: { state: ShotState }) => (
  <dl className="mx-auto grid w-full max-w-[1040px] grid-cols-1 text-left sm:grid-cols-3 sm:gap-x-10">
    {STATE_INFO[state].facts.map((fact) => (
      // On a phone every row is the same: label on the left, value on the right with its unit as a
      // small caption under it, so "pt" and "response, damping" never push the value out of line.
      // Each fact fades out as a whole once it reaches the header (`site-exit-fade`), so a unit line never peeks out under it with its value gone.
      // It is gone after its first 40 px under the header: over its whole height, scrolled to the page's
      // end, the facts rested at 55 % with their unit lines just under the header (council 21).
      <div key={fact.label} className="site-exit-fade flex [--site-exit-span:40px] items-start justify-between gap-4 border-t border-site-line py-3 sm:flex-col sm:justify-start sm:gap-1 sm:pt-4">
        <dt className="pt-1.5 text-caption text-site-muted sm:pt-0">{fact.label}</dt>
        <dd className="flex flex-col items-end gap-0.5 text-right sm:items-start sm:text-left">
          <span className="text-title whitespace-nowrap tabular-nums">{fact.value}</span>
          <span className="text-[12px] leading-4 whitespace-nowrap text-site-muted sm:text-caption">{fact.unit}</span>
        </dd>
      </div>
    ))}
  </dl>
);

/** Which state shows, as a segmented control. While scrolling drives the shot, picking a state scrolls to it. */
const StatePicker = ({ state, onPick }: { state: ShotState; onPick: (state: ShotState) => void }) => (
  <div role="radiogroup" aria-label="Island state" className="site-exit-fade inline-flex rounded-full bg-site-fill p-1">
    {STATES.map((option) => {
      const selected = option === state;
      return (
        <label
          key={option}
          className={cn(
            "grid h-8 min-w-[5.5rem] cursor-pointer place-items-center rounded-full px-3 text-[14px] transition-[background-color,color,box-shadow] duration-200 ease-out",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-site-focus",
            selected ? "bg-site-raised text-site-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-site-muted hover:text-site-ink",
          )}
        >
          <input type="radio" name="measured-state" value={option} checked={selected} onChange={() => onPick(option)} className="sr-only" />
          {STATE_INFO[option].label}
        </label>
      );
    })}
  </div>
);

/** The scroll progress at the middle of each state's stretch. */
const STATE_PROGRESS = { idle: 0.15, compact: 0.47, split: 0.82 } as const satisfies Record<ShotState, number>;

const stateAt = (progress: number): ShotState => (progress < 0.3 ? "idle" : progress < 0.64 ? "compact" : "split");

export const MeasuredShot = () => {
  const reduced = useReducedMotion();
  const scrolling = reduced === false;
  // The heading and lede fade together as the frame lifts away at the section's end and they go under the header.
  const { section, copy, progress } = useScrollProgress(scrolling);
  const [picked, setPicked] = useState<ShotState>("compact");
  const state = scrolling ? stateAt(progress) : picked;

  return (
    <section ref={section} aria-labelledby="measured-title" className={cn(scrolling ? "h-[300svh]" : "py-32")}>
      {/*
       * Centred while it fits; on a short window (375 x 667) centring pushed the heading up under the
       * header, so the frame's content starts under the header and runs down instead (`safe center`).
       */}
      <div className={cn(scrolling && "sticky top-0 flex h-svh flex-col pt-16 [justify-content:safe_center]")}>
        <div className="mx-auto flex w-full max-w-[1320px] flex-col items-center gap-10 px-5 text-center sm:gap-12 sm:px-8">
          <div ref={copy} className="flex flex-col items-center gap-4">
            <h2 id="measured-title" className="text-headline text-balance">
              Measured against the real thing.
            </h2>
            <p className="max-w-[36rem] text-lede text-balance text-site-muted">
              Every size, gap and spring is fitted frame by frame to recordings of the real island.{" "}
              <span className="text-site-ink">Here it is, drawn large.</span>
            </p>
          </div>
          <Shot state={state} reduced={!scrolling} />
          <StatePicker
            state={state}
            onPick={(next) => {
              const root = section.current;
              if (!scrolling || !root) {
                setPicked(next);
                return;
              }
              const travel = root.offsetHeight - window.innerHeight;
              window.scrollTo({ top: root.offsetTop + travel * STATE_PROGRESS[next], behavior: "smooth" });
            }}
          />
          <Facts state={state} />
        </div>
      </div>
    </section>
  );
};
