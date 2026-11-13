"use client";

import { useEffect, useState } from "react";

import { CallActivity, type CallState } from "@/components/islandcn/call-activity";

import { DemoStage, StageActions, StageButton, type DemoBaseProps, type DemoView } from "./demo-stage";
import { callSample } from "./samples";

export interface CallDemoProps extends DemoBaseProps {
  /** Caller name. Defaults to "Mochi's sitter", whose contact photo is the cat. */
  caller?: string;
  /** Second line while ringing. Defaults to "mobile". */
  subtitle?: string;
  /** Hold the call answered instead of ringing. Defaults to false. */
  answered?: boolean;
}

type Phase = { kind: "idle" } | CallState;

/** An incoming call you can accept or decline. Unanswered calls stop ringing after 12 s. */
export const CallDemo = ({ caller = callSample.caller, subtitle = callSample.subtitle, answered = false, view = "live", height, theme, reducedMotion }: CallDemoProps) => {
  const [phase, setPhase] = useState<Phase>(() => (answered ? { kind: "active", since: Date.now() - 64_000 } : { kind: "ringing" }));

  useEffect(() => {
    if (phase.kind === "idle") {
      const timer = window.setTimeout(() => setPhase({ kind: "ringing" }), 3000);
      return () => window.clearTimeout(timer);
    }
    if (phase.kind === "ringing" && view === "live") {
      const timer = window.setTimeout(() => setPhase({ kind: "idle" }), 12_000);
      return () => window.clearTimeout(timer);
    }
  }, [phase, view]);

  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} hint={phase.kind === "idle" ? "Calling again in a moment." : undefined}>
      {phase.kind === "idle" ? null : (
        <CallActivity
          caller={caller}
          subtitle={subtitle}
          // The sample contact is saved with the cat's photo; a caller typed in the knobs shows initials.
          avatar={caller === callSample.caller ? callSample.avatar : undefined}
          state={phase}
          onAccept={() => setPhase({ kind: "active", since: Date.now() })}
          onDecline={() => setPhase({ kind: "idle" })}
        />
      )}
      {phase.kind === "idle" ? (
        <StageActions>
          <StageButton onClick={() => setPhase({ kind: "ringing" })}>Ring now</StageButton>
        </StageActions>
      ) : null}
    </DemoStage>
  );
};
