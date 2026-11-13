"use client";

import { usePathname } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { cn } from "@/components/site/cn";
import { SiteLink } from "@/components/site/site-link";

export const NAV_ITEMS = [
  { href: ROUTES.PLAYGROUND, label: "Playground" },
  { href: ROUTES.DOCS, label: "Docs" },
  { href: SITE.repo, label: "GitHub" },
] as const;

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export const NavLinks = () => {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <SiteLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-[8px] px-3 py-2 text-[14px] transition-colors duration-150",
              active ? "text-site-ink" : "text-site-muted hover:text-site-ink",
            )}
          >
            {item.label}
          </SiteLink>
        );
      })}
    </nav>
  );
};
