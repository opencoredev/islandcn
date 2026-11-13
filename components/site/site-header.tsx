import { HeaderBrand } from "./header-brand";
import { IslandClearance } from "./island-clearance";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

/*
 * The header is a status bar: the brand on the leading side, navigation on the
 * trailing side, and the centre left empty for the real island, which the
 * site pins to the top of the window above it. Items sit on the island's
 * centre line (13.91 + 36.84 / 2 = 32.3 pt from the top), as the clock and
 * signal bars do on a phone.
 *
 * Below lg the nav would run into a compact island, so it moves into a menu,
 * and the brand steps aside while a compact island needs the room
 * (`HeaderBrand`). An expanded island covers the whole row there; the header
 * stays where it is and the island floats over it, as it does over a status bar.
 *
 * The fill is the page colour, fully opaque: any translucency let big headings
 * scrolling under it read through as ghost text on both sides of the island.
 */
export const SiteHeader = () => (
  <IslandClearance className="sticky top-0 z-40 bg-site-bg">
    <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-4 px-5 sm:px-8">
      <HeaderBrand />
      <div className="hidden items-center gap-2 lg:flex">
        <NavLinks />
        <ThemeToggle className="-mr-2" />
      </div>
      <MobileMenu />
    </div>
  </IslandClearance>
);
