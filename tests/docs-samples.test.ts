/*
 * Every TypeScript sample in the docs and the agent skill has to compile as it
 * is shown, against the files the registry installs: the engine at
 * `@/lib/island` and the content kit and presets at `@/components/islandcn/...`.
 * A sample that uses a component it doesn't import, or imports one from the
 * wrong place, fails here.
 *
 * Each ```ts or ```tsx fence becomes its own module, type-checked in memory
 * with the repo's tsconfig. A fence can only opt out with `nocheck` in its meta
 * (for a shell transcript or a type signature written as prose), and that is
 * listed in the test output, so nothing is skipped quietly.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import ts from "typescript";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCES = ["docs/content", "skills/islandcn"] as const;
/** Where the samples live in the in-memory program: inside the repo, so `@/` resolves as it does for a user. */
const SAMPLE_DIR = path.join(ROOT, "app", "__docs_samples__");

interface Sample {
  /** The doc it comes from, relative to the repo. */
  source: string;
  /** Line of the opening fence, 1-based. */
  line: number;
  lang: "ts" | "tsx";
  code: string;
  checked: boolean;
}

const docFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return docFiles(full);
    return /\.mdx?$/.test(name) ? [full] : [];
  });

const FENCE = /^(\s*)```(tsx|ts)\b([^\n]*)$/;

const samplesIn = (file: string): Sample[] => {
  const lines = readFileSync(file, "utf8").split("\n");
  const found: Sample[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const open = FENCE.exec(lines[index] ?? "");
    if (!open) continue;
    const indent = open[1] ?? "";
    const lang = open[2] === "tsx" ? "tsx" : "ts";
    const meta = open[3] ?? "";
    const body: string[] = [];
    let end = index + 1;
    while (end < lines.length && (lines[end] ?? "").trim() !== "```") {
      body.push((lines[end] ?? "").slice(indent.length));
      end += 1;
    }
    found.push({ source: path.relative(ROOT, file), line: index + 1, lang, code: body.join("\n"), checked: !/\bnocheck\b/.test(meta) });
    index = end;
  }
  return found;
};

const compilerOptions = (): ts.CompilerOptions => {
  const file = ts.readConfigFile(path.join(ROOT, "tsconfig.json"), ts.sys.readFile);
  if (file.error) throw new Error(ts.flattenDiagnosticMessageText(file.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(file.config, ts.sys, ROOT);
  // Samples are modules even when they only declare things; `isolatedModules` would flag a file with no import.
  return { ...parsed.options, noEmit: true, incremental: false, isolatedModules: false, noUnusedLocals: false };
};

/**
 * A relative import names the reader's own file (`import { App } from "./app"`), which the docs
 * don't ship. Only that is let through: an `@/` import that doesn't resolve still fails, since
 * that is a path the registry should have installed.
 */
const isReadersOwnFile = (diagnostic: ts.Diagnostic) =>
  diagnostic.code === 2307 && /^Cannot find module '\.{1,2}\//.test(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));

const samples = SOURCES.flatMap((dir) => docFiles(path.join(ROOT, dir))).flatMap(samplesIn);

test("the docs have TypeScript samples to check", () => {
  assert.ok(samples.filter((sample) => sample.checked).length > 20, `found ${samples.length} samples`);
});

test("every docs and skill sample compiles against the installed files", () => {
  const checked = samples.filter((sample) => sample.checked);
  const skipped = samples.filter((sample) => !sample.checked);
  for (const sample of skipped) console.log(`nocheck: ${sample.source}:${sample.line}`);

  const files = new Map<string, { sample: Sample; text: string }>();
  for (const [index, sample] of checked.entries()) {
    const name = path.join(SAMPLE_DIR, `sample-${index}.${sample.lang}`);
    // `export {}` makes a sample with no import or export a module, so two samples' names never clash.
    files.set(name, { sample, text: `${sample.code}\nexport {};\n` });
  }

  const options = compilerOptions();
  const host = ts.createCompilerHost(options, true);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (name) => files.has(name) || fileExists(name);
  host.readFile = (name) => files.get(name)?.text ?? readFile(name);
  host.getSourceFile = (name, version, onError, create) => {
    const entry = files.get(name);
    return entry ? ts.createSourceFile(name, entry.text, version, true) : getSourceFile(name, version, onError, create);
  };
  const program = ts.createProgram({ rootNames: [...files.keys()], options, host });

  const failures: string[] = [];
  for (const [name, { sample }] of files) {
    const source = program.getSourceFile(name);
    if (!source) continue;
    for (const diagnostic of ts.getPreEmitDiagnostics(program, source)) {
      if (isReadersOwnFile(diagnostic)) continue;
      const at = diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
      // The fence's first code line is the line after the fence.
      failures.push(`${sample.source}:${sample.line + at}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} errors in docs samples:\n${failures.join("\n")}`);
});
