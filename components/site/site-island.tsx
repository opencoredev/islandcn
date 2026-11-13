"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, createContext, useContext, useLayoutEffect, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { Island, IslandProvider, useIsland } from "@/lib/island";

import { useNarrow } from "./use-narrow";
import { SITE_BACKDROP, type SiteTheme, useSiteTheme } from "./use-site-theme";

/** Hides the page's island while something else on screen is the island (the home hero's stage). */
const CoverContext = createContext<((covered: boolean) => void) | null>(null);

/**
 * Keeps the page's island hidden while `covered` is true, and shows it again when the caller
 * unmounts. The home hero passes whether its stage is on screen, so the two never compete.
 */
export const useCoverPageIsland = (covered: boolean) => {
  const setCovered = useContext(CoverContext);
  // A layout effect, so a client navigation to the home page never paints the page island first.
  useLayoutEffect(() => {
    setCovered?.(covered);
  }, [setCovered, covered]);
  useLayoutEffect(() => () => setCovered?.(false), [setCovered]);
};

/** Fade for the page island giving way to the hero's: opacity only, so it reads the same with reduced motion. */
const COVER_FADE = "opacity 240ms cubic-bezier(0.23,1,0.32,1)";

/**
 * The island pinned to the window: hidden while covered, and while nothing runs on it. Below lg it
 * takes no presses: a long-press would open it across the whole header row, over the mark and the
 * menu, and the page plays nothing there that opens it either.
 */
const PageIsland = ({ covered, theme }: { covered: boolean; theme: SiteTheme }) => {
  const { activities } = useIsland();
  const narrow = useNarrow();
  const shown = !covered && activities.length > 0;
  return (
    // z-50 keeps the island above the sticky header (z-40) while the wrapper's opacity makes a stacking context.
    <div inert={!shown || narrow} className="relative z-50" style={{ opacity: shown ? 1 : 0, transition: COVER_FADE }}>
      <Island placement="viewport" label="islandcn live activities" keyline={theme === "dark" ? "on" : "off"} backdrop={SITE_BACKDROP[theme]} />
    </div>
  );
};

/*
 * The site's own island: one real island pinned to the top centre of the
 * browser window, above the header, the way the hardware sits above a status
 * bar. The home page drives it as you scroll, so the page is the demo.
 *
 * The keyline follows the site's theme rather than the system's, since the
 * theme can be switched by hand: on the black page an activity draws the
 * faint ring the simulator measured. Idle draws nothing and nothing lights it:
 * black on black, as on the hardware.
 *
 * The playground and the gallery hide it: there the island being edited or
 * shown is the one on the stage, and a second idle pill above the page reads
 * as the thing the controls change (in light mode it sat black in the header
 * beside the stage's running island). The home hero hides it while its stage is on screen, for the same
 * reason: the stage is the phone there, and an idle pill over it is a second
 * island competing with the one playing. Nothing under the hero drives it: the
 * preset tour plays on a screen of its own, so the window's island leaves with the hero.
 *
 * With nothing running, the page island shows nothing in either scheme. Idle is black on black on the
 * dark page, as on the hardware; on the white page it was a bare black lozenge in the header once a
 * run ended, which read as a stray blob. It fades out when the last activity ends (while the
 * engine shrinks it back to idle) and in when the next one starts (while it grows out of idle).
 */
export const SiteIsland = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const theme = useSiteTheme();
  const hidden = pathname === ROUTES.PLAYGROUND || pathname === ROUTES.GALLERY;
  // The home page opens with the hero on screen, so the server render starts covered.
  const [covered, setCovered] = useState(pathname === ROUTES.HOME);
  return (
    <IslandProvider>
      <CoverContext.Provider value={setCovered}>
        {hidden ? null : <PageIsland covered={covered} theme={theme} />}
        {children}
      </CoverContext.Provider>
    </IslandProvider>
  );
};
