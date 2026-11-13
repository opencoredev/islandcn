"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

import { presetBySlug } from "@/constants/presets";
import { ROUTES } from "@/constants/routes";
import { shadcnAdd } from "@/constants/site";

import { cn } from "../cn";
import { Command } from "../command";
import { CopyButton } from "../copy-button";
import { FILE_NAME, type GeneratedCode } from "./codegen";
import { InstallList } from "./install-list";
import type { StarterKey } from "./model";
import { SiteLink } from "@/components/site/site-link";

/** Spaces a wrapped line's continuation sits in from the line's own indent. */
const HANG = 2;

/**
 * A quoted string, a run of spaces, or a run of anything else: the pieces a line may wrap between.
 * A template literal holds code (`${...}`), so it wraps at its own spaces like the code around it.
 */
const PIECE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\s+|[^\s"']+|["']/g;

/**
 * Inside a run with no spaces, the one token edge a wrap may also use: after a tag's closing `>`
 * when a child follows, as in `style={tabularFigures}>{...}`. JSX chains like that run past a
 * phone's width with no space to break at.
 */
const RUN_BREAK = /(?<=>)(?=[^,;)\]}>\s])/;

/**
 * A line in pieces that never break inside: a wrap falls only at a space or at a token edge in a
 * long run, so a module path, a name or a string never splits mid-word (`island-` / `layout`). A
 * piece wider than the card scrolls the code sideways instead.
 */
const Pieces = ({ line }: { line: string }) =>
  (line.match(PIECE) ?? []).flatMap((piece, index): ReactNode[] => {
    if (piece.trim() === "") return [piece];
    const parts = piece.startsWith('"') || piece.startsWith("'") ? [piece] : piece.split(RUN_BREAK);
    // Keyed by position: the pieces are the line's, in order. A <wbr> between two parts is a break
    // opportunity the parts' own no-wrap can't cancel, and adds no text to a copy.
    return parts.flatMap((part, at) => [
      ...(at === 0 ? [] : [<wbr key={`${index}-${at}-b`} />]),
      <span key={`${index}-${at}`} className="whitespace-pre">
        {part}
      </span>,
    ]);
  });

/** The code area's height while it shows part of the file (px). */
const PART_HEIGHT = 560;
/**
 * The band at the foot that holds the "Show all" button while part shows (px): the 32 px button and
 * the 16 px under it. No code shows there, so nothing reads beside the button or behind it.
 */
const PART_BUTTON_BAND = 48;
/** How tall the fade above that band is (px): about two and a half 21 px lines, ending fully faded at the button's top. */
const PART_FADE = 56;

/**
 * The fade's opacity at fractions of its height, from the band's top up. Eased, with the lowest
 * 18 px clear: on a straight ramp the line just over the button kept a quarter of its strength
 * and still read beside it (council 25). Now that line's letters are gone, and the fade shows in
 * the line over it.
 */
const PART_FADE_STOPS = [
  [0, 0],
  [0.32, 0],
  [0.45, 0.12],
  [0.62, 0.4],
  [0.82, 0.78],
  [1, 1],
] as const satisfies readonly (readonly [at: number, alpha: number])[];

/** The part view's mask: code down to the fade, the fade, then nothing over the button's band. */
const PART_MASK = `linear-gradient(to top, transparent ${PART_BUTTON_BAND}px, ${PART_FADE_STOPS.map(
  ([at, alpha]) => `rgb(0 0 0 / ${alpha}) ${PART_BUTTON_BAND + at * PART_FADE}px`,
).join(", ")}, #000 100%)`;

/**
 * The generated file, wrapped to the card's width instead of running past its edge: a long line
 * continues under itself, `HANG` characters in from its own indent, so a wrapped line never reads as
 * the next statement. Each line is its own block, so selecting and copying it gives the file's lines.
 *
 * A file taller than `PART_HEIGHT` shows its top, fading out fully above a "Show all N lines"
 * button at the foot (half-faded lines on either side of it read as fragments, council 24), and
 * opens to its full length on a press. It used to scroll inside a fixed box, and with the Mac's
 * scrollbars hidden at rest the file looked as if it ended at the provider, with the hooks out of
 * sight (council 21). Showing less again keeps the button where it was on screen, so the reader isn't
 * thrown a whole file's height up the page.
 */
