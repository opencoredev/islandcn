import { llmsIndex } from "@/lib/agent-discovery/llms";
import { textResponse } from "@/lib/agent-discovery/responses";

export const dynamic = "force-static";

export const GET = () => textResponse(llmsIndex(), "text");
