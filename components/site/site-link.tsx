import Link from "next/link";
import type { ComponentProps } from "react";

import { ROUTES } from "@/constants/routes";

/** Next's Link props a plain anchor can't take, left out so they can never leak onto one. */
type LinkOnlyProps = "href" | "as" | "passHref" | "legacyBehavior" | "transitionTypes" | "prefetch" | "replace" | "scroll" | "shallow" | "locale" | "onNavigate";

/** Anchor props plus Link's prefetch and scroll, with a plain string href, since every site link is a path. */
interface SiteLinkProps extends Omit<ComponentProps<typeof Link>, LinkOnlyProps> {
  /** Path to link to, with an optional query or hash. No default. */
  href: string;
  /** Next's prefetch, for non-docs links. Default: Next's own. */
  prefetch?: ComponentProps<typeof Link>["prefetch"];
  /** Next's scroll-to-top on navigation, for non-docs links. Default: true. */
  scroll?: boolean;
}

/** Classifies by path only, so `/docs?from=home#install` still counts as the docs. */
const isDocs = (href: string) => {
  const path = href.split(/[?#]/, 1)[0] ?? "";
  return path === ROUTES.DOCS || path.startsWith(`${ROUTES.DOCS}/`);
};

/**
 * A link that knows the docs are not part of the Next app. They are static Blume pages under
 * public/docs, so Next's client navigation would prefetch and request an RSC payload that 404s,
 * then fall back to a full load. A plain anchor goes there directly.
 */
export const SiteLink = ({ href, prefetch, scroll, ...rest }: SiteLinkProps) =>
  isDocs(href) ? <a href={href} {...rest} /> : <Link href={href} prefetch={prefetch} scroll={scroll} {...rest} />;
