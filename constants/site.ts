/**
 * Site identity and the two URLs every agent surface prints. Site-only: no
 * shipped file may import from `@/constants`.
 */

const trimSlash = (url: string) => url.replace(/\/+$/, "");

/**
 * Vercel's own name for the production domain (islandcn.dev once it is attached). A fallback for
 * any render that runs without `SITE_URL`, so a production page never prints localhost URLs.
 */
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;

/** Origin the site is served from. Set `SITE_URL` for anything but local dev. */
export const SITE_URL = trimSlash(process.env.SITE_URL || vercelProductionUrl || "http://localhost:3000");

/** Base of the shadcn registry, `public/r` on this site unless `REGISTRY_URL` says otherwise. */
export const REGISTRY_URL = trimSlash(process.env.REGISTRY_URL ?? `${SITE_URL}/r`);

export const SITE = {
  name: "islandcn",
  /** The launch line. "Dynamic Island" is used descriptively here, as AGENTS.md allows. */
  headline: "The open-source Dynamic Island for React.",
  /** The line under the headline, and the short description everywhere else. */
  tagline: "A live status pill for the top of any web app.",
  description:
    "islandcn is the open-source Dynamic Island for React, installed with shadcn. It shows uploads, timers, calls, rides and music in one animated pill at the top of any web app, and you shape each activity around your app's own actions.",
  /** The search-result snippet: the description cut to the length search engines show (about 155 characters). */
  metaDescription:
    "The open-source Dynamic Island for React, installed with shadcn. Uploads, timers, calls, rides and music in one animated pill at the top of your web app.",
  author: "Leo",
  /** The public source. */
  repo: "https://github.com/opencoredev/islandcn",
} as const;

/** The registry item that installs the engine. */
export const ENGINE_ITEM = "island-core";

/** The registry item that installs the agent skill. */
export const SKILL_ITEM = "islandcn-skill";

/**
 * `REGISTRY_URL` on the server. The variables behind it are server-only, so in the browser it
 * would be the localhost fallback: a client component takes the URL as a prop from a server one.
 */
const serverRegistryUrl = () => {
  if (typeof window !== "undefined") {
    throw new Error("The registry URL was read in the browser, where it is unknown. Read it on the server and pass it down.");
  }
  return REGISTRY_URL;
};

interface ShadcnAddOptions {
  /** Base of the registry, without a trailing slash. Required. */
  registryUrl: string;
  /** Registry item names, without `.json`. Required. */
  items: readonly string[];
}

/** `npx shadcn add` for items under a given registry URL. Safe in the browser. */
export const shadcnAdd = ({ registryUrl, items }: ShadcnAddOptions) =>
  `npx shadcn@latest add ${items.map((name) => `${registryUrl}/${name}.json`).join(" ")}`;

export const registryItemUrl = (name: string) => `${serverRegistryUrl()}/${name}.json`;

export const addCommand = (...items: readonly string[]) => shadcnAdd({ registryUrl: serverRegistryUrl(), items });
