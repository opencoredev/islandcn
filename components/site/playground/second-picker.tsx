"use client";

import { type CSSProperties, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PRESETS } from "@/constants/presets";

import { cn } from "../cn";
import { type ActivityStarter, isActivityStarter } from "./model";

/*
 * Split needs a second activity. Rather than add one quietly (it ends up in
 * the copied code and the install command), pressing Split on a single
 * activity asks which: a popover on the Split button with the presets, the
 * suggested one first.
 *
 * It opens in a portal at a fixed place, so the pinned phone dock, which clips
 * what overflows it, can't cut it off. Its arrow points at the button that
 * opened it, and it stays inside the column the button is in (the nearest
 * `data-picker-bounds`, else the window): under the button when it fits
 * there, else beside it, else above it. On a phone it always opens under the
 * button, because above it would cover the island you are about to split: the
 * page scrolls up first when the room under the button is short, and it takes
 * the window's width less the edges, so nothing of the strip's readout peeks
 * out beside it.
 *
 * A scrim sets the page aside under it, and a press anywhere off the panel
 * only closes it. It is dense enough that no page text under it reads
 * (`SCRIM`): at 70 % black a menu item shared its line with a readable sentence
 * of the install block, and the registry URL peeked out beside the panel
 * (councils 14, 17 and 21). The panel itself is opaque, with its own ring and
 * shadow, so it reads as the one thing on top.
 *
 * The stage stays lit: you pick a second activity looking at the island it
 * joins (council 23). The scrim has a hole cut where the stage shows (on a
 * phone, the pinned dock: the island and the strip). The hole follows it only
 * until it holds still after the menu opens (a phone's dock may still be
 * easing in); after that the menu closes on any scroll or resize, so the hole
 * never has to move. Lifting the stage over the scrim instead would also lift it
 * over the sticky header wherever it sits partly under it. And the scrim fades
 * out when the menu closes rather than going on the frame a pick starts the
 * split, so the page doesn't flash from dark to lit under the island's motion.
 */

/**
 * The scrim's fill per scheme. Page text under it measures under 1.5:1 against what is behind it
 * (1.33:1 for white on black in dark, 1.23:1 for ink on the page in light), and a slight blur
 * softens its glyphs, so nothing beside the panel reads as a line next to a menu item.
 */
const SCRIM = "bg-site-bg/90 backdrop-blur-[3px] dark:bg-black/[0.86]";

/** How long the scrim takes to come in and to go (ms). Opacity only, so reduced motion keeps it. */
const SCRIM_IN_MS = 200;
const SCRIM_OUT_MS = 180;

/**
 * Stacking over the page (the header is z 40): the scrim, then a clear layer that takes every press
 * off the panel, so a press on the lit stage only closes the menu, as a press on the scrim does, then
 * the panel.
 */
const LAYER = { scrim: 50, catcher: 51, panel: 52 } as const satisfies Record<string, number>;

interface SecondPickerProps {
  /** The preset offered first, marked as suggested. Required. */
  suggested: ActivityStarter;
  onPick: (key: ActivityStarter) => void;
  onClose: () => void;
}

/** Space it keeps from the window's edges, and between the arrow's tip and the button, in px. */
const EDGE = 12;
const GAP = 10;
/** Widest it gets beside a desktop column: two columns of names. A phone, or a narrower window, gets the window's width less the edges. */
const WIDTH = 336;
/** Half the arrow's diagonal: how far its tip reaches past the panel. */
const ARROW = 6;
/** Closest the arrow's centre comes to the panel's rounded corners. */
const ARROW_INSET = 22;

type Side = "below" | "right" | "above";

/** Below lg, where the playground's stage sits above its actions. */
const PHONE = "(max-width: 1023.98px)";

