import { PlayIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/components/site/cn";

import { Icon } from "./icon";

interface PlayButtonProps {
  /** Visible text. Required. */
  children: string;
  /** What pressing it does. Required. */
  onPress: () => void;
  /** Extra classes. Defaults to none. */
  className?: string;
}

/**
 * The control that stands in for scrolling when motion is reduced: it runs one
 * step in the island at the top of the window, once, when the reader asks.
 */
export const PlayButton = ({ children, onPress, className }: PlayButtonProps) => (
  <button
    type="button"
    onClick={onPress}
    className={cn(
      "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-site-fill pr-4 pl-3.5 text-[15px] font-medium text-site-ink transition-[scale] duration-150 ease-out active:scale-[0.96]",
      className,
    )}
  >
    <Icon icon={PlayIcon} size={14} strokeWidth={2} />
    {children}
  </button>
);
