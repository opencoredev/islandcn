import type { CSSProperties, ReactNode } from "react";

import { type ActivityOptions, continuousRectPath, IslandNumber, IslandProgress, type IslandSequence, type SequenceIsland } from "@/lib/island";

import type { ActivitySpec, LabAction, SequenceSpec, ShapeSpec } from "./spec";

/** Draws a content spec with plain shapes and system-font text, so the web matches the simulator. */
export const Shape = ({ spec }: { spec: ShapeSpec }): ReactNode => {
  switch (spec.kind) {
    case "circle":
      return <span style={{ display: "block", width: spec.size, height: spec.size, borderRadius: "50%", background: spec.color }} />;
    case "ring": {
      const r = (spec.size - spec.width) / 2;
      const length = 2 * Math.PI * r;
      return (
        <svg width={spec.size} height={spec.size} viewBox={`0 0 ${spec.size} ${spec.size}`} style={{ display: "block" }}>
          <circle cx={spec.size / 2} cy={spec.size / 2} r={r} fill="none" stroke={spec.color} strokeOpacity={0.3} strokeWidth={spec.width} />
          <circle
            cx={spec.size / 2}
            cy={spec.size / 2}
            r={r}
            fill="none"
            stroke={spec.color}
            strokeWidth={spec.width}
            strokeLinecap="round"
            strokeDasharray={`${length * spec.progress} ${length}`}
            transform={`rotate(-90 ${spec.size / 2} ${spec.size / 2})`}
          />
        </svg>
      );
    }
    case "bar": {
      if (spec.progress !== undefined) {
        // Live Activity bars ease to a new value (alert-t1: 0.6 to 0.8 within about 0.3 s).
        return <IslandProgress value={spec.progress} color={spec.color} track={spec.track ?? "#3a3a3c"} height={spec.height} radius={spec.radius} />;
      }
      if (spec.smoothing !== undefined && spec.width !== "fill") {
        return (
          <svg width={spec.width} height={spec.height} viewBox={`0 0 ${spec.width} ${spec.height}`} style={{ display: "block" }}>
            <path d={continuousRectPath(0, 0, spec.width, spec.height, spec.radius, spec.smoothing)} fill={spec.color} />
          </svg>
        );
      }
      const outer: CSSProperties = {
        display: "block",
        width: spec.width === "fill" ? "100%" : spec.width,
        height: spec.height,
        borderRadius: spec.radius,
        background: spec.progress === undefined ? spec.color : (spec.track ?? "#3a3a3c"),
        overflow: "hidden",
      };
      return (
        <span style={outer}>
          {spec.progress === undefined ? null : (
            <span style={{ display: "block", height: "100%", width: `${spec.progress * 100}%`, background: spec.color, borderRadius: spec.radius }} />
          )}
        </span>
      );
    }
    case "text": {
      const base: CSSProperties = {
        display: "block",
        fontSize: spec.size,
        fontWeight: spec.weight,
        color: spec.color,
        lineHeight: 1.15,
        whiteSpace: "nowrap",
        fontVariantNumeric: spec.tabular ? "tabular-nums" : undefined,
      };
      const style: CSSProperties = {
        ...base,
        letterSpacing: spec.tracking,
        ...(spec.nudge ? { position: "relative", left: spec.nudge.x, top: spec.nudge.y } : {}),
      };
      const glyphs = spec.numeric ? <IslandNumber value={spec.text} style={{ ...style, display: "flex" }} /> : <span style={style}>{spec.text}</span>;
      if (!spec.tracking) return glyphs;
      // Tracked glyphs draw over an untracked copy that keeps the layout's width, so the pill sized
      // around the text keeps the width it measured; they align in it as the slot aligns them.
      const justify = spec.align === "center" ? "center" : spec.align === "end" ? "flex-end" : "flex-start";
      return (
        <span style={{ position: "relative", display: "block" }}>
          <span aria-hidden style={{ ...base, visibility: "hidden" }}>
            {spec.text}
          </span>
          <span style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: justify }}>{glyphs}</span>
        </span>
      );
    }
    case "stack":
      return (
        <span
          style={{
            display: "flex",
            flexDirection: spec.direction,
            gap: spec.gap,
            alignItems: spec.align === "start" ? "flex-start" : spec.align === "end" ? "flex-end" : "center",
          }}
        >
          {spec.items.map((item, index) => (
            <Shape key={index} spec={item} />
          ))}
        </span>
      );
    case "capsules":
      // HStack(spacing:) of Capsules with no width: SwiftUI splits the row into equal widths.
      return (
        <span style={{ display: "flex", width: "100%", gap: spec.gap }}>
          {Array.from({ length: spec.count }, (_, index) => (
            <span
              key={index}
              style={{ display: "block", flex: "1 1 0", minWidth: 0, height: spec.height, borderRadius: spec.height / 2, background: index < spec.filled ? spec.color : spec.track }}
            />
          ))}
        </span>
      );
    case "frame":
      return (
        <span style={{ display: "flex", height: spec.height, alignItems: "center" }}>
          <Shape spec={spec.item} />
        </span>
      );
    default: {
      const exhaustive: never = spec;
      return exhaustive;
    }
  }
};

