"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { BatteryActivity, chargingIndicatorHold } from "@/components/islandcn/battery-activity";
import { CallActivity, type CallState } from "@/components/islandcn/call-activity";
import { EtaActivity } from "@/components/islandcn/eta-activity";
import { NearbyTransferActivity } from "@/components/islandcn/nearby-transfer-activity";
import { NowPlayingActivity, type PlaybackState } from "@/components/islandcn/now-playing-activity";
import { RecordingActivity } from "@/components/islandcn/recording-activity";
import { TimerActivity, type TimerState } from "@/components/islandcn/timer-activity";
import { UploadActivity } from "@/components/islandcn/upload-activity";
import type { PresetSlug } from "@/constants/presets";
import { callSample, nowPlayingSample, transferSample, uploadSample } from "@/examples/samples";

/** The home page's track: its made-up title with the cover made for it, and the cover's tint for the meter. */
const heroTrack = nowPlayingSample.playlist[0];

/** The presets the home page plays: every preset. */
export type EverydaySlug = PresetSlug;

/*
 * Short runs of each preset in the site's own island, the one at the top of the
 * window. A driver mounts inside the page's provider, plays for a few seconds
 * and calls `onFinish`, which unmounts it and ends the activity.
 */

interface DriverProps {
  onFinish: () => void;
}

/**
 * How often a driver moves its value: about as often as a Live Activity gets an update. Each
 * change turns its digits over for half a second, so a faster feed keeps the number blurred.
 */
const UPDATE_MS = 1000;

/** 0 to 1 over `seconds` in whole-second steps, then `onDone` after a short hold. */
const useProgress = (seconds: number, onDone: () => void, holdMs = 1600) => {
  const [progress, setProgress] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / (seconds * 1000));
      setProgress(t);
      if (t >= 1) window.clearInterval(timer);
    }, UPDATE_MS);
    return () => window.clearInterval(timer);
  }, [seconds]);
  useEffect(() => {
    if (progress < 1) return;
    const timer = window.setTimeout(() => done.current(), holdMs);
    return () => window.clearTimeout(timer);
  }, [progress, holdMs]);
  return progress;
};

