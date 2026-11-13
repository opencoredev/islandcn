/**
 * Rendering helpers for the brand scripts: SVG to exact-size PNG with sharp,
 * and HTML pages to PNG with agent-browser (headless Chrome at DPR 1, so a
 * 16 px favicon in a mock is 16 real pixels).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";

export const WORK_DIR = join(tmpdir(), "islandcn-brand");
mkdirSync(WORK_DIR, { recursive: true });

const SESSION = "brand-e-render";
const browser = (args: readonly string[]) =>
  execFileSync(
    "agent-browser",
    ["--session", SESSION, "--profile", join(homedir(), ".agent-browser/profiles", SESSION), ...args],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

/** Rasterise an SVG string at its own width and height. */
export const svgToPng = async (svg: string) =>
  sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();

/** Rasterise an SVG string scaled to exactly `size` x `size` (square marks and icons). */
export const svgToSquarePng = async ({ svg, size }: { svg: string; size: number }) => {
  // Render large, then downsample: librsvg at tiny sizes skips subpixel coverage.
  const big = await sharp(Buffer.from(svg), { density: 72 * Math.max(1, Math.ceil(512 / size)) })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return big;
};

export const dataUri = ({ bytes, mime }: { bytes: Buffer | string; mime: string }) =>
  `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;

/** Screenshot an HTML document at `width` px, full page, into `out`. */
export const shootHtml = async ({ html, width, height, out }: { html: string; width: number; height: number; out: string }) => {
  const file = join(WORK_DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(file, html);
  browser(["set", "viewport", String(width), String(height), "1"]);
  browser(["open", `file://${file}`]);
  browser(["wait", "300"]);
  const raw = join(WORK_DIR, "shot.png");
  browser(["screenshot", "--full", raw]);
  await sharp(raw).png({ compressionLevel: 9, palette: true, quality: 95 }).toFile(out);
};

export const closeBrowser = () => {
  browser(["close"]);
};
