import type { Metadata } from "next";

import { Showcase } from "@/components/site/playground/showcase";
import { ogImageUrl } from "@/constants/og";
import { REGISTRY_URL } from "@/constants/site";

const DESCRIPTION =
  "Every islandcn preset, live at real size: pick one, show, expand, hold, alert and split it, customize its regions, then copy the code.";

export const metadata: Metadata = {
  title: "Playground",
  description: DESCRIPTION,
  alternates: { canonical: "/playground", types: { "text/markdown": "/playground.md" } },
  openGraph: { type: "website", url: "/playground", siteName: "islandcn", images: ogImageUrl({ title: "Playground", description: DESCRIPTION }) },
};

// The registry URL is server-only; the playground prints it in the install command.
const PlaygroundPage = () => <Showcase registryUrl={REGISTRY_URL} />;

export default PlaygroundPage;
