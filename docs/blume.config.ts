import { defineConfig } from "blume";

/*
 * The islandcn docs, built with Blume to static HTML and served by the Next
 * site under /docs (scripts/build-docs.ts copies dist/ into public/docs/).
 * Pages live in docs/content/; the rest of docs/ holds repo notes Blume
 * never reads.
 */

const trimSlash = (url: string) => url.replace(/\/+$/, "");
const SITE_URL = trimSlash(process.env.SITE_URL ?? "http://localhost:3000");
const REGISTRY_URL = trimSlash(process.env.REGISTRY_URL ?? `${SITE_URL}/r`);

export default defineConfig({
  title: "islandcn",
  description:
    "The open-source Dynamic Island for React. Install it with shadcn, mount it once, and show your app's activities in one pill.",
  // The site header's mark, in its two colourways: the black pill on paper, the paper pill on ink.
  logo: { image: { light: "/logo-light.svg", dark: "/logo-dark.svg", alt: "" }, text: "islandcn", href: "/" },
  content: { root: "content" },
  variables: {
    registry: REGISTRY_URL,
    site: SITE_URL,
  },
  theme: {
    accent: { light: "#047b62", dark: "#46f0c6" },
    radius: "md",
    mode: "system",
  },
  navigation: {
    actions: [
      { href: `${SITE_URL}/playground`, label: "Playground" },
      { href: "https://github.com/leoisadev1/islandcn", label: "GitHub" },
    ],
  },
  // Pages that moved when the docs left Fumadocs keep working.
  redirects: [
    { from: "/introduction", to: "/" },
    { from: "/concepts/presentations", to: "/guides/presentations" },
    { from: "/concepts/layout", to: "/guides/presentations" },
    { from: "/concepts/split", to: "/guides/presentations" },
    { from: "/concepts/activities", to: "/guides/activities" },
    { from: "/concepts/groups", to: "/guides/activities" },
    { from: "/concepts/updates", to: "/guides/activities" },
    { from: "/concepts/alerts", to: "/guides/actions" },
    { from: "/concepts/long-press", to: "/guides/actions" },
    { from: "/concepts/motion", to: "/guides/motion" },
    { from: "/concepts/reduced-motion", to: "/guides/motion" },
    { from: "/concepts/keyline", to: "/guides/theming" },
    { from: "/api/activity", to: "/api/activity-options" },
    { from: "/api/handle", to: "/api/use-island" },
    { from: "/api/island-view", to: "/api/island" },
    { from: "/presets/notification", to: "/presets" },
  ],
  deployment: {
    site: SITE_URL,
    base: "/docs",
  },
});
