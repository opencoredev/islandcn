"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { useTheme } from "next-themes";

import { cn } from "@/components/site/cn";

import { Icon } from "./icon";
import { useSiteTheme } from "./use-site-theme";

/** One button that flips light and dark. It shows the theme it switches to. */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const { setTheme } = useTheme();
  const theme = useSiteTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} appearance`}
      title={`Switch to ${next} appearance`}
      className={cn(
        "grid size-10 cursor-pointer place-items-center rounded-full text-site-muted transition-[color,scale] duration-150 ease-out hover:text-site-ink active:scale-[0.96]",
        className,
      )}
    >
      <Icon icon={next === "dark" ? Moon02Icon : Sun03Icon} size={17} />
    </button>
  );
};
