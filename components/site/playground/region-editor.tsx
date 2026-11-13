"use client";

import { cn } from "@/components/site/cn";

import { accentColor } from "./activity";
import { IconArt } from "./content";
import { Field, IconPicker, Segmented, Select, TextField, fieldButton, hintClass, textButton } from "./controls";
import {
  type ActivitySpec,
  type ButtonAction,
  type ButtonSpec,
  type ButtonTone,
  type CaptionSpec,
  type Content,
  type ContentKind,
  KIND_LABEL,
  type PhotoChoice,
  type ShareMarkName,
  MAX_BUTTONS,
  REGION_INFO,
  type Region,
  type TimerFormat,
  type Tone,
  SAMPLE_TEXTS,
  defaultButton,
  defaultContent,
  kindsFor,
} from "./model";

/*
 * The region map is the inspector's index: a drawing of the island's regions,
 * in the island's own black, that you press to pick what to edit. The editor
 * under it changes the picked region.
 */

const ZONE =
  "relative flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-[inherit] px-1.5 text-[11px] font-medium text-white/55 transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-white/[0.08] hover:text-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-focus";

/** A one-glance summary of a region's content for the map. `tight` fits the minimal bubble: an icon or a dot. */
const ZoneLabel = ({ content, tight }: { content: Content; tight: boolean }) => {
  const icon =
    content.kind === "glyph" || content.kind === "tile" || content.kind === "ring" || content.kind === "vehicle" || content.kind === "device"
      ? content.icon
      : content.kind === "route"
        ? content.vehicle
        : null;
  if (icon !== null) {
    return <IconArt name={icon} size={14} />;
  }
  // An empty bubble isn't empty: it shows the compact pair, so it draws as a pair of dots.
  if (tight)
    return content.kind === "none" ? (
      <span className="flex items-center gap-[3px]">
        <span className="size-[7px] rounded-full bg-current" />
        <span className="h-[3px] w-[5px] rounded-full bg-current" />
      </span>
    ) : (
      <span className="size-2 rounded-full bg-current" />
    );
  switch (content.kind) {
    case "none":
      return <span className="text-white/30">Empty</span>;
    // The kind, not the words in it: a Text region holding "Title" read as a Title region on the map.
    // The island beside the map already shows the words.
    case "text":
    case "value":
    case "label":
    case "status":
    case "clock":
    case "cancel":
      return <span className="truncate">{ZONE_WORD[content.kind]}</span>;
    case "buttons":
      // A word, not a count: "2 buttons" was cut to "2 butto..." in the narrow side zones.
      return <span className="truncate">{content.buttons.length === 1 ? "Button" : "Buttons"}</span>;
    case "glyph":
    case "tile":
    case "ring":
    case "route":
      return <span className="truncate">{content.kind === "ring" ? "Ring" : content.kind === "route" ? "Route" : "Icon"}</span>;
    case "title":
    case "percent":
    case "timer":
    case "spinner":
    case "meter":
    case "bar":
    case "readout":
    case "art":
    case "avatar":
    case "photo":
    case "device":
    case "media":
    case "share":
    case "dot":
    case "battery":
    case "scrubber":
    case "track":
    case "caller":
    case "player":
    case "wave":
    case "recorder":
    case "vehicle":
    case "driver":
    case "arrival":
      return <span className="truncate">{ZONE_WORD[content.kind]}</span>;
    default: {
      const exhaustive: never = content;
      return exhaustive;
    }
  }
};

const ZONE_WORD = {
  text: "Text",
  value: "Value",
  label: "Label",
  status: "Status",
  title: "Title",
  percent: "%",
  // A word, not a frozen "0:00": the island beside the map shows the live time.
  timer: "Timer",
  spinner: "Spinner",
  meter: "Meter",
  bar: "Bar",
  readout: "Progress",
  clock: "Time",
  cancel: "Cancel",
  art: "Art",
  avatar: "Avatar",
  photo: "Photo",
  device: "Device",
  media: "Sentence",
  share: "Ring",
  dot: "Dot",
  battery: "Battery",
  scrubber: "Scrubber",
  track: "Track",
  caller: "Caller",
  player: "Player",
  wave: "Wave",
  recorder: "Recorder",
  vehicle: "Vehicle",
  driver: "Driver",
  arrival: "Arrival",
} as const;

