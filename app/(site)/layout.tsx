import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

// Theme and search for every site page. Track B's /lab and /compare live
// outside this group and render without it.
const SiteLayout = ({ children }: { children: ReactNode }) => (
  <RootProvider search={{ options: { type: "static", api: "/api/search" } }}>
    <div className="flex min-h-dvh flex-col">{children}</div>
  </RootProvider>
);

export default SiteLayout;
