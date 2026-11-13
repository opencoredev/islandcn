# islandcn brand

The mark, wordmark, colours and files for islandcn, and the rules for using them. The data behind every file lives in `components/brand/brand.ts`; the scripts in `scripts/brand/` regenerate the files from it.

## Direction brief

1. **Reference:** the island in its split state, the one moment when it becomes two shapes; and the sibling launches dithercn and asciicn, for their black ground, single accent and lowercase mono wordmark.
2. **Palette:** ink `#000000` for the island and dark grounds, paper `#fafafa` for light grounds and text on ink, lagoon `#46f0c6` as the one accent on ink, lagoon deep `#047b62` for the accent on paper.
3. **Type:** DM Mono Medium for the wordmark, outlined to paths. It is a mono like the siblings' JetBrains Mono, but its round tittles and curved `l` foot echo the capsule. Geist SemiBold for the OG headline, also outlined.
4. **Layout idea:** every surface shows the technique itself. The OG and hero run island shapes along the bottom edge the way dithercn runs a dither ramp and asciicn a glyph ramp.
5. **Signature element:** the split. A pill and a detached bubble, which is what the island does when two activities run.
6. **Avoiding:** toggle-switch shapes, phone outlines, anything that reads as an Apple mark, gradient blobs, pastel teal backgrounds, and pixel art borrowed from the siblings.

## The family, and where islandcn differs

| | dithercn | asciicn | islandcn |
| --- | --- | --- | --- |
| Ground | black | black | black |
| Accent | indigo `#3341e0` / `#9aa3ff` | amber `#fcb442` (oklch 0.82 0.15 75) | lagoon `#46f0c6` (oklch 0.86 0.15 172) |
| Mark | a 4x4 dither pattern | `>_` drawn as a 6x6 pixel glyph | the island split into a pill and a bubble |
| Wordmark | lowercase mono | lowercase mono | lowercase mono (DM Mono, outlined) |
| OG | lockup, headline, dither ramp along the bottom | lockup, headline, glyph ramp along the bottom | lockup, headline, island-state ramp along the bottom |

The family shares four things: a black ground, one saturated accent, a lowercase "xxxcn" mono wordmark, and a mark that is the technique itself. islandcn keeps all four. Its accent sits between the siblings' hues (75 and 270) at the same lightness and chroma as asciicn's amber. Its mark is the one smooth, non-pixel mark in the family, because its technique is a smooth shape that morphs, not a grid.

## The mark: B. Split

The pill is a 20x12 capsule; the bubble is a circle of diameter 10, 2 units to its right, on a 32-unit grid (`MARK` in `components/brand/brand.ts`). It says what islandcn does: one island becoming two activities. Nothing else in the tab strip looks like it.

Below 24 px wide, use the favicon cut (`FAVICON_MARK`): an 18x12 pill and a diameter-8 bubble in a 32-unit square. At 16 px that gives a whole-pixel gap and a pixel of padding at each side, where the full mark's bubble lands on half pixels and blurs. `<Logo small />` draws it.

### How it was picked

Five concepts went to an independent GPT-6.1 Sol judge as comparison sheets (in `scripts/brand/sheets/`: one per concept plus `overview.png`). Each sheet shows the mark at 512, 64, 32 and 16 px on light and dark, two lockups, and a tab strip next to the dithercn and asciicn favicons at actual size and at 8x.

| Rank | Concept | Judge's main reason |
| --- | --- | --- |
| 1 | B. Split | "At 16 px, both tab strips retain a recognizable capsule and detached bubble." No track around it, so no toggle reading. |
| 2 | A. Live pill | Reads well at 16 px, but "the large circular detail inside a rounded track creates a toggle/control association." Not shippable unchanged. |
| 3 | C. Tittle | A legible "i", but the lockup reads "i islandcn" and the product's technique becomes secondary. |
| 4 | D. Horizon | At 16 px the reflection "becomes a triangular spray beneath a bar. I read a showerhead." |
| 5 | E. Pinch | "At 16 px, the neck survives as a waist, producing a bone or peanut silhouette." |

The judge's verdict on the winner:

> Pick B, Split. It depicts a distinctive product state with two solid shapes that remain separate at 16 px. It best satisfies "the mark IS the technique."

It recommended these fixes, all applied:

- Keep the main geometry. "No neck, internal details or outline needed."
- A dedicated 16 px favicon drawing: capsule `x=2, y=10, w=18, h=12`, bubble `cx=26, cy=16, r=4`, proofed against the old raster first. The proof showed a crisper bubble and a clean 1 px gap.
- Keep the lockup spacing and vertical alignment from the sheets.
- Centre the pair in the safe area for app icons and the OG card; never enlarge the bubble alone or stretch the mark.
- Lagoon for both shapes on dark, `#047b62` for the bubble on light, and a transparent gap in every export.

It saw no reason to change the lagoon accent or DM Mono.

## Colour

| Token | Hex | OKLCH | Role |
| --- | --- | --- | --- |
| `ink` | `#000000` | 0 0 0 | The island on light grounds. Every dark ground. |
| `paper` | `#fafafa` | 0.985 0 0 | Light ground. Text on ink. |
| `lagoon` | `#46f0c6` | 0.86 0.15 172 | The mark on ink, and the one accent on dark surfaces. |
| `lagoonDeep` | `#047b62` | 0.52 0.10 172 | The accent on light grounds: the bubble, accent text. |

