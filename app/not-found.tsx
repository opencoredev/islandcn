import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";

import { Icon } from "@/components/site/icon";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteIsland } from "@/components/site/site-island";
import { ROUTES } from "@/constants/routes";
import { SiteLink } from "@/components/site/site-link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/** Where to go instead: the home page and the two places the header links, each with what it is for. */
const PLACES = [
  { href: ROUTES.HOME, label: "Home", detail: "What islandcn is, playing live." },
  { href: ROUTES.PLAYGROUND, label: "Playground", detail: "Every preset. Build an island and copy its code." },
  { href: ROUTES.DOCS, label: "Docs", detail: "Install it and learn the API." },
] as const;

/*
 * An unknown address. It renders outside the site's layouts (Next gives the root not-found only the
 * root layout), so it brings the theme provider and the page island itself, and reads as any other
 * page: the header, one short line, the three places worth going, and the footer.
 */
const NotFound = () => (
  <RootProvider search={{ options: { type: "static", api: "/api/search" } }}>
    <div className="flex min-h-dvh flex-col">
      <SiteIsland>
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center px-5 pt-24 text-center sm:px-8 sm:pt-32">
          <p className="text-[13px] font-medium tracking-[0.02em] text-site-muted tabular-nums">404</p>
          <h1 className="mt-3 max-w-[12em] text-headline text-balance">There’s nothing at this address.</h1>
          <p className="mt-5 max-w-[30rem] text-lede text-balance text-site-muted">It may have moved, or the link has a typo. One of these is probably what you wanted.</p>
          <ul className="mt-10 grid w-full max-w-[40rem] gap-3 sm:grid-cols-3">
            {PLACES.map((place) => (
              <li key={place.href}>
                <SiteLink
                  href={place.href}
                  className="group flex h-full flex-col items-start gap-1 rounded-[16px] bg-site-fill px-4 py-3.5 text-left transition-[background-color,scale] duration-150 ease-out hover:bg-site-ink/[0.08] active:scale-[0.98]"
                >
                  <span className="inline-flex items-center gap-1 text-body font-medium text-site-ink">
                    {place.label}
                    <Icon icon={ArrowRight01Icon} size={16} strokeWidth={2} className="transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                  </span>
                  <span className="text-[13px] leading-[18px] text-site-muted">{place.detail}</span>
                </SiteLink>
              </li>
            ))}
          </ul>
        </main>
        <SiteFooter />
      </SiteIsland>
    </div>
  </RootProvider>
);

export default NotFound;
