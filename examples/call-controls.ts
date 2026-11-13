import { type Knob, viewKnob } from "./controls";

export const callControls = [
  { kind: "text", key: "caller", label: "Caller", initial: "Mochi's sitter" },
  { kind: "text", key: "subtitle", label: "Subtitle", initial: "mobile" },
  { kind: "toggle", key: "answered", label: "Answered", initial: false },
  viewKnob,
] as const satisfies readonly Knob[];
