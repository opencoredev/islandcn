/*
 * What the playground builds: one or two activities, each a set of regions
 * filled from the islandcn content kit. Everything here is plain data, so it
 * can go in the URL, render on the stage and turn into source code from the
 * same value.
 */

import { islandAccent } from "@/components/islandcn/theme";
import type { PresetSlug } from "@/constants/presets";
import {
  batterySample,
  callSample,
  etaSample,
  nowPlayingSample,
  recordingSample,
  samplePhotos,
  timerSample,
  transferSample,
  uploadSample,
} from "@/examples/samples";

/** Icons the playground offers, by name, every one an islandcn glyph (see `ICONS` in content.tsx). Some names are older icon sets' names, kept so old links open. */
export const ICON_NAMES = [
  "Sparkle",
  "CloudArrowUp",
  "DownloadSimple",
  "ArrowUp",
  "Timer",
  "Alarm",
  "MusicNotes",
  "Headphones",
  "Phone",
  "PhoneDisconnect",
  "Car",
  "Package",
  "Bicycle",
  "MapPin",
  "ChatCircleDots",
  "Bell",
  "Microphone",
  "Record",
  "VideoCamera",
  "Monitor",
  "Laptop",
  "Lightning",
  "BatteryCharging",
  "Heart",
  "Coffee",
  "ForkKnife",
  "AirplaneTilt",
  "Check",
  "X",
  "Play",
  "Pause",
  "SkipBack",
  "SkipForward",
  "Stop",
  // islandcn glyphs with no older icon-set name, added after it so existing links keep their meaning.
  "Terminal",
  "Warning",
  "Search",
  "Globe",
  "Wrench",
  "Pencil",
  "Document",
  "CheckCircle",
  "House",
  "Tablet",
  "ScreenRecord",
  "GitMerge",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const isIconName = (value: string): value is IconName => ICON_NAMES.some((name) => name === value);

export type AccentName = keyof typeof islandAccent;

export const ACCENT_NAMES = ["blue", "green", "orange", "red", "pink", "purple", "yellow", "sky", "lagoon"] as const satisfies readonly AccentName[];

/**
 * An activity's accent: a named colour, or "art", the colour taken from its generated cover (the
 * way the now-playing preset tints its meter from the art). "art" needs an Artwork region; without
 * one it falls back to blue.
 */
export type AccentChoice = AccentName | "art";

export const isAccentName = (value: string): value is AccentName => ACCENT_NAMES.some((name) => name === value);
export const isAccentChoice = (value: string): value is AccentChoice => value === "art" || isAccentName(value);

/** Text colour inside the island: the activity's accent, white, the secondary grey, or orange for a warning. */
export const TONES = ["accent", "primary", "secondary", "caution"] as const;
export type Tone = (typeof TONES)[number];
export const isTone = (value: string): value is Tone => TONES.some((tone) => tone === value);

/** What a button in the island does when pressed. */
export const BUTTON_ACTIONS = ["collapse", "dismiss", "none"] as const;
export type ButtonAction = (typeof BUTTON_ACTIONS)[number];
export const isButtonAction = (value: string): value is ButtonAction => BUTTON_ACTIONS.some((action) => action === value);

/**
 * How a button is filled. "accent": the activity's colour, the action you expect (Accept, Stop).
 * "neutral": translucent white, the other choice. "tinted": a tint of the accent with the icon in
 * it, a control that changes the activity (a timer's pause). "destructive": red, an action that
 * ends something (Decline).
 */
export const BUTTON_TONES = ["accent", "neutral", "tinted", "destructive"] as const;
export type ButtonTone = (typeof BUTTON_TONES)[number];
export const isButtonTone = (value: string): value is ButtonTone => BUTTON_TONES.some((tone) => tone === value);

export interface ButtonSpec {
  readonly icon: IconName;
  /** Visible in the bottom row, spoken everywhere. */
  readonly label: string;
  readonly tone: ButtonTone;
  readonly action: ButtonAction;
}

/** The most buttons one region holds: three share the bottom row at the compact size. */
export const MAX_BUTTONS = 3;

/**
 * A short line under a big value, such as "20 of 48 MB" or a time. With `press` it is a one-word
 * action in the accent (a transfer's Cancel). Empty text shows none.
 */
export interface CaptionSpec {
  readonly text: string;
  readonly press: ButtonAction | null;
}

export const NO_CAPTION: CaptionSpec = { text: "", press: null };

/**
 * A photo the playground can show: one of the sample photos made for the site (the cats), or none,
 * a tile with a glyph. A choice, not a URL, so a shared link can't point the page at any image.
 */
export const PHOTOS = ["mochi", "biscuit", "pepper", "none"] as const;
export type PhotoChoice = (typeof PHOTOS)[number];
export const isPhotoChoice = (value: string): value is PhotoChoice => PHOTOS.some((photo) => photo === value);

/** The sample photo's file, or null for none. */
export const photoSource = (photo: PhotoChoice): { name: string; src: string } | null => (photo === "none" ? null : samplePhotos[photo]);

/** What a share ring holds while it runs (`ShareMark` in media-row.tsx): the percentage, a stop square, an arrow, or nothing. */
export const SHARE_MARKS = ["count", "stop", "up", "down", "none"] as const;
export type ShareMarkName = (typeof SHARE_MARKS)[number];
export const isShareMark = (value: string): value is ShareMarkName => SHARE_MARKS.some((mark) => mark === value);

/** How a timer reads: a clock ("4:07"), or whole minutes left ("6", "6 min" in compact). */
export const TIMER_FORMATS = ["clock", "minutes"] as const;
export type TimerFormat = (typeof TIMER_FORMATS)[number];
export const isTimerFormat = (value: string): value is TimerFormat => TIMER_FORMATS.some((format) => format === value);

/**
 * One region's content. `percent`, `ring`, `bar`, `readout`, `route` and `battery` read the
 * activity's progress; `timer`, `scrubber`, `clock` and a route's headline read its timer. That keeps an update to one value moving every
 * region that shows it, as a Live Activity's state does.
 */
export type Content =
  | { readonly kind: "none" }
  /** `tone` colours it: the accent, or white as a ride's compact car. */
  | { readonly kind: "glyph"; readonly icon: IconName; readonly tone: Tone }
  | { readonly kind: "tile"; readonly icon: IconName }
  /** `cover` draws it beside the sensor as the music player's 59.5 pt cover, set in toward the corner. */
  | { readonly kind: "art"; readonly seed: string; readonly cover: boolean }
  /** `call` draws it beside the sensor as the incoming call's 50 pt photo, out toward the corner. */
  | { readonly kind: "avatar"; readonly name: string; readonly call: boolean }
  /** A photo thumbnail: 24 pt in compact, 50 pt out toward the corner beside the sensor, as the upload's. */
  | { readonly kind: "photo"; readonly photo: PhotoChoice }
  /** A device in the accent, as a nearby transfer's (on a faint disc beside the sensor); there `photo` sits on its corner as a badge. */
  | { readonly kind: "device"; readonly icon: IconName; readonly photo: PhotoChoice }
  /**
   * A sharing activity's text beside its picture: a 14 pt grey line (`subtitle`, then `detail` after
   * a dot, which counts along with the progress when it reads "2.5 of 6 MB") over a 17 pt white
   * sentence (`title`), as the upload and the transfer set theirs. At 100% (`isDone`) a counting
   * detail reads as the total ("6 MB"), and `doneSubtitle` and `doneTitle`, when not empty, take
   * their lines' place ("Sent …", "Uploaded to …"): the visitor types these, the page never guesses a
   * verb from their words. Optional, so links made before them open unchanged.
   */
  | {
      readonly kind: "media";
      readonly subtitle: string;
      readonly detail: string;
      readonly title: string;
      readonly doneSubtitle?: string;
      readonly doneTitle?: string;
    }
  /**
   * A sharing activity's ring: 20 pt in compact, 48 pt beside the sensor, holding `mark` while it
   * runs and a check at 100%. With "stop", pressing it does `action`.
   */
  | { readonly kind: "share"; readonly mark: ShareMarkName; readonly action: ButtonAction }
  | { readonly kind: "dot" }
  /**
   * A glyph and a short label beside the sensor, such as a name or a status. Lined up with a row of
   * controls under it; with `row`, in the label-led views' 26 pt row instead (an 18 pt glyph and
   * 15 pt label, level with a small cancel), as the upload's "Uploading".
   */
  | { readonly kind: "status"; readonly icon: IconName | null; readonly iconTone: Tone; readonly text: string; readonly tone: Tone; readonly row: boolean }
  /**
   * `wide` sets it as the charging pill's "Charging": in compact it fills the widest slot with the
   * text in from the pill's end; beside the sensor it sits on the shortest island's middle row, with
   * `detail` (when set) as a grey line under it, as the battery preset's "Full in 55 min". Optional,
   * so links made before it open unchanged.
   */
  | { readonly kind: "text"; readonly text: string; readonly tone: Tone; readonly wide: boolean; readonly detail?: string }
  | { readonly kind: "label"; readonly text: string }
  /**
   * `end` puts the timer's clock time under the title in place of the subtitle: when a countdown ends
   * ("Ends 3:16 PM"), as the timer preset words it, or when a count-up started ("Started 3:16 PM").
   */
  | { readonly kind: "title"; readonly title: string; readonly subtitle: string; readonly lines: 1 | 2; readonly end: boolean }
  | { readonly kind: "value"; readonly text: string; readonly unit: string; readonly caption: CaptionSpec }
  | { readonly kind: "percent"; readonly caption: CaptionSpec }
  /** `end` puts the clock time a countdown ends at under it ("3:16 PM"), in place of the caption. */
  | { readonly kind: "timer"; readonly format: TimerFormat; readonly caption: CaptionSpec; readonly end: boolean; readonly tone: Tone }
  | { readonly kind: "ring"; readonly icon: IconName | null }
  | { readonly kind: "spinner" }
  /**
   * `compactBars` is how many bars the meter has where it is compact (beside the sensor, or in the
   * split's bubble): 4, as the now-playing preset's pill has, or 3, as the gallery's music companion.
   */
  /** `player` draws the music player's meter: six narrow bars, in the expanded view's top corner. */
  | { readonly kind: "meter"; readonly compactBars: 3 | 4; readonly player: boolean }
  /**
   * `label` puts a short grey word after the battery in the row beside the sensor ("Charging"), the
   * battery drawn at a label's size; empty, the battery shows alone at tile size.
   */
  /** `wide` draws the charging pill's percentage and battery: the widest slot in compact, the middle row beside the sensor. */
  | { readonly kind: "battery"; readonly charging: boolean; readonly percent: boolean; readonly label: string; readonly wide: boolean }
  | { readonly kind: "bar"; readonly caption: string; readonly cancel: boolean }
  /**
   * The progress views' bottom: the percentage large in `tone`, `detail` in grey on its baseline at
   * the right, a line naming what it is (`before`, `name` in white, `after`), then a thin bar. An
   * empty line shows none.
   */
  | { readonly kind: "readout"; readonly tone: Tone; readonly detail: string; readonly before: string; readonly name: string; readonly after: string }
  /**
   * A non-empty `title` leads with the minutes left, large, the title in grey on their baseline and
   * the subtitle under them (its first " · " part in white, a plate), as a ride's.
   */
  | { readonly kind: "route"; readonly vehicle: IconName; readonly destination: IconName; readonly title: string; readonly subtitle: string }
  /** A small round X in the row beside the sensor, the way an upload offers to stop. `label` is spoken. */
  | { readonly kind: "cancel"; readonly label: string; readonly action: ButtonAction }
  /** The clock time the activity's countdown ends at (a ride's arrival), or a count-up started, in grey beside the sensor. */
  | { readonly kind: "clock" }
  | { readonly kind: "scrubber"; readonly length: number; readonly buttons: readonly ButtonSpec[] }
  /** `call` draws two buttons beside the sensor as the incoming call's: 50 pt, in its measured red, out toward the corner. */
  | { readonly kind: "buttons"; readonly buttons: readonly ButtonSpec[]; readonly call: boolean }
  /** The music player's title and artist beside its cover, both 16 pt. */
  | { readonly kind: "track"; readonly title: string; readonly subtitle: string }
  /** The incoming call's text: a grey line (the kind of call) over the name. */
  | { readonly kind: "caller"; readonly title: string; readonly subtitle: string }
  /** The music player's bottom: times at the ends of a white scrubber, then previous, pause, next and, with `output`, the output button. */
  | { readonly kind: "player"; readonly length: number; readonly output: boolean }
  /** The voice recorder's waveform: thin bars in compact, a scrolling row with grey dots ahead of it beside the sensor. */
  | { readonly kind: "wave" }
  /** The voice recorder's large time and its stop button, concentric with the island's corner. */
  | { readonly kind: "recorder"; readonly action: ButtonAction }
  /** A vehicle large in the accent, tight to the top corner, as a ride's car. */
  | { readonly kind: "vehicle"; readonly icon: IconName }
  /** A ride's driver: the name, with a grey line such as the plate under it, set to the trailing edge. */
  | { readonly kind: "driver"; readonly title: string; readonly subtitle: string }
  /**
   * A ride's bottom: what is coming (`text`) and "Arriving in 6 min" from the timer, then, with a
   * `label`, a full-width tinted capsule such as "Message Kofi".
   */
  | { readonly kind: "arrival"; readonly text: string; readonly label: string; readonly action: ButtonAction };

export type ContentKind = Content["kind"];

export const REGIONS = [
  "compactLeading",
  "compactTrailing",
  "minimal",
  "expandedLeading",
  "expandedCenter",
  "expandedTrailing",
  "expandedBottom",
] as const;

export type Region = (typeof REGIONS)[number];

export const isRegion = (value: string): value is Region => REGIONS.some((region) => region === value);

/** How big a region draws its content. */
export type RegionSize = "compact" | "side" | "center" | "bottom";

export const REGION_INFO = {
  compactLeading: { label: "Leading", group: "compact", size: "compact" },
  compactTrailing: { label: "Trailing", group: "compact", size: "compact" },
  minimal: { label: "Bubble", group: "minimal", size: "compact" },
  expandedLeading: { label: "Leading", group: "expanded", size: "side" },
  expandedCenter: { label: "Center", group: "expanded", size: "center" },
  expandedTrailing: { label: "Trailing", group: "expanded", size: "side" },
  expandedBottom: { label: "Bottom", group: "expanded", size: "bottom" },
} as const satisfies Record<Region, { label: string; group: "compact" | "minimal" | "expanded"; size: RegionSize }>;

/** Which kinds fit each size. Order is the order of the menu. */
export const KINDS_BY_SIZE = {
  compact: ["none", "glyph", "art", "avatar", "photo", "device", "dot", "text", "percent", "timer", "ring", "share", "spinner", "meter", "wave", "battery"],
  side: ["none", "glyph", "tile", "art", "avatar", "photo", "device", "status", "text", "value", "percent", "timer", "clock", "ring", "share", "spinner", "meter", "wave", "recorder", "battery", "buttons", "cancel", "vehicle", "driver"],
  center: ["none", "title", "track", "caller", "media", "label", "text"],
  bottom: ["none", "readout", "bar", "route", "arrival", "scrubber", "player", "meter", "buttons", "title", "text"],
} as const satisfies Record<RegionSize, readonly ContentKind[]>;

export const KIND_LABEL = {
  none: "Empty",
  glyph: "Icon",
  tile: "Icon tile",
  art: "Artwork",
  avatar: "Avatar",
  photo: "Photo",
  device: "Device",
  media: "File and sentence",
  share: "Share ring",
  dot: "Recording dot",
  status: "Status beside the sensor",
  text: "Text",
  label: "Small label",
  title: "Title and subtitle",
  value: "Big value",
  percent: "Progress number",
  timer: "Timer",
  ring: "Progress ring",
  spinner: "Spinner",
  meter: "Level meter",
  battery: "Battery",
  bar: "Progress bar",
  readout: "Percentage, detail and bar",
  route: "Route",
  scrubber: "Scrubber and transport",
  buttons: "Buttons",
  cancel: "Small cancel button",
  clock: "Clock time",
  track: "Track and artist",
  caller: "Caller",
  player: "Player",
  wave: "Waveform",
  recorder: "Recorder time and stop",
  vehicle: "Vehicle in the corner",
  driver: "Driver and plate",
  arrival: "Arrival and message",
} as const satisfies Record<ContentKind, string>;

export const kindsFor = (region: Region): readonly ContentKind[] => KINDS_BY_SIZE[REGION_INFO[region].size];

/** A timer counts down from `seconds`, or counts up from `seconds` ago. */
export type TimerMode = "countdown" | "elapsed";
export const isTimerMode = (value: string): value is TimerMode => value === "countdown" || value === "elapsed";

export interface ActivitySpec {
  /** Activity id, also the name of the generated hook: lowercase, digits and dashes. */
  readonly id: string;
  /** Spoken by screen readers. */
  readonly label: string;
  /**
   * Spoken instead of `label` once a build that reads the progress reaches 100% (`isDone`), as the
   * upload's "Uploaded to Family: mochi.jpg". Empty or missing: `label` throughout. Optional, so
   * links made before it open unchanged.
   */
  readonly doneLabel?: string;
  /**
   * The words `label` is made of: text with `{region.key}` tokens such as "{expandedCenter.title}
   * timer" (`:lower` after the key lowers its first letter). While it is set, editing those words
   * rewrites `label`, so the spoken words follow what the island shows. Typing a label of your own
   * sets it to "". Empty or missing: `label` stays as typed. Optional, so links made before it open.
   */
  readonly labelWords?: string;
  /** The same for `doneLabel`. Empty or missing: `doneLabel` stays as typed. */
  readonly doneLabelWords?: string;
  readonly accent: AccentChoice;
  /** 0 to 1, read by the progress kinds. */
  readonly progress: number;
  readonly timer: { readonly mode: TimerMode; readonly seconds: number };
  readonly regions: Readonly<Record<Region, Content>>;
}

/** The seed of the activity's first Artwork region, which an "art" accent takes its colour from. */
export const artSeed = (activity: ActivitySpec): string | null => {
  for (const region of REGIONS) {
    const content = activity.regions[region];
    if (content.kind === "art") return content.seed;
  }
  return null;
};

export const ID_PATTERN = /^[a-z][a-z0-9-]{0,23}$/;

/**
 * When a sharing activity reads as finished: its ring turns into a check (`ShareRing`) and its done
 * words take over. One condition for the stage and the copied code (`DONE_SOURCE`), so they agree.
 */
export const isDone = (progress: number) => progress >= 1;

/** `isDone` as the copied code writes it, on the `progress` it takes. */
export const DONE_SOURCE = "progress >= 1";

/** Turns any text into a valid activity id, or "activity" when nothing is left. */
export const toActivityId = (value: string) => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .replace(/-+/g, "-")
    .slice(0, 24);
  return ID_PATTERN.test(cleaned) ? cleaned : "activity";
};

