import { artworkColors } from "@/components/islandcn/artwork";
import { withBubble } from "@/components/islandcn/island-text";
import { islandAccent } from "@/components/islandcn/theme";
import type { ActivityContent } from "@/lib/island";

import { type Imports, type Piece, type PieceContext, type RegistryItemName, type RenderValues, indent, mergeImports, piece, rowLine } from "./content";
import { type ActivitySpec, DONE_SOURCE, REGIONS, type Region, artSeed, reachableDoneLabel, sampleCover, usesButtonAction, usesProgress, usesTimer } from "./model";

/*
 * One activity, two ways: the content the stage hands to the engine, and the
 * source of the function that builds the same content in the user's app.
 */

/** `now-playing` to `NowPlaying`. */
export const pascal = (id: string) =>
  id
    .split("-")
    .filter((part) => part !== "")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");

const lowerFirst = (name: string) => `${name.charAt(0).toLowerCase()}${name.slice(1)}`;

/** Seconds as a millisecond literal with digit separators: 272 to `272_000`. */
const milliseconds = (seconds: number) => String(seconds * 1000).replace(/\B(?=(\d{3})+(?!\d))/g, "_");

export const timerName = (activity: ActivitySpec) => (activity.timer.mode === "countdown" ? "endsAt" : "startedAt");

/** The identifiers one activity declares in the generated file. */
export interface ActivityNames {
  /** The state interface, such as `UploadState`. */
  readonly stateType: string;
  /** The content function, such as `uploadContent`. */
  readonly content: string;
  /** The hook, such as `useUploadActivity`. */
  readonly hook: string;
  /** The hook's result in the example, such as `upload`. */
  readonly local: string;
  /** What a screen reader hears at a progress, such as `uploadLabel`; declared only when the label changes at 100%. */
  readonly label: string;
}

/*
 * Words a `const` can't be named in a module (modules are strict), plus a few
 * globals that would compile but read as a bug.
 */
const RESERVED: ReadonlySet<string> = new Set([
  "arguments", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do",
  "else", "enum", "eval", "export", "extends", "false", "finally", "for", "function", "if", "implements", "import", "in",
  "instanceof", "interface", "let", "new", "null", "package", "private", "protected", "public", "return", "static",
  "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield",
  "undefined", "globalThis", "window", "document",
]);

/** Names the generated file always declares or imports, whatever the build holds. */
const FIXED_NAMES = ["AppIsland", "IslandExample", "Island", "IslandProvider", "IslandApi", "ActivityContent", "ReactNode", "useEffect", "useMemo", "useIslandActions", "islandAccent"] as const;

const bindingNames = (imports: Imports) => [...imports.values()].flatMap((names) => [...names].map((name) => name.replace(/^type /, "")));

/**
 * Unique identifiers for each activity, in order. Two ids can normalise to the
 * same name (`upload` and `upload-` both give `Upload`), and an id can match an
 * import or a keyword (`new`, `use-effect`), so names are allocated against
 * everything the file already declares: the first activity keeps its plain
 * name, a clash gets a number, and a local that would be a keyword gets an
 * `Activity` suffix. The stage's log and the inspector use the same names, so
 * what they print matches the copied file.
 */
