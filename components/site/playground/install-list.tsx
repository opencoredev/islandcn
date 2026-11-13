import { CommandText, fitLength, fitSize } from "../command";
import { cn } from "../cn";
import { CopyButton } from "../copy-button";
import { ScrollFade } from "../scroll-fade";

interface InstallListProps {
  /** The full command, shown and copied as is. Required. */
  install: string;
  /** Registry item names in the command, without `.json`. Required. */
  items: readonly string[];
  /** npm packages the command installs after the registry items. Required (may be empty). */
  packages: readonly string[];
  /** Extra classes on the box. Defaults to none. */
  className?: string;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The box's header: what the command installs, so a long command can be read at a glance. */
export const installSummary = (items: readonly string[], packages: readonly string[]) =>
  [count(items.length, "registry item", "registry items"), packages.length > 0 ? count(packages.length, "npm package", "npm packages") : null]
    .filter((part) => part !== null)
    .join(", then ");

/** Characters a wrapped line sits in from the command's first column, so it reads as the same command. */
const HANG = 2;

/**
 * The smallest the command's font goes (px). A little under the field's 11: a hung URL needs its
 * own 47 to 50 characters plus the hang on a 390 px phone, and at 11 px it broke after "/r/".
 */
const MIN_FONT = 10;

/*
 * The install command for the playground's build and the gallery's preset, written out in full:
 * what shows is exactly what the copy button copies, so it can be read, checked and typed. It
 * wraps between words, never inside a URL (the font shrinks a little until the longest one fits,
 * and past that the box scrolls sideways), so on a phone each item's URL takes one line under the
 * runner, and a wrapped line hangs in from the first. The copy button sits in the box's header, not
 * beside the text: it gives the command the box's whole width, which is what keeps every URL on one
 * line on a 390 px screen.
 */
export const InstallList = ({ install, items, packages, className }: InstallListProps) => (
  <div data-copy-root className={cn("flex min-w-0 flex-col rounded-[18px] bg-site-fill text-left", className)}>
    <div className="flex h-11 min-w-0 items-center justify-between gap-2 pr-1 pl-4">
      <span className="min-w-0 truncate font-mono text-[12px] text-site-muted">{installSummary(items, packages)}</span>
      <CopyButton value={install} label="Copy command" failHint="Selected: press ⌘C or Ctrl+C" />
    </div>
    {/*
     * The code's own width, for the font size: the longest URL fits it where it can. Where it can't (a
     * 360 px phone), the URL stays whole and the box scrolls sideways, faded at its edge. The padding
     * keeps the code's focus ring inside the scroll box's clip.
     */}
    <ScrollFade className="mx-2.5 -mt-1.5 mb-2.5 min-w-0 p-1.5 [container-type:inline-size] [scrollbar-width:none]">
      <code
        data-copy-text
        tabIndex={0}
        aria-label={`Command: ${install}`}
        className="block text-left font-mono leading-[1.6] break-normal text-site-ink focus-visible:outline-offset-4"
        style={{ fontSize: fitSize(fitLength(install, "word") + HANG, MIN_FONT), paddingLeft: `${HANG}ch`, textIndent: `-${HANG}ch` }}
      >
        <CommandText command={install} />
      </code>
    </ScrollFade>
  </div>
);
