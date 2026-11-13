"use client";

import { type ReactNode, useEffect, useState } from "react";

import { BatteryActivity, chargingIndicatorHold } from "@/components/islandcn/battery-activity";
import { CallActivity, type CallState } from "@/components/islandcn/call-activity";
import { EtaActivity } from "@/components/islandcn/eta-activity";
import { NearbyTransferActivity } from "@/components/islandcn/nearby-transfer-activity";
import { NowPlayingActivity, type PlaybackState } from "@/components/islandcn/now-playing-activity";
import { RecordingActivity, type RecordingState } from "@/components/islandcn/recording-activity";
import { TimerActivity, type TimerState } from "@/components/islandcn/timer-activity";
import { UploadActivity } from "@/components/islandcn/upload-activity";
import type { PresetSlug } from "@/constants/presets";
import {
  batterySample,
  callSample,
  etaSample,
  nowPlayingSample,
  recordingSample,
  timerSample,
  transferSample,
  uploadSample,
} from "@/examples/samples";

/*
 * The shipped preset components, played on the showcase stage: the same files the home page and
 * the examples run, with the examples' sample copy. Each driver keeps its activity up until the
 * reader dismisses it, so the actions under the stage always have something to act on, except the
 * battery, which plays as the charging indicator does: it shows when plugged in and goes. The ids
 * are the stage's own, so they never meet the region rebuild's activities during a hand-off.
 */

/** The first activity's id on the stage, per preset: what Expand, Alert and Hold act on. */
export const REAL_IDS = {
  upload: "pg-upload",
  timer: "pg-timer",
  "now-playing": "pg-now-playing",
  "incoming-call": "pg-call",
  eta: "pg-eta",
  recording: "pg-recording",
  transfer: "pg-transfer",
  battery: "pg-battery",
  split: "pg-split-timer",
} as const satisfies Record<PresetSlug, string>;

/** The split's second activity, and the one the Split action adds beside any other preset. */
export const COMPANION_ID = "pg-companion";

export const isRealPreset = (key: string): key is PresetSlug => Object.hasOwn(REAL_IDS, key);

interface DriverProps {
  /** Ends the activity from inside it (Cancel, Decline, Stop), as Dismiss would. Required. */
  onDismiss: () => void;
}

/** How often a progress driver moves its value: about as often as a live status gets an update. */
const UPDATE_MS = 1000;

/** Progress that creeps from `from` toward `to` a step a second and holds there, so the stage never empties by itself. */
const useCreep = (from: number, to: number, step: number) => {
  const [progress, setProgress] = useState(from);
  useEffect(() => {
    const timer = window.setInterval(() => setProgress((current) => Math.min(to, current + step)), UPDATE_MS);
    return () => window.clearInterval(timer);
  }, [to, step]);
  return progress;
};

/** The posting look: the ring holds the percentage, so there is no stop button to end it; Dismiss does. */
const UploadDriver = () => {
  const progress = useCreep(uploadSample.still, 0.96, 0.01);
  return (
    <UploadActivity
      id={REAL_IDS.upload}
      fileName={uploadSample.fileName}
      src={uploadSample.src}
      progress={progress}
      totalBytes={uploadSample.sizeMb * 1_000_000}
      destination={uploadSample.destination}
    />
  );
};

/** A running countdown with working pause, resume and cancel, as the timer example plays it. */
const TimerDriver = ({ onDismiss, id = REAL_IDS.timer, minutes = timerSample.minutes, label = timerSample.label, priority }: DriverProps & { id?: string; minutes?: number; label?: string; priority?: number }) => {
  const duration = minutes * 60_000;
  const [state, setState] = useState<TimerState>(() => ({ kind: "running", endsAt: Date.now() + duration }));
  const toggle = () =>
    setState((current) =>
      current.kind === "running" ? { kind: "paused", remaining: Math.max(0, current.endsAt - Date.now()) } : { kind: "running", endsAt: Date.now() + current.remaining },
    );
  // A finished countdown starts again, so the stage keeps a timer to look at.
  const restart = () => setState({ kind: "running", endsAt: Date.now() + duration });
  return <TimerActivity id={id} priority={priority} state={state} duration={duration} label={label} onToggle={toggle} onCancel={onDismiss} onEnd={restart} />;
};

/**
 * The output button shows when it has somewhere to send its press; the stage has no speakers to
 * pick from, so the press does nothing, as an app without a route picker would.
 */
const pickOutput = () => undefined;

