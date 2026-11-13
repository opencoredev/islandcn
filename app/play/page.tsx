import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { devToolsEnabled } from "@/app/api/dev/dirs";

import { PlayGrid } from "./demos";
import { parseMotion, parseStage } from "./names";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "islandcn play", robots: { index: false } };

/** Dev-only: every preset running at once. `?motion=reduced` runs them all with reduced motion; `?stage=dark` on black. */
const PlayPage = async ({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => {
  if (!devToolsEnabled()) notFound();
  const { motion, stage } = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return <PlayGrid reducedMotion={parseMotion(first(motion))} theme={parseStage(first(stage))} />;
};

export default PlayPage;
