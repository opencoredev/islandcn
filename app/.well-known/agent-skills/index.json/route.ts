import { createHash } from "node:crypto";

import { ROUTES } from "@/constants/routes";
import { SITE_URL } from "@/constants/site";
import { SKILL_NAME, readSkillFile, skillDescription } from "@/lib/agent-discovery/skill";
import { SITE_SKILL_URLS } from "@/lib/agent-discovery/skill-urls";

export const dynamic = "force-static";

// Agent Skills discovery index: one entry per skill, pointing at its SKILL.md.
// The digest covers the rendered SKILL.md, so agents can tell when it changes.
export const GET = () => {
  const skill = readSkillFile("SKILL.md", SITE_SKILL_URLS) ?? "";
  return Response.json(
    {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          name: SKILL_NAME,
          type: "skill-md",
          description: skillDescription(),
          url: `${SITE_URL}${ROUTES.AGENT_SKILL}`,
          digest: `sha256:${createHash("sha256").update(skill).digest("hex")}`,
        },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
};
