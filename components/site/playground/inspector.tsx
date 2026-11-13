"use client";

import { type ReactNode, useState } from "react";

import type { ShapeTransition } from "@/lib/island";
import { islandAccent } from "@/components/islandcn/theme";
import { cn } from "@/components/site/cn";
import { PRESETS } from "@/constants/presets";

import { type ActivityNames, accentColor } from "./activity";
import { Disclosure, Field, Section, Segmented, Select, Slider, TextField, fieldButton, hintClass, labelClass, textButton } from "./controls";
import { isStarterKey,
  ACCENT_NAMES,
  type ActivitySpec,
  type Build,
  type Content,
  type Region,
  type ActivityStarter,
  type StarterKey,
  type TimerMode,
  REGION_INFO,
  REGIONS,
  SAMPLE_IDS,
  SAMPLE_TEXTS,
  artSeed,
  toActivityId,
  usesProgress,
  usesTimer,
} from "./model";
import { DEFAULT_SPRINGS, SPRING_RANGE, type Springs, TRANSITIONS, TRANSITION_HINTS, TRANSITION_LABEL, changedSprings, measuredSpring } from "./motion";
import { RegionEditor, RegionMap } from "./region-editor";
import { SecondPicker } from "./second-picker";
import type { Slot } from "./runtime";

/*
 * The inspector leads with what a visitor came to change: where to start and
 * what the island shows. The words a developer needs (the activity's id, its
 * spoken label, spring numbers) sit in closed sections further down.
 */

const STARTERS: readonly { value: StarterKey; label: string }[] = [
  { value: "blank", label: "Blank activity" },
  ...PRESETS.flatMap((preset) => (isStarterKey(preset.slug) ? [{ value: preset.slug, label: preset.title }] : [])),
];

const TIMER_MODES = [
  { value: "countdown", label: "Counts down" },
  { value: "elapsed", label: "Counts up" },
] as const satisfies readonly { value: TimerMode; label: string }[];

const formatSeconds = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const ACCENT_LABEL = {
  blue: "Blue",
  green: "Green",
  orange: "Orange",
  red: "Red",
  pink: "Pink",
  purple: "Purple",
  yellow: "Yellow",
  sky: "Sky",
  lagoon: "Lagoon",
} as const satisfies Record<(typeof ACCENT_NAMES)[number], string>;

/**
 * The named accents, and "Art" (the cover's own colour) when the activity shows artwork. Picking
 * art away leaves an "art" accent blue, so the swatch stays while it is the choice.
 */
