import type { ShapeTransition } from "@/lib/island";

import {
  type ActivitySpec,
  type Build,
  type ButtonAction,
  type ButtonSpec,
  type CaptionSpec,
  type Content,
  type IconName,
  ID_PATTERN,
  MAX_BUTTONS,
  NO_CAPTION,
  REGIONS,
  type Region,
  type StarterKey,
  type Tone,
  DEFAULT_STARTER,
  isAccentChoice,
  isButtonAction,
  isButtonTone,
  isIconName,
  isPhotoChoice,
  isShareMark,
  isStarterKey,
  isTimerFormat,
  isTimerMode,
  isTone,
  starterBuild,
} from "./model";
import { DEFAULT_SPRINGS, type Springs, TRANSITIONS, changedSprings, SPRING_RANGE } from "./motion";
import { followWords } from "./words";

/*
 * A build in the URL, so a link shares it: `?b=` holds the build as JSON,
 * deflated and base64url (see the formats below). The link is outside input,
 * so `parseState` checks every field and drops what doesn't fit rather than
 * trusting it.
 */

export type StageTheme = "light" | "dark";

/**
 * The view the island opens in. The gallery's links carry the view you were looking at, so an
 * incoming call shown ringing (expanded) opens expanded; a split opens as a split from its build.
 */
export type OpenView = "compact" | "expanded";

export interface PlaygroundState {
  build: Build;
  springs: Springs;
  reduced: boolean;
  stage: StageTheme;
  opens: OpenView;
}

export const STATE_PARAM = "b";

/** Longest text a field keeps, so a crafted link can't blow up the page. */
const MAX_TEXT = 80;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null => (typeof value === "string" ? value.slice(0, MAX_TEXT) : null);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const finite = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

const parseButton = (value: unknown): ButtonSpec | null => {
  if (!isRecord(value)) return null;
  const icon = text(value.icon);
  const label = text(value.label);
  const tone = text(value.tone);
  const action = text(value.action);
  if (icon === null || !isIconName(icon) || label === null || tone === null || !isButtonTone(tone) || action === null || !isButtonAction(action)) return null;
  return { icon, label, tone, action };
};

/** A caption from a link; links made before captions existed have none. */
const parseCaption = (value: unknown): CaptionSpec => {
  if (!isRecord(value)) return NO_CAPTION;
  const body = text(value.text) ?? "";
  const press = value.press === null || value.press === undefined ? null : text(value.press);
  return { text: body, press: press !== null && isButtonAction(press) ? press : null };
};

const parseButtons = (value: unknown): readonly ButtonSpec[] =>
  Array.isArray(value)
    ? value
        .slice(0, MAX_BUTTONS)
        .map(parseButton)
        .filter((button): button is ButtonSpec => button !== null)
    : [];

const parseIcon = (value: unknown): IconName | null => {
  const icon = text(value);
  return icon !== null && isIconName(icon) ? icon : null;
};

/** A colour from a link; links made before a kind took one have the accent. */
const parseTone = (value: unknown): Tone => {
  const tone = text(value);
  return tone !== null && isTone(tone) ? tone : "accent";
};

/** What a press does, from a link, or `fallback` when the link doesn't say. */
const parseAction = (value: unknown, fallback: ButtonAction): ButtonAction => {
  const action = text(value);
  return action !== null && isButtonAction(action) ? action : fallback;
};

/*
 * Fields added after a kind first shipped (captions, the timer's format, the bar's cancel, the
 * title's lines) are optional here, so links made before them still open as they were.
 */