/** The first sample track playing, 38 s in, with working pause and skip, and the output button. */
const NowPlayingDriver = ({ id = REAL_IDS["now-playing"] }: { id?: string }) => {
  const { playlist, startAt } = nowPlayingSample;
  const [index, setIndex] = useState(0);
  const [playback, setPlayback] = useState<PlaybackState>(() => ({ kind: "playing", startedAt: Date.now() - startAt }));
  const track = playlist[index % playlist.length] ?? playlist[0];
  const go = (step: number) => {
    setIndex((at) => (at + step + playlist.length) % playlist.length);
    setPlayback({ kind: "playing", startedAt: Date.now() });
  };
  const toggle = () =>
    setPlayback((current) =>
      current.kind === "playing" ? { kind: "paused", position: Date.now() - current.startedAt } : { kind: "playing", startedAt: Date.now() - current.position },
    );
  return (
    <NowPlayingActivity
      id={id}
      title={track.title}
      artist={track.artist}
      duration={track.duration}
      artwork={track.artwork}
      accent={track.accent}
      playback={playback}
      onToggle={toggle}
      onNext={() => go(1)}
      onPrevious={() => go(-1)}
      onOutput={pickOutput}
    />
  );
};

/** Rings until answered or declined; the call preset opens itself while it rings. */
const CallDriver = ({ onDismiss }: DriverProps) => {
  const [state, setState] = useState<CallState>({ kind: "ringing" });
  return (
    <CallActivity
      id={REAL_IDS["incoming-call"]}
      caller={callSample.caller}
      subtitle={callSample.subtitle}
      avatar={callSample.avatar}
      state={state}
      onAccept={() => setState({ kind: "active", since: Date.now() })}
      onDecline={onDismiss}
    />
  );
};

/** The ride with its driver, plate and car, and the Message capsule, which the stage has no one to send to. */
const EtaDriver = () => {
  const [arrivesAt] = useState(() => Date.now() + etaSample.minutes * 60_000);
  const { title, driverName, plate, vehicle } = etaSample.ride;
  return <EtaActivity id={REAL_IDS.eta} arrivesAt={arrivesAt} title={title} driverName={driverName} plate={plate} vehicle={vehicle} onContact={() => undefined} />;
};

/** Stop only, no pause: the voice recorder's row has none, so the stage matches it. */
const RecordingDriver = ({ onDismiss }: DriverProps) => {
  const [state] = useState<RecordingState>(() => ({ kind: "recording", since: Date.now() - recordingSample.elapsed }));
  return <RecordingActivity id={REAL_IDS.recording} state={state} onStop={onDismiss} />;
};

const TransferDriver = ({ onDismiss }: DriverProps) => {
  const progress = useCreep(transferSample.still, 0.96, 0.01);
  return (
    <NearbyTransferActivity
      id={REAL_IDS.transfer}
      deviceName={transferSample.deviceName}
      device="laptop"
      itemName={transferSample.itemName}
      src={transferSample.src}
      progress={progress}
      onCancel={onDismiss}
    />
  );
};

/**
 * Plugged in: the charging pill appears, its battery fills to the level, it holds and it goes, as on
 * a phone. Show plugs in again. Leaving ends the stage's activity, as Dismiss would.
 */
const BatteryDriver = ({ onDismiss }: DriverProps) => (
  <BatteryActivity
    id={REAL_IDS.battery}
    level={batterySample.level}
    charging
    timeToFull={(1 - batterySample.level) * batterySample.fullCharge * 60_000}
    dismissAfter={chargingIndicatorHold}
    onDismiss={onDismiss}
  />
);

/** The split's timer: the timer preset's own name and 4:32 left, as the split example starts it. */
const SplitTimerDriver = ({ onDismiss }: DriverProps) => <TimerDriver id={REAL_IDS.split} minutes={4 + 32 / 60} label="Timer" priority={1} onDismiss={onDismiss} />;

const DRIVERS = {
  upload: UploadDriver,
  timer: TimerDriver,
  "now-playing": () => <NowPlayingDriver />,
  "incoming-call": CallDriver,
  eta: EtaDriver,
  recording: RecordingDriver,
  transfer: TransferDriver,
  battery: BatteryDriver,
  split: SplitTimerDriver,
} as const satisfies Record<PresetSlug, (props: DriverProps) => ReactNode>;

/** The second activity a split shows beside `slug`: music, or a timer beside music, as the rebuild pairs them. */
const Companion = ({ slug, onDismiss }: { slug: PresetSlug; onDismiss: () => void }) =>
  slug === "now-playing" ? <TimerDriver id={COMPANION_ID} onDismiss={onDismiss} /> : <NowPlayingDriver id={COMPANION_ID} />;

interface RealPresetProps {
  /** Which preset plays. Required. */
  slug: PresetSlug;
  /** The first activity is up. Required. */
  shown: boolean;
  /** The second activity is up beside it, splitting the island. Required. */
  second: boolean;
  /** The first activity ended itself (Cancel, Decline, Stop). Required. */
  onDismiss: () => void;
  /** The second activity ended itself. Required. */
  onDismissSecond: () => void;
}

