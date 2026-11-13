import { type CSSProperties, Fragment } from "react";

import { cn } from "@/components/site/cn";

import { CopyButton } from "./copy-button";
import { ScrollFade } from "./scroll-fade";

interface CommandProps {
  /** The shell command, shown and copied as is. Required. */
  command: string;
  /**
   * What has to stay on one line. "word" (the default) keeps every word and URL whole, so the font
   * shrinks until the longest one fits; "line" shrinks it until the whole command fits on one line,
   * for a field that holds one short command. Past the smallest size it wraps between words, and a
   * word still wider than the field scrolls it sideways.
   */
  fit?: "word" | "line";
  /** Extra classes on the field. Defaults to none. */
  className?: string;
}

/** Joins the parts of a chained command; a new part starts a line. */
const CHAIN = " && ";

/** The font size the command is set in when it fits, and the smallest it shrinks to (px). */
const FONT = { max: 13, min: 11 } as const satisfies Record<string, number>;

/**
 * Advance of one character in em: Geist Mono's is 0.6, and the fallbacks' are within a hair of it.
 * A little over, so a line that fits by the sum also fits once the glyphs are laid out.
 */
const ADVANCE = 0.612;

/**
 * The font size for `chars` characters to fill the field's width at most, between the two
 * bounds (`min` defaults to `FONT.min`). `cqw` is the field's own width, so it holds at any size
 * the field takes.
 */
export const fitSize = (chars: number, min: number = FONT.min) => `max(${min}px, min(${FONT.max}px, calc(100cqw / ${(Math.max(1, chars) * ADVANCE).toFixed(3)})))`;

/**
 * One word of the command, never broken inside: "shadcn@latest" and a whole registry URL each stay on
 * one line, so a line only ever breaks between arguments. A URL wider than the field at the smallest
 * size scrolls the field sideways (`ScrollFade`) rather than leaving "upload-activity.json" alone on a
 * line after "/r/" (council 24).
 */
const Word = ({ word }: { word: string }) => <span className="whitespace-nowrap">{word}</span>;

/** One part of a chained command, its words wrapping between each other. */
const Part = ({ part }: { part: string }) => (
  <>
    {part.split(" ").map((word, index) => (
      <Fragment key={`${index}-${word}`}>
        {index > 0 ? " " : null}
        <Word word={word} />
      </Fragment>
    ))}
  </>
);

/** The longest run of `command` that has to stay on one line for `fit`. */
export const fitLength = (command: string, fit: "word" | "line") =>
  fit === "line" ? command.length : Math.max(...command.split(/\s+/).map((word) => word.length));

/**
 * The words of a command, set to wrap between words and never inside one: a chained command
 * (`a && b`) puts each part on its own line. Selected and pasted, the text still runs in a shell.
 */
export const CommandText = ({ command }: { command: string }) => {
  const parts = command.split(CHAIN);
  return parts.map((part, index) => (
    // "&&" ends the line it joins, so the text selected and pasted from the field still runs in a shell.
    <span key={`${index}-${part}`} className={parts.length > 1 ? "block" : undefined}>
      <Part part={part} />
      {index < parts.length - 1 ? <span className="whitespace-nowrap">{" &&"}</span> : null}
    </span>
  ));
};

/**
 * A shell command in a quiet field with a copy button. The font shrinks a
 * little so a URL (or, with `fit="line"`, the whole command) fits on one line,
 * a narrow field wraps between words, and a chained command (`a && b`) puts
 * each part on its own line, so it breaks between parts before it breaks
 * inside one. A URL too wide even then scrolls the field, faded at its edge.
 */
export const Command = ({ command, fit = "word", className }: CommandProps) => {
  const size: CSSProperties = { fontSize: fitSize(fitLength(command, fit)) };
  return (
    <div data-copy-root className={cn("flex min-w-0 items-center gap-1 rounded-[18px] bg-site-fill py-1 pr-1 pl-5", className)}>
      {/*
       * The field's width, for the font size above: the code fits the space beside the copy button. It
       * scrolls sideways when a URL is still wider; the padding, taken back by the margin, keeps the
       * code's focus ring inside the scroll box's clip.
       */}
      <ScrollFade className="-m-1.5 min-w-0 flex-1 p-1.5 [container-type:inline-size] [scrollbar-width:none]">
        <code
          data-copy-text
          tabIndex={0}
          aria-label={`Command: ${command}`}
          className="block py-2 text-left font-mono leading-[1.6] break-normal text-site-ink focus-visible:outline-offset-4"
          style={size}
        >
          <CommandText command={command} />
        </code>
      </ScrollFade>
      <CopyButton value={command} label="Copy command" failHint="Selected: press ⌘C or Ctrl+C" />
    </div>
  );
};
