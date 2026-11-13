/**
 * Builds every shipped brand file from components/brand/brand.ts:
 * public/brand/* (marks, wordmark, lockups, OG, app icon), app/icon.svg,
 * app/favicon.ico (16, 32, 48 px), app/apple-icon.png (180 px) and
 * public/favicon.ico.
 *
 *   pnpm tsx scripts/brand/build-assets.ts /path/to/Geist-SemiBold.ttf
 *
 * Geist (SIL OFL 1.1, https://github.com/vercel/geist-font) is only used to
 * outline the OG headline into paths; no font file ships.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import opentype from "opentype.js";
import sharp from "sharp";

import { BRAND_COLORS as C, FAVICON_MARK, LOCKUP, MARK, type MarkTone, TONES } from "../../components/brand/brand";
import { WORDMARK_DATA } from "../../components/brand/wordmark-data";

const headlineFontPath = process.argv[2];
if (headlineFontPath === undefined) throw new Error("Pass the path to Geist-SemiBold.ttf");

const PUBLIC = resolve("public/brand");
const APP = resolve("app");
const WORD_D = WORDMARK_DATA.body + WORDMARK_DATA.tittle.d;
const [wx, wy, ww, wh] = WORDMARK_DATA.viewBox;

const svg = ({ viewBox, body, width, height }: { viewBox: string; body: string; width?: number; height?: number }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${width === undefined ? "" : ` width="${width}"`}${height === undefined ? "" : ` height="${height}"`}>${body}</svg>`;

type Geometry = typeof MARK | typeof FAVICON_MARK;

const shapes = ({ geometry, pill, dot }: { geometry: Geometry; pill: string; dot: string }) => {
  const p = geometry.pill;
  const d = geometry.dot;
  const b = geometry.bar;
  return `<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="${p.height / 2}" fill="${pill}"/><circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="${dot}"/><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${b.height / 2}" fill="${dot}"/>`;
};

/** One colour: the pill with the dot and bar cut out of it, for stamps, embossing and single-ink print. */
const knockout = ({ geometry, fill }: { geometry: Geometry; fill: string }) => {
  const { x, y, width: w, height: h } = geometry.pill;
  const r = h / 2;
  const { cx, cy, r: dr } = geometry.dot;
  const capsule = `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const hole = `M${cx - dr} ${cy}A${dr} ${dr} 0 1 0 ${cx + dr} ${cy}A${dr} ${dr} 0 1 0 ${cx - dr} ${cy}Z`;
  const { x: bx, y: by, width: bw, height: bh } = geometry.bar;
  const br = bh / 2;
  const slot = `M${bx + br} ${by}H${bx + bw - br}A${br} ${br} 0 0 1 ${bx + bw - br} ${by + bh}H${bx + br}A${br} ${br} 0 0 1 ${bx + br} ${by}Z`;
  return `<path fill-rule="evenodd" d="${capsule}${hole}${slot}" fill="${fill}"/>`;
};

const markBody = (tone: MarkTone) => shapes({ geometry: MARK, ...TONES[tone] });

const lockupBody = ({ tone, at = { x: 0, y: 0, scale: 1 } }: { tone: MarkTone; at?: { x: number; y: number; scale: number } }) =>
  `<g transform="translate(${at.x} ${at.y}) scale(${at.scale})"><g transform="translate(${LOCKUP.markX} ${LOCKUP.markY}) scale(${LOCKUP.markScale})">${markBody(tone)}</g><path transform="translate(${LOCKUP.wordOffsetX} 0)" d="${WORD_D}" fill="${TONES[tone].text}"/></g>`;

const lockupViewBox = LOCKUP.viewBox.join(" ");

const write = (path: string, data: string | Buffer) => {
  writeFileSync(path, data);
  console.log(`${path.replace(`${resolve(".")}/`, "")}  ${Buffer.byteLength(data)} B`);
};

// Render at 4x the target with explicit pixel dimensions, then downsample:
// the viewBoxes are in font units, so intrinsic sizes would be enormous.
const png = async ({ source, width, height }: { source: string; width: number; height: number }) => {
  const sized = source
    .replace(/^<svg([^>]*?) width="[^"]*"/, "<svg$1")
    .replace(/^<svg([^>]*?) height="[^"]*"/, "<svg$1")
    .replace(/^<svg /, `<svg width="${width * 4}" height="${height * 4}" `);
  return sharp(Buffer.from(sized), { density: 72 })
    .resize(width, height, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 9, palette: width > 64, quality: 100 })
    .toBuffer();
};

// --- Outlined headline text -------------------------------------------------

const headlineFontBytes = readFileSync(resolve(headlineFontPath));
const headlineFont = opentype.parse(
  headlineFontBytes.buffer.slice(headlineFontBytes.byteOffset, headlineFontBytes.byteOffset + headlineFontBytes.byteLength),
);

/** One decimal, no trailing zeros: 185.00000000000003 to "185". */
const num = (value: number) => String(Math.round(value * 10) / 10);

/**
 * SVG path data from opentype commands. Path.toPathData(1) prints NaN for
 * values a hair above an integer (185.00000000000003), which cut the OG
 * headline off after two letters, so the numbers are written here.
 */
const pathData = (path: opentype.Path) =>
  path.commands
    .map((command) => {
      switch (command.type) {
        case "M":
        case "L":
          return `${command.type}${num(command.x)} ${num(command.y)}`;
        case "Q":
          return `Q${num(command.x1)} ${num(command.y1)} ${num(command.x)} ${num(command.y)}`;
        case "C":
          return `C${num(command.x1)} ${num(command.y1)} ${num(command.x2)} ${num(command.y2)} ${num(command.x)} ${num(command.y)}`;
        case "Z":
          return "Z";
        default: {
          const exhaustive: never = command;
          return exhaustive;
        }
      }
    })
    .join("");

/** Outline one line of text; `tracking` is in em. Returns path data and the advance width. */
const outline = ({ text, x, y, size, tracking }: { text: string; x: number; y: number; size: number; tracking: number }) => {
  let cursor = x;
  const glyphs = headlineFont.stringToGlyphs(text);
  const parts = glyphs.map((glyph, i) => {
    const d = pathData(glyph.getPath(cursor, y, size));
    const next = glyphs[i + 1];
    // opentype.js answers NaN for some Geist pairs; one NaN would push every later glyph off the card.
    const pair = next === undefined ? 0 : headlineFont.getKerningValue(glyph, next);
    const kern = Number.isFinite(pair) ? pair : 0;
    cursor += (((glyph.advanceWidth ?? 0) + kern) / headlineFont.unitsPerEm) * size + tracking * size;
    return d;
  });
  return { d: parts.join(""), width: cursor - x };
};

// --- The state ramp: the island's presentations, left to right --------------

interface RampItem {
  readonly kind: "idle" | "compact" | "split" | "expanded";
}

const RAMP: readonly RampItem[] = [{ kind: "idle" }, { kind: "compact" }, { kind: "split" }, { kind: "expanded" }];

// Island proportions in points, from the brief's ActivityKit model; the OG
// scales them so the row fills the card. Content inside is ink knocked out of
// lagoon, so each shape reads as the island holding something.
const drawRampItem = ({ item, x, top, u }: { item: RampItem; x: number; top: number; u: number }) => {
  const h = 37 * u;
  const pill = (px: number, w: number, hh = h, fill: string = C.lagoon) =>
    `<rect x="${px.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" rx="${(Math.min(hh, w) / 2).toFixed(1)}" fill="${fill}"/>`;
  const dot = (cx: number, cy: number, r: number) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${C.ink}"/>`;
  const bar = (bx: number, by: number, w: number, bh: number) =>
    `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bh / 2).toFixed(1)}" fill="${C.ink}"/>`;
  switch (item.kind) {
    case "idle": {
      const w = 126 * u;
      return { body: pill(x, w), width: w };
    }
    case "compact": {
      const w = 200 * u;
      return {
        body: pill(x, w) + dot(x + h / 2, top + h / 2, 9 * u) + bar(x + w - h / 2 - 34 * u, top + h / 2 - 5 * u, 34 * u, 10 * u),
        width: w,
      };
    }
    case "split": {
      const w = 160 * u;
      const gap = 8 * u;
      return { body: pill(x, w) + pill(x + w + gap, h), width: w + gap + h };
    }
    case "expanded": {
      const w = 300 * u;
      const eh = 104 * u;
      const r = 40 * u;
      const pad = 22 * u;
      return {
        body:
          `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${eh.toFixed(1)}" rx="${r.toFixed(1)}" fill="${C.lagoon}"/>` +
          dot(x + pad + 16 * u, top + pad + 16 * u, 16 * u) +
          bar(x + pad + 46 * u, top + pad + 6 * u, 120 * u, 9 * u) +
          bar(x + pad + 46 * u, top + pad + 22 * u, 76 * u, 9 * u) +
          bar(x + w - pad - 74 * u, top + eh - pad - 26 * u, 74 * u, 26 * u),
        width: w,
      };
    }
    default: {
      const _exhaustive: never = item.kind;
      throw new Error(`Unknown ramp item ${String(_exhaustive)}`);
    }
  }
};

