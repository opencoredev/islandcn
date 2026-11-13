"use client";

import { useState } from "react";

import { NowPlayingActivity, type PlaybackState } from "@/components/islandcn/now-playing-activity";
import { TimerActivity, type TimerState } from "@/components/islandcn/timer-activity";

import { DemoStage, StageActions, StageButton, type DemoBaseProps, type DemoView } from "./demo-stage";
import { nowPlayingSample } from "./samples";

export interface SplitDemoProps extends DemoBaseProps {
  /** Which activity takes the attached pill. The other goes to the detached capsule. Defaults to "timer". */
  primary?: "timer" | "music";
  /** Island state to hold. It is already split, so there is no "minimal". Defaults to "live". */
  view?: Exclude<DemoView, "minimal">;
}

const track = nowPlayingSample.playlist[0];

/**
 * Two activities at once: a timer and music. The island splits into the attached pill and a
 * detached capsule. Hold either one to expand that activity; end one to watch them merge.
 */
export const SplitDemo = ({ primary = "timer", view = "live", height, theme, reducedMotion }: SplitDemoProps) => {
  const duration = 8 * 60_000;
  const [timer, setTimer] = useState<TimerState | null>(() => ({ kind: "running", endsAt: Date.now() + 4 * 60_000 + 32_000 }));
  const [music, setMusic] = useState<PlaybackState | null>(() => ({ kind: "playing", startedAt: Date.now() - 61_000 }));
  // Priority picks the attached side.
  const timerPriority = primary === "timer" ? 1 : 0;

  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} hint="Hold the pill or the capsule to expand that activity.">
      {timer ? (
        <TimerActivity
          state={timer}
          duration={duration}
          priority={timerPriority}
          onToggle={() =>
            setTimer((t) => (t === null ? t : t.kind === "running" ? { kind: "paused", remaining: t.endsAt - Date.now() } : { kind: "running", endsAt: Date.now() + t.remaining }))
          }
          onCancel={() => setTimer(null)}
        />
      ) : null}
      {music ? (
        <NowPlayingActivity
          title={track.title}
          artist={track.artist}
          duration={track.duration}
          artwork={track.artwork}
          accent={track.accent}
          playback={music}
          onToggle={() =>
            setMusic((m) => (m === null ? m : m.kind === "playing" ? { kind: "paused", position: Date.now() - m.startedAt } : { kind: "playing", startedAt: Date.now() - m.position }))
          }
        />
      ) : null}
      <StageActions>
        <StageButton onClick={() => setTimer((t) => (t ? null : { kind: "running", endsAt: Date.now() + 4 * 60_000 + 32_000 }))}>
          {timer ? "End timer" : "Start timer"}
        </StageButton>
        <StageButton onClick={() => setMusic((m) => (m ? null : { kind: "playing", startedAt: Date.now() }))}>{music ? "Stop music" : "Play music"}</StageButton>
      </StageActions>
    </DemoStage>
  );
};