/** `now-playing` to "Now playing": what tabs and pickers call an activity. */
export const readableName = (id: string) => {
  const words = id.split("-").filter((part) => part !== "").join(" ");
  return words === "" ? "Activity" : `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

/** Both activities' names for tabs, kept apart when two ids read the same ("upload" and "upload-"). */
export const activityLabels = (primary: ActivitySpec, second: ActivitySpec | null): { primary: string; second: string | null } => {
  const first = readableName(primary.id);
  if (second === null) return { primary: first, second: null };
  const other = readableName(second.id);
  return { primary: first, second: other === first ? `${other} 2` : other };
};

export const buildNames = (primary: ActivitySpec, second: ActivitySpec | null): { primary: ActivityNames; second: ActivityNames | null } => {
  const taken = new Set<string>(FIXED_NAMES);
  for (const activity of second === null ? [primary] : [primary, second]) for (const name of bindingNames(contentImports(activity))) taken.add(name);
  const claim = (activity: ActivitySpec): ActivityNames => {
    const base = pascal(activity.id) || "Activity";
    for (let attempt = 1; ; attempt += 1) {
      const name = attempt === 1 ? base : `${base}${attempt}`;
      const lower = lowerFirst(name);
      const local = RESERVED.has(lower) ? `${lower}Activity` : lower;
      const names = { stateType: `${name}State`, content: `${lower}Content`, hook: `use${name}Activity`, local, label: `${lower}Label` } as const satisfies ActivityNames;
      const all = [names.stateType, names.content, names.hook, names.local, names.label];
      if (all.some((identifier) => taken.has(identifier))) continue;
      for (const identifier of all) taken.add(identifier);
      return names;
    }
  };
  const first = claim(primary);
  return { primary: first, second: second === null ? null : claim(second) };
};

/** The activity's accent as a colour: a named one, or the colour of its cover art (blue with no art). */
export const accentColor = (activity: ActivitySpec): string => {
  if (activity.accent !== "art") return islandAccent[activity.accent];
  const seed = artSeed(activity);
  if (seed === null) return islandAccent.blue;
  return sampleCover(seed)?.accent ?? artworkColors(seed).accent;
};

/** The source line that declares `accent` in the generated content function. */
const accentSource = (activity: ActivitySpec): { line: string; imports: Imports } => {
  if (activity.accent !== "art") return { line: `const accent = islandAccent.${activity.accent};`, imports: new Map([["@/components/islandcn/theme", new Set(["islandAccent"])]]) };
  const seed = artSeed(activity);
  if (seed === null) return { line: "const accent = islandAccent.blue;", imports: new Map([["@/components/islandcn/theme", new Set(["islandAccent"])]]) };
  const cover = sampleCover(seed);
  // A photographic cover's own tint, written out; a drawn cover's comes from its seed, as the preset takes it.
  if (cover !== null) return { line: `const accent = ${JSON.stringify(cover.accent)};`, imports: new Map() };
  return { line: `const accent = artworkColors(${JSON.stringify(seed)}).accent;`, imports: new Map([["@/components/islandcn/artwork", new Set(["artworkColors"])]]) };
};

const pieces = (activity: ActivitySpec, values: RenderValues) => {
  const names = { id: activity.id, timerSource: timerName(activity) };
  const context: PieceContext = {
    hasBottom: activity.regions.expandedBottom.kind !== "none",
    line: rowLine(activity.regions),
    bubbleMinutes: bubbleMinutes(activity),
    pairInBubble: !hasBubble(activity),
  };
  const of = (region: Region) => piece(activity.regions[region], region, values, names, context);
  return {
    compactLeading: of("compactLeading"),
    compactTrailing: of("compactTrailing"),
    minimal: of("minimal"),
    expandedLeading: of("expandedLeading"),
    expandedCenter: of("expandedCenter"),
    expandedTrailing: of("expandedTrailing"),
    expandedBottom: of("expandedBottom"),
  } as const satisfies Record<Region, Piece>;
};

/** Whether the activity has a bubble form: the split's bubble then shows the minimal region alone. */
const hasBubble = (activity: ActivitySpec) => activity.regions.minimal.kind !== "none";

/**
 * Whether the split's bubble shows the compact pair with a countdown in it, which reads in whole
 * minutes there (`PieceContext.bubbleMinutes`): the reference's bubble holds a dot and "7".
 */
const bubbleMinutes = (activity: ActivitySpec) => !hasBubble(activity) && activity.timer.mode === "countdown";

/** Whether the generated content gives its compact countdown a whole-minutes form for the bubble. */
const shortensInBubble = (activity: ActivitySpec) => bubbleMinutes(activity) && activity.regions.compactTrailing.kind === "timer";

/**
 * The content the stage starts or updates with. Every key is present, so an
 * update that empties a region clears it (the engine merges nested content).
 */
export const stageContent = (activity: ActivitySpec, values: RenderValues): ActivityContent => {
  const all = pieces(activity, values);
  // An empty region stays empty: a blank activity is a plain black pill, as an app's would be. The
  // region guide lives on the inspector's map, never inside the island (Leo read dashed slots as broken).
  const compact = { leading: all.compactLeading.node, trailing: all.compactTrailing.node };
  return {
    // With a bubble form, the split's bubble shows the minimal region instead of the compact pair cut to fit.
    compact: hasBubble(activity) ? withBubble(compact, all.minimal.node) : compact,
    minimal: hasBubble(activity) ? all.minimal.node : undefined,
    expanded: {
      leading: all.expandedLeading.node,
      center: all.expandedCenter.node,
      trailing: all.expandedTrailing.node,
      bottom: all.expandedBottom.node,
    },
  };
};

/** Whether every region of the activity is empty: the stage then explains the dashed slots. */
export const isBlank = (activity: ActivitySpec) => REGIONS.every((region) => activity.regions[region].kind === "none");

/** Values the source never reads; the stage's values don't reach the generated code. */
const SOURCE_VALUES: RenderValues = {
  accent: "#000000",
  progress: 0,
  timer: { kind: "fixed", ms: 0 },
  onButton: () => undefined,
};

/** Every import the activity's regions need, before the engine's own. */
const contentImports = (activity: ActivitySpec): Imports =>
  mergeImports([
    ...Object.values(pieces(activity, SOURCE_VALUES)).map((part) => part.imports),
    accentSource(activity).imports,
    hasBubble(activity) ? new Map([["@/components/islandcn/island-text", new Set(["withBubble"])]]) : new Map(),
  ]);

const property = (key: string, source: string) =>
  source.includes("\n") ? `${key}: (\n${indent(source)}\n),` : `${key}: ${source},`;

const block = (key: string, entries: readonly (readonly [string, Piece])[]) => {
  const filled = entries.filter(([, part]) => part.source !== "");
  if (filled.length === 0) return null;
  return `${key}: {\n${filled.map(([name, part]) => indent(property(name, part.source))).join("\n")}\n},`;
};

/**
 * True when anything the activity shows takes its accent, read from the generated source, so the
 * accent picker only shows when picking a colour changes something (the charging battery keeps its
 * measured greens whatever the accent).
 */
export const usesAccent = (activity: ActivitySpec): boolean =>
  Object.values(pieces(activity, SOURCE_VALUES)).some((piece) => ACCENT_REFERENCE.test(codeOnly(piece.source).replace(CHARGING_PART, "")));

/** The source with someone's words taken out: string literals emptied and JSX text between tags dropped. */
const codeOnly = (source: string) => source.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/>[^<>{}]*</g, "><");

/**
 * The accent as code uses it: `{accent}`, `tint(accent, ...)`, `color: accent` in an object. Read
 * after `codeOnly`, so the word in someone's text never counts.
 */
const ACCENT_REFERENCE = /\{accent\}|\(accent,|:\s*accent\s*[,}]/;

/** A charging battery's parts: they take `color={accent}` but draw the fixed charging greens. */
const CHARGING_PART = /<(?:BatteryGlyph|ChargingLevel|ChargingRowLevel)\b[^>]*\bcharging\b[^>]*\/>/g;

export interface ActivitySource {
  /** Declarations for this activity: its state type, content function and hook. */
  source: string;
  imports: Imports;
  items: ReadonlySet<RegistryItemName>;
  /** The hook's name, such as `useUploadActivity`. */
  hook: string;
  /** A local name for the hook's result in examples, such as `upload`. */
  local: string;
  /** The argument `show()` takes in the example, or "" when it takes none. */
  exampleArgument: string;
  hasState: boolean;
}

export const activitySource = (activity: ActivitySpec, options: { priority: number | null; names: ActivityNames }): ActivitySource => {
  const { stateType, content: contentName, hook, local, label: labelName } = options.names;
  const all = pieces(activity, SOURCE_VALUES);
  const progress = usesProgress(activity);
  const timer = usesTimer(activity);
  const needsIsland = usesButtonAction(activity);
  const hasState = progress || timer;

  const stateFields = [
    progress ? "  /** From 0 to 1. */\n  progress: number;" : null,
    timer
      ? activity.timer.mode === "countdown"
        ? "  /** When the countdown reaches zero, in epoch ms. */\n  endsAt: number;"
        : "  /** When the clock started counting, in epoch ms. */\n  startedAt: number;"
      : null,
  ].filter((field): field is string => field !== null);
  const destructured = [progress ? "progress" : null, timer ? timerName(activity) : null].filter((field): field is string => field !== null);

  const params = [hasState ? `{ ${destructured.join(", ")} }: ${stateType}` : null, needsIsland ? "island: IslandApi" : null].filter(
    (param): param is string => param !== null,
  );
  const call = (state: string) => `${contentName}(${[hasState ? state : null, needsIsland ? "island" : null].filter((arg): arg is string => arg !== null).join(", ")})`;

  const bubble = hasBubble(activity);
  const compactBlock = block("compact", [
    ["leading", all.compactLeading],
    ["trailing", all.compactTrailing],
  ]);
  // With a bubble form the compact pair goes through `withBubble`, and the same node is the minimal view.
  const compactEntry =
    compactBlock !== null && bubble ? compactBlock.replace(/^compact: \{/, "compact: withBubble({").replace(/\},$/, "}, bubble),") : compactBlock;
  const regions = [
    compactEntry,
    bubble ? "minimal: bubble," : null,
    block("expanded", [
      ["leading", all.expandedLeading],
      ["center", all.expandedCenter],
      ["trailing", all.expandedTrailing],
      ["bottom", all.expandedBottom],
    ]),
  ].filter((entry): entry is string => entry !== null);

  const accent = accentSource(activity);
  const stateDecl = hasState ? `interface ${stateType} {\n${stateFields.join("\n")}\n}\n\n` : "";
  const contentDecl = `/** What the ${activity.id} activity shows${hasState ? " for the values you pass" : ""}. */
const ${contentName} = (${params.join(", ")}): ActivityContent => {
  ${accent.line}${bubble ? `\n  // What the split's bubble shows when this is the second activity, in place of the compact pair.\n  const bubble = ${all.minimal.source.includes("\n") ? `(\n${indent(all.minimal.source, 4)}\n  )` : all.minimal.source};` : ""}${shortensInBubble(activity) ? `\n  // In the split's bubble the countdown reads in whole minutes: "4:31" doesn't fit there.` : ""}
  return {
${indent(regions.join("\n"), 4)}
  };
};`;

  const stateArg = hasState ? `state: ${stateType}` : "";
  // A label that changes at 100% goes with every start and update, on the same condition as the content's words.
  const doneLabel = reachableDoneLabel(activity);
  const labelDecl =
    doneLabel === null
      ? ""
      : `\n\n/** What a screen reader hears for the ${activity.id} activity: the finished words at 100%. */\nconst ${labelName} = ({ progress }: ${stateType}) => (${DONE_SOURCE} ? ${JSON.stringify(doneLabel)} : ${JSON.stringify(activity.label)});`;
  const labelField = doneLabel === null ? null : `label: ${labelName}(state)`;
  const startFields = [`id: ${JSON.stringify(activity.id)}`, labelField ?? `label: ${JSON.stringify(activity.label)}`, options.priority === null ? null : `priority: ${options.priority}`]
    .filter((field): field is string => field !== null)
    .join(", ");
  const updateOf = (extra: string | null) => {
    const fields = [labelField, extra].filter((field): field is string => field !== null);
    return fields.length === 0 ? call("state") : `{ ${labelField === null ? "" : `${labelField}, `}...${call("state")}${extra === null ? "" : `, ${extra}`} }`;
  };
  const methods = [
    `show: (${stateArg}) => island.start({ ${startFields}, ...${call("state")} }),`,
    hasState ? `update: (${stateArg}) => island.update(${JSON.stringify(activity.id)}, ${updateOf(null)}),` : null,
    `alert: (${stateArg}) => island.update(${JSON.stringify(activity.id)}, ${updateOf("alert: true")}),`,
    `expand: () => island.expand(${JSON.stringify(activity.id)}),`,
    "collapse: () => island.collapse(),",
    `dismiss: () => island.end(${JSON.stringify(activity.id)}),`,
  ].filter((method): method is string => method !== null);

  const hookDecl = `/** Starts, updates and ends the ${activity.id} activity. */
export const ${hook} = () => {
  const island = useIslandActions();
  return useMemo(
    () => ({
${indent(methods.join("\n"), 6)}
    }),
    [island],
  );
};`;

  const exampleFields = [
    progress ? `progress: ${Number(activity.progress.toFixed(2))}` : null,
    timer
      ? activity.timer.mode === "countdown"
        ? `endsAt: Date.now() + ${milliseconds(activity.timer.seconds)}`
        : `startedAt: Date.now() - ${milliseconds(activity.timer.seconds)}`
      : null,
  ].filter((field): field is string => field !== null);

  const items = new Set<RegistryItemName>(["island-core", "island-content"]);
  for (const part of Object.values(all)) for (const item of part.items) items.add(item);

  const engineNames = new Set(["type ActivityContent", "useIslandActions"]);
  if (needsIsland) engineNames.add("type IslandApi");

  return {
    source: `${stateDecl}${contentDecl}${labelDecl}\n\n${hookDecl}`,
    imports: mergeImports([
      ...Object.values(all).map((part) => part.imports),
      accent.imports,
      bubble ? new Map([["@/components/islandcn/island-text", new Set(["withBubble"])]]) : new Map<string, Set<string>>(),
      new Map([
        ["@/lib/island", engineNames],
        ["react", new Set(["useMemo"])],
      ]),
    ]),
    items,
    hook,
    local,
    exampleArgument: hasState ? `{ ${exampleFields.join(", ")} }` : "",
    hasState,
  };
};
