/*
 * The playground promises that the copied file compiles. This generates the
 * file for every starter and for names built to collide (two ids that
 * normalise to one name, keywords, imports, the file's own declarations) and
 * type-checks each one against the real engine and content kit, in memory.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import ts from "typescript";

import { buildNames } from "@/components/site/playground/activity";
import { generateCode } from "@/components/site/playground/codegen";
import {
  type ActivitySpec,
  type ActivityStarter,
  type Build,
  type ButtonTone,
  type Content,
  KINDS_BY_SIZE,
  REGION_INFO,
  REGIONS,
  type Region,
  type StarterKey,
  companionFor,
  defaultContent,
  secondFrom,
  starterBuild,
} from "@/components/site/playground/model";
import { DEFAULT_SPRINGS } from "@/components/site/playground/motion";

const ROOT = path.resolve(import.meta.dirname, "..");
const REGISTRY_URL = "http://localhost:3000/r";

const STARTERS = [
  "blank",
  "upload",
  "timer",
  "now-playing",
  "incoming-call",
  "eta",
  "recording",
  "transfer",
  "battery",
  "split",
] as const satisfies readonly StarterKey[];

const renamed = (activity: ActivitySpec, id: string): ActivitySpec => ({ ...activity, id });

/** A split whose two activities carry the given ids, with content that uses state, a timer and island buttons. */
const pair = (first: string, second: string): Build => {
  const upload = starterBuild("upload").primary;
  const timer = starterBuild("timer").primary;
  return { from: "upload", primary: renamed(upload, first), second: renamed(timer, second) };
};

const ADVERSARIAL: readonly (readonly [string, string])[] = [
  ["upload", "upload-"],
  ["a-b", "a--b"],
  ["x", "x-"],
  ["new", "delete"],
  ["class", "await"],
  ["arguments", "eval"],
  ["use-effect", "use-memo"],
  ["island-accent", "use-island-actions"],
  ["upload", "use-upload-activity"],
  ["use-upload-activity", "upload"],
  ["upload-2", "upload"],
  ["activity", "activity-"],
  ["app-island", "island-example"],
  ["island", "island-provider"],
  ["cloud-arrow-up-icon", "timer-icon"],
  ["upload-glyph", "timer-glyph"],
  ["glyph", "icon-tile"],
  ["react-node", "activity-content"],
  ["undefined", "window"],
];

/** The upload starter with a caption on its bar, the one bottom-row layout no starter uses by default. */
const captionedBar = (): Build => {
  const build = starterBuild("upload");
  return { ...build, primary: { ...build.primary, regions: { ...build.primary.regions, expandedBottom: { kind: "bar", caption: "20.2 of 48 MB", cancel: false } } } };
};

const ACTIVITY_STARTERS = STARTERS.filter((key): key is ActivityStarter => key !== "blank" && key !== "split");

/** Every starter with every other preset as the split's second activity, as the Split picker offers them. */
const pairs = (): { name: string; build: Build }[] =>
  ACTIVITY_STARTERS.flatMap((first) =>
    ACTIVITY_STARTERS.map((second) => {
      const build = starterBuild(first);
      return { name: `split ${first} + ${second}`, build: { ...build, second: secondFrom(second, build.primary) } };
    }),
  );

/**
 * Builds that put every kind in every region it fits, round by round: round n gives each region
 * the nth kind of its menu (wrapping), so each kind meets several neighbours, with captions,
 * button tones and the other options varied from round to round.
 */
