/*
 * The shadcn CLI resolves `@/lib/island` by probing for an installed file named
 * `island.*`. When the engine had one (`lib/island/island.tsx`), re-adding a
 * preset with `--overwrite` rewrote the content kit's imports to
 * `@/lib/island/island`, which lacks most exports, and the app stopped
 * compiling. So no engine file may be named `island.*`, in the sources or in
 * the built registry item.
 *
 * Run: pnpm test (the registry half needs `pnpm build` first; without it, that
 * half is skipped and says so).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENGINE = path.join(ROOT, "lib", "island");
const BUILT_CORE = path.join(ROOT, "public", "r", "island-core.json");

/** A file the CLI's probe for `@/lib/island` could pick instead of the index. */
const shadowsIndex = (name: string) => /^island\.[^.]+$/.test(name);

test("no engine source file is named island.*", () => {
  const hits = readdirSync(ENGINE).filter(shadowsIndex);
  assert.deepEqual(hits, [], `rename ${hits.join(", ")}: the shadcn CLI resolves @/lib/island to it on --overwrite`);
});

test("the built island-core item ships no lib/island/island.* file", (t) => {
  if (!existsSync(BUILT_CORE)) {
    t.skip("no built registry in public/r: run pnpm build first");
    return;
  }
  const parsed: unknown = JSON.parse(readFileSync(BUILT_CORE, "utf8"));
  const files = typeof parsed === "object" && parsed !== null && "files" in parsed && Array.isArray(parsed.files) ? parsed.files : [];
  const paths = files.flatMap((file: unknown) =>
    typeof file === "object" && file !== null && "path" in file && typeof file.path === "string" ? [file.path] : [],
  );
  assert.ok(paths.length > 10, `expected the engine's files in island-core.json, found ${paths.length}`);
  const hits = paths.filter((file) => file.startsWith("lib/island/") && shadowsIndex(path.posix.basename(file)));
  assert.deepEqual(hits, []);
});
