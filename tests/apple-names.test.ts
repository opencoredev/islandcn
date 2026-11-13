/*
 * No Apple product names in anything a visitor reads. "Dynamic Island" is the
 * one Apple name the site may use, descriptively, as in the hero's "The
 * open-source Dynamic Island for React" (AGENTS.md, hard rules).
 *
 * Two passes:
 * - Sources a reader sees as written: the docs (docs/content), the agent
 *   skill (skills/islandcn), code samples included, and the shipped content
 *   kit (components/islandcn), whose comments land in every installing app.
 * - The production build (.next): every prerendered page's visible text, its
 *   title and meta tags (description, Open Graph, Twitter) and its alt,
 *   aria-label and title attributes, plus every text route the build wrote
 *   (llms.txt, llms-full.txt, the Markdown twins of pages, the skill served
 *   under /.well-known). Scripts and styles are dropped first, so code
 *   identifiers in the bundle don't count. This pass needs `pnpm build`
 *   first; without a build it is skipped and says so.
 *
 * Provenance (which simulator, which phone) belongs in reference/, which ships nowhere.
 *
 * Run: pnpm build && pnpm test
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCES = ["docs/content", "skills/islandcn", "components/islandcn"] as const;
const BUILD = path.join(ROOT, ".next");
const BUILT_PAGES = path.join(BUILD, "server", "app");

/** Each banned name, as a pattern on visible text. Case matters: "live activity" in plain English is fine. */
const BANNED = [
  { name: "iOS", pattern: /\biOS\b/g },
  { name: "iPhone", pattern: /iPhone/g },
  { name: "Live Activity", pattern: /Live Activit/g },
  { name: "SF Symbols", pattern: /SF Symbol/g },
  { name: "SF Pro", pattern: /SF Pro/g },
] as const satisfies readonly { name: string; pattern: RegExp }[];

interface Hit {
  /** Where, relative to the repo. */
  file: string;
  name: string;
  /** The text around the hit. */
  context: string;
}

/** Every file under `dir` whose name passes `keep`. */
const walk = (dir: string, keep: (file: string) => boolean): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full, keep);
    return keep(full) ? [full] : [];
  });
};

/** The hits of every banned name in `text`. */
const findHits = (file: string, text: string): Hit[] =>
  BANNED.flatMap(({ name, pattern }) =>
    [...text.matchAll(pattern)].map((match) => {
      const at = match.index;
      return { file, name, context: text.slice(Math.max(0, at - 50), at + 60).replace(/\s+/g, " ").trim() };
    }),
  );

const ENTITIES: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? whole;
  });

/** Attributes a reader sees or hears: meta content (title, description, Open Graph), alt, aria-label and title. */
const ATTRIBUTE = /\s(?:content|alt|aria-label|title)="([^"]*)"/g;

/** What a visitor of a prerendered page can read or hear: text, title, meta and labelling attributes. */
const visibleText = (html: string) => {
  const withoutCode = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  const attributes = [...withoutCode.matchAll(ATTRIBUTE)].map((match) => match[1] ?? "");
  const text = withoutCode.replace(/<[^>]+>/g, " ");
  return decode([text, ...attributes].join("\n"));
};

const report = (hits: readonly Hit[]) => hits.map((hit) => `${hit.file}: ${hit.name}: "${hit.context}"`).join("\n");

test("the name check catches each banned name and lets Dynamic Island through", () => {
  const planted = "On iOS, an iPhone shows a Live Activity in its Dynamic Island, drawn with SF Symbols in SF Pro.";
  assert.deepEqual(
    findHits("planted", planted).map((hit) => hit.name).toSorted(),
    BANNED.map((entry) => entry.name).toSorted(),
  );
  assert.deepEqual(
    findHits("allowed", "The open-source Dynamic Island for React, a Dynamic Island-style pill, a live status activity, iOSX, BIOS."),
    [],
  );
  assert.equal(visibleText('<p title="x">Hi <script>iOS()</script><b>there</b></p>').includes("iOS"), false);
  assert.match(visibleText('<meta property="og:title" content="On iPhone &amp; more">'), /On iPhone & more/);
});

test("docs, the agent skill and the shipped content kit use no Apple names", () => {
  const files = SOURCES.flatMap((dir) => walk(path.join(ROOT, dir), (file) => /\.(mdx?|json|tsx?)$/.test(file)));
  assert.ok(files.length > 20, `expected the docs and skill sources, found ${files.length} files`);
  const hits = files.flatMap((file) => findHits(path.relative(ROOT, file), readFileSync(file, "utf8")));
  assert.equal(hits.length, 0, `Apple names in the docs, skill or content kit:\n${report(hits)}`);
});

test("the built site's visible text uses no Apple names", (t) => {
  if (!existsSync(path.join(BUILD, "BUILD_ID"))) {
    t.skip("no production build in .next: run pnpm build first");
    return;
  }
  // Next's own prerendered pages, plus the Blume docs the build copies into public/docs.
  const pages = [...walk(BUILT_PAGES, (file) => file.endsWith(".html")), ...walk(path.join(ROOT, "public", "docs"), (file) => file.endsWith(".html"))];
  // Text routes: llms.txt, llms-full.txt, Markdown twins and the served skill. Binary bodies (icons) are skipped.
  const bodies = walk(BUILT_PAGES, (file) => file.endsWith(".body") && !/\.(png|ico)\.body$/.test(file));
  assert.ok(pages.length >= 30, `expected the prerendered pages, found ${pages.length}`);
  assert.ok(bodies.some((file) => file.endsWith("llms.txt.body")), "expected llms.txt in the build");
  const hits = [
    ...pages.flatMap((file) => findHits(path.relative(ROOT, file), visibleText(readFileSync(file, "utf8")))),
    ...bodies.flatMap((file) => findHits(path.relative(ROOT, file), readFileSync(file, "utf8"))),
  ];
  assert.equal(hits.length, 0, `Apple names in the built site:\n${report(hits)}`);
});