const Zone = ({
  region,
  activity,
  selected,
  onSelect,
  className,
}: {
  region: Region;
  activity: ActivitySpec;
  selected: Region;
  onSelect: (region: Region) => void;
  className?: string;
}) => {
  const info = REGION_INFO[region];
  const content = activity.regions[region];
  const active = selected === region;
  const group = info.group === "minimal" ? "Split bubble" : `${info.group === "compact" ? "Compact" : "Expanded"} ${info.label.toLowerCase()}`;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${group}: ${kindLabel(region, content.kind)}`}
      onClick={() => onSelect(region)}
      className={cn(ZONE, active ? "bg-white/[0.14] text-white" : "", className)}
      style={active ? { boxShadow: `inset 0 0 0 1.5px ${accentColor(activity)}` } : undefined}
    >
      <ZoneLabel content={content} tight={region === "minimal"} />
    </button>
  );
};

/** A kind's name in a region's menu: the bubble's "Empty" shows the compact pair, so it is named for that. */
const kindLabel = (region: Region, kind: ContentKind) => (region === "minimal" && kind === "none" ? "Compact pair" : KIND_LABEL[kind]);

/** The sensor, drawn so the map reads as the island and not as a form. */
const Sensor = ({ className }: { className?: string }) => <span aria-hidden className={cn("flex-none rounded-full bg-[#1c1c1e]", className)} />;

export const RegionMap = ({ activity, selected, onSelect }: { activity: ActivitySpec; selected: Region; onSelect: (region: Region) => void }) => (
  // Each row is whole or gone under the phone strip's foot (`data-settle-row`, settle.ts): a cut one left a lone caption in the gap.
  <div className="flex flex-col gap-4 rounded-[14px] bg-site-fill p-3">
    <div data-settle-row="" className="flex items-center gap-2">
      <span className="w-[68px] flex-none text-[12px] font-medium text-site-muted">Compact</span>
      <div className="flex h-9 min-w-0 flex-1 items-stretch gap-1 rounded-full bg-black p-1">
        <Zone region="compactLeading" activity={activity} selected={selected} onSelect={onSelect} className="flex-1 rounded-full" />
        <Sensor className="my-auto h-5 w-12" />
        <Zone region="compactTrailing" activity={activity} selected={selected} onSelect={onSelect} className="flex-1 rounded-full" />
      </div>
      {/* The bubble's caption hangs under it, so the compact row keeps its height and the circle has a name. */}
      <div className="relative flex-none">
        <div className="flex size-9 items-stretch rounded-full bg-black p-1">
          <Zone region="minimal" activity={activity} selected={selected} onSelect={onSelect} className="flex-1 rounded-full px-0" />
        </div>
        <span aria-hidden className="absolute top-full left-1/2 mt-0.5 -translate-x-1/2 text-[10px] leading-3 font-medium text-site-muted">
          Bubble
        </span>
      </div>
    </div>
    <div data-settle-row="" className="flex items-start gap-2">
      <span className="w-[68px] flex-none pt-2 text-[12px] font-medium text-site-muted">Expanded</span>
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_1.25fr_1fr] grid-rows-[auto_auto] gap-1 rounded-[22px] bg-black p-1.5">
        <Zone region="expandedLeading" activity={activity} selected={selected} onSelect={onSelect} className="row-span-1 h-12 rounded-[16px_8px_8px_8px]" />
        <div className="flex min-w-0 flex-col items-stretch gap-1">
          <Sensor className="mx-auto h-3 w-12" />
          <Zone region="expandedCenter" activity={activity} selected={selected} onSelect={onSelect} className="h-8 rounded-[8px]" />
        </div>
        <Zone region="expandedTrailing" activity={activity} selected={selected} onSelect={onSelect} className="h-12 rounded-[8px_16px_8px_8px]" />
        <Zone region="expandedBottom" activity={activity} selected={selected} onSelect={onSelect} className="col-span-3 h-9 rounded-[8px_8px_16px_16px]" />
      </div>
    </div>
  </div>
);

const TONE_OPTIONS = [
  { value: "accent", label: "Accent" },
  { value: "primary", label: "White" },
  { value: "secondary", label: "Grey" },
  { value: "caution", label: "Orange" },
] as const satisfies readonly { value: Tone; label: string }[];

const BUTTON_TONE_OPTIONS = [
  { value: "accent", label: "Filled" },
  { value: "neutral", label: "Plain" },
  { value: "tinted", label: "Tinted" },
  { value: "destructive", label: "Red" },
] as const satisfies readonly { value: ButtonTone; label: string }[];

const TIMER_FORMAT_OPTIONS = [
  { value: "clock", label: "Clock" },
  { value: "minutes", label: "Minutes" },
] as const satisfies readonly { value: TimerFormat; label: string }[];

const YES_NO = [
  { value: "yes", label: "Shown" },
  { value: "no", label: "Hidden" },
] as const satisfies readonly { value: "yes" | "no"; label: string }[];

const yesNo = (value: boolean) => (value ? "yes" : "no");

const LINES_OPTIONS = [
  { value: "1", label: "One line" },
  { value: "2", label: "Two lines" },
] as const satisfies readonly { value: "1" | "2"; label: string }[];

/** Which look a piece takes: the kit's own, or a preset's, where the preset draws its own (a cover, a call's buttons). */
const LOOK_OPTIONS = {
  art: [
    { value: "kit", label: "Tile" },
    { value: "preset", label: "Player cover" },
  ],
  avatar: [
    { value: "kit", label: "Beside a name" },
    { value: "preset", label: "Incoming call" },
  ],
  buttons: [
    { value: "kit", label: "Round" },
    { value: "preset", label: "Incoming call" },
  ],
  meter: [
    { value: "kit", label: "Kit" },
    { value: "preset", label: "Music player" },
  ],
  wide: [
    { value: "kit", label: "Fits its content" },
    { value: "preset", label: "Charging pill" },
  ],
} as const satisfies Record<string, readonly { value: "kit" | "preset"; label: string }[]>;

const look = (preset: boolean) => (preset ? "preset" : "kit");

/** A compact meter's bars: four, as the now-playing pill has, or three, which fits beside a glyph in the split's bubble. */
const BAR_OPTIONS = [
  { value: "4", label: "Four" },
  { value: "3", label: "Three" },
] as const satisfies readonly { value: "3" | "4"; label: string }[];

/** Where a status sits beside the sensor: level with controls under it, or in the label-led views' row. */
const STATUS_ROW_OPTIONS = [
  { value: "controls", label: "Over buttons" },
  { value: "row", label: "Label row" },
] as const satisfies readonly { value: "controls" | "row"; label: string }[];

/** What a title has under it: words you type, or the timer's clock time, as the timer preset's "Ends 3:16 PM". */
const UNDER_TITLE_OPTIONS = [
  { value: "text", label: "Subtitle" },
  { value: "time", label: "Timer's time" },
] as const satisfies readonly { value: "text" | "time"; label: string }[];

const CAPTION_PRESS_OPTIONS = [
  { value: "text", label: "Just text" },
  { value: "dismiss", label: "Ends the activity" },
  { value: "collapse", label: "Collapses the island" },
  { value: "none", label: "Your own action" },
] as const satisfies readonly { value: "text" | ButtonAction; label: string }[];

/** The line under a big value, and whether pressing it does something. */
const CaptionEditor = ({ caption, onChange }: { caption: CaptionSpec; onChange: (caption: CaptionSpec) => void }) => (
  <>
    <TextField samples={SAMPLE_TEXTS} label="Caption" value={caption.text} max={24} placeholder="None" onChange={(text) => onChange({ ...caption, text })} />
    {caption.text === "" ? null : (
      <Select
        label="When pressed"
        options={CAPTION_PRESS_OPTIONS}
        value={caption.press ?? "text"}
        onChange={(press) => onChange({ ...caption, press: press === "text" ? null : press })}
      />
    )}
  </>
);

/** The sample photos (made for the site), or none: a tile with a glyph. */
const PHOTO_OPTIONS = [
  { value: "mochi", label: "Mochi, asleep" },
  { value: "biscuit", label: "Biscuit, in the sun" },
  { value: "pepper", label: "Pepper, in a box" },
  { value: "none", label: "None" },
] as const satisfies readonly { value: PhotoChoice; label: string }[];

const SHARE_MARK_OPTIONS = [
  { value: "count", label: "The percentage" },
  { value: "stop", label: "A stop button" },
  { value: "up", label: "An arrow up (sending)" },
  { value: "down", label: "An arrow down (receiving)" },
  { value: "none", label: "Nothing" },
] as const satisfies readonly { value: ShareMarkName; label: string }[];

const ACTION_OPTIONS = [
  { value: "collapse", label: "Collapse the island" },
  { value: "dismiss", label: "End the activity" },
  { value: "none", label: "Your own action" },
] as const satisfies readonly { value: ButtonAction; label: string }[];

/** Two round buttons fit beside the sensor; the bottom row takes three. */
const maxButtons = (region: Region) => (REGION_INFO[region].size === "bottom" ? MAX_BUTTONS : 2);

const BOUND_HINT = {
  percent: "Shows the activity's progress as a number. Set it under Accent and values, or press Update. A caption such as “20 of 48 MB” counts along with it.",
  battery: "Fills with the activity's progress, as a charge level.",
  route: "The vehicle moves along with the activity's progress.",
  scrubber: "Plays from the activity's timer: set it to count up, from how far into the track it starts.",
  dot: "Pulses while recording, in the accent.",
  ring: "Fills with the activity's progress.",
  timer: "Counts with the activity's timer. Set it under Activity.",
  spinner: "Spins while the activity is shown.",
  meter: "Moves like a live audio level.",
  bar: "Fills with the activity's progress.",
  readout: "Shows the activity's progress as a large percentage over a bar. A detail such as “20 of 48 MB” counts along with it.",
  clock: "When the activity's countdown ends, such as an arrival, or when a count-up started, in the viewer's clock.",
  player: "Plays from the activity's timer: set it to count up, from how far into the track it starts. The buttons are yours to wire up.",
  wave: "Scrolls like a live recording, in the accent.",
  recorder: "Counts with the activity's timer, beside a stop button in a ring.",
  arrival: "“Arriving in 6 min” counts down with the activity's timer.",
} as const;

const ButtonsEditor = ({
  region,
  buttons,
  allowNone = false,
  onChange,
}: {
  region: Region;
  buttons: readonly ButtonSpec[];
  /** The scrubber's transport may have no buttons; a button region needs one. */
  allowNone?: boolean;
  onChange: (buttons: readonly ButtonSpec[]) => void;
}) => {
  const set = (index: number, patch: Partial<ButtonSpec>) => onChange(buttons.map((button, at) => (at === index ? { ...button, ...patch } : button)));
  const max = maxButtons(region);
  return (
    <div className="flex flex-col gap-2.5">
      {buttons.slice(0, max).map((button, index) => (
        <div key={index} className="flex flex-col gap-3.5 rounded-[12px] p-3.5 pt-2.5 shadow-[inset_0_0_0_1px_var(--site-line)]">
          <div className="-mr-1.5 flex h-7 items-center justify-between">
            <span className="text-[13px] font-semibold text-site-ink">Button {index + 1}</span>
            {buttons.length === 1 && !allowNone ? null : (
              <button type="button" className={textButton} onClick={() => onChange(buttons.filter((_, at) => at !== index))}>
                Remove
              </button>
            )}
          </div>
          <TextField samples={SAMPLE_TEXTS} label="Label" value={button.label} max={16} onChange={(label) => set(index, { label })} />
          <IconPicker label="Icon" value={button.icon} onChange={(icon) => (icon === null ? undefined : set(index, { icon }))} />
          <Field label="Style">
            <Segmented label="Style" options={BUTTON_TONE_OPTIONS} value={button.tone} onChange={(tone) => set(index, { tone })} />
          </Field>
          <Select label="When pressed" options={ACTION_OPTIONS} value={button.action} onChange={(action) => set(index, { action })} />
        </div>
      ))}
      {buttons.length < max ? (
        <button type="button" className={cn(fieldButton, "self-start")} onClick={() => onChange([...buttons, defaultButton()])}>
          Add a button
        </button>
      ) : (
        <p className={hintClass}>{max === 2 ? "Two buttons fit beside the sensor." : "Three buttons fill the bottom row."}</p>
      )}
    </div>
  );
};

export const RegionEditor = ({ region, content, onChange }: { region: Region; content: Content; onChange: (content: Content) => void }) => {
  const info = REGION_INFO[region];
  const kinds = kindsFor(region);
  const kindOptions = kinds.map((kind) => ({ value: kind, label: kindLabel(region, kind) }));
  const setKind = (kind: ContentKind) => {
    if (kind !== content.kind) onChange(defaultContent(kind, info.size));
  };

  const fields = (() => {
    switch (content.kind) {
      case "none":
        return (
          <p className={hintClass}>
            {region === "minimal"
              ? "The bubble shows the compact leading and trailing side by side. A countdown there reads in whole minutes; other long text ends in an ellipsis."
              : "Nothing draws here. Pick something to show."}
          </p>
        );
      case "glyph":
        return (
          <>
            <IconPicker label="Icon" value={content.icon} onChange={(icon) => (icon === null ? undefined : onChange({ ...content, icon }))} />
            <Field label="Colour">
              <Segmented label="Colour" options={TONE_OPTIONS} value={content.tone} onChange={(tone) => onChange({ ...content, tone })} />
            </Field>
          </>
        );
      case "tile":
      case "vehicle":
        return (
          <>
            <IconPicker label="Icon" value={content.icon} onChange={(icon) => (icon === null ? undefined : onChange({ ...content, icon }))} />
            {content.kind === "vehicle" ? <p className={hintClass}>Large in the accent, tight to the top corner, as a ride&rsquo;s car.</p> : null}
          </>
        );
      case "art":
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label="Cover from" value={content.seed} max={60} onChange={(seed) => onChange({ ...content, seed })} />
            {info.size === "side" ? (
              <Field label="Size">
                <Segmented label="Size" options={LOOK_OPTIONS.art} value={look(content.cover)} onChange={(value) => onChange({ ...content, cover: value === "preset" })} />
              </Field>
            ) : null}
            <p className={hintClass}>The cover is drawn from this text, a title and artist say. The Art accent takes its colour.</p>
          </>
        );
      case "avatar":
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label="Name" value={content.name} max={40} onChange={(name) => onChange({ ...content, name })} />
            {info.size === "side" ? (
              <Field label="Style">
                <Segmented label="Style" options={LOOK_OPTIONS.avatar} value={look(content.call)} onChange={(value) => onChange({ ...content, call: value === "preset" })} />
              </Field>
            ) : null}
            <p className={hintClass}>Initials come from the name. The sample caller keeps their contact photo; another name shows initials.</p>
          </>
        );
      case "photo":
        return (
          <>
            <Select label="Photo" options={PHOTO_OPTIONS} value={content.photo} onChange={(photo) => onChange({ ...content, photo })} />
            <p className={hintClass}>
              {info.size === "side" ? "50 pt out toward the corner, as the upload shows what it sends." : "What is being sent, as a posting app's compact shows it."} Your own image goes in the copied code&rsquo;s <code>src</code>.
            </p>
          </>
        );
      case "device":
        return (
          <>
            <IconPicker label="Device" value={content.icon} onChange={(icon) => (icon === null ? undefined : onChange({ ...content, icon }))} />
            {info.size === "side" ? <Select label="Photo on its corner" options={PHOTO_OPTIONS} value={content.photo} onChange={(photo) => onChange({ ...content, photo })} /> : null}
            <p className={hintClass}>Who a share goes to: the device in the accent{info.size === "side" ? ", with what is being sent on its corner" : ""}.</p>
          </>
        );
      case "media":
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label="Line above" value={content.subtitle} max={40} placeholder="None" onChange={(subtitle) => onChange({ ...content, subtitle })} />
            <TextField samples={SAMPLE_TEXTS} label="Detail after it" value={content.detail} max={24} placeholder="None" onChange={(detail) => onChange({ ...content, detail })} />
            <TextField samples={SAMPLE_TEXTS} label="Sentence" value={content.title} max={40} onChange={(title) => onChange({ ...content, title })} />
            <TextField
              samples={SAMPLE_TEXTS}
              label="Line above when done"
              value={content.doneSubtitle ?? ""}
              max={40}
              placeholder="Same as while it runs"
              onChange={(doneSubtitle) => onChange({ ...content, doneSubtitle })}
            />
            <TextField
              samples={SAMPLE_TEXTS}
              label="Sentence when done"
              value={content.doneTitle ?? ""}
              max={40}
              placeholder="Same as while it runs"
              onChange={(doneTitle) => onChange({ ...content, doneTitle })}
            />
            <p className={hintClass}>
              A grey line over a white sentence, beside a photo or a device. A detail such as &ldquo;2.5 of 6 MB&rdquo; counts along with the progress and reads &ldquo;6 MB&rdquo; at 100%, where
              the words for done, when set, take over.
            </p>
          </>
        );
      case "share":
        return (
          <>
            <Select label={info.size === "side" ? "In the ring" : "In the ring (the percentage only shows in compact)"} options={SHARE_MARK_OPTIONS} value={content.mark} onChange={(mark) => onChange({ ...content, mark })} />
            {content.mark === "stop" && info.size === "side" ? <Select label="Stop, when pressed" options={ACTION_OPTIONS} value={content.action} onChange={(action) => onChange({ ...content, action })} /> : null}
            <p className={hintClass}>Fills with the activity&rsquo;s progress and turns into a check at 100%.</p>
          </>
        );
      case "track":
      case "caller":
      case "driver": {
        const words = {
          track: { title: "Title", subtitle: "Artist", hint: "Both 16 pt beside the player's cover, as the music player sets them." },
          caller: { title: "Name", subtitle: "Line above", hint: "The kind of call in grey over the name, as an incoming call shows it." },
          driver: { title: "Name", subtitle: "Line under", hint: "Set to the trailing edge, the line under it in grey, such as a plate." },
        } as const;
        const word = words[content.kind];
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label={word.title} value={content.title} max={40} onChange={(title) => onChange({ ...content, title })} />
            <TextField samples={SAMPLE_TEXTS} label={word.subtitle} value={content.subtitle} max={40} placeholder="None" onChange={(subtitle) => onChange({ ...content, subtitle })} />
            <p className={hintClass}>{word.hint}</p>
          </>
        );
      }
      case "player":
        return (
          <>
            <TextField
              samples={SAMPLE_TEXTS}
              label="Track length in seconds"
              value={String(content.length)}
              max={5}
              onChange={(value) => {
                const length = Number.parseInt(value, 10);
                if (Number.isFinite(length) && length > 0) onChange({ ...content, length: Math.min(length, 24 * 3600) });
              }}
            />
            <Field label="Output button">
              <Segmented label="Output button" options={YES_NO} value={yesNo(content.output)} onChange={(value) => onChange({ ...content, output: value === "yes" })} />
            </Field>
            <p className={hintClass}>{BOUND_HINT.player}</p>
          </>
        );
      case "wave":
        return <p className={hintClass}>{BOUND_HINT.wave}</p>;
      case "recorder":
        return (
          <>
            <Select label="Stop, when pressed" options={ACTION_OPTIONS} value={content.action} onChange={(action) => onChange({ ...content, action })} />
            <p className={hintClass}>{BOUND_HINT.recorder}</p>
          </>
        );
      case "arrival":
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label="What is coming" value={content.text} max={24} placeholder="None" onChange={(text) => onChange({ ...content, text })} />
            <TextField samples={SAMPLE_TEXTS} label="Button" value={content.label} max={24} placeholder="None" onChange={(label) => onChange({ ...content, label })} />
            {content.label === "" ? null : <Select label="When pressed" options={ACTION_OPTIONS} value={content.action} onChange={(action) => onChange({ ...content, action })} />}
            <p className={hintClass}>{BOUND_HINT.arrival}</p>
          </>
        );
      case "dot":
        return <p className={hintClass}>{BOUND_HINT.dot}</p>;
      case "status":
        return (
          <>
            <IconPicker label="Icon" value={content.icon} allowNone onChange={(icon) => onChange({ ...content, icon })} />
            {content.icon === null ? null : (
              <Field label="Icon colour">
                <Segmented label="Icon colour" options={TONE_OPTIONS} value={content.iconTone} onChange={(iconTone) => onChange({ ...content, iconTone })} />
              </Field>
            )}
            <TextField samples={SAMPLE_TEXTS} label="Text" value={content.text} max={12} onChange={(text) => onChange({ ...content, text })} />
            <Field label="Colour">
              <Segmented label="Colour" options={TONE_OPTIONS} value={content.tone} onChange={(tone) => onChange({ ...content, tone })} />
            </Field>
            <Field label="Sits">
              <Segmented label="Sits" options={STATUS_ROW_OPTIONS} value={content.row ? "row" : "controls"} onChange={(sits) => onChange({ ...content, row: sits === "row" })} />
            </Field>
            <p className={hintClass}>
              {content.row
                ? "A smaller glyph and label in a row as tall as a small cancel button, as the upload's “Uploading”."
                : "Lined up with a row of buttons under it."}
            </p>
          </>
        );
      case "label":
        return <TextField samples={SAMPLE_TEXTS} label="Text" value={content.text} max={24} onChange={(text) => onChange({ ...content, text })} />;
      case "battery":
        return (
          <>
            <Field label="Charging bolt">
              <Segmented label="Charging bolt" options={YES_NO} value={yesNo(content.charging)} onChange={(value) => onChange({ ...content, charging: value === "yes" })} />
            </Field>
            {info.size === "compact" && region !== "minimal" ? (
              <Field label="Width">
                <Segmented label="Width" options={LOOK_OPTIONS.wide} value={look(content.wide)} onChange={(value) => onChange({ ...content, wide: value === "preset" })} />
              </Field>
            ) : null}
            {info.size === "compact" && !content.wide ? (
              <Field label="Percentage">
                <Segmented label="Percentage" options={YES_NO} value={yesNo(content.percent)} onChange={(value) => onChange({ ...content, percent: value === "yes" })} />
              </Field>
            ) : info.size === "compact" ? null : (
              <TextField samples={SAMPLE_TEXTS} label="Label beside it" value={content.label} max={12} placeholder="None" onChange={(label) => onChange({ ...content, label })} />
            )}
            <p className={hintClass}>{BOUND_HINT.battery}</p>
          </>
        );
      case "route":
        return (
          <>
            <IconPicker label="Vehicle" value={content.vehicle} onChange={(vehicle) => (vehicle === null ? undefined : onChange({ ...content, vehicle }))} />
            <IconPicker label="Destination" value={content.destination} onChange={(destination) => (destination === null ? undefined : onChange({ ...content, destination }))} />
            <TextField samples={SAMPLE_TEXTS} label="Headline" value={content.title} max={40} placeholder="None" onChange={(title) => onChange({ ...content, title })} />
            {content.title === "" ? null : (
              <TextField samples={SAMPLE_TEXTS} label="Details" value={content.subtitle} max={64} placeholder="None" onChange={(subtitle) => onChange({ ...content, subtitle })} />
            )}
            <p className={hintClass}>
              {content.title === ""
                ? BOUND_HINT.route
                : `${BOUND_HINT.route} The minutes left lead, from the activity's timer. The details' first part, before a “ · ”, shows in white, as a plate.`}
            </p>
          </>
        );
      case "scrubber":
        return (
          <>
            <TextField
              samples={SAMPLE_TEXTS}
              label="Track length in seconds"
              value={String(content.length)}
              max={5}
              onChange={(value) => {
                const length = Number.parseInt(value, 10);
                if (Number.isFinite(length) && length > 0) onChange({ ...content, length: Math.min(length, 24 * 3600) });
              }}
            />
            <p className={hintClass}>{BOUND_HINT.scrubber}</p>
            <ButtonsEditor region={region} buttons={content.buttons} allowNone onChange={(buttons) => onChange({ ...content, buttons })} />
          </>
        );
      case "text":
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label="Text" value={content.text} max={info.size === "compact" ? 12 : 40} onChange={(text) => onChange({ ...content, text })} />
            <Field label="Colour">
              <Segmented label="Colour" options={TONE_OPTIONS} value={content.tone} onChange={(tone) => onChange({ ...content, tone })} />
            </Field>
            {info.size === "compact" && region !== "minimal" ? (
              <Field label="Width">
                <Segmented label="Width" options={LOOK_OPTIONS.wide} value={look(content.wide)} onChange={(value) => onChange({ ...content, wide: value === "preset" })} />
              </Field>
            ) : null}
            {info.size === "side" && content.wide ? (
              <TextField samples={SAMPLE_TEXTS} label="Line under it" value={content.detail ?? ""} max={24} placeholder="None" onChange={(detail) => onChange({ ...content, detail })} />
            ) : null}
          </>
        );
      case "title":
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label="Title" value={content.title} max={40} onChange={(title) => onChange({ ...content, title })} />
            <Field label="Under it">
              <Segmented label="Under it" options={UNDER_TITLE_OPTIONS} value={content.end ? "time" : "text"} onChange={(under) => onChange({ ...content, end: under === "time" })} />
            </Field>
            {content.end ? (
              <p className={hintClass}>When a countdown ends (&ldquo;Ends 3:16 PM&rdquo;), or when a count-up started, in the viewer&rsquo;s clock.</p>
            ) : (
              <>
                <TextField samples={SAMPLE_TEXTS} label="Subtitle" value={content.subtitle} max={64} onChange={(subtitle) => onChange({ ...content, subtitle })} />
                <Field label="Subtitle wraps to">
                  <Segmented label="Subtitle wraps to" options={LINES_OPTIONS} value={content.lines === 2 ? "2" : "1"} onChange={(lines) => onChange({ ...content, lines: lines === "2" ? 2 : 1 })} />
                </Field>
              </>
            )}
          </>
        );
      case "value":
        return (
          <>
            <div className="grid grid-cols-[1fr_96px] gap-2">
              <TextField samples={SAMPLE_TEXTS} label="Value" value={content.text} max={6} onChange={(text) => onChange({ ...content, text })} />
              <TextField samples={SAMPLE_TEXTS} label="Unit" value={content.unit} max={4} onChange={(unit) => onChange({ ...content, unit })} />
            </div>
            <CaptionEditor caption={content.caption} onChange={(caption) => onChange({ ...content, caption })} />
          </>
        );
      case "ring":
        return (
          <>
            <IconPicker label="Icon inside" value={content.icon} allowNone onChange={(icon) => onChange({ ...content, icon })} />
            <p className={hintClass}>{BOUND_HINT.ring}</p>
          </>
        );
      case "bar":
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label="Caption" value={content.caption} max={40} placeholder="None" onChange={(caption) => onChange({ ...content, caption })} />
            <Field label="Cancel button">
              <Segmented label="Cancel button" options={YES_NO} value={yesNo(content.cancel)} onChange={(value) => onChange({ ...content, cancel: value === "yes" })} />
            </Field>
            <p className={hintClass}>{BOUND_HINT.bar}</p>
          </>
        );
      case "readout":
        return (
          <>
            <Field label="Percentage colour">
              <Segmented label="Percentage colour" options={TONE_OPTIONS} value={content.tone} onChange={(tone) => onChange({ ...content, tone })} />
            </Field>
            <TextField samples={SAMPLE_TEXTS} label="Detail" value={content.detail} max={24} placeholder="None" onChange={(detail) => onChange({ ...content, detail })} />
            <div className="grid grid-cols-3 gap-2">
              <TextField samples={SAMPLE_TEXTS} label="Before" value={content.before} max={16} placeholder="None" onChange={(before) => onChange({ ...content, before })} />
              <TextField samples={SAMPLE_TEXTS} label="Name" value={content.name} max={40} placeholder="None" onChange={(name) => onChange({ ...content, name })} />
              <TextField samples={SAMPLE_TEXTS} label="After" value={content.after} max={32} placeholder="None" onChange={(after) => onChange({ ...content, after })} />
            </div>
            <p className={hintClass}>{BOUND_HINT.readout} The line under it shows the name in white between the other two.</p>
          </>
        );
      case "cancel":
        return (
          <>
            <TextField samples={SAMPLE_TEXTS} label="Spoken label" value={content.label} max={40} onChange={(label) => onChange({ ...content, label })} />
            <Select label="When pressed" options={ACTION_OPTIONS} value={content.action} onChange={(action) => onChange({ ...content, action })} />
          </>
        );
      case "clock":
        return <p className={hintClass}>{BOUND_HINT.clock}</p>;
      case "percent":
        return (
          <>
            <p className={hintClass}>{BOUND_HINT.percent}</p>
            {info.size === "side" ? <CaptionEditor caption={content.caption} onChange={(caption) => onChange({ ...content, caption })} /> : null}
          </>
        );
      case "timer":
        return (
          <>
            <Field label="Reads">
              <Segmented label="Reads" options={TIMER_FORMAT_OPTIONS} value={content.format} onChange={(format) => onChange({ ...content, format })} />
            </Field>
            <Field label="Colour">
              <Segmented label="Colour" options={TONE_OPTIONS} value={content.tone} onChange={(tone) => onChange({ ...content, tone })} />
            </Field>
            <p className={hintClass}>{BOUND_HINT.timer}</p>
            {info.size === "side" ? (
              <>
                <Field label="When it ends, under it">
                  <Segmented label="When it ends, under it" options={YES_NO} value={yesNo(content.end)} onChange={(value) => onChange({ ...content, end: value === "yes" })} />
                </Field>
                {content.end ? <p className={hintClass}>Shows the clock time a countdown reaches zero, such as an arrival.</p> : <CaptionEditor caption={content.caption} onChange={(caption) => onChange({ ...content, caption })} />}
              </>
            ) : null}
          </>
        );
      case "spinner":
        return <p className={hintClass}>{BOUND_HINT[content.kind]}</p>;
      case "meter":
        return (
          <>
            {info.size === "bottom" ? null : (
              <Field label="Style">
                <Segmented label="Style" options={LOOK_OPTIONS.meter} value={look(content.player)} onChange={(value) => onChange({ ...content, player: value === "preset" })} />
              </Field>
            )}
            {info.size === "compact" && !content.player ? (
              <Field label="Bars">
                <Segmented label="Bars" options={BAR_OPTIONS} value={content.compactBars === 3 ? "3" : "4"} onChange={(bars) => onChange({ ...content, compactBars: bars === "3" ? 3 : 4 })} />
              </Field>
            ) : null}
            <p className={hintClass}>{BOUND_HINT[content.kind]}</p>
          </>
        );
      case "buttons":
        return (
          <>
            {info.size === "side" ? (
              <Field label="Style">
                <Segmented label="Style" options={LOOK_OPTIONS.buttons} value={look(content.call)} onChange={(value) => onChange({ ...content, call: value === "preset" })} />
              </Field>
            ) : null}
            <ButtonsEditor region={region} buttons={content.buttons} onChange={(buttons) => onChange({ ...content, buttons })} />
          </>
        );
      default: {
        const exhaustive: never = content;
        return exhaustive;
      }
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      <Select label="Shows" options={kindOptions} value={content.kind} onChange={setKind} />
      {fields}
    </div>
  );
};