const ramp = ({ x, top, maxWidth }: { x: number; top: number; maxWidth: number }) => {
  // Lay out at unit scale to measure, then scale to fit.
  const gapPt = 34;
  const natural = RAMP.reduce((sum, item) => sum + drawRampItem({ item, x: 0, top: 0, u: 1 }).width, 0) + gapPt * (RAMP.length - 1);
  const u = maxWidth / natural;
  let cursor = x;
  return RAMP.map((item) => {
    const drawn = drawRampItem({ item, x: cursor, top, u });
    cursor += drawn.width + gapPt * u;
    return drawn.body;
  }).join("");
};

// --- ICO packing: PNG-in-ICO, supported by every current browser ------------

const ico = (images: readonly { size: number; bytes: Buffer }[]) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, bytes }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(bytes.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += bytes.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.bytes)]);
};

// --- Build ---------------------------------------------------------------------

const main = async () => {
  const markBox = `0 0 ${MARK.width} ${MARK.height}`;
  write(`${PUBLIC}/mark.svg`, svg({ viewBox: markBox, body: markBody("on-light") }));
  write(`${PUBLIC}/mark-dark.svg`, svg({ viewBox: markBox, body: markBody("on-dark") }));
  write(`${PUBLIC}/mark-mono.svg`, svg({ viewBox: markBox, body: knockout({ geometry: MARK, fill: C.ink }) }));

  const wordBox = `${wx} ${wy} ${ww} ${wh}`;
  write(`${PUBLIC}/wordmark.svg`, svg({ viewBox: wordBox, body: `<path d="${WORD_D}" fill="${C.ink}"/>` }));
  write(`${PUBLIC}/wordmark-dark.svg`, svg({ viewBox: wordBox, body: `<path d="${WORD_D}" fill="${C.paper}"/>` }));

  const lockupLight = svg({ viewBox: lockupViewBox, body: lockupBody({ tone: "on-light" }) });
  const lockupDark = svg({ viewBox: lockupViewBox, body: lockupBody({ tone: "on-dark" }) });
  write(`${PUBLIC}/lockup.svg`, lockupLight);
  write(`${PUBLIC}/lockup-dark.svg`, lockupDark);

  // Lockup PNGs at 2x for places that can't take SVG, with clear space of one
  // pill height (12 grid units of the mark) on every side.
  const [, , lw, lh] = LOCKUP.viewBox;
  const pad = 12 * LOCKUP.markScale;
  const padded = (tone: MarkTone, ground: string) =>
    svg({
      viewBox: `${-pad} ${LOCKUP.viewBox[1] - pad} ${lw + pad * 2} ${lh + pad * 2}`,
      body: `<rect x="${-pad}" y="${LOCKUP.viewBox[1] - pad}" width="${lw + pad * 2}" height="${lh + pad * 2}" fill="${ground}"/>${lockupBody({ tone })}`,
    });
  const lockupPx = { width: 1120, height: Math.round((1120 * (lh + pad * 2)) / (lw + pad * 2)) };
  write(`${PUBLIC}/lockup.png`, await png({ source: padded("on-light", C.paper), ...lockupPx }));
  write(`${PUBLIC}/lockup-dark.png`, await png({ source: padded("on-dark", C.ink), ...lockupPx }));

  // Favicon: the 16 px cut, switching colourway with the browser's scheme.
  const fav = (tone: MarkTone) => shapes({ geometry: FAVICON_MARK, ...TONES[tone] });
  const favLight = TONES["on-light"];
  const favDark = TONES["on-dark"];
  const fp = FAVICON_MARK.pill;
  const fd = FAVICON_MARK.dot;
  const fb = FAVICON_MARK.bar;
  write(
    `${APP}/icon.svg`,
    svg({
      viewBox: "0 0 32 32",
      body: `<style>.p{fill:${favLight.pill}}.d{fill:${favLight.dot}}@media (prefers-color-scheme:dark){.p{fill:${favDark.pill}}.d{fill:${favDark.dot}}}</style><rect class="p" x="${fp.x}" y="${fp.y}" width="${fp.width}" height="${fp.height}" rx="${fp.height / 2}"/><circle class="d" cx="${fd.cx}" cy="${fd.cy}" r="${fd.r}"/><rect class="d" x="${fb.x}" y="${fb.y}" width="${fb.width}" height="${fb.height}" rx="${fb.height / 2}"/>`,
    }),
  );
  // The .ico can't switch with the scheme, so it takes the black pill, which holds on light tabs and on
  // the dark grey of a dark browser's tab strip alike.
  const icoSizes = [16, 32, 48] as const;
  const icoImages = await Promise.all(
    icoSizes.map(async (size) => ({
      size,
      bytes: await sharp(Buffer.from(svg({ viewBox: "0 0 32 32", width: size, height: size, body: fav("on-light") }))).png().toBuffer(),
    })),
  );
  write(`${APP}/favicon.ico`, ico(icoImages));
  write(resolve("public/favicon.ico"), ico(icoImages));

  // App icon: the black pill and its bright dot on a paper tile, the island on a lit screen. The mark spans
  // the middle 78%, wide enough to read on a home screen while corner masks still clear it.
  const appIcon = (size: number) => {
    const span = size * 0.78;
    const scale = span / MARK.width;
    const x = (size - span) / 2;
    const y = (size - MARK.height * scale) / 2;
    return svg({
      viewBox: `0 0 ${size} ${size}`,
      width: size,
      height: size,
      body: `<rect width="${size}" height="${size}" fill="${C.paper}"/><g transform="translate(${x} ${y}) scale(${scale})">${markBody("on-light")}</g>`,
    });
  };
  write(`${PUBLIC}/app-icon.svg`, appIcon(512));
  write(`${APP}/apple-icon.png`, await png({ source: appIcon(180), width: 180, height: 180 }));
  write(`${PUBLIC}/icon-512.png`, await png({ source: appIcon(512), width: 512, height: 512 }));

  // OG card, 1200x630: lockup, the launch line, and the state ramp along the
  // bottom edge the way dithercn runs its dither ramp and asciicn its glyphs.
  const OG = { w: 1200, h: 630, margin: 80 };
  const lockupScale = 46 / 1000; // wordmark set at 46 px
  const line1 = outline({ text: "The open-source Dynamic", x: OG.margin - 4, y: 268, size: 80, tracking: -0.035 });
  const line2 = outline({ text: "Island for React.", x: OG.margin - 4, y: 370, size: 80, tracking: -0.035 });
  const og = svg({
    viewBox: `0 0 ${OG.w} ${OG.h}`,
    width: OG.w,
    height: OG.h,
    body:
      `<rect width="${OG.w}" height="${OG.h}" fill="${C.ink}"/>` +
      lockupBody({ tone: "on-dark", at: { x: OG.margin, y: 72 - LOCKUP.viewBox[1] * lockupScale, scale: lockupScale } }) +
      `<path d="${line1.d}${line2.d}" fill="${C.paper}"/>` +
      ramp({ x: OG.margin, top: 466, maxWidth: OG.w - OG.margin * 2 }),
  });
  write(`${PUBLIC}/og.svg`, og);
  write(`${PUBLIC}/og.png`, await sharp(Buffer.from(og)).png({ compressionLevel: 9, palette: true, quality: 100 }).toBuffer());

};

void main();
