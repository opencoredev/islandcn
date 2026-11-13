/**
 * The content and event spec a lab sequence replays. Track A's `reference/sequences/<name>.json`
 * describes each recording (content, frame count, shape onset); this file turns that into events
 * on the same timeline, so web frame N and reference frame N show the same moment. Parsed at the
 * boundary, trusted after.
 */

// The metrics module directly: the fidelity scripts load this file outside the app.
import { islandMetrics } from "../../lib/island/metrics";

export type ShapeSpec =
  | { kind: "circle"; size: number; color: string }
  | { kind: "ring"; size: number; color: string; width: number; progress: number }
  | {
      kind: "bar";
      width: number | "fill";
      height: number;
      color: string;
      radius: number;
      progress?: number;
      track?: string;
      /** Continuous corners (`continuousRectPath`'s smoothing), as SwiftUI's `.continuous` style; circular when left out. */
      smoothing?: number;
    }
  | {
      kind: "text";
      text: string;
      size: number;
      weight: number;
      color: string;
      tabular: boolean;
      numeric: boolean;
      /** Points to shift the glyphs by, where SwiftUI centres a line box differently from Chrome. */
      nudge?: { x: number; y: number };
      /** Letter spacing in points, where Chrome's advances differ from SwiftUI's. */
      tracking?: number;
      /** Where the tracked glyphs sit in the untracked line's width: as the slot aligns the text. Default "start". */
      align?: "start" | "center" | "end";
    }
  | { kind: "stack"; direction: "row" | "column"; gap: number; align: "start" | "center" | "end"; items: ShapeSpec[] }
  /** A row of equal-width capsules across the region, the first `filled` in `color`, the rest in `track`. */
  | { kind: "capsules"; count: number; filled: number; height: number; gap: number; color: string; track: string }
  /** A fixed-height frame that centres its content vertically, like SwiftUI's `.frame(height:)`. */
  | { kind: "frame"; height: number; item: ShapeSpec };

export interface ActivitySpec {
  label: string;
  /** Activities of one app share a group: one shows at a time (`ActivityOptions.group`). */
  group?: string;
  compact: { leading: ShapeSpec | null; trailing: ShapeSpec | null };
  minimal: ShapeSpec | null;
  expanded: { leading: ShapeSpec | null; trailing: ShapeSpec | null; center: ShapeSpec | null; bottom: ShapeSpec | null };
}

export type LabAction =
  | "start"
  | "start-alert"
  | "start-secondary"
  | "start-secondary-alert"
  /**
   * An alerting update to the secondary while it waits hidden behind the primary (held-out `swap`:
   * one app started W, then B, and iOS kept showing W). Both run in one group, so the engine hands
   * over: W leaves, then B expands.
   */
  | "alert-hidden-secondary"
  | "end"
  | "end-secondary"
  | "expand"
  | "expand-secondary"
  | "collapse"
  | "press"
  | "press-bubble"
  | "release"
  | "alert";

export interface LabEvent {
  /** ms from frame 1. */
  at: number;
  action: LabAction;
}

export interface SequenceSpec {
  name: string;
  /** Capture frame rate. */
  fps: number;
  /** Length in ms: the reference's frame count at `fps`. */
  duration: number;
  /** Actions applied instantly before time 0. */
  setup: LabAction[];
  events: LabEvent[];
  content: {
    primary: ActivitySpec;
    secondary: ActivitySpec;
    /** The primary's alerting update (`alert`). */
    alertUpdate: ActivitySpec;
    /** The secondary's alerting update (`alert-hidden-secondary`). */
    secondaryAlertUpdate: ActivitySpec;
  };
  /** Shape onset of the reference take (s), for the compare page and fidelity report. */
  onset: number | null;
  /** Reference frame folder the sequence lines up with. */
  reference: string | null;
  /** Where the spec came from, shown on the lab and compare pages. */
  source: "reference" | "built-in";
  /** Stage colour the reference was recorded over (the sample app's Backdrop). */
  background: string;
}

/**
 * Where Chrome sets the system font apart from SwiftUI, per point size, measured on the resting
 * states through a real 3x capture (round 23, `scripts/fidelity/rest.py`): `y` and `x` move the
 * glyphs (SwiftUI's line box puts them higher than Chrome's; layout is untouched, so the island
 * keeps its size) and `tracking` closes the gap between their advances (Chrome's run wider at 17
 * and 20 pt, narrower at 34 with the -0.01em used before). At 15 pt the compact digits are within
 * 0.2 pt untracked, and the bubble cuts that text to an ellipsis, which tracked glyphs drawn over
 * the line would escape. Resting content sits on whole device pixels, so `x` moves in thirds of a
 * point. A size missing here gets none of it.
 */
const systemText = {
  13: { x: 0.33, y: -0.67, tracking: 0 },
  15: { x: 0, y: -0.33, tracking: 0 },
  17: { x: 0.17, y: -1, tracking: -0.045 },
  20: { x: -0.33, y: -0.67, tracking: -0.11 },
  34: { x: 0, y: -0.67, tracking: -0.09 },
} as const satisfies Record<number, { x: number; y: number; tracking: number }>;

const textSizes: Record<number, { x: number; y: number; tracking: number } | undefined> = systemText;

// Proportional digits, as the sample app's Text views use: compact A grows 0.33 pt from "42" to "43".
const text = (value: string, size: number, weight: number, align: "start" | "center" | "end" = "start"): ShapeSpec => {
  const fit = textSizes[size];
  return {
    kind: "text",
    text: value,
    size,
    weight,
    color: "#ffffff",
    tabular: false,
    nudge: fit ? { x: fit.x, y: fit.y } : undefined,
    tracking: fit && fit.tracking !== 0 ? fit.tracking : undefined,
    align,
    // SwiftUI animates a changed number in place; the lab draws numbers with IslandNumber.
    numeric: /^\d+$/.test(value),
  };
};

/** The sample Live Activity's palette (reference/ios-sample/Shared/RefAttributes.swift). */
interface Palette {
  accent: string;
  green: string;
  track: string;
}

const activity = (slot: string, value: number, progress: number, palette: Palette): ActivitySpec => ({
  label: `islandcn ${slot}, ${value}`,
  compact: { leading: { kind: "circle", size: 22, color: palette.accent }, trailing: text(String(value), 15, 600) },
  // Declared by the sample app; iOS 27 never showed it, so it only appears in the fallback split.
  minimal: { kind: "circle", size: 22, color: palette.accent },
  expanded: {
    // RoundedRectangle(cornerRadius: 12, style: .continuous): the engine's continuous corner at
    // radius 12 and the island's own smoothing fits the resting square at 0.09 px RMS on its three
    // unclipped corners (expand-t1), where the circular radius 13 drawn before missed by 0.57 px.
    leading: { kind: "bar", width: 52, height: 52, color: palette.accent, radius: 12, smoothing: islandMetrics.corner.smoothing },
    // The sample app centres this in a 52 pt frame (the engine top-aligns the side regions, as
    // iOS does); SwiftUI's line box puts the glyphs higher than Chrome's (`systemText`).
    trailing: { kind: "frame", height: 52, item: text(String(value), 34, 700, "end") },
    center: text(`islandcn ${slot}`, 17, 600, "center"),
    bottom: { kind: "bar", width: "fill", height: 8, color: palette.green, radius: 4, progress, track: palette.track },
  },
});

const defaultPalette = { green: "#30D158", track: "#414141" };

/** The held-out wide activity W's state (reference/ios-sample/Widget/IslandRefWidget.swift, WideLiveActivity). */
interface WideState {
  title: string;
  eta: string;
  minutes: number;
  filled: number;
}

const wideActivity = (state: WideState, palette: Omit<Palette, "accent">): ActivitySpec => ({
  label: `${state.title}, ${state.eta}`,
  compact: { leading: { kind: "circle", size: 22, color: palette.green }, trailing: text(state.eta, 15, 600) },
  minimal: { kind: "circle", size: 22, color: palette.green },
  expanded: {
    leading: { kind: "circle", size: 36, color: palette.green },
    trailing: { kind: "frame", height: 36, item: text(`${state.minutes} min`, 20, 600, "end") },
    // VStack(spacing: 2), centred. Chrome's line boxes for the two lines (1.15 x the size) come out
    // 0.21 pt shorter than SwiftUI's on the Mac Mini (wide-expand at rest: 106.97 against the takes'
    // 107.16 to 107.18), so the lab's stack opens by that.
    center: { kind: "stack", direction: "column", gap: 2.21, align: "center", items: [text(state.title, 17, 600, "center"), text(`Arrives ${state.eta}`, 13, 400, "center")] },
    bottom: { kind: "capsules", count: 4, filled: state.filled, height: 6, gap: 6, color: palette.green, track: palette.track },
  },
});

const defaultWide: WideState = { title: "Heading home", eta: "12:45", minutes: 3, filled: 2 };

export const defaultContent: SequenceSpec["content"] = {
  primary: activity("A", 42, 0.6, { accent: "#FF9500", ...defaultPalette }),
  secondary: activity("B", 7, 0.6, { accent: "#0A84FF", ...defaultPalette }),
  alertUpdate: activity("A", 43, 0.8, { accent: "#FF9500", ...defaultPalette }),
  secondaryAlertUpdate: activity("B", 8, 0.8, { accent: "#0A84FF", ...defaultPalette }),
};

/**
 * Which activities a sequence runs as primary and secondary. Round 1 to 3 run A and B; the held-out
 * set runs the wide activity W alone, A attached with W in the bubble, or W shown with B hidden.
 */
type Cast = "a-b" | "w" | "a-w" | "w-b";

interface Script {
  setup: LabAction[];
  /**
   * Events in seconds on the reference take's timeline. The first one is the fitted spring start
   * (t0) of that take from `scripts/fidelity/fits.json`, so springs start where the simulator's did.
   */
  events: { at: number; action: LabAction }[];
  /** Fallback length in frames when no reference file is found. */
  frames: number;
  /** Activities in play; "a-b" when left out. */
  cast?: Cast;
}

// Presses start at touch-down, which reference round 2 puts one tick (0.036 s) before the
// recorded shape onset: expand-t1's swell t0 is 1.906 against an onset of 1.9417.
const touchLead = 0.036;

const scripts: Record<string, Script> = {
  // appear-t1 left/right t0 1.9295 / 1.9259.
  appear: { setup: [], events: [{ at: 1.928, action: "start" }], frames: 226 },
  // appear-alert-t1 left/height t0 7.1841 / 7.1789; collapses after the alert hold.
  "appear-alert": { setup: [], events: [{ at: 7.182, action: "start-alert" }], frames: 836 },
  // expand-t1 swell t0 1.903 to 1.911; the finger lifts 1.0 s after it went down.
  expand: {
    setup: ["start"],
    events: [
      { at: 1.906, action: "press" },
      { at: 1.906 + 1.0, action: "release" },
    ],
    frames: 230,
  },
  // expand-dark-t1 over #3A3A3C: onset 4.4683.
  "expand-dark": {
    setup: ["start"],
    events: [
      { at: 4.4683 - touchLead, action: "press" },
      { at: 4.4683 - touchLead + 0.9, action: "release" },
    ],
    frames: 379,
  },
  // press-t1: onset 2.0033, the same 0.037 s lead as expand-t1; a 2.5 s hold.
  press: {
    setup: ["start"],
    events: [
      { at: 1.966, action: "press" },
      { at: 1.966 + 2.5, action: "release" },
    ],
    frames: 233,
  },
  // tap-t1: asked 150 ms, about 0.05 s real; onset 4.515. iOS then opens the app, which the web doesn't.
  tap: {
    setup: ["start"],
    events: [
      { at: 4.515 - touchLead, action: "press" },
      { at: 4.515 - touchLead + 0.05, action: "release" },
    ],
    frames: 389,
  },
  // hold200-t3: asked 200 ms, about 0.10 s real, just under the threshold; onset 4.49.
  hold200: {
    setup: ["start"],
    events: [
      { at: 4.49 - touchLead, action: "press" },
      { at: 4.49 - touchLead + 0.095, action: "release" },
    ],
    frames: 391,
  },
  // idletap-t1: the idle island, about 0.05 s; onset 4.7633.
  idletap: {
    setup: [],
    events: [
      { at: 4.7633 - touchLead, action: "press" },
      { at: 4.7633 - touchLead + 0.05, action: "release" },
    ],
    frames: 375,
  },
  // idlehold-t1: the idle island held 1 s (about 0.9 s real); onset 5.0733.
  idlehold: {
    setup: [],
    events: [
      { at: 5.0733 - touchLead, action: "press" },
      { at: 5.0733 - touchLead + 0.9, action: "release" },
    ],
    frames: 396,
  },
  // collapse-t1 left/right t0 1.7355 (through idle).
  collapse: { setup: ["start", "expand"], events: [{ at: 1.7355, action: "collapse" }], frames: 239 },
  // collapse-dark-t1 over #3A3A3C: left t0 2.0544, the same 0.0185 s lead as collapse-t1.
  "collapse-dark": { setup: ["start", "expand"], events: [{ at: 2.073, action: "collapse" }], frames: 233 },
  // alert-t1 left/right t0 4.0927 / 4.0939 (the recorder wrote no new frame from 4.09 to 4.12).
  alert: { setup: ["start"], events: [{ at: 4.093, action: "alert" }], frames: 713 },
  // dismiss-t1 left/right t0 3.4993 / 3.4996.
  dismiss: { setup: ["start"], events: [{ at: 3.4995, action: "end" }], frames: 294 },
  // split-t1 left/right t0 1.927 / 1.934 (through idle).
  split: { setup: ["start"], events: [{ at: 1.93, action: "start-secondary" }], frames: 226 },
  // split-alert-t1 left/right t0 7.7956 / 7.7952 (through idle).
  "split-alert": { setup: ["start"], events: [{ at: 7.7954, action: "start-secondary-alert" }], frames: 886 },
  // unsplit-t1 left/right t0 2.6832 / 2.6948.
  unsplit: { setup: ["start", "start-secondary"], events: [{ at: 2.689, action: "end-secondary" }], frames: 263 },
  // Held-out set (reference/MEASUREMENTS.md, "Held-out set"), canonical takes, events by the same
  // rules as above: a start, end or collapse at the mean of the fitted left/right t0, a press one
  // touchLead before the first visible swell. Nothing here is tuned to the match.
  // wide-appear-t1 left/right t0 3.3497 / 3.3479.
  "wide-appear": { setup: [], events: [{ at: 3.3488, action: "start" }], frames: 307, cast: "w" },
  // wide-expand-t1: swell onset 4.1767; the finger lifts 1.0 s after it went down.
  "wide-expand": {
    setup: ["start"],
    events: [
      { at: 4.1767 - touchLead, action: "press" },
      { at: 4.1767 - touchLead + 1.0, action: "release" },
    ],
    frames: 341,
    cast: "w",
  },
  // wide-collapse-t1 left/right t0 2.0139 / 2.0008.
  "wide-collapse": { setup: ["start", "expand"], events: [{ at: 2.0074, action: "collapse" }], frames: 235, cast: "w" },
  // split-expand-b-t1: the bubble's first movement is 4.185 (heldout.json `onset_s`); the
  // sequence file's 4.3683 is the attached pill's, which only moves at the merge.
  "split-expand-b": {
    setup: ["start", "start-secondary"],
    events: [
      { at: 4.185 - touchLead, action: "press-bubble" },
      { at: 4.185 - touchLead + 1.0, action: "release" },
    ],
    frames: 377,
    cast: "a-w",
  },
  // split-collapse-b-t1 left/right t0 2.0277 / 2.0397.
  "split-collapse-b": {
    setup: ["start", "start-secondary", "expand-secondary"],
    events: [{ at: 2.0337, action: "collapse" }],
    frames: 251,
    cast: "a-w",
  },
  // swap-t2: W's first motion, width/left/right t0 4.4917 / 4.4916 / 4.4913. B starts hidden.
  swap: { setup: ["start", "start-secondary"], events: [{ at: 4.4915, action: "alert-hidden-secondary" }], frames: 734, cast: "w-b" },
  // dismiss-wide-t1 left/right t0 3.7206 / 3.7205.
  "dismiss-wide": { setup: ["start"], events: [{ at: 3.7205, action: "end" }], frames: 311, cast: "w" },
  // Not a reference sequence: proves a retarget mid-flight carries velocity over.
  interrupt: {
    setup: ["start"],
    events: [
      { at: 0.3, action: "expand" },
      { at: 0.46, action: "collapse" },
    ],
    frames: 109,
  },
  // Not a reference sequence (ICN-7 d25, council 20; named with the interrupt prefix so the probe
  // gates skip it): the playground's Split pressed on an expanded island before d25, a collapse and
  // the secondary's start in one commit (the two events share a moment, so `toIslandSequence` runs
  // them in one call), which the engine runs as `collapseSplit`. 0.52 s after that commit the
  // attached pill's two slots step about 5 pt right in one frame (`contentTiming.collapseSplit
  // .partStep`, fitted to iOS on split-collapse-b, round 31): frame 152 to 153 here, leading 93.3
  // to 98.2 px, where it stays, trailing 131.4 to 136.3 px, then down to its rest at 126.2. The content is legible
  // well before then, so the step reads as a pop; in the playground the timer's last digit was also
  // cut on the step frame. `content=collapseSplit:partStep=0` removes it. Probe the frames around
  // 2.52 s, or capture them with `capture.mjs --seq interrupt-split-from-expanded`.
  "interrupt-split-from-expanded": {
    setup: ["start", "expand"],
    events: [
      { at: 2.0, action: "collapse" },
      { at: 2.0, action: "start-secondary" },
    ],
    frames: 200,
  },
  // Not a reference sequence (round 39): an expansion 0.13 s into collapse's returning entry (its
  // delay is 0.36 s), while the returning digits still slide in from outside (`trailingSlide`).
  // Before the fix their offset dropped to 0 in one frame; it now eases out with their presence.
  "interrupt-return": {
    setup: ["start", "expand"],
    events: [
      { at: 0.3, action: "collapse" },
      { at: 0.3 + 0.36 + 0.13, action: "expand" },
    ],
    frames: 90,
  },
};

