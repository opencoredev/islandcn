import { type Knob, viewKnob } from "./controls";

export const recordingControls = [
  {
    kind: "select",
    key: "kind",
    label: "Recording",
    options: [
      { value: "audio", label: "Audio" },
      { value: "screen", label: "Screen" },
      { value: "camera", label: "Camera" },
    ],
    initial: "audio",
  },
  viewKnob,
] as const satisfies readonly Knob[];
