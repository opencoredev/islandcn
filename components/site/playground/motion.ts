import { MEASURED_SPRINGS } from "@/constants/island";
import { type ShapeTransition, islandMotion } from "@/lib/island";

/*
 * The spring controls that used to live on /studio: one spring per shape
 * transition, in SwiftUI's units, with the engine's defaults and the
 * simulator's fitted values to fall back on.
 */

/** The transitions the playground can tune, in the order they usually happen. */
export const TRANSITIONS = [
  "appear",
  "appearExpand",
  "expand",
  "pressExpand",
  "collapse",
  "alertCollapse",
  "swap",
  "split",
  "collapseSplit",
  "unsplit",
  "dismiss",
  "resize",
] as const satisfies readonly ShapeTransition[];

export const isTransition = (value: string): value is ShapeTransition => TRANSITIONS.some((transition) => transition === value);

export const TRANSITION_LABEL = {
  appear: "Appear",
  appearExpand: "Appear expanded",
  expand: "Expand",
  pressExpand: "Long-press expand",
  collapse: "Collapse",
  alertCollapse: "Alert collapse",
  swap: "Swap",
  split: "Split",
  collapseSplit: "Collapse to split",
  unsplit: "Unsplit",
  dismiss: "Dismiss",
  resize: "Resize",
} as const satisfies Record<ShapeTransition, string>;

export const TRANSITION_HINTS = {
  appear: "Idle to compact, when an activity starts.",
  expand: "Compact to expanded, from expand() or an alert.",
  collapse: "Expanded back to compact.",
  split: "A second activity starts and pinches off into a capsule.",
  unsplit: "The second activity ends and the capsule merges back.",
  dismiss: "The last activity ends and the pill returns to idle.",
  resize: "Content changes size inside the same presentation.",
  appearExpand: "An activity starts with an alert and opens straight to expanded.",
  pressExpand: "A long-press swells the pill, then hands its speed to the expansion.",
  alertCollapse: "An alert's hold ends and the island returns to compact.",
  swap: "One activity's view morphs into another's, passing through idle.",
  collapseSplit: "Expanded returns to the split when two activities run.",
} as const satisfies Record<ShapeTransition, string>;

export interface Spring {
  response: number;
  dampingFraction: number;
}

export type Springs = Record<ShapeTransition, Spring>;

const pick = (transition: ShapeTransition): Spring => {
  const { response, dampingFraction } = islandMotion.shape[transition];
  return { response, dampingFraction };
};

/** The engine's own defaults, fitted to the simulator. */
export const DEFAULT_SPRINGS: Springs = {
  appear: pick("appear"),
  appearExpand: pick("appearExpand"),
  expand: pick("expand"),
  pressExpand: pick("pressExpand"),
  collapse: pick("collapse"),
  alertCollapse: pick("alertCollapse"),
  swap: pick("swap"),
  split: pick("split"),
  collapseSplit: pick("collapseSplit"),
  unsplit: pick("unsplit"),
  dismiss: pick("dismiss"),
  resize: pick("resize"),
};

const isMeasured = (transition: ShapeTransition): transition is keyof typeof MEASURED_SPRINGS => Object.hasOwn(MEASURED_SPRINGS, transition);

/** The simulator's canonical-take spring, for the transitions that were recorded alone. */
export const measuredSpring = (transition: ShapeTransition): Spring | undefined =>
  isMeasured(transition) ? MEASURED_SPRINGS[transition] : undefined;

/** Slider ranges, in SwiftUI's units. */
export const SPRING_RANGE = {
  response: { min: 0.15, max: 1.2, step: 0.01 },
  dampingFraction: { min: 0.3, max: 1, step: 0.01 },
} as const;

const sameSpring = (a: Spring, b: Spring) =>
  Math.abs(a.response - b.response) < 1e-6 && Math.abs(a.dampingFraction - b.dampingFraction) < 1e-6;

/** Only the springs that differ from the engine's defaults. */
export const changedSprings = (springs: Springs) =>
  TRANSITIONS.filter((transition) => !sameSpring(springs[transition], DEFAULT_SPRINGS[transition]));

const round = (value: number) => Number(value.toFixed(3));

/** The provider's `motion` prop for the changed springs, or none. */
export const motionOverrides = (springs: Springs) => {
  const changed = changedSprings(springs);
  if (changed.length === 0) return undefined;
  return {
    shape: Object.fromEntries(
      changed.map((transition) => [
        transition,
        { response: round(springs[transition].response), dampingFraction: round(springs[transition].dampingFraction) },
      ]),
    ),
  };
};

/** `motion={{ ... }}` as source lines (no leading indent), or none when nothing changed. */
export const motionPropSource = (springs: Springs) => {
  const changed = changedSprings(springs);
  if (changed.length === 0) return null;
  const lines = changed.map(
    (transition) => `    ${transition}: { response: ${round(springs[transition].response)}, dampingFraction: ${round(springs[transition].dampingFraction)} },`,
  );
  return `motion={{\n  shape: {\n${lines.join("\n")}\n  },\n}}`;
};
