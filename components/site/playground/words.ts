/*
 * The words an activity shows, as plain fields: what Customize's basics offer before any layout
 * editing. Each field points at one or more text fields in the activity's regions, so typing in
 * it is the same edit the region editor makes, and the stage, the code and the share link follow
 * it the same way.
 */

import { type ActivitySpec, type Content, REGION_INFO, REGIONS, type Region } from "./model";

/** A text field inside one region's content. */
export interface WordTarget {
  readonly region: Region;
  readonly key: WordKey;
}

/** One field in the basics, editing every target at once. */
export interface WordField {
  /** Stable while the layout stays the same: the first target's region and key. */
  readonly id: string;
  readonly label: string;
  /** Longest text the field takes: the smallest of its targets' limits. */
  readonly max: number;
  /** One or more targets that held the same words when the field was made. Never empty. */
  readonly targets: readonly [WordTarget, ...WordTarget[]];
}

/** The keys a region's content keeps its words under. */
export type WordKey = "text" | "title" | "subtitle" | "name" | "detail" | "label" | "caption" | "doneTitle" | "doneSubtitle";

interface Slot {
  readonly key: WordKey;
  readonly label: string;
  readonly max: number;
  /** Shown even when empty: the kind always draws these words. */
  readonly always: boolean;
}

const slot = (key: WordKey, label: string, max: number, always = true): Slot => ({ key, label, max, always });

/**
 * The words each kind draws, with the limits the region editor gives the same fields. Optional
 * words (a readout's detail, a ride's button) show only when the activity has them: adding them
 * changes the layout, so that stays in the region editor.
 */
const slotsOf = (content: Content, region: Region): readonly Slot[] => {
  switch (content.kind) {
    case "text": {
      const text = slot("text", "Text", REGION_INFO[region].size === "compact" ? 12 : 40);
      // The charging pill's grey line under "Charging" ("Full in 55 min"), when it has one.
      return content.wide ? [text, slot("detail", "Line under it", 24, false)] : [text];
    }
    case "label":
      return [slot("text", "Label", 24)];
    case "status":
      return [slot("text", "Status", 12)];
    case "value":
      return [slot("text", "Value", 6)];
    case "title":
      // With `end`, the timer's clock time takes the subtitle's line, so there is no subtitle to edit.
      return content.end ? [slot("title", "Title", 40)] : [slot("title", "Title", 40), slot("subtitle", "Subtitle", 64, false)];
    case "track":
      return [slot("title", "Track", 40), slot("subtitle", "Artist", 40, false)];
    case "caller":
      return [slot("title", "Caller", 40), slot("subtitle", "Call type", 40, false)];
    case "driver":
      return [slot("title", "Driver", 40), slot("subtitle", "Plate", 40, false)];
    case "avatar":
      return [slot("name", "Name", 40)];
    case "readout":
      return [slot("name", "Name", 40, false), slot("detail", "Detail", 24, false)];
    case "media":
      // The words for 100% show when the activity has them, as the upload's "Uploaded to Family".
      return [
        slot("title", "Sentence", 40),
        slot("subtitle", "Line above", 40, false),
        slot("detail", "Detail", 24, false),
        slot("doneTitle", "Sentence when done", 40, false),
        slot("doneSubtitle", "Line above when done", 40, false),
      ];
    case "route":
      return [slot("title", "Headline", 40, false), slot("subtitle", "Details", 64, false)];
    case "arrival":
      return [slot("text", "Vehicle", 24, false), slot("label", "Button", 24, false)];
    case "bar":
      return [slot("caption", "Caption", 40, false)];
    case "battery":
      return [slot("label", "Label", 12, false)];
    case "none":
    case "glyph":
    case "tile":
    case "art":
    case "photo":
    case "device":
    case "share":
    case "dot":
    case "percent":
    case "timer":
    case "ring":
    case "spinner":
    case "meter":
    case "cancel":
    case "clock":
    case "scrubber":
    case "buttons":
    case "player":
    case "wave":
    case "recorder":
    case "vehicle":
      return [];
    default: {
      const exhaustive: never = content;
      return exhaustive;
    }
  }
};

const WORD_KEYS = ["text", "title", "subtitle", "name", "detail", "label", "caption", "doneTitle", "doneSubtitle"] as const satisfies readonly WordKey[];

const isWordKey = (value: string): value is WordKey => WORD_KEYS.some((key) => key === value);

const isRegion = (value: string): value is Region => REGIONS.some((region) => region === value);

/** The words in one field of a region's content, or "" when it has none under that key. */
const read = (content: Content, key: WordKey): string => {
  const field: unknown = Object.getOwnPropertyDescriptor(content, key)?.value;
  return typeof field === "string" ? field : "";
};

/** The words a field shows: its first target's. */
export const wordValue = (activity: ActivitySpec, field: WordField): string => read(activity.regions[field.targets[0].region], field.targets[0].key);

/**
 * The expanded view's regions first, then compact: the expanded view is where words read at full
 * size, so its names lead the list ("Caller" rather than the compact avatar's "Name").
 */
const READ_ORDER = ["expandedCenter", "expandedLeading", "expandedTrailing", "expandedBottom", "compactLeading", "compactTrailing", "minimal"] as const satisfies readonly Region[];

/**
 * The activity's words as fields. Regions that show the same words (an incoming call's name in
 * the photo, the compact avatar and the expanded text) become one field that edits them all, so
 * changing the name changes it everywhere it shows.
 */