Measured contrast (WCAG 2): lagoon on ink 14.54:1, paper on ink 20.12:1, lagoon deep on paper 5.01:1, lagoon on a dark browser tab (`#35363a`) 8.36:1. Lagoon on paper is 1.38:1, so never set lagoon on a light ground; use lagoon deep.

The rule behind the colourways: black is the island. On a light ground the island stays black. On a black ground it would vanish, so it takes the lagoon accent, the way the siblings draw their marks in their accent on black.

## Type

- **Wordmark:** DM Mono Medium, tracked -20/1000 em, outlined to paths by `scripts/brand/outline-wordmark.ts`. No font file ships. DM Mono is under the SIL Open Font License 1.1, which states the license "does not apply to any document created using the fonts", so outlined artwork is allowed. Shortlist: JetBrains Mono (the siblings' face, too close to them), Geist Mono (square tittles, colder), DM Mono (chosen).
- **OG headline:** Geist SemiBold (SIL OFL 1.1), tracked -0.035 em, outlined by `scripts/brand/build-assets.ts`.
- **Site text** follows AGENTS.md: `-apple-system, BlinkMacSystemFont`, then Inter or Geist. Never SF Pro, never SF Rounded.

## Clear space and minimum size

- **Clear space:** one bubble diameter on every side of the lockup or mark, measured at the size you use it. `lockup.png` is exported with exactly that margin.
- **Minimum size:** the full mark at 24 px wide; below that, the favicon cut (`<Logo small />`, `app/icon.svg`). The lockup at 80 px wide, which puts the wordmark at about 12 px.
- **Lockup:** the mark is 0.6 em tall (just over DM Mono's 0.5 em x-height), centred on the word's box, with a 0.3 em gap before the `i`. Use the `Lockup` component or `lockup.svg` rather than placing the parts by hand.

## Do and don't

Do:

- Use the black island on paper and the lagoon island on ink.
- Keep the gap between pill and bubble visible in every export.
- Put the app icon's black island on a lagoon tile, centred in the middle 62%.

Don't:

- Draw a dot inside the pill. That turns it into a toggle switch.
- Put the island at the top of a rounded rectangle or a phone outline, or pair it with Apple names or glyphs. Copy says "Dynamic Island-style" at most.
- Stretch the mark, enlarge the bubble alone, join the two shapes, or add outlines, glows or gradients.
- Set the lagoon accent on a light ground, or recolour the wordmark lagoon on paper.
- Use the full mark below 24 px wide.

## Using it in code

```tsx
import { Lockup, Logo, Wordmark } from "@/components/brand";

<Lockup tone="on-dark" />;        // header on ink: sized by font-size, 1em = wordmark size
<Logo tone="on-light" label="islandcn" />; // mark only, 1em tall
<Logo small />;                   // favicon cut for sizes under 24 px, currentColor
<Wordmark />;                     // wordmark only, currentColor
```

`tone` is `"on-light"`, `"on-dark"` or `"current"` (the default, which uses `currentColor`). Without a `label`, `Logo` is decorative and hidden from assistive tech; `Wordmark` and `Lockup` default to the label "islandcn". The components import only React and their own files.

## Files

| File | What |
| --- | --- |
| `public/brand/mark.svg`, `mark-dark.svg`, `mark-mono.svg` | The mark on light, on dark, and in solid black |
| `public/brand/wordmark.svg`, `wordmark-dark.svg` | The outlined wordmark in ink and in paper |
| `public/brand/lockup.svg`, `lockup-dark.svg` | Mark and wordmark together |
| `public/brand/lockup.png`, `lockup-dark.png` | 1120 px wide lockups with clear space, for places that can't take SVG |
| `public/brand/og.png`, `og.svg` | 1200x630 OG card: lockup, launch line, state ramp |
| `public/brand/hero-archipelago.svg`, `.webp`, `@2x.webp` | Hero background band: rows of pills and bubbles that thicken toward the bottom edge. Transparent, for an ink ground. 1440x320 |
| `public/brand/app-icon.svg`, `icon-512.png` | App icon: black island on a lagoon tile |
| `app/icon.svg` | Favicon cut, switches colourway with `prefers-color-scheme` |
| `app/favicon.ico` | 16 and 32 px PNG-in-ICO fallback, light colourway |
| `app/apple-icon.png` | 180x180 app icon |
| `components/brand/` | `brand.ts` (data), `logo.tsx` (`Logo`, `Wordmark`, `Lockup`), `wordmark-data.ts` (generated paths) |
| `scripts/brand/sheets/` | Concept sheets, the overview the judge saw, and `final.png`, the proof sheet for the shipped files |

## Regenerating

```bash
# Wordmark paths, after a change to tracking or font
pnpm tsx scripts/brand/outline-wordmark.ts /path/to/DMMono-Medium.ttf
# Every shipped file
pnpm tsx scripts/brand/build-assets.ts /path/to/Geist-SemiBold.ttf
# Sheets (headless Chrome via agent-browser); sibling favicons are read, never copied
BRAND_SIBLINGS="dithercn=/path/favicon.svg,asciicn=/path/favicon.svg" pnpm tsx scripts/brand/render-sheets.ts
BRAND_SIBLINGS="..." pnpm tsx scripts/brand/render-final.ts
```

DM Mono comes from `github.com/google/fonts/tree/main/ofl/dmmono` and Geist from `github.com/vercel/geist-font`.
