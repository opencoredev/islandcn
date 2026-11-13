"use client";

import { useState } from "react";

import { islandAccent } from "@/components/islandcn/theme";
import { TimerActivity, type TimerState } from "@/components/islandcn/timer-activity";

import { DemoStage, type DemoBaseProps, type DemoView } from "./demo-stage";
import { timerSample } from "./samples";

export interface TimerDemoProps extends DemoBaseProps {
  /** Timer length in minutes. Defaults to 5. */
  minutes?: number;
  /** Name in the expanded view. Defaults to "Pasta". */
  label?: string;
  /** Accent colour. Defaults to orange. */
  accent?: string;
}

/** A countdown with working pause, resume and cancel. Cancel or the end starts it again. */
export const TimerDemo = ({ minutes = timerSample.minutes, label = timerSample.label, accent = islandAccent.orange, view = "live", height, theme, reducedMotion }: TimerDemoProps) => {
  const duration = minutes * 60_000;
  const [state, setState] = useState<TimerState>(() => ({ kind: "running", endsAt: Date.now() + duration }));
  const restart = () => setState({ kind: "running", endsAt: Date.now() + duration });
  const toggle = () =>
    setState((current) =>
      current.kind === "running" ? { kind: "paused", remaining: Math.max(0, current.endsAt - Date.now()) } : { kind: "running", endsAt: Date.now() + current.remaining },
    );

  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} hint="Hold the island for pause and cancel.">
      <TimerActivity state={state} duration={duration} label={label} accent={accent} onToggle={toggle} onCancel={restart} onEnd={restart} />
    </DemoStage>
  );
};
