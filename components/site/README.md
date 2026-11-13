# components/site

Site-only components. Nothing in the registry imports from here.

## Direction

1. **Reference:** Apple's product pages (the current phone and earbuds pages, studied at 1440 and 390): one idea per screen, the product as the only image, display type at true scale, quiet greys, scroll that drives the product. Things 3 and Linear for the tool pages: calm panels, small type, no decoration.
2. **Palette:** light `#fbfbfd` page, `#1d1d1f` ink, `#6e6e73` secondary, hairlines `rgb(0 0 0 / 0.08)`; dark `#000` page, `#f5f5f7` ink, `#86868b` secondary. Controls sit on a fill (`--site-fill`) with a raised thumb (`--site-raised`). Lagoon (`--site-accent`) lives in the mark, nowhere else; inside the island each activity brings its own accent. The island is always pure black. On the black page it draws its keyline once an activity grows it; at rest the engine draws none (the phone doesn't either), so the site puts a faint light behind the idle top island (`site-island.tsx`), and the large shot gets the same kind of light, so the idle shape reads.
3. **Type:** the system stack (SF on Apple devices), Inter as the fallback, Geist Mono for real code only. Six steps in `app/globals.css`: `text-display` (96 to 48), `text-headline` (72 to 40), `text-title` (40 to 28), `text-lede` (24 to 19, semibold, secondary with the key phrase in ink), `text-body` (17/1.47), `text-caption` (14). Use `cn` from `./cn`, which knows these names; plain tailwind-merge drops them next to a colour class.
4. **Layout idea:** the top of a phone screen, at real size, is the hero and the demo. The first screen is that screen cycling everyday activities, a headline, one sentence and the way into the playground. Below it the tour names each preset in big type beside (or under) a second screen that turns into the preset whose name is on the reading line.
5. **Signature:** the measured shot. The island drawn up to 5.5x by the same engine (every length in its metrics scaled, see `scaled-metrics.ts`), stepping through idle, compact and the split as you scroll, with the measured size, gap and spring of each state beside it.
6. **Avoiding:** numbered section labels, eyebrows, mono chip and tag rows, cards in grids, decorative patterns, grey demo boxes on the home page, terminal mocks, three-up feature rows, footer link farms, em dashes, puffery.

## Where the islands come from

| Component | What it drives |
| --- | --- |
| `SiteIsland` (`site-island.tsx`) | The page's provider and `<Island placement="viewport" />`, with the keyline following the site theme |
| `HeroStage` (`hero-stage.tsx`) | A `PhoneScreen` (`phone-screen.tsx`, its own provider): everyday presets one after another, each arriving expanded and settling to compact, the split last (drivers in `top-island.tsx`). The page's island hides while this screen is on screen (`useCoverPageIsland`). With reduced motion it holds music, expanded |
| `MeasuredShot` (`measured-shot.tsx`) | Its own large `IslandView`, scroll-driven, with the measured numbers |
| `PresetChapter` (`preset-chapter.tsx`) | The tour: a second `PhoneScreen`, sticky beside the names from lg and under the header below it, plays each preset while its name is on the reading line, then the split, then a food order no preset ships (`custom-run.tsx`). The page's island plays nothing under the hero |
| `Gallery` (`gallery.tsx`) | One stage and a picker; the stage is a demo from `examples/` |
| `PresetDemo` (`preset-demo.tsx`) | A preset's demo with its view switch, for the docs (`<PresetDemo slug="..." />`) |
| `Playground` (`playground/`) | Its own provider with `motion` overrides and reduced motion, a stage, the action row, the inspector (region map, region editor, springs) and the code panel; the build lives in `?b=`. On a phone the stage and actions pin under the header and fold into a strip while you edit (`dock.ts`) |

Scroll stories read the scroll position (`use-scroll-story.ts`), so wheel, touch, keys and scrollbar drags all drive them. Anything that reads while the island is expanded starts below `ISLAND_CLEARANCE`: the island at its tallest, plus the header below `lg`, plus 24 px. With reduced motion nothing is driven by scrolling: each step gets a play button, and the measured shot becomes a picker.

The header keeps the island's centre column free: below `lg` the nav moves into a menu so a compact island never covers it.
