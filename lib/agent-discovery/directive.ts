import { ROUTES } from "@/constants/routes";
import { SITE_URL } from "@/constants/site";

/** The note at the top of every Markdown twin, so an agent that lands on one page finds the rest. */
export const AGENT_DIRECTIVE = `> For the full documentation index, see [llms.txt](${SITE_URL}${ROUTES.LLMS}). Every page has a Markdown version: add \`.md\` to its URL or send \`Accept: text/markdown\`. To build an island, follow the islandcn agent skill at ${SITE_URL}${ROUTES.AGENT_SKILL}.`;

/** islandcn is an engine, not a menu. Every agent surface says so before it lists presets. */
export const ENGINE_NOT_MENU =
  "islandcn is an engine, not a component menu. The presets are examples of what the engine draws. When a user asks for an island, build the one they asked for on the engine (`@/lib/island`), and read the closest preset's source only for technique.";
