/*
 * The playground's share link. Links written before the compact format (version 1) must keep
 * opening the build they were made from, and a new link for a typical build must be short enough
 * to paste into a chat: a few hundred characters, not two thousand.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { type ActivitySpec, type Build, DEFAULT_STARTER, companionFor, galleryCompanion, isStarterKey, starterBuild } from "@/components/site/playground/model";
import { DEFAULT_SPRINGS } from "@/components/site/playground/motion";
import { type PlaygroundState, encodeState, encodeStatePlain, parseState } from "@/components/site/playground/url-state";
import { followWords } from "@/components/site/playground/words";

/*
 * The fixture's builds carry the fields added since (a title's `end`, a meter's `compactBars`) at
 * the values a version 1 link opens with; the links themselves are as main wrote them.
 */
interface Fixture {
  links: Record<"upload" | "split" | "blank", string>;
  builds: Record<"upload" | "split" | "blank", Build>;
}

const fixture: Fixture = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures/share-links-v1.json"), "utf8"));

const state = (build: Build, extra: Partial<PlaygroundState> = {}): PlaygroundState => ({ build, springs: DEFAULT_SPRINGS, reduced: false, stage: "dark", opens: "compact", ...extra });

test("version 1 links from main still open the build they were made from", async () => {
  const upload = await parseState(fixture.links.upload);
  assert.deepEqual(upload, state(fixture.builds.upload));

  const split = await parseState(fixture.links.split);
  assert.deepEqual(split?.build, fixture.builds.split);
  assert.deepEqual(split?.springs.expand, { response: 0.6, dampingFraction: 0.7 });
  assert.equal(split?.reduced, true);
  assert.equal(split?.stage, "light");

  // The old blank activity had a sparkle in compact leading; its link keeps it.
  const blank = await parseState(fixture.links.blank);
  assert.deepEqual(blank?.build, fixture.builds.blank);
  assert.equal(blank?.build.primary.regions.compactLeading.kind, "glyph");
});

test("a new link round-trips every starter, edited, with springs and settings", async () => {
  for (const key of ["blank", "upload", "timer", "now-playing", "incoming-call", "split", "eta", "transfer", "battery", "recording"] as const) {
    const base = starterBuild(key);
    const edited: PlaygroundState = state(
      { ...base, primary: { ...followWords({ ...base.primary, labelWords: "" }), label: "Résumé ✓", accent: "purple", progress: 0.7, regions: { ...base.primary.regions, compactTrailing: { kind: "text", text: "Hi", tone: "primary", wide: false } } } },
      { springs: { ...DEFAULT_SPRINGS, collapse: { response: 0.5, dampingFraction: 0.6 } }, reduced: true, stage: "light" },
    );
    assert.deepEqual(await parseState(await encodeState(edited)), edited, key);
    assert.deepEqual(await parseState(encodeStatePlain(edited)), edited, `${key} (uncompressed)`);
    assert.deepEqual(await parseState(await encodeState(state(base))), state(base), `${key} unedited`);
  }
});

test("removing the split's second activity survives the link", async () => {
  const split = starterBuild("split");
  const single = state({ ...split, second: null });
  assert.deepEqual(await parseState(await encodeState(single)), single);
});

/**
 * A fixture build's edits (its name, accent, progress and timer) laid over the starter as it is now.
 * The fixture's regions are what the starters held when it was captured, so encoding them as they
 * are measures how far the starters have moved since, not how long a typical edit's link is.
 */
const editedStarter = (build: Build): Build => {
  const base = starterBuild(build.from);
  // A label that differs from the starter's was typed, which (as the Spoken label field does) stops it following the words.
  const edits = (activity: ActivitySpec, starter: ActivitySpec): ActivitySpec =>
    followWords({ ...starter, id: activity.id, label: activity.label, ...(activity.label === starter.label ? {} : { labelWords: "" }), accent: activity.accent, progress: activity.progress, timer: activity.timer });
  const second = build.second === null || base.second === null ? base.second : edits(build.second, base.second);
  return { ...base, primary: edits(build.primary, base.primary), second };
};

