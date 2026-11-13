/**
 * The mark concepts explored for islandcn, drawn on a 32-unit grid so every
 * edge lands on a whole pixel at 16 px and 32 px. Exploration only: the chosen
 * mark is promoted to components/brand/marks.ts.
 */

export interface Colorway {
  /** The island itself: black on light grounds, lagoon on black grounds. */
  readonly shape: string;
  /** Detail drawn on top of the island (a status light, a knockout). */
  readonly onShape: string;
  /** Detail drawn on the ground next to the island. */
  readonly onGround: string;
  readonly ground: string;
  readonly text: string;
}

export const PALETTE = {
  ink: "#000000",
  paper: "#fafafa",
  lagoon: "#46f0c6",
  lagoonDeep: "#047b62",
} as const satisfies Record<string, string>;

export const LIGHT: Colorway = {
  shape: PALETTE.ink,
  onShape: PALETTE.lagoon,
  onGround: PALETTE.lagoonDeep,
  ground: PALETTE.paper,
  text: PALETTE.ink,
};

export const DARK: Colorway = {
  shape: PALETTE.lagoon,
  onShape: PALETTE.ink,
  onGround: PALETTE.lagoon,
  ground: PALETTE.ink,
  text: PALETTE.paper,
};

export interface Concept {
  readonly id: string;
  readonly name: string;
  readonly idea: string;
  readonly draw: (c: Colorway) => string;
}

const capsule = ({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;

// A metaball-style neck between the pill's right cap and the bubble, so the
// split reads as one shape pinching in two.
const pinchNeck = (fill: string) => {
  const pill = { cx: 12, cy: 16, r: 6 };
  const bubble = { cx: 26, cy: 16, r: 5 };
  const at = (c: { cx: number; cy: number; r: number }, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [c.cx + c.r * Math.cos(rad), c.cy + c.r * Math.sin(rad)].map((n) => n.toFixed(2)).join(" ");
  };
  const waist = 1.4;
  return `<path d="M${at(pill, -55)}Q19.5 ${16 - waist} ${at(bubble, -125)}L${at(bubble, 125)}Q19.5 ${16 + waist} ${at(pill, 55)}Z" fill="${fill}"/>`;
};

export const CONCEPTS = [
  {
    id: "a-live",
    name: "A. Live pill",
    idea: "The island in its compact state, holding a leading light and a trailing readout. The product, drawn literally.",
    draw: (c) =>
      `${capsule({ x: 2, y: 10, w: 28, h: 12, fill: c.shape })}<circle cx="10" cy="16" r="3" fill="${c.onShape}"/>${capsule({ x: 16, y: 14, w: 8, h: 4, fill: c.onShape })}`,
  },
  {
    id: "b-split",
    name: "B. Split",
    idea: "Two activities at once: the pill plus its detached bubble. An island and its islet, and the engine's signature state.",
    draw: (c) => `${capsule({ x: 0, y: 10, w: 20, h: 12, fill: c.shape })}<circle cx="27" cy="16" r="5" fill="${c.onGround}"/>`,
  },
  {
    id: "c-tittle",
    name: "C. Tittle",
    idea: "A mono lowercase i, cut like the wordmark's, whose dot is the island floating at the top.",
    draw: (c) =>
      `${capsule({ x: 8, y: 2, w: 16, h: 8, fill: c.onGround })}<path d="M6 14H20V26H26V30H6V26H12V18H6Z" fill="${c.text}"/>`,
  },
  {
    id: "d-horizon",
    name: "D. Horizon",
    idea: "The capsule as an island on the sea, with its reflection drawn as a dither below the waterline: a nod to dithercn's pixels.",
    draw: (c) => {
      const row = (y: number, xs: readonly number[]) =>
        xs.map((x) => `<rect x="${x}" y="${y}" width="2" height="2" fill="${c.onGround}"/>`).join("");
      return `${capsule({ x: 6, y: 4, w: 20, h: 10, fill: c.shape })}<rect x="2" y="18" width="28" height="2" fill="${c.onGround}"/>${row(22, [6, 10, 14, 18, 22])}${row(26, [10, 14, 18])}${row(30, [14])}`;
    },
  },
  {
    id: "e-pinch",
    name: "E. Pinch",
    idea: "The split caught mid-motion: the pill pinching off a bubble through a gooey neck. The mark is the morph itself.",
    draw: (c) =>
      `${capsule({ x: 0, y: 10, w: 18, h: 12, fill: c.shape })}<circle cx="26" cy="16" r="5" fill="${c.shape}"/>${pinchNeck(c.shape)}`,
  },
] as const satisfies readonly Concept[];

export const markSvg = ({ concept, colors, size }: { concept: Concept; colors: Colorway; size?: number }) => {
  const dims = size === undefined ? "" : ` width="${size}" height="${size}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${dims}>${concept.draw(colors)}</svg>`;
};
