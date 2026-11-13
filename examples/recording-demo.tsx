"use client";

import { useEffect, useState } from "react";

import { type RecordingKind, RecordingActivity, type RecordingState } from "@/components/islandcn/recording-activity";

import { DemoStage, StageActions, StageButton, type DemoBaseProps, type DemoView } from "./demo-stage";
import { recordingSample } from "./samples";

export interface RecordingDemoProps extends DemoBaseProps {
  /** Audio, screen or camera. Defaults to "audio". */
  kind?: RecordingKind;
}

type Phase = { kind: "stopped" } | RecordingState;

/** A recording with a waveform and a running time, and stop. No pause, as the system's voice recorder has none. */
export const RecordingDemo = ({ kind = "audio", view = "live", height, theme, reducedMotion }: RecordingDemoProps) => {
  const [phase, setPhase] = useState<Phase>(() => ({ kind: "recording", since: Date.now() - recordingSample.elapsed }));

  useEffect(() => {
    if (phase.kind !== "stopped") return;
    const timer = window.setTimeout(() => setPhase({ kind: "recording", since: Date.now() }), 2500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} hint={phase.kind === "stopped" ? "Saved. Recording again in a moment." : "Hold the island to stop."}>
      {phase.kind === "stopped" ? (
        <StageActions>
          <StageButton onClick={() => setPhase({ kind: "recording", since: Date.now() })}>Record</StageButton>
        </StageActions>
      ) : (
        <RecordingActivity kind={kind} state={phase} onStop={() => setPhase({ kind: "stopped" })} />
      )}
    </DemoStage>
  );
};
