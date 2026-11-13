# AGENTS.md

Guide for coding agents in this repository: the islandcn site, the shadcn registry it publishes, and the island engine those items ship with. To build an island in another project, use the agent skill instead: `skills/islandcn/SKILL.md`.

In Leo's local checkout, also read `BRIEF.md` for the goal and `docs/CONTRACT.md` for who owns which paths. Neither is in the public repo, and neither is the `reference/` folder.

## Hard rules

- Every file is written for this repo. Don't copy from startercn, asciicn or any registry template.
- The license is MIT, `Copyright (c) 2026 Leo`. Nobody else goes on it.
- Copy the look and motion of Apple's island, never its assets. The product is islandcn. "Dynamic Island" may be used descriptively, as in the hero's "The open-source Dynamic Island for React", and the footer says islandcn is not affiliated with Apple. Still banned in anything a visitor reads: iOS, iPhone, SF Pro, SF Symbols and "Live Activity" as product copy. No bundled SF Pro, no SF Symbols, no Apple artwork. Fonts use the system stack (`-apple-system, BlinkMacSystemFont`) with Inter or Geist as the fallback.
- The public repo is github.com/opencoredev/islandcn. Nothing else goes out (deploy, push, public post) without Leo's OK, and `reference/`, `captures/`, `BRIEF.md`, `docs/CONTRACT.md`, `docs/launch/` and the fidelity, capture and quality scripts never go public.

## Commands

```bash
pnpm install
pnpm dev           # http://localhost:3000
pnpm typecheck     # tsc --noEmit
pnpm build
```

## Conventions

- TypeScript strict, no `any`, no non-null `!`. Arrow functions. Props are an `interface` with a JSDoc line per prop that states its default. Constant tables use `as const satisfies`.
- Comments say why, in plain words.
- The engine (`lib/island/`) imports only React and its own files. Shipped files never import site-only modules.
- Measurements live in `reference/MEASUREMENTS.md` and in one constants table in the engine. Don't scatter magic numbers.
- Docs prose is plain and specific. No em dashes, no "seamless", "powerful" or "effortless".

## Verifying a change

A build or a typecheck is not enough. Open the page in a real browser at 1440x900 and 390x844, and once with reduced motion. For motion, capture frames with `scripts/capture/` and compare them with the reference on `/compare`.
