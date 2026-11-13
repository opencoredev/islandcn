import { isMarkdownPreferred } from "fumadocs-core/negotiation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { MARKDOWN_PAGES, ROUTES } from "./constants/routes";

/*
 * Markdown negotiation. Every page has a Markdown twin under /md:
 * - `/docs/installation.md`, or `/docs/installation` with `Accept: text/markdown`,
 *   is served from `/md/docs/installation`.
 * - `/index.md` or `/` with `Accept: text/markdown` is served from `/md/index`;
 *   `/gallery` and `/playground` work the same way.
 * Everything else passes through untouched.
 */

const twinFor = (pathname: string, wantsMarkdown: boolean): string | undefined => {
  const isSuffix = pathname.endsWith(".md");
  if (!isSuffix && !wantsMarkdown) return undefined;
  const path = isSuffix ? pathname.slice(0, -".md".length) : pathname;

  if (path === "" || path === "/" || path === "/index") return `${ROUTES.MARKDOWN}/index`;
  if (path === ROUTES.DOCS || path.startsWith(`${ROUTES.DOCS}/`)) return `${ROUTES.MARKDOWN}${path}`;
  const page = path.slice(1);
  if (MARKDOWN_PAGES.some((name) => name === page)) return `${ROUTES.MARKDOWN}/${page}`;
  return undefined;
};

/**
 * Both answers depend on Accept, so both say so: Next replaces the Vary that next.config.mjs sets on
 * pages with its own router fields, and a cache that doesn't key on Accept could hand Markdown to a
 * browser or HTML to an agent.
 */
const varyOnAccept = (response: NextResponse) => {
  response.headers.append("Vary", "Accept");
  return response;
};

export const proxy = (request: NextRequest) => {
  const read = request.method === "GET" || request.method === "HEAD";
  const twin = read ? twinFor(request.nextUrl.pathname, isMarkdownPreferred(request)) : undefined;
  if (!twin) return varyOnAccept(NextResponse.next());
  const url = request.nextUrl.clone();
  url.pathname = twin;
  return varyOnAccept(NextResponse.rewrite(url));
};

export const config = {
  // Pages only: skip Next internals, the API, registry files and other machine routes.
  matcher: ["/((?!_next/|api/|r/|md/|og|\\.well-known/|llms|favicon|sitemap\\.xml|robots\\.txt).*)"],
};
