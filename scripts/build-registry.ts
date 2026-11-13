/**
 * Builds the shadcn registry: merges the fragments in registry/*.json into
 * registry.json, checks them, then runs `shadcn build` into public/r.
 *
 * - `{{REGISTRY_URL}}` and `{{SITE_URL}}` are filled in from the environment
 *   (`REGISTRY_URL`, `SITE_URL`; see constants/site.ts for the defaults).
 * - Fragments are optional: a track that hasn't landed its fragment yet is
 *   simply absent. Each fragment is a JSON array of items, or `{ "items": [...] }`.
 * - The build fails when a shipped file imports a site-only module, when a file
 *   imports the engine or a preset without the matching registryDependencies
 *   entry, or when `islandcn-skill` doesn't ship every skill file to both agent
 *   folders.
 *
 * Run with `pnpm registry:build`. Loaded by jiti, so imports are relative.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { REGISTRY_URL, SITE_URL } from "../constants/site";
import { SKILL_NAME, renderSkillText, skillFiles } from "../lib/agent-discovery/skill";

const ROOT = process.cwd();
const FRAGMENT_DIR = path.join(ROOT, "registry");
const OUTPUT_FILE = path.join(ROOT, "registry.json");
const OUTPUT_DIR = path.join(ROOT, "public", "r");
// Rendered skill files live under node_modules so they are never committed.
const RENDER_DIR = path.join("node_modules", ".cache", "islandcn-registry");

const ENGINE_ITEM = "island-core";
const SKILL_ITEM = "islandcn-skill";
const SKILL_TARGETS = [`.agents/skills/${SKILL_NAME}`, `.claude/skills/${SKILL_NAME}`] as const;

/** Modules that exist only on the site. A shipped file that imports one breaks in the user's project. */
const SITE_ONLY_IMPORTS = ["@/constants", "@/components/site", "@/lib/agent-discovery", "@/content"] as const;

const CODE_FILE = /\.(?:ts|tsx|js|jsx|mjs)$/;

/** Packages every app that installs islandcn already has, so items never declare them. */
const HOST_PACKAGES = new Set(["react", "react-dom", "next"]);

/** `@scope/name/sub` to `@scope/name`, `name/sub` to `name`, or undefined for a relative or aliased path. */
const packageOf = (specifier: string): string | undefined => {
  if (specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("node:")) return undefined;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};

/** `@hugeicons/react@1.1.10` or `@hugeicons/react` to `@hugeicons/react`. */
const declaredPackage = (dependency: string) => dependency.replace(/(?<=.)@[^/@]*$/, "");

interface RegistryFile {
  path: string;
  type: string;
  target?: string;
}

interface RegistryItem {
  name: string;
  type: string;
  files: RegistryFile[];
  registryDependencies?: string[];
  dependencies?: string[];
  [key: string]: unknown;
}

interface Fragment {
  file: string;
  items: RegistryItem[];
}

const errors: string[] = [];
const fail = (message: string) => errors.push(message);

/* Parsing. Fragments are external input, so every field is checked before use. */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseFile = (value: unknown, where: string): RegistryFile | undefined => {
  if (!isRecord(value) || typeof value.path !== "string" || typeof value.type !== "string") {
    fail(`${where}: every file needs a string "path" and "type".`);
    return undefined;
  }
  if (value.target !== undefined && typeof value.target !== "string") {
    fail(`${where}: "target" must be a string.`);
    return undefined;
  }
  return { ...value, path: value.path, type: value.type, target: value.target };
};

const parseItem = (value: unknown, where: string): RegistryItem | undefined => {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.type !== "string") {
    fail(`${where}: every item needs a string "name" and "type".`);
    return undefined;
  }
  const rawFiles = value.files ?? [];
  if (!Array.isArray(rawFiles)) {
    fail(`${where} (${value.name}): "files" must be an array.`);
    return undefined;
  }
  const deps = value.registryDependencies;
  if (deps !== undefined && !(Array.isArray(deps) && deps.every((dep) => typeof dep === "string"))) {
    fail(`${where} (${value.name}): "registryDependencies" must be an array of strings.`);
    return undefined;
  }
  const npmDeps = value.dependencies;
  if (npmDeps !== undefined && !(Array.isArray(npmDeps) && npmDeps.every((dep) => typeof dep === "string"))) {
    fail(`${where} (${value.name}): "dependencies" must be an array of strings.`);
    return undefined;
  }
  const files = rawFiles
    .map((file, index) => parseFile(file, `${where} (${value.name}) file ${index}`))
    .filter((file) => file !== undefined);
  return {
    ...value,
    name: value.name,
    type: value.type,
    files,
    registryDependencies: deps?.filter((dep): dep is string => typeof dep === "string"),
    dependencies: npmDeps?.filter((dep): dep is string => typeof dep === "string"),
  };
};

