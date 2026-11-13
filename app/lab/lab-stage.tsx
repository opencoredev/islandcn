"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import {
  type FrameStats,
  Island,
  type IslandMetricsOverrides,
  type IslandMotionOverrides,
  IslandProvider,
  type IslandSequence,
  islandMotion,
  type SpringConfig,
  useIsland,
} from "@/lib/island";

import { activityOptions, toIslandSequence } from "./shapes";
import type { SequenceSpec } from "./spec";

export interface LabSettings {
  sequence: string;
  /** Screen size in points, or "viewport" to pin the island to the window like a desktop app. */
  screen: { width: number; height: number } | "viewport";
  background: string;
  /** No controls, clock paused at frame 0: the capture script drives it. */
  capture: boolean;
  reduced: boolean;
  loop: boolean;
  /** Overrides every shape spring, for A/B captures. */
  spring: SpringConfig | null;
  /** Overrides one transition's content timing, for A/B captures (`?content=dismiss:blur=4,anchor=1`). */
  content: IslandMotionOverrides["contentTiming"] | null;
  /** Overrides the shadow's grain, for A/B captures (`?grain=2,0.016`: levels, full). */
  grain: { levels: number; full: number } | null;
  /** Any number in the engine's motion by dotted path, for A/B captures (`?set=body.collapseSplit.response=0.45;...`). */
  sets: { path: string[]; value: number }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/**
 * The overrides that put each number at its path. A path that does not end on a number in the engine's
 * motion is skipped, so the object only ever holds the engine's own keys with numbers where it has them.
 */
const overridesFrom = (sets: LabSettings["sets"]): IslandMotionOverrides => {
  const out: Record<string, unknown> = {};
  for (const { path, value } of sets) {
    let base: unknown = islandMotion;
    for (const key of path) base = isRecord(base) ? base[key] : undefined;
    if (typeof base !== "number") continue;
    let cursor = out;
    for (const key of path.slice(0, -1)) {
      const next = cursor[key];
      const child: Record<string, unknown> = isRecord(next) ? next : {};
      cursor[key] = child;
      cursor = child;
    }
    cursor[path[path.length - 1] ?? ""] = value;
  }
  // Every key and leaf was checked against the engine's motion above.
  return out as IslandMotionOverrides;
};

const allShapes = (spring: SpringConfig): IslandMotionOverrides => ({
  shape: {
    appear: spring,
    expand: spring,
    collapse: spring,
    split: spring,
    unsplit: spring,
    dismiss: spring,
    resize: spring,
  },
});

export const LabStage = ({ specs, settings }: { specs: SequenceSpec[]; settings: LabSettings }) => {
  const sequences = useMemo(() => {
    const out: Record<string, IslandSequence> = {};
    for (const spec of specs) out[spec.name] = toIslandSequence(spec);
    return out;
  }, [specs]);
  const devtools = useMemo(() => ({ sequences }), [sequences]);
  const motion = useMemo((): IslandMotionOverrides | undefined => {
    if (!settings.spring && !settings.content && settings.sets.length === 0) return undefined;
    const set = overridesFrom(settings.sets);
    return { ...set, ...(settings.spring ? allShapes(settings.spring) : {}), ...(settings.content ? { contentTiming: { ...set.contentTiming, ...settings.content } } : {}) };
  }, [settings.spring, settings.content, settings.sets]);
  const grain = settings.grain;
  const metrics = useMemo((): IslandMetricsOverrides | undefined => (grain ? { expanded: { shadow: { grain } } } : undefined), [grain]);
  const screen = settings.screen;
  const viewport = screen === "viewport";

  const screenStyle: CSSProperties =
    screen === "viewport"
      ? { position: "fixed", inset: 0, background: settings.background }
      : {
        position: "absolute",
        top: 0,
        left: 0,
        width: screen.width,
        height: screen.height,
        background: settings.background,
        overflow: "hidden",
      };

  return (
    <IslandProvider devtools={devtools} metrics={metrics} motion={motion} reducedMotion={settings.reduced ? "always" : "user"}>
      <div data-lab-screen="" style={screenStyle}>
        <Island placement={viewport ? "viewport" : "container"} backdrop={settings.background} />
      </div>
      <LabDriver specs={specs} settings={settings} />
    </IslandProvider>
  );
};

/** Starts the requested sequence once devtools are installed; shows controls unless capturing. */
const LabDriver = ({ specs, settings }: { specs: SequenceSpec[]; settings: LabSettings }) => {
  const [current, setCurrent] = useState(settings.sequence);
  const [speed, setSpeed] = useState(1);
  const [stats, setStats] = useState<FrameStats | null>(null);
  // Bumps on every play, so the stats timer (and the loop) restart with each run.
  const [run, setRun] = useState(0);
  const spec = specs.find((s) => s.name === current) ?? specs[0];

  const play = useCallback(
    (name: string) => {
      const tools = window.__islandcn;
      if (!tools) return;
      tools.setTimeScale(speed);
      tools.play(name, { paused: settings.capture });
      document.documentElement.dataset.labReady = "1";
      document.documentElement.dataset.labSequence = name;
      setRun((n) => n + 1);
    },
    [settings.capture, speed],
  );

  // The provider installs devtools in its own effect, which runs after this child's effect.
  useEffect(() => {
    let frame = 0;
    const start = () => {
      if (!window.__islandcn) {
        frame = window.requestAnimationFrame(start);
        return;
      }
      play(current);
    };
    start();
    return () => window.cancelAnimationFrame(frame);
  }, [current, play]);

  useEffect(() => {
    if (settings.capture || !spec) return;
    const length = (spec.duration + 400) / speed;
    const timer = window.setTimeout(() => {
      setStats(window.__islandcn?.stats() ?? null);
      if (settings.loop) play(current);
    }, length);
    return () => window.clearTimeout(timer);
  }, [current, play, settings.capture, settings.loop, spec, speed, run]);

  if (settings.capture) return null;
  const left = settings.screen === "viewport" ? 16 : settings.screen.width + 24;

  return (
    <aside style={{ ...panel, left, top: settings.screen === "viewport" ? "auto" : 16, bottom: settings.screen === "viewport" ? 16 : "auto" }}>
      <Group title="Sequence">
        {specs.map((s) => (
          <Button key={s.name} active={s.name === current} onClick={() => (s.name === current ? play(s.name) : setCurrent(s.name))}>
            {s.name}
          </Button>
        ))}
      </Group>
      <Group title="Speed">
        {[1, 0.25].map((value) => (
          <Button key={value} active={speed === value} onClick={() => setSpeed(value)}>
            {value}x
          </Button>
        ))}
        <Button active={false} onClick={() => play(current)}>
          Replay
        </Button>
      </Group>
      <ManualControls specs={specs} />
      <p style={meta}>
        {spec ? `${spec.source === "reference" ? "Reference spec" : "Built-in spec"} · ${spec.duration} ms · ${spec.fps} fps` : null}
      </p>
      <p style={meta} data-lab-stats="">
        {stats
          ? `${stats.frames} frames · gap mean ${stats.interval.mean} ms, p95 ${stats.interval.p95}, max ${stats.interval.max} · long ${stats.longFrames} · work mean ${stats.work.mean} ms, max ${stats.work.max}`
          : "Frame stats appear after a run."}
      </p>
    </aside>
  );
};

/** Drive the stack by hand: long-press the pill, press outside, or use these. */
const ManualControls = ({ specs }: { specs: SequenceSpec[] }) => {
  const island = useIsland();
  const content = specs[0]?.content;
  if (!content) return null;
  return (
    <Group title="Manual">
      <Button active={false} onClick={() => island.start(activityOptions("primary", content.primary))}>
        Start A
      </Button>
      <Button active={false} onClick={() => island.start(activityOptions("secondary", content.secondary))}>
        Start B
      </Button>
      <Button active={false} onClick={() => island.update("primary", { alert: true })}>
        Alert A
      </Button>
      <Button active={false} onClick={() => island.expand()}>
        Expand
      </Button>
      <Button active={false} onClick={() => island.end("secondary")}>
        End B
      </Button>
      <Button active={false} onClick={() => island.end("primary")}>
        End A
      </Button>
    </Group>
  );
};

const panel: CSSProperties = {
  position: "fixed",
  width: 300,
  padding: 14,
  display: "grid",
  gap: 12,
  background: "#1c1c1e",
  color: "#f5f5f7",
  borderRadius: 14,
  font: "13px/1.4 -apple-system, BlinkMacSystemFont, Inter, Geist, system-ui, sans-serif",
  zIndex: 100,
};

const meta: CSSProperties = { margin: 0, color: "#a1a1a6", fontVariantNumeric: "tabular-nums" };

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ display: "grid", gap: 6 }}>
    <span style={{ color: "#a1a1a6", fontSize: 12 }}>{title}</span>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
  </div>
);

const Button = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      minHeight: 30,
      padding: "4px 10px",
      borderRadius: 8,
      border: 0,
      background: active ? "#f5f5f7" : "#2c2c2e",
      color: active ? "#000" : "#f5f5f7",
      font: "inherit",
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);
