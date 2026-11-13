import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { devToolsEnabled } from "@/app/api/dev/dirs";

import { PlayOne } from "../demos";
import { parseDemoName, parseMotion, parseStage, parseView } from "../names";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "islandcn play", robots: { index: false } };

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Dev-only: one preset on a 402 x 874 screen. `?view=compact|minimal|expanded` holds a state;
 * `?phase=` picks a demo state (`answered` for the call, `delivery` for the ETA, `done` for the
 * upload and the transfer, `receive` and `receive-done` for the transfer);
 * `?motion=reduced` runs the island with reduced motion; `?stage=dark` uses a black screen.
 */
const PlayOnePage = async ({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<SearchParams> }) => {
  if (!devToolsEnabled()) notFound();
  const { name: raw } = await params;
  const name = parseDemoName(raw);
  if (!name) notFound();
  const query = await searchParams;
  return (
    <PlayOne
      name={name}
      view={parseView(first(query.view))}
      phase={first(query.phase) ?? null}
      reducedMotion={parseMotion(first(query.motion))}
      theme={parseStage(first(query.stage))}
    />
  );
};

export default PlayOnePage;