const parseContent = (value: unknown): Content | null => {
  if (!isRecord(value)) return null;
  const kind = text(value.kind);
  switch (kind) {
    case "none":
    case "spinner":
    case "dot":
    case "wave":
      return { kind };
    /*
     * Kinds the AI task preset had, removed with it. Links made while they existed open with the
     * nearest kind left: the orbit mark becomes a sparkle in the accent, shimmering text plain text,
     * and an approval its two answers as buttons.
     */
    case "agent":
      return { kind: "glyph", icon: "Sparkle", tone: "accent" };
    case "shimmer": {
      const body = text(value.text);
      return body === null ? null : { kind: "text", text: body, tone: "secondary", wide: false };
    }
    case "approval": {
      const deny = text(value.deny) ?? "Deny";
      const approve = text(value.approve) ?? "Approve";
      return {
        kind: "buttons",
        buttons: [
          { icon: "X", label: deny, tone: "neutral", action: "collapse" },
          { icon: "Check", label: approve, tone: "accent", action: "collapse" },
        ],
        call: false,
      };
    }
    // Links made before the bar count existed have the pill's four; before the player's meter, the kit's.
    case "meter":
      return { kind, compactBars: value.compactBars === 3 ? 3 : 4, player: value.player === true };
    case "status": {
      const icon = value.icon === null ? null : parseIcon(value.icon);
      const body = text(value.text);
      const tone = text(value.tone);
      const iconTone = text(value.iconTone);
      if (body === null || tone === null || !isTone(tone)) return null;
      // Links made before the label row existed line up with controls. One the orbit mark led (a
      // removed kind) leads with a sparkle in its place.
      const lead = icon === null && value.mark === true ? "Sparkle" : icon;
      return { kind, icon: lead, iconTone: iconTone !== null && isTone(iconTone) ? iconTone : "accent", text: body, tone, row: value.row === true };
    }
    case "percent":
      return { kind, caption: parseCaption(value.caption) };
    case "timer": {
      const format = text(value.format);
      return { kind, format: format !== null && isTimerFormat(format) ? format : "clock", caption: parseCaption(value.caption), end: value.end === true, tone: parseTone(value.tone) };
    }
    case "glyph": {
      const icon = parseIcon(value.icon);
      return icon === null ? null : { kind, icon, tone: parseTone(value.tone) };
    }
    case "tile": {
      const icon = parseIcon(value.icon);
      return icon === null ? null : { kind, icon };
    }
    case "art": {
      const seed = text(value.seed);
      return seed === null ? null : { kind, seed, cover: value.cover === true };
    }
    case "avatar": {
      const name = text(value.name);
      return name === null ? null : { kind, name, call: value.call === true };
    }
    // A photo is one of the site's sample photos by name, never a URL: an unknown one shows none.
    case "photo": {
      const photo = text(value.photo);
      return { kind, photo: photo !== null && isPhotoChoice(photo) ? photo : "none" };
    }
    case "device": {
      const icon = parseIcon(value.icon);
      const photo = text(value.photo);
      return icon === null ? null : { kind, icon, photo: photo !== null && isPhotoChoice(photo) ? photo : "none" };
    }
    case "media": {
      const subtitle = text(value.subtitle);
      const title = text(value.title);
      if (subtitle === null || title === null) return null;
      // The words for 100% came later: a link without them reads the running words throughout.
      const doneSubtitle = text(value.doneSubtitle);
      const doneTitle = text(value.doneTitle);
      return {
        kind,
        subtitle,
        detail: text(value.detail) ?? "",
        title,
        ...(doneSubtitle === null ? {} : { doneSubtitle }),
        ...(doneTitle === null ? {} : { doneTitle }),
      };
    }
    case "share": {
      const mark = text(value.mark);
      return { kind, mark: mark !== null && isShareMark(mark) ? mark : "none", action: parseAction(value.action, "none") };
    }
    case "text": {
      const body = text(value.text);
      const tone = text(value.tone);
      if (body === null || tone === null || !isTone(tone)) return null;
      // `detail` came later and only a wide side text draws it: an empty or missing one stays off the link.
      const detail = text(value.detail);
      return { kind, text: body, tone, wide: value.wide === true, ...(detail ? { detail } : {}) };
    }
    case "label": {
      const body = text(value.text);
      return body === null ? null : { kind, text: body };
    }
    case "title": {
      const title = text(value.title);
      const subtitle = text(value.subtitle);
      return title !== null && subtitle !== null ? { kind, title, subtitle, lines: value.lines === 2 ? 2 : 1, end: value.end === true } : null;
    }
    case "value": {
      const body = text(value.text);
      const unit = text(value.unit);
      return body !== null && unit !== null ? { kind, text: body, unit, caption: parseCaption(value.caption) } : null;
    }
    case "ring": {
      if (value.icon === null) return { kind, icon: null };
      const icon = parseIcon(value.icon);
      return icon === null ? null : { kind, icon };
    }
    case "battery":
      return { kind, charging: value.charging !== false, percent: value.percent === true, label: text(value.label) ?? "", wide: value.wide === true };
    case "bar": {
      const caption = text(value.caption);
      return caption === null ? null : { kind, caption, cancel: value.cancel === true };
    }
    case "route": {
      const vehicle = parseIcon(value.vehicle);
      const destination = parseIcon(value.destination);
      if (vehicle === null || destination === null) return null;
      return { kind, vehicle, destination, title: text(value.title) ?? "", subtitle: text(value.subtitle) ?? "" };
    }
    case "readout": {
      const tone = text(value.tone);
      return {
        kind,
        tone: tone !== null && isTone(tone) ? tone : "primary",
        detail: text(value.detail) ?? "",
        before: text(value.before) ?? "",
        name: text(value.name) ?? "",
        after: text(value.after) ?? "",
      };
    }
    case "cancel": {
      const label = text(value.label);
      const action = text(value.action);
      return label === null ? null : { kind, label, action: action !== null && isButtonAction(action) ? action : "dismiss" };
    }
    case "clock":
      return { kind };
    case "scrubber": {
      const length = finite(value.length);
      return length === null ? null : { kind, length: Math.round(clamp(length, 1, 24 * 3600)), buttons: parseButtons(value.buttons) };
    }
    case "buttons": {
      const buttons = parseButtons(value.buttons);
      return buttons.length === 0 ? null : { kind, buttons, call: value.call === true };
    }
    case "track":
    case "caller":
    case "driver": {
      const title = text(value.title);
      const subtitle = text(value.subtitle);
      return title === null || subtitle === null ? null : { kind, title, subtitle };
    }
    case "player": {
      const length = finite(value.length);
      return length === null ? null : { kind, length: Math.round(clamp(length, 1, 24 * 3600)), output: value.output === true };
    }
    case "recorder":
      return { kind, action: parseAction(value.action, "dismiss") };
    case "vehicle": {
      const icon = parseIcon(value.icon);
      return icon === null ? null : { kind, icon };
    }
    case "arrival": {
      const body = text(value.text);
      const label = text(value.label);
      return body === null || label === null ? null : { kind, text: body, label, action: parseAction(value.action, "none") };
    }
    default:
      return null;
  }
};

