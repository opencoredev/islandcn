import { MARKDOWN_PAGES } from "@/constants/routes";
import type { MarkdownPage } from "@/constants/routes";
import { docsPageMarkdown } from "@/lib/agent-discovery/docs-markdown";
import { docsAliases, docsPageBySlug, docsPages } from "@/lib/agent-discovery/docs-source";
import { markdownNotFound, textResponse } from "@/lib/agent-discovery/responses";
import { SITE_PAGE_MARKDOWN } from "@/lib/agent-discovery/site-pages";

// Markdown twins of every page. Docs pages come from the Blume build in public/docs. proxy.ts rewrites `/x.md` and `Accept: text/markdown` here:
// `/docs/a/b` to `/md/docs/a/b`, `/` to `/md/index`, `/playground` to `/md/playground`.

export const dynamic = "force-static";

const isMarkdownPage = (value: string): value is MarkdownPage => MARKDOWN_PAGES.some((page) => page === value);

export const GET = async (_request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const [first, ...rest] = path;

  if (first === "docs") {
    const page = docsPageBySlug(rest);
    return page ? textResponse(docsPageMarkdown(page), "markdown") : markdownNotFound(`/${path.join("/")}`);
  }
  if (first && rest.length === 0 && isMarkdownPage(first)) {
    return textResponse(SITE_PAGE_MARKDOWN[first](), "markdown");
  }
  return markdownNotFound(`/${path.join("/")}`);
};

export const generateStaticParams = () => [
  ...docsPages().map((page) => ({ path: ["docs", ...page.route.split("/").filter(Boolean)] })),
  // Old docs routes, so their Markdown twins resolve to the page they moved to.
  ...[...docsAliases().keys()].map((route) => ({ path: ["docs", ...route.split("/").filter(Boolean)] })),
  ...MARKDOWN_PAGES.map((page) => ({ path: [page] })),
];
