"use client";

import { type ReactNode, useId, useMemo, useState } from "react";

import type { PresetSlug } from "@/constants/presets";
import { BatteryDemo } from "@/examples/battery-demo";
import { CallDemo } from "@/examples/call-demo";
import type { DemoStageTheme, DemoView } from "@/examples/demo-stage";
import { EtaDemo } from "@/examples/eta-demo";
import { NearbyTransferDemo } from "@/examples/nearby-transfer-demo";
import { NowPlayingDemo } from "@/examples/now-playing-demo";
import { RecordingDemo } from "@/examples/recording-demo";
import { SplitDemo } from "@/examples/split-demo";
import { TimerDemo } from "@/examples/timer-demo";
import { UploadDemo } from "@/examples/upload-demo";
import { cn } from "@/components/site/cn";

import { useReducedMotion } from "./use-reduced-motion";
import { SITE_BACKDROP, useSiteTheme } from "./use-site-theme";

/*
 * Every preset's live demo, from track C's examples/. Each demo mounts its own
 * provider and island on a phone-width stage, so demos never share a stack.
 *
 * Only "live" plays on its own; every other view is a still. With reduced
 * motion a demo starts as a still.
 */

interface DemoOptions {
  view: DemoView;
  height: number;
  theme: DemoStageTheme;
}

/*
 * On the site a demo stage sits on the page itself, so the island reads as
 * hardware on the page's colour, and its hint and buttons take the site's
 * greys. The backdrop is the page colour, which sets the island's keyline: on
 * the black page it draws the same faint ring as the island at the top of the
 * window. With no screen colour there is nothing to clip to, and clipping
 * would cut the expanded island's shadow off square at the stage edge.
 */
export const useSiteStage = (): DemoStageTheme => {
  const theme = useSiteTheme();
  return useMemo(
    () => ({
      background: "transparent",
      ink: "var(--site-ink)",
      muted: "var(--site-muted)",
      backdrop: SITE_BACKDROP[theme],
      buttonFill: "var(--site-fill)",
      buttonInk: "var(--site-ink)",
      buttonShadow: "none",
      clip: false,
    }),
    [theme],
  );
};

/**
 * The gallery's stage, in both themes: a dark phone screen, the playground's and the home hero's
 * #1c1c1e, so the stage looks the same from page to page. On the black page the island would vanish into it, as on the hardware;
 * on the screen colour the shape shows by itself. The keyline follows that colour ("auto"), so
 * the island's edge is a level or two lighter, as the simulator draws it over #1c1c1e. No glow.
 */
export const DARK_SCREEN_STAGE = {
  background: "#1c1c1e",
  ink: "#f5f5f7",
  muted: "rgba(235, 235, 245, 0.6)",
  backdrop: "#1c1c1e",
  buttonFill: "rgba(255, 255, 255, 0.14)",
  buttonInk: "#f5f5f7",
  buttonShadow: "none",
  clip: true,
  keyline: "auto",
} as const satisfies DemoStageTheme;

export const DEMOS = {
  upload: ({ view, height, theme }) => <UploadDemo view={view} height={height} theme={theme} />,
  timer: ({ view, height, theme }) => <TimerDemo view={view} height={height} theme={theme} />,
  // Playing in every view, as the playground's rebuild of it plays: a paused still showed a flat meter and a play button there.
  "now-playing": ({ view, height, theme }) => <NowPlayingDemo view={view} height={height} theme={theme} />,
  "incoming-call": ({ view, height, theme }) => <CallDemo view={view} height={height} theme={theme} />,
  eta: ({ view, height, theme }) => <EtaDemo view={view} height={height} theme={theme} />,
  recording: ({ view, height, theme }) => <RecordingDemo view={view} height={height} theme={theme} />,
  transfer: ({ view, height, theme }) => <NearbyTransferDemo view={view} height={height} theme={theme} />,
  battery: ({ view, height, theme }) => <BatteryDemo view={view} height={height} theme={theme} />,
  split: ({ view, height, theme }) => <SplitDemo view={view === "minimal" ? "live" : view} height={height} theme={theme} />,
} as const satisfies Record<PresetSlug, (options: DemoOptions) => ReactNode>;

