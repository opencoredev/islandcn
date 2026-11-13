import type { FrameRoot } from "./dirs";

/** One folder of numbered frames (0001.png, 0002.png, ...). */
export interface FrameSet {
  name: string;
  frames: number;
  /** Pixel scale from the capture manifest, when there is one. */
  scale: number | null;
  fps: number | null;
}

/** Response of GET /api/dev/frames. */
export type FrameListing = Record<FrameRoot, FrameSet[]>;

/** One frame of measure.py output (points); null where the blob or value was not found. */
export interface FidelityRow {
  frame: number;
  t: number;
  left: number | null;
  top: number | null;
  width: number | null;
  height: number | null;
  bubbleLeft: number | null;
  bubbleWidth: number | null;
}

/** Response of GET /api/dev/fidelity/<seq>: null when that side has not been measured. */
export interface FidelitySeries {
  ref: FidelityRow[] | null;
  web: FidelityRow[] | null;
}
