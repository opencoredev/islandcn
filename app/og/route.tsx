import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { BRAND_COLORS } from "@/components/brand";
import { SITE } from "@/constants/site";

/*
 * Open Graph card for docs and site pages, in the brand's template
 * (docs/brand.md): ink ground, the lockup (paper pill, deep lagoon dot, Geist
 * wordmark), the page title, and the island-state ramp in lagoon along the
 * bottom edge. The home page uses it too, with the launch line.
 */

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_TITLE = 70;
const MAX_DESCRIPTION = 150;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const lockupDataUrl = async () => {
  const file = await readFile(path.join(process.cwd(), "public", "brand", "lockup-dark.png"));
  return `data:image/png;base64,${file.toString("base64")}`;
};

/**
 * Geist, the brand's OG face (docs/brand.md). Satori reads TTF, not WOFF2. The two weights are copied
 * from the `geist` package (OFL, see fonts/OFL.txt) because pnpm's `node_modules/geist` symlink does
 * not exist inside a deployed function; next.config.mjs traces this folder in.
 */
const geist = async (file: string) => readFile(path.join(process.cwd(), "app", "og", "fonts", file));

const { lagoon, ink, paper } = BRAND_COLORS;

/** The island's states, left to right: idle, compact, the split, expanded. Same ramp as og.png. */
const Ramp = () => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
    <div style={{ width: 140, height: 40, borderRadius: 20, background: lagoon }} />
    <div style={{ width: 222, height: 40, borderRadius: 20, background: lagoon, display: "flex", alignItems: "center", padding: "0 14px", justifyContent: "space-between" }}>
      <div style={{ width: 18, height: 18, borderRadius: 9, background: ink }} />
      <div style={{ width: 40, height: 10, borderRadius: 5, background: ink }} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 176, height: 40, borderRadius: 20, background: lagoon }} />
      <div style={{ width: 40, height: 40, borderRadius: 20, background: lagoon }} />
    </div>
    <div style={{ width: 334, height: 116, borderRadius: 40, background: lagoon, display: "flex", padding: "26px 28px", gap: 18 }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: ink }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
        <div style={{ width: 134, height: 9, borderRadius: 5, background: ink }} />
        <div style={{ width: 86, height: 9, borderRadius: 5, background: ink }} />
      </div>
    </div>
  </div>
);

export const GET = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const title = clip(params.get("title")?.trim() || SITE.headline, MAX_TITLE);
  const description = clip(params.get("description")?.trim() || SITE.tagline, MAX_DESCRIPTION);
  const [lockup, regular, semibold] = await Promise.all([lockupDataUrl(), geist("Geist-Regular.ttf"), geist("Geist-SemiBold.ttf")]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: ink,
        color: paper,
        fontFamily: "Geist",
        padding: "64px 80px 0",
        overflow: "hidden",
      }}
    >
      {/* lockup-dark.png is 1120 by 310 with a pill's height of clear space built in, so it is pulled out by that much. */}
      <img src={lockup} width={240} height={66} alt="" style={{ margin: "-16px 0 0 -16px" }} />
      <div
        style={{
          marginTop: 44,
          fontSize: title.length > 34 ? 60 : 76,
          fontWeight: 600,
          letterSpacing: "-0.035em",
          lineHeight: 1.04,
          maxWidth: 1000,
          // Balanced lines, so a long title never leaves one word on the second.
          textWrap: "balance",
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 22, fontSize: 28, lineHeight: 1.4, color: "rgba(250, 250, 250, 0.62)", maxWidth: 1040, textWrap: "balance" }}>{description}</div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", paddingBottom: 56 }}>
        <Ramp />
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      // A card only changes when its query or a deploy changes, so shared caches may keep it a day.
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
};
