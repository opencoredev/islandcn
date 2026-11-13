import { existsSync, readFileSync } from "node:fs";

/**
 * Blume lists moved docs pages in docs/dist/blume-redirects.json, but its _redirects file is for
 * static hosts and Next never reads it, so old URLs answered 200 with a meta refresh. Turning the
 * list into real redirects keeps old links and search results pointing at the new pages. The file
 * exists after `pnpm docs:build`, which `pnpm build` runs first; plain `next dev` skips it.
 */
const blumeRedirects = () => {
  const file = new URL("./docs/dist/blume-redirects.json", import.meta.url);
  if (!existsSync(file)) return [];
  /** @type {{ from: string, to: string, status: number }[]} */
  const list = JSON.parse(readFileSync(file, "utf8"));
  return list.map(({ from, to, status }) => ({ source: from, destination: to, permanent: status === 301 || status === 308 }));
};

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // The dev tools read the reference recordings and web captures with computed paths, so file
  // tracing would pack both folders into every server function. They are local-only and gitignored
  // (and the recordings must never ship), and the dev tools are off in production anyway. Local
  // env files can hold tokens and are never read at runtime.
  outputFileTracingExcludes: { "*": ["captures/**", "reference/**", "**/.env*"] },
  // The OG route reads its fonts, their licence and the lockup with fs at run time, which tracing cannot see.
  outputFileTracingIncludes: { "/og": ["./app/og/fonts/*", "./public/brand/lockup-dark.png"] },
  // The gallery merged into the playground. A redirect keeps the query, so old `?b=` share links still open their build.
  redirects: async () => [{ source: "/gallery", destination: "/playground", permanent: true }, ...blumeRedirects()],
  // Pages answer in HTML or Markdown depending on Accept (see proxy.ts), so caches must key on it.
  headers: async () => [
    { source: "/((?!_next/|r/|og|api/|\\.well-known/).*)", headers: [{ key: "Vary", value: "Accept" }] },
    // Blume's built assets have content hashes in their names, so they never change in place.
    { source: "/docs/_astro/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
  ],
  // --- Docs (Blume) rewrites ---
  // scripts/build-docs.ts copies the Blume build into public/docs/, one folder per page.
  // A page URL serves that folder's index.html; asset and .md files match before these run.
  rewrites: async () => ({
    beforeFiles: [],
    afterFiles: [
      { source: "/docs", destination: "/docs/index.html" },
      { source: "/docs/:path+", destination: "/docs/:path+/index.html" },
    ],
    fallback: [],
  }),
  // --- end Docs (Blume) rewrites ---
};

export default config;