/**
 * Mounts the preset inside the stage's provider. Swapping `slug` unmounts one preset and mounts the
 * next in the same commit, so the engine ends one activity and starts the other in one frame and
 * morphs the pill, as the region rebuild's swap does.
 */
export const RealPreset = ({ slug, shown, second, onDismiss, onDismissSecond }: RealPresetProps) => {
  const Driver = DRIVERS[slug];
  return (
    <>
      {shown ? <Driver key={slug} onDismiss={onDismiss} /> : null}
      {/* The charging pill leaving by itself doesn't stop the music beside it, as on a phone; Show plugs in again beside it. */}
      {second && (shown || slug === "battery") ? <Companion key={`${slug}-second`} slug={slug} onDismiss={onDismissSecond} /> : null}
    </>
  );
};

/*
 * What the code panel shows for an untouched preset: the preset's own component, mounted the way
 * an app would. Short on purpose; the preset's docs page carries every prop.
 */
const USAGE_BODY = {
  upload: {
    imports: "UploadActivity",
    from: "upload-activity",
    body: `<UploadActivity
  fileName="mochi-asleep.jpg"
  src="/samples/mochi-asleep.jpg"
  progress={progress}
  totalBytes={6_000_000}
  destination="Family"
/>`,
  },
  timer: {
    imports: "TimerActivity",
    from: "timer-activity",
    body: `<TimerActivity state={{ kind: "running", endsAt }} duration={5 * 60_000} label="Pasta" onToggle={toggle} onCancel={cancel} />`,
  },
  "now-playing": {
    imports: "NowPlayingActivity",
    from: "now-playing-activity",
    body: `<NowPlayingActivity
  title="Saltwater Static"
  artist="The Lagoon Club"
  duration={214_000}
  artwork="/covers/saltwater-static.jpg"
  accent="#fea170"
  playback={{ kind: "playing", startedAt }}
  onToggle={toggle}
  onPrevious={previous}
  onNext={next}
  onOutput={pickOutput}
/>`,
  },
  "incoming-call": {
    imports: "CallActivity",
    from: "call-activity",
    body: `<CallActivity
  caller="Mochi's sitter"
  subtitle="mobile"
  avatar="/callers/mochi.jpg"
  state={{ kind: "ringing" }}
  onAccept={accept}
  onDecline={decline}
/>`,
  },
  eta: {
    imports: "EtaActivity",
    from: "eta-activity",
    body: `<EtaActivity
  arrivesAt={arrivesAt}
  title="Driver is on the way"
  driverName="Kofi A."
  plate="7KXR482"
  vehicle="Silver estate"
  onContact={message}
/>`,
  },
  recording: {
    imports: "RecordingActivity",
    from: "recording-activity",
    body: `<RecordingActivity state={{ kind: "recording", since }} onStop={stop} />`,
  },
  transfer: {
    imports: "NearbyTransferActivity",
    from: "nearby-transfer-activity",
    body: `<NearbyTransferActivity
  deviceName="Maya's Laptop"
  device="laptop"
  itemName="biscuit-in-the-sun.jpg"
  src="/samples/biscuit-in-the-sun.jpg"
  progress={progress}
  onCancel={cancel}
/>`,
  },
  battery: {
    imports: "BatteryActivity, chargingIndicatorHold",
    from: "battery-activity",
    body: `// Mount it when power connects: it shows for a moment and goes, as the charging indicator does.
<BatteryActivity level={0.42} charging timeToFull={48 * 60_000} dismissAfter={chargingIndicatorHold} />`,
  },
  split: {
    imports: "NowPlayingActivity, TimerActivity",
    from: "",
    body: `// Two activities at once split the island; the higher priority keeps the pill.
<TimerActivity priority={1} state={{ kind: "running", endsAt }} duration={8 * 60_000} />
<NowPlayingActivity title="Saltwater Static" artist="The Lagoon Club" duration={214_000} playback={playback} />`,
  },
} as const satisfies Record<PresetSlug, { imports: string; from: string; body: string }>;

/** The usage snippet for an untouched preset: its import, then the component inside the app's provider. */
export const presetUsage = (slug: PresetSlug): string => {
  const usage = USAGE_BODY[slug];
  const imports =
    slug === "split"
      ? `import { NowPlayingActivity } from "@/components/islandcn/now-playing-activity";\nimport { TimerActivity } from "@/components/islandcn/timer-activity";`
      : `import { ${usage.imports} } from "@/components/islandcn/${usage.from}";`;
  return `${imports}

// Anywhere inside <IslandProvider>, with <Island /> mounted once:
${usage.body}
`;
};