test("typical links are a few hundred characters", async () => {
  // The same edits that made 846 and 2,028 character links in version 1.
  const upload = await encodeState(state(editedStarter(fixture.builds.upload)));
  const split = await encodeState(state(editedStarter(fixture.builds.split), { springs: { ...DEFAULT_SPRINGS, expand: { response: 0.6, dampingFraction: 0.7 } }, reduced: true, stage: "light" }));
  assert.ok(upload.length < 150, `upload link is ${upload.length} characters`);
  assert.ok(split.length < 150, `split link is ${split.length} characters`);
  // A blank activity filled in every region is the longest common case.
  const blank = starterBuild("blank");
  const filled = state({ ...blank, primary: { ...starterBuild("now-playing").primary, id: "custom", label: "Custom activity" } }, {});
  const full = await encodeState({ ...filled, build: { ...filled.build, from: "blank" } });
  assert.ok(full.length < 600, `filled blank link is ${full.length} characters`);
  // An unedited preset from the gallery is tiny.
  assert.ok(encodeStatePlain(state(starterBuild("upload"))).length < 40);
});

test("a gallery link opens the view it was showing", async () => {
  // An incoming call rings expanded in the gallery, so its link opens expanded; a link without the field opens compact.
  const call = state(starterBuild("incoming-call"), { opens: "expanded" });
  assert.deepEqual(await parseState(encodeStatePlain(call)), call);
  assert.deepEqual(await parseState(await encodeState(call)), call);
  assert.equal((await parseState(encodeStatePlain(state(starterBuild("upload")))))?.opens, "compact");
  // A split view is a build with the companion as its second activity; it opens compact, as a split.
  const upload = starterBuild("upload");
  const split = state({ ...upload, second: companionFor(upload.primary) });
  assert.deepEqual(await parseState(encodeStatePlain(split)), split);
});

test("links that are not builds open nothing", async () => {
  for (const raw of ["", "zzzz", "z", "eyJ2Ijo5fQ", "not base64 at all!", `z${"A".repeat(40)}`]) assert.equal(await parseState(raw), null, raw);
});

test("a gallery Split view opens with the companion it showed, and the expanded split opens expanded", async () => {
  // Beside most presets the gallery's split runs the Now playing preset, as the playground's Split menu suggests it.
  const upload = starterBuild("upload");
  const nowPlaying = galleryCompanion(upload.primary);
  assert.deepEqual(nowPlaying, starterBuild("now-playing").primary);
  assert.equal(nowPlaying.regions.compactLeading.kind, "art");
  const split = state({ ...upload, second: nowPlaying });
  assert.deepEqual(await parseState(await encodeState(split)), split);
  // Beside Now playing it runs what the playground's Split menu suggests there.
  const music = starterBuild("now-playing").primary;
  assert.deepEqual(galleryCompanion(music), companionFor(music));
  // The split preset shown expanded carries the view, so the playground opens it expanded.
  const expanded = state(starterBuild("split"), { opens: "expanded" });
  assert.equal((await parseState(encodeStatePlain(expanded)))?.opens, "expanded");
});

test("the timer's rebuild shows its name with no end time under it, as the timer preset does", async () => {
  for (const key of ["timer", "split"] as const) {
    const center = starterBuild(key).primary.regions.expandedCenter;
    assert.equal(center.kind, "title", key);
    assert.equal(center.kind === "title" && center.end, false, key);
  }
  // The recording is the voice recorder's one row: no title, the waveform and the time with its stop ring.
  const recording = starterBuild("recording").primary.regions;
  assert.equal(recording.expandedCenter.kind, "none");
  assert.deepEqual(recording.expandedLeading, { kind: "wave" });
  assert.deepEqual(recording.expandedTrailing, { kind: "recorder", action: "dismiss" });
  const timer = state(starterBuild("timer"));
  assert.deepEqual(await parseState(await encodeState(timer)), timer);
});

test("links made before the label-led rebuilds open their regions as they were", async () => {
  // A status, a battery and a route as version 2 wrote them before `row`, `label` and the route's headline.
  const raw = {
    v: 2,
    f: "blank",
    p: {
      regions: {
        expandedLeading: { kind: "status", icon: "Warning", iconTone: "caution", text: "Agent", tone: "secondary" },
        expandedTrailing: { kind: "battery", charging: true, percent: false },
        expandedBottom: { kind: "route", vehicle: "Car", destination: "MapPin" },
      },
    },
  };
  const opened = await parseState(Buffer.from(JSON.stringify(raw)).toString("base64url"));
  const regions = opened?.build.primary.regions;
  assert.deepEqual(regions?.expandedLeading, { kind: "status", icon: "Warning", iconTone: "caution", text: "Agent", tone: "secondary", row: false });
  assert.deepEqual(regions?.expandedTrailing, { kind: "battery", charging: true, percent: false, label: "", wide: false });
  assert.deepEqual(regions?.expandedBottom, { kind: "route", vehicle: "Car", destination: "MapPin", title: "", subtitle: "" });
});

