import type { ComponentProps } from "react";

import { FAVICON_MARK, LOCKUP, MARK, type MarkTone, TONES, WORDMARK_VIEWBOX } from "./brand";
import { WORDMARK_DATA } from "./wordmark-data";

type SvgProps = Omit<ComponentProps<"svg">, "children" | "viewBox">;

interface BrandSvgProps extends SvgProps {
  /** Colourway: "on-light" (black pill), "on-dark" (paper pill) or "current" (currentColor pill). Default "current". */
  tone?: MarkTone;
  /** Accessible name. Default undefined, which hides the SVG from assistive tech as decoration. */
  label?: string;
}

const a11y = (label: string | undefined) =>
  label === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": label };

const viewBoxOf = (box: readonly [number, number, number, number]) => box.join(" ");

const MarkShapes = ({ tone, small }: { tone: MarkTone; small: boolean }) => {
  const colors = TONES[tone];
  const { pill, dot, bar } = small ? FAVICON_MARK : MARK;
  return (
    <>
      <rect x={pill.x} y={pill.y} width={pill.width} height={pill.height} rx={pill.height / 2} fill={colors.pill} />
      <circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={colors.dot} />
      <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={bar.height / 2} fill={colors.dot} />
    </>
  );
};

interface LogoProps extends BrandSvgProps {
  /** Draw the 16 px favicon cut in a square box, for sizes under 24 px wide. Default false. */
  small?: boolean;
}

/** The islandcn mark: the island in its compact view, an icon dot and a value bar. 1em tall by default. */
export const Logo = ({ tone = "current", label, small = false, ...props }: LogoProps) => {
  const box = small ? FAVICON_MARK : MARK;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${box.width} ${box.height}`}
      width={small ? "1em" : `${(box.width / box.height).toFixed(4)}em`}
      height="1em"
      {...a11y(label)}
      {...props}
    >
      <MarkShapes tone={tone} small={small} />
    </svg>
  );
};

/** The lowercase "islandcn" wordmark, outlined from Geist SemiBold. Sized like text: 1em is the font size. */
export const Wordmark = ({ tone = "current", label = "islandcn", ...props }: BrandSvgProps) => {
  const [, , width, height] = WORDMARK_VIEWBOX;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBoxOf(WORDMARK_VIEWBOX)}
      width={`${width / 1000}em`}
      height={`${height / 1000}em`}
      {...a11y(label)}
      {...props}
    >
      <path d={WORDMARK_DATA.body + WORDMARK_DATA.tittle.d} fill={TONES[tone].text} />
    </svg>
  );
};

/** Mark and wordmark together, spaced as one unit. Sized like text: 1em is the wordmark's font size. */
export const Lockup = ({ tone = "current", label = "islandcn", ...props }: BrandSvgProps) => {
  const [, , width, height] = LOCKUP.viewBox;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBoxOf(LOCKUP.viewBox)}
      width={`${width / 1000}em`}
      height={`${height / 1000}em`}
      {...a11y(label)}
      {...props}
    >
      <g transform={`translate(${LOCKUP.markX} ${LOCKUP.markY}) scale(${LOCKUP.markScale})`}>
        <MarkShapes tone={tone} small={false} />
      </g>
      <path
        transform={`translate(${LOCKUP.wordOffsetX} 0)`}
        d={WORDMARK_DATA.body + WORDMARK_DATA.tittle.d}
        fill={TONES[tone].text}
      />
    </svg>
  );
};
