"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/components/site/cn";

import { Icon } from "./icon";

interface CopyButtonProps {
  /** Text written to the clipboard. Defaults to the text of the nearest `[data-copy-text]` when the button is pressed. */
  value?: string;
  /** Accessible name. Defaults to "Copy". */
  label?: string;
  /** Shown above the button when the browser refuses to copy; the text is selected for the reader. Defaults to "Select the text and copy it". */
  failHint?: string;
  /**
   * Where "Copied" shows. "auto" puts it above the button beside a one-row field and to its left in
   * a code block's title bar (see `feedbackSideFor`). "inline" writes it in the button itself, beside
   * the check, in a slot as wide as its longest word, for a field with a heading control above and a
   * caption below, where a note floating either way covered one of them. Defaults to "auto".
   */
  feedback?: "auto" | "inline";
  /** The word an "inline" button says before it is pressed, for a button whose label is its only name on screen. Defaults to "Copy". */
  text?: string;
  /** Extra classes on the wrapper, for placement. Defaults to none. */
  className?: string;
  /** Extra classes on an "inline" button, for a control that sets its own size and surface. Defaults to none. */
  buttonClassName?: string;
}

/** "selected": the copy failed and the text is selected for the reader. "failed": it failed with no text on screen to select. */
type CopyState = "idle" | "copied" | "selected" | "failed";

// How long the check mark stays before the copy icon returns.
const COPIED_MS = 1600;
// The failure hint stays longer: it asks the reader to do something.
const FAILED_MS = 6000;

/**
 * The old copy path: put the text in a hidden textarea, select it and run the
 * copy command. Browsers still honour it from a click on plain-HTTP origins,
 * where `navigator.clipboard` doesn't exist (the Tailscale preview is one).
 */
const copyWithCommand = (text: string) => {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.setAttribute("aria-hidden", "true");
  // Fixed and transparent, so selecting it neither scrolls the page nor shows.
  area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.append(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
};

/** Writes text to the clipboard: the async API where the page may use it, else the command path. True when it worked. */
export const copyText = async (text: string) => {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Refused (permissions, focus); the command path may still work.
    }
  }
  return copyWithCommand(text);
};

/** The visible text a button belongs to: the `[data-copy-text]` inside its nearest `[data-copy-root]`. */
const sourceOf = (button: HTMLElement) => button.closest("[data-copy-root]")?.querySelector("[data-copy-text]") ?? null;

type FeedbackSide = "top" | "start";

/**
 * Where "Copied" goes so it never covers the text being copied. Beside a one-row field (a command,
 * a link) the text is to the button's left, so the note goes above. In a code block's title bar the
 * code is below and the bar is empty to the left, and the block clips anything above it, so the
 * note goes to the left.
 */
const feedbackSideFor = (button: HTMLElement): FeedbackSide => {
  const source = sourceOf(button);
  if (!source) return "top";
  const text = source.getBoundingClientRect();
  const own = button.getBoundingClientRect();
  return text.top >= own.bottom - 1 ? "start" : "top";
};

/** Selects the source text, so the reader can copy it by hand. False when there is none on screen. */
const selectSource = (button: HTMLElement) => {
  const source = sourceOf(button);
  const selection = window.getSelection();
  if (!source || !selection) return false;
  const range = document.createRange();
  range.selectNodeContents(source);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
};