interface Placement {
  side: Side;
  panel: CSSProperties;
  arrow: CSSProperties;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** The part of the window the scrim leaves lit, with the radius of each end's corners (0 where the window or the header cuts it). */
interface Hole {
  left: number;
  top: number;
  right: number;
  bottom: number;
  topRadius: number;
  bottomRadius: number;
}

/**
 * What stays lit: the stage card with its island, or on a phone the dock (`data-pg-dock`) down to its
 * visible foot (`data-pg-dock-foot`), which is the island's crop and the strip with Split in it. Less
 * whatever of it sits under the header, which dims with the rest of the page. Null when none shows.
 */
const litHole = (phone: boolean): Hole | null => {
  const lit = document.querySelector<HTMLElement>(phone ? "[data-pg-dock]" : "[data-pg-stage]");
  if (!lit) return null;
  const box = lit.getBoundingClientRect();
  const foot = phone ? (lit.querySelector("[data-pg-dock-foot]")?.getBoundingClientRect().bottom ?? box.bottom) : box.bottom;
  const headerFoot = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
  const top = Math.max(box.top, headerFoot, 0);
  const bottom = Math.min(foot, box.bottom, window.innerHeight);
  if (bottom - top < 1) return null;
  const radius = phone ? 0 : Math.min(Number.parseFloat(getComputedStyle(lit).borderTopLeftRadius) || 0, (bottom - top) / 2);
  return {
    left: box.left,
    right: box.right,
    top,
    bottom,
    topRadius: top > box.top + 0.5 ? 0 : radius,
    bottomRadius: bottom < box.bottom - 0.5 ? 0 : radius,
  };
};

/**
 * The scrim's clip: the window less the hole, as an even-odd path. The outer frame stays near the
 * window's size: drawn 10 000 px out, Chrome dropped the clip on the blurred scrim and dimmed the
 * stage with the rest (a frame 2 000 px out still clipped).
 */
const holeClip = ({ left: l, top: t, right: r, bottom: b, topRadius: rt, bottomRadius: rb }: Hole) => {
  const pad = 100;
  const frame = `M${-pad} ${-pad}H${window.innerWidth + pad}V${window.innerHeight + pad}H${-pad}Z`;
  const hole = [
    `M${l + rt} ${t}H${r - rt}A${rt} ${rt} 0 0 1 ${r} ${t + rt}`,
    `V${b - rb}A${rb} ${rb} 0 0 1 ${r - rb} ${b}`,
    `H${l + rb}A${rb} ${rb} 0 0 1 ${l} ${b - rb}`,
    `V${t + rt}A${rt} ${rt} 0 0 1 ${l + rt} ${t}Z`,
  ].join("");
  return `path(evenodd, "${frame} ${hole}")`;
};

/**
 * How long the hole follows the lit part after the menu opens: until its edges hold for
 * `HOLE_STILL_FRAMES` frames in a row, and never past `HOLE_FOLLOW_MS`. On a phone the dock can still
 * be easing to its place when Split is pressed (opened about 120 ms after scrolling back to the top,
 * a hole measured once ended 136 px above the dock's foot, D28 review).
 */
const HOLE_STILL_FRAMES = 6;
const HOLE_FOLLOW_MS = 1200;

const sameHole = (a: Hole | null, b: Hole | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.right - b.right) < 0.5 &&
    Math.abs(a.bottom - b.bottom) < 0.5);

/**
 * Puts the scrim on the page and returns what takes it away again. It lives outside React, on the
 * body, so it can fade out after the menu has unmounted. While the menu is shut there is no scrim,
 * no listener and no animation left on the page.
 */
const showScrim = (phone: boolean) => {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  element.dataset.pgScrim = "";
  element.className = cn("pointer-events-none fixed inset-0", SCRIM);
  element.style.zIndex = String(LAYER.scrim);
  const cut = (hole: Hole | null) => {
    element.style.clipPath = hole ? holeClip(hole) : "";
  };
  let hole = litHole(phone);
  cut(hole);
  document.body.append(element);
  // Follow the lit part only while it is still moving; the clip is written only on frames it changed.
  const start = performance.now();
  let still = 0;
  let frame = 0;
  const follow = (now: number) => {
    const next = litHole(phone);
    if (sameHole(next, hole)) still += 1;
    else {
      still = 0;
      hole = next;
      cut(hole);
    }
    if (still < HOLE_STILL_FRAMES && now - start < HOLE_FOLLOW_MS) frame = requestAnimationFrame(follow);
  };
  frame = requestAnimationFrame(follow);
  const fadeIn = element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: SCRIM_IN_MS, easing: "ease-out" });
  return () => {
    cancelAnimationFrame(frame);
    // From wherever the fade in got to, so a menu shut at once doesn't jump to full first.
    const from = getComputedStyle(element).opacity;
    fadeIn.cancel();
    const fadeOut = element.animate([{ opacity: from }, { opacity: 0 }], { duration: SCRIM_OUT_MS, easing: "ease-out", fill: "forwards" });
    const remove = () => element.remove();
    fadeOut.finished.then(remove, remove);
  };
};

/**
 * Where the panel goes for a button at `anchor` and a panel of `size`: the first side where all of
 * it fits, in the order below, right, above. When none fits it takes the roomier of below and
 * above and scrolls.
 */
