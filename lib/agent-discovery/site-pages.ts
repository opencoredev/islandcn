import { PRESETS } from "@/constants/presets";
import { ROUTES } from "@/constants/routes";
import type { MarkdownPage } from "@/constants/routes";
import { ENGINE_ITEM, SITE, SITE_URL, SKILL_ITEM, addCommand } from "@/constants/site";

import { AGENT_DIRECTIVE, ENGINE_NOT_MENU } from "./directive";

const url = (route: string) => `${SITE_URL}${route}`;

const presetList = () =>
  PRESETS.map((preset) => `- [${preset.title}](${url(`${ROUTES.DOCS}/presets/${preset.slug}.md`)}): ${preset.purpose}`).join(
    "\n",
  );

const home = () => `# ${SITE.name}: ${SITE.headline.replace(/\.$/, "")}

${SITE.description}

${AGENT_DIRECTIVE}

## Start here

${ENGINE_NOT_MENU}

1. Install the engine: \`${addCommand(ENGINE_ITEM)}\`.
2. Mount \`IslandProvider\` and \`<Island placement="viewport" />\` once, then start activities with \`useIsland()\`: [Installation](${url(`${ROUTES.DOCS}/installation.md`)}).
3. Build the island for the app's own actions, or copy one from the [playground](${url(ROUTES.PLAYGROUND)}).

Coding agents can install the islandcn skill as a helper: \`${addCommand(SKILL_ITEM)}\` (also at ${url(ROUTES.AGENT_SKILL)}).

## Presets

${presetList()}

## Links

- [Playground](${url(`${ROUTES.PLAYGROUND}.md`)})
- [Docs](${url(`${ROUTES.DOCS}.md`)})
- [llms.txt](${url(ROUTES.LLMS)}) and [llms-full.txt](${url(ROUTES.LLMS_FULL)})
- [Agent skills index](${url(ROUTES.AGENT_SKILLS_INDEX)})
- [Registry index](${url(ROUTES.REGISTRY_INDEX)})
`;

const playground = () => `# Playground

An interactive page for building an island for your own app. Start from a blank activity or any preset, fill each region (compact leading and trailing, minimal, and the expanded leading, center, trailing and bottom) with an icon, text, a progress ring or bar, a timer, a level meter or buttons, pick the accent, and add a second activity to see the split. Buttons fire the engine's real calls: show, update, expand, collapse, long-press, alert, split, unsplit and dismiss. A Motion panel tunes the spring for each transition against the engine's defaults and the simulator's measured values, and the stage switches between light and dark and reduced motion. The whole build lives in the page's URL, so a link shares it.

${AGENT_DIRECTIVE}

The playground has no API of its own. It copies two things: the \`npx shadcn@latest add\` command for exactly the registry items the build uses, and one file with an \`AppIsland\` provider (\`IslandProvider\` with a \`motion\` prop holding only the springs you changed, and \`reducedMotion\` if you forced it, plus \`<Island placement="viewport" />\`), a content function and a hook per activity (\`show\`, \`update\`, \`alert\`, \`expand\`, \`collapse\`, \`dismiss\`, built on \`useIslandActions()\`), and an example component that shows the build. See ${url(`${ROUTES.DOCS}/api/use-island.md`)} and ${url(`${ROUTES.DOCS}/guides/motion.md`)}.
`;

export const SITE_PAGE_MARKDOWN = { index: home, playground } as const satisfies Record<MarkdownPage, () => string>;
