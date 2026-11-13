import { homedir } from "node:os";
import path from "node:path";

/**
 * Dev tools (lab, compare, frame route) only run in development, or in a production build when
 * ISLANDCN_DEV_TOOLS=1 is set for a capture server. Never on the public site.
 */
export const devToolsEnabled = () => process.env.NODE_ENV !== "production" || process.env.ISLANDCN_DEV_TOOLS === "1";

// The reference recordings and web captures are large and gitignored, so they live in the main
// checkout and every worktree reads them from there.
const mainCheckout = process.env.ISLANDCN_MAIN_CHECKOUT ?? path.join(homedir(), "projects", "islandcn");

/** Frame roots the compare page reads: reference frames and web captures, one folder per sequence. */
export const frameRoots = () => ({
  ref: process.env.ISLAND_REF_DIR ?? path.join(mainCheckout, "reference/frames"),
  cap: process.env.ISLAND_CAPTURE_DIR ?? path.join(mainCheckout, "captures"),
});

export type FrameRoot = keyof ReturnType<typeof frameRoots>;

export const parseFrameRoot = (value: string): FrameRoot | null => (value === "ref" || value === "cap" ? value : null);

/** Where reference sequence specs live: an override, this checkout, then the main checkout. */
export const sequenceDirs = () =>
  [
    process.env.ISLAND_REF_SEQ_DIR,
    path.join(process.cwd(), "reference/sequences"),
    path.join(mainCheckout, "reference/sequences"),
  ].filter((dir): dir is string => typeof dir === "string");

/** Sequence and frame folder names are plain slugs, so a request can never walk out of a root. */
export const isSafeName = (value: string) => /^[a-z0-9][a-z0-9._-]{0,80}$/i.test(value) && !value.includes("..");
