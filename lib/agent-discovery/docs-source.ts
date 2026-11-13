import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ROUTES } from "@/constants/routes";

/*
 * The docs as the agent surfaces see them. The pages are written in docs/content
 * and built by Blume (scripts/build-docs.ts) into public/docs/. Blume writes a
 * Markdown mirror of every page (components already turned into plain
 * Markdown) and its sidebar as JSON; this module reads those, so /md,
 * /llms.txt and /llms-full.txt list the same pages in the same order as the
 * docs sidebar. Before the first docs build there is nothing to read, and
 * every reader returns empty.
 */

const OUT = path.join(process.cwd(), "public", "docs");

export interface DocsPage {
  /** Blume route without the base: "/" for the overview, "/guides/activities". */
  readonly route: string;
  /** Site path: "/docs", "/docs/guides/activities". */
  readonly url: string;
  readonly title: string;
  readonly description: string;
}

export interface DocsGroup {
  readonly title: string;
  readonly pages: readonly DocsPage[];
}

type JsonObject = { readonly [key: string]: unknown };

const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);

const stringField = (value: JsonObject, key: string): string | undefined => {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
};

const listField = (value: JsonObject, key: string): readonly unknown[] => {
  const field = value[key];
  return Array.isArray(field) ? field : [];
};

const readJson = (file: string): unknown => {
  const full = path.join(OUT, file);
  if (!existsSync(full)) return undefined;
  const parsed: unknown = JSON.parse(readFileSync(full, "utf8"));
  return parsed;
};

const siteUrl = (route: string) => (route === "/" ? ROUTES.DOCS : `${ROUTES.DOCS}${route}`);

/** Title and description of every page, keyed by route, from Blume's pages.json. */
const pageInfo = (): ReadonlyMap<string, DocsPage> => {
  const data = readJson(path.join("api", "docs", "pages.json"));
  const pages = isObject(data) ? listField(data, "pages") : [];
  const entries = pages.flatMap((page): [string, DocsPage][] => {
    if (!isObject(page)) return [];
    const route = stringField(page, "route");
    const title = stringField(page, "title");
    if (route === undefined || title === undefined) return [];
    return [[route, { route, url: siteUrl(route), title, description: stringField(page, "description") ?? "" }]];
  });
  return new Map(entries);
};

/** Routes of one sidebar group's pages, depth first, in sidebar order. */
const routesIn = (nodes: readonly unknown[]): string[] =>
  nodes.flatMap((node) => {
    if (!isObject(node)) return [];
    const kind = stringField(node, "kind");
    const route = stringField(node, "route");
    if (kind === "page" && route !== undefined) return [route];
    if (kind === "group") return routesIn(listField(node, "children"));
    return [];
  });

/** The docs sidebar: each top-level group and its pages, as Blume's navigation.json lists them. */
export const docsGroups = (): readonly DocsGroup[] => {
  const info = pageInfo();
  const data = readJson(path.join("api", "docs", "navigation.json"));
  const sidebar = isObject(data) ? listField(data, "sidebar") : [];
  const groups: DocsGroup[] = [];
  for (const node of sidebar) {
    if (!isObject(node)) continue;
    const title = stringField(node, "label") ?? "Docs";
    const routes = stringField(node, "kind") === "group" ? routesIn(listField(node, "children")) : routesIn([node]);
    const pages = routes.flatMap((route) => {
      const page = info.get(route);
      return page ? [page] : [];
    });
    if (pages.length > 0) groups.push({ title, pages });
  }
  return groups;
};

/** Every docs page in sidebar order. */
export const docsPages = (): readonly DocsPage[] => docsGroups().flatMap((group) => group.pages);

/**
 * Old docs routes (from the Fumadocs layout) mapped to where they moved, from Blume's
 * blume-redirects.json, so a Markdown twin of an old URL finds its page as the HTML page does.
 */
export const docsAliases = (): ReadonlyMap<string, string> => {
  const data = readJson("blume-redirects.json");
  const entries = (Array.isArray(data) ? data : []).flatMap((entry): [string, string][] => {
    if (!isObject(entry)) return [];
    const from = entry.from;
    const to = entry.to;
    if (typeof from !== "string" || typeof to !== "string" || /\.mdx?$/.test(from)) return [];
    const strip = (url: string) => url.replace(/^\/docs/, "") || "/";
    return [[strip(from), strip(to)]];
  });
  return new Map(entries);
};

/** The page for a slug under /docs (`[]` is the overview), following old routes that moved, or undefined. */
export const docsPageBySlug = (slug: readonly string[]): DocsPage | undefined => {
  const asked = slug.length === 0 ? "/" : `/${slug.join("/")}`;
  const route = docsAliases().get(asked) ?? asked;
  return docsPages().find((page) => page.route === route);
};

const FRONTMATTER = /^---\n[\s\S]*?\n---\n+/;

/** A page's body as Blume's Markdown mirror has it, without frontmatter. */
export const docsPageBody = (page: DocsPage): string => {
  const file = page.route === "/" ? "index.md" : `${page.route.slice(1)}.md`;
  const full = path.join(OUT, file);
  if (!existsSync(full)) return "";
  return readFileSync(full, "utf8").replace(FRONTMATTER, "").trim();
};
