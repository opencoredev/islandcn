import { type Knob, viewKnob } from "./controls";

export const etaControls = [
  {
    kind: "select",
    key: "kind",
    label: "Kind",
    options: [
      { value: "ride", label: "Ride" },
      { value: "delivery", label: "Delivery" },
    ],
    initial: "ride",
  },
  { kind: "range", key: "minutes", label: "Arrives in", min: 1, max: 45, step: 1, initial: 6, unit: "min" },
  viewKnob,
] as const satisfies readonly Knob[];
