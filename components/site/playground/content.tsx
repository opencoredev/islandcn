"use client";

import type { CSSProperties, ReactNode } from "react";

import { Glyph, type GlyphIcon, IconTile } from "@/components/islandcn/glyph";
import {
  AirplaneGlyph,
  AlarmGlyph,
  ArrowUpGlyph,
  BatteryChargingGlyph,
  BellGlyph,
  BicycleGlyph,
  BoltGlyph,
  CarGlyph,
  CheckCircleGlyph,
  CheckGlyph,
  CloseGlyph,
  CoffeeGlyph,
  DesktopGlyph,
  DocumentPlusGlyph,
  DownloadGlyph,
  ForkKnifeGlyph,
  GitMergeRequestGlyph,
  GlobeGlyph,
  HangUpGlyph,
  HeadphonesGlyph,
  HeartGlyph,
  HouseGlyph,
  type IslandGlyph,
  LaptopGlyph,
  MessageGlyph,
  MicrophoneGlyph,
  MusicGlyph,
  NextTrackGlyph,
  PackageGlyph,
  PauseGlyph,
  PencilGlyph,
  PhoneGlyph,
  PinGlyph,
  PlayGlyph,
  PreviousTrackGlyph,
  RecordGlyph,
  ScreenRecordGlyph,
  SearchGlyph,
  SparkleGlyph,
  StopGlyph,
  TabletGlyph,
  TerminalGlyph,
  TimerGlyph,
  UploadGlyph,
  VideoGlyph,
  WarningGlyph,
  WrenchGlyph,
} from "@/components/islandcn/glyphs";
import { Artwork } from "@/components/islandcn/artwork";
import { Avatar } from "@/components/islandcn/avatar";
import { BatteryGlyph, ChargingLabel, ChargingLevel, ChargingRowLabel, ChargingRowLevel, labelBatteryWidth } from "@/components/islandcn/battery-activity";
import { CallAvatar, CallButtonRow, callButton, callColors, CallText } from "@/components/islandcn/call-activity";
import { EtaArrival, EtaDriver, EtaVehicle, formatArrivalMinutes, RouteBar } from "@/components/islandcn/eta-activity";
import { IslandButton, IslandRoundButton } from "@/components/islandcn/island-button";
import { BottomBar, bottomInset, CaptionButton, cornerClearance, ExpandedBottom, ExpandedSide, SensorRow, SensorSide, ValueStack } from "@/components/islandcn/island-layout";
import { BubbleForm, Caption, CompactText, ContextLabel, ExpandedSubtitle, ExpandedTitle, ExpandedValue, NumberText, tabularFigures, TitleStack } from "@/components/islandcn/island-text";
import { LevelMeter } from "@/components/islandcn/level-meter";
import { MediaLead, MediaLine, MediaText, MediaTrail, mediaCompact, mediaRow, SharePicture, ShareRing, Thumbnail } from "@/components/islandcn/media-row";
import { LinearProgress, TimeProgress } from "@/components/islandcn/linear-progress";
import { PlayerControls, PlayerCover, PlayerMeter, PlayerTitle } from "@/components/islandcn/now-playing-activity";
import { IconRing, ProgressRing } from "@/components/islandcn/progress-ring";
import { CompactWave, RecordingDot, RecordingTrailing, RecordingWave } from "@/components/islandcn/recording-activity";
import { Spinner } from "@/components/islandcn/spinner";
import { islandAccent, islandInk, islandLine, islandRow, islandSafe, islandSize, tint } from "@/components/islandcn/theme";
import { formatClock, formatMinutes, TickingTime, type TickingTimeSource } from "@/components/islandcn/ticking-time";

import {
  type ButtonSpec,
  type CaptionSpec,
  type Content,
  DONE_SOURCE,
  type IconName,
  isDone,
  photoSource,
  REGION_INFO,
  type Region,
  sampleCover,
  samplePhoto,
  type Tone,
} from "./model";

/** Regular weight for compact minutes, as the ride preset sets them (`CompactText` is semibold). */
const REGULAR = { fontWeight: 400 } as const satisfies CSSProperties;

/** "6 mins", "1 min": the whole minutes left with their unit, as the ride preset's compact reads. */
const minutesWithUnit = (ms: number) => {
  const count = formatMinutes(ms);
  return `${count} ${count === "1" ? "min" : "mins"}`;
};

/*
 * One function per content kind returns both what the stage draws and the
 * source the code panel prints for it. Keeping the two side by side is what
 * makes the copied code draw the island you see.
 */

/**
 * Every icon the playground offers, each an islandcn glyph (a Hugeicons icon drawn for the island).
 * Names stay as they were, so links made before the glyph set, and before Hugeicons, still open.
 */
export const ICONS = {
  Sparkle: SparkleGlyph,
  CloudArrowUp: UploadGlyph,
  DownloadSimple: DownloadGlyph,
  ArrowUp: ArrowUpGlyph,
  Timer: TimerGlyph,
  Alarm: AlarmGlyph,
  MusicNotes: MusicGlyph,
  Headphones: HeadphonesGlyph,
  Phone: PhoneGlyph,
  PhoneDisconnect: HangUpGlyph,
  Car: CarGlyph,
  Package: PackageGlyph,
  Bicycle: BicycleGlyph,
  MapPin: PinGlyph,
  ChatCircleDots: MessageGlyph,
  Bell: BellGlyph,
  Microphone: MicrophoneGlyph,
  Record: RecordGlyph,
  VideoCamera: VideoGlyph,
  Monitor: DesktopGlyph,
  Laptop: LaptopGlyph,
  Lightning: BoltGlyph,
  BatteryCharging: BatteryChargingGlyph,
  Heart: HeartGlyph,
  Coffee: CoffeeGlyph,
  ForkKnife: ForkKnifeGlyph,
  AirplaneTilt: AirplaneGlyph,
  Check: CheckGlyph,
  X: CloseGlyph,
  Play: PlayGlyph,
  Pause: PauseGlyph,
  SkipBack: PreviousTrackGlyph,
  SkipForward: NextTrackGlyph,
  Stop: StopGlyph,
  Terminal: TerminalGlyph,
  Warning: WarningGlyph,
  Search: SearchGlyph,
  Globe: GlobeGlyph,
  Wrench: WrenchGlyph,
  Pencil: PencilGlyph,
  Document: DocumentPlusGlyph,
  CheckCircle: CheckCircleGlyph,
  House: HouseGlyph,
  Tablet: TabletGlyph,
  ScreenRecord: ScreenRecordGlyph,
  GitMerge: GitMergeRequestGlyph,
} as const satisfies Record<IconName, IslandGlyph>;

/** The component `Glyph` and `IconTile` take for a picker icon. */
export const iconComponent = (name: IconName): IslandGlyph => ICONS[name];

/** The identifier generated code imports for a picker icon, such as `UploadGlyph`. */
const iconIdentifier = (name: IconName): string => ICONS[name].displayName;

interface IconArtProps {
  /** Which icon. Required. */
  name: IconName;
  /** Box size in px. Required. */
  size: number;
  /** Ink colour. Defaults to the surrounding text colour. */
  color?: string;
}

/** A picker icon drawn on its own, outside `Glyph`: in a button, a ring or the picker itself. */
export const IconArt = ({ name, size, color }: IconArtProps) => {
  const Drawn = ICONS[name];
  return <Drawn size={size} color={color} />;
};

/** `IconArt`'s source: a glyph takes a size (a number, or an expression such as `callButton.handset`) and a colour. */
const iconArtSource = (name: IconName, size: number | string, color?: string) => {
  const colorProp = color === undefined ? "" : ` color={${color}}`;
  return `<${iconIdentifier(name)} size={${size}}${colorProp} />`;
};

/** The registry items a piece needs, by name. */
export type RegistryItemName =
  | "island-core"
  | "island-content"
  | "progress-ring"
  | "linear-progress"
  | "spinner"
  | "ticking-time"
  | "level-meter"
  | "island-button"
  | "artwork"
  | "avatar"
  | "media-row"
  | "eta-activity"
  | "now-playing-activity"
  | "call-activity"
  | "recording-activity"
  | "battery-activity";

/** Named imports a piece of source needs, by module. */
export type Imports = ReadonlyMap<string, ReadonlySet<string>>;

export interface Piece {
  node: ReactNode;
  /** JSX source at zero indent; may span lines. Empty for an empty region. */
  source: string;
  imports: Imports;
  items: readonly RegistryItemName[];
  /** Already placed on the expanded row by its own layout (a `ValueStack` with a caption), so it gets no `ExpandedSide`. Defaults to false. */
  placed?: boolean;
}

/** Values the stage draws with. */
export interface RenderValues {
  accent: string;
  progress: number;
  timer: TickingTimeSource;
  onButton: (button: ButtonSpec) => void;
}

/** Names the generated code uses for the same values. */
export interface SourceNames {
  /** The activity id, for `island.end(...)`. */
  id: string;
  /** `endsAt` or `startedAt`, whichever the activity's timer uses. */
  timerSource: string;
}

const KIT = "@/components/islandcn";
const MOD = {
  glyph: `${KIT}/glyph`,
  text: `${KIT}/island-text`,
  layout: `${KIT}/island-layout`,
  theme: `${KIT}/theme`,
  ring: `${KIT}/progress-ring`,
  bar: `${KIT}/linear-progress`,
  spinner: `${KIT}/spinner`,
  time: `${KIT}/ticking-time`,
  meter: `${KIT}/level-meter`,
  button: `${KIT}/island-button`,
  artwork: `${KIT}/artwork`,
  avatar: `${KIT}/avatar`,
  media: `${KIT}/media-row`,
  eta: `${KIT}/eta-activity`,
  nowPlaying: `${KIT}/now-playing-activity`,
  call: `${KIT}/call-activity`,
  recording: `${KIT}/recording-activity`,
  battery: `${KIT}/battery-activity`,
  glyphs: `${KIT}/glyphs`,
} as const;

const imports = (...entries: readonly (readonly [string, string])[]): Imports => {
  const map = new Map<string, Set<string>>();
  for (const [from, name] of entries) {
    const set = map.get(from) ?? new Set<string>();
    set.add(name);
    map.set(from, set);
  }
  return map;
};

export const mergeImports = (all: readonly Imports[]): Imports => {
  const map = new Map<string, Set<string>>();
  for (const one of all) {
    for (const [from, names] of one) {
      const set = map.get(from) ?? new Set<string>();
      for (const name of names) set.add(name);
      map.set(from, set);
    }
  }
  return map;
};

const iconImport = (icon: IconName) => [MOD.glyphs, iconIdentifier(icon)] as const;

/**
 * A sample image's `src` in the copied code, marked as one: the file lives on this site, not in the
 * app the code is pasted into. Without it the piece draws its own fallback (a cover from the seed,
 * initials, the glyph), so the pasted code still renders before the image is swapped.
 */
const sampleSrc = (src: string) => `${attr("src", src)} /* sample image: use your own */`;

/** A JS string literal. */
export const lit = (value: string) => JSON.stringify(value);