export const sequenceNames = Object.keys(scripts);

/**
 * One alignment rule for every sequence, in seconds added to all of its events (they keep their
 * spacing): the web's first 0.15 s of visible motion lands on the reference's, measured the same
 * way on both sides (`scripts/fidelity/align.ts`, README "Event alignment"). The events above are
 * the fitted spring starts; where the engine reproduces a take's onset this is under 0.3 frames.
 * wide-collapse-t1's single-spring fit is poor (RMSE 5.4 pt), so its t0 sits 32 ms early.
 */
const alignment = {
  appear: 0.0005,
  "appear-alert": 0.001,
  expand: -0.0025,
  press: 0.0002,
  collapse: 0.0004,
  alert: -0.0011,
  dismiss: 0.0004,
  split: 0.0004,
  "split-alert": 0.0051,
  unsplit: 0.0032,
  "expand-dark": -0.0013,
  "collapse-dark": 0.0002,
  tap: -0.002,
  hold200: -0.0005,
  idletap: -0.0011,
  idlehold: -0.0014,
  "wide-appear": -0.0001,
  "wide-expand": 0.0004,
  "wide-collapse": 0.0324,
  "split-expand-b": 0.0043,
  "split-collapse-b": 0.0044,
  swap: 0.003,
  "dismiss-wide": 0.0042,
} as const satisfies Record<string, number>;

const alignments: ReadonlyMap<string, number> = new Map(Object.entries(alignment));
const alignmentOf = (name: string): number => alignments.get(name) ?? 0;

/** One unseen take on its own timeline. */
interface TakeTimeline {
  /** The sequence whose script and content it replays. */
  seq: string;
  /** The take's 60 fps frame count. */
  frames: number;
  /** Seconds added to every event of the sequence (after `alignment`), so they keep their spacing. */
  shift: number;
  /**
   * Seconds the finger stayed down, for a take whose own press differs from the canonical take's
   * (each release then lands this long after its press). Default: the sequence's own hold.
   */
  hold?: number;
}

/**
 * The final round's unseen takes (ICN-3, `scripts/fidelity/FINAL.md`): separate recordings of the
 * canonical sequences that the engine was never tuned on. Each replays its sequence's content and
 * events; `shift` is what the same alignment rule as `alignment` measures against the take
 * (`scripts/fidelity/final.ts align`), so the web's first 0.15 s of motion lands on the take's.
 * Left out: alert-t2 (used in an earlier digit fit) and the hold210 to hold700 calibration takes.
 */
