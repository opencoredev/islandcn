import type { MetadataRoute } from "next";

import { ROUTES } from "@/constants/routes";
import { SITE_URL } from "@/constants/site";
import { docsPages } from "@/lib/agent-discovery/docs-source";

const sitemap = (): MetadataRoute.Sitemap => [
  { url: `${SITE_URL}${ROUTES.HOME}`, priority: 1 },
  { url: `${SITE_URL}${ROUTES.PLAYGROUND}`, priority: 0.9 },
  ...docsPages().map((page) => ({ url: `${SITE_URL}${page.url}`, priority: page.route === "/" ? 0.9 : 0.7 })),
];

export default sitemap;
