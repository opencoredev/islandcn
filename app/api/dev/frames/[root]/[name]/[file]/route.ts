import { readFile } from "node:fs/promises";
import path from "node:path";

import { devToolsEnabled, frameRoots, isSafeName, parseFrameRoot } from "../../../../dirs";

export const dynamic = "force-dynamic";

/** Serves one frame PNG (or the manifest) from a reference or capture folder. Dev only. */
export const GET = async (_request: Request, context: { params: Promise<{ root: string; name: string; file: string }> }) => {
  if (!devToolsEnabled()) return new Response("Not found", { status: 404 });
  const { root, name, file } = await context.params;
  const which = parseFrameRoot(root);
  const isFrame = /^\d{4}\.png$/.test(file);
  if (!which || !isSafeName(name) || !(isFrame || file === "manifest.json")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const body = await readFile(path.join(frameRoots()[which], name, file));
    return new Response(body, {
      headers: {
        "content-type": isFrame ? "image/png" : "application/json",
        // Captures get rewritten in place, so never cache them.
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};
