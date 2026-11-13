"use client";

import { Cancel01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/components/site/cn";

import { Icon } from "./icon";
import { NAV_ITEMS, isActive } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { SiteLink } from "@/components/site/site-link";

/*
 * Navigation below lg. The button sits on the trailing side of the status bar,
 * clear of a compact island; the panel opens under the header, below the pill,
 * as an opaque sheet down to the window's foot. A dimmed page under a short
 * panel still read through (the playground's controls under the links, council
 * 28), so nothing of the page shows while the menu is open, and the page under
 * it doesn't scroll.
 */
export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const root = useRef<HTMLDivElement | null>(null);

  // A route change, Escape, or a press outside closes the menu.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    // The sheet covers the page, so the page holds still under it; the scroll position comes back as it was.
    const page = document.documentElement;
    const overflow = page.style.overflow;
    page.style.overflow = "hidden";
    // What the sheet covers (the header's siblings: the page and its footer) is out of reach of Tab and screen readers.
    const header = root.current?.closest("header");
    const covered = [...(header?.parentElement?.children ?? [])].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== header && !element.inert,
    );
    for (const element of covered) element.inert = true;
    // The sheet only exists below lg: a window widened past it closes the menu, which lets the page go again.
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      wide.removeEventListener("change", onWide);
      page.style.overflow = overflow;
      for (const element of covered) element.inert = false;
    };
  }, [open]);

  return (
    <div ref={root} className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="-mr-3 grid size-11 place-items-center rounded-full text-site-ink transition-[scale] duration-150 ease-out active:scale-[0.96]"
      >
        <Icon icon={open ? Cancel01Icon : Menu01Icon} size={20} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto overscroll-contain bg-site-bg px-5 pt-3 pb-8 shadow-[inset_0_1px_0_var(--site-line)] sm:px-8"
      >
        <nav aria-label="Main" className="mx-auto flex max-w-[1120px] flex-col">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <SiteLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center text-[28px] font-semibold tracking-[-0.02em]",
                  active ? "text-site-ink" : "text-site-muted",
                )}
              >
                {item.label}
              </SiteLink>
            );
          })}
          <div className="mt-4 flex h-11 items-center justify-between">
            <span className="text-[15px] text-site-muted">Appearance</span>
            <ThemeToggle className="-mr-2" />
          </div>
        </nav>
      </div>
    </div>
  );
};