/** A JSX attribute: `name="value"`, or `name={"value"}` when the text needs escaping. */
const attr = (name: string, value: string) => (/^[^"\\&{}<>]*$/.test(value) ? `${name}="${value}"` : `${name}={${lit(value)}}`);

/**
 * An attribute that changes its words at 100%: `running` until then, `done` after, on the same
 * condition the stage uses. Without done words, the plain attribute.
 */
const doneAttr = (name: string, running: string, done: string) => (done === "" ? attr(name, running) : `${name}={${DONE_SOURCE} ? ${lit(done)} : ${lit(running)}}`);

/** JSX children text: plain when safe, an expression otherwise. */
const childText = (value: string) => (/^[A-Za-z0-9 .,:;!?%()+\-]*$/.test(value) && value.trim() === value && value !== "" ? value : `{${lit(value)}}`);

const indent = (source: string, by = 2) =>
  source
    .split("\n")
    .map((line) => (line === "" ? line : `${" ".repeat(by)}${line}`))
    .join("\n");

const toneColor = (tone: Tone, accent: string) =>
  tone === "accent" ? accent : tone === "primary" ? islandInk.primary : tone === "secondary" ? islandInk.secondary : islandAccent.orange;
const toneSource = (tone: Tone) => (tone === "accent" ? "accent" : tone === "primary" ? "islandInk.primary" : tone === "secondary" ? "islandInk.secondary" : "islandAccent.orange");
const toneImports = (tone: Tone): readonly (readonly [string, string])[] =>
  tone === "accent" ? [] : tone === "caution" ? [[MOD.theme, "islandAccent"]] : [[MOD.theme, "islandInk"]];

const percentOf = (progress: number) => Math.round(Math.min(1, Math.max(0, progress)) * 100);

const timerSourceSource = (names: SourceNames) =>
  names.timerSource === "endsAt" ? `{ kind: "remaining", until: endsAt }` : `{ kind: "elapsed", since: startedAt }`;

const buttonPress = (button: ButtonSpec, names: SourceNames) => {
  switch (button.action) {
    case "collapse":
      return "() => island.collapse()";
    case "dismiss":
      return `() => island.end(${lit(names.id)})`;
    case "none":
      return `() => { /* ${button.label.replace(/\*\//g, "")}: your app's action goes here. */ }`;
    default: {
      const exhaustive: never = button.action;
      return exhaustive;
    }
  }
};

const pressAttr = (button: ButtonSpec, names: SourceNames) => `onPress={${buttonPress(button, names)}}`;


/** Where a piece sits, beyond its size: what the expanded row holds around it. */
export interface PieceContext {
  /** Whether the expanded view has a bottom region, so a caption on a one-row island clears the corner. */
  hasBottom: boolean;
  /**
   * The row line leading and trailing content centres on (pt below the content top, see
   * `ExpandedSide`), or null to leave side content where it starts, at the top.
   */
  line: number | null;
  /**
   * Whether a countdown in compact trailing reads in whole minutes in the split's bubble: the bubble
   * shows this activity's compact pair (no bubble form of its own), and "4:31" would be cut to "4…"
   * in the room it leaves after the glyph (about 20 pt), where "5" fits, as the reference's "7" does.
   */
  bubbleMinutes: boolean;
  /**
   * Whether the split's bubble shows this activity's compact pair (it has no bubble form of its
   * own), so a compact piece that is too wide there can give the bubble a narrower form.
   */
  pairInBubble: boolean;
}

const EMPTY: Piece = { node: undefined, source: "", imports: new Map(), items: [] };

/** A piece wrapped in an element whose source opens with `open` and closes with `close`. */
const wrap = (inner: Piece, node: ReactNode, open: string, close: string, more: Imports, items: readonly RegistryItemName[] = []): Piece => ({
  node,
  source: `${open}\n${indent(inner.source)}\n${close}`,
  imports: mergeImports([inner.imports, more]),
  items: [...inner.items, ...items],
});

/** The kit's named row lines, so the copied code says which line a frame sits on. */
const NAMED_LINES = [
  ["titleLine", islandRow.titleLine],
  ["subtitleLine", islandRow.subtitleLine],
] as const satisfies readonly (readonly [keyof typeof islandRow, number])[];

/** A row line as the copied code writes it: omitted for the default (the title stack's), else named or a number. */
const lineSource = (line: number): { prop: string | null; imports: Imports } => {
  if (line === islandRow.stackLine) return { prop: null, imports: new Map() };
  const named = NAMED_LINES.find(([, value]) => value === line);
  if (named !== undefined) return { prop: `line={islandRow.${named[0]}}`, imports: imports([MOD.theme, "islandRow"]) };
  return { prop: `line={${Number(line.toFixed(2))}}`, imports: new Map() };
};

/** The `ExpandedSide` frame that centres side content of `height` pt on the row `line`. */
const framed = (inner: Piece, { height, line, align }: { height: number; line: number; align: "start" | "end" }): Piece => {
  const named = lineSource(line);
  const props = [height === islandSize.expandedTile ? null : `height={${height}}`, named.prop, align === "end" ? `align="end"` : null].filter(
    (prop): prop is string => prop !== null,
  );
  return wrap(
    inner,
    <ExpandedSide height={height} line={line} align={align}>
      {inner.node}
    </ExpandedSide>,
    `<ExpandedSide${props.length === 0 ? "" : ` ${props.join(" ")}`}>`,
    "</ExpandedSide>",
    mergeImports([imports([MOD.layout, "ExpandedSide"]), named.imports]),
  );
};

/**
 * Height in pt of what a kind draws beside the sensor in the expanded view, or null when it varies
 * (and the piece keeps to the top). These are the sizes the cases below render at.
 */
type TitleContent = Extract<Content, { kind: "title" }>;

/** A title shows a second line when it has a subtitle, or the timer's time in its place. */
const hasSubtitle = (content: TitleContent) => content.end || content.subtitle !== "";

/** The time under a title takes one line; a subtitle the lines asked for. */
const subtitleLines = (content: TitleContent): 1 | 2 => (content.end ? 1 : content.lines);

const sideHeight = (content: Content): number | null => {
  switch (content.kind) {
    case "glyph":
    case "spinner":
    case "value":
    case "percent":
    case "timer":
      return islandSize.expandedValue;
    case "tile":
      return TILE;
    // The player's cover, the call's photo and buttons, and the player's meter place themselves as
    // their presets do (toward a corner, or at the top), so they stay out of the row line.
    case "art":
      return content.cover ? null : TILE;
    // A labelled battery, a row status, a small cancel and a clock time sit in `SensorRow`, which is its
    // own row beside the sensor: framing it would move it off the line the label-led presets keep it on.
    // The charging row brings its own frame, on the shortest island's middle.
    case "battery":
      return content.label === "" && !content.wide ? TILE : null;
    case "avatar":
    case "buttons":
      return content.call ? null : SIDE_ROW;
    case "ring":
      return content.icon === null ? 44 : TILE;
    case "meter":
      return content.player ? null : SIDE_METER;
    // `SensorSide inset` drops its row 4 pt below the content top to clear the corner arc; a glyph
    // is 22 pt, taller than the label's 20 pt line, so it sets the row's height.
    case "status":
      return content.row ? null : islandSafe.drop + (content.icon !== null ? islandSize.compactGlyph : islandLine.compact);
    case "text":
      return content.wide ? null : islandSafe.drop + islandLine.title;
    case "label":
      return islandLine.subtitle;
    case "title":
      return !hasSubtitle(content) ? islandLine.title : islandLine.title + islandLine.stackGap + islandLine.subtitle * subtitleLines(content);
    // A sharing activity's picture, text and ring place themselves on the call's 47 pt row, as their presets do.
    case "photo":
    case "device":
    case "media":
    case "share":
    case "none":
    case "dot":
    case "bar":
    case "readout":
    case "route":
    case "scrubber":
    case "cancel":
    case "clock":
    case "track":
    case "caller":
    case "player":
    case "wave":
    case "recorder":
    case "vehicle":
    case "driver":
    case "arrival":
      return null;
    default: {
      const exhaustive: never = content;
      return exhaustive;
    }
  }
};

/**
 * The row line for an expanded view's sides, from what its center holds: a title and subtitle's
 * centre, a one-line title's or subtitle's centre, or with an empty center the taller side's
 * centre, so the two sides sit level with each other. Null when a side's height varies.
 */
export const rowLine = (regions: Pick<Record<Region, Content>, "expandedLeading" | "expandedCenter" | "expandedTrailing">): number | null => {
  const center = regions.expandedCenter;
  switch (center.kind) {
    case "title":
      return hasSubtitle(center) ? islandRow.stackLine : islandRow.titleLine;
    case "text":
      return islandRow.titleLine;
    case "label":
      return islandRow.subtitleLine;
    case "none": {
      const heights = [regions.expandedLeading, regions.expandedTrailing].filter((content) => content.kind !== "none").map(sideHeight);
      if (heights.length === 0 || heights.some((height) => height === null)) return null;
      return Math.max(...heights.map((height) => height ?? 0)) / 2;
    }
    default: {
      const height = sideHeight(center);
      return height === null ? null : islandRow.centerTop + height / 2;
    }
  }
};

/** Round buttons beside the sensor, and the pause and stop a timer or recording has there. */
/** An avatar beside the sensor, and the row line round buttons centre on: 48 pt, as the call preset's. */
const SIDE_ROW = 48;

/** Round buttons beside the sensor: 44 pt, as the call preset's, so a caller's name keeps its room on a phone. */
const ROUND_BUTTON = 44;

/** Tile and art size beside the sensor (`islandSize.expandedTile`). */
const TILE = islandSize.expandedTile;

/** Height of the five-bar meter beside the sensor. */
const SIDE_METER = 15;

/** A glyph before a label in the row beside the sensor, as the label-led presets size theirs. */
const ROW_GLYPH = 18;

/** The battery before a label in that row, as the battery preset sizes it. */
const ROW_BATTERY = labelBatteryWidth;

/** The small cancel in that row, as tall as the row, and its X. */
const ROW_CANCEL = 26;
const ROW_CANCEL_GLYPH = 12;

/** The readout's bar: thin, as the system draws progress under a live activity. */
const READOUT_BAR = 5;

/** Gap between a label-led view's bottom rows. */
const READOUT_GAP = 6;

/** A hero row: the big value on the left, its detail on the same baseline at the right. */
const HERO_ROW = { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, minWidth: 0 } as const;
const HERO_ROW_SOURCE = `{{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, minWidth: 0 }}`;

/** What a detail line names (a file, a device, a plate), in white semibold among the grey. */
const NAME_STYLE = { color: islandInk.primary, fontWeight: 600 } as const;
const NAME_STYLE_SOURCE = `{{ color: islandInk.primary, fontWeight: 600 }}`;

/** "3:16 PM" from a timer as the copied code reads it: when it ends, or when it started. */
const clockSource = (names: SourceNames) =>
  `{new Date(${names.timerSource === "endsAt" ? "endsAt" : "startedAt"}).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;

/** The moment a clock region shows: when the countdown ends, or when the count-up started. */
const clockMoment = (source: TickingTimeSource) => (source.kind === "remaining" ? source.until : source.kind === "elapsed" ? source.since : Date.now());

/**
 * A grey line with one part in white semibold, as the stage draws it and as the code writes it:
 * `before`, then `name`, then `after`, a space between each. Null when all three are empty.
 */
const nameLine = ({ before, name, after }: { before: string; name: string; after: string }): Piece | null => {
  if (name === "") {
    const plain = [before, after].filter((part) => part !== "").join(" ");
    if (plain === "") return null;
    return { node: <ExpandedSubtitle>{plain}</ExpandedSubtitle>, source: `<ExpandedSubtitle>${childText(plain)}</ExpandedSubtitle>`, imports: imports([MOD.text, "ExpandedSubtitle"]), items: ["island-content"] };
  }
  const lead = before === "" ? "" : `${before} `;
  const tail = after === "" ? "" : ` ${after}`;
  // The spaces are part of the strings: JSX drops whitespace at a line break, which would join "to" to the name.
  const rows = [lead === "" ? null : `{${lit(lead)}}`, `<span style=${NAME_STYLE_SOURCE}>${childText(name)}</span>`, tail === "" ? null : `{${lit(tail)}}`].filter(
    (row): row is string => row !== null,
  );
  return {
    node: (
      <ExpandedSubtitle>
        {lead}
        <span style={NAME_STYLE}>{name}</span>
        {tail}
      </ExpandedSubtitle>
    ),
    source: `<ExpandedSubtitle>\n${indent(rows.join("\n"))}\n</ExpandedSubtitle>`,
    imports: imports([MOD.text, "ExpandedSubtitle"], [MOD.theme, "islandInk"]),
    items: ["island-content"],
  };
};

/** Glyph size in a 48 pt round button: the transport and phone glyphs fill a little more of it. */
const roundIconSize = (icon: IconName) => (icon === "Pause" || icon === "Play" ? 22 : 20);

/** A transport glyph in the scrubber's row: play and pause lead, the skips sit a step smaller. */
const transportIconSize = (icon: IconName) => (icon === "Pause" || icon === "Play" ? 32 : 28);

/** A round button's fill and icon colour per tone, as the presets fill them. */
const roundTone = (button: ButtonSpec, accent: string) => {
  switch (button.tone) {
    case "accent":
      return { color: accent, iconColor: undefined, source: "color={accent}" };
    case "neutral":
      return { color: undefined, iconColor: undefined, source: "" };
    case "tinted":
      return { color: tint(accent, 0.24), iconColor: accent, source: "color={tint(accent, 0.24)} iconColor={accent}" };
    case "destructive":
      return { color: islandAccent.red, iconColor: undefined, source: "color={islandAccent.red}" };
    default: {
      const exhaustive: never = button.tone;
      return exhaustive;
    }
  }
};

/** A capsule's tone per button tone: accent capsules carry a black label, as the kit's do. */
const capsuleTone = (button: ButtonSpec, accent: string) => {
  switch (button.tone) {
    case "accent":
      return { tone: { kind: "accent", color: accent } as const, source: `tone={{ kind: "accent", color: accent }}` };
    case "neutral":
      return { tone: undefined, source: "" };
    case "tinted":
      return { tone: { kind: "accent", color: tint(accent, 0.24), text: accent } as const, source: `tone={{ kind: "accent", color: tint(accent, 0.24), text: accent }}` };
    case "destructive":
      return { tone: { kind: "accent", color: islandAccent.red, text: islandInk.primary } as const, source: `tone={{ kind: "accent", color: islandAccent.red, text: islandInk.primary }}` };
    default: {
      const exhaustive: never = button.tone;
      return exhaustive;
    }
  }
};

const toneImportsOf = (buttons: readonly ButtonSpec[]): readonly (readonly [string, string])[] =>
  buttons.flatMap((button): readonly (readonly [string, string])[] =>
    button.tone === "tinted" ? [[MOD.theme, "tint"]] : button.tone === "destructive" ? [[MOD.theme, "islandAccent"], [MOD.theme, "islandInk"]] : [],
  );

/** "3:16 PM": when a countdown ends, in the viewer's own clock. */
const endTimeText = (until: number) => new Date(until).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** The line under a title, as the stage draws it and as the copied code writes it; null for none. */
const titleSubtitle = (content: TitleContent, values: RenderValues, names: SourceNames): { text: string; source: string } | null => {
  if (!content.end) return content.subtitle === "" ? null : { text: content.subtitle, source: attr("subtitle", content.subtitle) };
  // The timer preset's words: when a countdown ends, or when a count-up started, in the viewer's clock.
  const clock = `toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })`;
  if (names.timerSource === "endsAt") {
    return { text: `Ends ${endTimeText(endsAtOf(values.timer) ?? Date.now())}`, source: `subtitle={\`Ends \${new Date(endsAt).${clock}}\`}` };
  }
  const since = values.timer.kind === "elapsed" ? values.timer.since : Date.now();
  return { text: `Started ${endTimeText(since)}`, source: `subtitle={\`Started \${new Date(startedAt).${clock}}\`}` };
};

