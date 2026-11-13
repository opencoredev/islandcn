import { Logo } from "@/components/brand";
import { cn } from "@/components/site/cn";

/*
 * The brand in the site's chrome: the mark, then the name as live text in the
 * system font, so it reads as part of the interface, like a product name in
 * an app's title bar. The mark's colourway follows the theme: the black pill
 * with the bright dot on paper, the paper pill with the deep dot on ink. Sized
 * like text, so set font-size on the parent; the mark is 0.62 em tall.
 */
export const BrandLockup = ({ className }: { className?: string }) => (
  <span className={cn("inline-flex items-center gap-[0.4em] leading-none", className)}>
    <BrandMark className="text-[0.62em]" />
    <span className="font-semibold tracking-[-0.02em] text-site-ink">islandcn</span>
  </span>
);

export const BrandMark = ({ className }: { className?: string }) => (
  <span className={cn("inline-flex", className)}>
    <Logo tone="on-light" className="block dark:hidden" />
    <Logo tone="on-dark" className="hidden dark:block" />
  </span>
);
