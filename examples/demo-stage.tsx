"use client";

import { createContext, type CSSProperties, type ReactNode, useContext, useEffect } from "react";

import { Glyph } from "@/components/islandcn/glyph";
import { MusicGlyph, TimerGlyph } from "@/components/islandcn/glyphs";
import { CompactText, MinimalPair } from "@/components/islandcn/island-text";
import { LevelMeter } from "@/components/islandcn/level-meter";
import { islandAccent } from "@/components/islandcn/theme";
import { TickingTime } from "@/components/islandcn/ticking-time";
import { Island, IslandProvider, type KeylineSetting, type ReducedMotionSetting, useIsland } from "@/lib/island";

/**
 * Which state a demo should hold, for docs stills and captures. "live" lets the demo play;
 * "minimal" starts a second activity so the island splits; "expanded" keeps it expanded.
 */
export type DemoView = "live" | "compact" | "minimal" | "expanded";

/**
 * How the screen around the island looks. Any CSS colour works, including `var(--token)`, so a
 * site can hand its own tokens in and follow its light and dark themes.
 */
export interface DemoStageTheme {
  /** Screen colour behind the island. */
  background: string;
  /** Text on the stage. */
  ink: string;
  /** The hint under the island. */
  muted: string;
  /**
   * The page colour as hex or rgb(), for the island's keyline strength (`<Island backdrop>`).
   * Leave it out when `background` is a variable; the island then follows the colour scheme.
   */
  backdrop?: string;
  /** Fill of the stage buttons (StageButton). Defaults to "#ffffff". */
  buttonFill?: string;
  /** Label colour of the stage buttons. Defaults to "#1c1c1e". */
  buttonInk?: string;
  /** Box shadow of the stage buttons, or "none". Defaults to a hairline ring and a 1px drop. */
  buttonShadow?: string;
  /**
   * Whether the stage clips what spills past its edges, like a phone screen. Turn it off when the
   * stage sits on the page with no screen colour, so the expanded island's shadow fades out instead
   * of stopping at the stage edge. Defaults to true.
   */
  clip?: boolean;
  /**
   * The island's keyline, the faint band that parts it from a dark page (`<Island keyline>`). Turn
   * it off on a dark screen colour such as #1c1c1e, where the shape already shows and a band reads
   * as a rim. Defaults to "auto".
   */
  keyline?: KeylineSetting;
}

/** The default light screen. The hint grey measures 5.8:1 on the background (the old #6e6e73 was 4.5:1). */
export const lightStage = {
  background: "#f2f2f4",
  ink: "#1c1c1e",
  muted: "#5e5e63",
  backdrop: "#f2f2f4",
  buttonFill: "#ffffff",
  buttonInk: "#1c1c1e",
  buttonShadow: "0 0 0 0.5px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
  clip: true,
} as const satisfies DemoStageTheme;

/** The stage's button colours, so StageButton follows the theme without every demo passing it along. */
type StageButtonColours = Required<Pick<DemoStageTheme, "buttonFill" | "buttonInk" | "buttonShadow">>;

const StageButtonContext = createContext<StageButtonColours>(lightStage);

/** Props every demo takes and passes to its stage. */
export interface DemoBaseProps {
  /** Island state to hold. Defaults to "live". */
  view?: DemoView;
  /** Stage height in px. Defaults to 300. */
  height?: number;
  /** Stage colours, merged over the light screen. Defaults to `lightStage`. */
  theme?: Partial<DemoStageTheme>;
  /** The island's reduced-motion setting; "always" checks a demo without the system setting. Defaults to "user". */
  reducedMotion?: ReducedMotionSetting;
}

export interface DemoStageProps {
  children: ReactNode;
  /** State to hold. Defaults to "live". */
  view?: DemoView;
  /** Stage height in px. Defaults to 300, enough for the tallest expanded view. */
  height?: number;
  /** Stage colours, merged over the light screen. Defaults to `lightStage`. */
  theme?: Partial<DemoStageTheme>;
  /** Screen colour behind the island; shorthand for `theme.background`. Defaults to "#f2f2f4". */
  background?: string;
  /** The island's reduced-motion setting. Defaults to "user" (the system's). */
  reducedMotion?: ReducedMotionSetting;
  /** The second activity used for `view="minimal"`: music, or a timer when the demo is itself music. Defaults to "music". */
  companion?: "timer" | "music";
  /** Short hint under the island, such as "Hold the island to expand it". Defaults to none. */
  hint?: ReactNode;
  /** Extra styles on the stage. Defaults to none. */
  style?: CSSProperties;
}

