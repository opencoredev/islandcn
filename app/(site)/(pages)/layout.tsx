import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteIsland } from "@/components/site/site-island";

// Every page outside the docs shares one island, pinned to the top of the window.
const PagesLayout = ({ children }: { children: ReactNode }) => (
  <SiteIsland>
    <SiteHeader />
    <main className="flex-1">{children}</main>
    <SiteFooter />
  </SiteIsland>
);

export default PagesLayout;
