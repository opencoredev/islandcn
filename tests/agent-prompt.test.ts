/*
 * The prompt the home page hands to a coding agent, and the links that open it in Claude and
 * ChatGPT. It must point at this build's own skill and llms.txt (so a preview build hands out
 * preview URLs), stay free of the banned Apple names, and survive the trip through `?q=`.
 *
 * Run: pnpm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ROUTES } from "../constants/routes";
import { SITE_URL } from "../constants/site";
import { agentPrompt, assistantLink } from "../lib/agent-discovery/agent-prompt";

test("the prompt points at this site's skill and llms.txt", () => {
  const prompt = agentPrompt();
  assert.ok(prompt.includes(`${SITE_URL}${ROUTES.AGENT_SKILL}`), prompt);
  assert.ok(prompt.includes(`${SITE_URL}${ROUTES.LLMS}`), prompt);
});

test("the prompt names no banned Apple product", () => {
  const prompt = agentPrompt();
  for (const pattern of [/\biOS\b/, /iPhone/, /Live Activit/, /SF Symbol/, /SF Pro/]) {
    assert.doesNotMatch(prompt, pattern);
  }
});

test("each assistant link opens a new chat with the whole prompt in q", () => {
  const prompt = agentPrompt();
  const cases = [
    { assistant: "claude", origin: "https://claude.ai", pathname: "/new" },
    { assistant: "chatgpt", origin: "https://chatgpt.com", pathname: "/" },
  ] as const;
  for (const { assistant, origin, pathname } of cases) {
    const link = new URL(assistantLink({ assistant, prompt }));
    assert.equal(link.origin, origin);
    assert.equal(link.pathname, pathname);
    assert.equal(link.searchParams.get("q"), prompt);
    // Spaces travel as %20, never "+", which a reader of `q` might keep as a plus.
    assert.ok(!link.search.includes("+"), link.search);
  }
});