/**
 * A phone-width screen with its own island. Every demo mounts one, so demos never share an
 * activity stack. The island is clamped to 402 pt, like the reference phone's screen.
 */
export const DemoStage = ({
  children,
  view = "live",
  height = 300,
  theme,
  background,
  reducedMotion = "user",
  companion = "music",
  hint,
  style,
}: DemoStageProps) => {
  const colours: DemoStageTheme = { ...lightStage, ...(background === undefined ? {} : { background, backdrop: background }), ...theme };
  // A custom background without its own backdrop can't reuse the light one.
  const backdrop = colours.backdrop === lightStage.backdrop && colours.background !== lightStage.background ? undefined : colours.backdrop;
  const buttons: StageButtonColours = {
    buttonFill: colours.buttonFill ?? lightStage.buttonFill,
    buttonInk: colours.buttonInk ?? lightStage.buttonInk,
    buttonShadow: colours.buttonShadow ?? lightStage.buttonShadow,
  };
  return (
    <IslandProvider reducedMotion={reducedMotion}>
      <StageButtonContext.Provider value={buttons}>
        <div
          data-demo-stage=""
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 402,
            height,
            margin: "0 auto",
            overflow: colours.clip === false ? "visible" : "hidden",
            background: colours.background,
            color: colours.ink,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Geist", system-ui, sans-serif',
            ...style,
          }}
        >
          <Island backdrop={backdrop} keyline={colours.keyline ?? "auto"} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
            {hint === undefined ? null : <p style={{ margin: 0, fontSize: 13, lineHeight: "18px", color: colours.muted, textWrap: "balance" }}>{hint}</p>}
            {children}
          </div>
          <HoldView view={view} companion={companion} />
        </div>
      </StageButtonContext.Provider>
    </IslandProvider>
  );
};

/** Keeps the island in the requested state while the demo runs. */
const HoldView = ({ view, companion }: { view: DemoView; companion: "timer" | "music" }) => {
  const island = useIsland();
  const primary = island.activities.find((a) => a.id !== "demo-companion");
  const presentation = island.presentation;

  useEffect(() => {
    if (view !== "minimal") return;
    const endsAt = Date.now() + 4 * 60_000 + 59_000;
    // The split shows each activity's compact content (as the reference phone does) in a 62 pt capsule, which cuts
    // anything wider than about 20 pt after the glyph. A ticking time doesn't fit, so the timer
    // companion shows its glyph only; the music one keeps glyph and meter.
    const timerGlyph = <Glyph icon={TimerGlyph} color={islandAccent.orange} />;
    const musicGlyph = <Glyph icon={MusicGlyph} color={islandAccent.pink} />;
    const meter = <LevelMeter bars={3} color={islandAccent.pink} height={15} />;
    island.start({
      id: "demo-companion",
      label: companion === "timer" ? "Timer" : "Music",
      priority: -1,
      compact: companion === "timer" ? { leading: timerGlyph } : { leading: musicGlyph, trailing: meter },
      // The fallback when the pair is too wide for the split.
      minimal:
        companion === "timer" ? (
          <MinimalPair
            leading={timerGlyph}
            trailing={
              <CompactText color={islandAccent.orange}>
                <TickingTime source={{ kind: "remaining", until: endsAt }} />
              </CompactText>
            }
          />
        ) : (
          <MinimalPair leading={musicGlyph} trailing={meter} />
        ),
    });
    return () => island.end("demo-companion");
  }, [view, companion, island]);

  const primaryId = primary?.id;
  useEffect(() => {
    if (view === "live" || primaryId === undefined) return;
    // Presets that expand themselves (a ringing call) are held collapsed for stills.
    if (view !== "expanded" && presentation === "expanded") island.collapse();
    if (view === "expanded" && presentation !== "expanded") island.expand(primaryId);
  }, [view, primaryId, presentation, island]);

  return null;
};

const buttonStyle: CSSProperties = {
  appearance: "none",
  border: 0,
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 18,
  font: "500 14px/1 -apple-system, BlinkMacSystemFont, Inter, Geist, system-ui, sans-serif",
  cursor: "pointer",
};

/** A plain button for the stage below the island (start, replay, simulate an event). Its colours come from the stage's theme. */
export const StageButton = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => {
  const { buttonFill, buttonInk, buttonShadow } = useContext(StageButtonContext);
  return (
    <button type="button" style={{ ...buttonStyle, background: buttonFill, color: buttonInk, boxShadow: buttonShadow }} onClick={onClick}>
      {children}
    </button>
  );
};

/** A row of stage buttons. */
export const StageActions = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>{children}</div>
);
