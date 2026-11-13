/*
 * The keyline's strength against the page behind the island, checked against the simulator's
 * measurements in reference/data/keyline.json. The band is white over the page, so its alpha on a
 * side is the peak's rise over the page divided by (255 - page level). The engine's alpha over each
 * measured backdrop has to fall inside the spread of the sides measured there, and over black and
 * white it has to stay exactly what it was before the fade was refitted.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { type IslandMetrics, colourLuma, islandMetrics, keylineAlphaFor } from "@/lib/island";

const DATA = path.resolve(import.meta.dirname, "..", "reference", "data", "keyline.json");

/** One side's reading: the page level under it and the band's peak over that level. */
interface SideReading {
  backgroundHex: string;
  pageLevel: number;
  sideLevel: number;
  peak: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Compact and split takes only: expanded is dimmed on purpose (`expandedDim`) and idle has no band. */
const readSides = (): SideReading[] => {
  // Python's json wrote a few unmeasurable shadow readings as -Infinity, which JSON.parse refuses.
  const parsed: unknown = JSON.parse(readFileSync(DATA, "utf8").replace(/-Infinity/g, "null"));
  if (!isRecord(parsed)) throw new Error("keyline.json is not an object");
  return Object.entries(parsed).flatMap(([take, entry]) => {
    if (!/-(compact|split)$/.test(take) || !isRecord(entry)) return [];
    const { background_hex: backgroundHex, bg_lum: pageLevel, blobs } = entry;
    if (typeof backgroundHex !== "string" || typeof pageLevel !== "number" || !Array.isArray(blobs)) return [];
    return blobs.flatMap((blob: unknown) => {
      if (!isRecord(blob) || !isRecord(blob.sides)) return [];
      return Object.values(blob.sides).flatMap((side: unknown) => {
        if (!isRecord(side)) return [];
        const { bg_lum: sideLevel, keyline_peak_over_bg: peak } = side;
        if (typeof sideLevel !== "number" || typeof peak !== "number") return [];
        return [{ backgroundHex, pageLevel, sideLevel, peak }];
      });
    });
  });
};

const lumaOf = (hex: string) => {
  const luma = colourLuma(`#${hex}`);
  if (luma === null) throw new Error(`not a colour: #${hex}`);
  return luma;
};

/** The engine's curve before the refit: full, then one exponential, then none. */
const previousAlpha = (luma: number) => {
  if (luma >= 0.17) return 0;
  if (luma <= 0.04) return 0.16;
  return 0.16 * Math.exp(-(luma - 0.04) / 0.023);
};

/** Below this much room between the page and white, a rise of a level or two is noise, not alpha. */
const MIN_HEADROOM = 16;

/** The measurements are local-only, like the rest of reference/, so the public repo skips this check. */
const NO_DATA = existsSync(DATA) ? false : "needs reference/data/keyline.json, which is not in the public repo";

test("the keyline over every measured backdrop falls inside the measured spread", { skip: NO_DATA }, () => {
  const sides = readSides();
  const backdrops = [...new Set(sides.map((side) => side.backgroundHex))].sort();
  assert.deepEqual(backdrops, ["000000", "0a0a0a", "121212", "1c1c1e", "2c2c2e", "3a3a3c", "ffffff"]);

  for (const hex of backdrops) {
    // A side whose page level is far from the take's own is reading the pill or the screen edge, not the page.
    const here = sides.filter((side) => side.backgroundHex === hex && Math.abs(side.sideLevel - side.pageLevel) <= 2);
    assert.ok(here.length >= 4, `#${hex}: only ${here.length} clean sides`);
    const engine = keylineAlphaFor(lumaOf(hex), islandMetrics);
    const headroom = 255 - (here[0]?.pageLevel ?? 255);
    if (headroom < MIN_HEADROOM) {
      // Over white there is nothing to brighten: the device shows no band, and the engine draws none.
      assert.equal(engine, 0, `#${hex}: the engine draws ${engine}`);
      assert.ok(here.every((side) => side.peak <= 2), `#${hex}: a side rises more than 2 levels`);
      continue;
    }
    const alphas = here.map((side) => Math.max(0, side.peak) / (255 - side.pageLevel));
    const low = Math.min(...alphas);
    const high = Math.max(...alphas);
    assert.ok(
      engine >= low - 1e-9 && engine <= high + 1e-9,
      `#${hex}: engine ${engine.toFixed(4)} outside the measured ${low.toFixed(4)} to ${high.toFixed(4)}`,
    );
  }
});

test("over #1C1C1E the band rises 3 to 5 levels, as on the device", () => {
  // The measured page level there is 26.4; the brief's reading is +3 to +5.
  const rise = keylineAlphaFor(lumaOf("1c1c1e"), islandMetrics) * (255 - 26.43);
  assert.ok(rise >= 3 && rise <= 5, `rise ${rise.toFixed(2)}`);
});

test("black and white pages keep exactly the strength they had", () => {
  const { alpha, fullUntil, noneFrom } = islandMetrics.keyline;
  assert.equal(alpha, 0.16);
  assert.equal(fullUntil, 0.04);
  assert.equal(noneFrom, 0.17);
  for (const hex of ["000000", "0a0a0a", "ffffff", "fbfbfd", "f5f5f7", "fdfdfd", "3a3a3c", "2c2c2e"]) {
    const luma = lumaOf(hex);
    assert.equal(keylineAlphaFor(luma, islandMetrics), previousAlpha(luma), `#${hex}`);
  }
  for (let step = 0; step <= 1000; step += 1) {
    const luma = step / 1000;
    if (luma > fullUntil && luma < noneFrom) continue;
    assert.equal(keylineAlphaFor(luma, islandMetrics), previousAlpha(luma), `luma ${luma}`);
  }
});

test("the fade only ever weakens and has no jumps", () => {
  const { alpha, fullUntil, noneFrom } = islandMetrics.keyline;
  let last: number = alpha;
  for (let step = 0; step <= 2000; step += 1) {
    const luma = fullUntil + ((noneFrom - fullUntil) * step) / 2000;
    const value = keylineAlphaFor(luma, islandMetrics);
    assert.ok(value <= last + 1e-12, `rises at luma ${luma}`);
    // 2,000 steps over the fade: no step moves the band by more than a quarter of a level (0.001).
    assert.ok(last - value < 0.001, `jumps at luma ${luma}: ${last} to ${value}`);
    last = value;
  }
  assert.ok(Math.abs(keylineAlphaFor(noneFrom - 1e-9, islandMetrics)) < 1e-6);
});

test("an override of the full strength scales the whole fade", () => {
  const half: IslandMetrics = { ...islandMetrics, keyline: { ...islandMetrics.keyline, alpha: 0.08 } };
  for (const hex of ["000000", "121212", "1c1c1e", "2c2c2e"]) {
    const luma = lumaOf(hex);
    assert.ok(Math.abs(keylineAlphaFor(luma, half) - keylineAlphaFor(luma, islandMetrics) / 2) < 1e-12, `#${hex}`);
  }
});

test("a luma that isn't a number draws no band", () => {
  assert.equal(keylineAlphaFor(Number.NaN, islandMetrics), 0);
  assert.equal(keylineAlphaFor(Number.NEGATIVE_INFINITY, islandMetrics), islandMetrics.keyline.alpha);
  assert.equal(keylineAlphaFor(Number.POSITIVE_INFINITY, islandMetrics), 0);
});
