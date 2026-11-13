/**
 * Proof sheet for the shipped identity: the real favicon rasters in a tab
 * strip at actual size and 8x, the app icon, both lockups, and the OG card at
 * the size an X timeline shows it. Writes scripts/brand/sheets/final.png.
 *
 *   BRAND_SIBLINGS="dithercn=/path/favicon.svg,asciicn=/path/favicon.svg" pnpm tsx scripts/brand/render-final.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import sharp from "sharp";

import { BRAND_COLORS as C, FAVICON_MARK, type MarkTone, TONES } from "../../components/brand/brand";
import { closeBrowser, dataUri, shootHtml, svgToSquarePng } from "./shoot";

const favicon = (tone: MarkTone) => {
  const { pill: p, dot: d, bar: b } = FAVICON_MARK;
  const t = TONES[tone];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="${p.height / 2}" fill="${t.pill}"/><circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="${t.dot}"/><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${b.height / 2}" fill="${t.dot}"/></svg>`;
};

const TABS = {
  light: { strip: "#dee1e6", active: "#ffffff", title: "#1f1f1f", muted: "#5f6368", tone: "on-light" },
  dark: { strip: "#1f2023", active: "#35363a", title: "#e8eaed", muted: "#9aa0a6", tone: "on-dark" },
} as const;

const file = (path: string, mime: string) => dataUri({ bytes: readFileSync(resolve(path)), mime });

const main = async () => {
  const siblings = await Promise.all(
    (process.env.BRAND_SIBLINGS ?? "")
      .split(",")
      .filter((e) => e.includes("="))
      .map(async (e) => {
        const [name = "", path = ""] = e.split("=");
        return { name, src: dataUri({ bytes: await svgToSquarePng({ svg: readFileSync(path, "utf8"), size: 16 }), mime: "image/png" }) };
      }),
  );
  const strips: string[] = [];
  const zooms: string[] = [];
  for (const [theme, t] of Object.entries(TABS)) {
    const own16 = await sharp(Buffer.from(favicon(t.tone).replace("<svg ", '<svg width="16" height="16" '))).png().toBuffer();
    const src = dataUri({ bytes: own16, mime: "image/png" });
    const tab = (icon: string, title: string, active: boolean) =>
      `<div class="tab" style="background:${active ? t.active : "transparent"};color:${active ? t.title : t.muted};width:${active ? 270 : 190}px"><img src="${icon}">${title}</div>`;
    strips.push(`<div class="strip" style="background:${t.strip}">${siblings.map((s) => tab(s.src, s.name, false)).join("")}${tab(src, "islandcn: Dynamic Island-style UI", true)}</div>`);
    zooms.push(`<div class="col"><img class="zoom" style="background:${t.active}" src="${src}"><div class="cap">16 px, ${theme} tab, 8x</div></div>`);
  }
  const html = `<!doctype html><html><head><style>
*{box-sizing:border-box}body{margin:0;background:#111;color:#ddd;font:13px/1.4 -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif}
.sheet{width:1600px;padding:40px}h1{font-size:28px;margin:0 0 6px;color:#fff;font-weight:600}.sub{color:#a3a3a3;margin:0 0 28px;font-size:16px}
.label{font-size:12px;color:#888;margin:28px 0 10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.strip{border-radius:12px;padding:8px 8px 0;display:flex;gap:2px;align-items:flex-end;height:44px}
.tab{height:36px;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:12px;border-radius:8px 8px 0 0;white-space:nowrap;overflow:hidden}
.tab img{width:16px;height:16px;flex:none}.row{display:flex;gap:24px;align-items:flex-end}.col{display:flex;flex-direction:column;align-items:center;gap:6px}
.zoom{image-rendering:pixelated;width:128px;height:128px;border-radius:8px}.cap{font-size:11px;letter-spacing:.04em;text-transform:uppercase;opacity:.6}
.panel{border-radius:16px;padding:40px;display:flex;align-items:center;justify-content:center}
</style></head><body><div class="sheet">
<h1>islandcn: final identity</h1><p class="sub">B. Split, with the judge's favicon cut (pill 18x12, bubble r4 on the 32 grid). Lagoon ${C.lagoon} on ink, ${C.lagoonDeep} on paper.</p>
<div class="pair"><div class="panel" style="background:${C.paper}"><img style="width:560px" src="${file("public/brand/lockup.svg", "image/svg+xml")}"></div><div class="panel" style="background:${C.ink}"><img style="width:560px" src="${file("public/brand/lockup-dark.svg", "image/svg+xml")}"></div></div>
<div class="label">Favicon in a tab strip, actual size (16 px at 1x), next to the sibling favicons</div>
<div class="pair">${strips.join("")}</div>
<div class="label">The same 16 px rasters, zoomed 8x; the apple-icon at 180 and 60 px; the OG card at X-timeline size (506 px)</div>
<div class="row">${zooms.join("")}
<div class="col"><img style="width:180px;height:180px;border-radius:40px" src="${file("app/apple-icon.png", "image/png")}"><div class="cap">apple-icon 180</div></div>
<div class="col"><img style="width:60px;height:60px;border-radius:13px" src="${file("app/apple-icon.png", "image/png")}"><div class="cap">60</div></div>
<div class="col"><img style="width:506px;border-radius:12px;outline:1px solid rgb(255 255 255/.1)" src="${file("public/brand/og.png", "image/png")}"><div class="cap">og.png at 506 px</div></div>
</div></div></body></html>`;
  await shootHtml({ html, width: 1600, height: 900, out: resolve("scripts/brand/sheets/final.png") });
  closeBrowser();
  console.log("sheet final");
};

void main();
