/*
 * Builds the Blume docs in docs/ and copies the static site into public/docs/,
 * where Next serves it under /docs (next.config.mjs maps a page URL to its
 * index.html). The /md, /llms.txt and /llms-full.txt routes read the Markdown
 * mirrors and the navigation Blume writes next to the HTML.
 *
 * Run: pnpm docs:build (pnpm build runs it before next build).
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DOCS = path.join(ROOT, "docs");
const DIST = path.join(DOCS, "dist");
const OUT = path.join(ROOT, "public", "docs");

// Host config files Blume writes for static hosts; Next has its own, and serving them would only expose them.
// Blume's 404 pages would be served as 200 pages here; Next's own not-found answers instead.
const HOST_FILES = ["_headers", "vercel.json", "404.html", "404.md", "404.json"] as const;

/**
 * Package managers Blume's install tabs offer that the shadcn CLI's own docs don't. Six tabs
 * overflowed the row at phone width and hid the last one under the copy button, and Blume has no
 * setting for the list, so their panels come out of the built pages; the tab row is drawn from the
 * panels in the browser, so the tabs go with them.
 */
const DROPPED_MANAGERS = ["nub", "aube"] as const;

/**
 * Cuts one manager's install panels out of a page: from the `<div` that opens the panel to the
 * `</pre></div>` that closes it (a panel holds a single highlighted block, which never contains
 * "</pre>"). A pattern can't find the opening tag: its class attribute holds ">" (`has(>pre)`).
 */
const cutPanels = (html: string, manager: string): { html: string; cut: number } => {
  const marker = `data-blume-tab-panel data-tab-id="${manager}"`;
  const close = "</pre></div>";
  let out = html;
  let cut = 0;
  for (let at = out.indexOf(marker); at !== -1; at = out.indexOf(marker)) {
    const start = out.lastIndexOf("<div ", at);
    const end = out.indexOf(close, at);
    if (start === -1 || end === -1) throw new Error(`docs: a ${manager} install panel has no opening <div or closing </pre></div>`);
    out = out.slice(0, start) + out.slice(end + close.length);
    cut += 1;
  }
  return { html: out, cut };
};

const htmlFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(file);
    return entry.name.endsWith(".html") ? [file] : [];
  });

const dropManagers = (dir: string): number => {
  let dropped = 0;
  for (const file of htmlFiles(dir)) {
    const html = readFileSync(file, "utf8");
    let next = html;
    for (const manager of DROPPED_MANAGERS) {
      const result = cutPanels(next, manager);
      next = result.html;
      dropped += result.cut;
    }
    if (next !== html) writeFileSync(file, next);
  }
  return dropped;
};

const blume = path.join(ROOT, "node_modules", ".bin", "blume");
const result = spawnSync(blume, ["build"], { cwd: DOCS, stdio: "inherit", env: process.env });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
if (!existsSync(path.join(DIST, "index.html"))) {
  console.error("blume build finished without docs/dist/index.html");
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
cpSync(DIST, OUT, { recursive: true });
for (const file of HOST_FILES) rmSync(path.join(OUT, file), { force: true });
const dropped = dropManagers(OUT);

console.log(`docs: copied ${path.relative(ROOT, DIST)} to ${path.relative(ROOT, OUT)}, ${dropped} extra install tabs dropped`);
