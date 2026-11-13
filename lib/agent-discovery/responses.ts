const HEADERS = {
  markdown: "text/markdown; charset=utf-8",
  text: "text/plain; charset=utf-8",
} as const;

/** A text response for agents. `Vary: Accept` because the same page also answers in HTML. */
export const textResponse = (body: string, kind: keyof typeof HEADERS) =>
  new Response(body, {
    headers: {
      "Content-Type": HEADERS[kind],
      "Cache-Control": "public, max-age=3600",
      Vary: "Accept",
    },
  });

export const markdownNotFound = (what: string) =>
  new Response(`# Not found\n\nThere is no Markdown version of ${what}. See /llms.txt for every page.\n`, {
    status: 404,
    headers: { "Content-Type": HEADERS.markdown },
  });
