import { ROUTES } from "@/constants/routes";
import { SITE_URL } from "@/constants/site";

const url = (route: string) => `${SITE_URL}${route}`;

/**
 * The prompt the home page hands to a coding agent working in someone else's repo. It points at
 * the served skill and llms.txt rather than restating them, so it stays short and never drifts
 * from what those say. Built from `SITE_URL`, so a preview build hands out preview URLs.
 */
export const agentPrompt = () =>
  [
    "Add islandcn to this app. It is an open-source Dynamic Island-style status pill for React, installed with shadcn.",
    "",
    `1. Read ${url(ROUTES.AGENT_SKILL)} and follow it. The docs index is ${url(ROUTES.LLMS)}.`,
    "2. Install the engine and mount one island at the app root, as the skill says.",
    "3. Find what this app already does that takes time or changes live (uploads, background jobs, timers, calls, orders) and show each on the island. Build new activities on the engine; install a preset only if it matches exactly.",
    "",
    "Keep the app's own look, and don't add demo data.",
  ].join("\n");

/** Where each assistant opens a new chat with `q` in its prompt box. */
const ASSISTANT_NEW_CHAT = {
  claude: "https://claude.ai/new",
  chatgpt: "https://chatgpt.com/",
} as const satisfies Record<string, string>;

export type Assistant = keyof typeof ASSISTANT_NEW_CHAT;

interface AssistantLinkOptions {
  /** Which assistant to open. Required. */
  assistant: Assistant;
  /** The prompt to prefill. Required. */
  prompt: string;
}

/**
 * A link that opens a new chat with the prompt filled in. `encodeURIComponent` rather than
 * `URLSearchParams`, which writes spaces as "+": not every reader of `q` turns those back.
 */
export const assistantLink = ({ assistant, prompt }: AssistantLinkOptions) => `${ASSISTANT_NEW_CHAT[assistant]}?q=${encodeURIComponent(prompt)}`;
