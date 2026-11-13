import { type Knob, viewKnob } from "./controls";

export const batteryControls = [
  { kind: "range", key: "level", label: "Charge", min: 1, max: 100, step: 1, initial: 42, unit: "%" },
  { kind: "toggle", key: "charging", label: "Charging", initial: true },
  viewKnob,
] as const satisfies readonly Knob[];
