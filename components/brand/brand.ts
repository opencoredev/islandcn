/**
 * The islandcn identity as data: palette, mark geometry and lockup layout.
 * components/brand/logo.tsx and scripts/brand/build-assets.ts both draw from
 * here, so the React logo and the exported files can't drift apart.
 * docs/brand.md explains the choices.
 */
import { WORDMARK_DATA } from "./wordmark-data";

export const BRAND_COLORS = {
  /** The island, and the ground of every dark surface. */
  ink: "#000000",
  /** Light ground and text on ink. */
  paper: "#fafafa",
  /** oklch(0.86 0.15 172). The accent: the mark on ink, highlights, links on ink. */
  lagoon: "#46f0c6",
  /** oklch(0.52 0.1 172). The accent on light grounds: 5.0:1 on paper. */
  lagoonDeep: "#047b62",
} as const satisfies Record<string, `#${string}`>;

interface Capsule {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Circle {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

interface MarkGeometry {
  readonly width: number;
  readonly height: number;
  readonly pill: Capsule;
  /** The activity's icon on the leading side. */
  readonly dot: Circle;
  /** Its value on the trailing side, a short rounded bar. */
  readonly bar: Capsule;
}

/**
 * The mark: the island holding one activity in its compact view, an icon dot
 * on the leading side and a short value bar on the trailing side, both inset
 * by the same margin. A capsule with only one round dot read as a toggle
 * switch; the dot and bar pair reads as the island at work. Use at 24 px wide
 * and up.
 */
export const MARK = {
  width: 36,
  height: 12,
  pill: { x: 0, y: 0, width: 36, height: 12 },
  dot: { cx: 7, cy: 6, r: 2.5 },
  bar: { x: 21, y: 4.5, width: 10.5, height: 3 },
} as const satisfies MarkGeometry;

/**
 * The favicon cut, in a 32-unit square: a squatter pill, so the dot and bar
 * stay whole pixels at 16 px (pill 16 by 8, dot 3 across, bar 5 by 2).
 */
export const FAVICON_MARK = {
  width: 32,
  height: 32,
  pill: { x: 0, y: 5, width: 32, height: 22 },
  dot: { cx: 10, cy: 16, r: 4 },
  bar: { x: 18, y: 13.5, width: 9, height: 5 },
} as const satisfies MarkGeometry;

const [wordX, wordY, wordWidth, wordHeight] = WORDMARK_DATA.viewBox;

// Lockup, in wordmark font units (1000 = 1 em). The mark is 0.48 em tall, the
// word's x-height, and sits on the x-height's middle.
const LOCKUP_MARK_HEIGHT = 480;
const LOCKUP_GAP = 260;
const lockupScale = LOCKUP_MARK_HEIGHT / MARK.height;

export const LOCKUP = {
  markScale: lockupScale,
  markX: 0,
  markY: WORDMARK_DATA.baseline - WORDMARK_DATA.xHeight / 2 - LOCKUP_MARK_HEIGHT / 2,
  wordOffsetX: MARK.width * lockupScale + LOCKUP_GAP - wordX,
  viewBox: [0, wordY, MARK.width * lockupScale + LOCKUP_GAP + wordWidth, wordHeight],
} as const;

export const WORDMARK_VIEWBOX = [wordX, wordY, wordWidth, wordHeight] as const;

/** Which colours the mark takes. */
export type MarkTone = "on-light" | "on-dark" | "current";

interface ToneColors {
  readonly pill: string;
  readonly dot: string;
  readonly text: string;
}

/**
 * On light grounds the island is true black with bright lagoon content. On
 * dark grounds a black pill would vanish, so the pill turns paper and the
 * content takes the deep lagoon, which holds 5:1 on paper. "current" follows
 * the text colour and keeps the bright content.
 */
export const TONES = {
  "on-light": { pill: BRAND_COLORS.ink, dot: BRAND_COLORS.lagoon, text: BRAND_COLORS.ink },
  "on-dark": { pill: BRAND_COLORS.paper, dot: BRAND_COLORS.lagoonDeep, text: BRAND_COLORS.paper },
  current: { pill: "currentColor", dot: BRAND_COLORS.lagoon, text: "currentColor" },
} as const satisfies Record<MarkTone, ToneColors>;
