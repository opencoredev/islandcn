import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { devToolsEnabled } from "@/app/api/dev/dirs";

import { CompareTool } from "./compare-tool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "islandcn compare", robots: { index: false } };

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Reference frames on the left, web captures on the right, one scrubber.
 * `?seq=expand` picks a sequence; `?left=cap:expand&right=cap:expand-soft` compares any two sets.
 */
const ComparePage = async ({ searchParams }: { searchParams: Promise<SearchParams> }) => {
  if (!devToolsEnabled()) notFound();
  const params = await searchParams;
  return <CompareTool initial={{ seq: first(params.seq) ?? null, left: first(params.left) ?? null, right: first(params.right) ?? null }} />;
};

export default ComparePage;
