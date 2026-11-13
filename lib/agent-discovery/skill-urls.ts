import { REGISTRY_URL, SITE_URL } from "@/constants/site";

import type { SkillUrls } from "./skill";

/** The URLs the served skill is rendered with: the same ones the registry build uses. */
export const SITE_SKILL_URLS = { siteUrl: SITE_URL, registryUrl: REGISTRY_URL } as const satisfies SkillUrls;
