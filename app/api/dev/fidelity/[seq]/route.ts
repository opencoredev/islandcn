import { readFile } from "node:fs/promises";
import path from "node:path";

import { devToolsEnabled, frameRoots, isSafeName } from "../../dirs";
import type { FidelityRow, FidelitySeries } from "../../types";

export const dynamic = "force-dynamic";

/** Parses a measure.py CSV into the rows the compare page plots. Empty cells become null. */
const parseMeasure = (text: string): FidelityRow[] => {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const names = (head ?? "").split(",");
  const index = (name: string) => names.indexOf(name);
  const columns = {
    frame: index("frame"),
    t: index("t"),
    left: index("main_left"),
    top: index("main_top"),
    width: index("main_width"),
    height: index("main_height"),
    bubbleLeft: index("bub_left"),
    bubbleWidth: index("bub_width"),
  };
  const cell = (row: string[], at: number) => {
    const value = at < 0 ? undefined : row[at];
    if (value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return lines.map((line) => {
    const row = line.split(",");
    return {
      frame: cell(row, columns.frame) ?? 0,
      t: cell(row, columns.t) ?? 0,
      left: cell(row, columns.left),
      top: cell(row, columns.top),
      width: cell(row, columns.width),
      height: cell(row, columns.height),
      bubbleLeft: cell(row, columns.bubbleLeft),
      bubbleWidth: cell(row, columns.bubbleWidth),
    };
  });
};

const readSeries = async (file: string) => {
  try {
    return parseMeasure(await readFile(file, "utf8"));
  } catch {
    return null;
  }
};

/**
 * Per-frame measure.py output for one sequence: the 60 fps reference and the web capture, from
 * captures/_fidelity/{ref,web}/<seq>.csv (scripts/fidelity/capture.sh writes them). Dev only.
 */
export const GET = async (_request: Request, context: { params: Promise<{ seq: string }> }) => {
  if (!devToolsEnabled()) return new Response("Not found", { status: 404 });
  const { seq } = await context.params;
  if (!isSafeName(seq)) return new Response("Not found", { status: 404 });
  const root = path.join(frameRoots().cap, "_fidelity");
  const body: FidelitySeries = {
    ref: await readSeries(path.join(root, "ref", `${seq}.csv`)),
    web: await readSeries(path.join(root, "web", `${seq}.csv`)),
  };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
};
