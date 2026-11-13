"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { useIsland, useIslandActions } from "@/lib/island";

import { NARROW } from "./use-narrow";

/** The header row (h-16). */
const HEADER_HEIGHT = 64;
/** Space kept clear below the island's lower edge before page copy shows again. */
const GAP = 12;
/** The soft lower edge of the band, so copy fades in under it instead of being cut. */
const FADE = 20;
/** Where the header's soft edge ends with a compact or idle island (px): copy shows whole only below it. */
export const HEADER_SOFT_FOOT = HEADER_HEIGHT + FADE;
/** How long to follow the island's spring after it changes, in ms. */
const FOLLOW_MS = 900;
/**
 * Longest an open island may cover the header row on a narrow screen, in ms. Then it tucks back
 * to compact (a toast keeps its own timer), so the brand and the menu are never gone for long.
 */
const COVER_MAX_MS = 2000;

/** The page's own island: the one pinned to the window. Demo islands sit in their stages. */
const pageIslandPill = () => {
  for (const root of document.querySelectorAll<HTMLElement>("[data-islandcn]")) {
    if (getComputedStyle(root).position === "fixed") return root.querySelector<HTMLElement>('[data-islandcn-hit="pill"]');
  }
  return null;
};

interface IslandClearanceProps {
  children: ReactNode;
  /** Classes on the header element. Defaults to none. */
  className?: string;
}

/**
 * The site header, with a band under it that keeps the page clear around the
 * page's island. The header never moves: the island floats over it. An open
 * island (an expanded activity, a message) reaches below the 64 px row, and
 * copy scrolling past would show around its sides; while it does, a band in the
 * page's own colour grows under the header to just below the island and fades
 * out at its lower edge, following the island's height as it springs. On the
 * black page the band is invisible: the copy simply passes under the island.
 * Compact, split and idle islands end inside the row, so only the fade is left:
 * copy slides under the header softly rather than being cut at a hard line.
 * The playground has no page island and its phone stage sticks right under the
 * header, so it gets no fade.
 *
 * Below lg an open island covers the whole row, and the brand and the menu
 * button showed as fragments around its corners. They fade out while it is
 * open and come back when it closes, as a phone's status bar does. It stays
 * open there for two seconds at most, and a press on the hidden brand or menu
 * still works: the island goes up and the control runs.
 */
export const IslandClearance = ({ children, className }: IslandClearanceProps) => {
  const { presentation, activities } = useIsland();
  const fades = usePathname() !== ROUTES.PLAYGROUND;
  const [reach, setReach] = useState(0);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let frame = 0;
    const until = performance.now() + FOLLOW_MS;
    const follow = () => {
      const pill = pageIslandPill();
      const bottom = pill === null ? 0 : pill.getBoundingClientRect().bottom;
      setReach(Math.max(0, Math.ceil(bottom + GAP - HEADER_HEIGHT)));
      if (performance.now() < until) frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [presentation, activities]);

  const covered = narrow && reach > 0;
  const island = useIslandActions();
  const row = useRef<HTMLDivElement | null>(null);
  // A control pressed while the island covered it, run once the island has gone back up.
  const pending = useRef<HTMLElement | null>(null);

  const open = narrow && presentation === "expanded";
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => island.collapse(), COVER_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [open, island]);

  /*
   * While the island covers the row, a press where the brand or the menu button sits still reaches
   * it: the island goes back up and the control runs as it clears. The press stops here, before the
   * island's own handlers see it, so it never reads as a press on the island.
   */
  useEffect(() => {
    if (!covered) {
      const control = pending.current;
      pending.current = null;
      control?.click();
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const controls = row.current?.querySelectorAll<HTMLElement>("a[href], button") ?? [];
      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        if (rect.width === 0 || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) continue;
        event.preventDefault();
        event.stopPropagation();
        pending.current = control;
        island.collapse();
        return;
      }
    };
    // The click that follows the press would land on the island; swallow it while covered.
    const onClick = (event: MouseEvent) => {
      if (pending.current === null) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [covered, island]);

  return (
    <header className={className}>
      <div
        ref={row}
        inert={covered}
        className="transition-opacity duration-150 ease-out"
        style={{ opacity: covered ? 0 : 1 }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full bg-site-bg"
        style={{
          height: reach > 0 ? reach + FADE : fades ? FADE : 0,
          maskImage: `linear-gradient(to bottom, #000 calc(100% - ${FADE}px), transparent)`,
        }}
      />
    </header>
  );
};
