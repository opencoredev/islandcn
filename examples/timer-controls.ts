import { type Knob, viewKnob } from "./controls";

export const timerControls = [
  { kind: "range", key: "minutes", label: "Length", min: 1, max: 90, step: 1, initial: 5, unit: "min" },
  { kind: "text", key: "label", label: "Name", initial: "Pasta" },
  { kind: "color", key: "accent", label: "Accent", initial: "#ff9f0a" },
  viewKnob,
] as const satisfies readonly Knob[];
