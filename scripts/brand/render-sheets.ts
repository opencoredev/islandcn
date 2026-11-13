/**
 * Renders one comparison sheet per mark concept plus an overview, into
 * scripts/brand/sheets/. Each sheet shows the mark at 512, 64, 32 and 16 px on
 * light and dark, next to the wordmark, and as a favicon in a browser tab strip
 * at actual size and zoomed 8x.
 *
 *   pnpm tsx scripts/brand/render-sheets.ts
 *
 * Sibling favicons for the tab strip are read at render time, never copied:
 * set BRAND_SIBLINGS="dithercn=/path/favicon.svg,asciicn=/path/favicon.svg".
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { CONCEPTS, type Colorway, type Concept, DARK, LIGHT, markSvg, PALETTE } from "./concepts";
import { closeBrowser, dataUri, shootHtml, svgToSquarePng } from "./shoot";
import { WORDMARK_EM, wordmarkSvg } from "./wordmark";

const OUT = resolve("scripts/brand/sheets");
mkdirSync(OUT, { recursive: true });

interface Sibling {
  readonly name: string;
  readonly icon16: string;
}

const loadSiblings = (): Promise<Sibling[]> => Promise.all(
  (process.env.BRAND_SIBLINGS ?? "")
    .split(",")
    .filter((entry) => entry.includes("="))
    .map(async (entry) => {
      const [name = "", path = ""] = entry.split("=");
      const png = await svgToSquarePng({ svg: readFileSync(path, "utf8"), size: 16 });
      return { name, icon16: dataUri({ bytes: png, mime: "image/png" }) };
    }),
  );

let siblings: Sibling[] = [];

const svgUri = (svg: string) => dataUri({ bytes: svg, mime: "image/svg+xml" });
const pngUri = async ({ svg, size }: { svg: string; size: number }) =>
  dataUri({ bytes: await svgToSquarePng({ svg, size }), mime: "image/png" });

// Browser chrome colours for the tab-strip mock, close to a stock Chromium.
const TABS = {
  light: { strip: "#dee1e6", active: "#ffffff", title: "#1f1f1f", muted: "#5f6368" },
  dark: { strip: "#1f2023", active: "#35363a", title: "#e8eaed", muted: "#9aa0a6" },
} as const satisfies Record<string, Record<string, string>>;

const CSS = `
*{box-sizing:border-box}
body{margin:0;font:13px/1.4 -apple-system,BlinkMacSystemFont,Inter,"Geist",system-ui,sans-serif;background:#111;color:#ddd}
.sheet{width:1600px;padding:40px}
h1{font-size:28px;margin:0 0 4px;color:#fff;font-weight:600;letter-spacing:-0.01em}
.idea{margin:0 0 28px;color:#a3a3a3;font-size:16px;max-width:1100px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.panel{border-radius:16px;padding:28px;display:flex;flex-direction:column;gap:24px}
.sizes{display:flex;align-items:flex-end;gap:28px}
.cap{font-size:11px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.55;margin-top:6px}
.col{display:flex;flex-direction:column;align-items:center}
.lockups{display:flex;flex-direction:column;gap:18px}
.lock{display:flex;align-items:center}
.strip{border-radius:12px;padding:8px 8px 0;display:flex;gap:2px;align-items:flex-end;height:44px}
.tab{height:36px;width:200px;min-width:0;overflow:hidden;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:12px;border-radius:8px 8px 0 0;white-space:nowrap}
.tab img{width:16px;height:16px;flex:none}
.zoomrow{display:flex;gap:24px;align-items:flex-end}
.zoom{image-rendering:pixelated;width:128px;height:128px;border-radius:8px}
.label{font-size:12px;color:#888;margin:28px 0 10px}
.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
.card{background:#1a1a1a;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px}
.card h2{font-size:17px;margin:0;color:#fff;font-weight:600}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tile{border-radius:10px;aspect-ratio:1;display:grid;place-items:center}
`;

const lockup = ({ concept, colors, fontSize }: { concept: Concept; colors: Colorway; fontSize: number }) => {
  // The mark box is 1.6 em so the capsule's visual height sits near the x-height.
  const mark = fontSize * 1.6;
  return `<div class="lock" style="gap:${(fontSize * 0.3).toFixed(1)}px"><img width="${mark}" height="${mark}" src="${svgUri(markSvg({ concept, colors }))}"><img height="${(WORDMARK_EM.height * fontSize).toFixed(1)}" src="${svgUri(wordmarkSvg({ color: colors.text, fontSize }))}"></div>`;
};

const tabStrip = async ({ concept, theme }: { concept: Concept; theme: keyof typeof TABS }) => {
  const t = TABS[theme];
  const colors = theme === "light" ? LIGHT : DARK;
  const own = await pngUri({ svg: markSvg({ concept, colors }), size: 16 });
  const tab = ({ icon, title, active, wide = false }: { icon: string; title: string; active: boolean; wide?: boolean }) =>
    `<div class="tab" style="${wide ? "width:270px;" : ""}background:${active ? t.active : "transparent"};color:${active ? t.title : t.muted}"><img src="${icon}">${title}</div>`;
  const others = siblings.map((s) => tab({ icon: s.icon16, title: `${s.name}`, active: false })).join("");
  return `<div class="strip" style="background:${t.strip}">${others}${tab({ icon: own, title: "islandcn: Dynamic Island-style UI", active: true, wide: true })}</div>`;
};

const zooms = async (concept: Concept) => {
  const items = await Promise.all(
    (["light", "dark"] as const).map(async (theme) => {
      const colors = theme === "light" ? LIGHT : DARK;
      const src = await pngUri({ svg: markSvg({ concept, colors }), size: 16 });
      return `<div class="col"><img class="zoom" style="background:${TABS[theme].active}" src="${src}"><div class="cap">16 px, ${theme} tab, 8x</div></div>`;
    }),
  );
  return `<div class="zoomrow">${items.join("")}</div>`;
};

const panel = (concept: Concept, colors: Colorway) => {
  const sizes = [512, 64, 32, 16]
    .map(
      (s) =>
        `<div class="col"><img width="${s}" height="${s}" src="${svgUri(markSvg({ concept, colors }))}"><div class="cap" style="color:${colors.text}">${s}</div></div>`,
    )
    .join("");
  return `<div class="panel" style="background:${colors.ground};color:${colors.text}"><div class="sizes">${sizes}</div><div class="lockups">${lockup({ concept, colors, fontSize: 56 })}${lockup({ concept, colors, fontSize: 15 })}</div></div>`;
};

const conceptSheet = async (concept: Concept) => `<!doctype html><html><head><style>${CSS}</style></head><body><div class="sheet">
<h1>${concept.name}</h1><p class="idea">${concept.idea}</p>
<div class="pair">${panel(concept, LIGHT)}${panel(concept, DARK)}</div>
<div class="label">Favicon in a tab strip, actual size (16 px at 1x)</div>
<div class="pair">${await tabStrip({ concept, theme: "light" })}${await tabStrip({ concept, theme: "dark" })}</div>
<div class="label">The same 16 px rasters, zoomed 8x</div>
${await zooms(concept)}
</div></body></html>`;

const overviewCard = async (concept: Concept) => {
  const tile = (colors: Colorway) =>
    `<div class="tile" style="background:${colors.ground}"><img style="width:82%;height:auto" src="${svgUri(markSvg({ concept, colors }))}"></div>`;
  const tiny = await Promise.all(
    (["light", "dark"] as const).map(async (theme) => {
      const colors = theme === "light" ? LIGHT : DARK;
      const src = await pngUri({ svg: markSvg({ concept, colors }), size: 16 });
      return `<div class="tab" style="width:auto;border-radius:8px;background:${TABS[theme].active};color:${TABS[theme].title}"><img src="${src}">islandcn</div><img class="zoom" style="width:96px;height:96px;background:${TABS[theme].active}" src="${src}">`;
    }),
  );
  return `<div class="card"><h2>${concept.name}</h2><div class="tiles">${tile(LIGHT)}${tile(DARK)}</div>
<div style="background:${PALETTE.paper};border-radius:10px;padding:14px">${lockup({ concept, colors: LIGHT, fontSize: 22 })}</div>
<div style="background:${PALETTE.ink};border-radius:10px;padding:14px">${lockup({ concept, colors: DARK, fontSize: 22 })}</div>
<div class="tiles" style="align-items:center;justify-items:start">${tiny.join("")}</div></div>`;
};

const overview = async () => `<!doctype html><html><head><style>${CSS}</style></head><body><div class="sheet">
<h1>islandcn mark concepts</h1><p class="idea">Five directions. Light: the island in black with lagoon detail. Dark: the island in lagoon on black. Bottom row of each card: the real 16 px raster in a light and a dark tab, then 6x.</p>
<div class="grid">${(await Promise.all(CONCEPTS.map(overviewCard))).join("")}</div>
<div class="label">Tab strips at actual size</div>
<div style="display:flex;flex-direction:column;gap:10px">${(await Promise.all(CONCEPTS.map(async (c) => `<div class="pair">${await tabStrip({ concept: c, theme: "light" })}${await tabStrip({ concept: c, theme: "dark" })}</div>`))).join("")}</div>
</div></body></html>`;

const main = async () => {
  siblings = await loadSiblings();
  for (const concept of CONCEPTS) {
    await shootHtml({ html: await conceptSheet(concept), width: 1600, height: 900, out: join(OUT, `${concept.id}.png`) });
    console.log(`sheet ${concept.id}`);
  }
  await shootHtml({ html: await overview(), width: 1600, height: 900, out: join(OUT, "overview.png") });
  console.log("sheet overview");
  closeBrowser();
};

void main();