const AccentPicker = ({ activity, onChange }: { activity: ActivitySpec; onChange: (accent: ActivitySpec["accent"]) => void }) => {
  const value = activity.accent;
  const choices: readonly { name: ActivitySpec["accent"]; label: string; color: string }[] = [
    ...(artSeed(activity) !== null || value === "art" ? [{ name: "art" as const, label: "From the art", color: accentColor({ ...activity, accent: "art" }) }] : []),
    ...ACCENT_NAMES.map((name) => ({ name, label: ACCENT_LABEL[name], color: islandAccent[name] })),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={labelClass}>Accent</span>
      {/*
       * One row of equal columns, each at most a 32 px target: ten swatches (the art one and nine
       * named) would wrap the tenth onto a row of its own in a 310 px phone column.
       */}
      <div
        role="radiogroup"
        aria-label="Accent"
        className="-mx-1 grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 32px))` }}
      >
        {choices.map(({ name, label, color }) => {
          const checked = value === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={label}
              title={label}
              onClick={() => onChange(name)}
              className="grid h-8 w-full cursor-pointer place-items-center rounded-full outline-offset-0 transition-[scale] duration-150 ease-out active:scale-[0.96]"
            >
              <span
                className="grid size-[22px] place-items-center rounded-full transition-[box-shadow] duration-150 ease-out"
                style={{
                  background: color,
                  boxShadow: checked ? `0 0 0 2px var(--site-panel), 0 0 0 4px ${color}` : "inset 0 0 0 1px rgb(0 0 0 / 0.08)",
                }}
              >
                {/* The art swatch says where its colour comes from. */}
                {name === "art" ? <span aria-hidden className="size-[9px] rounded-[2px] bg-black/45" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface ActivityValuesProps {
  activity: ActivitySpec;
  onChange: (patch: Partial<ActivitySpec>) => void;
}

/** Does any region draw a battery? Its progress reads as a charge, not a task's progress. */
const showsBattery = (activity: ActivitySpec) => REGIONS.some((region) => activity.regions[region].kind === "battery");

/** The value the basics offer: progress when a region reads it, else the timer, else none. */
export const mainValueOf = (activity: ActivitySpec): "progress" | "timer" | null => (usesProgress(activity) ? "progress" : usesTimer(activity) ? "timer" : null);

const ProgressSlider = ({ activity, onChange }: ActivityValuesProps) => (
  <Slider
    label={showsBattery(activity) ? "Charge" : "Progress"}
    value={activity.progress}
    display={`${Math.round(activity.progress * 100)}%`}
    min={0}
    max={1}
    step={0.01}
    onChange={(value) => onChange({ progress: value })}
  />
);

const TimerSlider = ({ activity, onChange }: ActivityValuesProps) => (
  <Slider
    label={activity.timer.mode === "countdown" ? "Time left" : "Running for"}
    value={activity.timer.seconds}
    display={formatSeconds(activity.timer.seconds)}
    min={0}
    max={3600}
    step={15}
    onChange={(seconds) => onChange({ timer: { ...activity.timer, seconds } })}
  />
);

/** The accent, as the basics show it. */
export const ActivityAccent = ({ activity, onChange }: ActivityValuesProps) => <AccentPicker activity={activity} onChange={(accent) => onChange({ accent })} />;

/** The one value the island moves with, as the basics show it: progress or the timer's time. Null when it reads neither. */
export const MainValue = ({ activity, onChange }: ActivityValuesProps) => {
  const main = mainValueOf(activity);
  if (main === "progress") return <ProgressSlider activity={activity} onChange={onChange} />;
  if (main === "timer") return <TimerSlider activity={activity} onChange={onChange} />;
  return null;
};

/**
 * The timer's direction, and its time when the basics already show progress (a build can read both).
 * Null when no region reads the timer.
 */
export const TimerSettings = ({ activity, onChange }: ActivityValuesProps) => {
  if (!usesTimer(activity)) return null;
  // A rule above it: it belongs to the whole activity, not to the region edited just above.
  return (
    <div className="flex min-w-0 flex-col gap-4 border-t border-site-line pt-4">
      <Field label="Timer">
        <Segmented label="Timer" options={TIMER_MODES} value={activity.timer.mode} onChange={(mode) => onChange({ timer: { ...activity.timer, mode } })} />
      </Field>
      {mainValueOf(activity) === "timer" ? null : <TimerSlider activity={activity} onChange={onChange} />}
    </div>
  );
};

interface ActivityDetailsProps {
  activity: ActivitySpec;
  onChange: (patch: Partial<ActivitySpec>) => void;
  /** The other activity's id, which this one can't take. Null without a second activity. */
  otherId: string | null;
  /** The names the generated code gives this activity. */
  names: ActivityNames;
}

/** The id the code and the engine know the activity by, and what a screen reader says. */
export const ActivityDetails = ({ activity, onChange, otherId, names }: ActivityDetailsProps) => {
  const plain = `use${pascalOf(activity.id)}Activity`;
  const renamed = names.hook !== plain;
  return (
    <>
      <TextField
        label="Activity id"
        value={activity.id}
        samples={SAMPLE_IDS}
        max={24}
        mono
        invalid={renamed}
        onChange={(value) => {
          const id = value === "" ? "custom" : toActivityId(value);
          onChange({ id: id === otherId ? `${id}-2` : id });
        }}
        // Dashes are fine while typing (`now-` on the way to `now-playing`); a trailing one is tidied away after.
        onCommit={(value) => {
          const tidy = toActivityId(value.replace(/-+$/, "")).replace(/-+$/, "");
          const id = tidy === "" ? "custom" : tidy;
          if (id !== activity.id) onChange({ id: id === otherId ? `${id}-2` : id });
        }}
        hint={
          renamed ? (
            <>
              <code className="font-mono text-site-ink">{plain}</code> is already taken in the file, so the code calls this one{" "}
              <code className="font-mono text-site-ink">{names.hook}</code>. Pick a different id to keep it plain.
            </>
          ) : (
            <>
              Lowercase letters, digits and dashes. The code calls its hook <code className="font-mono text-site-ink">{names.hook}</code>.
            </>
          )
        }
      />
      <TextField label="Spoken label" value={activity.label} max={80} samples={SAMPLE_TEXTS} onChange={(label) => onChange({ label, labelWords: "" })} hint="What a screen reader says when the activity starts or changes." />
      {/* Only a build that reads the progress reaches 100%, so only it gets words for then. */}
      {usesProgress(activity) ? (
        <TextField
          label="Spoken label when done"
          value={activity.doneLabel ?? ""}
          max={80}
          placeholder="Same as the label"
          samples={SAMPLE_TEXTS}
          onChange={(doneLabel) => onChange({ doneLabel, doneLabelWords: "" })}
          hint="What a screen reader says once the progress reaches 100%."
        />
      ) : null}
    </>
  );
};

/** `now-playing` to `NowPlaying`, as the hook name would read without a clash. */
const pascalOf = (id: string) =>
  id
    .split("-")
    .filter((part) => part !== "")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("") || "Activity";

export const StartFrom = ({ value, onChange }: { value: StarterKey; onChange: (key: StarterKey) => void }) => (
  <div className="-mt-1 flex flex-col gap-1.5">
    <Select label="Start from" hideLabel options={STARTERS} value={value} onChange={onChange} />
    <p className={hintClass}>Every preset is rebuilt from regions you can edit. Picking one replaces what you have.</p>
  </div>
);

interface ActivitySwitchProps {
  /** Display names, matching the generated hooks. Required. */
  labels: { primary: string; second: string };
  selected: Slot;
  onSelect: (slot: Slot) => void;
}

/** Which of two activities the panel edits. Only a build with a second activity has one. */
export const ActivitySwitch = ({ labels, selected, onSelect }: ActivitySwitchProps) => (
  <Segmented
    label="Editing"
    options={[
      { value: "primary", label: labels.primary },
      { value: "second", label: labels.second },
    ]}
    value={selected}
    onChange={onSelect}
  />
);

interface SecondActivityProps {
  build: Build;
  /** The second activity's display name, or null without one. */
  second: string | null;
  /** The preset offered first for a second activity. */
  suggested: ActivityStarter;
  onAdd: (key: ActivityStarter) => void;
  onRemove: () => void;
}

/** Adds a second activity, which splits the island, or removes it. */
export const SecondActivity = ({ build, second, suggested, onAdd, onRemove }: SecondActivityProps) => {
  const [picking, setPicking] = useState(false);
  if (build.second !== null && second !== null)
    return (
      <button type="button" className={cn(textButton, "-mr-2 max-w-[60%]")} onClick={onRemove} aria-label={`Remove ${second}`}>
        <span className="truncate">Remove {second}</span>
      </button>
    );
  return (
    <div className="relative -mr-2 flex-none">
      <button type="button" className={textButton} aria-haspopup="menu" aria-expanded={picking} data-second-trigger="" onClick={() => setPicking((open) => !open)}>
        <PlusGlyph />
        Second activity
      </button>
      {picking ? (
        <SecondPicker
          suggested={suggested}
          onClose={() => setPicking(false)}
          onPick={(key) => {
            setPicking(false);
            onAdd(key);
          }}
        />
      ) : null}
    </div>
  );
};

const PlusGlyph = () => (
  <svg aria-hidden width="11" height="11" viewBox="0 0 11 11" fill="none" className="-ml-0.5">
    <path d="M5.5 1.5v8M1.5 5.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const RegionsSection = ({
  activity,
  region,
  onRegion,
  onContent,
  action,
  children,
}: {
  activity: ActivitySpec;
  region: Region;
  onRegion: (region: Region) => void;
  onContent: (region: Region, content: Content) => void;
  /** A control at the heading's end (the second activity's). Defaults to none. */
  action?: ReactNode;
  /** More settings under the region editor (the timer's). Defaults to none. */
  children?: ReactNode;
}) => {
  const info = REGION_INFO[region];
  const where = info.group === "minimal" ? "Split bubble" : `${info.group === "compact" ? "Compact" : "Expanded"} ${info.label.toLowerCase()}`;
  return (
    <Section title="Layout" description="Press a part of the island to choose what it shows." action={action}>
      <RegionMap activity={activity} selected={region} onSelect={onRegion} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] leading-[18px] font-semibold text-site-ink">{where}</p>
          {info.group === "minimal" ? (
            <p className={hintClass}>
              With two activities, the second one moves into a bubble beside the pill, about 62 pt wide. It keeps its compact pair
              there unless you pick one thing here for it to show alone.
            </p>
          ) : null}
        </div>
        <RegionEditor key={`${activity.id}-${region}`} region={region} content={activity.regions[region]} onChange={(content) => onContent(region, content)} />
      </div>
      {children}
    </Section>
  );
};

export const MotionSection = ({
  springs,
  editing,
  onEditing,
  onSprings,
  onPlay,
}: {
  springs: Springs;
  editing: ShapeTransition;
  onEditing: (transition: ShapeTransition) => void;
  onSprings: (springs: Springs) => void;
  onPlay: (transition: ShapeTransition) => void;
}) => {
  const spring = springs[editing];
  const measured = measuredSpring(editing);
  const changed = changedSprings(springs);
  const options = TRANSITIONS.map((transition) => ({ value: transition, label: `${TRANSITION_LABEL[transition]}${changed.includes(transition) ? " (changed)" : ""}` }));
  const set = (patch: Partial<typeof spring>) => onSprings({ ...springs, [editing]: { ...spring, ...patch } });
  return (
    <Disclosure title="Motion" summary={changed.length === 0 ? "Measured springs" : `${changed.length} changed`}>
      <p className={hintClass}>
        Each shape change runs a spring, fitted to the simulator. Play one, tune its response and damping, and the copied code carries your values.
      </p>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Select label="Transition" options={options} value={editing} onChange={onEditing} />
        </div>
        <button
          type="button"
          disabled={editing === "resize"}
          title={editing === "resize" ? "Resize plays when content changes size; edit a text region to see it" : `Play ${TRANSITION_LABEL[editing].toLowerCase()}`}
          onClick={() => onPlay(editing)}
          className="inline-flex h-8 flex-none cursor-pointer items-center rounded-[8px] bg-site-ink px-3.5 text-[13px] font-medium text-site-bg outline-offset-1 transition-[opacity,scale] duration-150 ease-out hover:opacity-90 active:scale-[0.96] disabled:cursor-default disabled:opacity-35 disabled:active:scale-100"
        >
          Play
        </button>
      </div>
      <p className={cn(hintClass, "-mt-2")}>{editing === "resize" ? `${TRANSITION_HINTS.resize} Edit a text region to see it.` : TRANSITION_HINTS[editing]}</p>
      <Slider label="Response" value={spring.response} display={`${spring.response.toFixed(2)} s`} {...SPRING_RANGE.response} onChange={(response) => set({ response })} />
      <Slider
        label="Damping fraction"
        value={spring.dampingFraction}
        display={spring.dampingFraction.toFixed(2)}
        {...SPRING_RANGE.dampingFraction}
        onChange={(dampingFraction) => set({ dampingFraction })}
      />
      <div className={cn(hintClass, "-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums")}>
        <span>
          Default {DEFAULT_SPRINGS[editing].response} s, {DEFAULT_SPRINGS[editing].dampingFraction}
        </span>
        {measured ? (
          <span>
            Simulator {measured.response} s, {measured.dampingFraction}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {measured ? (
          <button type="button" className={fieldButton} onClick={() => onSprings({ ...springs, [editing]: { ...measured } })}>
            Use the simulator&rsquo;s
          </button>
        ) : null}
        <button type="button" className={fieldButton} disabled={!changed.includes(editing)} onClick={() => onSprings({ ...springs, [editing]: { ...DEFAULT_SPRINGS[editing] } })}>
          Reset {TRANSITION_LABEL[editing].toLowerCase()}
        </button>
        <button type="button" className={textButton} disabled={changed.length === 0} onClick={() => onSprings(DEFAULT_SPRINGS)}>
          Reset all
        </button>
      </div>
    </Disclosure>
  );
};
