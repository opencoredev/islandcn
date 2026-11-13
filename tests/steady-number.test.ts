/*
 * A clock or percentage that changes every second is caught mid-change in a good share of stills.
 * The kit's steady turn promises that every one of those stills still shows a readable digit: at
 * every moment of a change, one of the two glyphs is nearly opaque and nearly sharp.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { steadyPosesAt, steadyTurn } from "@/components/islandcn/steady-number";

/** Compact trailing text is 15 px. */
const EM = 15;

test("one glyph reads at every moment of a steady change", () => {
  const end = Math.max(steadyTurn.outFade[1], steadyTurn.grow[1]);
  let weakest = 1;
  for (let ms = 0; ms <= end * 1000 + 20; ms += 1) {
    const { incoming, outgoing } = steadyPosesAt(ms / 1000, EM);
    const top = incoming.opacity >= outgoing.opacity ? incoming : outgoing;
    weakest = Math.min(weakest, top.opacity);
    // Thresholds from the brief: a legible digit is at least 80% opaque with a light blur (under 0.6 px).
    assert.ok(top.opacity >= 0.8, `at ${ms} ms the strongest glyph is only ${top.opacity.toFixed(2)} opaque`);
    assert.ok(top.blur <= 0.6, `at ${ms} ms the strongest glyph is blurred ${top.blur.toFixed(2)} px`);
  }
  // The two never dip together: their combined coverage stays near full.
  assert.ok(weakest > 0.8);
});

test("a steady change starts on the old digit and ends on the new one, both sharp", () => {
  const start = steadyPosesAt(0, EM);
  assert.equal(start.outgoing.opacity, 1);
  assert.equal(start.outgoing.blur, 0);
  const end = steadyPosesAt(1, EM);
  assert.equal(end.incoming.opacity, 1);
  assert.equal(end.incoming.blur, 0);
  assert.equal(end.incoming.scale, 1);
  assert.equal(end.outgoing.opacity, 0);
});