/* Defaults for a kind picked from a region's menu. */

const DEFAULT_TEXT = { compact: "Now", side: "Label", center: "Title", bottom: "Details" } as const satisfies Record<RegionSize, string>;

const TRANSPORT: readonly ButtonSpec[] = [
  { icon: "SkipBack", label: "Previous track", tone: "neutral", action: "none" },
  { icon: "Pause", label: "Pause", tone: "neutral", action: "none" },
  { icon: "SkipForward", label: "Next track", tone: "neutral", action: "none" },
];

export const defaultContent = (kind: ContentKind, size: RegionSize): Content => {
  switch (kind) {
    case "none":
    case "dot":
    case "spinner":
    case "clock":
    case "wave":
      return { kind };
    case "meter":
      return { kind, compactBars: 4, player: false };
    case "glyph":
      return { kind, icon: "Sparkle", tone: "accent" };
    case "tile":
      return { kind, icon: "Sparkle" };
    case "art":
      return { kind, seed: "Your track", cover: false };
    case "avatar":
      return { kind, name: "Maya Lindqvist", call: false };
    case "photo":
      return { kind, photo: "mochi" };
    case "device":
      return { kind, icon: "Laptop", photo: size === "compact" ? "none" : "biscuit" };
    case "media":
      return { kind, subtitle: "File name", detail: "", title: "Sentence" };
    case "share":
      return { kind, mark: size === "compact" ? "count" : "stop", action: "dismiss" };
    case "text":
      return { kind, text: DEFAULT_TEXT[size], tone: size === "compact" ? "accent" : "primary", wide: false };
    case "label":
      return { kind, text: "Label" };
    case "status":
      return { kind, icon: "Sparkle", iconTone: "accent", text: "Status", tone: "secondary", row: false };
    case "title":
      return { kind, title: "Title", subtitle: "Subtitle", lines: 1, end: false };
    case "value":
      return { kind, text: "12", unit: "min", caption: NO_CAPTION };
    case "percent":
      return { kind, caption: NO_CAPTION };
    case "timer":
      return { kind, format: "clock", caption: NO_CAPTION, end: false, tone: "accent" };
    case "ring":
      return { kind, icon: null };
    case "battery":
      return { kind, charging: true, percent: size === "compact", label: "", wide: false };
    case "bar":
      return { kind, caption: "", cancel: false };
    case "readout":
      return { kind, tone: "primary", detail: "20 of 48 MB", before: "", name: "Name", after: "" };
    case "route":
      return { kind, vehicle: "Car", destination: "MapPin", title: "", subtitle: "" };
    case "cancel":
      return { kind, label: "Cancel", action: "dismiss" };
    case "scrubber":
      return { kind, length: 214, buttons: TRANSPORT };
    case "player":
      return { kind, length: 214, output: true };
    case "track":
      return { kind, title: "Title", subtitle: "Artist" };
    case "caller":
      return { kind, title: "Name", subtitle: "Audio call" };
    case "recorder":
      return { kind, action: "dismiss" };
    case "vehicle":
      return { kind, icon: "Car" };
    case "driver":
      return { kind, title: "Name", subtitle: "Plate" };
    case "arrival":
      return { kind, text: "Vehicle", label: "Message", action: "none" };
    case "buttons":
      return size === "bottom"
        ? {
            kind,
            buttons: [
              { icon: "X", label: "Cancel", tone: "neutral", action: "dismiss" },
              { icon: "Check", label: "Done", tone: "accent", action: "collapse" },
            ],
            call: false,
          }
        : { kind, buttons: [{ icon: "Pause", label: "Pause", tone: "accent", action: "none" }], call: false };
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
};

export const defaultButton = (): ButtonSpec => ({ icon: "Check", label: "OK", tone: "neutral", action: "collapse" });

/** What a blank activity says to a screen reader until it is given a label of its own. */
const BLANK_LABEL = "Custom activity";

/** A blank activity's id ("activity" would make the hook useActivityActivity). */
const BLANK_ID = "custom";

/** The ids a field may still hold from the blank activity; see `SAMPLE_TEXTS`. */
export const SAMPLE_IDS: ReadonlySet<string> = new Set([BLANK_ID]);

/** The fields of a content or a button that hold words a person types. */
const TYPED_KEYS = ["text", "title", "subtitle", "unit", "seed", "name", "label", "detail", "before", "after"] as const;

const typedWords = (value: object): string[] =>
  TYPED_KEYS.flatMap((key) => {
    const field: unknown = Object.getOwnPropertyDescriptor(value, key)?.value;
    return typeof field === "string" && field !== "" ? [field] : [];
  });

const SIZES = ["compact", "side", "center", "bottom"] as const satisfies readonly RegionSize[];

/**
 * Every sample the kit puts in a text field when a kind is picked ("Title", "Subtitle", "Label",
 * "OK"), and the blank activity's spoken label. A field still holding one selects it on focus, so
 * typing replaces the sample instead of running on from it ("SubtitleOut for delivery").
 */
export const SAMPLE_TEXTS: ReadonlySet<string> = new Set([
  ...SIZES.flatMap((size) =>
    KINDS_BY_SIZE[size].flatMap((kind) => {
      const content = defaultContent(kind, size);
      const buttons = content.kind === "buttons" || content.kind === "scrubber" ? content.buttons : [];
      return [...typedWords(content), ...buttons.flatMap(typedWords)];
    }),
  ),
  ...typedWords(defaultButton()),
  BLANK_LABEL,
]);

/** The icon a region shows as the activity's symbol: a glyph's, a tile's, or a status label's. */
const symbolOf = (content: Content): IconName | null => (content.kind === "glyph" || content.kind === "tile" || content.kind === "status" ? content.icon : null);

/**
 * Regions that show the compact leading icon again until they are given one of their own: the
 * expanded view's leading tile or label and the split's bubble. A blank build that picked a fork and knife
 * for its pill expanded to the kit's default sparkle, and its code imported both.
 */
const SYMBOL_FOLLOWERS = ["expandedLeading", "minimal"] as const satisfies readonly Region[];

const isFollower = (region: Region): region is (typeof SYMBOL_FOLLOWERS)[number] => SYMBOL_FOLLOWERS.some((follower) => follower === region);

interface WithContentOptions {
  /** The activity's regions before the change. Required. */
  regions: Readonly<Record<Region, Content>>;
  /** The region that changes. Required. */
  at: Region;
  /** Its new content. Required. */
  content: Content;
}

/**
 * The regions with one region's content replaced, keeping the activity's symbol in step: an icon
 * or tile picked for a follower starts on the compact leading icon, and changing that icon moves
 * every follower still showing the old one. A follower given a different icon keeps it.
 */
export const withContent = ({ regions, at, content }: WithContentOptions): Record<Region, Content> => {
  const next: Record<Region, Content> = { ...regions, [at]: content };
  const lead = symbolOf(regions.compactLeading);
  if (isFollower(at)) {
    const picked = regions[at].kind !== content.kind && symbolOf(content) !== null;
    if (picked && lead !== null && (content.kind === "glyph" || content.kind === "tile" || content.kind === "status")) next[at] = { ...content, icon: lead };
    return next;
  }
  const now = symbolOf(content);
  if (at !== "compactLeading" || lead === null || now === null || lead === now) return next;
  for (const follower of SYMBOL_FOLLOWERS) {
    const shown = regions[follower];
    if ((shown.kind === "glyph" || shown.kind === "tile" || shown.kind === "status") && shown.icon === lead) next[follower] = { ...shown, icon: now };
  }
  return next;
};

/* Starting points. */

const none: Content = { kind: "none" };

const regions = (filled: Partial<Record<Region, Content>>): Record<Region, Content> => ({
  compactLeading: filled.compactLeading ?? none,
  compactTrailing: filled.compactTrailing ?? none,
  minimal: filled.minimal ?? none,
  expandedLeading: filled.expandedLeading ?? none,
  expandedCenter: filled.expandedCenter ?? none,
  expandedTrailing: filled.expandedTrailing ?? none,
  expandedBottom: filled.expandedBottom ?? none,
});

const spec = (fields: Omit<ActivitySpec, "regions" | "timer" | "progress"> & Partial<Pick<ActivitySpec, "timer" | "progress">> & { regions: Partial<Record<Region, Content>> }): ActivitySpec => ({
  progress: fields.progress ?? 0.42,
  timer: fields.timer ?? { mode: "countdown", seconds: 300 },
  ...fields,
  regions: regions(fields.regions),
});

/**
 * A blank activity: every region empty. The stage draws dashed slots where content goes until you
 * fill them (`PLACEHOLDERS` in content.tsx); the copied code has none of them.
 */
export const blankActivity = (): ActivitySpec =>
  spec({
    id: BLANK_ID,
    label: BLANK_LABEL,
    accent: "blue",
    regions: {},
  });

/** "2.5 of 6 MB": how much of the sample upload has gone at its still's progress, as the preset words it. */
const uploadedOf = (progress: number) => {
  const sent = uploadSample.sizeMb * progress;
  return `${sent < 10 ? Math.round(sent * 10) / 10 : Math.round(sent)} of ${uploadSample.sizeMb} MB`;
};

/** "Full in 55 min" at the sample's level, as the battery preset words it. */
const fullIn = (level: number) => `Full in ${Math.max(1, Math.round((1 - level) * batterySample.fullCharge))} min`;

const [track] = nowPlayingSample.playlist;

/**
 * Each preset rebuilt from the same content kit the preset files use, with the copy the gallery
 * shows (`examples/samples.ts`), so a preset opened from the gallery looks as it did there and
 * every region stays editable. The preset files themselves stay the ready-made option.
 */
const STARTERS = {
  upload: () =>
    spec({
      id: "upload",
      // The words the preset speaks, less its running percentage.
      label: `Uploading to ${uploadSample.destination}: ${uploadSample.fileName}`,
      doneLabel: `Uploaded to ${uploadSample.destination}: ${uploadSample.fileName}`,
      labelWords: "{expandedCenter.title}: {expandedCenter.subtitle}",
      doneLabelWords: "{expandedCenter.doneTitle}: {expandedCenter.subtitle}",
      accent: "blue",
      progress: uploadSample.still,
      regions: {
        // The photo and a ring with the percentage in it, as a posting app's compact.
        compactLeading: { kind: "photo", photo: "mochi" },
        // No bubble form of its own: the split's bubble keeps the pair, a 22 pt photo and the ring, as the preset's does.
        compactTrailing: { kind: "share", mark: "count", action: "none" },
        // One row: the photo large, the file and its size over where it goes, and the ring large.
        expandedLeading: { kind: "photo", photo: "mochi" },
        expandedCenter: {
          kind: "media",
          subtitle: uploadSample.fileName,
          detail: uploadedOf(uploadSample.still),
          title: `Uploading to ${uploadSample.destination}`,
          doneTitle: `Uploaded to ${uploadSample.destination}`,
        },
        expandedTrailing: { kind: "share", mark: "count", action: "none" },
      },
    }),
  timer: () =>
    spec({
      id: "timer",
      label: `${timerSample.label} timer`,
      labelWords: "{expandedCenter.title} timer",
      accent: "orange",
      timer: { mode: "countdown", seconds: timerSample.minutes * 60 },
      regions: {
        compactLeading: { kind: "glyph", icon: "Timer", tone: "accent" },
        // No bubble form of its own: in the split's bubble it keeps its pair, the stopwatch and the
        // minutes left ("5"), as the reference's bubble holds a dot and "7" (`bubbleMinutes`).
        compactTrailing: { kind: "timer", format: "clock", caption: NO_CAPTION, end: false, tone: "accent" },
        expandedLeading: {
          kind: "buttons",
          buttons: [
            { icon: "Pause", label: "Pause", tone: "tinted", action: "none" },
            { icon: "X", label: "Cancel", tone: "neutral", action: "dismiss" },
          ],
          call: false,
        },
        // The name alone, as the timer preset shows it: the countdown on the right already says when it ends.
        expandedCenter: { kind: "title", title: timerSample.label, subtitle: "", lines: 1, end: false },
        expandedTrailing: { kind: "timer", format: "clock", caption: NO_CAPTION, end: false, tone: "accent" },
      },
    }),
  "now-playing": () =>
    spec({
      id: "now-playing",
      label: `${track.title} by ${track.artist}`,
      labelWords: "{expandedCenter.title} by {expandedCenter.subtitle}",
      accent: "art",
      timer: { mode: "elapsed", seconds: nowPlayingSample.startAt / 1000 },
      regions: {
        // The art and the player's meter, which keeps four of its six bars in the split's bubble, as the preset's does.
        compactLeading: { kind: "art", seed: `${track.title} ${track.artist}`, cover: false },
        compactTrailing: { kind: "meter", compactBars: 4, player: true },
        // The player as the preset draws it: the cover, title and artist, the meter in the corner, then the scrubber and transport.
        expandedLeading: { kind: "art", seed: `${track.title} ${track.artist}`, cover: true },
        expandedCenter: { kind: "track", title: track.title, subtitle: track.artist },
        expandedTrailing: { kind: "meter", compactBars: 4, player: true },
        expandedBottom: { kind: "player", length: track.duration / 1000, output: true },
      },
    }),
  "incoming-call": () =>
    spec({
      id: "call",
      label: `Incoming call from ${callSample.caller}`,
      labelWords: "Incoming call from {expandedCenter.title}",
      accent: "green",
      regions: {
        compactLeading: { kind: "avatar", name: callSample.caller, call: false },
        compactTrailing: { kind: "glyph", icon: "Phone", tone: "accent" },
        minimal: { kind: "glyph", icon: "Phone", tone: "accent" },
        // The incoming call's one row: the photo, the kind of call over the name, then decline and accept.
        expandedLeading: { kind: "avatar", name: callSample.caller, call: true },
        expandedCenter: { kind: "caller", title: callSample.caller, subtitle: callSample.subtitle },
        expandedTrailing: {
          kind: "buttons",
          buttons: [
            { icon: "PhoneDisconnect", label: "Decline", tone: "destructive", action: "dismiss" },
            { icon: "Phone", label: "Accept", tone: "accent", action: "collapse" },
          ],
          call: true,
        },
      },
    }),
  eta: () =>
    spec({
      id: "ride",
      label: `Your ride arrives in ${etaSample.minutes} minutes`,
      accent: "green",
      progress: etaSample.elapsed / (etaSample.elapsed + etaSample.minutes * 60_000),
      timer: { mode: "countdown", seconds: etaSample.minutes * 60 },
      regions: {
        // In the accent, as the preset's compact is, so opening it keeps the car's colour; in the split's bubble the car alone.
        compactLeading: { kind: "glyph", icon: "Car", tone: "accent" },
        compactTrailing: { kind: "timer", format: "minutes", caption: NO_CAPTION, end: false, tone: "accent" },
        minimal: { kind: "glyph", icon: "Car", tone: "accent" },
        // The car large in the corner, the driver and plate opposite, then the car's name, the minutes and the Message capsule.
        expandedLeading: { kind: "vehicle", icon: "Car" },
        expandedTrailing: { kind: "driver", title: etaSample.ride.driverName, subtitle: etaSample.ride.plate },
        expandedBottom: { kind: "arrival", text: etaSample.ride.vehicle, label: `Message ${etaSample.ride.driverName.split(" ")[0] ?? "driver"}`, action: "none" },
      },
    }),
  recording: () =>
    spec({
      id: "recording",
      label: `Recording a ${recordingSample.title.toLowerCase()}`,
      accent: "red",
      timer: { mode: "elapsed", seconds: recordingSample.elapsed / 1000 },
      regions: {
        // The waveform and the time; in the split's bubble a shorter waveform alone, as the preset's.
        compactLeading: { kind: "wave" },
        compactTrailing: { kind: "timer", format: "clock", caption: NO_CAPTION, end: false, tone: "accent" },
        minimal: { kind: "wave" },
        // The voice recorder's one row: the waveform, then the time and the stop ring.
        expandedLeading: { kind: "wave" },
        expandedTrailing: { kind: "recorder", action: "dismiss" },
      },
    }),
  transfer: () =>
    spec({
      id: "transfer",
      label: `Sending ${transferSample.itemName} to ${transferSample.deviceName}`,
      doneLabel: `Sent ${transferSample.itemName} to ${transferSample.deviceName}`,
      labelWords: "{expandedCenter.subtitle} {expandedCenter.title:lower}",
      doneLabelWords: "{expandedCenter.doneSubtitle} {expandedCenter.title:lower}",
      accent: "blue",
      progress: transferSample.still,
      regions: {
        // Who it goes to and a plain ring, as a nearby share's compact.
        compactLeading: { kind: "device", icon: "Laptop", photo: "none" },
        // In the split's bubble the pair fits whole (a 22 pt disc and a 20 pt ring), as the preset's.
        compactTrailing: { kind: "share", mark: "none", action: "none" },
        // One row: the device with the photo on its corner, what is moving over who it goes to, and the ring with its stop.
        expandedLeading: { kind: "device", icon: "Laptop", photo: "biscuit" },
        expandedCenter: {
          kind: "media",
          subtitle: `Sending ${transferSample.itemName}`,
          detail: "",
          title: `To ${transferSample.deviceName}`,
          doneSubtitle: `Sent ${transferSample.itemName}`,
        },
        expandedTrailing: { kind: "share", mark: "stop", action: "dismiss" },
      },
    }),
  battery: () =>
    spec({
      id: "battery",
      label: `Charging, ${Math.round(batterySample.level * 100)} percent`,
      accent: "green",
      progress: batterySample.level,
      regions: {
        // The charging pill: "Charging" in white and the level in green, each side as wide as the engine allows.
        compactLeading: { kind: "text", text: "Charging", tone: "primary", wide: true },
        compactTrailing: { kind: "battery", charging: true, percent: true, label: "", wide: true },
        minimal: { kind: "battery", charging: true, percent: false, label: "", wide: false },
        // The same row, opened in the shortest expanded island: "Charging" with the time to full under it, and the level.
        expandedLeading: { kind: "text", text: "Charging", tone: "primary", wide: true, detail: fullIn(batterySample.level) },
        expandedTrailing: { kind: "battery", charging: true, percent: true, label: "", wide: true },
      },
    }),
} as const satisfies Record<Exclude<PresetSlug, "split">, () => ActivitySpec>;

/** Where a build starts. The split starts two activities. */
export type StarterKey = "blank" | "split" | keyof typeof STARTERS;

/** A preset that is one activity, which a split can take as its second. */
export type ActivityStarter = keyof typeof STARTERS;

export const isActivityStarter = (value: string): value is ActivityStarter => Object.hasOwn(STARTERS, value);

export interface Build {
  /** The preset the build started from, for the "install the preset" pointer. */
  readonly from: StarterKey;
  readonly primary: ActivitySpec;
  /** A second activity, shown in the split while it runs. */
  readonly second: ActivitySpec | null;
}

/** A preset's activity, renamed if its id is the primary's, for the split's second activity. */
export const secondFrom = (key: ActivityStarter, primary: ActivitySpec): ActivitySpec => {
  const activity = STARTERS[key]();
  return activity.id === primary.id ? { ...activity, id: `${activity.id}-2` } : activity;
};

/**
 * The second activity the gallery's Split view runs beside a preset (gallery-split.tsx), and that a
 * gallery link to that view carries into the playground: the one the playground's Split menu
 * suggests first (`companionKey`), so the gallery and the playground always pair a preset the same way.
 */
export const galleryCompanion = (primary: ActivitySpec): ActivitySpec => companionFor(primary);

/**
 * The second activity a split offers first: music, which reads well in the bubble, or a timer
 * when the first is already music.
 */
export const companionKey = (primary: ActivitySpec): ActivityStarter => (primary.id === "now-playing" ? "timer" : "now-playing");

export const companionFor = (primary: ActivitySpec): ActivitySpec => secondFrom(companionKey(primary), primary);

/**
 * The split preset's timer, as its demo runs it: the timer preset's own name ("Timer") and 4:32
 * left. The demo ships in the registry, so it keeps these in its own file rather than the samples.
 */
const splitTimer = (): ActivitySpec => {
  const timer = STARTERS.timer();
  return {
    ...timer,
    label: "Timer",
    labelWords: "{expandedCenter.title}",
    timer: { mode: "countdown", seconds: 4 * 60 + 32 },
    // It is always the first activity, so its bubble never shows; it keeps the stopwatch it had, so
    // split links made before the timer's bubble kept its pair open unchanged.
    regions: { ...timer.regions, minimal: { kind: "glyph", icon: "Timer", tone: "accent" }, expandedCenter: { kind: "title", title: "Timer", subtitle: "", lines: 1, end: false } },
  };
};

export const starterBuild = (key: StarterKey): Build => {
  if (key === "blank") return { from: key, primary: blankActivity(), second: null };
  if (key === "split") return { from: key, primary: splitTimer(), second: STARTERS["now-playing"]() };
  return { from: key, primary: STARTERS[key](), second: null };
};

/** Where the playground starts when nothing names a preset, or a link names one that is gone: the upload. */
export const DEFAULT_STARTER = "upload" as const satisfies StarterKey;

export const isStarterKey = (value: string): value is StarterKey =>
  value === "blank" || value === "split" || Object.hasOwn(STARTERS, value);

/** Does any region of the activity read this value? */
export const usesProgress = (activity: ActivitySpec) =>
  REGIONS.some((region) => {
    const { kind } = activity.regions[region];
    const content = activity.regions[region];
    return kind === "percent" || kind === "ring" || kind === "share" || kind === "bar" || kind === "readout" || kind === "route" || kind === "battery" || (content.kind === "media" && (content.detail !== "" || hasDoneWords(content)));
  });

/** Whether a media text has words of its own for 100%. */
export const hasDoneWords = (content: Extract<Content, { kind: "media" }>) => (content.doneSubtitle ?? "") !== "" || (content.doneTitle ?? "") !== "";

/** The activity's label for 100%, or null when it has none it can reach: only a build that reads the progress gets there. */
export const reachableDoneLabel = (activity: ActivitySpec): string | null => {
  const done = activity.doneLabel ?? "";
  return done !== "" && usesProgress(activity) ? done : null;
};

/** What a screen reader hears for the activity now: its label for 100% once it has finished, else `label`. */
export const spokenLabel = (activity: ActivitySpec) => {
  const done = reachableDoneLabel(activity);
  return done !== null && isDone(activity.progress) ? done : activity.label;
};

export const usesTimer = (activity: ActivitySpec) =>
  REGIONS.some((region) => {
    const content = activity.regions[region];
    return (
      content.kind === "timer" ||
      content.kind === "scrubber" ||
      content.kind === "clock" ||
      content.kind === "player" ||
      content.kind === "recorder" ||
      content.kind === "arrival" ||
      (content.kind === "title" && content.end) ||
      (content.kind === "route" && content.title !== "")
    );
  });

const pressesOf = (content: Content): readonly ButtonAction[] => {
  switch (content.kind) {
    case "buttons":
    case "scrubber":
      return content.buttons.map((button) => button.action);
    case "value":
    case "percent":
    case "timer":
      return content.caption.text === "" || content.caption.press === null ? [] : [content.caption.press];
    case "bar":
      return content.cancel ? ["dismiss"] : [];
    case "cancel":
    case "recorder":
      return [content.action];
    case "share":
      return content.mark === "stop" ? [content.action] : [];
    case "arrival":
      return content.label === "" ? [] : [content.action];
    default:
      return [];
  }
};

export const usesButtonAction = (activity: ActivitySpec) => REGIONS.some((region) => pressesOf(activity.regions[region]).some((action) => action !== "none"));

/**
 * The cover made for a sample track, by the seed the playground keys its art on ("<title> <artist>"),
 * so the rebuild shows the same photograph and meter tint as the shipped preset on the stage. A seed
 * of the visitor's own gets the drawn cover.
 */
export const sampleCover = (seed: string): { artwork: string; accent: string } | null => {
  const track = nowPlayingSample.playlist.find((entry) => `${entry.title} ${entry.artist}` === seed);
  return track === undefined ? null : { artwork: track.artwork, accent: track.accent };
};

/**
 * The contact photo made for the sample caller, by the name the playground keys its avatar on, so
 * the rebuild shows the same picture as the shipped call preset on the stage. Any other name gets
 * the initials.
 */
export const samplePhoto = (name: string): string | undefined => (name === callSample.caller ? callSample.avatar : undefined);