test("links made before the preset looks open their regions in the kit's own look", async () => {
  // Regions as version 2 wrote them before a glyph's tone, a cover, a call's photo and buttons, the player's meter and the charging pill's width.
  const raw = {
    v: 2,
    f: "blank",
    p: {
      regions: {
        compactLeading: { kind: "text", text: "Charging", tone: "accent" },
        compactTrailing: { kind: "battery", charging: true, percent: true, label: "" },
        minimal: { kind: "glyph", icon: "Phone" },
        expandedLeading: { kind: "avatar", name: "Maya Lindqvist" },
        expandedCenter: { kind: "title", title: "Maya", subtitle: "mobile", lines: 1 },
        expandedTrailing: { kind: "buttons", buttons: [{ icon: "Phone", label: "Accept", tone: "accent", action: "collapse" }] },
        expandedBottom: { kind: "meter", compactBars: 4 },
      },
    },
  };
  const regions = (await parseState(Buffer.from(JSON.stringify(raw)).toString("base64url")))?.build.primary.regions;
  assert.deepEqual(regions?.compactLeading, { kind: "text", text: "Charging", tone: "accent", wide: false });
  assert.deepEqual(regions?.compactTrailing, { kind: "battery", charging: true, percent: true, label: "", wide: false });
  assert.deepEqual(regions?.minimal, { kind: "glyph", icon: "Phone", tone: "accent" });
  assert.deepEqual(regions?.expandedLeading, { kind: "avatar", name: "Maya Lindqvist", call: false });
  assert.deepEqual(regions?.expandedTrailing, { kind: "buttons", buttons: [{ icon: "Phone", label: "Accept", tone: "accent", action: "collapse" }], call: false });
  assert.deepEqual(regions?.expandedBottom, { kind: "meter", compactBars: 4, player: false });
});

test("the six Apple-matched rebuilds survive a link, edited", async () => {
  for (const key of ["now-playing", "incoming-call", "recording", "battery", "eta"] as const) {
    const base = starterBuild(key);
    const opened = await parseState(await encodeState(state(base)));
    assert.deepEqual(opened?.build, base, key);
  }
  const ride = starterBuild("eta");
  const edited = state({
    ...ride,
    primary: { ...ride.primary, regions: { ...ride.primary.regions, expandedBottom: { kind: "arrival", text: "3 items", label: "", action: "dismiss" }, expandedLeading: { kind: "vehicle", icon: "Package" } } },
  });
  assert.deepEqual(await parseState(await encodeState(edited)), edited);
});

/*
 * The AI task preset (`agent-run`) was removed, with the orbit mark, shimmering text and approval
 * kinds only it used. Links made while it existed must still open, and never as a crash or nothing.
 */

/** A link's value as the site wrote it before compression: base64url JSON. */
const plainLink = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** The AI task's regions as the playground built them, with every kind it used. */
const agentRegions = {
  compactLeading: { kind: "agent" },
  compactTrailing: { kind: "shimmer", text: "Thinking" },
  minimal: { kind: "agent" },
  expandedLeading: { kind: "status", icon: null, iconTone: "accent", text: "Agent", tone: "secondary", row: false, mark: true },
  expandedCenter: { kind: "none" },
  expandedTrailing: { kind: "status", icon: null, iconTone: "caution", text: "Waiting", tone: "caution", row: false, mark: false },
  expandedBottom: { kind: "approval", title: "Run the database migration?", command: "pnpm db:migrate --env staging", deny: "Not now", approve: "Run it" },
};

/** What those regions open as now: the nearest kind left for each removed one. */
const agentRegionsNow = {
  compactLeading: { kind: "glyph", icon: "Sparkle", tone: "accent" },
  compactTrailing: { kind: "text", text: "Thinking", tone: "secondary", wide: false },
  minimal: { kind: "glyph", icon: "Sparkle", tone: "accent" },
  expandedLeading: { kind: "status", icon: "Sparkle", iconTone: "accent", text: "Agent", tone: "secondary", row: false },
  expandedCenter: { kind: "none" },
  expandedTrailing: { kind: "status", icon: null, iconTone: "caution", text: "Waiting", tone: "caution", row: false },
  expandedBottom: {
    kind: "buttons",
    buttons: [
      { icon: "X", label: "Not now", tone: "neutral", action: "collapse" },
      { icon: "Check", label: "Run it", tone: "accent", action: "collapse" },
    ],
    call: false,
  },
};

