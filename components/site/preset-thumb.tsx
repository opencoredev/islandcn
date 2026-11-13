"use client";

import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { type IslandPresentation, IslandView, islandMetrics } from "@/lib/island";

import { accentColor, stageContent } from "./playground/activity";
import type { RenderValues } from "./playground/content";
import { type ActivitySpec, type StarterKey, starterBuild } from "./playground/model";

/*
 * A preset's thumbnail in the gallery: the top of a dark phone screen with the
 * preset's compact island on it (its split, for the split preset), drawn by
 * the engine's `IslandView` at real size and scaled down to the tile. The
 * content is the playground's rebuild of the preset, the same one "Edit in the
 * playground" opens.
 *
 * It is a still. The engine measures its content with getBoundingClientRect,
 * which a scaled ancestor shrinks, and it measures again whenever it renders
 * (a theme change, say), so a live island under a scale comes out narrower
 * than its text. So the island draws once at real size, hidden; once its
 * outline has held still, its drawn DOM is copied, the engine unmounts, and the
 * copy is what scales. Eleven thumbnails then cost no engine at all; only the
 * content's own CSS loops (a spinner, a level meter) keep running.
 */

/** The screen the island lays out on, as on the gallery's stage: a phone's width in pt. */
const SCREEN = islandMetrics.screen.width;
/** Air kept around the pill in the crop (pt). */
const AIR = 8;
/**
 * The window of the screen a thumbnail shows (pt): the middle of its top, wide enough for the widest
 * compact preset (the Battery charging pill, 253 pt) with its keyline room, and the pill with `AIR` above and below.
 */
const VIEW = { width: 264, top: islandMetrics.top - AIR, height: Math.ceil(islandMetrics.idle.height + AIR * 2) } as const;
/** The stage colour, the gallery stage's and the playground's dark screen. */
const SCREEN_COLOUR = "#1c1c1e";

/** How long the outline must hold still before the thumbnail scales down (ms): longer than a digit's roll-in. */
const SETTLE_MS = 400;
/** The longest a thumbnail waits to show (ms), should something keep redrawing. */
const SETTLE_CAP_MS = 2500;

/** Values for a still: the timer shows its set time, progress its set value, and buttons do nothing. */
const stillValues = (activity: ActivitySpec): RenderValues => ({
  accent: accentColor(activity),
  progress: activity.progress,
  timer: { kind: "fixed", ms: activity.timer.seconds * 1000 },
  onButton: () => undefined,
});

/** What the thumbnail shows: the compact island, or the split when the preset is two activities. */
const thumbPresentation = (slug: StarterKey): IslandPresentation => {
  const { primary, second } = starterBuild(slug);
  const first = stageContent(primary, stillValues(primary));
  if (second === null) return { kind: "compact", ...first.compact };
  const other = stageContent(second, stillValues(second));
  // The engine's own split scene: both compact pairs, with each one's minimal content as the fallback.
  return {
    kind: "minimal",
    attached: first.minimal ?? first.compact?.leading ?? null,
    detached: other.minimal ?? other.compact?.leading ?? null,
    split: { attached: first.compact ?? {}, detached: other.compact ?? {} },
  };
};

interface PresetThumbProps {
  /** Which preset. Required. */
  slug: StarterKey;
}

export const PresetThumb = ({ slug }: PresetThumbProps) => {
  const frame = useRef<HTMLDivElement | null>(null);
  const screen = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  // The tile is laid out (not under a display: none picker), so the engine can measure what it draws.
  const [shown, setShown] = useState(false);
  // The drawn island, copied once it has settled; null while the engine is still drawing it.
  const [still, setStill] = useState<DocumentFragment | null>(null);
  const island = useMemo(() => <IslandView presentation={thumbPresentation(slug)} reducedMotion="always" keyline="off" label="" />, [slug]);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    // At most real size: a wide tile shows the island as big as on the phone, a narrow one scales it to fit.
    // A width of 0 means the picker is display: none (the playground keeps a grid for wide screens and a
    // strip for phones, and hides one). The engine would measure nothing there and the still would come out
    // an empty pill, so the island only draws while the tile is laid out; a finished still keeps its scale.
    const measure = () => {
      const width = element.clientWidth;
      setShown(width > 0);
      if (width > 0) setScale(Math.min(1, width / VIEW.width));
    };
    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(element);
    return () => sizes.disconnect();
  }, []);

  // Counts from the island's mount, which waits for the tile to be laid out. Hidden mid-draw, the island
  // unmounts and this starts over once the tile shows again, so no still is taken of a hidden island.
  const mounted = scale !== null && shown;
  useEffect(() => {
    const element = screen.current;
    if (!mounted || !element || still !== null) return;
    let live = true;
    let quiet = 0;
    const freeze = () => {
      // Hidden since the last resize report: copy nothing; the tile's next width starts the draw again.
      if (!live || (frame.current?.clientWidth ?? 0) === 0) return;
      const copy = document.createDocumentFragment();
      for (const child of element.childNodes) copy.append(child.cloneNode(true));
      setStill(copy);
    };
    // Every outline the engine draws is a new `d` on its paths; a quiet spell means it has come to
    // rest (the digits roll in after the first frame, and the pill follows them).
    const settle = () => {
      window.clearTimeout(quiet);
      quiet = window.setTimeout(freeze, SETTLE_MS);
    };
    const outline = new MutationObserver(settle);
    outline.observe(element, { attributes: true, attributeFilter: ["d"], subtree: true });
    const cap = window.setTimeout(freeze, SETTLE_CAP_MS);
    void document.fonts.ready.then(settle);
    return () => {
      live = false;
      outline.disconnect();
      window.clearTimeout(quiet);
      window.clearTimeout(cap);
    };
  }, [mounted, still]);

  // The copy goes into an element React renders empty, so React never touches what it holds.
  const host = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element || still === null) return;
    element.replaceChildren(still.cloneNode(true));
  }, [still]);

  const screenBox: CSSProperties = { width: SCREEN, height: VIEW.top + VIEW.height, left: "50%" };
  return (
    <div
      ref={frame}
      aria-hidden
      className="relative w-full overflow-hidden rounded-[10px]"
      style={{ height: VIEW.height * (scale ?? 1), background: SCREEN_COLOUR }}
    >
      {scale === null || (still === null && !shown) ? null : still === null ? (
        <div ref={screen} className="invisible absolute top-0" style={{ ...screenBox, transform: `translate(-50%, ${-VIEW.top}px)` }}>
          {island}
        </div>
      ) : (
        // Scaled about the screen's top centre, then lifted so the window's top is the frame's.
        <div
          ref={host}
          className="absolute top-0 origin-top"
          style={{ ...screenBox, transform: `translate(-50%, ${(-VIEW.top * scale).toFixed(3)}px) scale(${scale.toFixed(4)})` }}
        />
      )}
    </div>
  );
};
