/*
 * Customize's basics: the words each preset shows, as plain fields. A field has to write the same
 * regions the region editor would, so the stage, the code and the share link follow it.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { generateCode } from "@/components/site/playground/codegen";
import { type StarterKey, starterBuild } from "@/components/site/playground/model";
import { DEFAULT_SPRINGS } from "@/components/site/playground/motion";
import { encodeState, parseState } from "@/components/site/playground/url-state";
import { fieldsStillFit, followWords, isUniform, layoutKey, wordFields, wordValue, withWords } from "@/components/site/playground/words";

const STARTERS = ["upload", "timer", "now-playing", "incoming-call", "eta", "recording", "transfer", "battery", "split"] as const satisfies readonly StarterKey[];

const labelsOf = (key: StarterKey) => wordFields(starterBuild(key).primary).map((field) => `${field.label}=${wordValue(starterBuild(key).primary, field)}`);

test("each preset offers its own words, in the order the expanded view reads them", () => {
  // The words for 100% follow the running ones, editable the same way.
  assert.deepEqual(labelsOf("upload"), ["Sentence=Uploading to Family", "Line above=mochi-asleep.jpg", "Detail=2.5 of 6 MB", "Sentence when done=Uploaded to Family"]);
  assert.deepEqual(labelsOf("transfer"), ["Sentence=To Maya's Laptop", "Line above=Sending biscuit-in-the-sun.jpg", "Line above when done=Sent biscuit-in-the-sun.jpg"]);
  assert.deepEqual(labelsOf("now-playing"), ["Track=Saltwater Static", "Artist=The Lagoon Club"]);
  assert.deepEqual(labelsOf("incoming-call"), ["Caller=Mochi's sitter", "Call type=mobile"]);
  assert.deepEqual(labelsOf("timer"), ["Title=Pasta"]);
  assert.deepEqual(labelsOf("blank"), []);
  // Nothing a person can't read: no icons, rings or meters.
  assert.deepEqual(labelsOf("recording"), []);
});

test("every field on every preset starts uniform and with a unique id", () => {
  for (const key of STARTERS) {
    const activity = starterBuild(key).primary;
    const fields = wordFields(activity);
    assert.equal(new Set(fields.map((field) => field.id)).size, fields.length, key);
    for (const field of fields) assert.ok(isUniform(activity, field), `${key} ${field.label}`);
  }
});

test("a caller's name is one field that renames the photo, the compact avatar and the text", () => {
  const activity = starterBuild("incoming-call").primary;
  const [caller] = wordFields(activity);
  if (caller === undefined) throw new Error("no caller field");
  assert.deepEqual(
    caller.targets.map((target) => target.region),
    ["expandedCenter", "expandedLeading", "compactLeading"],
  );
  const regions = withWords({ regions: activity.regions, field: caller, value: "Kofi Mensah" });
  assert.deepEqual(regions.expandedCenter, { ...activity.regions.expandedCenter, title: "Kofi Mensah" });
  assert.deepEqual(regions.expandedLeading, { ...activity.regions.expandedLeading, name: "Kofi Mensah" });
  assert.deepEqual(regions.compactLeading, { ...activity.regions.compactLeading, name: "Kofi Mensah" });
  // Typing never changes the layout, so the field list holds still.
  assert.equal(layoutKey({ ...activity, regions }), layoutKey(activity));
});

test("a field writes exactly what the region editor would, so code and links follow it", async () => {
  const build = starterBuild("upload");
  const name = wordFields(build.primary).find((field) => field.label === "Line above");
  if (name === undefined) throw new Error("no file name field");
  const viaWords = { ...build, primary: { ...build.primary, regions: withWords({ regions: build.primary.regions, field: name, value: "q3-report.pdf" }) } };
  const center = build.primary.regions.expandedCenter;
  if (center.kind !== "media") throw new Error("the upload's center is not a file and sentence");
  const viaEditor = { ...build, primary: { ...build.primary, regions: { ...build.primary.regions, expandedCenter: { ...center, subtitle: "q3-report.pdf" } } } };
  assert.deepEqual(viaWords, viaEditor);
  const code = (b: typeof build) => generateCode({ build: b, springs: DEFAULT_SPRINGS, reduced: false, registryUrl: "http://localhost:3000/r" }).code;
  assert.equal(code(viaWords), code(viaEditor));
  assert.ok(code(viaWords).includes("q3-report.pdf"));
  // The playground rewrites the label made of those words; the link carries the build as it is then.
  const followed = { ...viaWords, primary: followWords(viaWords.primary) };
  assert.equal(followed.primary.label, "Uploading to Family: q3-report.pdf");
  const state = { build: followed, springs: DEFAULT_SPRINGS, reduced: false, stage: "dark" as const, opens: "compact" as const };
  assert.deepEqual(await parseState(await encodeState(state)), state);
});

/** The starter's primary activity with one word field set, as typing in Customize's basics does. */
const typed = (key: StarterKey, label: string, value: string) => {
  const activity = starterBuild(key).primary;
  const field = wordFields(activity).find((one) => one.label === label);
  if (field === undefined) throw new Error(`${key} has no ${label} field`);
  return followWords({ ...activity, regions: withWords({ regions: activity.regions, field, value }) });
};

