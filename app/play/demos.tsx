"use client";

import type { CSSProperties, ReactNode } from "react";

import { BatteryDemo } from "@/examples/battery-demo";
import { CallDemo } from "@/examples/call-demo";
import type { DemoView } from "@/examples/demo-stage";
import { EtaDemo } from "@/examples/eta-demo";
import { NearbyTransferDemo } from "@/examples/nearby-transfer-demo";
import { NowPlayingDemo } from "@/examples/now-playing-demo";
import { RecordingDemo } from "@/examples/recording-demo";
import { SplitDemo } from "@/examples/split-demo";
import { TimerDemo } from "@/examples/timer-demo";
import { UploadDemo } from "@/examples/upload-demo";

import { type DemoName, demoNames, type PlayOptions } from "./names";

interface DemoEntry {
  title: string;
  render: (options: PlayOptions & { height: number }) => ReactNode;
}

const splitView = (view: DemoView): "live" | "compact" | "expanded" => (view === "minimal" ? "live" : view);

const demos = {
  upload: { title: "Upload", render: ({ view, height, phase, reducedMotion, theme }) => <UploadDemo view={view} height={height} reducedMotion={reducedMotion} theme={theme} still={phase === "done" ? 1 : undefined} /> },
  timer: { title: "Timer", render: ({ view, height, reducedMotion, theme }) => <TimerDemo view={view} height={height} reducedMotion={reducedMotion} theme={theme} /> },
  "now-playing": { title: "Now playing", render: ({ view, height, reducedMotion, theme }) => <NowPlayingDemo view={view} height={height} reducedMotion={reducedMotion} theme={theme} /> },
  call: { title: "Incoming call", render: ({ view, height, phase, reducedMotion, theme }) => <CallDemo view={view} height={height} reducedMotion={reducedMotion} theme={theme} answered={phase === "answered"} /> },
  eta: { title: "Ride ETA", render: ({ view, height, phase, reducedMotion, theme }) => <EtaDemo view={view} height={height} reducedMotion={reducedMotion} theme={theme} kind={phase === "delivery" ? "delivery" : "ride"} /> },
  recording: { title: "Recording", render: ({ view, height, reducedMotion, theme }) => <RecordingDemo view={view} height={height} reducedMotion={reducedMotion} theme={theme} /> },
  "nearby-transfer": {
    title: "Nearby transfer",
    render: ({ view, height, phase, reducedMotion, theme }) => (
      <NearbyTransferDemo
        view={view}
        height={height}
        reducedMotion={reducedMotion}
        theme={theme}
        direction={phase?.startsWith("receive") ? "receive" : "send"}
        still={phase === "done" || phase === "receive-done" ? 1 : undefined}
      />
    ),
  },
  battery: { title: "Battery", render: ({ view, height, reducedMotion, theme }) => <BatteryDemo view={view} height={height} reducedMotion={reducedMotion} theme={theme} /> },
  split: { title: "Split: timer and music", render: ({ view, height, reducedMotion, theme }) => <SplitDemo view={splitView(view)} height={height} reducedMotion={reducedMotion} theme={theme} /> },
} as const satisfies Record<DemoName, DemoEntry>;

const label: CSSProperties = {
  margin: "0 0 8px",
  font: "600 13px/1.3 -apple-system, BlinkMacSystemFont, Inter, Geist, system-ui, sans-serif",
  color: "#f5f5f7",
};

/** Every preset on its own stage, for a quick look at all of them together. */
export const PlayGrid = ({ reducedMotion, theme }: Pick<PlayOptions, "reducedMotion" | "theme">) => (
  // A dark page, so the light labels read whatever the site's colour scheme is.
  <main style={{ minHeight: "100dvh", background: "#1c1c1e", padding: 24, display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 402px), 1fr))", alignItems: "start" }}>
    {demoNames.map((name) => (
      <section key={name} style={{ minWidth: 0 }}>
        <h2 style={label}>
          <a href={`/play/${name}`} style={{ color: "inherit", textDecoration: "none" }}>
            {demos[name].title} →
          </a>
        </h2>
        {demos[name].render({ view: "live", phase: null, reducedMotion, theme, height: 300 })}
      </section>
    ))}
  </main>
);

/** One preset in a 402 x 874 screen (narrower on a phone), for captures. */
export const PlayOne = ({ name, view, phase, reducedMotion, theme }: { name: DemoName } & PlayOptions) => (
  <main data-play={name} data-view={view} style={{ minHeight: "100dvh", background: "#e5e5ea" }}>
    {demos[name].render({ view, phase, reducedMotion, theme, height: 874 })}
  </main>
);