const everyKind = (): { name: string; build: Build }[] => {
  const longest = Math.max(...Object.values(KINDS_BY_SIZE).map((kinds) => kinds.length));
  const tones: readonly ButtonTone[] = ["accent", "neutral", "tinted", "destructive"];
  const vary = (content: Content, round: number): Content => {
    const odd = round % 2 === 1;
    switch (content.kind) {
      case "value":
      case "percent":
        return { ...content, caption: { text: odd ? "Cancel" : "20 of 48 MB", press: odd ? "dismiss" : null } };
      case "timer":
        return { ...content, format: odd ? "minutes" : "clock", end: round % 3 === 0, caption: { text: "Left", press: null }, tone: odd ? "primary" : "accent" };
      case "buttons":
        return { ...content, call: odd, buttons: content.buttons.map((button, index) => ({ ...button, tone: tones[(round + index) % tones.length] ?? "neutral" })) };
      case "scrubber":
        return { ...content, buttons: content.buttons.map((button, index) => ({ ...button, tone: tones[(round + index) % tones.length] ?? "neutral" })) };
      // The preset looks, every other round, with the colours and actions varied.
      case "glyph":
        return { ...content, tone: odd ? "primary" : "caution" };
      case "art":
        return { ...content, cover: odd };
      case "avatar":
        return { ...content, call: odd };
      case "meter":
        return { ...content, player: odd };
      case "text":
        return { ...content, wide: odd, tone: odd ? "secondary" : content.tone };
      case "player":
        return { ...content, output: odd };
      case "recorder":
        return { ...content, action: odd ? "none" : "collapse" };
      case "vehicle":
        return { ...content, icon: odd ? "Package" : "Bicycle" };
      case "driver":
        return { ...content, subtitle: odd ? "" : "7KXR482" };
      case "arrival":
        return { ...content, label: round % 3 === 0 ? "" : "Message {Kofi} `now`", text: odd ? "" : "Silver estate", action: odd ? "dismiss" : "none" };
      case "bar":
        return { ...content, caption: odd ? "12 MB" : "", cancel: round % 3 !== 1 };
      case "title":
        return { ...content, lines: odd ? 2 : 1 };
      case "battery":
        return { ...content, charging: !odd, percent: odd, label: round % 3 === 0 ? "" : "Charging", wide: round % 4 < 2 };
      case "status":
        return { ...content, row: odd, tone: round % 4 === 0 ? "secondary" : "accent", icon: round % 3 === 2 ? null : content.icon };
      case "route":
        return round % 3 === 0 ? content : { ...content, title: "Driver is on the way", subtitle: odd ? "7KXR482 · Silver estate" : "" };
      // Every shape of its line: none, a name alone, words on both sides, and words with no name.
      case "readout": {
        const lines = [
          { before: "", name: "", after: "" },
          { before: "", name: "launch.mov", after: "" },
          { before: "to", name: "Maya's Laptop", after: "· now" },
          { before: "Sending", name: "", after: "{3} `photos`" },
        ] as const;
        const line = lines[round % lines.length] ?? lines[0];
        return { ...content, ...line, tone: odd ? "accent" : "primary", detail: round % 3 === 0 ? "" : odd ? "Full in 5 min" : "20 of 48 MB" };
      }
      case "cancel":
        return { ...content, action: odd ? "none" : "dismiss", label: odd ? "Stop */ it" : "Cancel" };
      default:
        return content;
    }
  };
  const builds: { name: string; build: Build }[] = [];
  for (let round = 0; round < longest; round += 1) {
    const base = starterBuild("blank").primary;
    const entries = REGIONS.map((region): [Region, Content] => {
      const size = REGION_INFO[region].size;
      const kinds: readonly Content["kind"][] = KINDS_BY_SIZE[size];
      const kind = kinds[(round + REGIONS.indexOf(region)) % kinds.length] ?? "none";
      return [region, vary(defaultContent(kind, size), round)];
    });
    const regions = { ...base.regions, ...Object.fromEntries(entries) };
    for (const mode of ["countdown", "elapsed"] as const) {
      const primary: ActivitySpec = { ...base, id: `kinds-${round}`, accent: round % 3 === 0 ? "art" : "orange", timer: { mode, seconds: 90 }, regions };
      builds.push({ name: `every kind, round ${round}, ${mode}`, build: { from: "blank", primary, second: null } });
    }
  }
  return builds;
};


const cases: { name: string; build: Build }[] = [
  ...pairs(),
  ...everyKind(),
  ...STARTERS.map((key) => ({ name: `starter ${key}`, build: starterBuild(key) })),
  { name: "a progress bar with a caption", build: captionedBar() },
  ...STARTERS.filter((key) => key !== "split").map((key) => {
    const build = starterBuild(key);
    return { name: `starter ${key} with a companion`, build: { ...build, second: companionFor(build.primary) } };
  }),
  ...ADVERSARIAL.map(([first, second]) => ({ name: `names ${first} + ${second}`, build: pair(first, second) })),
];