const parseActivity = (value: unknown): ActivitySpec | null => {
  if (!isRecord(value) || !isRecord(value.regions) || !isRecord(value.timer)) return null;
  const id = text(value.id);
  const label = text(value.label);
  const accent = text(value.accent);
  const progress = finite(value.progress);
  const mode = text(value.timer.mode);
  const seconds = finite(value.timer.seconds);
  if (id === null || !ID_PATTERN.test(id) || label === null || accent === null || !isAccentChoice(accent) || progress === null) return null;
  if (mode === null || !isTimerMode(mode) || seconds === null) return null;
  // The label for 100% came later and is never typed: a link without it (or with "") speaks `label` throughout.
  const doneLabel = text(value.doneLabel);
  // The words the labels are made of came later still: a link without them keeps its labels as typed.
  const labelWords = text(value.labelWords);
  const doneLabelWords = text(value.doneLabelWords);
  const source = value.regions;
  const entries = REGIONS.map((region) => [region, parseContent(source[region]) ?? { kind: "none" }] as const);
  const regions: Record<Region, Content> = {
    compactLeading: { kind: "none" },
    compactTrailing: { kind: "none" },
    minimal: { kind: "none" },
    expandedLeading: { kind: "none" },
    expandedCenter: { kind: "none" },
    expandedTrailing: { kind: "none" },
    expandedBottom: { kind: "none" },
  };
  for (const [region, content] of entries) regions[region] = content;
  // Labels made of words are made again from the words the link holds, so a link from before they
  // followed (a renamed track with the old track's label) opens speaking the words it shows.
  return followWords({
    id,
    label,
    ...(doneLabel ? { doneLabel } : {}),
    // "" said the label was typed, so the starter's words didn't take it back; `followWords` drops it.
    ...(labelWords === null ? {} : { labelWords }),
    ...(doneLabelWords === null ? {} : { doneLabelWords }),
    accent,
    progress: clamp(progress, 0, 1),
    timer: { mode, seconds: Math.round(clamp(seconds, 0, 24 * 3600)) },
    regions,
  });
};