/** When the stage's timer reaches zero, or null when it counts up. */
const endsAtOf = (source: TickingTimeSource): number | null => (source.kind === "remaining" ? source.until : null);

/** The moment playback started, for a scrubber: the timer's start, or its end less the track. */
const playheadSince = (source: TickingTimeSource, length: number) =>
  source.kind === "elapsed" ? source.since : source.kind === "remaining" ? source.until - length * 1000 : Date.now() - source.ms;

/** Seconds as a millisecond literal with digit separators: 214 to `214_000`. */
const msLiteral = (seconds: number) => String(Math.round(seconds * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, "_");

/** A press with no button behind it (a caption's action, the bar's cancel), as a button spec. */
const pressOf = (label: string, action: ButtonSpec["action"]): ButtonSpec => ({ icon: "X", label, tone: "neutral", action });

/**
 * A caption under a percentage that reads "20 of 48 MB": its first number counts along with the
 * progress, so after Update the caption and the percentage agree. Null for any other caption.
 */
export const progressCaption = (text: string): { total: number; rest: string } | null => {
  const match = /^\d+(?:\.\d+)? of (\d+(?:\.\d+)?)(\D.*)?$/.exec(text);
  const total = Number(match?.[1]);
  if (match === null || !Number.isFinite(total) || total <= 0) return null;
  return { total, rest: match[2] ?? "" };
};

/** How much of `total` has gone at `progress`: one decimal under 10 when the total is 10 or more ("4.8 of 48 MB"), as the upload preset words it. */
export const amountOf = (progress: number, total: number) => {
  const sent = progress * total;
  return total >= 10 && sent < 10 ? sent.toFixed(1) : String(Math.round(sent));
};

/** How much of `total` has gone at `progress` as a sharing activity words it: one decimal under 10, without a trailing zero ("2.5 of 6 MB"). */
export const shareAmount = (progress: number, total: number) => {
  const sent = progress * total;
  return String(sent < 10 ? Math.round(sent * 10) / 10 : Math.round(sent));
};

/** `shareAmount` as the copied code writes it, in a template literal's `${...}`. */
const shareAmountSource = (total: number) => `progress * ${total} < 10 ? Math.round(progress * ${total * 10}) / 10 : Math.round(progress * ${total})`;

/** `amountOf` as the copied code writes it, in a template literal's `${...}`. */
const amountSource = (total: number) => (total >= 10 ? `(progress * ${total}).toFixed(progress * ${total} < 10 ? 1 : 0)` : `Math.round(progress * ${total})`);

/** Escapes text for a template literal. */
const templateText = (value: string) => value.replace(/[`\\]/g, "\\$&").replace(/\$\{/g, "\\${");

/** The line under a big value: a caption, a one-word action, or the time a countdown ends. Null for none. */
const captionPiece = (
  caption: CaptionSpec,
  values: RenderValues,
  names: SourceNames,
  options: { tabular: boolean; end: boolean; progress: boolean },
): Piece | null => {
  if (options.end) {
    // Only a countdown has an end; the code reads it from `endsAt`.
    if (names.timerSource !== "endsAt") return null;
    const until = endsAtOf(values.timer) ?? Date.now();
    return {
      node: <Caption>{endTimeText(until)}</Caption>,
      source: `<Caption>{new Date(endsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Caption>`,
      imports: imports([MOD.text, "Caption"]),
      items: ["island-content"],
    };
  }
  if (caption.text === "") return null;
  if (caption.press !== null) {
    const press = pressOf(caption.text, caption.press);
    return {
      node: (
        <CaptionButton color={values.accent} onPress={() => values.onButton(press)}>
          {caption.text}
        </CaptionButton>
      ),
      source: `<CaptionButton color={accent} ${pressAttr(press, names)}>${childText(caption.text)}</CaptionButton>`,
      imports: imports([MOD.layout, "CaptionButton"]),
      items: ["island-content"],
    };
  }
  const bound = options.progress ? progressCaption(caption.text) : null;
  if (bound !== null) {
    const amount = `{\`\${${amountSource(bound.total)}} of ${bound.total}${templateText(bound.rest)}\`}`;
    return {
      node: <Caption style={tabularFigures}>{`${amountOf(values.progress, bound.total)} of ${bound.total}${bound.rest}`}</Caption>,
      source: `<Caption style={tabularFigures}>${amount}</Caption>`,
      imports: imports([MOD.text, "Caption"], [MOD.text, "tabularFigures"]),
      items: ["island-content"],
    };
  }
  return {
    node: <Caption style={options.tabular ? tabularFigures : undefined}>{caption.text}</Caption>,
    source: options.tabular ? `<Caption style={tabularFigures}>${childText(caption.text)}</Caption>` : `<Caption>${childText(caption.text)}</Caption>`,
    imports: imports([MOD.text, "Caption"], ...(options.tabular ? [[MOD.text, "tabularFigures"] as const] : [])),
    items: ["island-content"],
  };
};

/**
 * A big value beside the sensor, set the way the presets set theirs: with a caption, a
 * `ValueStack` puts the value on the title's baseline and the caption on the subtitle's; alone it
 * goes on the row line like any side content (see `piece`).
 */
const sideValue = (value: Piece, caption: Piece | null, context: PieceContext): Piece => {
  if (caption !== null) {
    const alone = !context.hasBottom;
    return {
      node: <ValueStack value={value.node} caption={caption.node} alone={alone} />,
      source: `<ValueStack\n  value={\n${indent(value.source, 4)}\n  }\n  caption={${caption.source.includes("\n") ? `\n${indent(caption.source, 4)}\n  ` : caption.source}}${alone ? "\n  alone" : ""}\n/>`,
      imports: mergeImports([value.imports, caption.imports, imports([MOD.layout, "ValueStack"])]),
      items: [...value.items, ...caption.items],
      placed: true,
    };
  }
  return value;
};

/**
 * The stage node and the source for one region's content. Leading and trailing content in the
 * expanded view goes on the row line (`context.line`) in an `ExpandedSide` of its own height, so
 * every side sits level with the center and with the other side.
 */
export const piece = (content: Content, region: Region, values: RenderValues, names: SourceNames, context: PieceContext): Piece => {
  const drawn = drawPiece(content, region, values, names, context);
  if (REGION_INFO[region].size !== "side" || drawn.placed === true || context.line === null) return drawn;
  const height = sideHeight(content);
  if (height === null) return drawn;
  return framed(drawn, { height, line: context.line, align: region === "expandedTrailing" ? "end" : "start" });
};

const drawPiece = (content: Content, region: Region, values: RenderValues, names: SourceNames, context: PieceContext): Piece => {
  const { accent } = values;
  const size = REGION_INFO[region].size;
  const big = size !== "compact";
  const end = region === "expandedTrailing";
  switch (content.kind) {
    case "none":
      return EMPTY;
    case "glyph": {
      return {
        node: <Glyph icon={iconComponent(content.icon)} color={toneColor(content.tone, accent)} size={big ? 34 : undefined} />,
        source: `<Glyph icon={${iconIdentifier(content.icon)}} color={${toneSource(content.tone)}}${big ? " size={34}" : ""} />`,
        imports: imports([MOD.glyph, "Glyph"], iconImport(content.icon), ...toneImports(content.tone)),
        items: ["island-content"],
      };
    }
    case "tile": {
      return {
        node: <IconTile icon={iconComponent(content.icon)} accent={accent} />,
        source: `<IconTile icon={${iconIdentifier(content.icon)}} accent={accent} />`,
        imports: imports([MOD.glyph, "IconTile"], iconImport(content.icon)),
        items: ["island-content"],
      };
    }
    case "art": {
      // A sample track's photograph, as the stage's preset shows it; any other seed draws its cover.
      const src = sampleCover(content.seed)?.artwork;
      const srcAttr = src === undefined ? "" : ` ${sampleSrc(src)}`;
      if (big && content.cover) {
        // The music player's cover, set in toward the corner as the preset sets it.
        return {
          node: <PlayerCover seed={content.seed} src={src} />,
          source: `<PlayerCover ${attr("seed", content.seed)}${srcAttr} />`,
          imports: imports([MOD.nowPlaying, "PlayerCover"]),
          items: ["island-content", "artwork", "now-playing-activity"],
        };
      }
      const artSize = big ? TILE : 22;
      const radius = big ? 12 : 6;
      return {
        node: <Artwork seed={content.seed} src={src} size={artSize} radius={radius} />,
        source: `<Artwork ${attr("seed", content.seed)}${srcAttr} size={${artSize}} radius={${radius}} />`,
        imports: imports([MOD.artwork, "Artwork"]),
        items: ["island-content", "artwork"],
      };
    }
    case "avatar": {
      // The sample caller's photo, as the stage's preset shows it; any other name draws initials.
      const photo = samplePhoto(content.name);
      const srcAttr = photo === undefined ? "" : ` ${sampleSrc(photo)}`;
      if (!big) {
        return {
          node: <Avatar name={content.name} src={photo} />,
          source: `<Avatar ${attr("name", content.name)}${srcAttr} />`,
          imports: imports([MOD.avatar, "Avatar"]),
          items: ["island-content", "avatar", "artwork"],
        };
      }
      if (content.call) {
        // The incoming call's photo, out toward the corner as the call preset sets it.
        return {
          node: <CallAvatar name={content.name} src={photo} />,
          source: `<CallAvatar ${attr("name", content.name)}${srcAttr} />`,
          imports: imports([MOD.call, "CallAvatar"]),
          items: ["island-content", "avatar", "artwork", "call-activity"],
        };
      }
      // Placed on the row line by `piece`, level with the name beside it, as a call's photo sits.
      return {
        node: <Avatar name={content.name} src={photo} size={SIDE_ROW} />,
        source: `<Avatar ${attr("name", content.name)}${srcAttr} size={${SIDE_ROW}} />`,
        imports: imports([MOD.avatar, "Avatar"]),
        items: ["island-content", "avatar", "artwork"],
      };
    }
    case "photo": {
      const sample = photoSource(content.photo);
      const srcAttr = sample === null ? "" : ` ${sampleSrc(sample.src)}`;
      const thumb = (size: number, radius: number) => ({
        node: <Thumbnail src={sample?.src} size={size} radius={radius} fallback={UploadGlyph} accent={accent} />,
        source: `<Thumbnail${srcAttr}${size === mediaCompact.thumb ? "" : ` size={${size}}`} radius={${radius}} fallback={UploadGlyph} accent={accent} />`,
      });
      const pieceImports = imports([MOD.media, "Thumbnail"], [MOD.glyphs, "UploadGlyph"]);
      const items: readonly RegistryItemName[] = ["island-content", "avatar", "progress-ring", "island-button", "media-row"];
      if (big) {
        const lead = thumb(mediaRow.photo, mediaRow.photoRadius);
        return { node: <MediaLead>{lead.node}</MediaLead>, source: `<MediaLead>\n  ${lead.source}\n</MediaLead>`, imports: mergeImports([pieceImports, imports([MOD.media, "MediaLead"])]), items };
      }
      if (region === "minimal") {
        const small = thumb(mediaCompact.bubbleThumb, mediaCompact.thumbRadius);
        return { ...small, imports: pieceImports, items };
      }
      const pill = thumb(mediaCompact.thumb, mediaCompact.thumbRadius);
      if (!context.pairInBubble) return { ...pill, imports: pieceImports, items };
      // In the split's bubble a 22 pt thumbnail leaves the ring after it whole, as the upload's does.
      const small = thumb(mediaCompact.bubbleThumb, mediaCompact.thumbRadius);
      return {
        node: <BubbleForm bubble={small.node}>{pill.node}</BubbleForm>,
        source: `<BubbleForm bubble={${small.source}}>\n  ${pill.source}\n</BubbleForm>`,
        imports: mergeImports([pieceImports, imports([MOD.text, "BubbleForm"])]),
        items,
      };
    }
    case "device": {
      const sample = big ? photoSource(content.photo) : null;
      const props = [`icon={${iconIdentifier(content.icon)}}`, "accent={accent}", big ? `size={${mediaRow.lead}}` : null, sample === null ? null : sampleSrc(sample.src)].filter(
        (prop): prop is string => prop !== null,
      );
      const node = <SharePicture icon={iconComponent(content.icon)} accent={accent} size={big ? mediaRow.lead : undefined} src={sample?.src} />;
      const source = `<SharePicture ${props.join(" ")} />`;
      const pieceImports = imports([MOD.media, "SharePicture"], iconImport(content.icon), ...(big ? [[MOD.media, "MediaLead"] as const] : []));
      const items: readonly RegistryItemName[] = ["island-content", "avatar", "progress-ring", "island-button", "media-row"];
      return big ? { node: <MediaLead>{node}</MediaLead>, source: `<MediaLead>\n  ${source}\n</MediaLead>`, imports: pieceImports, items } : { node, source, imports: pieceImports, items };
    }
    case "media": {
      const done = isDone(values.progress);
      const doneSubtitle = content.doneSubtitle ?? "";
      const doneTitle = content.doneTitle ?? "";
      const subtitle = done && doneSubtitle !== "" ? doneSubtitle : content.subtitle;
      const title = done && doneTitle !== "" ? doneTitle : content.title;
      const bound = progressCaption(content.detail);
      // Done, a counting detail reads as the whole size ("6 MB"), as the upload preset words it.
      const whole = bound === null ? "" : `${bound.total}${bound.rest}`;
      const detailText = bound === null ? content.detail : done ? whole : `${shareAmount(values.progress, bound.total)} of ${bound.total}${bound.rest}`;
      const detailSource =
        bound === null
          ? attr("detail", content.detail)
          : `detail={${DONE_SOURCE} ? ${lit(whole)} : \`\${${shareAmountSource(bound.total)}} of ${bound.total}${templateText(bound.rest)}\`}`;
      const subtitleSource = (name: string) => doneAttr(name, content.subtitle, doneSubtitle);
      const line = content.detail === "" ? null : <MediaLine name={subtitle} detail={detailText} />;
      const lineSource = content.detail === "" ? subtitleSource("line") : `line={<MediaLine ${subtitleSource("name")} ${detailSource} />}`;
      return {
        node: <MediaText line={line ?? subtitle} title={title} />,
        source: `<MediaText ${lineSource} ${doneAttr("title", content.title, doneTitle)} />`,
        imports: imports([MOD.media, "MediaText"], ...(line === null ? [] : [[MOD.media, "MediaLine"] as const])),
        items: ["island-content", "avatar", "progress-ring", "island-button", "media-row"],
      };
    }
    case "share": {
      const press = pressOf("Stop", content.action);
      const stops = big && content.mark === "stop";
      const props = [
        "value={progress}",
        "accent={accent}",
        content.mark === "none" ? null : `mark="${content.mark}"`,
        big ? `size={${mediaRow.ring}}` : null,
        stops ? `onStop={${buttonPress(press, names)}}` : null,
      ].filter((prop): prop is string => prop !== null);
      const node = (
        <ShareRing value={values.progress} accent={accent} mark={content.mark} size={big ? mediaRow.ring : undefined} onStop={stops ? () => values.onButton(press) : undefined} />
      );
      const source = `<ShareRing ${props.join(" ")} />`;
      const items: readonly RegistryItemName[] = ["island-content", "avatar", "progress-ring", "island-button", "media-row"];
      return big
        ? { node: <MediaTrail>{node}</MediaTrail>, source: `<MediaTrail>\n  ${source}\n</MediaTrail>`, imports: imports([MOD.media, "ShareRing"], [MOD.media, "MediaTrail"]), items }
        : { node, source, imports: imports([MOD.media, "ShareRing"]), items };
    }
    case "dot":
      return {
        node: <RecordingDot color={accent} />,
        source: `<RecordingDot color={accent} />`,
        imports: imports([MOD.recording, "RecordingDot"]),
        items: ["island-content", "recording-activity"],
      };
    case "text": {
      const color = toneColor(content.tone, accent);
      const colorSource = toneSource(content.tone);
      const text = childText(content.text);
      if (size === "compact" && content.wide) {
        // The charging pill's label: the side as wide as the engine allows, the text in from the pill's end.
        const white = content.tone === "primary";
        return {
          node: <ChargingLabel color={color}>{content.text}</ChargingLabel>,
          source: `<ChargingLabel${white ? "" : ` color={${colorSource}}`}>${text}</ChargingLabel>`,
          imports: imports([MOD.battery, "ChargingLabel"], ...(white ? [] : toneImports(content.tone))),
          items: ["island-content", "battery-activity"],
        };
      }
      if (size === "side" && content.wide) {
        // The charging row's label, as the battery preset opens it: on the island's middle, with its grey line under it.
        const white = content.tone === "primary";
        const detail = content.detail ?? "";
        return {
          node: (
            <ChargingRowLabel color={color} detail={detail === "" ? undefined : detail}>
              {content.text}
            </ChargingRowLabel>
          ),
          source: `<ChargingRowLabel${detail === "" ? "" : ` ${attr("detail", detail)}`}${white ? "" : ` color={${colorSource}}`}>${text}</ChargingRowLabel>`,
          imports: imports([MOD.battery, "ChargingRowLabel"], ...(white ? [] : toneImports(content.tone))),
          items: ["island-content", "battery-activity"],
          placed: true,
        };
      }
      if (size === "compact") {
        return {
          node: <CompactText color={color}>{content.text}</CompactText>,
          source: `<CompactText color={${colorSource}}>${text}</CompactText>`,
          imports: imports([MOD.text, "CompactText"], ...toneImports(content.tone)),
          items: ["island-content"],
        };
      }
      if (size === "bottom") {
        // Centred, as SwiftUI centres a bottom region's content and as the region map draws it.
        return {
          node: (
            <ExpandedBottom reach="lift">
              <ExpandedSubtitle color={color} style={{ textAlign: "center" }}>
                {content.text}
              </ExpandedSubtitle>
            </ExpandedBottom>
          ),
          source: `<ExpandedBottom reach="lift">\n  <ExpandedSubtitle color={${colorSource}} style={{ textAlign: "center" }}>\n    ${text}\n  </ExpandedSubtitle>\n</ExpandedBottom>`,
          imports: imports([MOD.layout, "ExpandedBottom"], [MOD.text, "ExpandedSubtitle"], ...toneImports(content.tone)),
          items: ["island-content"],
        };
      }
      if (size === "side") {
        // Beside the sensor the text starts at the content box's top corner, where the island's
        // corner arc cut its outer letters ("Labe"). `SensorSide inset` moves it clear of the arc,
        // lets it size to its own width and ends it in an ellipsis before it reaches the sensor.
        return {
          node: (
            <SensorSide align={end ? "end" : "start"} inset>
              <ExpandedTitle color={color}>{content.text}</ExpandedTitle>
            </SensorSide>
          ),
          source: `<SensorSide${end ? ` align="end"` : ""} inset>\n  <ExpandedTitle color={${colorSource}}>${text}</ExpandedTitle>\n</SensorSide>`,
          imports: imports([MOD.layout, "SensorSide"], [MOD.text, "ExpandedTitle"], ...toneImports(content.tone)),
          items: ["island-content"],
        };
      }
      return {
        node: <ExpandedTitle color={color}>{content.text}</ExpandedTitle>,
        source: `<ExpandedTitle color={${colorSource}}>${text}</ExpandedTitle>`,
        imports: imports([MOD.text, "ExpandedTitle"], ...toneImports(content.tone)),
        items: ["island-content"],
      };
    }
    case "status": {
      // Beside the sensor, lined up with a row of controls under it and clear of the top corner.
      const { icon } = content;
      const glyphSize = content.row ? ROW_GLYPH : undefined;
      const sizeSource = glyphSize === undefined ? "" : ` size={${glyphSize}}`;
      const glyph =
        icon === null ? null : <Glyph icon={iconComponent(icon)} color={toneColor(content.iconTone, accent)} size={glyphSize} />;
      const glyphSource =
        icon === null ? "" : ` glyph={<Glyph icon={${iconIdentifier(icon)}} color={${toneSource(content.iconTone)}}${sizeSource} />}`;
      const iconImports = icon === null ? [] : [[MOD.glyph, "Glyph"] as const, iconImport(icon), ...toneImports(content.iconTone)];
      if (content.row) {
        // In the label-led views' row: level with a small cancel opposite, as the upload's "Uploading" sits.
        const grey = content.tone === "secondary";
        return {
          node: (
            <SensorRow glyph={glyph ?? undefined} align={end ? "end" : "start"}>
              <ContextLabel color={toneColor(content.tone, accent)}>{content.text}</ContextLabel>
            </SensorRow>
          ),
          // Grey is the label's own colour, so the code leaves it out, as the presets do.
          source: `<SensorRow${glyphSource}${end ? ` align="end"` : ""}>\n  <ContextLabel${grey ? "" : ` color={${toneSource(content.tone)}}`}>${childText(content.text)}</ContextLabel>\n</SensorRow>`,
          imports: imports([MOD.layout, "SensorRow"], [MOD.text, "ContextLabel"], ...(grey ? [] : toneImports(content.tone)), ...iconImports),
          items: ["island-content"],
        };
      }
      return {
        node: (
          <SensorSide glyph={glyph ?? undefined} align={end ? "end" : "start"} inset>
            <CompactText color={toneColor(content.tone, accent)}>{content.text}</CompactText>
          </SensorSide>
        ),
        source: `<SensorSide${glyphSource}${end ? ` align="end"` : ""} inset>\n  <CompactText color={${toneSource(content.tone)}}>${childText(content.text)}</CompactText>\n</SensorSide>`,
        imports: imports([MOD.layout, "SensorSide"], [MOD.text, "CompactText"], ...toneImports(content.tone), ...iconImports),
        items: ["island-content"],
      };
    }
    case "label":
      // Grey and set toward the trailing value, as a timer's name sits beside its time.
      return {
        node: <ExpandedSubtitle style={{ textAlign: "right" }}>{content.text}</ExpandedSubtitle>,
        source: `<ExpandedSubtitle style={{ textAlign: "right" }}>${childText(content.text)}</ExpandedSubtitle>`,
        imports: imports([MOD.text, "ExpandedSubtitle"]),
        items: ["island-content"],
      };
    case "title": {
      const subtitle = titleSubtitle(content, values, names);
      const lines = subtitle !== null && subtitleLines(content) === 2 ? 2 : 1;
      // In the bottom row the stack is centred, like the row's other text.
      const centred = size === "bottom";
      const stack = <TitleStack title={content.title} subtitle={subtitle?.text} subtitleLines={lines} align={centred ? "center" : "start"} />;
      const stackSource = `<TitleStack ${attr("title", content.title)}${subtitle === null ? "" : ` ${subtitle.source}`}${lines === 2 ? " subtitleLines={2}" : ""}${centred ? ` align="center"` : ""} />`;
      if (size === "bottom") {
        return {
          node: <ExpandedBottom reach="lift">{stack}</ExpandedBottom>,
          source: `<ExpandedBottom reach="lift">\n  ${stackSource}\n</ExpandedBottom>`,
          imports: imports([MOD.layout, "ExpandedBottom"], [MOD.text, "TitleStack"]),
          items: ["island-content"],
        };
      }
      return { node: stack, source: stackSource, imports: imports([MOD.text, "TitleStack"]), items: ["island-content"] };
    }
    case "value": {
      const value: Piece = {
        node: (
          <ExpandedValue color={accent} unit={content.unit === "" ? undefined : content.unit}>
            {content.text}
          </ExpandedValue>
        ),
        source: `<ExpandedValue color={accent}${content.unit === "" ? "" : ` ${attr("unit", content.unit)}`}>${childText(content.text)}</ExpandedValue>`,
        imports: imports([MOD.text, "ExpandedValue"]),
        items: ["island-content"],
      };
      return sideValue(value, captionPiece(content.caption, values, names, { tabular: false, end: false, progress: false }), context);
    }
    case "percent": {
      const percent = percentOf(values.progress);
      if (size === "compact") {
        return {
          node: (
            <CompactText color={accent}>
              <NumberText value={`${percent}%`} motion="steady" />
            </CompactText>
          ),
          source: "<CompactText color={accent}>\n  <NumberText value={`${Math.round(progress * 100)}%`} motion=\"steady\" />\n</CompactText>",
          imports: imports([MOD.text, "CompactText"], [MOD.text, "NumberText"]),
          items: ["island-content"],
        };
      }
      const value: Piece = {
        node: (
          <ExpandedValue color={accent} unit="%">
            <NumberText value={percent} motion="steady" />
          </ExpandedValue>
        ),
        source: `<ExpandedValue color={accent} unit="%">\n  <NumberText value={Math.round(progress * 100)} motion="steady" />\n</ExpandedValue>`,
        imports: imports([MOD.text, "ExpandedValue"], [MOD.text, "NumberText"]),
        items: ["island-content"],
      };
      return sideValue(value, captionPiece(content.caption, values, names, { tabular: true, end: false, progress: true }), context);
    }
    case "timer": {
      const minutes = content.format === "minutes";
      const time = minutes ? <TickingTime source={values.timer} format={formatMinutes} /> : <TickingTime source={values.timer} />;
      const timeSource = `<TickingTime source={${timerSourceSource(names)}}${minutes ? " format={formatMinutes}" : ""} />`;
      const color = toneColor(content.tone, accent);
      const colorSource = toneSource(content.tone);
      const timeImports = imports([MOD.time, "TickingTime"], ...(minutes ? [[MOD.time, "formatMinutes"] as const] : []), ...toneImports(content.tone));
      if (size === "compact") {
        // Minutes read "6 mins" (or "1 min") in compact at regular weight, as the ride preset's do.
        const pill: Piece = {
          node: minutes ? (
            <CompactText color={color} style={REGULAR}>
              <TickingTime source={values.timer} format={minutesWithUnit} />
            </CompactText>
          ) : (
            <CompactText color={color}>{time}</CompactText>
          ),
          source: minutes
            ? `<CompactText color={${colorSource}} style={{ fontWeight: 400 }}>\n  <TickingTime source={${timerSourceSource(names)}} format={(ms) => {\n    const count = formatMinutes(ms);\n    return \`\${count} \${count === "1" ? "min" : "mins"}\`;\n  }} />\n</CompactText>`
            : `<CompactText color={${colorSource}}>\n  ${timeSource}\n</CompactText>`,
          imports: mergeImports([timeImports, imports([MOD.text, "CompactText"])]),
          items: ["island-content", "ticking-time"],
        };
        if (region !== "compactTrailing" || !context.bubbleMinutes) return pill;
        // In the split's bubble the same countdown reads in whole minutes, bare: "5" beside the glyph.
        const bubbleSource = `<CompactText color={${colorSource}}>\n  <TickingTime source={${timerSourceSource(names)}} format={formatMinutes} />\n</CompactText>`;
        return {
          node: (
            <BubbleForm
              bubble={
                <CompactText color={color}>
                  <TickingTime source={values.timer} format={formatMinutes} />
                </CompactText>
              }
            >
              {pill.node}
            </BubbleForm>
          ),
          source: `<BubbleForm\n  bubble={\n${indent(bubbleSource, 4)}\n  }\n>\n${indent(pill.source)}\n</BubbleForm>`,
          imports: mergeImports([pill.imports, imports([MOD.text, "BubbleForm"], [MOD.time, "formatMinutes"])]),
          items: pill.items,
        };
      }
      const value: Piece = {
        node: (
          <ExpandedValue color={color} unit={minutes ? "min" : undefined}>
            {time}
          </ExpandedValue>
        ),
        source: `<ExpandedValue color={${colorSource}}${minutes ? ` unit="min"` : ""}>\n  ${timeSource}\n</ExpandedValue>`,
        imports: mergeImports([timeImports, imports([MOD.text, "ExpandedValue"])]),
        items: ["island-content", "ticking-time"],
      };
      return sideValue(value, captionPiece(content.caption, values, names, { tabular: false, end: content.end, progress: false }), context);
    }
    case "ring": {
      if (big && content.icon !== null) {
        return {
          node: <IconRing icon={iconComponent(content.icon)} value={values.progress} accent={accent} size={TILE} />,
          source: `<IconRing icon={${iconIdentifier(content.icon)}} value={progress} accent={accent} size={${TILE}} />`,
          imports: imports([MOD.ring, "IconRing"], iconImport(content.icon)),
          items: ["island-content", "progress-ring"],
        };
      }
      const ringSize = big ? 44 : 22;
      const sizeProps = big ? " size={44} thickness={4}" : "";
      const open = `<ProgressRing value={progress} color={accent} track={tint(accent, 0.25)}${sizeProps}`;
      return {
        node: (
          <ProgressRing value={values.progress} color={accent} track={tint(accent, 0.25)} size={ringSize} thickness={big ? 4 : undefined}>
            {content.icon === null ? null : <IconArt name={content.icon} size={11} color={accent} />}
          </ProgressRing>
        ),
        source: content.icon === null ? `${open} />` : `${open}>\n  ${iconArtSource(content.icon, 11, "accent")}\n</ProgressRing>`,
        imports: imports([MOD.ring, "ProgressRing"], [MOD.theme, "tint"], ...(content.icon === null ? [] : [iconImport(content.icon)])),
        items: ["island-content", "progress-ring"],
      };
    }
    case "spinner":
      return {
        node: big ? <Spinner size={34} thickness={3} color={accent} /> : <Spinner color={accent} />,
        source: big ? `<Spinner size={34} thickness={3} color={accent} />` : `<Spinner color={accent} />`,
        imports: imports([MOD.spinner, "Spinner"]),
        items: ["island-content", "spinner"],
      };
    case "meter": {
      if (content.player && size !== "bottom") {
        // The music player's meter: six narrow bars in the pill (four in the split's bubble), and in the expanded view's top corner.
        const where = region === "minimal" ? "minimal" : size === "compact" ? "compact" : "expanded";
        const meter: Piece = {
          node: <PlayerMeter color={accent} size={where} />,
          source: `<PlayerMeter color={accent} size="${where}" />`,
          imports: imports([MOD.nowPlaying, "PlayerMeter"]),
          items: ["island-content", "level-meter", "now-playing-activity"],
        };
        if (where !== "compact" || !context.pairInBubble) return meter;
        return {
          node: <BubbleForm bubble={<PlayerMeter color={accent} size="minimal" />}>{meter.node}</BubbleForm>,
          source: `<BubbleForm bubble={<PlayerMeter color={accent} size="minimal" />}>\n  ${meter.source}\n</BubbleForm>`,
          imports: mergeImports([meter.imports, imports([MOD.text, "BubbleForm"])]),
          items: meter.items,
        };
      }
      if (size === "bottom") {
        // The end bars reach the bottom corners, so the row is pulled in from the sides; it fits as many whole bars as it has room for.
        return {
          node: (
            <ExpandedBottom reach="inset">
              <LevelMeter fill bars={56} color={accent} height={28} barWidth={3} gap={3} />
            </ExpandedBottom>
          ),
          source: `<ExpandedBottom reach="inset">\n  <LevelMeter fill bars={56} color={accent} height={28} barWidth={3} gap={3} />\n</ExpandedBottom>`,
          imports: imports([MOD.layout, "ExpandedBottom"], [MOD.meter, "LevelMeter"]),
          items: ["island-content", "level-meter"],
        };
      }
      if (!big) {
        const bars = content.compactBars === 3 ? " bars={3}" : "";
        return {
          node: <LevelMeter bars={content.compactBars} color={accent} height={15} />,
          source: `<LevelMeter${bars} color={accent} height={15} />`,
          imports: imports([MOD.meter, "LevelMeter"]),
          items: ["island-content", "level-meter"],
        };
      }
      // Kept off the outer edge, as the now-playing meter sits; `piece` puts it on the row line.
      const pad = end ? "paddingRight" : "paddingLeft";
      return {
        node: (
          <span style={{ display: "block", [pad]: 4 }}>
            <LevelMeter bars={5} color={accent} height={SIDE_METER} />
          </span>
        ),
        source: `<span style={{ display: "block", ${pad}: 4 }}>\n  <LevelMeter bars={5} color={accent} height={${SIDE_METER}} />\n</span>`,
        imports: imports([MOD.meter, "LevelMeter"]),
        items: ["island-content", "level-meter"],
      };
    }
    case "battery": {
      const level = values.progress;
      // A label beside it is the labelled row below: the charging row has no place for one.
      if (size === "side" && content.wide && content.label === "") {
        // The charging row's level, as the battery preset opens it: the percentage and battery on the island's middle.
        return {
          node: <ChargingRowLevel level={level} color={accent} charging={content.charging} />,
          source: `<ChargingRowLevel level={progress} color={accent}${content.charging ? " charging" : ""} />`,
          imports: imports([MOD.battery, "ChargingRowLevel"]),
          items: ["island-content", "battery-activity"],
          placed: true,
        };
      }
      if (big && content.label !== "") {
        // A label after it, in the row beside the sensor, as the battery preset's "Charging".
        return {
          node: (
            <SensorRow glyph={<BatteryGlyph level={level} color={accent} charging={content.charging} width={ROW_BATTERY} />} align={end ? "end" : "start"}>
              <ContextLabel>{content.label}</ContextLabel>
            </SensorRow>
          ),
          source: `<SensorRow\n  glyph={<BatteryGlyph level={progress} color={accent}${content.charging ? " charging" : ""} width={${ROW_BATTERY}} />}${end ? `\n  align="end"` : ""}\n>\n  <ContextLabel>${childText(content.label)}</ContextLabel>\n</SensorRow>`,
          imports: imports([MOD.battery, "BatteryGlyph"], [MOD.layout, "SensorRow"], [MOD.text, "ContextLabel"]),
          items: ["island-content", "battery-activity"],
        };
      }
      if (big) {
        return {
          node: (
            <span style={{ display: "grid", placeItems: "center", width: TILE, height: TILE }}>
              <BatteryGlyph level={level} color={accent} charging={content.charging} width={46} />
            </span>
          ),
          source: `<span style={{ display: "grid", placeItems: "center", width: ${TILE}, height: ${TILE} }}>\n  <BatteryGlyph level={progress} color={accent}${content.charging ? " charging" : ""} width={46} />\n</span>`,
          imports: imports([MOD.battery, "BatteryGlyph"]),
          items: ["island-content", "battery-activity"],
        };
      }
      if (!big && content.wide) {
        // The charging pill's level: the percentage and a 35.5 pt battery, the side as wide as the engine allows.
        return {
          node: <ChargingLevel level={level} color={accent} charging={content.charging} />,
          source: `<ChargingLevel level={progress} color={accent}${content.charging ? " charging" : ""} />`,
          imports: imports([MOD.battery, "ChargingLevel"]),
          items: ["island-content", "battery-activity"],
        };
      }
      const glyph = <BatteryGlyph level={level} color={accent} charging={content.charging} />;
      const glyphSource = `<BatteryGlyph level={progress} color={accent}${content.charging ? " charging" : ""} />`;
      if (!content.percent) return { node: glyph, source: glyphSource, imports: imports([MOD.battery, "BatteryGlyph"]), items: ["island-content", "battery-activity"] };
      return {
        node: (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CompactText color={accent}>
              <NumberText value={`${percentOf(level)}%`} motion="steady" />
            </CompactText>
            {glyph}
          </span>
        ),
        source: `<span style={{ display: "flex", alignItems: "center", gap: 6 }}>\n  <CompactText color={accent}>\n    <NumberText value={\`\${Math.round(progress * 100)}%\`} motion="steady" />\n  </CompactText>\n  ${glyphSource}\n</span>`,
        imports: imports([MOD.battery, "BatteryGlyph"], [MOD.text, "CompactText"], [MOD.text, "NumberText"]),
        items: ["island-content", "battery-activity"],
      };
    }
    case "bar": {
      const { caption, cancel } = content;
      const bar = <LinearProgress value={values.progress} color={accent} />;
      const barSource = `<LinearProgress value={progress} color={accent} />`;
      // The bar alone sits on the bottom line, its round ends cut by the corner arc as on iOS.
      if (caption === "" && !cancel) {
        return {
          node: <ExpandedBottom>{bar}</ExpandedBottom>,
          source: `<ExpandedBottom>\n  ${barSource}\n</ExpandedBottom>`,
          imports: imports([MOD.layout, "ExpandedBottom"], [MOD.bar, "LinearProgress"]),
          items: ["island-content", "linear-progress"],
        };
      }
      const press = pressOf("Cancel", "dismiss");
      const cancelSize = 36;
      // A cancel button moves in just far enough that the corner arc leaves the circle whole; a
      // caption alone pulls the row in from the corners rather than lifting it.
      const clear = cornerClearance(cancelSize);
      const rowStyle = cancel ? { paddingRight: clear, paddingBottom: clear } : undefined;
      const node = (
        <ExpandedBottom reach={cancel ? undefined : "inset"} style={rowStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: cancel ? 12 : 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>{bar}</div>
            {caption === "" ? null : <Caption>{caption}</Caption>}
            {cancel ? (
              <IslandRoundButton label="Cancel" size={cancelSize} onPress={() => values.onButton(press)}>
                <IconArt name="X" size={16} />
              </IslandRoundButton>
            ) : null}
          </div>
        </ExpandedBottom>
      );
      const open = cancel ? `<ExpandedBottom style={{ paddingRight: cornerClearance(${cancelSize}), paddingBottom: cornerClearance(${cancelSize}) }}>` : `<ExpandedBottom reach="inset">`;
      const rowItems = [
        `<div style={{ flex: 1, minWidth: 0 }}>\n  ${barSource}\n</div>`,
        caption === "" ? null : `<Caption>${childText(caption)}</Caption>`,
        cancel ? `<IslandRoundButton label="Cancel" size={${cancelSize}} ${pressAttr(press, names)}>\n  ${iconArtSource("X", 16)}\n</IslandRoundButton>` : null,
      ].filter((item): item is string => item !== null);
      return {
        node,
        source: `${open}\n  <div style={{ display: "flex", alignItems: "center", gap: ${cancel ? 12 : 10} }}>\n${rowItems.map((item) => indent(item, 4)).join("\n")}\n  </div>\n</ExpandedBottom>`,
        imports: imports(
          [MOD.layout, "ExpandedBottom"],
          [MOD.bar, "LinearProgress"],
          ...(caption === "" ? [] : [[MOD.text, "Caption"] as const]),
          ...(cancel ? [[MOD.layout, "cornerClearance"] as const, [MOD.button, "IslandRoundButton"] as const, iconImport("X")] : []),
        ),
        items: ["island-content", "linear-progress", ...(cancel ? (["island-button"] as const) : [])],
      };
    }
    case "readout": {
      const percent = percentOf(values.progress);
      const color = toneColor(content.tone, accent);
      const colorSource = toneSource(content.tone);
      const bound = progressCaption(content.detail);
      const detailText = bound === null ? content.detail : `${amountOf(values.progress, bound.total)} of ${bound.total}${bound.rest}`;
      const detailSource = bound === null ? childText(content.detail) : `{\`\${${amountSource(bound.total)}} of ${bound.total}${templateText(bound.rest)}\`}`;
      // A detail that leads with a count ("20 of 48 MB", "3 photos") takes tabular figures, as the
      // upload and transfer set theirs; a sentence ("Full in 55 min") keeps proportional ones.
      const tabular = /^\d/.test(content.detail);
      const detail =
        content.detail === "" ? null : (
          <ExpandedSubtitle style={tabular ? { ...tabularFigures, flex: "0 1 auto" } : { flex: "0 1 auto" }}>{detailText}</ExpandedSubtitle>
        );
      const detailRow =
        content.detail === "" ? null : `<ExpandedSubtitle style={{ ${tabular ? "...tabularFigures, " : ""}flex: "0 1 auto" }}>${detailSource}</ExpandedSubtitle>`;
      const line = nameLine(content);
      const bar = `<LinearProgress value={progress} color={accent} height={${READOUT_BAR}} />`;
      const heroSource = `<div style=${HERO_ROW_SOURCE}>\n  <ExpandedValue color={${colorSource}} unit="%">\n    <NumberText value={Math.round(progress * 100)} motion="steady" />\n  </ExpandedValue>${detailRow === null ? "" : `\n  ${detailRow}`}\n</div>`;
      const rows = [heroSource, line?.source ?? null, `<BottomBar>\n  ${bar}\n</BottomBar>`].filter((row): row is string => row !== null);
      return {
        node: (
          <ExpandedBottom gap={READOUT_GAP}>
            <div style={HERO_ROW}>
              <ExpandedValue color={color} unit="%">
                <NumberText value={percent} motion="steady" />
              </ExpandedValue>
              {detail}
            </div>
            {line?.node}
            <BottomBar>
              <LinearProgress value={values.progress} color={accent} height={READOUT_BAR} />
            </BottomBar>
          </ExpandedBottom>
        ),
        source: `<ExpandedBottom gap={${READOUT_GAP}}>\n${indent(rows.join("\n"))}\n</ExpandedBottom>`,
        imports: mergeImports([
          imports(
            [MOD.layout, "ExpandedBottom"],
            [MOD.layout, "BottomBar"],
            [MOD.text, "ExpandedValue"],
            [MOD.text, "NumberText"],
            [MOD.bar, "LinearProgress"],
            ...toneImports(content.tone),
            ...(content.detail === "" ? [] : [[MOD.text, "ExpandedSubtitle"] as const]),
            ...(tabular && content.detail !== "" ? [[MOD.text, "tabularFigures"] as const] : []),
          ),
          line?.imports ?? new Map(),
        ]),
        items: ["island-content", "linear-progress"],
      };
    }
    case "cancel": {
      const press = pressOf(content.label, content.action);
      return {
        node: (
          <SensorRow align={end ? "end" : "start"}>
            <IslandRoundButton label={content.label} size={ROW_CANCEL} onPress={() => values.onButton(press)}>
              <IconArt name="X" size={ROW_CANCEL_GLYPH} />
            </IslandRoundButton>
          </SensorRow>
        ),
        source: `<SensorRow${end ? ` align="end"` : ""}>\n  <IslandRoundButton ${attr("label", content.label)} size={${ROW_CANCEL}} ${pressAttr(press, names)}>\n    ${iconArtSource("X", ROW_CANCEL_GLYPH)}\n  </IslandRoundButton>\n</SensorRow>`,
        imports: imports([MOD.layout, "SensorRow"], [MOD.button, "IslandRoundButton"], iconImport("X")),
        items: ["island-content", "island-button"],
      };
    }
    case "clock":
      // A ride's arrival, as the ride preset sets it: tabular, so the minutes don't shift it as they change.
      return {
        node: (
          <SensorRow align={end ? "end" : "start"}>
            <ContextLabel style={tabularFigures}>{endTimeText(clockMoment(values.timer))}</ContextLabel>
          </SensorRow>
        ),
        source: `<SensorRow${end ? ` align="end"` : ""}>\n  <ContextLabel style={tabularFigures}>\n    ${clockSource(names)}\n  </ContextLabel>\n</SensorRow>`,
        imports: imports([MOD.layout, "SensorRow"], [MOD.text, "ContextLabel"], [MOD.text, "tabularFigures"]),
        items: ["island-content"],
      };
    case "route": {
      const vehicle = iconComponent(content.vehicle);
      const destination = iconComponent(content.destination);
      const routeSource = `<RouteBar progress={progress} accent={accent} vehicle={${iconIdentifier(content.vehicle)}} destination={${iconIdentifier(content.destination)}} />`;
      const routeImports = imports([MOD.eta, "RouteBar"], iconImport(content.vehicle), iconImport(content.destination));
      if (content.title !== "") {
        // Value first, as the ride preset leads: the minutes, the title on their baseline, the
        // subtitle with its first part (the plate) in white, then the route pulled in from the corners.
        const minutes = <TickingTime source={values.timer} format={formatMinutes} />;
        const [first = "", ...rest] = content.subtitle.split(" · ");
        const line = content.subtitle === "" ? null : nameLine({ before: "", name: first, after: rest.length === 0 ? "" : `· ${rest.join(" · ")}` });
        const inset = `{{ paddingLeft: bottomInset.leading, paddingRight: bottomInset.trailing, paddingTop: 4 }}`;
        const hero = `<div style=${HERO_ROW_SOURCE}>\n  <ExpandedValue color={accent} unit="min">\n    <TickingTime source={${timerSourceSource(names)}} format={formatMinutes} />\n  </ExpandedValue>\n  <ExpandedSubtitle style={{ flex: "0 1 auto", textAlign: "right" }}>${childText(content.title)}</ExpandedSubtitle>\n</div>`;
        const rows = [hero, line?.source ?? null, `<div style=${inset}>\n  ${routeSource}\n</div>`].filter((row): row is string => row !== null);
        return {
          node: (
            <ExpandedBottom gap={READOUT_GAP}>
              <div style={HERO_ROW}>
                <ExpandedValue color={accent} unit="min">
                  {minutes}
                </ExpandedValue>
                <ExpandedSubtitle style={{ flex: "0 1 auto", textAlign: "right" }}>{content.title}</ExpandedSubtitle>
              </div>
              {line?.node}
              <div style={{ paddingLeft: bottomInset.leading, paddingRight: bottomInset.trailing, paddingTop: 4 }}>
                <RouteBar progress={values.progress} accent={accent} vehicle={vehicle} destination={destination} />
              </div>
            </ExpandedBottom>
          ),
          source: `<ExpandedBottom gap={${READOUT_GAP}}>\n${indent(rows.join("\n"))}\n</ExpandedBottom>`,
          imports: mergeImports([
            routeImports,
            imports(
              [MOD.layout, "ExpandedBottom"],
              [MOD.layout, "bottomInset"],
              [MOD.text, "ExpandedValue"],
              [MOD.text, "ExpandedSubtitle"],
              [MOD.time, "TickingTime"],
              [MOD.time, "formatMinutes"],
            ),
            line?.imports ?? new Map(),
          ]),
          items: ["island-content", "eta-activity", "ticking-time"],
        };
      }
      // The start dot and the destination reach the bottom corners: the route is pulled in from the sides until the arc clears them.
      return {
        node: (
          <ExpandedBottom reach="inset">
            <RouteBar progress={values.progress} accent={accent} vehicle={vehicle} destination={destination} />
          </ExpandedBottom>
        ),
        source: `<ExpandedBottom reach="inset">\n  ${routeSource}\n</ExpandedBottom>`,
        imports: mergeImports([routeImports, imports([MOD.layout, "ExpandedBottom"])]),
        items: ["island-content", "eta-activity", "ticking-time"],
      };
    }
    case "scrubber": {
      const { length, buttons } = content;
      const since = playheadSince(values.timer, length);
      const sinceSource = names.timerSource === "startedAt" ? "startedAt" : `endsAt - ${msLiteral(length)}`;
      const lengthMs = length * 1000;
      const remaining = (ms: number) => `−${formatClock(ms)}`;
      const transport = buttons.length > 0;
      // With no buttons under it, the time row is the last one and its ends sit in the corner arcs, which would cut the remaining time.
      const reach = transport ? undefined : "inset";
      const node = (
        <ExpandedBottom gap={transport ? 6 : 0} reach={reach}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "center", gap: 10 }}>
            <Caption>
              <TickingTime source={{ kind: "elapsed", since }} />
            </Caption>
            <TimeProgress source={{ kind: "elapsed", since }} duration={lengthMs} color={islandInk.primary} height={5} />
            <Caption style={{ textAlign: "right" }}>
              <TickingTime source={{ kind: "remaining", until: since + lengthMs }} format={remaining} />
            </Caption>
          </div>
          {transport ? (
            <div style={{ display: "flex", justifyContent: "center", gap: 28 }}>
              {buttons.map((button, index) => (
                <IslandRoundButton
                  key={`${button.label}-${index}`}
                  label={button.label}
                  color="transparent"
                  iconColor={button.tone === "neutral" ? undefined : roundTone(button, accent).iconColor ?? accent}
                  size={44}
                  onPress={() => values.onButton(button)}
                >
                  <IconArt name={button.icon} size={transportIconSize(button.icon)} />
                </IslandRoundButton>
              ))}
            </div>
          ) : null}
        </ExpandedBottom>
      );
      const timeRow = `<div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "center", gap: 10 }}>
  <Caption>
    <TickingTime source={{ kind: "elapsed", since: ${sinceSource} }} />
  </Caption>
  <TimeProgress source={{ kind: "elapsed", since: ${sinceSource} }} duration={${msLiteral(length)}} color={islandInk.primary} height={5} />
  <Caption style={{ textAlign: "right" }}>
    {/* A real minus sign (U+2212): a hyphen in tabular figures is a digit wide. */}
    <TickingTime source={{ kind: "remaining", until: ${sinceSource} + ${msLiteral(length)} }} format={(ms) => \`\\u2212\${formatClock(ms)}\`} />
  </Caption>
</div>`;
      const buttonSources = buttons.map((button) => {
        const colour = button.tone === "neutral" ? "" : button.tone === "tinted" || button.tone === "accent" ? " iconColor={accent}" : " iconColor={islandAccent.red}";
        return `<IslandRoundButton ${attr("label", button.label)} color="transparent"${colour} size={44} ${pressAttr(button, names)}>\n  ${iconArtSource(button.icon, transportIconSize(button.icon))}\n</IslandRoundButton>`;
      });
      const rows = transport ? `${timeRow}\n<div style={{ display: "flex", justifyContent: "center", gap: 28 }}>\n${buttonSources.map((source) => indent(source)).join("\n")}\n</div>` : timeRow;
      return {
        node,
        source: `<ExpandedBottom gap={${transport ? 6 : 0}}${reach === undefined ? "" : ` reach="${reach}"`}>\n${indent(rows)}\n</ExpandedBottom>`,
        imports: imports(
          [MOD.layout, "ExpandedBottom"],
          [MOD.text, "Caption"],
          [MOD.time, "TickingTime"],
          [MOD.time, "formatClock"],
          [MOD.bar, "TimeProgress"],
          [MOD.theme, "islandInk"],
          ...(transport ? [[MOD.button, "IslandRoundButton"] as const, ...buttons.map((button) => iconImport(button.icon))] : []),
          ...buttons.filter((button) => button.tone === "destructive").map(() => [MOD.theme, "islandAccent"] as const),
        ),
        items: ["island-content", "ticking-time", "linear-progress", ...(transport ? (["island-button"] as const) : [])],
      };
    }
    case "buttons": {
      const { buttons } = content;
      if (size === "bottom") {
        const compactRow = buttons.length > 2;
        const node = (
          <ExpandedBottom reach="action">
            <div style={{ display: "flex", gap: 10 }}>
              {buttons.map((button, index) => (
                <IslandButton
                  key={`${button.label}-${index}`}
                  tone={capsuleTone(button, accent).tone}
                  size={compactRow ? "compact" : undefined}
                  onPress={() => values.onButton(button)}
                >
                  <IconArt name={button.icon} size={18} />
                  {button.label}
                </IslandButton>
              ))}
            </div>
          </ExpandedBottom>
        );
        const buttonSources = buttons.map((button) => {
          const props = [capsuleTone(button, accent).source, compactRow ? `size="compact"` : "", pressAttr(button, names)].filter((prop) => prop !== "");
          return `<IslandButton ${props.join(" ")}>\n  ${iconArtSource(button.icon, 18)}\n  ${childText(button.label)}\n</IslandButton>`;
        });
        return {
          node,
          source: `<ExpandedBottom reach="action">\n  <div style={{ display: "flex", gap: 10 }}>\n${buttonSources.map((source) => indent(source, 4)).join("\n")}\n  </div>\n</ExpandedBottom>`,
          imports: imports([MOD.layout, "ExpandedBottom"], [MOD.button, "IslandButton"], ...buttons.map((button) => iconImport(button.icon)), ...toneImportsOf(buttons)),
          items: ["island-content", "island-button"],
        };
      }
      // Two round buttons fit beside the sensor; a link that asks for more keeps the first two,
      // 10 apart as the call preset's; `piece` puts them on the row line on either side.
      const side = buttons.slice(0, 2);
      if (content.call) {
        // The incoming call's buttons: 50 pt, red in the call's own measured red, out toward the corner.
        const callTone = (button: ButtonSpec) =>
          button.tone === "destructive" ? { color: callColors.decline, iconColor: undefined, source: "color={callColors.decline}" } : roundTone(button, accent);
        return {
          node: (
            <CallButtonRow>
              {side.map((button, index) => {
                const tone = callTone(button);
                return (
                  <IslandRoundButton
                    key={`${button.label}-${index}`}
                    label={button.label}
                    size={callButton.size}
                    color={tone.color}
                    iconColor={tone.iconColor}
                    onPress={() => values.onButton(button)}
                  >
                    <IconArt name={button.icon} size={callButton.handset} />
                  </IslandRoundButton>
                );
              })}
            </CallButtonRow>
          ),
          source: `<CallButtonRow>\n${side
            .map((button) => {
              const props = [attr("label", button.label), "size={callButton.size}", callTone(button).source, pressAttr(button, names)].filter((prop) => prop !== "");
              return indent(`<IslandRoundButton ${props.join(" ")}>\n  ${iconArtSource(button.icon, "callButton.handset")}\n</IslandRoundButton>`);
            })
            .join("\n")}\n</CallButtonRow>`,
          imports: imports(
            [MOD.call, "CallButtonRow"],
            [MOD.call, "callButton"],
            [MOD.button, "IslandRoundButton"],
            ...side.map((button) => iconImport(button.icon)),
            ...side.flatMap((button): readonly (readonly [string, string])[] =>
              button.tone === "destructive" ? [[MOD.call, "callColors"]] : button.tone === "tinted" ? [[MOD.theme, "tint"]] : [],
            ),
          ),
          items: ["island-content", "island-button", "call-activity"],
        };
      }
      const gap = 10;
      return {
        node: (
          <div style={{ display: "flex", gap }}>
            {side.map((button, index) => {
              const tone = roundTone(button, accent);
              return (
                <IslandRoundButton
                  key={`${button.label}-${index}`}
                  label={button.label}
                  size={ROUND_BUTTON}
                  color={tone.color}
                  iconColor={tone.iconColor}
                  onPress={() => values.onButton(button)}
                >
                  <IconArt name={button.icon} size={roundIconSize(button.icon)} />
                </IslandRoundButton>
              );
            })}
          </div>
        ),
        source: `<div style={{ display: "flex", gap: ${gap} }}>\n${side
          .map((button) => {
            const props = [attr("label", button.label), `size={${ROUND_BUTTON}}`, roundTone(button, accent).source, pressAttr(button, names)].filter((prop) => prop !== "");
            return indent(`<IslandRoundButton ${props.join(" ")}>\n  ${iconArtSource(button.icon, roundIconSize(button.icon))}\n</IslandRoundButton>`);
          })
          .join("\n")}\n</div>`,
        imports: imports([MOD.button, "IslandRoundButton"], ...side.map((button) => iconImport(button.icon)), ...toneImportsOf(side)),
        items: ["island-content", "island-button"],
      };
    }
    case "track":
      return {
        node: <PlayerTitle title={content.title} artist={content.subtitle} />,
        source: `<PlayerTitle ${attr("title", content.title)} ${attr("artist", content.subtitle)} />`,
        imports: imports([MOD.nowPlaying, "PlayerTitle"]),
        items: ["island-content", "now-playing-activity"],
      };
    case "caller":
      return {
        node: <CallText line={content.subtitle} name={content.title} />,
        source: `<CallText ${attr("line", content.subtitle)} ${attr("name", content.title)} />`,
        imports: imports([MOD.call, "CallText"]),
        items: ["island-content", "call-activity"],
      };
    case "player": {
      const { length, output } = content;
      const since = playheadSince(values.timer, length);
      const sinceSource = names.timerSource === "startedAt" ? "startedAt" : `endsAt - ${msLiteral(length)}`;
      // The transport's buttons are your app's to wire up; on the stage they do nothing.
      const presses = [
        ["onToggle", pressOf("Play or pause", "none")],
        ["onPrevious", pressOf("Previous track", "none")],
        ["onNext", pressOf("Next track", "none")],
        ...(output ? [["onOutput", pressOf("Audio output", "none")] as const] : []),
      ] as const;
      const handler = (button: ButtonSpec) => () => values.onButton(button);
      return {
        node: (
          <PlayerControls
            playback={{ kind: "playing", startedAt: since }}
            duration={length * 1000}
            onToggle={handler(pressOf("Play or pause", "none"))}
            onPrevious={handler(pressOf("Previous track", "none"))}
            onNext={handler(pressOf("Next track", "none"))}
            onOutput={output ? handler(pressOf("Audio output", "none")) : undefined}
          />
        ),
        source: `<PlayerControls\n  playback={{ kind: "playing", startedAt: ${sinceSource} }}\n  duration={${msLiteral(length)}}\n${presses.map(([prop, button]) => `  ${prop}={${buttonPress(button, names)}}`).join("\n")}\n/>`,
        imports: imports([MOD.nowPlaying, "PlayerControls"]),
        items: ["island-content", "ticking-time", "linear-progress", "island-button", "now-playing-activity"],
      };
    }
    case "wave": {
      // The recorder's waveform: thin bars in the pill, a shorter run in the split's bubble, the scrolling row beside the sensor.
      if (size === "side") {
        return {
          node: <RecordingWave color={accent} />,
          source: `<RecordingWave color={accent} />`,
          imports: imports([MOD.recording, "RecordingWave"]),
          items: ["island-content", "recording-activity"],
        };
      }
      const small = region === "minimal";
      return {
        node: <CompactWave color={accent} size={small ? "small" : "compact"} />,
        source: `<CompactWave color={accent}${small ? ` size="small"` : ""} />`,
        imports: imports([MOD.recording, "CompactWave"]),
        items: ["island-content", "level-meter", "recording-activity"],
      };
    }
    case "recorder": {
      const press = pressOf("Stop recording", content.action);
      return {
        node: <RecordingTrailing source={values.timer} color={accent} accent={accent} onStop={() => values.onButton(press)} />,
        source: `<RecordingTrailing\n  source={${timerSourceSource(names)}}\n  color={accent}\n  accent={accent}\n  onStop={${buttonPress(press, names)}}\n/>`,
        imports: imports([MOD.recording, "RecordingTrailing"]),
        items: ["island-content", "ticking-time", "island-button", "recording-activity"],
      };
    }
    case "vehicle": {
      // A square glyph (the parcel) takes the delivery's box; anything else the car's wide, flat one.
      const delivery = content.icon === "Package";
      return {
        node: <EtaVehicle icon={iconComponent(content.icon)} color={accent} kind={delivery ? "delivery" : "ride"} />,
        source: `<EtaVehicle icon={${iconIdentifier(content.icon)}} color={accent}${delivery ? ` kind="delivery"` : ""} />`,
        imports: imports([MOD.eta, "EtaVehicle"], iconImport(content.icon)),
        items: ["island-content", "eta-activity"],
      };
    }
    case "driver":
      return {
        node: <EtaDriver name={content.title} detail={content.subtitle === "" ? undefined : content.subtitle} />,
        source: `<EtaDriver ${attr("name", content.title)}${content.subtitle === "" ? "" : ` ${attr("detail", content.subtitle)}`} />`,
        imports: imports([MOD.eta, "EtaDriver"]),
        items: ["island-content", "eta-activity"],
      };
    case "arrival": {
      const press = pressOf(content.label, content.action);
      const contact = content.label === "" ? null : press;
      const props = [
        content.text === "" ? null : attr("vehicle", content.text),
        `minutes={<TickingTime source={${timerSourceSource(names)}} format={formatArrivalMinutes} />}`,
        "accent={accent}",
        contact === null ? null : `contact={{ label: ${lit(content.label)}, onPress: ${buttonPress(contact, names)} }}`,
      ].filter((prop): prop is string => prop !== null);
      return {
        node: (
          <EtaArrival
            vehicle={content.text === "" ? undefined : content.text}
            minutes={<TickingTime source={values.timer} format={formatArrivalMinutes} />}
            accent={accent}
            contact={contact === null ? undefined : { label: content.label, onPress: () => values.onButton(contact) }}
          />
        ),
        source: `<EtaArrival\n${props.map((prop) => `  ${prop}`).join("\n")}\n/>`,
        imports: imports([MOD.eta, "EtaArrival"], [MOD.eta, "formatArrivalMinutes"], [MOD.time, "TickingTime"]),
        items: ["island-content", "ticking-time", "eta-activity"],
      };
    }
    default: {
      const exhaustive: never = content;
      return exhaustive;
    }
  }
};

export { indent };
