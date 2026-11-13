"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export type SiteTheme = "light" | "dark";

/** The page colour (--site-bg) per theme, as hex: islands on the site take it as `backdrop`, which sets their keyline. */
export const SITE_BACKDROP = { light: "#fbfbfd", dark: "#000000" } as const satisfies Record<SiteTheme, string>;

const noop = () => () => undefined;

/**
 * The theme the page is showing. Light until hydration, since the server
 * can't know; the class on <html> is already right, only island props wait.
 */
export const useSiteTheme = (): SiteTheme => {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted && resolvedTheme === "dark" ? "dark" : "light";
};
