/*
 * Two things the playground says in words, which have to match what the stage and the clipboard
 * do: Split pressed on an expanded island collapses it first (the engine only splits a compact
 * island), and the readout prints the collapse and then the show, in the order they run; and the
 * install box's header counts what the full command installs.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { generateCode } from "@/components/site/playground/codegen";
import { installSummary } from "@/components/site/playground/install-list";
import { starterBuild } from "@/components/site/playground/model";
import { DEFAULT_SPRINGS } from "@/components/site/playground/motion";
import { SPLIT_NOTE, splitCalls } from "@/components/site/playground/runtime";

test("a split from the expanded island prints the collapse, then the show", () => {
  const fromExpanded = splitCalls({ collapseFirst: true, first: "upload", second: "nowPlaying", argument: "{ startedAt }" });
  assert.equal(fromExpanded.first, "upload.collapse()");
  assert.equal(fromExpanded.second, "upload.collapse(); nowPlaying.show({ startedAt }) // splits the island");
  const fromCompact = splitCalls({ collapseFirst: false, first: "upload", second: "nowPlaying", argument: "" });
  assert.equal(fromCompact.first, null);
  assert.equal(fromCompact.second, `nowPlaying.show() ${SPLIT_NOTE}`);
});

test("the install box's header counts the items and packages in the command it shows", () => {
  const { install, items, packages } = generateCode({ build: starterBuild("upload"), springs: DEFAULT_SPRINGS, reduced: false, registryUrl: "http://localhost:3000/r" });
  // Every item named in the header is in the command, as a whole URL.
  for (const item of items) assert.ok(install.includes(`http://localhost:3000/r/${item}.json`), item);
  assert.equal(installSummary(items, packages), packages.length === 0 ? `${items.length} registry items` : `${items.length} registry items, then ${packages.length} npm package${packages.length === 1 ? "" : "s"}`);
  assert.equal(installSummary(["upload-activity"], []), "1 registry item");
  assert.equal(installSummary(["a", "b"], ["some-package"]), "2 registry items, then 1 npm package");
});