const substitute = (text: string) =>
  text.replaceAll("{{REGISTRY_URL}}", REGISTRY_URL).replaceAll("{{SITE_URL}}", SITE_URL);

const readFragments = (): Fragment[] => {
  if (!existsSync(FRAGMENT_DIR)) return [];
  return readdirSync(FRAGMENT_DIR)
    .filter((file) => file.endsWith(".json"))
    .toSorted()
    .flatMap((file) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(substitute(readFileSync(path.join(FRAGMENT_DIR, file), "utf8")));
      } catch (error) {
        fail(`registry/${file}: not valid JSON (${error instanceof Error ? error.message : String(error)}).`);
        return [];
      }
      const list = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.items) ? parsed.items : undefined;
      if (!list) {
        fail(`registry/${file}: expected an array of items or { "items": [...] }.`);
        return [];
      }
      const items = list
        .map((item, index) => parseItem(item, `registry/${file} item ${index}`))
        .filter((item) => item !== undefined);
      return [{ file, items }];
    });
};

/* Checks. */

const importsOf = (source: string): string[] =>
  [...source.matchAll(/(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s*["']([^"']+)["']/g)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? "")
    .filter(Boolean);

/** `https://x/r/island-core.json`, `island-core.json` or `island-core` to `island-core`. */
const dependencyName = (dependency: string) => dependency.replace(/\.json$/, "").split("/").at(-1) ?? dependency;

/** Maps each shipped `components/islandcn/<name>` module (no extension) to the item that ships it. */
const fileOwners = (items: RegistryItem[]) =>
  new Map(items.flatMap((item) => item.files.map((file) => [file.path.replace(/\.[^./]+$/, ""), item.name] as const)));

const checkItem = (item: RegistryItem, owners: ReadonlyMap<string, string>) => {
  const dependencies = new Set((item.registryDependencies ?? []).map(dependencyName));
  const packages = new Set((item.dependencies ?? []).map(declaredPackage));

  for (const file of item.files) {
    const absolute = path.join(ROOT, file.path);
    if (!existsSync(absolute)) {
      fail(`${item.name}: ${file.path} does not exist.`);
      continue;
    }
    if (file.type === "registry:file" && !file.target) fail(`${item.name}: ${file.path} is a registry:file without a "target".`);
    if (!CODE_FILE.test(file.path)) continue;

    for (const specifier of importsOf(readFileSync(absolute, "utf8"))) {
      const siteOnly = SITE_ONLY_IMPORTS.find((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`));
      if (siteOnly) fail(`${item.name}: ${file.path} imports ${specifier}, which is site-only (${siteOnly}).`);

      // An npm package the file imports must be in the item's "dependencies", or the CLI never installs it.
      const pkg = packageOf(specifier);
      if (pkg !== undefined && !HOST_PACKAGES.has(pkg) && !packages.has(pkg)) {
        fail(`${item.name}: ${file.path} imports ${specifier} but "dependencies" lacks "${pkg}".`);
      }

      const usesEngine = specifier === "@/lib/island" || specifier.startsWith("@/lib/island/");
      if (usesEngine && item.name !== ENGINE_ITEM && !dependencies.has(ENGINE_ITEM)) {
        fail(`${item.name}: ${file.path} imports ${specifier} but registryDependencies lacks {{REGISTRY_URL}}/${ENGINE_ITEM}.json.`);
      }

      // A module can ship inside a group item (island-content ships theme, glyph, ...), so resolve the owner.
      const module = /^@\/(components\/islandcn\/[^/]+)$/.exec(specifier)?.[1];
      const owner = module ? owners.get(module) : undefined;
      if (module && !owner) fail(`${item.name}: ${file.path} imports ${specifier}, which no registry item ships.`);
      if (owner && owner !== item.name && !dependencies.has(owner)) {
        fail(`${item.name}: ${file.path} imports ${specifier} but registryDependencies lacks {{REGISTRY_URL}}/${owner}.json.`);
      }
    }
  }
};

/** The skill item must ship every skill file to both agent folders, and nothing that isn't in the skill. */
const checkSkill = (items: RegistryItem[]) => {
  const skill = items.find((item) => item.name === SKILL_ITEM);
  if (!skill) {
    fail(`${SKILL_ITEM} is missing. It lives in registry/skill.json.`);
    return;
  }
  const shipped = new Set(skill.files.map((file) => `${file.path} -> ${file.target ?? ""}`));
  const sourceFiles = skillFiles();
  for (const file of sourceFiles) {
    for (const target of SKILL_TARGETS) {
      const entry = `skills/${SKILL_NAME}/${file} -> ${target}/${file}`;
      if (!shipped.has(entry)) fail(`${SKILL_ITEM}: add { "path": "skills/${SKILL_NAME}/${file}", "type": "registry:file", "target": "${target}/${file}" } to registry/skill.json.`);
    }
  }
  for (const file of skill.files) {
    const relative = file.path.replace(`skills/${SKILL_NAME}/`, "");
    if (!sourceFiles.includes(relative)) fail(`${SKILL_ITEM}: ${file.path} is not a file in skills/${SKILL_NAME}/.`);
  }
};

/** Skill files carry {{REGISTRY_URL}}; ship rendered copies so installs see real URLs. */
const renderSkill = (items: RegistryItem[]): RegistryItem[] => {
  rmSync(path.join(ROOT, RENDER_DIR), { recursive: true, force: true });
  const urls = { siteUrl: SITE_URL, registryUrl: REGISTRY_URL };
  return items.map((item) => {
    if (item.name !== SKILL_ITEM) return item;
    const files = item.files.map((file) => {
      const rendered = path.join(RENDER_DIR, file.path);
      mkdirSync(path.dirname(path.join(ROOT, rendered)), { recursive: true });
      writeFileSync(path.join(ROOT, rendered), renderSkillText(readFileSync(path.join(ROOT, file.path), "utf8"), urls));
      return { ...file, path: rendered.split(path.sep).join("/") };
    });
    return { ...item, files };
  });
};

/*
 * The shadcn CLI (4.23) rewrites aliased imports when it installs an item, and
 * resolves `@/lib/island` by probing for any installed file named `island.*`.
 * The engine's element file used to be `lib/island/island.tsx`, and the probe
 * picked it over `lib/island/index.ts`, writing `@/lib/island/island`, which
 * lacks most exports. Pinning `@/lib/island/index` here fixed a first install,
 * but re-adding a preset with `--overwrite` still rewrote seven kit files to
 * `@/lib/island/island` and broke the app's build. The element file is now
 * `island-root.tsx`, so no engine file matches the probe; the explicit
 * specifier stays as a second guard, and the CLI writes it back as plain
 * `@/lib/island`.
 */
const ENGINE_IMPORT = /(from\s*|import\s*\(\s*)(["'])@\/lib\/island\2/g;

const pinEngineImports = () => {
  let rewritten = 0;
  for (const file of readdirSync(OUTPUT_DIR).filter((name) => name.endsWith(".json"))) {
    const absolute = path.join(OUTPUT_DIR, file);
    const parsed: unknown = JSON.parse(readFileSync(absolute, "utf8"));
    if (!isRecord(parsed) || !Array.isArray(parsed.files)) continue;
    let changed = false;
    const files = parsed.files.map((entry: unknown) => {
      // Only code: the CLI leaves Markdown alone, so README samples keep the plain path.
      if (!isRecord(entry) || typeof entry.content !== "string" || typeof entry.path !== "string" || !CODE_FILE.test(entry.path)) return entry;
      const content = entry.content.replace(ENGINE_IMPORT, (_match, lead: string, quote: string) => `${lead}${quote}@/lib/island/index${quote}`);
      if (content === entry.content) return entry;
      changed = true;
      rewritten += 1;
      return { ...entry, content };
    });
    if (changed) writeFileSync(absolute, `${JSON.stringify({ ...parsed, files }, null, 2)}\n`);
  }
  console.log(`Pinned @/lib/island to @/lib/island/index in ${rewritten} shipped files.`);
};

const main = () => {
  const fragments = readFragments();
  const items = fragments.flatMap((fragment) => fragment.items);

  const seen = new Map<string, string>();
  for (const fragment of fragments) {
    for (const item of fragment.items) {
      const first = seen.get(item.name);
      if (first) fail(`${item.name} is defined in both registry/${first} and registry/${fragment.file}.`);
      seen.set(item.name, fragment.file);
    }
  }

  const owners = fileOwners(items);
  for (const item of items) checkItem(item, owners);
  checkSkill(items);

  if (errors.length > 0) {
    console.error(`Registry build failed:\n${errors.map((error) => `  - ${error}`).join("\n")}`);
    process.exit(1);
  }

  const registry = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "islandcn",
    homepage: SITE_URL,
    items: renderSkill(items),
  };
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(registry, null, 2)}\n`);
  console.log(
    `registry.json: ${items.length} items from ${fragments.map((fragment) => fragment.file).join(", ") || "no fragments"} (REGISTRY_URL=${REGISTRY_URL})`,
  );

  // `shadcn build` only adds files, so an item removed from the registry (agent-run) kept being
  // served from an earlier build. public/r is all build output (git-ignored): start it empty.
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  const shadcn = path.join(ROOT, "node_modules", ".bin", "shadcn");
  const result = spawnSync(shadcn, ["build", "registry.json", "--output", path.relative(ROOT, OUTPUT_DIR)], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  pinEngineImports();
};

main();
