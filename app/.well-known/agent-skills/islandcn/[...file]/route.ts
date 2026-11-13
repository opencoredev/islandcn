import { markdownNotFound, textResponse } from "@/lib/agent-discovery/responses";
import { readSkillFile, skillFiles } from "@/lib/agent-discovery/skill";
import { SITE_SKILL_URLS } from "@/lib/agent-discovery/skill-urls";

// SKILL.md and references/*.md, rendered with this site's registry URL.
export const dynamic = "force-static";

export const GET = async (_request: Request, { params }: { params: Promise<{ file: string[] }> }) => {
  const { file } = await params;
  const name = file.join("/");
  const body = readSkillFile(name, SITE_SKILL_URLS);
  return body === undefined ? markdownNotFound(`skill file ${name}`) : textResponse(body, "markdown");
};

export const generateStaticParams = () => skillFiles().map((name) => ({ file: name.split("/") }));