const parseSprings = (value: unknown): Springs => {
  const springs: Springs = { ...DEFAULT_SPRINGS };
  if (!isRecord(value)) return springs;
  for (const transition of TRANSITIONS) {
    const entry = value[transition];
    if (!Array.isArray(entry)) continue;
    const response = finite(entry[0]);
    const damping = finite(entry[1]);
    if (response === null || damping === null) continue;
    springs[transition] = {
      response: clamp(response, SPRING_RANGE.response.min, SPRING_RANGE.response.max),
      dampingFraction: clamp(damping, SPRING_RANGE.dampingFraction.min, SPRING_RANGE.dampingFraction.max),
    };
  }
  return springs;
};

/* base64url, so the value needs no escaping in a query string. */

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlToBytes = (input: string): Uint8Array | null => {
  try {
    const binary = atob(input.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const decodeUtf8 = (bytes: Uint8Array): string | null => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
};

/** Runs bytes through a compression or decompression stream. */
const pipeThrough = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> => {
  const source = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(source).arrayBuffer());
};

/*
 * Link formats. Version 1 (the first links) is base64url JSON of the whole build, about 2,000
 * characters for a split. Version 2 writes only what differs from the starting point the build
 * names (a preset opened from the gallery is just `{"v":2,"f":"upload"}`) and deflates it. A
 * deflated value starts with `DEFLATED`, which base64url JSON never does: JSON starts with "{",
 * which encodes as "e". Browsers without CompressionStream write the same JSON uncompressed, and
 * every version still opens.
 */
const DEFLATED = "z";
/** Inflated JSON longer than this is not a build: a guard against a crafted link that inflates huge. */
const MAX_JSON = 64 * 1024;

/** JSON with sorted keys, so two equal values compare equal whatever order their fields were set in. */
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
};

const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);

/** The fields of `activity` that differ from `base`, with regions compared one by one. Null base: all of it. */
const activityDelta = (activity: ActivitySpec, base: ActivitySpec | null): Record<string, unknown> => {
  if (base === null) return { ...activity };
  const delta: Record<string, unknown> = {};
  if (activity.id !== base.id) delta.id = activity.id;
  // A label is written whenever it differs from the starter's, and always with its words ("" for a
  // label typed by hand), so the link can tell the two apart. Words that make a label refill it when
  // the link opens; a label they can't make (a cleared artist) is kept as written.
  if (activity.label !== base.label || (activity.labelWords ?? "") !== (base.labelWords ?? "")) {
    delta.label = activity.label;
    delta.labelWords = activity.labelWords ?? "";
  }
  // "" overrides a starter's label for 100% when this activity has none (one opened from an old full link).
  if ((activity.doneLabel ?? "") !== (base.doneLabel ?? "") || (activity.doneLabelWords ?? "") !== (base.doneLabelWords ?? "")) {
    delta.doneLabel = activity.doneLabel ?? "";
    delta.doneLabelWords = activity.doneLabelWords ?? "";
  }
  if (activity.accent !== base.accent) delta.accent = activity.accent;
  if (activity.progress !== base.progress) delta.progress = activity.progress;
  if (!same(activity.timer, base.timer)) delta.timer = activity.timer;
  const regions: Partial<Record<Region, Content>> = {};
  for (const region of REGIONS) if (!same(activity.regions[region], base.regions[region])) regions[region] = activity.regions[region];
  if (Object.keys(regions).length > 0) delta.regions = regions;
  return delta;
};

/** A link's activity laid over its starting point, still unchecked: `parseActivity` checks the result. */
const applyDelta = (base: ActivitySpec | null, delta: unknown): unknown => {
  if (base === null || !isRecord(delta)) return delta;
  const regions = isRecord(delta.regions) ? { ...base.regions, ...delta.regions } : base.regions;
  // New links write a label with its words; a label alone is from a link made before labels
  // followed words, typed by hand, so the starter's words must not replace it.
  const typed = {
    ...("label" in delta && !("labelWords" in delta) ? { labelWords: "" } : {}),
    ...("doneLabel" in delta && !("doneLabelWords" in delta) ? { doneLabelWords: "" } : {}),
  };
  return { ...base, ...delta, ...typed, regions };
};

