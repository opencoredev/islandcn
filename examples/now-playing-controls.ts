import { type Knob, viewKnob } from "./controls";

export const nowPlayingControls = [{ kind: "toggle", key: "autoplay", label: "Playing", initial: true }, viewKnob] as const satisfies readonly Knob[];
