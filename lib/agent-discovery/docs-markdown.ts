import { AGENT_DIRECTIVE } from "./directive";
import { docsPageBody } from "./docs-source";
import type { DocsPage } from "./docs-source";

/** A docs page as Markdown: title, description, the agent directive, then the body Blume rendered. */
export const docsPageMarkdown = (page: DocsPage) =>
  [`# ${page.title}`, page.description, AGENT_DIRECTIVE, docsPageBody(page)].filter(Boolean).join("\n\n").concat("\n");