const node = (spec: ShapeSpec | null) => (spec ? <Shape spec={spec} /> : undefined);

export const activityOptions = (id: string, spec: ActivitySpec): ActivityOptions => ({
  id,
  label: spec.label,
  group: spec.group,
  compact: { leading: node(spec.compact.leading), trailing: node(spec.compact.trailing) },
  minimal: node(spec.minimal),
  expanded: {
    leading: node(spec.expanded.leading),
    trailing: node(spec.expanded.trailing),
    center: node(spec.expanded.center),
    bottom: node(spec.expanded.bottom),
  },
});

const apply = (island: SequenceIsland, action: LabAction, spec: SequenceSpec) => {
  switch (action) {
    case "start":
      island.start(activityOptions("primary", spec.content.primary));
      return;
    case "start-alert":
      island.start({ ...activityOptions("primary", spec.content.primary), alert: true });
      return;
    case "start-secondary":
      island.start(activityOptions("secondary", spec.content.secondary));
      return;
    case "start-secondary-alert":
      island.start({ ...activityOptions("secondary", spec.content.secondary), alert: true });
      return;
    case "alert-hidden-secondary": {
      const { id: _id, label, group: _group, ...content } = activityOptions("secondary", spec.content.secondaryAlertUpdate);
      island.update("secondary", { ...content, label, alert: true });
      return;
    }
    case "end":
      island.end("primary");
      return;
    case "end-secondary":
      island.end("secondary");
      return;
    case "expand":
      island.expand("primary");
      return;
    case "expand-secondary":
      island.expand("secondary");
      return;
    case "collapse":
      island.collapse();
      return;
    case "press":
      island.press("pill");
      return;
    case "press-bubble":
      island.press("bubble");
      return;
    case "release":
      island.release();
      return;
    case "alert": {
      // The sample app's alerting update: 42 becomes 43 and the bar moves to 0.8.
      const { id: _id, label, group: _group, ...content } = activityOptions("primary", spec.content.alertUpdate);
      island.update("primary", { ...content, label, alert: true });
      return;
    }
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
};

/** Turns a spec into the engine's sequence format. */
export const toIslandSequence = (spec: SequenceSpec): IslandSequence => ({
  duration: spec.duration,
  setup: (island) => {
    for (const action of spec.setup) apply(island, action, spec);
  },
  // Events at one moment run in one call, so they land in one commit as a click handler's calls do;
  // run apart, a collapse and a start became a collapse and then a split. Only
  // interrupt-split-from-expanded has two.
  events: [...new Set(spec.events.map((event) => event.at))].map((at) => ({
    at,
    run: (island: SequenceIsland) => {
      for (const event of spec.events) if (event.at === at) apply(island, event.action, spec);
    },
  })),
});
