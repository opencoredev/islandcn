export const ROUTES = {
  HOME: "/",
  DOCS: "/docs",
  GALLERY: "/gallery",
  PLAYGROUND: "/playground",
  /** Old home of the spring controls; redirects to the playground. */
  STUDIO: "/studio",
  LLMS: "/llms.txt",
  LLMS_FULL: "/llms-full.txt",
  /** Markdown twins of pages; proxy.ts rewrites `.md` and `Accept: text/markdown` here. */
  MARKDOWN: "/md",
  AGENT_SKILLS_INDEX: "/.well-known/agent-skills/index.json",
  AGENT_SKILL: "/.well-known/agent-skills/islandcn/SKILL.md",
  REGISTRY_INDEX: "/r/registry.json",
  OG: "/og",
} as const;

/** Pages outside the docs that have a Markdown twin at `/md/<slug>`. */
export const MARKDOWN_PAGES = ["index", "playground"] as const;

export type MarkdownPage = (typeof MARKDOWN_PAGES)[number];
