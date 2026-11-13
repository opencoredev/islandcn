"use client";

import { Calendar03Icon, File01Icon, Search01Icon, ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { type CSSProperties, type ReactNode, type Ref, type RefObject, useEffect, useRef } from "react";

import { Island, IslandProvider, islandMetrics, useIsland, useIslandActions } from "@/lib/island";

import { cn } from "./cn";
import { Icon } from "./icon";
import { type EverydaySlug, TopIslandRun, TopIslandStill } from "./top-island";
import { type SiteTheme, useSiteTheme } from "./use-site-theme";

/*
 * The top of an app's screen with the real island at real size and at its real place: a status bar
 * with the time and the battery in its ears, then a plain list app of our own under it. The home
 * hero plays everyday activities on one, and the preset tour plays each preset on another. The bar
 * takes the app's surface, as on a phone: white with dark type on the light page, so the black
 * island reads as an object over the app; black on the dark page, where the island's keyline parts
 * it from the bar. Nothing in it is a real app, a device frame or system artwork. Each screen has
 * its own provider, so it never shares a stack with the page's island.
 */

/**
 * The tallest expanded view a screen plays: now playing with its transport row, 180 px since the
 * player was matched to the reference (the ride with its Message capsule is 155, ICN-9).
 */
const TALLEST_EXPANDED = 180;

/** Room beside the phone-wide column on wide screens, so the screen reads as a crop and not as a device. */
const SIDE = 28;

/** The status bar: the idle island at its real top and 9 px under it, as tall as the island's ears. */
const STATUS_BAR = Math.ceil(islandMetrics.top + islandMetrics.idle.height + 9);

/**
 * The shortest expanded view a screen plays: the 84 pt rows of the incoming call and the recording
 * (the timer is 88.5). The battery no longer opens: the charging pill stays compact (ICN-9).
 */
const SHORTEST_EXPANDED = 84;

/**
 * Where the app's large title ends: 4 px above the shortest expanded view's lower edge, so every
 * expanded view covers the whole title, the way it covers the status bar, and none cuts it.
 */
const TITLE_END = Math.floor(islandMetrics.expanded.top + SHORTEST_EXPANDED - 4);

/**
 * Where the app's first control may start: under the tallest expanded view, with 10 px of air.
 * Between the title and here the app is blank, so an island of any height ends over empty
 * background; a search field there was cut by the island's lower edge into a sliver.
 */
const APP_CLEAR = Math.ceil(islandMetrics.expanded.top + TALLEST_EXPANDED + 10);

/**
 * The status bar's colour per page theme (`--bar-bg` on the screen), which the island takes as its backdrop.
 * A status bar is see-through, so it is the app's own background (`--app-bg`) in both themes. A black bar
 * over the dark app read as a band the expanded island hung from, not a pill floating on the screen.
 */
const STATUS_BAR_BG = { light: "#ffffff", dark: "#1c1c1e" } as const satisfies Record<SiteTheme, string>;

/** The app list's geometry (px): the search field (`h-9`) and the gap under it (`mt-3`), and one row (`py-2.5`, a 36 px tile, its 1 px rule). */
const APP_LIST = { search: 36, gap: 12, row: 57, rowPad: 10 } as const satisfies Record<string, number>;

/**
 * How much of the app shows under the tallest expanded view. With the list: the air under the
 * island, the search field and two whole rows, ending 6 px into the third row's top padding, so
 * the foot's fade runs over whole rows and the screen's edge never slices a line of text (at 148
 * it cut "Team standup" through its glyphs). Without it: the air and the search field, then the
 * app's own background.
 */
const APP_BELOW = { list: 10 + APP_LIST.search + APP_LIST.gap + 2 * APP_LIST.row + (APP_LIST.rowPad - 4), search: 10 + APP_LIST.search + 14 } as const;

/** The screen's height with the list and with the search field only (px). */
export const SCREEN_HEIGHT = {
  list: Math.ceil(islandMetrics.expanded.top + TALLEST_EXPANDED + APP_BELOW.list),
  search: Math.ceil(islandMetrics.expanded.top + TALLEST_EXPANDED + APP_BELOW.search),
} as const;

/** The screen's width on a wide screen: a phone's plus `SIDE` on each side (px). */
export const SCREEN_WIDTH = islandMetrics.screen.width + 2 * SIDE;

/**
 * The screen is a crop of the top of a phone: its width plus `SIDE` on each side. The engine never
 * lays out wider than a phone, so the extra width is room beside the island, not a wider island.
 */
const SCREEN_STYLE: CSSProperties & Record<"--screen-width" | "--screen-list" | "--screen-search", string> = {
  "--screen-width": `${SCREEN_WIDTH}px`,
  "--screen-list": `${SCREEN_HEIGHT.list}px`,
  "--screen-search": `${SCREEN_HEIGHT.search}px`,
};

/** The list in the app under the status bar: plain things a person keeps, none of them an activity the island plays. */
const APP_ROWS = [
  { icon: File01Icon, tint: "#0a84ff", title: "Weekly review", detail: "Notes · edited 2 min ago" },
  { icon: Calendar03Icon, tint: "#ff9f0a", title: "Team standup", detail: "Calendar · 10:30" },
  { icon: ShoppingBasket01Icon, tint: "#30d158", title: "Groceries", detail: "Lists · 6 items" },
] as const;

/** Air kept between an ear's content and the island's outline before the ear gives way (px). */
const EAR_AIR = 4;

/** The nearest an ear's content may sit to the screen's side when it moves aside for the island (px). */
const EAR_SIDE = 16;

/**
 * While split, the air between the clock and the pill (px). On the device "9:41" ends 24 pt before
 * the pill (reference/stills/state-split.png); with the ears' 4 px the clock sat 8 px from it at
 * 390 (council 25).
 */
const SPLIT_CLOCK_AIR = 24;

/** While split, the nearest the clock may come to the screen's side (px), so it can keep that air. */
const SPLIT_CLOCK_SIDE = 10;

/**
 * The least the clock shrinks to while split. On a screen narrower than a phone (390 px and under)
 * the room left of the pill is short of the clock's width; it shrinks into it, as a status bar's
 * clock does when the room around the island is short, rather than crowd the pill.
 */
const SPLIT_CLOCK_MIN_SCALE = 0.85;

interface Span {
  left: number;
  right: number;
}

/** An ear's item and where it sits at rest, in the screen's coordinates. */
interface EarItem {
  element: HTMLElement;
  rest: Span;
}

/** What `useClearEars` reads from layout once per resize, so the island's frames need no layout reads. */
interface EarLayout {
  /** The screen's sides. */
  screen: Span;
  /** The ears' band ends here; outlines below it never reach the bar. */
  bottom: number;
  /** Where the island's hit-target coordinates start. */
  origin: { x: number; y: number };
  time: EarItem | null;
  signal: EarItem | null;
  battery: EarItem | null;
}

/** The island's hit targets: the engine writes their place and size every frame. */
const HITS = '[data-islandcn-hit="pill"], [data-islandcn-hit="bubble"]';

/** The engine places a hit target with `translate(x, y)` and sizes it in px. */
const TRANSLATE = /translate\(\s*(-?[\d.e+-]+)px\s*,\s*(-?[\d.e+-]+)px\s*\)/;

/** The outline a hit target holds this frame, from the engine's own writes; null while it is hidden. */
const outlineOf = (element: HTMLElement, origin: { x: number; y: number }) => {
  if (element.style.display === "none") return null;
  const match = TRANSLATE.exec(element.style.transform);
  const width = Number.parseFloat(element.style.width);
  const height = Number.parseFloat(element.style.height);
  if (!match || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null;
  const left = origin.x + Number.parseFloat(match[1] ?? "0");
  const top = origin.y + Number.parseFloat(match[2] ?? "0");
  return { left, top, right: left + width, bottom: top + height };
};

/**
 * Places one item of an ear for this frame: where it sits at rest (`rest`, from its layout box,
 * which a transform never moves), the island's outlines that reach down into the bar (`hits`) and
 * the room the screen gives that side. At rest when the island is clear of it; else moved into the
 * room between the screen's side and the island, as the real split moves the clock left; else hidden.
 */
const placeItem = (item: HTMLElement, rest: Span, hits: readonly Span[], side: "left" | "right", screen: Span) => {
  const clear = (at: Span) => hits.every((box) => box.right + EAR_AIR <= at.left || box.left - EAR_AIR >= at.right);
  const width = rest.right - rest.left;
  let shift: number | null = clear(rest) ? 0 : null;
  if (shift === null && hits.length > 0) {
    // The room left between the screen's side and the nearest outline on that side of the item.
    const room =
      side === "left"
        ? { left: screen.left + EAR_SIDE, right: Math.min(...hits.map((box) => box.left)) - EAR_AIR }
        : { left: Math.max(...hits.map((box) => box.right)) + EAR_AIR, right: screen.right - EAR_SIDE };
    if (room.right - room.left >= width) {
      const left = (room.left + room.right) / 2 - width / 2;
      shift = left - rest.left;
    }
  }
  item.style.opacity = shift === null ? "0" : "1";
  if (shift !== null) item.style.transform = shift === 0 ? "" : `translateX(${shift.toFixed(2)}px)`;
};

/**
 * Places the clock while the island is split: at rest when the pill is clear of it by the device's
 * air; else moved left until its right edge keeps that air, shrunk (to `SPLIT_CLOCK_MIN_SCALE` at
 * least) where the room to the screen's side is short; else hidden.
 */
const placeSplitClock = (item: HTMLElement, rest: Span, hits: readonly Span[], screen: Span) => {
  const pill = Math.min(...hits.map((box) => box.left));
  if (rest.right + SPLIT_CLOCK_AIR <= pill) {
    item.style.opacity = "1";
    item.style.transform = "";
    return;
  }
  const width = rest.right - rest.left;
  const edge = pill - SPLIT_CLOCK_AIR;
  const scale = Math.min(1, (edge - (screen.left + SPLIT_CLOCK_SIDE)) / width);
  if (scale < SPLIT_CLOCK_MIN_SCALE) {
    item.style.opacity = "0";
    return;
  }
  // Scaled from its left edge (`origin-left`), so its right edge lands on `edge`.
  const shift = edge - width * scale - rest.left;
  item.style.opacity = "1";
  item.style.transform = `translateX(${shift.toFixed(2)}px)${scale < 1 ? ` scale(${scale.toFixed(3)})` : ""}`;
};

/**
 * Keeps the status bar's items clear of the island, item by item, on the island's own frames. The
 * engine writes its hit targets' place and size every frame, so watching those writes follows the
 * island exactly. The time moves left into the room beside the island when the island reaches over
 * it and hides only when there is no room, and on the right the signal bars give way first and the
 * battery stays while it fits, as on the real split (reference/MEASUREMENTS.md, "Status bar": the
 * clock moves left and the cellular bars hide). A wide compact view or the split's pill used to hide
 * the whole ear, time and battery both.
 */
const useClearEars = (bar: RefObject<HTMLDivElement | null>, left: RefObject<HTMLSpanElement | null>, right: RefObject<HTMLSpanElement | null>) => {
  useEffect(() => {
    const stage = bar.current?.parentElement;
    const row = bar.current?.firstElementChild;
    if (!stage || !(row instanceof HTMLElement)) return;

    // Layout is read only when the screen resizes or the island mounts new hit targets; the island's
    // own frames are followed from the engine's inline writes, so animation never forces a layout.
    let layout: EarLayout | null = null;
    let targets: HTMLElement[] = [];

    const place = () => {
      if (!layout) return;
      const { screen, bottom, origin, time, signal, battery } = layout;
      // Outlines that reach down into the ears' band; an expanded island covers the whole bar.
      const hits = targets.flatMap((hit) => {
        const box = outlineOf(hit, origin);
        return box && box.top < bottom ? [{ left: box.left, right: box.right }] : [];
      });
      // Two outlines in the bar are the split's pill and bubble: the clock keeps the device's air from the pill.
      if (time) {
        if (hits.length > 1) placeSplitClock(time.element, time.rest, hits, screen);
        else placeItem(time.element, time.rest, hits, "left", screen);
      }
      if (signal && battery) {
        const group = { left: signal.rest.left, right: battery.rest.right };
        const whole = hits.every((box) => box.right + EAR_AIR <= group.left || box.left - EAR_AIR >= group.right);
        // The signal bars give way first; the battery then keeps its own place, or moves right into the room.
        signal.element.style.opacity = whole ? "1" : "0";
        placeItem(battery.element, battery.rest, whole ? [] : hits, "right", screen);
      }
    };

    const follow = new MutationObserver(place);
    /** Follows the engine's writes on these hit targets; true when the set changed. */
    const watch = (found: HTMLElement[]) => {
      if (found.length === targets.length && found.every((element, index) => targets[index] === element)) return false;
      targets = found;
      follow.disconnect();
      for (const element of found) follow.observe(element, { attributes: true, attributeFilter: ["style"] });
      return true;
    };

    const relayout = () => {
      const base = stage.getBoundingClientRect();
      const screenBox = row.getBoundingClientRect();
      const screen = { left: screenBox.left - base.left, right: screenBox.right - base.left };
      const bottom = Math.max(...[left.current, right.current].map((ear) => (ear ? ear.getBoundingClientRect().bottom - base.top : 0)));
      const restOf = (element: HTMLElement): EarItem => {
        // offsetLeft is the layout place, before any transform this hook wrote.
        const parent = (element.offsetParent?.getBoundingClientRect().left ?? screenBox.left) - base.left;
        return { element, rest: { left: parent + element.offsetLeft, right: parent + element.offsetLeft + element.offsetWidth } };
      };
      const found = [...stage.querySelectorAll<HTMLElement>(HITS)];
      watch(found);
      // The hit targets share the island's frame: a shown one's rect minus the translate the engine
      // wrote is that frame's origin in the screen's coordinates.
      let origin = layout?.origin ?? { x: 0, y: 0 };
      for (const element of found) {
        const match = element.style.display === "none" ? null : TRANSLATE.exec(element.style.transform);
        const rect = element.getBoundingClientRect();
        if (match && rect.width > 0) {
          origin = { x: rect.left - base.left - Number.parseFloat(match[1] ?? "0"), y: rect.top - base.top - Number.parseFloat(match[2] ?? "0") };
          break;
        }
      }
      const time = left.current?.firstElementChild;
      const [signal, battery] = [...(right.current?.children ?? [])];
      layout = {
        screen,
        bottom,
        origin,
        time: time instanceof HTMLElement ? restOf(time) : null,
        signal: signal instanceof HTMLElement ? restOf(signal) : null,
        battery: battery instanceof HTMLElement ? restOf(battery) : null,
      };
      place();
    };

    const sizes = new ResizeObserver(relayout);
    sizes.observe(stage);
    sizes.observe(row);
    // The island mounts its hit targets after its first layout and remounts on a new run; content
    // mounting and unmounting inside it changes nothing here, so only a new set of targets relays out.
    const mounts = new MutationObserver(() => {
      if (watch([...stage.querySelectorAll<HTMLElement>(HITS)])) relayout();
    });
    mounts.observe(stage, { childList: true, subtree: true });
    relayout();
    return () => {
      sizes.disconnect();
      mounts.disconnect();
      follow.disconnect();
    };
  }, [bar, left, right]);
};

/**
 * The status bar's ears: the time in the left one, signal and battery in the right one, centred in
 * the room beside the idle island as on a phone. Each item gives way while the island reaches over
 * it (`useClearEars`).
 */
const StatusBar = () => {
  const bar = useRef<HTMLDivElement | null>(null);
  const leftEar = useRef<HTMLSpanElement | null>(null);
  const rightEar = useRef<HTMLSpanElement | null>(null);
  useClearEars(bar, leftEar, rightEar);
  // Each item moves and fades on its own; the writes come per frame from `useClearEars`.
  const item = "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none";
  return (
    <div ref={bar} aria-hidden className="absolute inset-x-0 top-0 bg-(--bar-bg)" style={{ height: STATUS_BAR }}>
      <div
        className="relative mx-auto grid h-full max-w-[402px] items-start text-[15px] font-semibold text-(--bar-ink)"
        style={{ gridTemplateColumns: `1fr ${islandMetrics.idle.width}px 1fr`, paddingTop: islandMetrics.top }}
      >
        <span ref={leftEar} className="relative flex items-center justify-center" style={{ height: islandMetrics.idle.height }}>
          <span className={cn("origin-left tabular-nums", item)}>10:24</span>
        </span>
        <span />
        <span ref={rightEar} className="relative flex items-center justify-center gap-1.5" style={{ height: islandMetrics.idle.height }}>
          {/* Four rising bars and a battery: plain shapes, no system symbols. */}
          <span className={cn("flex h-3 items-end gap-[2px]", item)}>
            {[4, 6, 8, 11].map((height) => (
              <span key={height} className="w-[3px] rounded-[1px] bg-(--bar-ink)" style={{ height }} />
            ))}
          </span>
          <span className={cn("relative flex h-[12px] w-[24px] items-center rounded-[4px] border border-(--bar-ink)/45 p-[1.5px]", item)}>
            <span className="h-full w-[72%] rounded-[2px] bg-(--bar-ink)" />
            <span className="absolute top-1/2 -right-[3.5px] h-[4px] w-[2px] -translate-y-1/2 rounded-r-[1px] bg-(--bar-ink)/45" />
          </span>
        </span>
      </div>
    </div>
  );
};

/** Where a screen shows the app's list under its search field: at every width, or from lg up only. */
export type ListFrom = "always" | "lg";

/**
 * A plain list app of our own under the status bar: a large title, a search field and a few rows,
 * in the app's colours (`--app-*` on the screen). The title ends at `TITLE_END` and the search field
 * starts at `APP_CLEAR`, so an expanded island covers the bar and the whole title and ends over
 * blank background, never across a line of text or a control. Where the list shows, it fades into
 * the app's background at the foot, so the screen reads as the top of a screen rather than a whole one.
 */
const AppScreen = ({ list }: { list: ListFrom }) => (
  <div aria-hidden className="absolute inset-x-0 bottom-0 overflow-hidden bg-(--app-bg) text-left" style={{ top: STATUS_BAR }}>
    <div className="mx-auto max-w-[402px] px-5">
      {/*
       * Centred: the expanded island's lower corners are round, and a title at the left edge showed
       * through the corner. The title alone, its line 25 px clear of the status bar: a date line over it
       * sat 9 px under the bar, and a split island passing from expanded touched it (council 21).
       */}
      <div className="flex flex-col items-center justify-end text-center" style={{ height: TITLE_END - STATUS_BAR }}>
        <span className="text-[28px] leading-8 font-bold tracking-[-0.02em] text-(--app-ink)">Today</span>
      </div>
      <div style={{ height: APP_CLEAR - TITLE_END }} />
      <div className="flex h-9 items-center gap-1.5 rounded-[10px] bg-(--app-fill) px-2.5 text-[15px] text-(--app-muted)">
        <Icon icon={Search01Icon} size={15} strokeWidth={2} />
        Search
      </div>
      <ul className={cn("mt-3", list === "lg" && "max-lg:hidden")}>
        {APP_ROWS.map((row) => (
          <li key={row.title} className="flex items-center gap-3 border-b border-(--app-line) py-2.5 last:border-b-0">
            <span className="grid size-9 flex-none place-items-center rounded-[9px] text-white" style={{ background: row.tint }}>
              <Icon icon={row.icon} size={18} strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] leading-5 font-semibold text-(--app-ink)">{row.title}</span>
              <span className="block truncate text-[13px] leading-[18px] text-(--app-muted)">{row.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
    <div className={cn("absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-(--app-bg) to-transparent", list === "lg" && "max-lg:hidden")} />
  </div>
);

interface PhoneScreenProps {
  /** Spoken name of the screen's island. Required. */
  label: string;
  /** Where the app's list shows under its search field; without it the screen is shorter. Required. */
  list: ListFrom;
  /** The screen's element, for whoever watches where it is. Defaults to none. */
  screenRef?: Ref<HTMLDivElement>;
  /** Classes on the screen, for its width, place and exit. Defaults to none. */
  className?: string;
  /** What plays on the screen's island: runs and stills, mounted inside its provider. Defaults to none. */
  children?: ReactNode;
}

/**
 * The screen and its island. Its height is the list's or the search field's (`SCREEN_HEIGHT`); on
 * a phone it runs edge to edge, so the island lays out against the whole width, as in an app. Its
 * corners are only lightly rounded and never concentric with the island's: a screen shaped like the
 * pill read as a bezel around it, so the black pill stays the only rounded shape.
 */
export const PhoneScreen = ({ label, list, screenRef, className, children }: PhoneScreenProps) => {
  const theme = useSiteTheme();
  return (
    <div
      ref={screenRef}
      className={cn(
        "relative isolate overflow-hidden",
        list === "always" ? "h-(--screen-list)" : "h-(--screen-search) lg:h-(--screen-list)",
        // The app's colours: a white list on the light page, a dark grey one on the black page.
        "[--app-bg:#ffffff] [--app-fill:#f0f0f3] [--app-ink:#1d1d1f] [--app-line:rgb(0_0_0/0.08)] [--app-muted:#6e6e73]",
        "dark:[--app-bg:#1c1c1e] dark:[--app-fill:#2c2c2e] dark:[--app-ink:#f5f5f7] dark:[--app-line:rgb(255_255_255/0.08)] dark:[--app-muted:#98989d]",
        // The status bar's: the app's own background in both themes (`STATUS_BAR_BG`).
        "[--bar-bg:#ffffff] [--bar-ink:#1d1d1f] dark:[--bar-bg:#1c1c1e] dark:[--bar-ink:#ffffff]",
        className,
      )}
      style={SCREEN_STYLE}
    >
      <IslandProvider>
        <AppScreen list={list} />
        <StatusBar />
        {/* The island at its real place on the screen. Its keyline follows the bar's colour, as it does over any page. */}
        <div className="absolute inset-0">
          <Island label={label} keyline="auto" backdrop={STATUS_BAR_BG[theme]} />
        </div>
        {/* The screen's edge, over everything, so the status bar keeps an outline on the page of its own colour. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_-1px_0_var(--site-line),inset_0_1px_0_var(--site-line)] sm:rounded-[14px] sm:shadow-[inset_0_0_0_1px_var(--site-line)]" />
        {children}
      </IslandProvider>
    </div>
  );
};

/**
 * How each activity plays on a screen, in ms. "open": expanded for `expanded`, then compact until
 * `total`. "self": the activity decides: a call opens by itself, the charging pill and two at once
 * stay compact; each stays `total`. Every run ends at `total` even when the driver would run longer
 * (a 15 s timer). The compact tail is 1.4 s: the collapse takes about 0.8 s, then the compact view
 * shows for a moment before the next activity opens, so the screen is open most of the time.
 *
 * The open time follows how much there is to read. The ride has the most after music: the
 * driver, the plate, the car, the arrival and the Message capsule on a 155 pt island, so it holds
 * 5 s. The recording is one 84 pt row with only the time to read, so it holds 3.6 s. The battery is
 * the charging pill, which never opens, so it shows compact for 4 s.
 */
export const BEATS = {
  "now-playing": { kind: "open", expanded: 5200, total: 6600 },
  upload: { kind: "open", expanded: 4600, total: 6000 },
  eta: { kind: "open", expanded: 5000, total: 6400 },
  "incoming-call": { kind: "self", total: 6000 },
  timer: { kind: "open", expanded: 4200, total: 5600 },
  recording: { kind: "open", expanded: 3600, total: 5000 },
  transfer: { kind: "open", expanded: 4000, total: 5400 },
  battery: { kind: "self", total: 4000 },
  split: { kind: "self", total: 6400 },
} as const satisfies Record<EverydaySlug, { kind: "open"; expanded: number; total: number } | { kind: "self"; total: number }>;

/**
 * Opens the activity that just started, in the same commit as its start, so the island goes
 * straight from idle (or the last activity's compact view) to expanded, as a new live activity
 * arriving does, with no compact frame first. Settles it back to compact after `hold` ms.
 */
const ArriveOpen = ({ hold }: { hold: number }) => {
  const island = useIslandActions();
  useEffect(() => {
    // Effects run in order: the driver mounted just before this has started its activity.
    const arrived = island.activities[0];
    if (arrived !== undefined) island.expand(arrived.id);
    const close = window.setTimeout(() => {
      if (island.presentation === "expanded") island.collapse();
    }, hold);
    return () => window.clearTimeout(close);
  }, [island, hold]);
  return null;
};

/** Ends a run after `ms`, even when its driver would play longer. */
const Lifetime = ({ ms, onEnd }: { ms: number; onEnd: () => void }) => {
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    const timer = window.setTimeout(() => end.current(), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return null;
};

/** Opens the held activity once it is up, for the reduced-motion still. A press outside closes it and it stays closed. */
const OpenOnce = () => {
  const island = useIsland();
  const opened = useRef(false);
  const first = island.activities[0];
  useEffect(() => {
    if (opened.current || first === undefined || island.presentation !== "compact") return;
    opened.current = true;
    island.expand(first.id);
  }, [island, first, island.presentation]);
  return null;
};

interface ScreenRunProps {
  /** The activity to play. Required. */
  slug: EverydaySlug;
  /** Restarts the run when it changes. Required. */
  run: number;
  /** Called when the run ends, by its driver or at its beat's `total`; it may come twice. Required. */
  onFinish: () => void;
}

/** One run of an activity on a screen, timed by its beat: it arrives open, settles to compact and ends. */
export const ScreenRun = ({ slug, run, onFinish }: ScreenRunProps) => {
  const beat = BEATS[slug];
  return (
    <>
      <TopIslandRun slug={slug} run={run} onFinish={onFinish} />
      {beat.kind === "open" ? <ArriveOpen key={`open-${slug}-${run}`} hold={beat.expanded} /> : null}
      <Lifetime key={`end-${slug}-${run}`} ms={beat.total} onEnd={onFinish} />
    </>
  );
};

/** An activity held still on a screen, for reduced motion: opened once if its beat opens it. */
export const ScreenStill = ({ slug }: { slug: EverydaySlug }) => (
  <>
    <TopIslandStill slug={slug} />
    {BEATS[slug].kind === "open" ? <OpenOnce key={slug} /> : null}
  </>
);