const copiedLabel = (key: StarterKey, primary: ReturnType<typeof typed>) => {
  const code = generateCode({ build: { ...starterBuild(key), primary }, springs: DEFAULT_SPRINGS, reduced: false, registryUrl: "http://localhost:3000/r" }).code;
  return /label: ("[^"]*")/.exec(code)?.[1];
};

test("the spoken label follows the words it is made of, on the stage and in the code", () => {
  // QA: the track renamed kept "Saltwater Static by The Lagoon Club"; the timer renamed kept "Pasta timer".
  const song = typed("now-playing", "Track", "QA Anthem");
  assert.equal(song.label, "QA Anthem by The Lagoon Club");
  assert.equal(copiedLabel("now-playing", song), JSON.stringify("QA Anthem by The Lagoon Club"));
  const soup = typed("timer", "Title", "Soup");
  assert.equal(soup.label, "Soup timer");
  assert.equal(copiedLabel("timer", soup), JSON.stringify("Soup timer"));
  assert.equal(typed("incoming-call", "Caller", "Ama").label, "Incoming call from Ama");
  assert.equal(typed("transfer", "Sentence", "To Kofi's Tablet").label, "Sending biscuit-in-the-sun.jpg to Kofi's Tablet");
  // A cleared word leaves the label as it was rather than "QA Anthem by".
  assert.equal(typed("now-playing", "Artist", "").label, "Saltwater Static by The Lagoon Club");
});

test("every starter's label is what its words make, so opening one changes nothing", () => {
  for (const key of ["upload", "timer", "now-playing", "incoming-call", "split", "eta", "transfer", "battery", "recording"] as const) {
    const build = starterBuild(key);
    for (const activity of [build.primary, build.second]) {
      if (activity === null) continue;
      assert.deepEqual(followWords(activity), activity, `${key} ${activity.id}`);
    }
  }
});

test("a label typed by hand stops following the words, and a link keeps it typed", async () => {
  const base = starterBuild("now-playing");
  // As the Spoken label field sets it: the typed words, and empty words, which the playground drops.
  const own = followWords({ ...base.primary, label: "Music", labelWords: "" });
  assert.equal(own.labelWords, undefined);
  const field = wordFields(own).find((one) => one.label === "Track");
  if (field === undefined) throw new Error("no Track field");
  const renamed = followWords({ ...own, regions: withWords({ regions: own.regions, field, value: "QA Anthem" }) });
  assert.equal(renamed.label, "Music");
  const state = { build: { ...base, primary: renamed }, springs: DEFAULT_SPRINGS, reduced: false, stage: "dark" as const, opens: "compact" as const };
  assert.deepEqual(await parseState(await encodeState(state)), state);
});

test("a link from before labels followed words opens speaking the words it shows", async () => {
  // A version 2 link that renamed the track but, as the playground then did, kept the old label.
  const old = { v: 2, f: "now-playing", p: { regions: { expandedCenter: { kind: "track", title: "QA Anthem", subtitle: "The Lagoon Club" } } } };
  const opened = await parseState(Buffer.from(JSON.stringify(old)).toString("base64url"));
  assert.equal(opened?.build.primary.label, "QA Anthem by The Lagoon Club");
  // One that carried a label typed by hand keeps it.
  const typedOld = { v: 2, f: "now-playing", p: { label: "Music", regions: { expandedCenter: { kind: "track", title: "QA Anthem", subtitle: "The Lagoon Club" } } } };
  assert.equal((await parseState(Buffer.from(JSON.stringify(typedOld)).toString("base64url")))?.build.primary.label, "Music");
});

