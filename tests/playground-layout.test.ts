/*
 * Two playground promises the stage alone can't show: a caption such as
 * "20 of 48 MB" under a percentage counts along with the progress (on the stage
 * and in the copied file), and the expanded view's sides sit on the row line
 * the center sets.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { islandRow } from "@/components/islandcn/theme";
import { generateCode } from "@/components/site/playground/codegen";
import { amountOf, progressCaption, rowLine, shareAmount } from "@/components/site/playground/content";
import { type Content, starterBuild } from "@/components/site/playground/model";
import { DEFAULT_SPRINGS } from "@/components/site/playground/motion";

const none: Content = { kind: "none" };

test("a caption that reads N of TOTAL follows the progress", () => {
  assert.deepEqual(progressCaption("20 of 48 MB"), { total: 48, rest: " MB" });
  assert.deepEqual(progressCaption("3 of 5 files"), { total: 5, rest: " files" });
  assert.equal(progressCaption("To Team Drive"), null);
  assert.equal(progressCaption("0 of 0 MB"), null);
  // Update moves the upload to 57%: the caption says 27 of 48, not the 20 it started with.
  assert.equal(amountOf(0.57, 48), "27");
  assert.equal(amountOf(0.42, 48), "20");
  assert.equal(amountOf(0.1, 48), "4.8");
  assert.equal(amountOf(0.42, 5), "2");
  // A sharing activity words it as the upload preset does: one decimal under 10, no trailing zero.
  assert.equal(shareAmount(0.42, 6), "2.5");
  assert.equal(shareAmount(0.5, 6), "3");
  assert.equal(shareAmount(0.57, 48), "27");
});

test("the upload starter's copied caption is computed from progress", () => {
  const { code } = generateCode({ build: starterBuild("upload"), springs: DEFAULT_SPRINGS, reduced: false, registryUrl: "http://localhost:3000/r" });
  assert.match(code, /progress \* 6 < 10 \? Math\.round\(progress \* 60\) \/ 10 : Math\.round\(progress \* 6\)\} of 6 MB/);
  assert.doesNotMatch(code, /"2\.5 of 6 MB"/);
});

test("the sides centre on the line the center sets", () => {
  const stack: Content = { kind: "title", title: "launch-cut-v3.mov", subtitle: "To Team Drive", lines: 1, end: false };
  const title: Content = { kind: "title", title: "Recording standup notes", subtitle: "", lines: 1, end: false };
  const avatar: Content = { kind: "avatar", name: "Maya Lindqvist", call: false };
  const tile: Content = { kind: "tile", icon: "CloudArrowUp" };
  assert.equal(rowLine({ expandedLeading: tile, expandedCenter: stack, expandedTrailing: none }), islandRow.stackLine);
  assert.equal(rowLine({ expandedLeading: avatar, expandedCenter: title, expandedTrailing: none }), islandRow.titleLine);
  // No center: the two sides centre on each other, the taller one at the top.
  assert.equal(rowLine({ expandedLeading: tile, expandedCenter: none, expandedTrailing: avatar }), 26);
  assert.equal(rowLine({ expandedLeading: none, expandedCenter: none, expandedTrailing: none }), null);
});