const takes = {
  "appear-t2": { seq: "appear", frames: 227, shift: 0.0384 },
  "appear-t3": { seq: "appear", frames: 219, shift: -0.0843 },
  "appear-alert-t2": { seq: "appear-alert", frames: 604, shift: 1.0592 },
  "expand-t2": { seq: "expand", frames: 457, shift: -0.0471 },
  "press-t2": { seq: "press", frames: 239, shift: 0.2875 },
  "collapse-t2": { seq: "collapse", frames: 242, shift: 0.0747 },
  "dismiss-t2": { seq: "dismiss", frames: 294, shift: -0.0142 },
  "split-t2": { seq: "split", frames: 248, shift: -0.117 },
  "split-alert-t2": { seq: "split-alert", frames: 893, shift: -0.1384 },
  "unsplit-t2": { seq: "unsplit", frames: 261, shift: 0.0335 },
  "expand-dark-t2": { seq: "expand-dark", frames: 356, shift: -0.2203 },
  "collapse-dark-t2": { seq: "collapse-dark", frames: 232, shift: -0.0145 },
  "tap-t2": { seq: "tap", frames: 377, shift: -0.2212 },
  "tap-t3": { seq: "tap", frames: 392, shift: 0.0232 },
  "hold200-t1": { seq: "hold200", frames: 381, shift: -0.2018 },
  // hold200's real hold (asked 200 ms less 0.09 to 0.11 s) straddles the 0.1 s decision: t1 and t3
  // let go before it, t2 after it, so iOS expands (4.85 s). t2 replays the top of that range.
  "hold200-t2": { seq: "hold200", frames: 399, shift: 0.1705, hold: 0.11 },
  "wide-appear-t2": { seq: "wide-appear", frames: 310, shift: 0.0151 },
  "wide-expand-t2": { seq: "wide-expand", frames: 342, shift: 0.0097 },
  "wide-collapse-t2": { seq: "wide-collapse", frames: 226, shift: -0.057 },
  "split-expand-b-t2": { seq: "split-expand-b", frames: 384, shift: -0.0271 },
  "split-collapse-b-t2": { seq: "split-collapse-b", frames: 226, shift: -0.0155 },
  "swap-t1": { seq: "swap", frames: 798, shift: 0.2676 },
  "dismiss-wide-t2": { seq: "dismiss-wide", frames: 310, shift: 0.0225 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 4's fresh takes (ICN-3, `scripts/fidelity/FRESH.md`): recorded after the engine was frozen
 * (`scripts/fidelity/FROZEN.txt`) and never seen by any fit, `<seq>-t9` of every sequence plus
 * swap-t10 and split-expand-b-t10. Same rule and fields as `takes`. Every press here replays its
 * sequence's own hold: hold200-t9 was redone until the press let go before the decision (iOS
 * opened the app, as on hold200-t3), so it needs no `hold`.
 */
const freshTakes = {
  "appear-t9": { seq: "appear", frames: 211, shift: -0.2468 },
  "appear-alert-t9": { seq: "appear-alert", frames: 953, shift: 0.9 },
  "expand-t9": { seq: "expand", frames: 225, shift: -0.1489 },
  "press-t9": { seq: "press", frames: 228, shift: -0.1946 },
  "collapse-t9": { seq: "collapse", frames: 205, shift: -0.1359 },
  "alert-t9": { seq: "alert", frames: 726, shift: 0.1905 },
  "dismiss-t9": { seq: "dismiss", frames: 312, shift: 0.3088 },
  "split-t9": { seq: "split", frames: 209, shift: -0.2351 },
  "split-alert-t9": { seq: "split-alert", frames: 1001, shift: 0.7929 },
  "unsplit-t9": { seq: "unsplit", frames: 314, shift: 0.8927 },
  "expand-dark-t9": { seq: "expand-dark", frames: 362, shift: -0.4202 },
  "collapse-dark-t9": { seq: "collapse-dark", frames: 228, shift: -0.0881 },
  "tap-t9": { seq: "tap", frames: 362, shift: -0.4618 },
  "hold200-t9": { seq: "hold200", frames: 365, shift: -0.42 },
  "idletap-t9": { seq: "idletap", frames: 332, shift: -0.7217 },
  "idlehold-t9": { seq: "idlehold", frames: 333, shift: -1.052 },
  "wide-appear-t9": { seq: "wide-appear", frames: 303, shift: -0.1127 },
  "wide-expand-t9": { seq: "wide-expand", frames: 357, shift: -0.1507 },
  "wide-collapse-t9": { seq: "wide-collapse", frames: 227, shift: -0.0384 },
  "split-expand-b-t9": { seq: "split-expand-b", frames: 370, shift: -0.117 },
  "split-expand-b-t10": { seq: "split-expand-b", frames: 363, shift: -0.1087 },
  "split-collapse-b-t9": { seq: "split-collapse-b", frames: 229, shift: -0.0525 },
  "swap-t9": { seq: "swap", frames: 755, shift: 0.3462 },
  "swap-t10": { seq: "swap", frames: 750, shift: 0.2435 },
  "dismiss-wide-t9": { seq: "dismiss-wide", frames: 311, shift: -0.0057 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 5's unseen takes (ICN-3, `scripts/fidelity/T11.md`): recorded on their own simulator after
 * the engine was frozen at 70784d3 and opened by nothing before this round, `<seq>-t11` of every
 * sequence plus swap-t12 and split-expand-b-t12. Same rule and fields as `takes`. Every press
 * replays its sequence's own hold: hold200-t11 let go before the decision and iOS opened the app
 * (as on hold200-t3), so it needs no `hold`.
 */
const t11Takes = {
  "appear-t11": { seq: "appear", frames: 208, shift: -0.216 },
  "appear-alert-t11": { seq: "appear-alert", frames: 990, shift: 1.5473 },
  "expand-t11": { seq: "expand", frames: 215, shift: -0.0447 },
  "press-t11": { seq: "press", frames: 211, shift: -0.1478 },
  "collapse-t11": { seq: "collapse", frames: 209, shift: -0.0813 },
  "alert-t11": { seq: "alert", frames: 708, shift: -0.0978 },
  "dismiss-t11": { seq: "dismiss", frames: 299, shift: 0.0833 },
  "split-t11": { seq: "split", frames: 218, shift: -0.1501 },
  "split-alert-t11": { seq: "split-alert", frames: 964, shift: 0.2655 },
  "unsplit-t11": { seq: "unsplit", frames: 293, shift: 0.5465 },
  "expand-dark-t11": { seq: "expand-dark", frames: 373, shift: -0.2038 },
  "collapse-dark-t11": { seq: "collapse-dark", frames: 232, shift: -0.02 },
  "tap-t11": { seq: "tap", frames: 376, shift: -0.235 },
  "hold200-t11": { seq: "hold200", frames: 375, shift: -0.2868 },
  "idletap-t11": { seq: "idletap", frames: 340, shift: -0.5711 },
  "idlehold-t11": { seq: "idlehold", frames: 341, shift: -0.905 },
  "wide-appear-t11": { seq: "wide-appear", frames: 316, shift: 0.0989 },
  "wide-expand-t11": { seq: "wide-expand", frames: 357, shift: 0.0802 },
  "wide-collapse-t11": { seq: "wide-collapse", frames: 233, shift: 0.0441 },
  "split-expand-b-t11": { seq: "split-expand-b", frames: 361, shift: 0.0094 },
  "split-expand-b-t12": { seq: "split-expand-b", frames: 376, shift: 0.0614 },
  "split-collapse-b-t11": { seq: "split-collapse-b", frames: 234, shift: 0.0912 },
  "swap-t11": { seq: "swap", frames: 747, shift: -0.3216 },
  "swap-t12": { seq: "swap", frames: 725, shift: -0.2485 },
  "dismiss-wide-t11": { seq: "dismiss-wide", frames: 316, shift: 0.0895 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 6's unseen takes (ICN-3, `scripts/fidelity/T13.md`): recorded on their own simulator after
 * the engine was frozen at 2547c00 and opened by nothing before the final judging round,
 * `<seq>-t13` of every sequence plus swap-t14 and split-expand-b-t14. Same rule and fields as
 * `takes` (`scripts/fidelity/t13.ts align`). Every press replays its sequence's own hold: the
 * gesture telemetry asked the same press as the earlier takes, and hold200-t13 let go before the
 * decision and iOS opened the app (as on hold200-t3), so it needs no `hold`.
 */
const t13Takes = {
  "appear-t13": { seq: "appear", frames: 209, shift: -0.2247 },
  "appear-alert-t13": { seq: "appear-alert", frames: 952, shift: 0.9131 },
  "expand-t13": { seq: "expand", frames: 205, shift: -0.1138 },
  "press-t13": { seq: "press", frames: 317, shift: -0.1657 },
  "collapse-t13": { seq: "collapse", frames: 207, shift: -0.102 },
  "alert-t13": { seq: "alert", frames: 743, shift: 0.4972 },
  "dismiss-t13": { seq: "dismiss", frames: 301, shift: 0.1204 },
  "split-t13": { seq: "split", frames: 212, shift: -0.1884 },
  "split-alert-t13": { seq: "split-alert", frames: 990, shift: 0.7994 },
  "unsplit-t13": { seq: "unsplit", frames: 304, shift: 0.6187 },
  "expand-dark-t13": { seq: "expand-dark", frames: 340, shift: -0.4609 },
  "collapse-dark-t13": { seq: "collapse-dark", frames: 227, shift: -0.1039 },
  "tap-t13": { seq: "tap", frames: 365, shift: -0.4101 },
  "hold200-t13": { seq: "hold200", frames: 371, shift: -0.3546 },
  "idletap-t13": { seq: "idletap", frames: 331, shift: -0.7231 },
  "idlehold-t13": { seq: "idlehold", frames: 339, shift: -0.942 },
  "wide-appear-t13": { seq: "wide-appear", frames: 310, shift: 0.015 },
  "wide-expand-t13": { seq: "wide-expand", frames: 366, shift: -0.0645 },
  "wide-collapse-t13": { seq: "wide-collapse", frames: 386, shift: 0.001 },
  "split-expand-b-t13": { seq: "split-expand-b", frames: 366, shift: -0.0017 },
  "split-expand-b-t14": { seq: "split-expand-b", frames: 362, shift: -0.0173 },
  "split-collapse-b-t13": { seq: "split-collapse-b", frames: 238, shift: -0.0053 },
  "swap-t13": { seq: "swap", frames: 758, shift: 0.3875 },
  "swap-t14": { seq: "swap", frames: 740, shift: 0.1189 },
  "dismiss-wide-t13": { seq: "dismiss-wide", frames: 301, shift: -0.1448 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 7's first unseen set (ICN-3, `scripts/fidelity/T15.md`): recorded on their own simulator
 * after the engine was frozen at c675369 and opened by nothing before the final judging round,
 * `<seq>-t15` of every sequence plus swap-t16 and split-expand-b-t16. Same rule and fields as
 * `takes` (`scripts/fidelity/t15.ts align`). Every press replays its sequence's own hold: the
 * gesture telemetry asked the same press as the earlier takes, and hold200-t15 let go before the
 * decision and iOS opened the app (as on hold200-t3), so it needs no `hold`.
 */
const t15Takes = {
  "appear-t15": { seq: "appear", frames: 209, shift: -0.2078 },
  "appear-alert-t15": { seq: "appear-alert", frames: 991, shift: 1.5502 },
  "expand-t15": { seq: "expand", frames: 199, shift: -0.136 },
  "press-t15": { seq: "press", frames: 200, shift: -0.1724 },
  "collapse-t15": { seq: "collapse", frames: 206, shift: -0.1218 },
  "alert-t15": { seq: "alert", frames: 729, shift: 0.281 },
  "dismiss-t15": { seq: "dismiss", frames: 432, shift: 0.2924 },
  "split-t15": { seq: "split", frames: 217, shift: -0.1814 },
  "split-alert-t15": { seq: "split-alert", frames: 895, shift: -0.8555 },
  "unsplit-t15": { seq: "unsplit", frames: 285, shift: 0.4078 },
  "expand-dark-t15": { seq: "expand-dark", frames: 338, shift: -0.3457 },
  "collapse-dark-t15": { seq: "collapse-dark", frames: 232, shift: -0.0195 },
  "tap-t15": { seq: "tap", frames: 369, shift: -0.3535 },
  "hold200-t15": { seq: "hold200", frames: 368, shift: -0.3694 },
  "idletap-t15": { seq: "idletap", frames: 338, shift: -0.6306 },
  "idlehold-t15": { seq: "idlehold", frames: 340, shift: -0.937 },
  "wide-appear-t15": { seq: "wide-appear", frames: 310, shift: 0.0188 },
  "wide-expand-t15": { seq: "wide-expand", frames: 339, shift: -0.029 },
  "wide-collapse-t15": { seq: "wide-collapse", frames: 231, shift: -0.0098 },
  "split-expand-b-t15": { seq: "split-expand-b", frames: 357, shift: -0.0292 },
  "split-expand-b-t16": { seq: "split-expand-b", frames: 375, shift: -0.0233 },
  "split-collapse-b-t15": { seq: "split-collapse-b", frames: 225, shift: -0.0109 },
  "swap-t15": { seq: "swap", frames: 746, shift: 0.1169 },
  "swap-t16": { seq: "swap", frames: 1018, shift: 0.118 },
  "dismiss-wide-t15": { seq: "dismiss-wide", frames: 291, shift: -0.3101 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 7's second unseen set (ICN-3, `scripts/fidelity/T17.md`): recorded with the -t15 set and
 * opened by nothing before the final judging round, `<seq>-t17` of every sequence plus swap-t18 and
 * split-expand-b-t18. Same rule and fields as `takes` (`scripts/fidelity/t17.ts align`). Every press
 * replays its sequence's own hold, and hold200-t17 let go before the decision and iOS opened the
 * app (as on hold200-t3), so it needs no `hold`.
 */
const t17Takes = {
  "appear-t17": { seq: "appear", frames: 210, shift: -0.1939 },
  "appear-alert-t17": { seq: "appear-alert", frames: 920, shift: 0.3967 },
  "expand-t17": { seq: "expand", frames: 200, shift: -0.1128 },
  "press-t17": { seq: "press", frames: 198, shift: -0.2139 },
  "collapse-t17": { seq: "collapse", frames: 205, shift: -0.12 },
  "alert-t17": { seq: "alert", frames: 738, shift: 0.4025 },
  "dismiss-t17": { seq: "dismiss", frames: 306, shift: 0.2085 },
  "split-t17": { seq: "split", frames: 211, shift: -0.1897 },
  "split-alert-t17": { seq: "split-alert", frames: 937, shift: -0.1918 },
  "unsplit-t17": { seq: "unsplit", frames: 296, shift: 0.5814 },
  "expand-dark-t17": { seq: "expand-dark", frames: 342, shift: -0.2811 },
  "collapse-dark-t17": { seq: "collapse-dark", frames: 231, shift: -0.0528 },
  "tap-t17": { seq: "tap", frames: 369, shift: -0.3567 },
  "hold200-t17": { seq: "hold200", frames: 405, shift: -0.3028 },
  "idletap-t17": { seq: "idletap", frames: 338, shift: -0.6216 },
  "idlehold-t17": { seq: "idlehold", frames: 341, shift: -0.911 },
  "wide-appear-t17": { seq: "wide-appear", frames: 302, shift: -0.0808 },
  "wide-expand-t17": { seq: "wide-expand", frames: 335, shift: -0.1055 },
  "wide-collapse-t17": { seq: "wide-collapse", frames: 231, shift: -0.0282 },
  "split-expand-b-t17": { seq: "split-expand-b", frames: 371, shift: -0.0117 },
  "split-expand-b-t18": { seq: "split-expand-b", frames: 383, shift: -0.0175 },
  "split-collapse-b-t17": { seq: "split-collapse-b", frames: 236, shift: -0.0866 },
  "swap-t17": { seq: "swap", frames: 747, shift: 0.2177 },
  "swap-t18": { seq: "swap", frames: 758, shift: 0.3142 },
  "dismiss-wide-t17": { seq: "dismiss-wide", frames: 754, shift: 0.0059 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 8's first unseen set (ICN-3, `scripts/fidelity/T19.md`): recorded on their own simulator
 * after the engine was frozen at 54e9325 and opened by nothing before the final judging round,
 * `<seq>-t19` of every sequence plus swap-t20 and split-expand-b-t20. Same rule and fields as
 * `takes` (`scripts/fidelity/t19.ts align`). Every press replays its sequence's own hold: the
 * gesture telemetry asked the same press as the earlier takes, and hold200-t19 let go before the
 * decision and iOS opened the app (as on hold200-t3), so it needs no `hold`.
 */
const t19Takes = {
  "appear-t19": { seq: "appear", frames: 210, shift: -0.2033 },
  "appear-alert-t19": { seq: "appear-alert", frames: 991, shift: 1.5516 },
  "expand-t19": { seq: "expand", frames: 196, shift: -0.1797 },
  "press-t19": { seq: "press", frames: 196, shift: -0.2504 },
  "collapse-t19": { seq: "collapse", frames: 231, shift: -0.1237 },
  "alert-t19": { seq: "alert", frames: 727, shift: 0.2123 },
  "dismiss-t19": { seq: "dismiss", frames: 324, shift: 0.4843 },
  "split-t19": { seq: "split", frames: 211, shift: -0.2145 },
  "split-alert-t19": { seq: "split-alert", frames: 910, shift: -0.75 },
  "unsplit-t19": { seq: "unsplit", frames: 285, shift: 0.4018 },
  "expand-dark-t19": { seq: "expand-dark", frames: 338, shift: -0.3444 },
  // collapse-dark-t19 left out: its recording is dimmed throughout (backdrop 30, not 58), so measure.py finds no island and the alignment rule has no onset; it needs a new recording.
  "tap-t19": { seq: "tap", frames: 361, shift: -0.4703 },
  "hold200-t19": { seq: "hold200", frames: 362, shift: -0.4982 },
  "idletap-t19": { seq: "idletap", frames: 332, shift: -0.7122 },
  "idlehold-t19": { seq: "idlehold", frames: 334, shift: -1.0387 },
  "wide-appear-t19": { seq: "wide-appear", frames: 301, shift: -0.0958 },
  "wide-expand-t19": { seq: "wide-expand", frames: 335, shift: -0.1012 },
  "wide-collapse-t19": { seq: "wide-collapse", frames: 226, shift: -0.0471 },
  "split-expand-b-t19": { seq: "split-expand-b", frames: 380, shift: -0.0657 },
  "split-expand-b-t20": { seq: "split-expand-b", frames: 348, shift: -0.1837 },
  "split-collapse-b-t19": { seq: "split-collapse-b", frames: 245, shift: -0.0548 },
  "swap-t19": { seq: "swap", frames: 759, shift: 0.4027 },
  "swap-t20": { seq: "swap", frames: 758, shift: 0.3081 },
  "dismiss-wide-t19": { seq: "dismiss-wide", frames: 322, shift: 0.1932 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 8's second unseen set (ICN-3, `scripts/fidelity/T21.md`): recorded with the -t19 set and
 * opened by nothing before the final judging round, `<seq>-t21` of every sequence plus swap-t22 and
 * split-expand-b-t22. Same rule and fields as `takes` (`scripts/fidelity/t21.ts align`). Every press
 * replays its sequence's own hold, and hold200-t21 let go before the decision and iOS opened the
 * app (as on hold200-t3), so it needs no `hold`.
 */
const t21Takes = {
  "appear-t21": { seq: "appear", frames: 205, shift: -0.2881 },
  "appear-alert-t21": { seq: "appear-alert", frames: 967, shift: 0.7116 },
  "expand-t21": { seq: "expand", frames: 199, shift: -0.1259 },
  "press-t21": { seq: "press", frames: 197, shift: -0.2305 },
  "collapse-t21": { seq: "collapse", frames: 223, shift: -0.2444 },
  "alert-t21": { seq: "alert", frames: 736, shift: 0.3592 },
  "dismiss-t21": { seq: "dismiss", frames: 315, shift: 0.3554 },
  "split-t21": { seq: "split", frames: 206, shift: -0.285 },
  "split-alert-t21": { seq: "split-alert", frames: 963, shift: 0.3914 },
  "unsplit-t21": { seq: "unsplit", frames: 572, shift: 0.7432 },
  "expand-dark-t21": { seq: "expand-dark", frames: 337, shift: -0.3542 },
  "collapse-dark-t21": { seq: "collapse-dark", frames: 226, shift: -0.1152 },
  "tap-t21": { seq: "tap", frames: 366, shift: -0.4204 },
  "hold200-t21": { seq: "hold200", frames: 360, shift: -0.5049 },
  "idletap-t21": { seq: "idletap", frames: 335, shift: -0.6936 },
  "idlehold-t21": { seq: "idlehold", frames: 338, shift: -0.9536 },
  "wide-appear-t21": { seq: "wide-appear", frames: 308, shift: -0.0375 },
  "wide-expand-t21": { seq: "wide-expand", frames: 337, shift: -0.0674 },
  "wide-collapse-t21": { seq: "wide-collapse", frames: 227, shift: -0.0224 },
  "split-expand-b-t21": { seq: "split-expand-b", frames: 364, shift: -0.0741 },
  "split-expand-b-t22": { seq: "split-expand-b", frames: 378, shift: -0.1085 },
  "split-collapse-b-t21": { seq: "split-collapse-b", frames: 248, shift: -0.038 },
  "swap-t21": { seq: "swap", frames: 751, shift: 0.2736 },
  "swap-t22": { seq: "swap", frames: 1007, shift: 0.0636 },
  "dismiss-wide-t21": { seq: "dismiss-wide", frames: 323, shift: 0.2235 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 9's first unseen set (ICN-3, `scripts/fidelity/T23.md`): recorded on their own simulator
 * after the engine was frozen at 0de4723 and opened by nothing before the final judging round,
 * `<seq>-t23` of every sequence plus swap-t24 and split-expand-b-t24. Same rule and fields as
 * `takes` (`scripts/fidelity/t23.ts align`). Every press replays its sequence's own hold: the
 * gesture telemetry asked the same press as the earlier takes, and hold200-t23 let go before the
 * decision and iOS opened the app (as on hold200-t3), so it needs no `hold`.
 */
const t23Takes = {
  "appear-t23": { seq: "appear", frames: 208, shift: -0.2422 },
  "appear-alert-t23": { seq: "appear-alert", frames: 959, shift: 0.8482 },
  "expand-t23": { seq: "expand", frames: 200, shift: -0.1233 },
  "press-t23": { seq: "press", frames: 199, shift: -0.1885 },
  "collapse-t23": { seq: "collapse", frames: 231, shift: -0.1287 },
  "alert-t23": { seq: "alert", frames: 727, shift: 0.2219 },
  "dismiss-t23": { seq: "dismiss", frames: 376, shift: 0.1961 },
  "split-t23": { seq: "split", frames: 210, shift: -0.2062 },
  "split-alert-t23": { seq: "split-alert", frames: 993, shift: 0.8752 },
  "unsplit-t23": { seq: "unsplit", frames: 289, shift: 0.4263 },
  "expand-dark-t23": { seq: "expand-dark", frames: 339, shift: -0.3209 },
  "collapse-dark-t23": { seq: "collapse-dark", frames: 228, shift: -0.0797 },
  "tap-t23": { seq: "tap", frames: 367, shift: -0.385 },
  "hold200-t23": { seq: "hold200", frames: 368, shift: -0.4199 },
  "idletap-t23": { seq: "idletap", frames: 337, shift: -0.6377 },
  "idlehold-t23": { seq: "idlehold", frames: 340, shift: -0.9316 },
  "wide-appear-t23": { seq: "wide-appear", frames: 308, shift: 0.0082 },
  "wide-expand-t23": { seq: "wide-expand", frames: 339, shift: -0.0343 },
  "wide-collapse-t23": { seq: "wide-collapse", frames: 227, shift: -0.0227 },
  "split-expand-b-t23": { seq: "split-expand-b", frames: 377, shift: -0.0618 },
  "split-expand-b-t24": { seq: "split-expand-b", frames: 365, shift: -0.0131 },
  "split-collapse-b-t23": { seq: "split-collapse-b", frames: 232, shift: 0.0097 },
  "swap-t23": { seq: "swap", frames: 745, shift: 0.1726 },
  "swap-t24": { seq: "swap", frames: 760, shift: 0.375 },
  "dismiss-wide-t23": { seq: "dismiss-wide", frames: 301, shift: -0.1368 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 9's second unseen set (ICN-3, `scripts/fidelity/T25.md`): recorded by reference round 9
 * on its own simulator and opened by nothing before the engine was frozen at 51f5a7e for the
 * final judging round, `<seq>-t25` of every sequence plus swap-t26 and split-expand-b-t26.
 * Same rule and fields as `takes` (`scripts/fidelity/t25.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t25 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t25Takes = {
  "appear-t25": { seq: "appear", frames: 210, shift: -0.2037 },
  "appear-alert-t25": { seq: "appear-alert", frames: 989, shift: 1.5484 },
  "expand-t25": { seq: "expand", frames: 200, shift: -0.1228 },
  "press-t25": { seq: "press", frames: 199, shift: -0.1906 },
  "collapse-t25": { seq: "collapse", frames: 205, shift: -0.1121 },
  "alert-t25": { seq: "alert", frames: 818, shift: 0.1971 },
  "dismiss-t25": { seq: "dismiss", frames: 300, shift: 0.0958 },
  "split-t25": { seq: "split", frames: 211, shift: -0.2131 },
  "split-alert-t25": { seq: "split-alert", frames: 922, shift: -0.4386 },
  "unsplit-t25": { seq: "unsplit", frames: 306, shift: 0.7841 },
  "expand-dark-t25": { seq: "expand-dark", frames: 339, shift: -0.3244 },
  "collapse-dark-t25": { seq: "collapse-dark", frames: 229, shift: -0.0461 },
  "tap-t25": { seq: "tap", frames: 371, shift: -0.3431 },
  "hold200-t25": { seq: "hold200", frames: 374, shift: -0.3004 },
  "idletap-t25": { seq: "idletap", frames: 338, shift: -0.62 },
  "idlehold-t25": { seq: "idlehold", frames: 342, shift: -0.8938 },
  "wide-appear-t25": { seq: "wide-appear", frames: 307, shift: -0.0474 },
  "wide-expand-t25": { seq: "wide-expand", frames: 338, shift: -0.0582 },
  "wide-collapse-t25": { seq: "wide-collapse", frames: 258, shift: 0.0104 },
  "split-expand-b-t25": { seq: "split-expand-b", frames: 358, shift: -0.0437 },
  "split-expand-b-t26": { seq: "split-expand-b", frames: 365, shift: -0.042 },
  "split-collapse-b-t25": { seq: "split-collapse-b", frames: 302, shift: 0.0048 },
  "swap-t25": { seq: "swap", frames: 759, shift: 0.3152 },
  "swap-t26": { seq: "swap", frames: 753, shift: 0.229 },
  "dismiss-wide-t25": { seq: "dismiss-wide", frames: 463, shift: 0.0845 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 10's first unseen set (ICN-3, `scripts/fidelity/T27.md`): recorded by reference round 10
 * on its own simulator and opened by nothing before the engine was frozen at 51f5a7e for the
 * final judging round, `<seq>-t27` of every sequence plus swap-t28 and split-expand-b-t28.
 * Same rule and fields as `takes` (`scripts/fidelity/t27.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t27 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t27Takes = {
  "appear-t27": { seq: "appear", frames: 209, shift: -0.2224 },
  "appear-alert-t27": { seq: "appear-alert", frames: 928, shift: 0.529 },
  "expand-t27": { seq: "expand", frames: 201, shift: -0.0959 },
  "press-t27": { seq: "press", frames: 201, shift: -0.1674 },
  "collapse-t27": { seq: "collapse", frames: 233, shift: -0.0869 },
  "alert-t27": { seq: "alert", frames: 708, shift: -0.1061 },
  "dismiss-t27": { seq: "dismiss", frames: 288, shift: -0.092 },
  "split-t27": { seq: "split", frames: 212, shift: -0.1671 },
  "split-alert-t27": { seq: "split-alert", frames: 828, shift: -2.0122 },
  "unsplit-t27": { seq: "unsplit", frames: 300, shift: 0.69 },
  "expand-dark-t27": { seq: "expand-dark", frames: 330, shift: -0.4722 },
  "collapse-dark-t27": { seq: "collapse-dark", frames: 252, shift: -0.1159 },
  "tap-t27": { seq: "tap", frames: 369, shift: -0.3365 },
  "hold200-t27": { seq: "hold200", frames: 374, shift: -0.3297 },
  "idletap-t27": { seq: "idletap", frames: 340, shift: -0.585 },
  "idlehold-t27": { seq: "idlehold", frames: 342, shift: -0.902 },
  "wide-appear-t27": { seq: "wide-appear", frames: 396, shift: 0 },
  "wide-expand-t27": { seq: "wide-expand", frames: 344, shift: 0.0411 },
  "wide-collapse-t27": { seq: "wide-collapse", frames: 224, shift: -0.096 },
  "split-expand-b-t27": { seq: "split-expand-b", frames: 371, shift: -0.0106 },
  "split-expand-b-t28": { seq: "split-expand-b", frames: 366, shift: -0.182 },
  "split-collapse-b-t27": { seq: "split-collapse-b", frames: 220, shift: -0.0723 },
  "swap-t27": { seq: "swap", frames: 695, shift: -0.6556 },
  "swap-t28": { seq: "swap", frames: 716, shift: -0.3102 },
  "dismiss-wide-t27": { seq: "dismiss-wide", frames: 313, shift: 0.0651 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 10's second unseen set (ICN-3, `scripts/fidelity/T29.md`): recorded by reference round 10
 * on its own simulator and opened by nothing before the engine was frozen at 8c6a7f9 for the
 * final judging round, `<seq>-t29` of every sequence plus swap-t30 and split-expand-b-t30.
 * Same rule and fields as `takes` (`scripts/fidelity/t29.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t29 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t29Takes = {
  "appear-t29": { seq: "appear", frames: 208, shift: -0.2445 },
  "appear-alert-t29": { seq: "appear-alert", frames: 959, shift: 1.01 },
  "expand-t29": { seq: "expand", frames: 200, shift: -0.1245 },
  "press-t29": { seq: "press", frames: 197, shift: -0.2193 },
  "collapse-t29": { seq: "collapse", frames: 202, shift: -0.18 },
  "alert-t29": { seq: "alert", frames: 728, shift: 0.263 },
  "dismiss-t29": { seq: "dismiss", frames: 315, shift: 0.362 },
  "split-t29": { seq: "split", frames: 213, shift: -0.1868 },
  "split-alert-t29": { seq: "split-alert", frames: 967, shift: 0.1649 },
  "unsplit-t29": { seq: "unsplit", frames: 273, shift: 0.2747 },
  "expand-dark-t29": { seq: "expand-dark", frames: 333, shift: -0.4325 },
  "collapse-dark-t29": { seq: "collapse-dark", frames: 229, shift: -0.0643 },
  "tap-t29": { seq: "tap", frames: 369, shift: -0.3917 },
  "hold200-t29": { seq: "hold200", frames: 363, shift: -0.4388 },
  "idletap-t29": { seq: "idletap", frames: 407, shift: -0.6465 },
  "idlehold-t29": { seq: "idlehold", frames: 337, shift: -0.9851 },
  "wide-appear-t29": { seq: "wide-appear", frames: 310, shift: 0.057 },
  "wide-expand-t29": { seq: "wide-expand", frames: 333, shift: -0.1311 },
  "wide-collapse-t29": { seq: "wide-collapse", frames: 225, shift: -0.0731 },
  "split-expand-b-t29": { seq: "split-expand-b", frames: 352, shift: -0.0256 },
  "split-expand-b-t30": { seq: "split-expand-b", frames: 358, shift: -0.0838 },
  "split-collapse-b-t29": { seq: "split-collapse-b", frames: 241, shift: -0.0801 },
  "swap-t29": { seq: "swap", frames: 715, shift: -0.3214 },
  "swap-t30": { seq: "swap", frames: 701, shift: -0.6265 },
  "dismiss-wide-t29": { seq: "dismiss-wide", frames: 311, shift: 0.0156 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 11's first unseen set (ICN-3, `scripts/fidelity/T31.md`): recorded by reference round 11
 * on its own simulator and opened by nothing before the engine was frozen at 8c6a7f9 for the
 * final judging round, `<seq>-t31` of every sequence plus swap-t32 and split-expand-b-t32.
 * Same rule and fields as `takes` (`scripts/fidelity/t31.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t31 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t31Takes = {
  "appear-t31": { seq: "appear", frames: 212, shift: -0.1752 },
  "appear-alert-t31": { seq: "appear-alert", frames: 992, shift: 1.5754 },
  "expand-t31": { seq: "expand", frames: 229, shift: -0.1095 },
  "press-t31": { seq: "press", frames: 211, shift: -0.1504 },
  "collapse-t31": { seq: "collapse", frames: 205, shift: -0.1122 },
  "alert-t31": { seq: "alert", frames: 738, shift: 0.3971 },
  "dismiss-t31": { seq: "dismiss", frames: 319, shift: 0.4059 },
  "split-t31": { seq: "split", frames: 213, shift: -0.1559 },
  "split-alert-t31": { seq: "split-alert", frames: 962, shift: 0.3249 },
  "unsplit-t31": { seq: "unsplit", frames: 273, shift: 0.2742 },
  "expand-dark-t31": { seq: "expand-dark", frames: 361, shift: -0.3374 },
  "collapse-dark-t31": { seq: "collapse-dark", frames: 229, shift: -0.0798 },
  "tap-t31": { seq: "tap", frames: 371, shift: -0.3432 },
  "hold200-t31": { seq: "hold200", frames: 377, shift: -0.2897 },
  "idletap-t31": { seq: "idletap", frames: 340, shift: -0.6065 },
  "idlehold-t31": { seq: "idlehold", frames: 343, shift: -0.8769 },
  "wide-appear-t31": { seq: "wide-appear", frames: 311, shift: 0.0542 },
  "wide-expand-t31": { seq: "wide-expand", frames: 357, shift: -0.0115 },
  "wide-collapse-t31": { seq: "wide-collapse", frames: 230, shift: 0.0146 },
  "split-expand-b-t31": { seq: "split-expand-b", frames: 365, shift: -0.0037 },
  "split-expand-b-t32": { seq: "split-expand-b", frames: 371, shift: 0.038 },
  "split-collapse-b-t31": { seq: "split-collapse-b", frames: 244, shift: -0.0103 },
  "swap-t31": { seq: "swap", frames: 752, shift: 0.1336 },
  "swap-t32": { seq: "swap", frames: 737, shift: -0.0569 },
  "dismiss-wide-t31": { seq: "dismiss-wide", frames: 296, shift: -0.2385 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 11's second unseen set (ICN-3, `scripts/fidelity/T33.md`): recorded by reference round 11
 * on its own simulator and opened by nothing before the engine was frozen at e88761c for the
 * final judging round, `<seq>-t33` of every sequence plus swap-t34 and split-expand-b-t34.
 * Same rule and fields as `takes` (`scripts/fidelity/t33.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t33 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t33Takes = {
  "appear-t33": { seq: "appear", frames: 206, shift: -0.2794 },
  "appear-alert-t33": { seq: "appear-alert", frames: 972, shift: 1.2216 },
  "expand-t33": { seq: "expand", frames: 230, shift: -0.1043 },
  "press-t33": { seq: "press", frames: 214, shift: -0.1639 },
  "collapse-t33": { seq: "collapse", frames: 209, shift: -0.0806 },
  "alert-t33": { seq: "alert", frames: 706, shift: -0.1307 },
  "dismiss-t33": { seq: "dismiss", frames: 312, shift: 0.2858 },
  "split-t33": { seq: "split", frames: 211, shift: -0.2145 },
  "split-alert-t33": { seq: "split-alert", frames: 969, shift: 0.2363 },
  "unsplit-t33": { seq: "unsplit", frames: 297, shift: 0.7465 },
  "expand-dark-t33": { seq: "expand-dark", frames: 333, shift: -0.4371 },
  "collapse-dark-t33": { seq: "collapse-dark", frames: 253, shift: -0.1067 },
  "tap-t33": { seq: "tap", frames: 372, shift: -0.3178 },
  "hold200-t33": { seq: "hold200", frames: 372, shift: -0.3058 },
  "idletap-t33": { seq: "idletap", frames: 340, shift: -0.5973 },
  "idlehold-t33": { seq: "idlehold", frames: 341, shift: -0.9052 },
  "wide-appear-t33": { seq: "wide-appear", frames: 316, shift: 0.1078 },
  "wide-expand-t33": { seq: "wide-expand", frames: 354, shift: -0.1569 },
  "wide-collapse-t33": { seq: "wide-collapse", frames: 257, shift: -0.0014 },
  "split-expand-b-t33": { seq: "split-expand-b", frames: 362, shift: 0.06 },
  "split-expand-b-t34": { seq: "split-expand-b", frames: 374, shift: 0.0329 },
  "split-collapse-b-t33": { seq: "split-collapse-b", frames: 218, shift: -0.036 },
  "swap-t33": { seq: "swap", frames: 753, shift: 0.3324 },
  "swap-t34": { seq: "swap", frames: 782, shift: 0.2974 },
  "dismiss-wide-t33": { seq: "dismiss-wide", frames: 292, shift: -0.2975 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 12's first unseen set (ICN-3, `scripts/fidelity/T35.md`): recorded by reference round 12
 * on its own simulator and opened by nothing before the engine was frozen at 2ea559d for the
 * final judging round, `<seq>-t35` of every sequence plus swap-t36 and split-expand-b-t36.
 * Same rule and fields as `takes` (`scripts/fidelity/t35.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t35 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t35Takes = {
  "appear-t35": { seq: "appear", frames: 177, shift: -0.2512 },
  "appear-alert-t35": { seq: "appear-alert", frames: 950, shift: 0.8235 },
  "expand-t35": { seq: "expand", frames: 227, shift: -0.0759 },
  "press-t35": { seq: "press", frames: 206, shift: -0.1515 },
  "collapse-t35": { seq: "collapse", frames: 203, shift: -0.1598 },
  "alert-t35": { seq: "alert", frames: 746, shift: 0.5427 },
  "dismiss-t35": { seq: "dismiss", frames: 314, shift: 0.3528 },
  "split-t35": { seq: "split", frames: 228, shift: -0.2343 },
  "split-alert-t35": { seq: "split-alert", frames: 999, shift: 0.84 },
  "unsplit-t35": { seq: "unsplit", frames: 299, shift: 0.8071 },
  "expand-dark-t35": { seq: "expand-dark", frames: 370, shift: -0.2957 },
  "collapse-dark-t35": { seq: "collapse-dark", frames: 230, shift: -0.0477 },
  "tap-t35": { seq: "tap", frames: 332, shift: -0.5231 },
  "hold200-t35": { seq: "hold200", frames: 377, shift: -0.2794 },
  "idletap-t35": { seq: "idletap", frames: 329, shift: -0.7684 },
  "idlehold-t35": { seq: "idlehold", frames: 463, shift: -0.995 },
  "wide-appear-t35": { seq: "wide-appear", frames: 273, shift: -0.0755 },
  "wide-expand-t35": { seq: "wide-expand", frames: 339, shift: -0.1212 },
  "wide-collapse-t35": { seq: "wide-collapse", frames: 227, shift: -0.0693 },
  "split-expand-b-t35": { seq: "split-expand-b", frames: 364, shift: -0.0383 },
  "split-expand-b-t36": { seq: "split-expand-b", frames: 360, shift: -0.2111 },
  "split-collapse-b-t35": { seq: "split-collapse-b", frames: 237, shift: -0.0639 },
  "swap-t35": { seq: "swap", frames: 769, shift: 0.4921 },
  "swap-t36": { seq: "swap", frames: 759, shift: 0.4033 },
  "dismiss-wide-t35": { seq: "dismiss-wide", frames: 329, shift: 0.3196 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 12's second unseen set (ICN-3, `scripts/fidelity/T37.md`): recorded by reference round 12
 * on its own simulator and opened by nothing before the engine was frozen at b13f29f for the
 * final judging round, `<seq>-t37` of every sequence plus swap-t38 and split-expand-b-t38.
 * Same rule and fields as `takes` (`scripts/fidelity/t37.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t37 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t37Takes = {
  "appear-t37": { seq: "appear", frames: 213, shift: -0.1811 },
  "appear-alert-t37": { seq: "appear-alert", frames: 994, shift: 1.7949 },
  "expand-t37": { seq: "expand", frames: 215, shift: -0.1045 },
  "press-t37": { seq: "press", frames: 227, shift: -0.2006 },
  "collapse-t37": { seq: "collapse", frames: 357, shift: -0.0982 },
  "alert-t37": { seq: "alert", frames: 738, shift: 0.4199 },
  "dismiss-t37": { seq: "dismiss", frames: 326, shift: 0.5088 },
  "split-t37": { seq: "split", frames: 208, shift: -0.2813 },
  "split-alert-t37": { seq: "split-alert", frames: 934, shift: -0.0205 },
  "unsplit-t37": { seq: "unsplit", frames: 294, shift: 0.6514 },
  "expand-dark-t37": { seq: "expand-dark", frames: 351, shift: -0.3041 },
  "collapse-dark-t37": { seq: "collapse-dark", frames: 230, shift: -0.0382 },
  "tap-t37": { seq: "tap", frames: 370, shift: -0.3448 },
  "hold200-t37": { seq: "hold200", frames: 375, shift: -0.2968 },
  "idletap-t37": { seq: "idletap", frames: 341, shift: -0.5832 },
  "idlehold-t37": { seq: "idlehold", frames: 340, shift: -0.9337 },
  "wide-appear-t37": { seq: "wide-appear", frames: 310, shift: 0.0722 },
  "wide-expand-t37": { seq: "wide-expand", frames: 352, shift: -0.0271 },
  "wide-collapse-t37": { seq: "wide-collapse", frames: 228, shift: -0.0186 },
  "split-expand-b-t37": { seq: "split-expand-b", frames: 378, shift: -0.0134 },
  "split-expand-b-t38": { seq: "split-expand-b", frames: 367, shift: -0.0094 },
  "split-collapse-b-t37": { seq: "split-collapse-b", frames: 232, shift: 0.0067 },
  "swap-t37": { seq: "swap", frames: 761, shift: 0.3674 },
  "swap-t38": { seq: "swap", frames: 761, shift: 0.3516 },
  "dismiss-wide-t37": { seq: "dismiss-wide", frames: 319, shift: 0.1473 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 13's first unseen set (ICN-3, `scripts/fidelity/T39.md`): recorded by reference round 13
 * on its own simulator and opened by nothing before the engine was frozen at c7c00ed for the
 * final judging round, `<seq>-t39` of every sequence plus swap-t40 and split-expand-b-t40.
 * Same rule and fields as `takes` (`scripts/fidelity/t39.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t39 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t39Takes = {
  "appear-t39": { seq: "appear", frames: 213, shift: -0.1846 },
  "appear-alert-t39": { seq: "appear-alert", frames: 981, shift: 0.9499 },
  "expand-t39": { seq: "expand", frames: 200, shift: -0.118 },
  "press-t39": { seq: "press", frames: 200, shift: -0.1756 },
  "collapse-t39": { seq: "collapse", frames: 206, shift: -0.0869 },
  "alert-t39": { seq: "alert", frames: 728, shift: 0.2499 },
  "dismiss-t39": { seq: "dismiss", frames: 285, shift: -0.1439 },
  "split-t39": { seq: "split", frames: 214, shift: -0.1834 },
  "split-alert-t39": { seq: "split-alert", frames: 1009, shift: 0.8478 },
  "unsplit-t39": { seq: "unsplit", frames: 288, shift: 0.5174 },
  "expand-dark-t39": { seq: "expand-dark", frames: 331, shift: -0.4577 },
  "collapse-dark-t39": { seq: "collapse-dark", frames: 227, shift: -0.0978 },
  "tap-t39": { seq: "tap", frames: 370, shift: -0.345 },
  "hold200-t39": { seq: "hold200", frames: 375, shift: -0.3199 },
  "idletap-t39": { seq: "idletap", frames: 338, shift: -0.6296 },
  "idlehold-t39": { seq: "idlehold", frames: 341, shift: -0.9103 },
  "wide-appear-t39": { seq: "wide-appear", frames: 315, shift: 0.0571 },
  "wide-expand-t39": { seq: "wide-expand", frames: 343, shift: 0.0226 },
  "wide-collapse-t39": { seq: "wide-collapse", frames: 235, shift: 0.0158 },
  "split-expand-b-t39": { seq: "split-expand-b", frames: 383, shift: 0.0829 },
  "split-expand-b-t40": { seq: "split-expand-b", frames: 364, shift: 0.0369 },
  "split-collapse-b-t39": { seq: "split-collapse-b", frames: 245, shift: 0.034 },
  "swap-t39": { seq: "swap", frames: 733, shift: -0.0334 },
  "swap-t40": { seq: "swap", frames: 729, shift: -0.1633 },
  "dismiss-wide-t39": { seq: "dismiss-wide", frames: 457, shift: 0.0987 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 13's second unseen set (ICN-3, `scripts/fidelity/T41.md`): recorded by reference round 13
 * on its own simulator and opened by nothing before the engine was frozen at c7c00ed for the
 * final judging round, `<seq>-t41` of every sequence plus swap-t42 and split-expand-b-t42.
 * Same rule and fields as `takes` (`scripts/fidelity/t41.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t41 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 * split-expand-b-t42 asked 1218 ms against the earlier takes' 1219 to 1232 ms: the same long press,
 * so no `hold` either.
 */
const t41Takes = {
  "appear-t41": { seq: "appear", frames: 214, shift: -0.1761 },
  "appear-alert-t41": { seq: "appear-alert", frames: 944, shift: 0.3013 },
  "expand-t41": { seq: "expand", frames: 200, shift: -0.1147 },
  "press-t41": { seq: "press", frames: 200, shift: -0.1671 },
  "collapse-t41": { seq: "collapse", frames: 205, shift: -0.1167 },
  "alert-t41": { seq: "alert", frames: 705, shift: -0.1008 },
  "dismiss-t41": { seq: "dismiss", frames: 306, shift: 0.1852 },
  "split-t41": { seq: "split", frames: 214, shift: -0.1734 },
  "split-alert-t41": { seq: "split-alert", frames: 785, shift: -2.7536 },
  "unsplit-t41": { seq: "unsplit", frames: 319, shift: 0.9311 },
  "expand-dark-t41": { seq: "expand-dark", frames: 328, shift: -0.5101 },
  "collapse-dark-t41": { seq: "collapse-dark", frames: 224, shift: -0.1379 },
  "tap-t41": { seq: "tap", frames: 358, shift: -0.5233 },
  "hold200-t41": { seq: "hold200", frames: 362, shift: -0.4593 },
  "idletap-t41": { seq: "idletap", frames: 338, shift: -0.6228 },
  "idlehold-t41": { seq: "idlehold", frames: 340, shift: -0.9353 },
  "wide-appear-t41": { seq: "wide-appear", frames: 311, shift: 0.0597 },
  "wide-expand-t41": { seq: "wide-expand", frames: 342, shift: 0.0128 },
  "wide-collapse-t41": { seq: "wide-collapse", frames: 340, shift: 0.0086 },
  "split-expand-b-t41": { seq: "split-expand-b", frames: 361, shift: -0.0852 },
  "split-expand-b-t42": { seq: "split-expand-b", frames: 364, shift: -0.1806 },
  "split-collapse-b-t41": { seq: "split-collapse-b", frames: 229, shift: 0.0071 },
  "swap-t41": { seq: "swap", frames: 734, shift: -0.0898 },
  "swap-t42": { seq: "swap", frames: 752, shift: 0.306 },
  "dismiss-wide-t41": { seq: "dismiss-wide", frames: 325, shift: 0.2458 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 14's first unseen set (ICN-3, `scripts/fidelity/T43.md`): recorded by reference round 14
 * on its own simulator and opened by nothing before the engine was frozen at 41cc9b9 for the
 * final judging round, `<seq>-t43` of every sequence plus swap-t44 and split-expand-b-t44.
 * Same rule and fields as `takes` (`scripts/fidelity/t43.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t43 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t43Takes = {
  "appear-t43": { seq: "appear", frames: 206, shift: -0.2626 },
  "appear-alert-t43": { seq: "appear-alert", frames: 972, shift: 1.2272 },
  "expand-t43": { seq: "expand", frames: 200, shift: -0.1095 },
  "press-t43": { seq: "press", frames: 203, shift: -0.1222 },
  "collapse-t43": { seq: "collapse", frames: 209, shift: -0.0632 },
  "alert-t43": { seq: "alert", frames: 737, shift: 0.3911 },
  "dismiss-t43": { seq: "dismiss", frames: 305, shift: 0.1573 },
  "split-t43": { seq: "split", frames: 211, shift: -0.1883 },
  "split-alert-t43": { seq: "split-alert", frames: 971, shift: 0.3978 },
  "unsplit-t43": { seq: "unsplit", frames: 291, shift: 0.5337 },
  "expand-dark-t43": { seq: "expand-dark", frames: 330, shift: -0.4813 },
  "collapse-dark-t43": { seq: "collapse-dark", frames: 230, shift: -0.0564 },
  "tap-t43": { seq: "tap", frames: 362, shift: -0.465 },
  "hold200-t43": { seq: "hold200", frames: 361, shift: -0.485 },
  "idletap-t43": { seq: "idletap", frames: 337, shift: -0.642 },
  "idlehold-t43": { seq: "idlehold", frames: 340, shift: -0.9298 },
  "wide-appear-t43": { seq: "wide-appear", frames: 314, shift: 0.1192 },
  "wide-expand-t43": { seq: "wide-expand", frames: 342, shift: 0.0082 },
  "wide-collapse-t43": { seq: "wide-collapse", frames: 236, shift: 0.0128 },
  "split-expand-b-t43": { seq: "split-expand-b", frames: 379, shift: 0.0399 },
  "split-expand-b-t44": { seq: "split-expand-b", frames: 352, shift: -0.2089 },
  "split-collapse-b-t43": { seq: "split-collapse-b", frames: 249, shift: 0.0139 },
  "swap-t43": { seq: "swap", frames: 753, shift: 0.3054 },
  "swap-t44": { seq: "swap", frames: 742, shift: 0.1058 },
  "dismiss-wide-t43": { seq: "dismiss-wide", frames: 304, shift: -0.1208 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 14's second unseen set (ICN-3, `scripts/fidelity/T45.md`): recorded by reference round 14
 * on its own simulator and opened by nothing before the engine was frozen at e374f30 for the
 * final judging round, `<seq>-t45` of every sequence plus swap-t46 and split-expand-b-t46.
 * Same rule and fields as `takes` (`scripts/fidelity/t45.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t45 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t45Takes = {
  "appear-t45": { seq: "appear", frames: 206, shift: -0.2683 },
  "appear-alert-t45": { seq: "appear-alert", frames: 990, shift: 1.642 },
  "expand-t45": { seq: "expand", frames: 202, shift: -0.0879 },
  "press-t45": { seq: "press", frames: 203, shift: -0.1353 },
  "collapse-t45": { seq: "collapse", frames: 206, shift: -0.1202 },
  "alert-t45": { seq: "alert", frames: 725, shift: 0.1943 },
  "dismiss-t45": { seq: "dismiss", frames: 301, shift: 0.1008 },
  "split-t45": { seq: "split", frames: 209, shift: -0.2536 },
  "split-alert-t45": { seq: "split-alert", frames: 992, shift: 0.6202 },
  "unsplit-t45": { seq: "unsplit", frames: 334, shift: 0.8537 },
  "expand-dark-t45": { seq: "expand-dark", frames: 335, shift: -0.4009 },
  "collapse-dark-t45": { seq: "collapse-dark", frames: 226, shift: -0.1151 },
  "tap-t45": { seq: "tap", frames: 359, shift: -0.5301 },
  "hold200-t45": { seq: "hold200", frames: 373, shift: -0.3467 },
  "idletap-t45": { seq: "idletap", frames: 334, shift: -0.688 },
  "idlehold-t45": { seq: "idlehold", frames: 333, shift: -1.0468 },
  "wide-appear-t45": { seq: "wide-appear", frames: 313, shift: 0.0438 },
  "wide-expand-t45": { seq: "wide-expand", frames: 336, shift: -0.0869 },
  "wide-collapse-t45": { seq: "wide-collapse", frames: 230, shift: 0.0104 },
  "split-expand-b-t45": { seq: "split-expand-b", frames: 363, shift: -0.0188 },
  "split-expand-b-t46": { seq: "split-expand-b", frames: 351, shift: -0.1954 },
  "split-collapse-b-t45": { seq: "split-collapse-b", frames: 235, shift: 0.0072 },
  "swap-t45": { seq: "swap", frames: 751, shift: 0.2694 },
  "swap-t46": { seq: "swap", frames: 746, shift: 0.193 },
  "dismiss-wide-t45": { seq: "dismiss-wide", frames: 304, shift: -0.0952 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 15's first unseen set (ICN-3, `scripts/fidelity/T47.md`): recorded by reference round 15
 * on its own simulator and opened by nothing before the engine was frozen at 08c31a7 for the
 * final judging round, `<seq>-t47` of every sequence plus swap-t48 and split-expand-b-t48.
 * Same rule and fields as `takes` (`scripts/fidelity/t47.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t47 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t47Takes = {
  "appear-t47": { seq: "appear", frames: 211, shift: -0.1821 },
  "appear-alert-t47": { seq: "appear-alert", frames: 959, shift: 1.0502 },
  "expand-t47": { seq: "expand", frames: 208, shift: -0.1313 },
  "press-t47": { seq: "press", frames: 205, shift: -0.139 },
  "collapse-t47": { seq: "collapse", frames: 206, shift: -0.0937 },
  "alert-t47": { seq: "alert", frames: 728, shift: 0.2282 },
  "dismiss-t47": { seq: "dismiss", frames: 292, shift: -0.0493 },
  "split-t47": { seq: "split", frames: 212, shift: -0.1704 },
  "split-alert-t47": { seq: "split-alert", frames: 934, shift: -0.245 },
  "unsplit-t47": { seq: "unsplit", frames: 298, shift: 0.6975 },
  "expand-dark-t47": { seq: "expand-dark", frames: 351, shift: -0.237 },
  "collapse-dark-t47": { seq: "collapse-dark", frames: 237, shift: 0.0619 },
  "tap-t47": { seq: "tap", frames: 373, shift: -0.2934 },
  "hold200-t47": { seq: "hold200", frames: 353, shift: -0.2276 },
  "idletap-t47": { seq: "idletap", frames: 340, shift: -0.5916 },
  "idlehold-t47": { seq: "idlehold", frames: 343, shift: -0.8836 },
  "wide-appear-t47": { seq: "wide-appear", frames: 313, shift: 0.0724 },
  "wide-expand-t47": { seq: "wide-expand", frames: 354, shift: 0.0069 },
  "wide-collapse-t47": { seq: "wide-collapse", frames: 228, shift: -0.0178 },
  "split-expand-b-t47": { seq: "split-expand-b", frames: 357, shift: 0.0508 },
  "split-expand-b-t48": { seq: "split-expand-b", frames: 368, shift: -0.0129 },
  "split-collapse-b-t47": { seq: "split-collapse-b", frames: 251, shift: -0.0039 },
  "swap-t47": { seq: "swap", frames: 749, shift: 0.169 },
  "swap-t48": { seq: "swap", frames: 744, shift: 0.0743 },
  "dismiss-wide-t47": { seq: "dismiss-wide", frames: 304, shift: -0.0848 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 15's second unseen set (ICN-3, `scripts/fidelity/T49.md`): recorded by reference round 15
 * on its own simulator and opened by nothing before the engine was frozen at 08c31a7 for the
 * final judging round, `<seq>-t49` of every sequence plus swap-t50 and split-expand-b-t50.
 * Same rule and fields as `takes` (`scripts/fidelity/t49.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t49 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t49Takes = {
  "appear-t49": { seq: "appear", frames: 181, shift: -0.1912 },
  "appear-alert-t49": { seq: "appear-alert", frames: 935, shift: 0.6386 },
  "expand-t49": { seq: "expand", frames: 224, shift: -0.1254 },
  "press-t49": { seq: "press", frames: 213, shift: -0.1421 },
  "collapse-t49": { seq: "collapse", frames: 208, shift: -0.0803 },
  "alert-t49": { seq: "alert", frames: 734, shift: 0.3262 },
  "dismiss-t49": { seq: "dismiss", frames: 281, shift: -0.2145 },
  "split-t49": { seq: "split", frames: 220, shift: -0.1501 },
  "split-alert-t49": { seq: "split-alert", frames: 914, shift: -0.4153 },
  "unsplit-t49": { seq: "unsplit", frames: 293, shift: 0.5762 },
  "expand-dark-t49": { seq: "expand-dark", frames: 361, shift: -0.2723 },
  "collapse-dark-t49": { seq: "collapse-dark", frames: 232, shift: -0.0275 },
  "tap-t49": { seq: "tap", frames: 346, shift: -0.3166 },
  "hold200-t49": { seq: "hold200", frames: 359, shift: -0.1595 },
  "idletap-t49": { seq: "idletap", frames: 341, shift: -0.5665 },
  "idlehold-t49": { seq: "idlehold", frames: 344, shift: -0.8539 },
  "wide-appear-t49": { seq: "wide-appear", frames: 280, shift: 0.0475 },
  "wide-expand-t49": { seq: "wide-expand", frames: 368, shift: -0.0275 },
  "wide-collapse-t49": { seq: "wide-collapse", frames: 228, shift: -0.0135 },
  "split-expand-b-t49": { seq: "split-expand-b", frames: 381, shift: 0.025 },
  "split-expand-b-t50": { seq: "split-expand-b", frames: 380, shift: 0.234 },
  "split-collapse-b-t49": { seq: "split-collapse-b", frames: 225, shift: -0.0374 },
  "swap-t49": { seq: "swap", frames: 731, shift: -0.0559 },
  "swap-t50": { seq: "swap", frames: 743, shift: 0.0645 },
  "dismiss-wide-t49": { seq: "dismiss-wide", frames: 322, shift: 0.1959 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 16's first unseen set (ICN-3, `scripts/fidelity/T51.md`): recorded by reference round 16
 * on its own simulator and opened by nothing before the engine was frozen at 33cd97a for the
 * final judging round, `<seq>-t51` of every sequence plus swap-t52 and split-expand-b-t52.
 * Same rule and fields as `takes` (`scripts/fidelity/t51.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t51 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t51Takes = {
  "appear-t51": { seq: "appear", frames: 208, shift: -0.2412 },
  "appear-alert-t51": { seq: "appear-alert", frames: 968, shift: 1.1598 },
  "expand-t51": { seq: "expand", frames: 215, shift: -0.1061 },
  "press-t51": { seq: "press", frames: 209, shift: -0.1998 },
  "collapse-t51": { seq: "collapse", frames: 206, shift: -0.0943 },
  "alert-t51": { seq: "alert", frames: 868, shift: 0.1682 },
  "dismiss-t51": { seq: "dismiss", frames: 326, shift: 0.5393 },
  "split-t51": { seq: "split", frames: 208, shift: -0.2596 },
  "split-alert-t51": { seq: "split-alert", frames: 999, shift: 0.9581 },
  "unsplit-t51": { seq: "unsplit", frames: 290, shift: 0.4505 },
  "expand-dark-t51": { seq: "expand-dark", frames: 359, shift: -0.3088 },
  "collapse-dark-t51": { seq: "collapse-dark", frames: 233, shift: -0.0044 },
  "tap-t51": { seq: "tap", frames: 374, shift: -0.2878 },
  "hold200-t51": { seq: "hold200", frames: 364, shift: -0.4264 },
  "idletap-t51": { seq: "idletap", frames: 332, shift: -0.7254 },
  "idlehold-t51": { seq: "idlehold", frames: 334, shift: -1.0354 },
  "wide-appear-t51": { seq: "wide-appear", frames: 308, shift: -0.02 },
  "wide-expand-t51": { seq: "wide-expand", frames: 357, shift: -0.0777 },
  "wide-collapse-t51": { seq: "wide-collapse", frames: 253, shift: -0.0749 },
  "split-expand-b-t51": { seq: "split-expand-b", frames: 357, shift: -0.0547 },
  "split-expand-b-t52": { seq: "split-expand-b", frames: 375, shift: -0.0702 },
  "split-collapse-b-t51": { seq: "split-collapse-b", frames: 226, shift: -0.0758 },
  "swap-t51": { seq: "swap", frames: 786, shift: 0.3305 },
  "swap-t52": { seq: "swap", frames: 746, shift: 0.2055 },
  "dismiss-wide-t51": { seq: "dismiss-wide", frames: 305, shift: -0.0542 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 16's second unseen set (ICN-3, `scripts/fidelity/T53.md`): recorded by reference round 16
 * on its own simulator and opened by nothing before the engine was frozen at 33cd97a for the
 * final judging round, `<seq>-t53` of every sequence plus swap-t54 and split-expand-b-t54.
 * Same rule and fields as `takes` (`scripts/fidelity/t53.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t53 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t53Takes = {
  "appear-t53": { seq: "appear", frames: 209, shift: -0.2337 },
  "appear-alert-t53": { seq: "appear-alert", frames: 976, shift: 1.3327 },
  "expand-t53": { seq: "expand", frames: 218, shift: -0.1596 },
  "press-t53": { seq: "press", frames: 220, shift: -0.2307 },
  "collapse-t53": { seq: "collapse", frames: 205, shift: -0.1389 },
  "alert-t53": { seq: "alert", frames: 739, shift: 0.4227 },
  "dismiss-t53": { seq: "dismiss", frames: 328, shift: 0.5422 },
  "split-t53": { seq: "split", frames: 210, shift: -0.2373 },
  "split-alert-t53": { seq: "split-alert", frames: 985, shift: 0.6811 },
  "unsplit-t53": { seq: "unsplit", frames: 270, shift: 0.3087 },
  "expand-dark-t53": { seq: "expand-dark", frames: 350, shift: -0.3175 },
  "collapse-dark-t53": { seq: "collapse-dark", frames: 232, shift: -0.0241 },
  "tap-t53": { seq: "tap", frames: 370, shift: -0.3182 },
  "hold200-t53": { seq: "hold200", frames: 372, shift: -0.346 },
  "idletap-t53": { seq: "idletap", frames: 330, shift: -0.7316 },
  "idlehold-t53": { seq: "idlehold", frames: 334, shift: -1.051 },
  "wide-appear-t53": { seq: "wide-appear", frames: 317, shift: 0.1172 },
  "wide-expand-t53": { seq: "wide-expand", frames: 348, shift: 0.0078 },
  "wide-collapse-t53": { seq: "wide-collapse", frames: 229, shift: -0.0016 },
  "split-expand-b-t53": { seq: "split-expand-b", frames: 359, shift: -0.0057 },
  "split-expand-b-t54": { seq: "split-expand-b", frames: 350, shift: -0.1252 },
  "split-collapse-b-t53": { seq: "split-collapse-b", frames: 250, shift: 0.0072 },
  "swap-t53": { seq: "swap", frames: 737, shift: 0.0469 },
  "swap-t54": { seq: "swap", frames: 758, shift: 0.3953 },
  "dismiss-wide-t53": { seq: "dismiss-wide", frames: 320, shift: 0.1735 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 17's first unseen set (ICN-3, `scripts/fidelity/T55.md`): recorded by reference round 17
 * on its own simulator and opened by nothing before the engine was frozen at 48d9e4c for the
 * final judging round, `<seq>-t55` of every sequence plus swap-t56 and split-expand-b-t56.
 * Same rule and fields as `takes` (`scripts/fidelity/t55.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t55 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t55Takes = {
  "appear-t55": { seq: "appear", frames: 212, shift: -0.1659 },
  "appear-alert-t55": { seq: "appear-alert", frames: 886, shift: -0.208 },
  "expand-t55": { seq: "expand", frames: 220, shift: -0.0986 },
  "press-t55": { seq: "press", frames: 227, shift: -0.1486 },
  "collapse-t55": { seq: "collapse", frames: 233, shift: -0.104 },
  "alert-t55": { seq: "alert", frames: 729, shift: 0.2515 },
  "dismiss-t55": { seq: "dismiss", frames: 304, shift: 0.181 },
  "split-t55": { seq: "split", frames: 211, shift: -0.1905 },
  "split-alert-t55": { seq: "split-alert", frames: 997, shift: 0.8479 },
  "unsplit-t55": { seq: "unsplit", frames: 301, shift: 0.6376 },
  "expand-dark-t55": { seq: "expand-dark", frames: 366, shift: -0.3224 },
  "collapse-dark-t55": { seq: "collapse-dark", frames: 260, shift: 0.0063 },
  "tap-t55": { seq: "tap", frames: 370, shift: -0.3166 },
  "hold200-t55": { seq: "hold200", frames: 377, shift: -0.2608 },
  "idletap-t55": { seq: "idletap", frames: 342, shift: -0.5554 },
  "idlehold-t55": { seq: "idlehold", frames: 343, shift: -0.8736 },
  "wide-appear-t55": { seq: "wide-appear", frames: 315, shift: 0.104 },
  "wide-expand-t55": { seq: "wide-expand", frames: 365, shift: -0.0772 },
  "wide-collapse-t55": { seq: "wide-collapse", frames: 234, shift: 0.056 },
  "split-expand-b-t55": { seq: "split-expand-b", frames: 384, shift: 0.0545 },
  "split-expand-b-t56": { seq: "split-expand-b", frames: 362, shift: -0.0095 },
  "split-collapse-b-t55": { seq: "split-collapse-b", frames: 243, shift: 0.015 },
  "swap-t55": { seq: "swap", frames: 752, shift: 0.2043 },
  "swap-t56": { seq: "swap", frames: 777, shift: 0.2039 },
  "dismiss-wide-t55": { seq: "dismiss-wide", frames: 308, shift: 0.0037 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 17's second unseen set (ICN-3, `scripts/fidelity/T57.md`): recorded by reference round 17
 * on its own simulator and opened by nothing before the engine was frozen at 48d9e4c for the
 * final judging round, `<seq>-t57` of every sequence plus swap-t58 and split-expand-b-t58.
 * Same rule and fields as `takes` (`scripts/fidelity/t57.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t57 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t57Takes = {
  "appear-t57": { seq: "appear", frames: 211, shift: -0.1866 },
  "appear-alert-t57": { seq: "appear-alert", frames: 1001, shift: 1.5409 },
  "expand-t57": { seq: "expand", frames: 215, shift: -0.1344 },
  "press-t57": { seq: "press", frames: 217, shift: -0.1993 },
  "collapse-t57": { seq: "collapse", frames: 235, shift: -0.0702 },
  "alert-t57": { seq: "alert", frames: 708, shift: -0.0953 },
  "dismiss-t57": { seq: "dismiss", frames: 317, shift: 0.3678 },
  "split-t57": { seq: "split", frames: 213, shift: -0.1616 },
  "split-alert-t57": { seq: "split-alert", frames: 968, shift: 0.1657 },
  "unsplit-t57": { seq: "unsplit", frames: 337, shift: 0.2727 },
  "expand-dark-t57": { seq: "expand-dark", frames: 350, shift: -0.2825 },
  "collapse-dark-t57": { seq: "collapse-dark", frames: 232, shift: -0.0205 },
  "tap-t57": { seq: "tap", frames: 442, shift: -0.3116 },
  "hold200-t57": { seq: "hold200", frames: 375, shift: -0.2857 },
  "idletap-t57": { seq: "idletap", frames: 338, shift: -0.5982 },
  "idlehold-t57": { seq: "idlehold", frames: 343, shift: -0.8956 },
  "wide-appear-t57": { seq: "wide-appear", frames: 318, shift: 0.1171 },
  "wide-expand-t57": { seq: "wide-expand", frames: 361, shift: 0.0193 },
  "wide-collapse-t57": { seq: "wide-collapse", frames: 229, shift: -0.0021 },
  "split-expand-b-t57": { seq: "split-expand-b", frames: 388, shift: 0.0563 },
  "split-expand-b-t58": { seq: "split-expand-b", frames: 375, shift: 0.0104 },
  "split-collapse-b-t57": { seq: "split-collapse-b", frames: 237, shift: 0.0226 },
  "swap-t57": { seq: "swap", frames: 726, shift: -0.2191 },
  "swap-t58": { seq: "swap", frames: 747, shift: 0.1262 },
  "dismiss-wide-t57": { seq: "dismiss-wide", frames: 299, shift: -0.306 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 18's first unseen set (ICN-3, `scripts/fidelity/T59.md`): recorded by reference round 18
 * on round 17's simulator and opened by nothing before the engine was frozen at 3b4741b for the
 * final judging round, `<seq>-t59` of every sequence plus swap-t60 and split-expand-b-t60.
 * Same rule and fields as `takes` (`scripts/fidelity/t59.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes (but
 * expand-t59's, 1344 ms against 1217 to 1233; no `hold` was added for it either), and
 * hold200-t59 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t59Takes = {
  "appear-t59": { seq: "appear", frames: 209, shift: -0.2569 },
  "appear-alert-t59": { seq: "appear-alert", frames: 949, shift: 0.824 },
  "expand-t59": { seq: "expand", frames: 209, shift: -0.0021 },
  "press-t59": { seq: "press", frames: 219, shift: -0.1805 },
  "collapse-t59": { seq: "collapse", frames: 204, shift: -0.1321 },
  "alert-t59": { seq: "alert", frames: 718, shift: 0.0535 },
  "dismiss-t59": { seq: "dismiss", frames: 308, shift: 0.2324 },
  "split-t59": { seq: "split", frames: 291, shift: -0.2097 },
  "split-alert-t59": { seq: "split-alert", frames: 840, shift: -1.7972 },
  "unsplit-t59": { seq: "unsplit", frames: 303, shift: 0.7729 },
  "expand-dark-t59": { seq: "expand-dark", frames: 345, shift: -0.3366 },
  "collapse-dark-t59": { seq: "collapse-dark", frames: 231, shift: -0.044 },
  "tap-t59": { seq: "tap", frames: 359, shift: -0.4937 },
  "hold200-t59": { seq: "hold200", frames: 373, shift: -0.3275 },
  "idletap-t59": { seq: "idletap", frames: 331, shift: -0.7378 },
  "idlehold-t59": { seq: "idlehold", frames: 331, shift: -1.0753 },
  "wide-appear-t59": { seq: "wide-appear", frames: 310, shift: 0.0305 },
  "wide-expand-t59": { seq: "wide-expand", frames: 350, shift: -0.0306 },
  "wide-collapse-t59": { seq: "wide-collapse", frames: 227, shift: -0.0321 },
  "split-expand-b-t59": { seq: "split-expand-b", frames: 359, shift: -0.1103 },
  "split-expand-b-t60": { seq: "split-expand-b", frames: 350, shift: -0.117 },
  "split-collapse-b-t59": { seq: "split-collapse-b", frames: 231, shift: -0.0352 },
  "swap-t59": { seq: "swap", frames: 738, shift: 0.0645 },
  "swap-t60": { seq: "swap", frames: 762, shift: 0.3936 },
  "dismiss-wide-t59": { seq: "dismiss-wide", frames: 320, shift: 0.1835 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 18's second unseen set (ICN-3, `scripts/fidelity/T61.md`): recorded by reference round 18
 * on round 17's simulator and opened by nothing before the engine was frozen at 3b4741b for the
 * final judging round, `<seq>-t61` of every sequence plus swap-t62 and split-expand-b-t62.
 * Same rule and fields as `takes` (`scripts/fidelity/t61.ts align`). Every press replays its
 * sequence's own hold: the gesture telemetry asked the same press as the earlier takes, and
 * hold200-t61 let go before the decision and iOS opened the app (as on hold200-t3), so it
 * needs no `hold`.
 */
const t61Takes = {
  "appear-t61": { seq: "appear", frames: 212, shift: -0.2146 },
  "appear-alert-t61": { seq: "appear-alert", frames: 914, shift: 0.3283 },
  "expand-t61": { seq: "expand", frames: 204, shift: -0.1314 },
  "press-t61": { seq: "press", frames: 205, shift: -0.1772 },
  "collapse-t61": { seq: "collapse", frames: 207, shift: -0.1085 },
  "alert-t61": { seq: "alert", frames: 745, shift: 0.5415 },
  "dismiss-t61": { seq: "dismiss", frames: 326, shift: 0.5323 },
  "split-t61": { seq: "split", frames: 212, shift: -0.1827 },
  "split-alert-t61": { seq: "split-alert", frames: 949, shift: 0.0929 },
  "unsplit-t61": { seq: "unsplit", frames: 300, shift: 0.6856 },
  "expand-dark-t61": { seq: "expand-dark", frames: 350, shift: -0.3301 },
  "collapse-dark-t61": { seq: "collapse-dark", frames: 233, shift: 0.0036 },
  "tap-t61": { seq: "tap", frames: 364, shift: -0.4598 },
  "hold200-t61": { seq: "hold200", frames: 367, shift: -0.3645 },
  "idletap-t61": { seq: "idletap", frames: 335, shift: -0.6669 },
  "idlehold-t61": { seq: "idlehold", frames: 339, shift: -0.9535 },
  "wide-appear-t61": { seq: "wide-appear", frames: 308, shift: -0.0276 },
  "wide-expand-t61": { seq: "wide-expand", frames: 365, shift: -0.0132 },
  "wide-collapse-t61": { seq: "wide-collapse", frames: 227, shift: -0.0378 },
  "split-expand-b-t61": { seq: "split-expand-b", frames: 374, shift: -0.0018 },
  "split-expand-b-t62": { seq: "split-expand-b", frames: 378, shift: -0.0991 },
  "split-collapse-b-t61": { seq: "split-collapse-b", frames: 232, shift: -0.0285 },
  "swap-t61": { seq: "swap", frames: 789, shift: 0.3923 },
  "swap-t62": { seq: "swap", frames: 747, shift: 0.121 },
  "dismiss-wide-t61": { seq: "dismiss-wide", frames: 531, shift: -0.0055 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 19's first unseen set (ICN-3, `scripts/fidelity/T63.md`): recorded by reference round 19
 * on round 17's simulator, booted again, and opened by nothing before the engine was frozen at
 * 43a3e8c for the final judging round, `<seq>-t63` of every sequence plus swap-t64 and
 * split-expand-b-t64. Same rule and fields as `takes` (`scripts/fidelity/t63.ts align`). Every
 * press replays its sequence's own hold: the gesture telemetry asked the same press as the seen
 * takes (expand-t63's 1343 ms inside their range only through expand-t59's 1344; no `hold` was
 * added for it), and hold200-t63 let go before the decision and iOS opened the app (as on
 * hold200-t3), so it needs no `hold`.
 */
const t63Takes = {
  "appear-t63": { seq: "appear", frames: 254, shift: -0.3075 },
  "appear-alert-t63": { seq: "appear-alert", frames: 897, shift: -0.049 },
  "expand-t63": { seq: "expand", frames: 211, shift: 0.0739 },
  "press-t63": { seq: "press", frames: 200, shift: -0.1864 },
  "collapse-t63": { seq: "collapse", frames: 207, shift: -0.1069 },
  "alert-t63": { seq: "alert", frames: 714, shift: 0.0002 },
  "dismiss-t63": { seq: "dismiss", frames: 305, shift: 0.1996 },
  "split-t63": { seq: "split", frames: 211, shift: -0.1936 },
  "split-alert-t63": { seq: "split-alert", frames: 1004, shift: 0.9514 },
  "unsplit-t63": { seq: "unsplit", frames: 301, shift: 0.662 },
  "expand-dark-t63": { seq: "expand-dark", frames: 335, shift: -0.3933 },
  "collapse-dark-t63": { seq: "collapse-dark", frames: 231, shift: -0.042 },
  "tap-t63": { seq: "tap", frames: 365, shift: -0.4114 },
  "hold200-t63": { seq: "hold200", frames: 434, shift: -0.4302 },
  "idletap-t63": { seq: "idletap", frames: 395, shift: -0.6094 },
  "idlehold-t63": { seq: "idlehold", frames: 340, shift: -0.9263 },
  "wide-appear-t63": { seq: "wide-appear", frames: 313, shift: 0.0389 },
  "wide-expand-t63": { seq: "wide-expand", frames: 338, shift: -0.0568 },
  "wide-collapse-t63": { seq: "wide-collapse", frames: 303, shift: -0.018 },
  "split-expand-b-t63": { seq: "split-expand-b", frames: 356, shift: -0.0372 },
  "split-expand-b-t64": { seq: "split-expand-b", frames: 513, shift: -0.0581 },
  "split-collapse-b-t63": { seq: "split-collapse-b", frames: 395, shift: -0.0154 },
  "swap-t63": { seq: "swap", frames: 733, shift: -0.0181 },
  "swap-t64": { seq: "swap", frames: 754, shift: 0.2559 },
  "dismiss-wide-t63": { seq: "dismiss-wide", frames: 328, shift: 0.324 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 19's second unseen set (ICN-3, `scripts/fidelity/T65.md`): recorded by reference round 19
 * on round 17's simulator, booted again, and opened by nothing before the engine was frozen at
 * fdab0be for the final judging round, `<seq>-t65` of every sequence plus swap-t66 and
 * split-expand-b-t66. Same rule and fields as `takes` (`scripts/fidelity/t65.ts align`). Every
 * press replays its sequence's own hold: the gesture telemetry asked the same press as the seen
 * takes, and hold200-t65 let go before the decision and iOS opened the app (as on hold200-t3),
 * so it needs no `hold`.
 */
const t65Takes = {
  "appear-t65": { seq: "appear", frames: 209, shift: -0.2126 },
  "appear-alert-t65": { seq: "appear-alert", frames: 954, shift: 0.9782 },
  "expand-t65": { seq: "expand", frames: 197, shift: -0.166 },
  "press-t65": { seq: "press", frames: 200, shift: -0.1765 },
  "collapse-t65": { seq: "collapse", frames: 232, shift: -0.109 },
  "alert-t65": { seq: "alert", frames: 737, shift: 0.4035 },
  "dismiss-t65": { seq: "dismiss", frames: 306, shift: 0.2055 },
  "split-t65": { seq: "split", frames: 211, shift: -0.2015 },
  "split-alert-t65": { seq: "split-alert", frames: 1018, shift: 1.1317 },
  "unsplit-t65": { seq: "unsplit", frames: 289, shift: 0.5623 },
  "expand-dark-t65": { seq: "expand-dark", frames: 338, shift: -0.3454 },
  "collapse-dark-t65": { seq: "collapse-dark", frames: 230, shift: -0.0512 },
  "tap-t65": { seq: "tap", frames: 368, shift: -0.3725 },
  "hold200-t65": { seq: "hold200", frames: 375, shift: -0.3187 },
  "idletap-t65": { seq: "idletap", frames: 337, shift: -0.6227 },
  "idlehold-t65": { seq: "idlehold", frames: 335, shift: -1.022 },
  "wide-appear-t65": { seq: "wide-appear", frames: 305, shift: -0.0608 },
  "wide-expand-t65": { seq: "wide-expand", frames: 333, shift: -0.1427 },
  "wide-collapse-t65": { seq: "wide-collapse", frames: 225, shift: -0.0537 },
  "split-expand-b-t65": { seq: "split-expand-b", frames: 352, shift: -0.0835 },
  "split-expand-b-t66": { seq: "split-expand-b", frames: 359, shift: -0.0834 },
  "split-collapse-b-t65": { seq: "split-collapse-b", frames: 236, shift: 0.0301 },
  "swap-t65": { seq: "swap", frames: 744, shift: 0.1659 },
  "swap-t66": { seq: "swap", frames: 739, shift: 0.0757 },
  "dismiss-wide-t65": { seq: "dismiss-wide", frames: 303, shift: -0.1088 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 20's first unseen set (ICN-3, `scripts/fidelity/T67.md`): recorded by reference round 20
 * on round 17's simulator, booted again, and opened by nothing before the engine was frozen at
 * fdab0be for the final judging round, `<seq>-t67` of every sequence plus swap-t68 and
 * split-expand-b-t68. Same rule and fields as `takes` (`scripts/fidelity/t67.ts align`). Every
 * press replays its sequence's own hold: the gesture telemetry asked the same press as the seen
 * takes (expand-t67's 1345 ms is 1 ms past their longest, expand-t59's 1344; no `hold` was
 * added for it), and hold200-t67 let go before the decision and iOS opened the app (as on
 * hold200-t3), so it needs no `hold`.
 */
const t67Takes = {
  "appear-t67": { seq: "appear", frames: 207, shift: -0.2533 },
  "appear-alert-t67": { seq: "appear-alert", frames: 909, shift: 0.205 },
  "expand-t67": { seq: "expand", frames: 225, shift: 0.0109 },
  "press-t67": { seq: "press", frames: 538, shift: -0.1732 },
  "collapse-t67": { seq: "collapse", frames: 208, shift: -0.0897 },
  "alert-t67": { seq: "alert", frames: 741, shift: 0.4547 },
  "dismiss-t67": { seq: "dismiss", frames: 313, shift: 0.3075 },
  "split-t67": { seq: "split", frames: 217, shift: -0.1362 },
  "split-alert-t67": { seq: "split-alert", frames: 891, shift: -1.8357 },
  "unsplit-t67": { seq: "unsplit", frames: 290, shift: 0.4896 },
  "expand-dark-t67": { seq: "expand-dark", frames: 368, shift: -0.3291 },
  "collapse-dark-t67": { seq: "collapse-dark", frames: 234, shift: 0.0114 },
  "tap-t67": { seq: "tap", frames: 367, shift: -0.4067 },
  "hold200-t67": { seq: "hold200", frames: 374, shift: -0.2762 },
  "idletap-t67": { seq: "idletap", frames: 338, shift: -0.6152 },
  "idlehold-t67": { seq: "idlehold", frames: 345, shift: -0.8456 },
  "wide-appear-t67": { seq: "wide-appear", frames: 311, shift: 0.0625 },
  "wide-expand-t67": { seq: "wide-expand", frames: 365, shift: -0.0108 },
  "wide-collapse-t67": { seq: "wide-collapse", frames: 233, shift: 0.0526 },
  "split-expand-b-t67": { seq: "split-expand-b", frames: 370, shift: 0.0297 },
  "split-expand-b-t68": { seq: "split-expand-b", frames: 371, shift: -0.0164 },
  "split-collapse-b-t67": { seq: "split-collapse-b", frames: 251, shift: 0.0478 },
  "swap-t67": { seq: "swap", frames: 758, shift: 0.2456 },
  "swap-t68": { seq: "swap", frames: 740, shift: 0.1075 },
  "dismiss-wide-t67": { seq: "dismiss-wide", frames: 303, shift: -0.1129 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 20's second unseen set (ICN-3, `scripts/fidelity/T69.md`): recorded by reference round 20
 * on round 17's simulator, booted again, and opened by nothing before the engine was frozen at
 * fdab0be for the final judging round, `<seq>-t69` of every sequence plus swap-t70 and
 * split-expand-b-t70. Same rule and fields as `takes` (`scripts/fidelity/t69.ts align`). Every
 * press replays its sequence's own hold: the gesture telemetry asked the same press as the seen
 * takes (press-t69's 2738 ms is 1 ms past their longest, 2737; no `hold` was
 * added for it), and hold200-t69 let go before the decision and iOS opened the app (as on
 * hold200-t3), so it needs no `hold`.
 */
const t69Takes = {
  "appear-t69": { seq: "appear", frames: 210, shift: -0.2007 },
  "appear-alert-t69": { seq: "appear-alert", frames: 963, shift: 1.0835 },
  "expand-t69": { seq: "expand", frames: 231, shift: -0.0748 },
  "press-t69": { seq: "press", frames: 220, shift: -0.1953 },
  "collapse-t69": { seq: "collapse", frames: 204, shift: -0.1301 },
  "alert-t69": { seq: "alert", frames: 732, shift: 0.314 },
  "dismiss-t69": { seq: "dismiss", frames: 298, shift: 0.0576 },
  "split-t69": { seq: "split", frames: 275, shift: -0.2066 },
  "split-alert-t69": { seq: "split-alert", frames: 954, shift: 0.1727 },
  "unsplit-t69": { seq: "unsplit", frames: 296, shift: 0.6488 },
  "expand-dark-t69": { seq: "expand-dark", frames: 362, shift: -0.2911 },
  "collapse-dark-t69": { seq: "collapse-dark", frames: 230, shift: -0.0431 },
  "tap-t69": { seq: "tap", frames: 367, shift: -0.3718 },
  "hold200-t69": { seq: "hold200", frames: 392, shift: -0.248 },
  "idletap-t69": { seq: "idletap", frames: 335, shift: -0.6734 },
  "idlehold-t69": { seq: "idlehold", frames: 345, shift: -0.8402 },
  "wide-appear-t69": { seq: "wide-appear", frames: 284, shift: 0.1003 },
  "wide-expand-t69": { seq: "wide-expand", frames: 350, shift: -0.0028 },
  "wide-collapse-t69": { seq: "wide-collapse", frames: 231, shift: 0.04 },
  "split-expand-b-t69": { seq: "split-expand-b", frames: 359, shift: -0.1386 },
  "split-expand-b-t70": { seq: "split-expand-b", frames: 383, shift: -0.0319 },
  "split-collapse-b-t69": { seq: "split-collapse-b", frames: 240, shift: 0.0785 },
  "swap-t69": { seq: "swap", frames: 752, shift: 0.293 },
  "swap-t70": { seq: "swap", frames: 750, shift: 0.1903 },
  "dismiss-wide-t69": { seq: "dismiss-wide", frames: 311, shift: 0.0128 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 21's first unseen set (ICN-3, `scripts/fidelity/T71.md`): recorded by reference round 21
 * on round 17's simulator, booted again, and opened by nothing before the engine was frozen at
 * 2f9b4dc for the next judging round, `<seq>-t71` of every sequence plus swap-t72 and
 * split-expand-b-t72. Same rule and fields as `takes` (`scripts/fidelity/t71.ts align`). Every
 * press replays its sequence's own hold: the gesture telemetry asked the same press as the seen
 * takes (split-expand-b-t71's 1233 ms is 1 ms past their longest, 1232; no `hold` was
 * added for it), and hold200-t71 let go before the decision and iOS opened the app (as on
 * hold200-t3), so it needs no `hold`.
 */
const t71Takes = {
  "appear-t71": { seq: "appear", frames: 213, shift: -0.1659 },
  "appear-alert-t71": { seq: "appear-alert", frames: 914, shift: 0.2648 },
  "expand-t71": { seq: "expand", frames: 457, shift: 0.0312 },
  "press-t71": { seq: "press", frames: 221, shift: -0.1776 },
  "collapse-t71": { seq: "collapse", frames: 232, shift: -0.1198 },
  "alert-t71": { seq: "alert", frames: 705, shift: -0.1534 },
  "dismiss-t71": { seq: "dismiss", frames: 314, shift: 0.3229 },
  "split-t71": { seq: "split", frames: 212, shift: -0.1918 },
  "split-alert-t71": { seq: "split-alert", frames: 952, shift: 0.2548 },
  "unsplit-t71": { seq: "unsplit", frames: 312, shift: 0.711 },
  "expand-dark-t71": { seq: "expand-dark", frames: 350, shift: -0.281 },
  "collapse-dark-t71": { seq: "collapse-dark", frames: 231, shift: -0.0349 },
  "tap-t71": { seq: "tap", frames: 374, shift: -0.2918 },
  "hold200-t71": { seq: "hold200", frames: 371, shift: -0.3433 },
  "idletap-t71": { seq: "idletap", frames: 342, shift: -0.5581 },
  "idlehold-t71": { seq: "idlehold", frames: 343, shift: -0.8854 },
  "wide-appear-t71": { seq: "wide-appear", frames: 313, shift: 0.0657 },
  "wide-expand-t71": { seq: "wide-expand", frames: 369, shift: -0.0242 },
  "wide-collapse-t71": { seq: "wide-collapse", frames: 231, shift: 0.0139 },
  "split-expand-b-t71": { seq: "split-expand-b", frames: 387, shift: 0.0595 },
  "split-expand-b-t72": { seq: "split-expand-b", frames: 360, shift: 0.026 },
  "split-collapse-b-t71": { seq: "split-collapse-b", frames: 229, shift: 0.0089 },
  "swap-t71": { seq: "swap", frames: 773, shift: 0.1323 },
  "swap-t72": { seq: "swap", frames: 756, shift: 0.2717 },
  "dismiss-wide-t71": { seq: "dismiss-wide", frames: 321, shift: 0.1991 },
} as const satisfies Record<string, TakeTimeline>;

/**
 * Round 21's second unseen set (ICN-3, `scripts/fidelity/T73.md`): recorded by reference round 21
 * on round 17's simulator, booted again, and opened by nothing before the engine was frozen at
 * 2f9b4dc for the next judging round, `<seq>-t73` of every sequence plus swap-t74 and
 * split-expand-b-t74. Same rule and fields as `takes` (`scripts/fidelity/t73.ts align`). Every
 * press replays its sequence's own hold: the gesture telemetry asked the same press as the seen
 * takes (split-expand-b-t74's 1215 ms is 3 ms short of their shortest, 1218; no `hold`
 * was added for it), and hold200-t73 let go before the decision and iOS opened the app (as on
 * hold200-t3), so it needs no `hold`.
 */
const t73Takes = {
  "appear-t73": { seq: "appear", frames: 212, shift: -0.1649 },
  "appear-alert-t73": { seq: "appear-alert", frames: 904, shift: 0.125 },
  "expand-t73": { seq: "expand", frames: 450, shift: -0.1214 },
  "press-t73": { seq: "press", frames: 218, shift: -0.1643 },
  "collapse-t73": { seq: "collapse", frames: 207, shift: -0.0899 },
  "alert-t73": { seq: "alert", frames: 713, shift: -0.015 },
  "dismiss-t73": { seq: "dismiss", frames: 299, shift: 0.0859 },
  "split-t73": { seq: "split", frames: 213, shift: -0.16 },
  "split-alert-t73": { seq: "split-alert", frames: 963, shift: 0.0902 },
  "unsplit-t73": { seq: "unsplit", frames: 286, shift: 0.4225 },
  "expand-dark-t73": { seq: "expand-dark", frames: 372, shift: -0.2254 },
  "collapse-dark-t73": { seq: "collapse-dark", frames: 228, shift: -0.0914 },
  "tap-t73": { seq: "tap", frames: 373, shift: -0.2874 },
  "hold200-t73": { seq: "hold200", frames: 379, shift: -0.2502 },
  "idletap-t73": { seq: "idletap", frames: 338, shift: -0.6049 },
  "idlehold-t73": { seq: "idlehold", frames: 339, shift: -0.9403 },
  "wide-appear-t73": { seq: "wide-appear", frames: 310, shift: 0.0324 },
  "wide-expand-t73": { seq: "wide-expand", frames: 360, shift: 0.0075 },
  "wide-collapse-t73": { seq: "wide-collapse", frames: 233, shift: 0.0575 },
  "split-expand-b-t73": { seq: "split-expand-b", frames: 370, shift: 0.0018 },
  "split-expand-b-t74": { seq: "split-expand-b", frames: 381, shift: 0.0629 },
  "split-collapse-b-t73": { seq: "split-collapse-b", frames: 232, shift: -0.0092 },
  "swap-t73": { seq: "swap", frames: 771, shift: 0.089 },
  "swap-t74": { seq: "swap", frames: 741, shift: 0.025 },
  "dismiss-wide-t73": { seq: "dismiss-wide", frames: 306, shift: -0.0509 },
} as const satisfies Record<string, TakeTimeline>;

const takeTimelines: ReadonlyMap<string, TakeTimeline> = new Map<string, TakeTimeline>([
  ...Object.entries(takes),
  ...Object.entries(freshTakes),
  ...Object.entries(t11Takes),
  ...Object.entries(t13Takes),
  ...Object.entries(t15Takes),
  ...Object.entries(t17Takes),
  ...Object.entries(t19Takes),
  ...Object.entries(t21Takes),
  ...Object.entries(t23Takes),
  ...Object.entries(t25Takes),
  ...Object.entries(t27Takes),
  ...Object.entries(t29Takes),
  ...Object.entries(t31Takes),
  ...Object.entries(t33Takes),
  ...Object.entries(t35Takes),
  ...Object.entries(t37Takes),
  ...Object.entries(t39Takes),
  ...Object.entries(t41Takes),
  ...Object.entries(t43Takes),
  ...Object.entries(t45Takes),
  ...Object.entries(t47Takes),
  ...Object.entries(t49Takes),
  ...Object.entries(t51Takes),
  ...Object.entries(t53Takes),
  ...Object.entries(t55Takes),
  ...Object.entries(t57Takes),
  ...Object.entries(t59Takes),
  ...Object.entries(t61Takes),
  ...Object.entries(t63Takes),
  ...Object.entries(t65Takes),
  ...Object.entries(t67Takes),
  ...Object.entries(t69Takes),
  ...Object.entries(t71Takes),
  ...Object.entries(t73Takes),
]);

/** The final round's takes (FINAL.md). */
export const takeNames: readonly string[] = Object.keys(takes);

/** Round 4's fresh takes (FRESH.md). */
export const freshTakeNames: readonly string[] = Object.keys(freshTakes);

/** Round 5's unseen takes (T11.md). */
export const t11TakeNames: readonly string[] = Object.keys(t11Takes);

/** Round 6's unseen takes (T13.md). */
export const t13TakeNames: readonly string[] = Object.keys(t13Takes);

/** Round 7's first unseen set (T15.md). */
export const t15TakeNames: readonly string[] = Object.keys(t15Takes);

/** Round 7's second unseen set (T17.md). */
export const t17TakeNames: readonly string[] = Object.keys(t17Takes);

/** Round 8's first unseen set (T19.md). */
export const t19TakeNames: readonly string[] = Object.keys(t19Takes);

/** Round 8's second unseen set (T21.md). */
export const t21TakeNames: readonly string[] = Object.keys(t21Takes);

/** Round 9's first unseen set (T23.md). */
export const t23TakeNames: readonly string[] = Object.keys(t23Takes);

/** Round 9's second unseen set (T25.md). */
export const t25TakeNames: readonly string[] = Object.keys(t25Takes);

/** Round 10's first unseen set (T27.md). */
export const t27TakeNames: readonly string[] = Object.keys(t27Takes);

/** Round 10's second unseen set (T29.md). */
export const t29TakeNames: readonly string[] = Object.keys(t29Takes);

/** Round 11's first unseen set (T31.md). */
export const t31TakeNames: readonly string[] = Object.keys(t31Takes);

/** Round 11's second unseen set (T33.md). */
export const t33TakeNames: readonly string[] = Object.keys(t33Takes);

/** Round 12's first unseen set (T35.md). */
export const t35TakeNames: readonly string[] = Object.keys(t35Takes);

/** Round 12's second unseen set (T37.md). */
export const t37TakeNames: readonly string[] = Object.keys(t37Takes);

/** Round 13's first unseen set (T39.md). */
export const t39TakeNames: readonly string[] = Object.keys(t39Takes);

/** Round 13's second unseen set (T41.md). */
export const t41TakeNames: readonly string[] = Object.keys(t41Takes);

/** Round 14's first unseen set (T43.md). */
export const t43TakeNames: readonly string[] = Object.keys(t43Takes);

/** Round 14's second unseen set (T45.md). */
export const t45TakeNames: readonly string[] = Object.keys(t45Takes);

/** Round 15's first unseen set (T47.md). */
export const t47TakeNames: readonly string[] = Object.keys(t47Takes);

/** Round 15's second unseen set (T49.md). */
export const t49TakeNames: readonly string[] = Object.keys(t49Takes);

/** Round 16's first unseen set (T51.md). */
export const t51TakeNames: readonly string[] = Object.keys(t51Takes);

/** Round 16's second unseen set (T53.md). */
export const t53TakeNames: readonly string[] = Object.keys(t53Takes);

/** Round 17's first unseen set (T55.md). */
export const t55TakeNames: readonly string[] = Object.keys(t55Takes);

/** Round 17's second unseen set (T57.md). */
export const t57TakeNames: readonly string[] = Object.keys(t57Takes);

/** Round 18's first unseen set (T59.md). */
export const t59TakeNames: readonly string[] = Object.keys(t59Takes);

/** Round 18's second unseen set (T61.md). */
export const t61TakeNames: readonly string[] = Object.keys(t61Takes);

/** Round 19's first unseen set (T63.md). */
export const t63TakeNames: readonly string[] = Object.keys(t63Takes);

/** Round 19's second unseen set (T65.md). */
export const t65TakeNames: readonly string[] = Object.keys(t65Takes);

/** Round 20's first unseen set (T67.md). */
export const t67TakeNames: readonly string[] = Object.keys(t67Takes);

/** Round 20's second unseen set (T69.md). */
export const t69TakeNames: readonly string[] = Object.keys(t69Takes);

/** Round 21's first unseen set (T71.md). */
export const t71TakeNames: readonly string[] = Object.keys(t71Takes);

/** Round 21's second unseen set (T73.md). */
export const t73TakeNames: readonly string[] = Object.keys(t73Takes);

/** The take's timeline, or null for a name that is not an unseen take. */
export const takeTimeline = (take: string): TakeTimeline | null => takeTimelines.get(take) ?? null;

/** Events with every release moved to `holdMs` after the press before it. */
const withHold = (events: readonly LabEvent[], holdMs: number): LabEvent[] => {
  let pressedAt: number | null = null;
  return events.map((event) => {
    if (event.action === "press" || event.action === "press-bubble") pressedAt = event.at;
    if (event.action !== "release" || pressedAt === null) return event;
    return { ...event, at: pressedAt + holdMs };
  });
};

/**
 * A sequence moved onto one take's timeline: the same content and event spacing, every event moved
 * by `extra + the take's shift` seconds, and the take's length. `extra` lets the alignment script
 * place a trial; the lab passes 0. Null when the take does not belong to this sequence.
 */
export const onTake = (spec: SequenceSpec, take: string, extra = 0): SequenceSpec | null => {
  const timeline = takeTimeline(take);
  if (!timeline || timeline.seq !== spec.name) return null;
  const moveMs = (timeline.shift + extra) * 1000;
  const events = timeline.hold === undefined ? spec.events : withHold(spec.events, timeline.hold * 1000);
  return {
    ...spec,
    duration: Math.round(((timeline.frames - 1) * 1000) / spec.fps),
    events: events.map((event) => ({ ...event, at: Math.round((event.at + moveMs) * 100) / 100 })),
    onset: null,
    reference: take,
  };
};

const fromScript = (name: string, script: Script, frames: number, fps: number): Omit<SequenceSpec, "content" | "source" | "onset" | "reference" | "background"> => ({
  name,
  fps,
  duration: Math.round(((frames - 1) * 1000) / fps),
  setup: script.setup,
  // Events sit on the native timeline (recorder timestamps). The 60 fps reference holds each
  // native frame until the next tick, so its onset frame often reads one frame later than ours;
  // shifting events to hide that makes the shape error on the real timeline worse.
  events: script.events.map((event) => ({ at: Math.round((event.at + alignmentOf(name)) * 100000) / 100, action: event.action })),
});

/** Every activity a sequence can draw on, before the cast picks primary and secondary. */
interface Roster {
  a: ActivitySpec;
  b: ActivitySpec;
  aAlert: ActivitySpec;
  bAlert: ActivitySpec;
  w: ActivitySpec;
}

const defaultRoster: Roster = {
  a: defaultContent.primary,
  b: defaultContent.secondary,
  aAlert: defaultContent.alertUpdate,
  bAlert: defaultContent.secondaryAlertUpdate,
  w: wideActivity(defaultWide, defaultPalette),
};

const castContent = (cast: Cast, roster: Roster): SequenceSpec["content"] => {
  switch (cast) {
    case "a-b":
      return { primary: roster.a, secondary: roster.b, alertUpdate: roster.aAlert, secondaryAlertUpdate: roster.bAlert };
    case "w":
      // W's own alert (`alertW`) was not recorded; the slot keeps A's so the type stays total.
      return { primary: roster.w, secondary: roster.b, alertUpdate: roster.aAlert, secondaryAlertUpdate: roster.bAlert };
    case "a-w":
      return { primary: roster.a, secondary: roster.w, alertUpdate: roster.aAlert, secondaryAlertUpdate: roster.bAlert };
    case "w-b": {
      // One app (IslandRefB) owns both, so they show one at a time.
      const group = "refb";
      return {
        primary: { ...roster.w, group },
        secondary: { ...roster.b, group },
        alertUpdate: roster.aAlert,
        secondaryAlertUpdate: { ...roster.bAlert, group },
      };
    }
    default: {
      const exhaustive: never = cast;
      return exhaustive;
    }
  }
};

export const builtInSequence = (name: string): SequenceSpec | null => {
  const script = scripts[name];
  if (!script) return null;
  return {
    ...fromScript(name, script, script.frames, 60),
    content: castContent(script.cast ?? "a-b", defaultRoster),
    onset: null,
    reference: null,
    source: "built-in",
    background: "#fdfdfd",
  };
};

// Boundary parsing for track A's reference JSON. Unknown or malformed fields fall back to the built-in.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const str = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
const record = (value: unknown, key: string): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  const inner = value[key];
  return isRecord(inner) ? inner : null;
};

/** Reads `reference/sequences/<name>.json` (track A's format). */
export const parseSequenceSpec = (name: string, raw: unknown): SequenceSpec | null => {
  const base = builtInSequence(name);
  const script = scripts[name];
  if (!isRecord(raw) || !base || !script) return base;
  const fps = num(record(raw, "frame_rate")?.frames_dir, 60);
  // "…/0001.png .. 0230.png (copy of …)": the last frame number is the length.
  const frames = Number(/\.\. (\d{4})\.png/.exec(str(raw.frames, ""))?.[1] ?? script.frames);
  const content = record(raw, "content");
  // Rounds 1 to 3 describe A and B in one block; the held-out files key one block per activity
  // ({ A: {...}, W: {...} }), each with its own colours and `activity` record.
  const block = (key: string) => record(content, key) ?? content;
  const colors = record(block("A"), "colors") ?? record(block("W"), "colors");
  const palette = { green: str(colors?.green_progress ?? colors?.green, defaultPalette.green), track: str(colors?.track, defaultPalette.track) };
  const a = record(record(block("A"), "activity"), "A");
  const b = record(record(block("B"), "activity"), "B");
  const w = record(record(block("W"), "activity"), "W");
  const alert = record(block("A"), "alert_update_A");
  const aPalette = { ...palette, accent: str(a?.accent, "#FF9500") };
  const bPalette = { ...palette, accent: str(b?.accent, "#0A84FF") };
  const roster: Roster = {
    a: activity("A", num(a?.value, 42), num(a?.progress, 0.6), aPalette),
    b: activity("B", num(b?.value, 7), num(b?.progress, 0.6), bPalette),
    aAlert: activity("A", num(alert?.value, 43), num(alert?.progress, 0.8), aPalette),
    // `alertB` (IslandRefApp.swift): 8 and 0.8. The sequence files don't repeat it.
    bAlert: defaultContent.secondaryAlertUpdate,
    w: wideActivity(
      {
        title: str(w?.title, defaultWide.title),
        eta: str(w?.eta, defaultWide.eta),
        minutes: num(w?.minutes, defaultWide.minutes),
        filled: num(w?.filled, defaultWide.filled),
      },
      palette,
    ),
  };
  return {
    ...fromScript(name, script, frames, fps),
    content: castContent(script.cast ?? "a-b", roster),
    onset: (() => {
      const onset = record(raw, "events")?.shape_onset_s;
      return typeof onset === "number" ? onset : null;
    })(),
    reference: str(raw.canonical_take, "") === "" ? null : name,
    source: "reference",
    // "#3A3A3C (records as luminance 57)": the backdrop's hex, else the white app (records as 253).
    background: /^#[0-9a-f]{6}/i.exec(str(raw.backdrop, ""))?.[0] ?? "#fdfdfd",
  };
};
