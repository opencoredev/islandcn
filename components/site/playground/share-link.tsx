"use client";

import { Copy01Icon, Link01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useEffect, useState } from "react";

import { cn } from "../cn";
import { copyText } from "../copy-button";
import { Icon } from "../icon";

/** How long "Copied" stays on the button (ms). */
const COPIED_MS = 1600;

/** How long the failure note stays: it asks the reader to do something (ms). */
const FAILED_MS = 5000;

type CopyState = "idle" | "copied" | "failed";

interface CopyActionProps {
  /** What the button copies, or null while it is being made (the button waits, disabled). Required. */
  value: string | null;
  /** The button's words, such as "Copy code". Required. */
  label: string;
  /** The glyph before the words. Required. */
  icon: IconSvgElement;
  /** "primary" fills it with ink, for the action most visitors came for. Defaults to "secondary". */
  tone?: "primary" | "secondary";
  /** Said when the browser refuses to copy. Required. */
  failHint: string;
}

/**
 * A copy action that says what it copies. The words turn to "Copied" in place, in a slot as wide
 * as the longest, so the button never changes size and its neighbour never moves.
 */
const CopyAction = ({ value, label, icon, tone = "secondary", failHint }: CopyActionProps) => {
  const [state, setState] = useState<CopyState>("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), state === "copied" ? COPIED_MS : FAILED_MS);
    return () => window.clearTimeout(timer);
  }, [state]);
  const words = [
    { key: "idle", text: label, on: state === "idle" },
    { key: "copied", text: "Copied", on: state === "copied" },
    { key: "failed", text: "Not copied", on: state === "failed" },
  ] as const;
  return (
    <button
      type="button"
      disabled={value === null}
      title={state === "failed" ? failHint : undefined}
      onClick={async () => {
        if (value === null) return;
        setState((await copyText(value)) ? "copied" : "failed");
      }}
      className={cn(
        "inline-flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[14px] font-medium outline-offset-2",
        "transition-[background-color,opacity,scale] duration-150 ease-out active:scale-[0.97] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100 motion-reduce:transition-none",
        tone === "primary" ? "bg-site-ink text-site-bg hover:opacity-90" : "bg-site-fill text-site-ink hover:bg-[color-mix(in_oklab,var(--site-fill),var(--site-ink)_6%)]",
      )}
    >
      <span aria-hidden className="relative grid size-4 flex-none place-items-center">
        <span className={cn("absolute grid place-items-center transition-[opacity,scale] duration-200 ease-out", state === "copied" ? "scale-50 opacity-0" : "opacity-100")}>
          <Icon icon={icon} size={16} strokeWidth={1.8} />
        </span>
        <span className={cn("absolute grid place-items-center transition-[opacity,scale] duration-200 ease-out", state === "copied" ? "opacity-100" : "scale-50 opacity-0")}>
          <Icon icon={Tick02Icon} size={16} strokeWidth={2} />
        </span>
      </span>
      <span className="grid min-w-0 text-left">
        {words.map((word) => (
          <span
            key={word.key}
            aria-hidden={!word.on}
            className={cn("col-start-1 row-start-1 truncate transition-opacity duration-150 ease-out motion-reduce:transition-none", word.on ? "opacity-100" : "opacity-0")}
          >
            {word.text}
          </span>
        ))}
      </span>
      <span role="status" className="sr-only">
        {state === "copied" ? "Copied" : state === "failed" ? failHint : ""}
      </span>
    </button>
  );
};

interface CopyActionsProps {
  /** The code the code panel shows for this build. Required. */
  code: string;
  /** The share link, or null while it is being made. Required. */
  shareUrl: string | null;
}

/**
 * The two things a visitor takes away: the code, and a link that opens this build again (both
 * activities, the springs and the stage). The link is several hundred characters of base64, so it
 * isn't printed; the button copies it whole.
 */
export const CopyActions = ({ code, shareUrl }: CopyActionsProps) => (
  <div className="flex min-w-0 gap-2">
    <CopyAction value={code} label="Copy code" icon={Copy01Icon} tone="primary" failHint="Copy the code from the panel under the stage" />
    <CopyAction value={shareUrl} label="Copy link" icon={Link01Icon} failHint="Copy the address from the address bar" />
  </div>
);
