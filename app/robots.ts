import type { MetadataRoute } from "next";

import { SITE_URL } from "@/constants/site";

const robots = (): MetadataRoute.Robots => ({
  rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
  sitemap: `${SITE_URL}/sitemap.xml`,
});

export default robots;
