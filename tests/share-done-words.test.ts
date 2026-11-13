/*
 * The upload and the nearby transfer say they are done at 100%: the shipped preset, the
 * playground's rebuild of it on the stage, and the code the playground copies must use the same
 * words on either side of that boundary. A rebuild that kept "Uploading to Family" beside the check
 * is what this guards.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { nearbyTransferWords } from "@/components/islandcn/nearby-transfer-activity";
import { uploadWords } from "@/components/islandcn/upload-activity";
import { stageContent } from "@/components/site/playground/activity";
import { generateCode } from "@/components/site/playground/codegen";
import { type ActivitySpec, type StarterKey, spokenLabel, starterBuild } from "@/components/site/playground/model";
import { DEFAULT_SPRINGS } from "@/components/site/playground/motion";
import { transferSample, uploadSample } from "@/examples/samples";

/** The two lines the expanded view shows at a progress. */
interface Lines {
  readonly line: string;
  readonly title: string;
}

/** The two lines and what a screen reader hears. */
interface Words extends Lines {
  readonly label: string;
}

/** The shipped upload's words, with the props the playground's real preset passes. */
const shippedUpload = (progress: number): Words => {
  const words = uploadWords({
    fileName: uploadSample.fileName,
    progress,
    totalBytes: uploadSample.sizeMb * 1_000_000,
    destination: uploadSample.destination,
    cancellable: false,
  });
  return { line: words.detail === undefined ? uploadSample.fileName : `${uploadSample.fileName} · ${words.detail}`, title: words.sentence, label: words.label };
};

/** The shipped transfer's words, as the playground's real preset sends. */
const shippedTransfer = (progress: number): Lines => {
  const words = nearbyTransferWords({ deviceName: transferSample.deviceName, itemName: transferSample.itemName, progress });
  return { line: words.action, title: words.party };
};

/** The rebuild at a progress. */
const rebuild = (key: StarterKey, progress: number): ActivitySpec => ({ ...starterBuild(key).primary, progress });

/** The text the rebuild's expanded center draws on the stage, split back into its two lines. */
const stageWords = (activity: ActivitySpec): Words => {
  const content = stageContent(activity, { accent: "#0a84ff", progress: activity.progress, timer: { kind: "fixed", ms: 0 }, onButton: () => undefined });
  const html = renderToStaticMarkup(createElement(Fragment, null, content.expanded?.center));
  // MediaText is one box holding the grey line, then the white sentence as its last plain span.
  const inner = html.replace(/^<div[^>]*>/, "").replace(/<\/div>$/, "");
  const sentence = /<span[^>]*>([^<]*)<\/span>$/.exec(inner);
  if (sentence === null) throw new Error(`no sentence in ${html}`);
  const plain = (markup: string) => markup.replace(/<[^>]+>/g, "").replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
  return { line: plain(inner.slice(0, inner.length - sentence[0].length)), title: plain(sentence[1] ?? ""), label: spokenLabel(activity) };
};

/** A ternary the copied code writes on `progress >= 1`, evaluated at a progress. */
const pick = (code: string, attribute: string, progress: number): string => {
  const match = new RegExp(`${attribute}=\\{progress >= 1 \\? ("(?:[^"\\\\]|\\\\.)*") : ("(?:[^"\\\\]|\\\\.)*"|\`[^\`]*\`)\\}`).exec(code);
  if (match === null) throw new Error(`no done ternary for ${attribute}`);
  const [, done = "", running = ""] = match;
  const chosen: unknown = JSON.parse(progress >= 1 ? done : running.startsWith('"') ? running : JSON.stringify(running));
  return String(chosen);
};

/** The copied label function's words at a progress. */
const pickLabel = (code: string, progress: number): string => {
  const match = /Label = \(\{ progress \}: \w+\) => \(progress >= 1 \? ("(?:[^"\\]|\\.)*") : ("(?:[^"\\]|\\.)*")\);/.exec(code);
  if (match === null) throw new Error("no label function");
  const [, done = "", running = ""] = match;
  const chosen: unknown = JSON.parse(progress >= 1 ? done : running);
  return String(chosen);
};