const placement = (anchor: DOMRect, size: { width: number; height: number }, bounds: { left: number; right: number }, phone: boolean): Placement => {
  const vh = window.innerHeight;
  const centreX = anchor.left + anchor.width / 2;
  const centreY = anchor.top + anchor.height / 2;
  const room = {
    below: vh - anchor.bottom - GAP - EDGE,
    above: anchor.top - GAP - EDGE,
    right: bounds.right - anchor.right - GAP,
  };
  const left = clamp(centreX - size.width / 2, bounds.left, bounds.right - size.width);
  const horizontalArrow = { left: clamp(centreX - left, ARROW_INSET, size.width - ARROW_INSET) - ARROW };
  const vertical = (side: "below" | "above", maxHeight: number): Placement =>
    side === "below"
      ? { side, panel: { left, top: anchor.bottom + GAP, maxHeight }, arrow: { ...horizontalArrow, top: -ARROW } }
      : { side, panel: { left, bottom: vh - anchor.top + GAP, maxHeight }, arrow: { ...horizontalArrow, bottom: -ARROW } };

  if (size.height <= room.below || phone) return vertical("below", room.below);
  if (size.width <= room.right && size.height <= vh - 2 * EDGE) {
    const top = clamp(centreY - ARROW_INSET - ARROW, EDGE, vh - EDGE - size.height);
    return {
      side: "right",
      panel: { left: anchor.right + GAP, top },
      arrow: { left: -ARROW, top: clamp(centreY - top, ARROW_INSET, size.height - ARROW_INSET) - ARROW },
    };
  }
  if (size.height <= room.above) return vertical("above", room.above);
  return room.below >= room.above ? vertical("below", room.below) : vertical("above", room.above);
};

/** The arrow is a square turned 45°; its two outer edges carry the panel's ring. */
const ARROW_EDGES = {
  below: "shadow-[-0.5px_-0.5px_0_0_rgb(0_0_0/0.16)] dark:shadow-[-1px_-1px_0_0_var(--site-line)]",
  above: "shadow-[0.5px_0.5px_0_0_rgb(0_0_0/0.16)] dark:shadow-[1px_1px_0_0_var(--site-line)]",
  right: "shadow-[-0.5px_0.5px_0_0_rgb(0_0_0/0.16)] dark:shadow-[-1px_1px_0_0_var(--site-line)]",
} as const satisfies Record<Side, string>;

const CHOICES = PRESETS.flatMap((preset) => (isActivityStarter(preset.slug) ? [{ key: preset.slug, title: preset.title }] : []));

/** The button that opened the picker: the Split segment in the picker's group or toolbar. */
const triggerOf = (marker: HTMLElement | null): HTMLElement | null => {
  const host = marker?.parentElement ?? null;
  return host?.querySelector<HTMLElement>("[data-second-trigger]") ?? host;
};

/**
 * The left and right edges the panel keeps inside: the column around the button (the stage's
 * column for the action bar), never past the window's edges. A column narrower than the panel
 * gives way to the window, so the panel is never squeezed.
 */
const boundsOf = (trigger: HTMLElement | null, width: number) => {
  const windowBounds = { left: EDGE, right: window.innerWidth - EDGE };
  const column = trigger?.closest<HTMLElement>("[data-picker-bounds]")?.getBoundingClientRect();
  if (!column) return windowBounds;
  const bounds = { left: Math.max(windowBounds.left, column.left), right: Math.min(windowBounds.right, column.right) };
  return bounds.right - bounds.left >= width ? bounds : windowBounds;
};

