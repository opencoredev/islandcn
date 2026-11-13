"use client";

import { useEffect, useState } from "react";

import { NowPlayingActivity, type PlaybackState } from "@/components/islandcn/now-playing-activity";

import { DemoStage, type DemoBaseProps, type DemoView } from "./demo-stage";
import { nowPlayingSample } from "./samples";

const { playlist } = nowPlayingSample;

export interface NowPlayingDemoProps extends DemoBaseProps {
  /** Start playing. Defaults to true. */
  autoplay?: boolean;
}

/** A small player: play, pause, next and previous all work, and the track advances at its end. */
export const NowPlayingDemo = ({ autoplay = true, view = "live", height, theme, reducedMotion }: NowPlayingDemoProps) => {
  const [index, setIndex] = useState(0);
  // Start 38 s in, so the scrubber shows progress straight away.
  const { startAt } = nowPlayingSample;
  const [playback, setPlayback] = useState<PlaybackState>(() => (autoplay ? { kind: "playing", startedAt: Date.now() - startAt } : { kind: "paused", position: startAt }));
  const track = playlist[index % playlist.length] ?? playlist[0];

  const go = (step: number) => {
    setIndex((i) => (i + step + playlist.length) % playlist.length);
    setPlayback({ kind: "playing", startedAt: Date.now() });
  };
  const toggle = () =>
    setPlayback((current) =>
      current.kind === "playing" ? { kind: "paused", position: Date.now() - current.startedAt } : { kind: "playing", startedAt: Date.now() - current.position },
    );

  useEffect(() => {
    if (playback.kind !== "playing") return;
    const timer = window.setTimeout(() => go(1), Math.max(0, playback.startedAt + track.duration - Date.now()));
    return () => window.clearTimeout(timer);
  }, [playback, track.duration]);

  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} companion="timer" hint="Hold the island for the player.">
      <NowPlayingActivity
        title={track.title}
        artist={track.artist}
        duration={track.duration}
        artwork={track.artwork}
        accent={track.accent}
        playback={playback}
        onToggle={toggle}
        onNext={() => go(1)}
        onPrevious={() => go(-1)}
        // The output button shows when it has a handler; the demo has no speakers to pick from.
        onOutput={() => undefined}
      />
    </DemoStage>
  );
};