const agentActivity = { id: "agent", label: "Agent needs approval", accent: "lagoon", progress: 0.42, timer: { mode: "countdown", seconds: 300 }, regions: agentRegions };

test("the removed AI task preset is no starter, and the default preset is the upload", () => {
  assert.equal(isStarterKey("agent-run"), false);
  assert.equal(DEFAULT_STARTER, "upload");
  assert.equal(isStarterKey(DEFAULT_STARTER), true);
});

test("a gallery link to the removed AI task opens the default preset", async () => {
  assert.deepEqual(await parseState(plainLink({ v: 2, f: "agent-run" })), state(starterBuild(DEFAULT_STARTER)));
  // An edited one: its changes were against the AI task, so they are dropped; its settings stay.
  const edited = await parseState(
    plainLink({ v: 2, f: "agent-run", p: { label: "Mine", regions: { compactTrailing: { kind: "shimmer", text: "Working" } } }, m: { expand: [0.5, 0.6] }, t: "light", o: "expanded" }),
  );
  assert.deepEqual(edited?.build, starterBuild(DEFAULT_STARTER));
  assert.deepEqual(edited?.springs.expand, { response: 0.5, dampingFraction: 0.6 });
  assert.equal(edited?.stage, "light");
  assert.equal(edited?.opens, "expanded");
});

test("a whole-build link with the AI task's kinds opens them as the nearest kinds left", async () => {
  const opened = await parseState(plainLink({ v: 1, f: "agent-run", p: agentActivity, s: null }));
  assert.equal(opened?.build.from, "blank");
  assert.equal(opened?.build.primary.id, "agent");
  assert.deepEqual(opened?.build.primary.regions, agentRegionsNow);
  assert.equal(opened?.build.second, null);
});

test("a split whose second activity was the AI task keeps it, with the nearest kinds", async () => {
  const opened = await parseState(plainLink({ v: 2, f: "split", s: agentActivity }));
  assert.deepEqual(opened?.build.primary, starterBuild("split").primary);
  assert.deepEqual(opened?.build.second?.regions, agentRegionsNow);
  // A link for the new build round-trips as itself.
  if (opened === null) throw new Error("the split link did not open");
  assert.deepEqual(await parseState(await encodeState(opened)), opened);
});

test("a photo in a link is one of the site's sample photos, never a URL", async () => {
  const link = encodeStatePlain(state(starterBuild("upload")));
  const json = JSON.parse(Buffer.from(link, "base64url").toString("utf8"));
  json.p = { regions: { compactLeading: { kind: "photo", photo: "https://example.com/pixel.png" }, expandedLeading: { kind: "device", icon: "Laptop", photo: "javascript:alert(1)" } } };
  const parsed = await parseState(Buffer.from(JSON.stringify(json)).toString("base64url"));
  assert.deepEqual(parsed?.build.primary.regions.compactLeading, { kind: "photo", photo: "none" });
  assert.deepEqual(parsed?.build.primary.regions.expandedLeading, { kind: "device", icon: "Laptop", photo: "none" });
});

test("the words for 100% survive a link, and a build without them stays without", async () => {
  const base = starterBuild("upload");
  const center = base.primary.regions.expandedCenter;
  if (center.kind !== "media") throw new Error("the upload's center is not a file and sentence");
  // Edited, and cleared: an empty field means the running words throughout, and stays empty.
  for (const doneTitle of ["Posted", ""]) {
    // As the playground makes it: new words rewrite the label made of them.
    const edited = state({ ...base, primary: followWords({ ...base.primary, regions: { ...base.primary.regions, expandedCenter: { ...center, doneTitle } } }) });
    assert.deepEqual(await parseState(await encodeState(edited)), edited, doneTitle);
  }
  // A build opened from a link made before the label for 100% has none, and its next link keeps it so.
  const { doneLabel: _doneLabel, doneLabelWords: _doneLabelWords, ...older } = base.primary;
  const without = state({ ...base, primary: older });
  assert.deepEqual(await parseState(await encodeState(without)), without);
});