const compilerOptions = (): ts.CompilerOptions => {
  const file = ts.readConfigFile(path.join(ROOT, "tsconfig.json"), ts.sys.readFile);
  if (file.error) throw new Error(ts.flattenDiagnosticMessageText(file.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(file.config, ts.sys, ROOT);
  return { ...parsed.options, incremental: false, noEmit: true, plugins: [] };
};

/** Type-checks every file in one program, each as if it were `app-island.tsx` in the repo. */
const typeCheck = (files: ReadonlyMap<string, string>) => {
  const options = compilerOptions();
  const host = ts.createCompilerHost(options, true);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (name) => files.has(name) || fileExists(name);
  host.readFile = (name) => files.get(name) ?? readFile(name);
  host.getSourceFile = (name, version, onError, create) => {
    const text = files.get(name);
    return text === undefined ? getSourceFile(name, version, onError, create) : ts.createSourceFile(name, text, version, true, ts.ScriptKind.TSX);
  };
  const program = ts.createProgram({ rootNames: [...files.keys()], options, host });
  const errors = new Map<string, string[]>();
  for (const name of files.keys()) {
    const source = program.getSourceFile(name);
    if (source === undefined) throw new Error(`${name} did not load`);
    const messages = ts.getPreEmitDiagnostics(program, source).map((diagnostic) => {
      const where = diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start) : null;
      return `${where ? `${where.line + 1}:${where.character + 1} ` : ""}${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
    });
    if (messages.length > 0) errors.set(name, messages);
  }
  return errors;
};

test("generated code type-checks for every starter and for colliding names", { timeout: 120_000 }, () => {
  const files = new Map<string, string>();
  const labels = new Map<string, string>();
  cases.forEach((one, index) => {
    // Inside the repo, so `@/` resolves to the real engine and kit.
    const file = path.join(ROOT, "components", `__codegen_case_${index}.tsx`);
    files.set(file, generateCode({ build: one.build, springs: DEFAULT_SPRINGS, reduced: index % 2 === 1, registryUrl: REGISTRY_URL }).code);
    labels.set(file, one.name);
  });
  const errors = typeCheck(files);
  const report = [...errors].map(([file, messages]) => `${labels.get(file)}:\n  ${messages.join("\n  ")}`).join("\n");
  assert.equal(errors.size, 0, `generated code failed to type-check:\n${report}`);
});

test("colliding ids get distinct names, and the first keeps its plain name", () => {
  const names = buildNames(renamed(starterBuild("upload").primary, "upload"), renamed(starterBuild("timer").primary, "upload-"));
  assert.equal(names.primary.hook, "useUploadActivity");
  assert.equal(names.second?.hook, "useUpload2Activity");
  assert.equal(names.second?.local, "upload2");
});

test("a keyword id keeps a readable hook and a legal local", () => {
  const names = buildNames(renamed(starterBuild("upload").primary, "new"), null);
  assert.equal(names.primary.hook, "useNewActivity");
  assert.equal(names.primary.local, "newActivity");
});

// The install command must add every outside package the file imports, or the pasted file fails
// to compile. Every icon is an islandcn glyph now, which island-content ships with Hugeicons, so no
// starter's code imports an outside package and no command needs an npm install.
test("the install command adds the outside packages the file imports", () => {
  for (const starter of STARTERS) {
    const { code, install, packages } = generateCode({ build: starterBuild(starter), springs: DEFAULT_SPRINGS, reduced: false, registryUrl: REGISTRY_URL });
    const outside = [...code.matchAll(/from "([^"]+)"/g)].map((match) => match[1] ?? "").filter((from) => !from.startsWith("@/") && from !== "react");
    assert.deepEqual(packages, [...new Set(outside)].toSorted(), `${starter}: ${install}`);
    assert.equal(install.includes("npm install"), packages.length > 0, `${starter}: ${install}`);
    assert.equal(code.includes("@phosphor-icons/react"), false, `${starter} still imports Phosphor`);
    assert.deepEqual(packages, [], `${starter} imports an outside package: ${install}`);
  }
});

// QA: the copied now-playing code pointed at "/covers/saltwater-static.jpg", which a fresh app
// doesn't have. Every sample image the copied code names says it is one to swap.
test("a sample image in the copied code is marked as one", () => {
  for (const starter of ["now-playing", "upload", "incoming-call", "transfer"] as const) {
    const { code } = generateCode({ build: starterBuild(starter), springs: DEFAULT_SPRINGS, reduced: false, registryUrl: REGISTRY_URL });
    const sources = [...code.matchAll(/src="[^"]+"( \/\* sample image: use your own \*\/)?/g)];
    assert.ok(sources.length > 0, `${starter} names no image`);
    for (const source of sources) assert.ok(source[1] !== undefined, `${starter}: ${source[0]} is not marked as a sample`);
  }
});
