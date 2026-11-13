/**
 * SVG builders for the outlined wordmark, shared by the sheet and asset
 * scripts. Units are DM Mono font units: 1000 units = 1 em.
 */
import { WORDMARK_DATA } from "../../components/brand/wordmark-data";

const [vx, vy, vw, vh] = WORDMARK_DATA.viewBox;

/** Wordmark box in em, for sizing it next to text set at the same size. */
export const WORDMARK_EM = { width: vw / 1000, height: vh / 1000 } as const;

export const wordmarkInner = ({ color, tittle }: { color: string; tittle?: string }) =>
  `<path d="${WORDMARK_DATA.body}" fill="${color}"/>${tittle ?? `<path d="${WORDMARK_DATA.tittle.d}" fill="${color}"/>`}`;

/** A standalone wordmark SVG, `fontSize` px tall per em. */
export const wordmarkSvg = ({ color, fontSize }: { color: string; fontSize: number }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${((vw / 1000) * fontSize).toFixed(1)}" height="${((vh / 1000) * fontSize).toFixed(1)}">${wordmarkInner({ color })}</svg>`;