const CodeLines = ({ code }: { code: string }) => {
  const area = useRef<HTMLPreElement | null>(null);
  const toggle = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  // Where the button sat on screen when "Show less" was pressed, to put it back there.
  const heldAt = useRef<number | null>(null);
  const lineCount = code.split("\n").length;

  useLayoutEffect(() => {
    const element = area.current;
    const inner = element?.firstElementChild;
    if (!element || !inner) return;
    const measure = () => setLong(inner.getBoundingClientRect().height > PART_HEIGHT);
    measure();
    const sizes = new ResizeObserver(measure);
    sizes.observe(inner);
    return () => sizes.disconnect();
  }, []);

  useLayoutEffect(() => {
    const was = heldAt.current;
    const button = toggle.current;
    heldAt.current = null;
    if (was === null || !button) return;
    window.scrollBy({ top: button.getBoundingClientRect().top - was, behavior: "instant" });
  }, [open]);

  const part = long && !open;
  const flip = () => {
    if (open) heldAt.current = toggle.current?.getBoundingClientRect().top ?? null;
    setOpen(!open);
  };
  return (
    <div className="relative">
      <pre
        ref={area}
        className="overflow-x-auto px-4 pb-5 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap text-site-ink"
        style={part ? { maxHeight: PART_HEIGHT, overflowY: "hidden", maskImage: PART_MASK } : undefined}
      >
        <code data-copy-text className="block">
          {code.split("\n").map((line, index) => {
            const indent = line.length - line.trimStart().length + HANG;
            return (
              // Keyed by position: the lines are the file's, in order, and only their text changes.
              // An empty line holds a break, so it keeps its height and a selection copies it as a blank line.
              <span key={index} className="block" style={{ paddingLeft: `${indent}ch`, textIndent: `-${indent}ch` }}>
                {line === "" ? <br /> : <Pieces line={line} />}
              </span>
            );
          })}
        </code>
      </pre>
      {long ? (
        <div className={cn("flex justify-center px-4 pb-4", part && "absolute inset-x-0 bottom-0")}>
          <button
            ref={toggle}
            type="button"
            aria-expanded={open}
            onClick={flip}
            className="inline-flex h-8 cursor-pointer items-center rounded-full bg-site-raised px-3.5 text-[13px] font-medium text-site-ink shadow-[0_0_0_0.5px_rgb(0_0_0/0.12),0_1px_3px_rgb(0_0_0/0.08)] outline-offset-2 transition-[scale] duration-150 ease-out active:scale-[0.97] dark:shadow-[0_0_0_1px_var(--site-line)]"
          >
            {open ? "Show less" : `Show all ${lineCount} lines`}
          </button>
        </div>
      ) : null}
    </div>
  );
};

/*
 * What you take home: the install command for exactly the parts the build
 * uses, and one file with the provider, a hook per activity and an example.
 */
interface CodePanelProps {
  /** The file the build generates, shown once the reader has customized it. Required. */
  generated: GeneratedCode;
  /** The build's starting point. Required. */
  from: StarterKey;
  /** The registry the install commands point at. Required. */
  registryUrl: string;
  /** A short snippet for the preset as it ships, shown instead of the generated file while it is untouched. Defaults to null. */
  usage?: string | null;
}

export const CodePanel = ({ generated, from, registryUrl, usage = null }: CodePanelProps) => {
  const preset = from === "blank" ? undefined : presetBySlug(from);
  // Untouched, the stage plays the preset's own component, so the code is that component's install and use.
  if (preset && usage !== null) {
    return (
      <section aria-labelledby="pg-code-title" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="pg-code-title" className="text-[17px] font-semibold tracking-[-0.01em] text-site-ink">
            Take it to your app
          </h2>
          <p className="text-[14px] text-pretty text-site-muted">
            Install this preset, then mount it inside your provider. Open Customize to change its regions and copy a file of your own.
          </p>
        </div>
        <Command command={shadcnAdd({ registryUrl, items: [preset.item] })} />
        <div data-copy-root className="overflow-hidden rounded-[18px] bg-site-fill">
          <div className="flex h-11 items-center justify-between pr-1 pl-4">
            <span className="font-mono text-[12px] text-site-muted">Usage</span>
            <CopyButton value={usage} label="Copy code" failHint="Select the code and copy it" />
          </div>
          <CodeLines key={preset.slug} code={usage} />
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="pg-code-title" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="pg-code-title" className="text-[17px] font-semibold tracking-[-0.01em] text-site-ink">
          Take it to your app
        </h2>
        <p className="text-[14px] text-pretty text-site-muted">
          Install the parts this island uses, then paste the file. <code className="font-mono text-[13px] text-site-ink">{"<AppIsland>"}</code>{" "}goes near your app&rsquo;s root;
          call the hooks from anywhere inside it.
        </p>
      </div>
      <InstallList install={generated.install} items={generated.items} packages={generated.packages} />
      <div data-copy-root className="overflow-hidden rounded-[18px] bg-site-fill">
        <div className="flex h-11 items-center justify-between pr-1 pl-4">
          <span className="font-mono text-[12px] text-site-muted">{FILE_NAME}</span>
          <CopyButton value={generated.code} label="Copy code" failHint="Select the code and copy it" />
        </div>
        <CodeLines code={generated.code} />
      </div>
      {preset ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-pretty text-site-muted">
            Started from the {preset.title.toLowerCase()} preset. The preset ships as its own component too, with its state wired up.{" "}
            <SiteLink href={`${ROUTES.DOCS}/presets/${preset.slug}`} className="font-medium text-site-ink underline decoration-site-line underline-offset-4 hover:decoration-current">
              Read its docs
            </SiteLink>
            .
          </p>
          {/* The preset's own command in the same copyable field as the one above, so it wraps between words like it. */}
          <Command command={shadcnAdd({ registryUrl, items: [preset.item] })} />
        </div>
      ) : null}
    </section>
  );
};