/** The version 2 JSON for a state: what differs from the starter it names, and only settings that differ. */
const compactJson = (state: PlaygroundState): string => {
  const base = starterBuild(state.build.from);
  const value: Record<string, unknown> = { v: 2, f: state.build.from };
  const primary = activityDelta(state.build.primary, base.primary);
  if (Object.keys(primary).length > 0) value.p = primary;
  const { second } = state.build;
  if (second === null) {
    if (base.second !== null) value.s = null;
  } else {
    const delta = activityDelta(second, base.second);
    if (Object.keys(delta).length > 0) value.s = delta;
  }
  const springs: Partial<Record<ShapeTransition, [number, number]>> = {};
  for (const transition of changedSprings(state.springs)) {
    const spring = state.springs[transition];
    springs[transition] = [Number(spring.response.toFixed(3)), Number(spring.dampingFraction.toFixed(3))];
  }
  if (Object.keys(springs).length > 0) value.m = springs;
  if (state.reduced) value.r = 1;
  if (state.stage === "light") value.t = "light";
  if (state.opens === "expanded") value.o = "expanded";
  return JSON.stringify(value);
};

/**
 * The URL value for a state, without compression: short for an unedited starter (the gallery's
 * links), and what `encodeState` falls back to.
 */
export const encodeStatePlain = (state: PlaygroundState): string => bytesToBase64Url(new TextEncoder().encode(compactJson(state)));

/** The URL value for a state: version 2, deflated where the browser can. */
export const encodeState = async (state: PlaygroundState): Promise<string> => {
  const json = compactJson(state);
  if (typeof CompressionStream === "undefined") return encodeStatePlain(state);
  try {
    const deflated = await pipeThrough(new TextEncoder().encode(json), new CompressionStream("deflate-raw"));
    const value = `${DEFLATED}${bytesToBase64Url(deflated)}`;
    // Tiny builds can come out longer deflated; keep whichever is shorter.
    const plain = encodeStatePlain(state);
    return value.length < plain.length ? value : plain;
  } catch {
    return encodeStatePlain(state);
  }
};

/** The JSON text in a URL value of any version, or null when it isn't one. */
const readJson = async (raw: string): Promise<string | null> => {
  if (!raw.startsWith(DEFLATED)) return decodeUtf8(base64UrlToBytes(raw) ?? new Uint8Array()) || null;
  const bytes = base64UrlToBytes(raw.slice(DEFLATED.length));
  if (bytes === null || typeof DecompressionStream === "undefined") return null;
  try {
    const inflated = await pipeThrough(bytes, new DecompressionStream("deflate-raw"));
    return inflated.length > MAX_JSON ? null : decodeUtf8(inflated);
  } catch {
    return null;
  }
};

/** A state from a URL value of any version, or null when the value isn't a build. */
export const parseState = async (raw: string): Promise<PlaygroundState | null> => {
  const json = await readJson(raw);
  if (json === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(value) || (value.v !== 1 && value.v !== 2)) return null;
  const fromText = text(value.f);
  const known = fromText !== null && isStarterKey(fromText);
  /*
   * A version 2 link holds only what differs from a starter that has since been removed (the AI
   * task): its changes mean nothing over another starter, so it opens the default preset as it ships.
   * A version 1 link holds the whole build and keeps it, as a blank build.
   */
  const stale = value.v === 2 && fromText !== null && !known;
  const from: StarterKey = known ? fromText : stale ? DEFAULT_STARTER : "blank";
  // Version 1 holds every field; version 2 only what differs from the starter it names.
  const base = value.v === 2 ? starterBuild(from) : null;
  const primary = parseActivity(base === null ? value.p : stale ? base.primary : applyDelta(base.primary, value.p ?? {}));
  if (primary === null) return null;
  const secondValue =
    base === null ? value.s : stale || value.s === undefined ? base.second : value.s === null ? null : applyDelta(base.second, value.s);
  const parsedSecond = secondValue === null ? null : parseActivity(secondValue);
  // Two activities can't share an id; a link that says so loses the second.
  const second = parsedSecond !== null && parsedSecond.id === primary.id ? null : parsedSecond;
  return {
    build: { from, primary, second },
    springs: parseSprings(value.m),
    reduced: value.r === 1,
    stage: value.t === "light" ? "light" : "dark",
    opens: value.o === "expanded" ? "expanded" : "compact",
  };
};