const copied = (activity: ActivitySpec) => {
  const build = starterBuild("upload");
  return generateCode({ build: { ...build, primary: activity, second: null }, springs: DEFAULT_SPRINGS, reduced: false, registryUrl: "http://localhost:3000/r" }).code;
};

test("at 100% the upload rebuild and its copied code say what the shipped upload says", () => {
  const shipped = shippedUpload(1);
  assert.deepEqual(shipped, { line: "mochi-asleep.jpg · 6 MB", title: "Uploaded to Family", label: "Uploaded to Family: mochi-asleep.jpg" });
  assert.deepEqual(stageWords(rebuild("upload", 1)), shipped);

  const code = copied(rebuild("upload", 1));
  assert.equal(pick(code, "title", 1), shipped.title);
  assert.equal(`${uploadSample.fileName} · ${pick(code, "detail", 1)}`, shipped.line);
  assert.equal(pickLabel(code, 1), shipped.label);
  assert.equal(pickLabel(code, 0.5), "Uploading to Family: mochi-asleep.jpg");
  // The label goes with every start and update, so a screen reader hears the finished words too.
  assert.match(code, /island\.start\(\{ id: "upload", label: uploadLabel\(state\), \.\.\.uploadContent\(state\) \}\)/);
  assert.match(code, /island\.update\("upload", \{ label: uploadLabel\(state\), \.\.\.uploadContent\(state\) \}\)/);
});

test("at 100% the transfer rebuild and its copied code say what the shipped transfer says", () => {
  const shipped = shippedTransfer(1);
  assert.deepEqual(shipped, { line: "Sent biscuit-in-the-sun.jpg", title: "To Maya's Laptop" });
  const stage = stageWords(rebuild("transfer", 1));
  assert.deepEqual({ line: stage.line, title: stage.title }, shipped);
  assert.equal(stage.label, nearbyTransferWords({ deviceName: transferSample.deviceName, itemName: transferSample.itemName, progress: 1 }).label);

  const code = copied(rebuild("transfer", 1));
  assert.equal(pick(code, "line", 1), shipped.line);
  assert.equal(pickLabel(code, 1), stage.label);
  assert.match(code, /title="To Maya's Laptop"/);
});

test("just short of 100% both still say they are running, on the stage and in the code", () => {
  const upload = stageWords(rebuild("upload", 0.99));
  assert.equal(upload.title, shippedUpload(0.99).title);
  assert.equal(upload.title, "Uploading to Family");
  assert.equal(upload.line, "mochi-asleep.jpg · 5.9 of 6 MB");
  assert.equal(upload.label, "Uploading to Family: mochi-asleep.jpg");
  assert.equal(pick(copied(rebuild("upload", 0.99)), "title", 0.99), "Uploading to Family");

  const transfer = stageWords(rebuild("transfer", 0.99));
  assert.deepEqual({ line: transfer.line, title: transfer.title }, shippedTransfer(0.99));
});

test("a sentence the visitor typed stays theirs at 100%: no verb is guessed from it", () => {
  const base = rebuild("upload", 1);
  const center = base.regions.expandedCenter;
  if (center.kind !== "media") throw new Error("the upload's center is not a file and sentence");
  const typed: ActivitySpec = { ...base, regions: { ...base.regions, expandedCenter: { ...center, title: "Posting to Photos", doneTitle: "" } } };
  assert.equal(stageWords(typed).title, "Posting to Photos");
  assert.match(copied(typed), /title="Posting to Photos"/);
  const own: ActivitySpec = { ...base, regions: { ...base.regions, expandedCenter: { ...center, title: "Posting to Photos", doneTitle: "Posted" } } };
  assert.equal(stageWords(own).title, "Posted");
});

test("a cancellable upload with a size keeps the size; without one, the percentage", () => {
  const options = { fileName: "q3-report.pdf", progress: 0.42, destination: "Drive", cancellable: true } as const;
  assert.equal(uploadWords({ ...options, totalBytes: 6_000_000 }).detail, "2.5 of 6 MB");
  assert.equal(uploadWords(options).detail, "42%");
  assert.equal(uploadWords({ ...options, cancellable: false }).detail, undefined);
  assert.equal(uploadWords({ ...options, totalBytes: 6_000_000, progress: 1 }).detail, "6 MB");
});