export const CopyButton = ({
  value,
  label = "Copy",
  failHint = "Select the text and copy it",
  feedback = "auto",
  text = "Copy",
  className,
  buttonClassName,
}: CopyButtonProps) => {
  const [state, setState] = useState<CopyState>("idle");
  const [side, setSide] = useState<FeedbackSide>("top");
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), state === "copied" ? COPIED_MS : FAILED_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    if (button.current) setSide(feedbackSideFor(button.current));
    const text = value ?? (button.current ? sourceOf(button.current)?.textContent : null) ?? "";
    const copied = await copyText(text);
    // The command path moves focus to its textarea; hand it back.
    button.current?.focus({ preventScroll: true });
    if (copied) {
      setState("copied");
      return;
    }
    setState(button.current && selectSource(button.current) ? "selected" : "failed");
  };

  const copied = state === "copied";
  const failed = state === "selected" || state === "failed";

  // Both icons stay mounted and cross-fade, so the swap has an enter and an exit.
  const icons = (
    <>
      <span
        className={cn(
          "absolute grid place-items-center transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          copied ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0",
        )}
      >
        <Icon icon={Copy01Icon} />
      </span>
      <span
        className={cn(
          "absolute grid place-items-center text-site-ink transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          copied ? "scale-100 opacity-100 blur-0" : "scale-25 opacity-0 blur-[4px]",
        )}
      >
        <Icon icon={Tick02Icon} strokeWidth={2} />
      </span>
    </>
  );

  if (feedback === "inline") {
    // Every word the button can say sits in one grid cell, so the button is always as wide as the longest and nothing beside it moves.
    const words = [
      { key: "idle", text, on: state === "idle" },
      { key: "copied", text: "Copied", on: copied },
      { key: "selected", text: "Selected", on: state === "selected" },
      { key: "failed", text: "Not copied", on: state === "failed" },
    ] as const;
    return (
      <span className={cn("relative inline-flex shrink-0", className)}>
        {/*
         * A live region either way. When the copy failed with no text on screen to select, the hint
         * also shows under the button: on a phone a title tooltip never appears, so it would be
         * the only way to learn what to do.
         */}
        <span
          role="status"
          className={
            state === "failed"
              ? "pointer-events-none absolute top-full left-0 z-10 mt-2 rounded-[10px] bg-site-raised px-2.5 py-1 text-[12px] leading-[1.35] font-medium whitespace-nowrap text-site-ink shadow-[0_0_0_1px_var(--site-line),0_4px_12px_rgb(0_0_0/0.12)]"
              : "sr-only"
          }
        >
          {failed ? failHint : copied ? "Copied" : ""}
        </span>
        <button
          ref={button}
          type="button"
          onClick={copy}
          aria-label={label}
          title={failed ? failHint : undefined}
          className={cn(
            "relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full pr-3 pl-2.5 text-[12px] font-medium text-site-muted",
            "transition-[color,background-color] duration-150 ease-out hover:bg-site-ink/[0.06] hover:text-site-ink motion-safe:transition-[color,background-color,scale] motion-safe:active:scale-[0.96]",
            buttonClassName,
          )}
        >
          <span aria-hidden className="relative grid size-4 place-items-center">
            {icons}
          </span>
          <span aria-hidden className="grid text-left">
            {words.map((word) => (
              <span
                key={word.key}
                className={cn(
                  "col-start-1 row-start-1 transition-opacity duration-150 ease-out motion-reduce:transition-none",
                  word.on ? "opacity-100" : "opacity-0",
                  word.key === "idle" ? undefined : "text-site-ink",
                )}
              >
                {word.text}
              </span>
            ))}
          </span>
        </button>
      </span>
    );
  }

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {/*
       * The feedback never sits over the text the button copies (see `feedbackSideFor`). It is a
       * live region either way, so a screen reader hears it too.
       */}
      <span
        role="status"
        className={cn(
          side === "top" ? "right-0 bottom-full mb-1.5" : "top-1/2 right-full mr-1 -translate-y-1/2",
          "pointer-events-none absolute rounded-[10px] bg-site-raised px-2.5 py-1 text-[12px] leading-[1.35] font-medium whitespace-nowrap text-site-ink shadow-[0_0_0_1px_var(--site-line),0_4px_12px_rgb(0_0_0/0.12)]",
          "transition-opacity duration-150 ease-out motion-reduce:transition-none",
          state === "idle" ? "opacity-0" : "opacity-100",
        )}
      >
        {failed ? failHint : copied ? "Copied" : ""}
      </span>
      <button
        ref={button}
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : label}
        className={cn(
          "relative grid size-9 cursor-pointer place-items-center rounded-full text-site-muted",
          "transition-[color,background-color,scale] duration-150 ease-out hover:bg-site-ink/[0.06] hover:text-site-ink active:scale-[0.96]",
        )}
      >
        {icons}
      </button>
    </span>
  );
};