export const SecondPicker = ({ suggested, onPick, onClose }: SecondPickerProps) => {
  const panel = useRef<HTMLDivElement | null>(null);
  const marker = useRef<HTMLSpanElement | null>(null);
  const catcher = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const ordered = [...CHOICES.filter((choice) => choice.key === suggested), ...CHOICES.filter((choice) => choice.key !== suggested)];
  // The latest close, so a parent passing a new function each render doesn't move focus back to the top.
  const close = useRef(onClose);
  close.current = onClose;
  // Two columns when the window has room for them; the suggested choice spans both.
  const [width, setWidth] = useState<number | null>(null);
  const [place, setPlace] = useState<Placement | null>(null);
  // The scroll position the panel was placed at: the scroll that made room for it doesn't close it.
  const placedAt = useRef(0);
  useLayoutEffect(() => {
    const full = window.innerWidth - EDGE * 2;
    setWidth(window.matchMedia(PHONE).matches ? full : Math.min(WIDTH, full));
  }, []);
  // Measured hidden at its own height, then placed, all before the first paint.
  useLayoutEffect(() => {
    if (width === null || place !== null) return;
    const trigger = triggerOf(marker.current);
    const element = panel.current;
    if (!trigger || !element) return;
    const phone = window.matchMedia(PHONE).matches;
    const height = element.offsetHeight;
    // On a phone, scroll the button up until the panel fits under it (as far as the page can scroll).
    const short = height + GAP + EDGE - (window.innerHeight - trigger.getBoundingClientRect().bottom);
    if (phone && short > 0) window.scrollBy({ top: Math.ceil(short), behavior: "instant" });
    placedAt.current = window.scrollY;
    setPlace(placement(trigger.getBoundingClientRect(), { width, height }, boundsOf(trigger, width), phone));
  }, [width, place]);
  const placed = place !== null;

  // The scrim comes in once the panel has its place (and a phone has scrolled to make room), and fades out from the frame it closes.
  useLayoutEffect(() => {
    if (!placed) return;
    return showScrim(window.matchMedia(PHONE).matches);
  }, [placed]);

  // Focus goes to the suggested choice; Escape or a press outside closes it.
  useEffect(() => {
    if (!placed) return;
    const onClose = () => close.current();
    // Escape hands focus back to the button that opened the menu, so a keyboard user carries on from there.
    const trigger = triggerOf(marker.current);
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      // A press off the panel only closes the menu: it never reads as a press outside the island, nor on the lit stage.
      if (event.target instanceof Node && catcher.current?.contains(event.target)) event.stopPropagation();
      // The button that opened it toggles it itself.
      if (event.target instanceof Element && event.target.closest("[data-second-trigger]")) return;
      onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        trigger?.focus({ preventScroll: true });
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = [...(panel.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
      const at = buttons.findIndex((button) => button === document.activeElement);
      const next = buttons[(at + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length];
      next?.focus();
      event.preventDefault();
    };
    // It sits at a fixed place, so it closes rather than drift from its button when the page moves.
    const moved = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      // The page's own scroll that made room for it arrives after it is placed; nothing moved since.
      if (event.type === "scroll" && event.target === document && Math.abs(window.scrollY - placedAt.current) < 1) return;
      onClose();
    };
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", moved, true);
    window.addEventListener("resize", moved);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", moved, true);
      window.removeEventListener("resize", moved);
    };
  }, [placed]);

  const menu =
    width === null ? null : (
      <>
        {/* Clear, under the panel and over the page and its scrim; a drag on it doesn't scroll the page, and a press closes the menu. */}
        <div ref={catcher} aria-hidden data-pg-picker="" className="fixed inset-0 touch-none" style={{ zIndex: LAYER.catcher }} />
      <div
        ref={panel}
        data-pg-picker=""
        role="menu"
        aria-labelledby={titleId}
        style={{ position: "fixed", zIndex: LAYER.panel, width, ...(place === null ? { left: 0, top: 0, visibility: "hidden" } : place.panel) }}
        className={cn(
          // On the light scrim the white panel parts from the page by its ring and shadow alone.
          "rounded-[14px] bg-site-raised shadow-[0_0_0_0.5px_rgb(0_0_0/0.16),0_2px_6px_rgb(0_0_0/0.06),0_14px_36px_rgb(0_0_0/0.16)] dark:shadow-[0_0_0_1px_var(--site-line),0_10px_30px_rgb(0_0_0/0.5)]",
          place !== null && "motion-safe:animate-[pg-log_160ms_cubic-bezier(0.23,1,0.32,1)]",
        )}
      >
        {place === null ? null : (
          <span aria-hidden className={cn("absolute size-3 rotate-45 rounded-[2px] bg-site-raised", ARROW_EDGES[place.side])} style={place.arrow} />
        )}
        {/* The list scrolls inside the rounded panel only when the window is too short for it. */}
        <div className="relative grid max-h-[inherit] grid-cols-2 gap-x-1 overflow-y-auto overscroll-contain rounded-[14px] p-1.5">
          <p id={titleId} className="col-span-2 px-2.5 pt-1.5 pb-1 text-[12px] leading-[17px] text-site-muted">
            Split with a second activity
          </p>
          {ordered.map((choice) => {
            const isSuggested = choice.key === suggested;
            return (
              <button
                key={choice.key}
                type="button"
                role="menuitem"
                onClick={() => onPick(choice.key)}
                className={cn(
                  "flex h-[34px] min-w-0 cursor-pointer items-center justify-between gap-3 rounded-[9px] px-2.5 text-left text-[13px] font-medium text-site-ink outline-offset-0 transition-[background-color] duration-150 ease-out hover:bg-site-ink/[0.06] focus-visible:bg-site-ink/[0.06] active:bg-site-ink/[0.1]",
                  isSuggested && "col-span-2",
                )}
              >
                <span className="truncate">{choice.title}</span>
                {isSuggested ? <span className="flex-none text-[11px] font-normal text-site-muted">Suggested</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      </>
    );
  return (
    <>
      <span ref={marker} hidden />
      {menu === null ? null : createPortal(menu, document.body)}
    </>
  );
};