/** A preset the site has a live demo for. */
export type DemoSlug = keyof typeof DEMOS;

export const hasDemo = (slug: string): slug is DemoSlug => Object.hasOwn(DEMOS, slug);

const VIEWS = [
  { value: "live", label: "Live" },
  { value: "compact", label: "Compact" },
  { value: "expanded", label: "Expanded" },
  { value: "minimal", label: "Split" },
] as const satisfies readonly { value: DemoView; label: string }[];

/** The split preset is already two activities, so it has no separate split view. */
export const viewsFor = (slug: PresetSlug) => (slug === "split" ? VIEWS.filter((view) => view.value !== "minimal") : VIEWS);

/** Where a demo starts: as asked, except that reduced motion turns "live" into a still. */
export const startView = (initialView: DemoView, reduced: boolean): DemoView => (reduced && initialView === "live" ? "compact" : initialView);

interface ViewControlProps {
  slug: PresetSlug;
  view: DemoView;
  onChange: (view: DemoView) => void;
  /** Fill the width it is given, the options sharing it evenly. Defaults to false (as wide as its options). */
  stretch?: boolean;
  className?: string;
}

/**
 * The view a demo holds. "Live" plays it; every other view is a still, so the
 * control doubles as play and pause, which reduced motion needs.
 */
export const ViewControl = ({ slug, view, onChange, stretch = false, className }: ViewControlProps) => {
  const name = useId();
  return (
    <div role="radiogroup" aria-label="Island view" className={cn("max-w-full rounded-full bg-site-fill p-1", stretch ? "flex w-full" : "inline-flex", className)}>
      {viewsFor(slug).map((option) => {
        const selected = option.value === view;
        return (
          <label
            key={option.value}
            className={cn(
              "grid h-8 min-w-0 cursor-pointer place-items-center rounded-full px-3 text-[14px] transition-[background-color,color,box-shadow] duration-200 ease-out sm:min-w-[5.5rem]",
              stretch && "flex-1",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-site-focus",
              selected ? "bg-site-raised text-site-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-site-muted hover:text-site-ink",
            )}
          >
            <input type="radio" name={name} value={option.value} checked={selected} onChange={() => onChange(option.value)} className="sr-only" />
            {option.label}
          </label>
        );
      })}
    </div>
  );
};

interface PresetDemoProps {
  /** Which preset. Required. */
  slug: PresetSlug;
  /** View shown first. Defaults to "live". */
  initialView?: DemoView;
  /** Stage height in px. Defaults to 300, enough for the tallest expanded view. */
  height?: number;
  /** Extra classes on the frame. Defaults to none. */
  className?: string;
}

/** A preset's live demo for the docs: the island on the page's own colour inside a hairline frame, and the view switch. */
export const PresetDemo = ({ slug, initialView = "live", height = 300, className }: PresetDemoProps) => {
  const reduced = useReducedMotion();
  const stage = useSiteStage();
  const [chosen, setChosen] = useState<DemoView | null>(null);
  const view = chosen ?? startView(initialView, reduced === true);

  return (
    // `isolate` keeps the demo island's z-index inside the frame, so a scrolled frame slides under the sticky header.
    <div className={cn("site-demo not-prose isolate flex flex-col items-center overflow-hidden rounded-[20px] pb-5 shadow-[inset_0_0_0_1px_var(--site-line)]", className)}>
      {/* Remounting on a view change restarts the demo in that view, the way a fresh page load would. */}
      <div key={view} data-demo-view={view} className="w-full min-w-0" style={{ minHeight: height }}>
        {/* Until hydration says whether motion is reduced, the stage stays empty rather than start a loop it may stop. */}
        {reduced === null || !hasDemo(slug) ? null : DEMOS[slug]({ view, height, theme: stage })}
      </div>
      <ViewControl slug={slug} view={view} onChange={setChosen} />
    </div>
  );
};
