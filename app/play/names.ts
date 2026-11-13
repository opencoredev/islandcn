import type { DemoStageTheme, DemoView } from "@/examples/demo-stage";
import type { ReducedMotionSetting } from "@/lib/island";

/** Every preset the playground shows, in gallery order. */
export const demoNames = [
  "upload",
  "timer",
  "now-playing",
  "call",
  "eta",
  "recording",
  "nearby-transfer",
  "battery",
  "split",
] as const;

export type DemoName = (typeof demoNames)[number];

export interface PlayOptions {
  view: DemoView;
  /** A demo-specific state, such as the call's "answered". */
  phase: string | null;
  /** The island's reduced-motion setting: `?motion=reduced` is "always". */
  reducedMotion: ReducedMotionSetting;
  /** Stage colours: `?stage=dark` puts the island on a black screen (keyline on). Undefined keeps the light one. */
  theme: DemoStageTheme | undefined;
}

export const parseDemoName = (value: string): DemoName | null => demoNames.find((name) => name === value) ?? null;

export const parseView = (value: string | undefined): DemoView => {
  switch (value) {
    case "compact":
    case "minimal":
    case "expanded":
      return value;
    default:
      return "live";
  }
};

/** `?motion=reduced` runs the island with reduced motion whatever the system says. */
export const parseMotion = (value: string | undefined): ReducedMotionSetting => (value === "reduced" ? "always" : "user");

const darkStage = { background: "#000000", ink: "#f5f5f7", muted: "#98989d", backdrop: "#000000" } as const satisfies DemoStageTheme;

/** `?stage=dark` runs the demos on a black screen. */
export const parseStage = (value: string | undefined): DemoStageTheme | undefined => (value === "dark" ? darkStage : undefined);