export const wordFields = (activity: ActivitySpec): WordField[] => {
  const fields: { label: string; max: number; value: string; targets: [WordTarget, ...WordTarget[]] }[] = [];
  for (const region of READ_ORDER) {
    const content = activity.regions[region];
    for (const one of slotsOf(content, region)) {
      const value = read(content, one.key);
      if (!one.always && value === "") continue;
      const target: WordTarget = { region, key: one.key };
      const same = value === "" ? undefined : fields.find((field) => field.value === value);
      if (same === undefined) fields.push({ label: one.label, max: one.max, value, targets: [target] });
      else {
        same.targets.push(target);
        same.max = Math.min(same.max, one.max);
      }
    }
  }
  // Two fields with one name (two statuses) say which side each is on.
  const counts = new Map<string, number>();
  for (const field of fields) counts.set(field.label, (counts.get(field.label) ?? 0) + 1);
  return fields.map((field) => {
    const first = field.targets[0];
    const info = REGION_INFO[first.region];
    const label = (counts.get(field.label) ?? 0) > 1 ? `${field.label}, ${info.group === "minimal" ? "bubble" : `${info.group} ${info.label.toLowerCase()}`}` : field.label;
    return { id: `${first.region}.${first.key}`, label, max: field.max, targets: field.targets };
  });
};

/** True while every target of the field still holds the same words, so one field can stand for them. */
export const isUniform = (activity: ActivitySpec, field: WordField): boolean => {
  const value = wordValue(activity, field);
  return field.targets.every((target) => read(activity.regions[target.region], target.key) === value);
};

/** A `{region.key}` token in a label's words, with `:lower` to lower the first letter. */
const TOKEN = /\{(\w+)\.(\w+)(:lower)?\}/g;

interface FillLabelOptions {
  /** Text with `{region.key}` tokens, such as "{expandedCenter.title} timer". Required. */
  words: string;
  /** The regions the tokens read. Required. */
  regions: Readonly<Record<Region, Content>>;
}

/**
 * A label's words filled in from the regions, spaces collapsed, or "" when a token reads no words
 * (a cleared artist would leave "QA Anthem by"), so the label keeps what it said until they're back.
 */
export const fillLabel = ({ words, regions }: FillLabelOptions): string => {
  let missing = false;
  const filled = words.replace(TOKEN, (_token, region: string, key: string, lower: string | undefined) => {
    const value = isRegion(region) && isWordKey(key) ? read(regions[region], key).trim() : "";
    if (value === "") missing = true;
    return lower === undefined ? value : value.charAt(0).toLowerCase() + value.slice(1);
  });
  return missing ? "" : filled.replace(/\s+/g, " ").trim();
};

/**
 * The activity with its spoken labels made again from the words it shows, for the labels that
 * follow words (`labelWords`, `doneLabelWords`). A label with a cleared word keeps what it said.
 * Empty words (a label typed by hand) are dropped, so "not following" has one form.
 */
export const followWords = (activity: ActivitySpec): ActivitySpec => {
  const { labelWords, doneLabelWords, ...rest } = activity;
  const label = labelWords ? fillLabel({ words: labelWords, regions: activity.regions }) : "";
  const doneLabel = doneLabelWords ? fillLabel({ words: doneLabelWords, regions: activity.regions }) : "";
  return {
    ...rest,
    ...(labelWords ? { labelWords } : {}),
    ...(doneLabelWords ? { doneLabelWords } : {}),
    ...(label === "" ? {} : { label }),
    ...(doneLabel === "" ? {} : { doneLabel }),
  };
};

/** The words written into one region's content, if it still keeps words under that key. */
const write = (content: Content, key: WordKey, value: string): Content => (Object.hasOwn(content, key) ? { ...content, [key]: value } : content);

interface WithWordsOptions {
  /** The activity's regions before the change. Required. */
  regions: Readonly<Record<Region, Content>>;
  /** The field being typed in. Required. */
  field: WordField;
  /** Its new words. Required. */
  value: string;
}

/** The regions with the field's words replaced in every target. */
export const withWords = ({ regions, field, value }: WithWordsOptions): Record<Region, Content> => {
  const next: Record<Region, Content> = { ...regions };
  for (const target of field.targets) next[target.region] = write(next[target.region], target.key, value.slice(0, field.max));
  return next;
};

/** What changes the field list: which kinds sit where. Typing words never changes it. */
export const layoutKey = (activity: ActivitySpec): string => `${activity.id}:${REGIONS.map((region) => activity.regions[region].kind).join(",")}`;

/** True when the region's content still draws words under the target's key (a timer title with `end` has no subtitle). */
const drawsWords = (activity: ActivitySpec, target: WordTarget): boolean =>
  slotsOf(activity.regions[target.region], target.region).some((one) => one.key === target.key);

interface FieldsStillFitOptions {
  /** The activity as it is now. Required. */
  activity: ActivitySpec;
  /** The `layoutKey` the list was made under. Required. */
  key: string;
  /** The list made earlier. Required. */
  fields: readonly WordField[];
}

/**
 * True while a field list made earlier still fits the activity: the same layout, each field's
 * targets still drawn and still holding one set of words, and no words that no field covers.
 * The last check catches words added in the region editor to a slot that was empty when the list
 * was made (an optional subtitle). A field the visitor cleared stays: it covers its own targets.
 */
export const fieldsStillFit = ({ activity, key, fields }: FieldsStillFitOptions): boolean => {
  if (key !== layoutKey(activity)) return false;
  if (!fields.every((field) => isUniform(activity, field) && field.targets.every((target) => drawsWords(activity, target)))) return false;
  const covered = new Set(fields.flatMap((field) => field.targets.map((target) => `${target.region}.${target.key}`)));
  return wordFields(activity).every((field) => field.targets.every((target) => covered.has(`${target.region}.${target.key}`)));
};
