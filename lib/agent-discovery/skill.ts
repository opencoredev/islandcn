import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * The islandcn agent skill: `skills/islandcn/` in this repo. The source uses
 * `{{REGISTRY_URL}}` and `{{SITE_URL}}`; every reader renders it for one pair
 * of URLs, so the copy served at /.well-known and the copy the registry
 * installs say the same thing.
 *
 * scripts/build-registry.ts loads this file with jiti, so it uses no `@/` imports.
 */

export const SKILL_NAME = "islandcn";

const skillDir = () => path.join(process.cwd(), "skills", SKILL_NAME);

export interface SkillUrls {
  readonly siteUrl: string;
  readonly registryUrl: string;
}

const walk = (dir: string, prefix: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return walk(path.join(dir, entry.name), relative);
    return entry.name.startsWith(".") ? [] : [relative];
  });

/** Every file of the skill, relative to its folder with `/` separators, `SKILL.md` first. */
export const skillFiles = (): string[] =>
  walk(skillDir(), "").toSorted((a, b) => {
    if (a === "SKILL.md") return -1;
    if (b === "SKILL.md") return 1;
    return a.localeCompare(b);
  });

export const renderSkillText = (text: string, urls: SkillUrls) =>
  text.replaceAll("{{REGISTRY_URL}}", urls.registryUrl).replaceAll("{{SITE_URL}}", urls.siteUrl);

/**
 * One rendered skill file, or undefined when `file` is not part of the skill.
 * Only names from `skillFiles()` are read, so a request path can't reach
 * anything else on disk.
 */
export const readSkillFile = (file: string, urls: SkillUrls): string | undefined => {
  if (!skillFiles().includes(file)) return undefined;
  return renderSkillText(readFileSync(path.join(skillDir(), file), "utf8"), urls);
};

/** The `description` line of SKILL.md's frontmatter. */
export const skillDescription = (): string => {
  const source = readFileSync(path.join(skillDir(), "SKILL.md"), "utf8");
  const match = /^---\n[\s\S]*?^description:\s*(.+)$[\s\S]*?^---$/m.exec(source);
  return match?.[1]?.trim() ?? "";
};
