import { ROUTES } from "@/constants/routes";
import { SITE, SITE_URL, SKILL_ITEM, addCommand } from "@/constants/site";

import { ENGINE_NOT_MENU } from "./directive";
import { docsPageMarkdown } from "./docs-markdown";
import { docsGroups, docsPages } from "./docs-source";

const url = (route: string) => `${SITE_URL}${route}`;

/** `/docs/installation` to `/docs/installation.md`; the overview becomes `/docs.md`. */
const markdownUrl = (pageUrl: string) => `${pageUrl}.md`;

/** /llms.txt: what islandcn is, how to start, and one line per docs page, grouped as the docs sidebar is. */
export const llmsIndex = () => {
  const sections = docsGroups().map((group) => {
    const lines = group.pages.map((page) => `- [${page.title}](${url(markdownUrl(page.url))}): ${page.description}`);
    return `## ${group.title}\n\n${lines.join("\n")}`;
  });

  return `# ${SITE.name}

> ${SITE.description}

## Start here

${ENGINE_NOT_MENU}

1. Read [Installation](${url(`${ROUTES.DOCS}/installation.md`)}) to install the engine and mount the island.
2. Read [Activities](${url(`${ROUTES.DOCS}/guides/activities.md`)}) to start, update and end one for the app's own actions.
3. Build one by hand in the [playground](${url(`${ROUTES.PLAYGROUND}.md`)}) and copy its code.

Coding agents can install the islandcn skill as an install helper: \`${addCommand(SKILL_ITEM)}\`, then follow it (${url(ROUTES.AGENT_SKILL)}).

${sections.join("\n\n")}

## Other resources

- [Full docs in one file](${url(ROUTES.LLMS_FULL)})
- [Playground](${url(`${ROUTES.PLAYGROUND}.md`)})
- [Agent skills index](${url(ROUTES.AGENT_SKILLS_INDEX)})
- [Registry index](${url(ROUTES.REGISTRY_INDEX)})
`;
};

/** /llms-full.txt: every docs page as Markdown, in sidebar order. */
export const llmsFull = () => {
  const pages = docsPages().map((page) => `<!-- ${url(page.url)} -->\n\n${docsPageMarkdown(page)}`);
  return `# ${SITE.name} documentation\n\n> ${SITE.description}\n\n${pages.join("\n---\n\n")}`;
};
