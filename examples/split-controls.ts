import type { Knob } from "./controls";

export const splitControls = [
  {
    kind: "select",
    key: "primary",
    label: "Attached pill",
    options: [
      { value: "timer", label: "Timer" },
      { value: "music", label: "Music" },
    ],
    initial: "timer",
  },
  {
    kind: "select",
    key: "view",
    label: "State",
    options: [
      { value: "live", label: "Live" },
      { value: "expanded", label: "Expanded" },
    ],
    initial: "live",
  },
] as const satisfies readonly Knob[];