/** Calls `onFinish` after `ms`. */
const useLifetime = (ms: number, onFinish: () => void) => {
  const finish = useRef(onFinish);
  finish.current = onFinish;
  useEffect(() => {
    const timer = window.setTimeout(() => finish.current(), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
};

/** Where the upload is when it comes in: part way, so its first frame shows a filling ring, not "0" and an empty track. */
const UPLOAD_START = 0.36;

const UploadDriver = ({ onFinish }: DriverProps) => {
  const progress = useProgress(6, onFinish);
  return (
    <UploadActivity
      id="site-upload"
      fileName={uploadSample.fileName}
      src={uploadSample.src}
      progress={UPLOAD_START + (1 - UPLOAD_START) * progress}
      totalBytes={uploadSample.sizeMb * 1_000_000}
      destination={uploadSample.destination}
    />
  );
};

/**
 * A timer that pauses and resumes from its own buttons, so the expanded view shows the pause and
 * cancel circles the timer preset draws when it has somewhere to send them.
 */
const useToggleTimer = (left: number) => {
  const [state, setState] = useState<TimerState>(() => ({ kind: "running", endsAt: Date.now() + left }));
  const toggle = () =>
    setState((was) => (was.kind === "running" ? { kind: "paused", remaining: Math.max(0, was.endsAt - Date.now()) } : { kind: "running", endsAt: Date.now() + was.remaining }));
  return { state, toggle };
};

/** The output button shows when it has somewhere to send its press; the demo has no speakers to pick from. */
const pickOutput = () => undefined;

/** The ride as the preset lays it out: the driver, the plate, the car and the Message capsule, which goes nowhere here. */
const Ride = ({ arrivesAt }: { arrivesAt: number }) => (
  <EtaActivity id="site-eta" arrivesAt={arrivesAt} title="Driver is on the way" driverName="Kofi A." plate="7KXR482" vehicle="Silver estate" onContact={() => undefined} />
);

/** Playback that pauses and resumes from the transport row; previous and next restart the track. */
const useTogglePlayback = (at: number) => {
  const [playback, setPlayback] = useState<PlaybackState>(() => ({ kind: "playing", startedAt: Date.now() - at }));
  const toggle = () =>
    setPlayback((was) => (was.kind === "playing" ? { kind: "paused", position: Date.now() - was.startedAt } : { kind: "playing", startedAt: Date.now() - was.position }));
  const restart = () => setPlayback({ kind: "playing", startedAt: Date.now() });
  return { playback, toggle, restart };
};

const TimerDriver = ({ onFinish }: DriverProps) => {
  const { state, toggle } = useToggleTimer(15_000);
  return <TimerActivity id="site-timer" state={state} duration={15_000} label="Tea" onEnd={onFinish} onToggle={toggle} onCancel={onFinish} />;
};

const NowPlayingDriver = ({ onFinish }: DriverProps) => {
  const { playback, toggle, restart } = useTogglePlayback(42_000);
  useLifetime(9000, onFinish);
  return (
    <NowPlayingActivity
      id="site-music"
      title="Saltwater Static"
      artist="The Lagoon Club"
      duration={214_000}
      artwork={heroTrack.artwork}
      accent={heroTrack.accent}
      playback={playback}
      onToggle={toggle}
      onPrevious={restart}
      onNext={restart}
      onOutput={pickOutput}
    />
  );
};

const CallDriver = ({ onFinish }: DriverProps) => {
  const [state, setState] = useState<CallState>({ kind: "ringing" });
  // Unanswered calls stop ringing; answered ones hang up after a short chat.
  useLifetime(state.kind === "ringing" ? 10_000 : 6000, onFinish);
  return (
    <CallActivity
      id="site-call"
      caller={callSample.caller}
      subtitle={callSample.subtitle}
      avatar={callSample.avatar}
      state={state}
      onAccept={() => setState({ kind: "active", since: Date.now() })}
      onDecline={onFinish}
    />
  );
};

const EtaDriver = ({ onFinish }: DriverProps) => {
  useLifetime(8000, onFinish);
  const [arrivesAt] = useState(() => Date.now() + 6 * 60_000);
  return <Ride arrivesAt={arrivesAt} />;
};


/** A voice memo, as the recorder shows it: the waveform, the time and the stop ring. */
const RecordingDriver = ({ onFinish }: DriverProps) => {
  const [since] = useState(() => Date.now());
  useLifetime(8000, onFinish);
  return <RecordingActivity id="site-recording" state={{ kind: "recording", since }} onStop={onFinish} />;
};

/** The sample photo of a cat going to a laptop nearby, as the gallery sends it. */
const TransferAt = ({ progress }: { progress: number }) => (
  <NearbyTransferActivity id="site-transfer" deviceName={transferSample.deviceName} device="laptop" itemName={transferSample.itemName} src={transferSample.src} progress={progress} />
);

const TransferDriver = ({ onFinish }: DriverProps) => {
  const progress = useProgress(5, onFinish);
  return <TransferAt progress={progress} />;
};

/** Plugging in, as the phone shows it: the pill appears, the battery fills in, it holds and goes by itself. */
const BatteryDriver = ({ onFinish }: DriverProps) => (
  <BatteryActivity id="site-battery" level={0.42} charging timeToFull={48 * 60_000} dismissAfter={chargingIndicatorHold} onDismiss={onFinish} />
);

const SplitDriver = ({ onFinish }: DriverProps) => {
  const [endsAt] = useState(() => Date.now() + 4 * 60_000 + 32_000);
  const [startedAt] = useState(() => Date.now() - 61_000);
  useLifetime(9000, onFinish);
  return (
    <>
      <TimerActivity id="site-split-timer" priority={1} state={{ kind: "running", endsAt }} duration={8 * 60_000} />
      <NowPlayingActivity id="site-split-music" title="Saltwater Static" artist="The Lagoon Club" duration={214_000} artwork={heroTrack.artwork} accent={heroTrack.accent} playback={{ kind: "playing", startedAt }} />
    </>
  );
};

const DRIVERS = {
  upload: UploadDriver,
  timer: TimerDriver,
  "now-playing": NowPlayingDriver,
  "incoming-call": CallDriver,
  eta: EtaDriver,
  recording: RecordingDriver,
  transfer: TransferDriver,
  battery: BatteryDriver,
  split: SplitDriver,
} as const satisfies Record<EverydaySlug, (props: DriverProps) => ReactNode>;

/** Plays one preset in the page's island. Mount it inside the site's provider; a new `run` restarts it. */
export const TopIslandRun = ({ slug, run, onFinish }: { slug: EverydaySlug; run: number; onFinish: () => void }) => {
  const Driver = DRIVERS[slug];
  return <Driver key={`${slug}-${run}`} onFinish={onFinish} />;
};

/*
 * The same activities held, for reduced motion: fixed progress and no lifetime, so the island
 * stays populated instead of emptying after a run. Clocks still count (that is data, not motion;
 * the island draws every change without animating it). The hero shows one of these by default.
 */

const UploadStill = () => (
  <UploadActivity
    id="site-upload"
    fileName={uploadSample.fileName}
    src={uploadSample.src}
    progress={uploadSample.still}
    totalBytes={uploadSample.sizeMb * 1_000_000}
    destination={uploadSample.destination}
  />
);

const TimerStill = () => {
  const { state, toggle } = useToggleTimer(4 * 60_000 + 57_000);
  return <TimerActivity id="site-timer" state={state} duration={5 * 60_000} label="Tea" onToggle={toggle} onCancel={toggle} />;
};

const NowPlayingStill = () => {
  const { playback, toggle, restart } = useTogglePlayback(42_000);
  return (
    <NowPlayingActivity
      id="site-music"
      title="Saltwater Static"
      artist="The Lagoon Club"
      duration={214_000}
      artwork={heroTrack.artwork}
      accent={heroTrack.accent}
      playback={playback}
      onToggle={toggle}
      onPrevious={restart}
      onNext={restart}
      onOutput={pickOutput}
    />
  );
};

const CallStill = () => {
  const [state, setState] = useState<CallState | null>({ kind: "ringing" });
  if (state === null) return null;
  return (
    <CallActivity
      id="site-call"
      caller={callSample.caller}
      subtitle={callSample.subtitle}
      avatar={callSample.avatar}
      state={state}
      onAccept={() => setState({ kind: "active", since: Date.now() })}
      onDecline={() => setState(null)}
    />
  );
};

const EtaStill = () => {
  const [arrivesAt] = useState(() => Date.now() + 6 * 60_000);
  return <Ride arrivesAt={arrivesAt} />;
};


const RecordingStill = () => {
  const [since] = useState(() => Date.now() - 15_000);
  // Stop holds the recording, so the still keeps its stop ring as the run shows it.
  return <RecordingActivity id="site-recording" state={{ kind: "recording", since }} onStop={() => undefined} />;
};

const TransferStill = () => <TransferAt progress={transferSample.still} />;

const BatteryStill = () => <BatteryActivity id="site-battery" level={0.42} charging timeToFull={48 * 60_000} />;

const SplitStill = () => {
  const [endsAt] = useState(() => Date.now() + 4 * 60_000 + 32_000);
  const [startedAt] = useState(() => Date.now() - 61_000);
  return (
    <>
      <TimerActivity id="site-split-timer" priority={1} state={{ kind: "running", endsAt }} duration={8 * 60_000} />
      <NowPlayingActivity id="site-split-music" title="Saltwater Static" artist="The Lagoon Club" duration={214_000} artwork={heroTrack.artwork} accent={heroTrack.accent} playback={{ kind: "playing", startedAt }} />
    </>
  );
};

const STILLS = {
  upload: UploadStill,
  timer: TimerStill,
  "now-playing": NowPlayingStill,
  "incoming-call": CallStill,
  eta: EtaStill,
  recording: RecordingStill,
  transfer: TransferStill,
  battery: BatteryStill,
  split: SplitStill,
} as const satisfies Record<EverydaySlug, () => ReactNode>;

/** One preset held still in the page's island, for reduced motion. */
export const TopIslandStill = ({ slug }: { slug: EverydaySlug }) => {
  const Still = STILLS[slug];
  return <Still key={slug} />;
};
