import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * `cn` for site components. Plain tailwind-merge doesn't know the site's type
 * scale (globals.css), so it reads `text-display` as a colour and drops it
 * when a colour class follows. This one knows the six sizes.
 */
const merge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["display", "headline", "title", "lede", "body", "caption"] }] } },
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