test("a field keeps to the shortest limit of the regions it writes", () => {
  // A status beside the sensor (12 characters) and a center text (40) showing the same words are one field.
  const blank = starterBuild("blank").primary;
  const activity = {
    ...blank,
    regions: {
      ...blank.regions,
      expandedLeading: { kind: "status", icon: null, iconTone: "accent", text: "Uploading", tone: "secondary", row: true },
      expandedCenter: { kind: "text", text: "Uploading", tone: "primary", wide: false },
    },
  } as const satisfies typeof blank;
  const status = wordFields(activity).find((field) => field.targets.length === 2);
  if (status === undefined) throw new Error("no shared field");
  assert.equal(status.max, 12);
  const regions = withWords({ regions: activity.regions, field: status, value: "Uploading everything now" });
  assert.equal(wordValue({ ...activity, regions }, status), "Uploading ev");
});

test("two fields with one name say which side each is on", () => {
  const blank = starterBuild("blank").primary;
  const status = { kind: "status", icon: null, iconTone: "accent", text: "Left", tone: "secondary", row: false } as const;
  const activity = { ...blank, regions: { ...blank.regions, expandedLeading: status, expandedTrailing: { ...status, text: "Right" } } };
  assert.deepEqual(
    wordFields(activity).map((field) => field.label),
    ["Status, expanded leading", "Status, expanded trailing"],
  );
});

test("words added in the region editor to an empty optional slot get a field in the basics", () => {
  const timer = starterBuild("timer").primary;
  const fields = wordFields(timer);
  const key = layoutKey(timer);
  assert.ok(fieldsStillFit({ activity: timer, key, fields }));
  const center = timer.regions.expandedCenter;
  assert.equal(center.kind, "title");
  if (center.kind !== "title") return;
  // The region editor fills the empty subtitle: the list made before no longer covers it.
  const withSubtitle = { ...timer, regions: { ...timer.regions, expandedCenter: { ...center, end: false, subtitle: "Dinner" } } };
  assert.equal(fieldsStillFit({ activity: withSubtitle, key, fields }), false);
  assert.ok(wordFields(withSubtitle).some((field) => field.label === "Subtitle"));
  // Typing a field empty keeps the list: the cleared field still covers its own words.
  const subtitleFields = wordFields(withSubtitle);
  const cleared = { ...withSubtitle, regions: { ...withSubtitle.regions, expandedCenter: { ...center, end: false, subtitle: "" } } };
  assert.ok(fieldsStillFit({ activity: cleared, key, fields: subtitleFields }));
  // Switching the line to the clock time takes the subtitle away, so the list is made again.
  const withEnd = { ...withSubtitle, regions: { ...withSubtitle.regions, expandedCenter: { ...center, end: true, subtitle: "Dinner" } } };
  assert.equal(fieldsStillFit({ activity: withEnd, key, fields: subtitleFields }), false);
});

test("a label its words can't make any more survives a link as it was kept", async () => {
  // Sol's repro: rename the track, clear the artist, share, reopen. The label stays "QA Anthem by
  // The Lagoon Club" on the stage; the link used to drop it and reopen with the starter's.
  const base = starterBuild("now-playing");
  const renamed = typed("now-playing", "Track", "QA Anthem");
  const artist = wordFields(renamed).find((one) => one.label === "Artist");
  if (artist === undefined) throw new Error("no Artist field");
  const cleared = followWords({ ...renamed, regions: withWords({ regions: renamed.regions, field: artist, value: "" }) });
  assert.equal(cleared.label, "QA Anthem by The Lagoon Club");
  const state = { build: { ...base, primary: cleared }, springs: DEFAULT_SPRINGS, reduced: false, stage: "dark" as const, opens: "compact" as const };
  const reopened = await parseState(await encodeState(state));
  assert.equal(reopened?.build.primary.label, "QA Anthem by The Lagoon Club");
  assert.deepEqual(reopened, state);
  // Typing the artist back makes the label follow the words again.
  const back = followWords({ ...cleared, regions: withWords({ regions: cleared.regions, field: artist, value: "Harbor Lights" }) });
  assert.equal(back.label, "QA Anthem by Harbor Lights");
  assert.equal((await parseState(await encodeState({ ...state, build: { ...base, primary: back } })))?.build.primary.label, "QA Anthem by Harbor Lights");
});
