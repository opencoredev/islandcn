
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { SiteLink } from "@/components/site/site-link";

/*
 * The site is for people, so the footer links only its pages and the source. The files written for coding agents
 * (the skill, llms.txt) are listed on the docs' Agent skill page, and their routes stay where
 * tools look for them.
 */
const LINKS = [
  { href: ROUTES.PLAYGROUND, label: "Playground" },
  { href: ROUTES.DOCS, label: "Docs" },
  { href: SITE.repo, label: "GitHub" },
] as const;

/**
 * One quiet line: the licence and the few places worth going next. Below lg it sits 96 px under the
 * page, the gap a desktop page ends with (the playground gives back its own bottom padding
 * there): 160 px plus the pages' own padding left 230 to 260 px of empty screen on a phone.
 */
export const SiteFooter = () => (
  <footer className="mx-auto mt-24 w-full lg:mt-40 max-w-[1120px] px-5 pb-10 sm:px-8">
    <div className="flex flex-col gap-3 border-t border-site-line pt-5 text-[12px] text-site-muted sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <p>
          {SITE.name}. MIT License, copyright 2026 {SITE.author}.
        </p>
        <p>islandcn is not affiliated with Apple. Dynamic Island is a trademark of Apple Inc.</p>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {LINKS.map((link) => (
          <li key={link.href}>
            <SiteLink href={link.href} className="hover:text-site-ink">
              {link.label}
            </SiteLink>
          </li>
        ))}
      </ul>
    </div>
  </footer>
);
