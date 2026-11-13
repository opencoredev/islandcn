/*
 * Customize shows the accent picker only when picking a colour changes the island.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { usesAccent } from "@/components/site/playground/activity";
import { starterBuild } from "@/components/site/playground/model";

test("presets whose content takes the accent offer the picker", () => {
  for (const key of ["upload", "timer", "eta", "recording", "transfer"] as const) assert.ok(usesAccent(starterBuild(key).primary), key);
});

test("the charging battery, which keeps its measured greens, hides it", () => {
  assert.equal(usesAccent(starterBuild("battery").primary), false);
});

test("the word accent in someone's text doesn't count, an accent-toned region does", () => {
  const battery = starterBuild("battery").primary;
  const lead = battery.regions.compactLeading;
  assert.equal(lead.kind, "text");
  if (lead.kind !== "text") return;
  for (const text of ["accent", "(accent, x)", "{accent}", "color: accent,"]) {
    assert.equal(usesAccent({ ...battery, regions: { ...battery.regions, compactLeading: { ...lead, text } } }), false, text);
  }
  assert.ok(usesAccent({ ...battery, regions: { ...battery.regions, compactLeading: { ...lead, tone: "accent" } } }));
});
