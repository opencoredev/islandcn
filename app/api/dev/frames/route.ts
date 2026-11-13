import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { devToolsEnabled, frameRoots, isSafeName } from "../dirs";
import type { FrameListing, FrameSet } from "../types";

export const dynamic = "force-dynamic";

const readManifest = async (dir: string): Promise<{ scale: number | null; fps: number | null }> => {
  try {
    const raw: unknown = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
    if (typeof raw !== "object" || raw === null) return { scale: null, fps: null };
    const scale = "scale" in raw && typeof raw.scale === "number" ? raw.scale : null;
    const fps = "fps" in raw && typeof raw.fps === "number" ? raw.fps : null;
    return { scale, fps };
  } catch {
    return { scale: null, fps: null };
  }
};

const listRoot = async (root: string): Promise<FrameSet[]> => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const sets = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && isSafeName(entry.name))
      .map(async (entry) => {
        const dir = path.join(root, entry.name);
        const files = await readdir(dir).catch(() => []);
        const frames = files.filter((file) => /^\d{4}\.png$/.test(file)).length;
        return { name: entry.name, frames, ...(await readManifest(dir)) };
      }),
  );
  return sets.filter((set) => set.frames > 0).sort((a, b) => a.name.localeCompare(b.name));
};

/** Lists the frame folders under the reference and capture roots. Dev only. */
export const GET = async () => {
  if (!devToolsEnabled()) return new Response("Not found", { status: 404 });
  const roots = frameRoots();
  const listing: FrameListing = { ref: await listRoot(roots.ref), cap: await listRoot(roots.cap) };
  return Response.json(listing);
};
