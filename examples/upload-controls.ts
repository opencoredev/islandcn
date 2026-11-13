import { type Knob, viewKnob } from "./controls";

export const uploadControls = [
  { kind: "text", key: "fileName", label: "File name", initial: "mochi-asleep.jpg" },
  { kind: "range", key: "seconds", label: "Upload time", min: 3, max: 30, step: 1, initial: 9, unit: "s" },
  { kind: "range", key: "sizeMb", label: "Size", min: 1, max: 900, step: 1, initial: 6, unit: "MB" },
  { kind: "color", key: "accent", label: "Accent", initial: "#0a84ff" },
  viewKnob,
] as const satisfies readonly Knob[];
