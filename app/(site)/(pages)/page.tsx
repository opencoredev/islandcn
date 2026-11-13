import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { Metadata } from "next";

import { AgentHandoff } from "@/components/site/agent-handoff";
import { Command } from "@/components/site/command";
import { HeroStage } from "@/components/site/hero-stage";
import { Icon } from "@/components/site/icon";
import { MeasuredShot } from "@/components/site/measured-shot";
import { PresetChapter } from "@/components/site/preset-chapter";
import { ogImageUrl } from "@/constants/og";
import { ROUTES } from "@/constants/routes";
import { ENGINE_ITEM, SITE, SITE_URL, addCommand } from "@/constants/site";
import { SiteLink } from "@/components/site/site-link";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name}: ${SITE.headline.replace(/\.$/, "")}` },
  description: SITE.metaDescription,
  alternates: { canonical: ROUTES.HOME, types: { "text/markdown": "/index.md" } },
  openGraph: {
    type: "website",
    url: ROUTES.HOME,
    siteName: SITE.name,
    images: { url: ogImageUrl({ title: SITE.headline, description: SITE.tagline }), width: 1200, height: 630, alt: SITE.headline },
  },
  twitter: { card: "summary_large_image", images: ogImageUrl({ title: SITE.headline, description: SITE.tagline }) },
};

const primaryButton =
  "inline-flex h-12 items-center rounded-full bg-site-ink px-6 text-[17px] font-medium text-site-bg transition-[scale,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.96]";

const secondaryLink = "group inline-flex h-12 items-center gap-1 rounded-full px-2 text-[17px] font-medium text-site-ink";

/*
 * One idea per section. The hero leads with the product: the top of a phone
 * screen with the real island playing everyday activities, and the launch line
 * under it. Then the tour names each preset beside a second screen that plays
 * it, the measured shot, and the install. The hero and the install both end on
 * the same two calls: the playground, and installing.
 */
/** What search engines read about the site and the library. Only facts the site states elsewhere. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: SITE.name, url: `${SITE_URL}/`, description: SITE.metaDescription },
    {
      "@type": "SoftwareSourceCode",
      name: SITE.name,
      description: SITE.description,
      url: `${SITE_URL}/`,
      codeRepository: SITE.repo,
      programmingLanguage: ["TypeScript", "React"],
      license: "https://spdx.org/licenses/MIT.html",
      author: { "@type": "Person", name: SITE.author },
    },
  ],
};

const Home = () => (
  <>
    {/* JSON.stringify output of a constant, so there is nothing user-made to escape. */}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-[1120px] flex-col items-center justify-center px-5 pt-3 pb-[8svh] text-center sm:px-8 sm:pt-8">
      <HeroStage />
      {/*
       * One block, so the headline, the line under it and the buttons fade together as they go under the header.
       * On a phone the spacing is tighter and the line under the headline is its first sentence only (the screen
       * above already plays the uploads, timers and calls the second names), so the playground button ends on
       * the first screen at 390x844 and 375x812. On a 667 pt screen it starts below the fold, whole, never cut.
       */}
      <div className="site-exit-fade flex flex-col items-center">
        {/* A non-breaking hyphen, so "open-source" never splits across two lines. */}
        <h1 className="mt-8 max-w-[14em] text-headline text-balance sm:mt-10">{SITE.headline.replace("-", "\u2011")}</h1>
        <p className="mt-4 max-w-[36rem] text-lede text-balance text-site-muted sm:mt-5">{SITE.tagline}</p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-3">
          <SiteLink href={ROUTES.PLAYGROUND} className={primaryButton}>
            Open the playground
          </SiteLink>
          <SiteLink href="#install" className={secondaryLink}>
            Install
            <Icon icon={ArrowRight01Icon} size={16} strokeWidth={2} className="transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
          </SiteLink>
          {/* After the two calls, never between them: on a phone that keeps the playground button on the first screen. */}
          <AgentHandoff />
        </div>
      </div>
    </section>

    <PresetChapter />
    <MeasuredShot />

    {/* One block, so the heading, the command and the buttons fade together as they go under the header. */}
    <section
      id="install"
      aria-labelledby="install-title"
      className="site-exit-fade mx-auto flex max-w-[1120px] scroll-mt-24 flex-col items-center px-5 pt-40 text-center sm:px-8"
    >
      <h2 id="install-title" className="max-w-[12em] text-headline text-balance">
        One command, then it&rsquo;s yours.
      </h2>
      <p className="mt-5 max-w-[32rem] text-lede text-balance text-site-muted">
        The engine needs only React. Every file lands in your project, so you can change any of it.
      </p>
      <Command command={addCommand(ENGINE_ITEM)} fit="line" className="mt-10 w-full max-w-[36rem]" />
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        <SiteLink href={ROUTES.PLAYGROUND} className={primaryButton}>
          Open the playground
        </SiteLink>
        <SiteLink href={ROUTES.DOCS} className={secondaryLink}>
          Read the docs
          <Icon icon={ArrowRight01Icon} size={16} strokeWidth={2} className="transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
        </SiteLink>
      </div>
    </section>
  </>
);

export default Home;
