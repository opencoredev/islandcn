/**
 * Knobs a docs page or the studio can render next to a demo. Each `<name>-controls.ts` exports
 * a list of these; the key matches a prop on the demo, and `initial` is that prop's default.
 */
export type Knob =
  | { kind: "text"; key: string; label: string; initial: string }
  | { kind: "range"; key: string; label: string; min: number; max: number; step: number; initial: number; unit?: string }
  | { kind: "toggle"; key: string; label: string; initial: boolean }
  | { kind: "select"; key: string; label: string; options: readonly { value: string; label: string }[]; initial: string }
  | { kind: "color"; key: string; label: string; initial: string };

/** The state a demo holds, shared by every demo's `view` knob. */
export const viewKnob = {
  kind: "select",
  key: "view",
  label: "State",
  options: [
    { value: "live", label: "Live" },
    { value: "compact", label: "Compact" },
    { value: "minimal", label: "Minimal (split)" },
    { value: "expanded", label: "Expanded" },
  ],
  initial: "live",
} as const satisfies Knob;
