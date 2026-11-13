/*
 * Two editing promises the playground makes:
 * - A field still holding the kit's sample ("Title", "Subtitle") selects it on focus, so typing
 *   replaces it. This checks the set of samples the fields know.
 * - The expanded view's leading tile and the split's bubble show the compact leading icon until
 *   they are given one of their own.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { type Content, type Region, SAMPLE_IDS, SAMPLE_TEXTS, blankActivity, defaultContent, withContent } from "@/components/site/playground/model";

test("every sample a picked kind puts in a text field is known", () => {
  for (const sample of ["Title", "Subtitle", "Now", "Label", "Details", "Status", "Your track", "Maya Lindqvist", "OK", "Cancel", "Done", "Pause", "Custom activity"]) {
    assert.ok(SAMPLE_TEXTS.has(sample), `missing ${sample}`);
  }
  assert.ok(SAMPLE_IDS.has(blankActivity().id));
  assert.ok(SAMPLE_TEXTS.has(blankActivity().label));
  // Empty fields have nothing to select, and kinds or tones are not words a person typed.
  assert.ok(!SAMPLE_TEXTS.has(""));
  assert.ok(!SAMPLE_TEXTS.has("title"));
  assert.ok(!SAMPLE_TEXTS.has("accent"));
});

const regionsOf = (filled: Partial<Record<Region, Content>>): Record<Region, Content> => {
  const none: Content = { kind: "none" };
  return {
    compactLeading: filled.compactLeading ?? none,
    compactTrailing: filled.compactTrailing ?? none,
    minimal: filled.minimal ?? none,
    expandedLeading: filled.expandedLeading ?? none,
    expandedCenter: filled.expandedCenter ?? none,
    expandedTrailing: filled.expandedTrailing ?? none,
    expandedBottom: filled.expandedBottom ?? none,
  };
};

const iconOf = (content: Content) => (content.kind === "glyph" || content.kind === "tile" ? content.icon : null);

test("a tile picked for expanded leading starts on the compact leading icon", () => {
  const regions = regionsOf({ compactLeading: { kind: "glyph", icon: "ForkKnife", tone: "accent" } });
  const next = withContent({ regions, at: "expandedLeading", content: defaultContent("tile", "side") });
  assert.equal(iconOf(next.expandedLeading), "ForkKnife");
  const bubble = withContent({ regions, at: "minimal", content: defaultContent("glyph", "compact") });
  assert.equal(iconOf(bubble.minimal), "ForkKnife");
});

test("changing the compact leading icon moves the followers still showing it", () => {
  // The order a person builds it in: both default to the sparkle, then the pill gets a fork and knife.
  let regions = regionsOf({});
  regions = withContent({ regions, at: "compactLeading", content: defaultContent("glyph", "compact") });
  regions = withContent({ regions, at: "expandedLeading", content: defaultContent("tile", "side") });
  regions = withContent({ regions, at: "compactLeading", content: { kind: "glyph", icon: "ForkKnife", tone: "accent" } });
  assert.equal(iconOf(regions.expandedLeading), "ForkKnife");
  regions = withContent({ regions, at: "compactLeading", content: { kind: "glyph", icon: "Coffee", tone: "accent" } });
  assert.equal(iconOf(regions.expandedLeading), "Coffee");
});

test("a follower given its own icon keeps it", () => {
  let regions = regionsOf({ compactLeading: { kind: "glyph", icon: "ForkKnife", tone: "accent" }, expandedLeading: { kind: "tile", icon: "ForkKnife" } });
  regions = withContent({ regions, at: "expandedLeading", content: { kind: "tile", icon: "Car" } });
  assert.equal(iconOf(regions.expandedLeading), "Car");
  regions = withContent({ regions, at: "compactLeading", content: { kind: "glyph", icon: "Coffee", tone: "accent" } });
  assert.equal(iconOf(regions.expandedLeading), "Car");
});
