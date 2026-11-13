"use client";

/*
 * Direction:
 * 1. Reference: an apple.com product page. One live object on a calm dark
 *    surface, a quiet row of choices under it, details further down.
 * 2. Palette: the site's tokens. The stage is a dark phone screen (#1c1c1e)
 *    in both site themes; colour comes only from the island's content.
 * 3. Type: the system stack. 15 medium on the actions and tiles, 13 for names.
 * 4. Layout: the stage leads, the actions sit right under it, every preset is
 *    a tile below, the code follows. Editing is one press away in a panel.
 *    On a phone the stage pins under the header and the presets and actions
 *    pin to the window's foot, under the thumb.
 * 5. Signature: picking a tile morphs the island on the stage into the next
 *    preset, with the engine's own motion, never a reload.
 * 6. Avoiding: walls of labelled groups, dashed placeholders, card grids with
 *    shadows, gradients, glows, and controls that fake what the engine does.
 */

import { ArrowRight01Icon, Cancel01Icon, SlidersHorizontalIcon } from "@hugeicons/core-free-icons";
import { type ReactNode, type Ref, type RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { PRESETS } from "@/constants/presets";
import { ROUTES } from "@/constants/routes";
import { type ShapeTransition, Island, IslandProvider, islandMetrics, islandMotion, useIsland } from "@/lib/island";

import { cn } from "../cn";
import { Icon } from "../icon";
import { PresetThumb } from "../preset-thumb";
import { useReducedMotion } from "../use-reduced-motion";
import { activityLabels, buildNames, usesAccent } from "./activity";
import { generateCode } from "./codegen";
import { CodePanel } from "./code-panel";
import { WordFields } from "./basics";
import { Disclosure, hintClass } from "./controls";
import { ActivityAccent, ActivityDetails, ActivitySwitch, MotionSection, RegionsSection, MainValue, SecondActivity, TimerSettings, mainValueOf } from "./inspector";
import {
  type ActivitySpec,
  type ActivityStarter,
  type Build,
  type Content,
  REGION_INFO,
  type Region,
  type StarterKey,
  DEFAULT_STARTER,
  companionKey,
  isStarterKey,
  secondFrom,
  starterBuild,
  withContent,
} from "./model";
import { DEFAULT_SPRINGS, type Springs, motionOverrides } from "./motion";
import { COMPANION_ID, REAL_IDS, RealPreset, isRealPreset, presetUsage } from "./real-presets";
import { type Slot, usePlaygroundRuntime } from "./runtime";
import { CopyActions } from "./share-link";
import { type PlaygroundState, STATE_PARAM, encodeState, parseState } from "./url-state";
import { followWords, wordFields } from "./words";
import { SiteLink } from "@/components/site/site-link";

/** The query a preset link carries: `/playground?preset=timer` opens on the timer. */
const PRESET_PARAM = "preset";

/** The stage's colour: a dark phone screen, in both site themes. */
const SCREEN = "#1c1c1e";

/** The width the island lays out against: a phone's screen, so every view shows at real size (1 CSS px is 1 pt). */
const SCREEN_WIDTH = islandMetrics.screen.width;

/** The panel's width on wide screens (px); the page slides left by half of it so the stage stays clear. */
const PANEL_WIDTH = 400;

/** The site header's height (px): the phone stage pins right under it. */
const HEADER_PX = 64;

/** The page column's widest (px, `max-w-[1120px]`) and its side padding from sm (px, `sm:px-8`). */
const COLUMN = { width: 1120, gutter: 32 } as const;

/** Air kept between the preset grid and the open panel's edge (px). */
const PANEL_AIR = 24;

/**
 * While the panel is open on a wide screen, the preset grid gives up the width the panel covers, so no
 * tile sits under it (council: the Recording tile was cut at 1440). From 1280 the column slides left
 * by up to half the panel, so less is covered; from about 1512 nothing is. The grid's columns follow
 * its own width (a container query), so a narrower grid drops to four or three columns, not slivers.
 */
const PANEL_GRID_CSS = [
  `@media (min-width: 1024px) and (max-width: 1279.98px){[data-pg-shift] [data-pg-grid]{padding-right:max(0px, calc(${PANEL_WIDTH + PANEL_AIR - COLUMN.gutter}px - (100vw - min(100vw, ${COLUMN.width}px)) / 2))}}`,
  `@media (min-width: 1280px){[data-pg-shift] [data-pg-grid]{padding-right:max(0px, calc(${COLUMN.width + PANEL_WIDTH + PANEL_AIR - COLUMN.gutter}px - 100vw))}}`,
].join("");

/** How long the panel and the sheet take to slide (ms). Under the 300 ms a UI move should stay within. */
const PANEL_MS = 280;

/** Apple's ease-out for UI that comes in: fast start, long settle. */
const EASE = "cubic-bezier(0.32,0.72,0,1)";

/** How long a split preset's first activity shows alone before its second splits the island (ms). */
const SPLIT_AFTER_MS = 650;

/** How long a preset that rests expanded (an incoming call) shows compact before it opens (ms). */
const EXPAND_AFTER_MS = 420;

/** A tile in the picker: every preset the playground can build, then a blank activity. */
interface Choice {
  readonly key: StarterKey;
  readonly title: string;
  /** The preset's docs entry, or null for the blank activity. */
  readonly preset: (typeof PRESETS)[number] | null;
}

const CHOICES: readonly Choice[] = [
  ...PRESETS.flatMap((preset): Choice[] => (isStarterKey(preset.slug) ? [{ key: preset.slug, title: preset.title, preset }] : [])),
  { key: "blank", title: "Blank", preset: null },
];

const choiceOf = (key: StarterKey): Choice => CHOICES.find((choice) => choice.key === key) ?? { key, title: "Custom", preset: null };

const initialState = (key: StarterKey = DEFAULT_STARTER): PlaygroundState => ({ build: starterBuild(key), springs: DEFAULT_SPRINGS, reduced: false, stage: "dark", opens: "compact" });

/** What a press on an action does once the island has answered it. */
interface PendingStart {
  /** The new preset's first activity has to be shown: nothing was running to morph from. */
  readonly show: boolean;
  /** The preset is two activities, so the second splits the island after the first shows. */
  readonly second: boolean;
  /** The preset rests expanded, so it opens after it shows. */
  readonly expand: boolean;
}

/* -------------------------------------------------------------------------------------------- */

interface PickerProps {
  /** The build's starting point, which the selected tile shows. Required. */
  value: StarterKey;
  onPick: (key: StarterKey) => void;
  /** "grid" on wide screens, "strip" in the phone's foot bar. Required. */
  layout: "grid" | "strip";
}

/** Every preset as its compact island and its name; pressing one swaps the stage's island. */
const PresetPicker = ({ value, onPick, layout }: PickerProps) => {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label="Preset"
      className={cn(
        layout === "grid"
          ? "grid grid-cols-3 gap-3 @[704px]:grid-cols-4 @[960px]:grid-cols-6"
          : "flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {CHOICES.map((choice) => {
        const selected = choice.key === value;
        return (
          <label
            key={choice.key}
            className={cn(
              "group relative flex cursor-pointer snap-start flex-col gap-1.5 rounded-[14px] p-1.5 transition-[box-shadow,color,scale] duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-site-focus",
              layout === "strip" ? "w-[136px] flex-none" : "min-w-0",
              selected ? "text-site-ink shadow-[inset_0_0_0_2px_var(--site-ink)]" : "text-site-muted shadow-[inset_0_0_0_1px_var(--site-line)] hover:text-site-ink",
            )}
          >
            <input type="radio" name={name} value={choice.key} checked={selected} onChange={() => onPick(choice.key)} className="sr-only" />
            <PresetThumb slug={choice.key} />
            <span className={cn("block truncate px-1 font-medium", layout === "strip" ? "text-[12px] leading-4" : "text-[13px] leading-[18px]")}>{choice.title}</span>
          </label>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------------------------- */

interface ActionsProps {
  /** The first activity is on the island. Required. */
  shown: boolean;
  /** The island is open. Required. */
  expanded: boolean;
  /** The second activity is on the island, splitting it. Required. */
  split: boolean;
  onShow: () => void;
  onExpand: () => void;
  onHold: () => void;
  onAlert: () => void;
  onSplit: () => void;
  /** Classes on the group and its caption. Defaults to none. */
  className?: string;
  /** "stage" under the stage on wide screens, "dock" in the phone's foot bar. Defaults to "stage". */
  place?: "stage" | "dock";
  /** What sits beside the bar on its row (the Customize button), so the caption centres under both. Defaults to none. */
  aside?: ReactNode;
}

/** How long an alert stays open before the engine closes it, rounded for the caption. */
const ALERT_SECONDS = Math.round(islandMotion.alertHold);

/** Every label the action bar can show. */
type ActionKey = "show" | "dismiss" | "expand" | "collapse" | "hold" | "alert" | "split" | "unsplit";

/**
 * What each action does, in a line: the caption under the bar names the hovered or last-pressed one.
 * Alert and Expand both open the island, so Alert's line says the part that differs: it closes by itself.
 */
const ACTION_HELP = {
  show: { label: "Show", text: "starts the activity on the island" },
  dismiss: { label: "Dismiss", text: "ends the activity and empties the island" },
  expand: { label: "Expand", text: "opens the full view until you close it" },
  collapse: { label: "Collapse", text: "closes it back to the compact pill" },
  hold: { label: "Hold", text: "press and hold, the way a person opens it" },
  alert: { label: "Alert", text: `opens for an update, then closes itself in ${ALERT_SECONDS} s` },
  split: { label: "Split", text: "adds a second activity, so the island splits" },
  unsplit: { label: "Unsplit", text: "removes the second activity" },
} as const satisfies Record<ActionKey, { label: string; text: string }>;

/** The caption before any action is hovered or pressed. */
const ACTIONS_IDLE = "Each action is one call your code makes. Hover one to see what it does.";
const ACTIONS_IDLE_TOUCH = "Each action is one call your code makes.";

const captionOf = (key: ActionKey): string => `${ACTION_HELP[key].label}: ${ACTION_HELP[key].text}`;

/** One action in the group. Toggles say their state with `aria-pressed`; the title and description say what it does. */
const ActionButton = ({
  action,
  onClick,
  onHint,
  disabled = false,
  pressed,
}: {
  action: ActionKey;
  onClick: () => void;
  /** Reports a hover or focus (the action) and its end (null). */
  onHint: (action: ActionKey | null) => void;
  disabled?: boolean;
  pressed?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    onPointerEnter={(event) => {
      if (event.pointerType === "mouse") onHint(action);
    }}
    onPointerLeave={() => onHint(null)}
    onFocus={() => onHint(action)}
    onBlur={() => onHint(null)}
    disabled={disabled}
    aria-pressed={pressed}
    title={captionOf(action)}
    aria-description={ACTION_HELP[action].text}
    className={cn(
      "relative inline-flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-[13px] font-medium whitespace-nowrap transition-[background-color,color,box-shadow,scale,opacity] duration-150 ease-out sm:flex-none sm:px-4 sm:text-[14px]",
      "active:scale-[0.96] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100 motion-reduce:transition-none",
      pressed === true
        ? "bg-site-raised text-site-ink shadow-[0_0_0_0.5px_rgb(0_0_0/0.12),0_1px_3px_rgb(0_0_0/0.1)] dark:shadow-[0_0_0_1px_var(--site-line)]"
        : "text-site-ink hover:bg-site-raised/60",
    )}
  >
    {ACTION_HELP[action].label}
  </button>
);

/**
 * The actions as one segmented group, the way a control bar groups its buttons: each one is the engine
 * call the copied code makes. Under it, one quiet line names the hovered or last-pressed action and what
 * it does, so Alert and Split explain themselves without a help panel.
 */
const Actions = ({ shown, expanded, split, onShow, onExpand, onHold, onAlert, onSplit, className, place = "stage", aside }: ActionsProps) => {
  const [hovered, setHovered] = useState<ActionKey | null>(null);
  const [pressed, setPressed] = useState<ActionKey | null>(null);
  const press = (action: ActionKey, run: () => void) => () => {
    setPressed(action);
    run();
  };
  const caption = hovered ?? pressed;
  const toggle = { show: shown ? "dismiss" : "show", expand: expanded ? "collapse" : "expand", split: split ? "unsplit" : "split" } as const;
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-2", place === "dock" && "flex-col-reverse gap-1.5", className)}>
      <div className={cn("flex min-w-0 items-center", place === "dock" ? "w-full gap-2" : "gap-3")}>
      <div role="toolbar" aria-label="Island actions" className={cn("flex min-w-0 items-center gap-0.5 rounded-full bg-site-fill p-1", place === "dock" && "flex-1")}>
        <ActionButton action={toggle.show} onClick={press(toggle.show, onShow)} onHint={setHovered} />
        <ActionButton action={toggle.expand} onClick={press(toggle.expand, onExpand)} onHint={setHovered} disabled={!shown} pressed={expanded} />
        <ActionButton action="hold" onClick={press("hold", onHold)} onHint={setHovered} disabled={!shown || expanded} />
        <ActionButton action="alert" onClick={press("alert", onAlert)} onHint={setHovered} disabled={!shown} />
        {/* Unsplit stays live after the main activity leaves by itself (the charging pill), so the one beside it can still be stopped. */}
        <ActionButton action={toggle.split} onClick={press(toggle.split, onSplit)} onHint={setHovered} disabled={!shown && !split} pressed={split} />
      </div>
      {aside}
      </div>
      <p
        aria-live="polite"
        data-pg-action-caption=""
        className={cn(
          "w-full truncate text-center text-site-muted",
          place === "dock" ? "px-1 text-left text-[12px] leading-4" : "text-[13px] leading-[18px]",
        )}
      >
        {caption === null ? (
          place === "dock" ? ACTIONS_IDLE_TOUCH : ACTIONS_IDLE
        ) : (
          <>
            <span className="font-medium text-site-ink">{ACTION_HELP[caption].label}:</span> {ACTION_HELP[caption].text}
          </>
        )}
      </p>
    </div>
  );
};

const CustomizeButton = ({ open, onClick, compact, buttonRef }: { open: boolean; onClick: () => void; compact: boolean; buttonRef?: Ref<HTMLButtonElement> }) => (
  <button
    ref={buttonRef}
    type="button"
    onClick={onClick}
    aria-expanded={open}
    aria-label={compact ? "Customize" : undefined}
    className={cn(
      "inline-flex h-11 flex-none cursor-pointer items-center justify-center gap-2 rounded-full bg-site-fill text-[14px] font-medium text-site-ink transition-[background-color,scale] duration-150 ease-out hover:bg-site-raised active:scale-[0.96] motion-reduce:transition-none",
      compact ? "w-11" : "px-5",
      open && "bg-site-ink text-site-bg hover:bg-site-ink",
    )}
  >
    <Icon icon={SlidersHorizontalIcon} size={17} strokeWidth={1.8} />
    {compact ? null : "Customize"}
  </button>
);

/* -------------------------------------------------------------------------------------------- */

interface StageProps {
  stageRef: RefObject<HTMLDivElement | null>;
  /** The line under the island: how to open it, or how to bring a dismissed one back. Required. */
  hint: string;
}

/**
 * A dark phone screen's top with the island on it at real size. The screen the island lays out on is a
 * phone's width, centred in a wider surface of the same colour, so an expanded view is as wide as on the
 * hardware however wide the window is.
 */
const Stage = ({ stageRef, hint }: StageProps) => (
  <div
    className="relative isolate h-[206px] w-full overflow-hidden sm:h-[320px] sm:rounded-[32px] sm:shadow-[inset_0_0_0_1px_var(--site-line)]"
    style={{ background: SCREEN, colorScheme: "dark" }}
  >
    <div ref={stageRef} data-pg-stage="" className="relative mx-auto h-full" style={{ width: SCREEN_WIDTH, maxWidth: "100%" }}>
      <Island label="Playground island" keyline="auto" backdrop={SCREEN} />
    </div>
    <p aria-hidden className="pointer-events-none absolute inset-x-0 bottom-5 hidden px-6 text-center text-[13px] text-white/45 sm:block">
      {hint}
    </p>
  </div>
);

/* -------------------------------------------------------------------------------------------- */

interface BodyProps {
  state: PlaygroundState;
  generation: number;
  registryUrl: string;
  shareUrl: string | null;
  setBuild: (update: (build: Build) => Build) => void;
  setSprings: (springs: Springs) => void;
  pickPreset: (key: StarterKey) => void;
  /** The reader changed the build or the motion since they last picked a preset. Required. */
  customized: boolean;
}

const ShowcaseBody = ({ state, generation, registryUrl, shareUrl, setBuild, setSprings, pickPreset, customized }: BodyProps) => {
  const { build } = state;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const island = useIsland();
  const [open, setOpen] = useState(false);
  /*
   * An untouched preset plays its shipped component, the one the home page and the examples run.
   * Customize (or any edit) hands the stage to the region rebuild, which the editor can change.
   */
  const untouched = isRealPreset(build.from) && !customized;
  const real = generation > 0 && untouched && !open;
  const { act, play, splitWith, status: rebuildStatus } = usePlaygroundRuntime({ build, stage: stageRef, generation, opens: state.opens, setBuild, standby: real });
  const reduced = useReducedMotion() === true;
  const [realShown, setRealShown] = useState(true);
  const [realSecond, setRealSecond] = useState(false);
  const status = real ? { presentation: island.presentation, primary: realShown, second: realSecond } : rebuildStatus;

  const [target, setTarget] = useState<Slot>("primary");
  const [region, setRegion] = useState<Region>("compactLeading");
  const [editing, setEditing] = useState<ShapeTransition>("expand");
  const customize = useRef<HTMLButtonElement | null>(null);
  const customizePhone = useRef<HTMLButtonElement | null>(null);
  const panelTitle = useId();
  const stageTop = useRef<HTMLDivElement | null>(null);

  const choice = choiceOf(build.from);
  const expanded = status.presentation === "expanded";
  const names = useMemo(() => buildNames(build.primary, build.second), [build.primary, build.second]);
  const labels = useMemo(() => activityLabels(build.primary, build.second), [build.primary, build.second]);
  const slot: Slot = target === "second" && build.second !== null ? "second" : "primary";
  const activity: ActivitySpec = slot === "second" && build.second !== null ? build.second : build.primary;
  const other = slot === "primary" ? build.second : build.primary;
  const slotNames = slot === "second" && names.second !== null ? names.second : names.primary;
  const suggested = companionKey(build.primary);

  const generated = useMemo(
    () => generateCode({ build, springs: state.springs, reduced: state.reduced, registryUrl }),
    [build, state.springs, state.reduced, registryUrl],
  );

  /*
   * Picking a preset swaps the island in place: the build changes, and the runtime ends the old
   * activity and starts the new one in the same frame, so the engine morphs one pill into the next
   * instead of the page remounting it. What the new preset needs after that (showing it if nothing
   * was running, its second activity, its expanded rest) waits for the commit that brings it.
   */
  const pending = useRef<PendingStart | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const later = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const pick = (key: StarterKey) => {
    if (key === build.from) return;
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    // To or from a shipped component: the stage's hand-off effect below ends and starts what it must.
    if (real || (isRealPreset(key) && !open)) {
      if (expanded) island.collapse();
      if (!real && build.second !== null && rebuildStatus.second) island.end(build.second.id);
      pending.current = null;
      setRealShown(true);
      setRealSecond(false);
      setTarget("primary");
      setRegion("compactLeading");
      pickPreset(key);
      return;
    }
    const next = starterBuild(key);
    // The old split's second activity has no place in the new build.
    if (build.second !== null && status.second) island.end(build.second.id);
    // An open island closes as the new one comes in, so the morph is compact to compact.
    if (expanded) island.collapse();
    pending.current = {
      show: !status.primary,
      second: next.second !== null,
      expand: choiceOf(key).preset?.presentation === "expanded" && next.second === null,
    };
    setTarget("primary");
    setRegion("compactLeading");
    pickPreset(key);
  };

  useEffect(() => {
    const start = pending.current;
    if (start === null) return;
    pending.current = null;
    if (start.show) act("show", "primary");
    if (start.second) later(SPLIT_AFTER_MS, () => act("split", "primary"));
    if (start.expand) later(EXPAND_AFTER_MS, () => act("expand", "primary"));
    // Runs once per picked build; `act` reads the newest build itself.
  }, [build.from, act]);

  /*
   * The hand-off between the shipped component and the rebuild. The component mounts (or unmounts)
   * in the same commit, so the engine ends one activity and starts the other in one frame and
   * morphs the pill, as a preset pick does.
   */
  const wasReal = useRef(false);
  useEffect(() => {
    const before = wasReal.current;
    wasReal.current = real;
    if (before === real) return;
    if (real) {
      const shipped = new Set<string>(Object.values(REAL_IDS));
      for (const activity of island.activities) if (!shipped.has(activity.id) && activity.id !== COMPANION_ID) island.end(activity.id);
      return;
    }
    if (generation === 0 || !realShown) return;
    act("show", "primary");
    if (realSecond) {
      // A Split added on the real stage has no place in the build yet: give the editor the same pair,
      // so the second activity stays on the stage and in the share link.
      if (build.second === null) setBuild((was) => (was.second === null ? { ...was, second: secondFrom(companionKey(was.primary), was.primary) } : was));
      later(SPLIT_AFTER_MS, () => act("split", "primary"));
    }
    // Runs when the stage changes hands; the rest is read as it is then.
  }, [real]);

  // The split preset shows its timer alone first, then its second activity splits the island.
  useEffect(() => {
    if (!real || build.from !== "split") return;
    const timer = window.setTimeout(() => setRealSecond(true), SPLIT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [real, build.from]);

  const realId = isRealPreset(build.from) ? REAL_IDS[build.from] : null;
  const realActions = {
    onShow: () => {
      if (realShown) {
        // A second activity still on its way would land on a dismissed island.
        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current = [];
        setRealSecond(false);
      }
      // The split preset is two activities: Show brings both back, the second a beat after the first, as a pick does.
      else if (build.from === "split") later(SPLIT_AFTER_MS, () => setRealSecond(true));
      setRealShown(!realShown);
    },
    onExpand: () => (expanded ? island.collapse() : realId !== null && island.expand(realId)),
    onHold: () => act("longPress", "primary"),
    onAlert: () => {
      if (realId !== null) island.update(realId, { alert: true });
    },
    onSplit: () => {
      if (realSecond) {
        setRealSecond(false);
        return;
      }
      // The engine splits only a compact island, so an open one closes first and splits on the next frame.
      if (expanded) {
        island.collapse();
        window.requestAnimationFrame(() => setRealSecond(true));
        return;
      }
      setRealSecond(true);
    },
  };

  const onShow = () => {
    if (!status.primary) {
      act("show", "primary");
      return;
    }
    if (status.second) act("unsplit", "second");
    act("dismiss", "primary");
  };
  const onExpand = () => act(expanded ? "collapse" : "expand", "primary");
  const onHold = () => act("longPress", "primary");
  const onAlert = () => act("alert", "primary");
  const onSplit = () => {
    if (status.second) {
      act("unsplit", "second");
      // A second activity the Split button added goes with it, so the code goes back to one activity.
      if (build.from !== "split") setBuild((all) => ({ ...all, second: null }));
      setTarget("primary");
      return;
    }
    if (build.second !== null) {
      act("split", "primary");
      return;
    }
    splitWith(secondFrom(suggested, build.primary));
  };

  /*
   * A press outside an expanded island collapses it, as in an app. Here the actions and the editor are
   * outside it, so every press on the page except the stage stops at the window, before the engine's
   * listener sees it.
   */
  useEffect(() => {
    const guard = (event: PointerEvent) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      if (event.target.closest("[data-pg-picker]") !== null) {
        event.stopPropagation();
        return;
      }
      if (!root.current?.contains(event.target) || stageRef.current?.contains(event.target)) return;
      event.stopPropagation();
    };
    window.addEventListener("pointerdown", guard, true);
    return () => window.removeEventListener("pointerdown", guard, true);
  }, []);

  // Escape closes the editor; focus goes back to the button that opened it.
  const toggle = useCallback((next: boolean) => {
    setOpen(next);
    // On a phone the sheet rises to the pinned stage's foot, so the page first scrolls until the stage is pinned.
    if (next && !window.matchMedia("(min-width: 640px)").matches) {
      const top = (stageTop.current?.getBoundingClientRect().top ?? 0) + window.scrollY - HEADER_PX;
      if (window.scrollY < top) window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    if (!next) {
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      (wide ? customize.current : customizePhone.current)?.focus({ preventScroll: true });
    }
  }, []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") toggle(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, toggle]);

  // Editing: the inspector's handlers, as the playground had them.
  // New words rewrite the spoken labels that are made of them, so the label never names old words;
  // a label typed by hand comes with empty words, which stop that.
  const patchActivity = useCallback(
    (patch: Partial<ActivitySpec>) => {
      const apply = (activity: ActivitySpec) => followWords({ ...activity, ...patch });
      setBuild((all) => (slot === "primary" ? { ...all, primary: apply(all.primary) } : all.second === null ? all : { ...all, second: apply(all.second) }));
    },
    [setBuild, slot],
  );
  const setContent = (at: Region, content: Content) => patchActivity({ regions: withContent({ regions: activity.regions, at, content }) });
  // Picking a region shows the presentation it belongs to, so the edit is visible as you make it.
  const pickRegion = (next: Region) => {
    setRegion(next);
    const running = slot === "primary" ? status.primary : status.second;
    if (!running) return;
    const group = REGION_INFO[next].group;
    if (group === "expanded" && !expanded) act("expand", slot);
    if (group !== "expanded" && expanded) act("collapse", slot);
  };
  const addSecond = (key: ActivityStarter) => {
    const second = secondFrom(key, build.primary);
    if (status.primary) splitWith(second);
    else setBuild((all) => ({ ...all, second }));
    setTarget("second");
    setRegion("compactLeading");
  };
  const removeSecond = () => {
    if (status.second) act("unsplit", "second");
    setBuild((all) => ({ ...all, second: null }));
    setTarget("primary");
  };

  const actions = real ? realActions : { onShow, onExpand, onHold, onAlert, onSplit };
  const left = status.presentation === "idle" || !status.primary;
  // The battery leaves by itself, as the charging indicator does, so its empty stage says why.
  const hint = left
    ? real && build.from === "battery"
      ? "The charging pill shows when you plug in, then goes. Press Show to plug in again."
      : "Dismissed. Press Show to bring it back."
    : "Press and hold the island to open it. Press anywhere else on the stage to close it.";

  // The panel's Copy code copies what the code panel shows: the preset's own usage while untouched, else the generated file.
  const shownCode = untouched && isRealPreset(build.from) ? presetUsage(build.from) : generated.code;
  const empty = wordFields(activity).length === 0 && mainValueOf(activity) === null;

  /*
   * Basics first, for someone trying a preset: its colour, its words, the one value it moves with and
   * the copy actions. The builder's tools (what each region shows, a second activity, the id and
   * spoken label, the springs) sit behind one closed disclosure and work as they always have.
   */
  const editor: ReactNode = (
    <>
      <div className="flex min-w-0 flex-col gap-5 px-5 pt-4 pb-6">
        {build.second !== null && labels.second !== null ? <ActivitySwitch labels={{ primary: labels.primary, second: labels.second }} selected={slot} onSelect={setTarget} /> : null}
        {usesAccent(activity) ? <ActivityAccent activity={activity} onChange={patchActivity} /> : null}
        <WordFields key={`${slot}-${build.from}`} activity={activity} onRegions={(regions) => patchActivity({ regions })} onFocusRegion={pickRegion} />
        <MainValue activity={activity} onChange={patchActivity} />
        {empty ? <p className={hintClass}>Nothing on this island yet. Fill it under Edit layout and motion.</p> : null}
        <CopyActions code={shownCode} shareUrl={shareUrl} />
      </div>
      <Disclosure title="Edit layout and motion" flush>
        <RegionsSection
          activity={activity}
          region={region}
          onRegion={pickRegion}
          onContent={setContent}
          action={<SecondActivity build={build} second={labels.second} suggested={suggested} onAdd={addSecond} onRemove={removeSecond} />}
        >
          <TimerSettings activity={activity} onChange={patchActivity} />
        </RegionsSection>
        <Disclosure title="Id and label" summary={<code className="font-mono">{slotNames.hook}</code>}>
          <ActivityDetails activity={activity} onChange={patchActivity} otherId={other?.id ?? null} names={slotNames} />
        </Disclosure>
        <MotionSection springs={state.springs} editing={editing} onEditing={setEditing} onSprings={setSprings} onPlay={(transition) => void play(transition)} />
      </Disclosure>
    </>
  );

  const slide = reduced ? "none" : `transform ${PANEL_MS}ms ${EASE}, opacity ${PANEL_MS}ms ${EASE}`;

  return (
    <div ref={root} className="relative">
      {real && isRealPreset(build.from) ? (
        <RealPreset slug={build.from} shown={realShown} second={realSecond} onDismiss={() => setRealShown(false)} onDismissSecond={() => setRealSecond(false)} />
      ) : null}
      {/* The page slides left while the panel is open on a wide screen, so the stage stays in view beside it. */}
      <div
        className="mx-auto max-w-[1120px] px-5 pb-[calc(174px+env(safe-area-inset-bottom))] sm:px-8 lg:pb-0"
        style={{ transition: slide }}
        data-pg-shift={open ? "" : undefined}
      >
        {/* Half the panel at most, and never past the window's left edge: the column keeps its left gutter's worth. */}
        <style>{`@media (min-width: 1280px){[data-pg-shift]{transform:translateX(calc(-1 * min(${PANEL_WIDTH / 2}px, (100vw - ${COLUMN.width}px) / 2)))}}${PANEL_GRID_CSS}`}</style>
        <div ref={stageTop} aria-hidden />

        {/* On a phone the stage pins under the header, edge to edge; from sm it is a rounded screen in the column. */}
        <div data-pg-dock="" className="sticky top-16 z-20 -mx-5 bg-site-bg sm:static sm:mx-auto sm:max-w-[760px] sm:bg-transparent">
          <Stage stageRef={stageRef} hint={hint} />
        </div>

        {/* From sm the actions sit under the stage; on a phone they live in the foot bar instead. */}
        <div className="mx-auto mt-5 hidden max-w-[760px] justify-center sm:flex">
          <Actions
            shown={status.primary}
            expanded={expanded}
            split={status.second}
            {...actions}
            aside={<CustomizeButton open={open} onClick={() => toggle(!open)} compact={false} buttonRef={customize} />}
          />
        </div>

        {/* A container, so the grid's columns follow its width when the open panel narrows it. */}
        <div data-pg-grid="" className="@container mt-12 hidden sm:block" style={{ transition: reduced ? "none" : `padding ${PANEL_MS}ms ${EASE}` }}>
          <PresetPicker value={build.from} onPick={pick} layout="grid" />
        </div>

        <section aria-labelledby="pg-preset-title" className="mx-auto mt-8 max-w-[760px] sm:mt-20">
          <div className="mb-6 flex flex-col gap-2">
            <h2 id="pg-preset-title" className="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-site-ink">
              {choice.title}
            </h2>
            <p className="text-[15px] text-pretty text-site-muted">
              {choice.preset?.purpose ?? "An empty activity. Open Customize to fill its regions, one at a time, then copy the code."}
            </p>
            {choice.preset === null ? null : (
              <SiteLink
                href={`${ROUTES.DOCS}/presets/${choice.preset.slug}`}
                className="group mt-1 inline-flex w-fit items-center gap-1 rounded-[8px] text-[15px] font-medium text-site-ink"
              >
                Read the docs
                <Icon icon={ArrowRight01Icon} size={16} strokeWidth={2} className="transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
              </SiteLink>
            )}
          </div>
          <CodePanel generated={generated} from={build.from} registryUrl={registryUrl} usage={untouched && isRealPreset(build.from) ? presetUsage(build.from) : null} />
        </section>
      </div>

      {/* Phone: the presets and the actions pinned to the window's foot, under the thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-site-line bg-site-bg/95 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <PresetPicker value={build.from} onPick={pick} layout="strip" />
        <div className="mt-2 px-4">
          <Actions
            place="dock"
            shown={status.primary}
            expanded={expanded}
            split={status.second}
            {...actions}
            aside={<CustomizeButton open={open} onClick={() => toggle(!open)} compact buttonRef={customizePhone} />}
          />
        </div>
      </div>

      {/*
        The editor: a panel at the window's right edge from lg, a sheet under the pinned stage on a phone, so
        the island stays in view while you edit it. Closed, it is inert and off screen.
      */}
      <aside
        aria-labelledby={panelTitle}
        data-picker-bounds=""
        inert={!open}
        className={cn(
          "fixed z-35 flex flex-col bg-site-bg",
          // Phone and tablet: a sheet from the stage's foot to the window's foot.
          "inset-x-0 bottom-0 top-[270px] rounded-t-[20px] shadow-[0_-1px_0_var(--site-line),0_-12px_40px_rgb(0_0_0/0.18)] sm:top-[96px]",
          // Wide: a panel under the header at the right edge.
          "lg:top-16 lg:left-auto lg:w-[400px] lg:rounded-none lg:shadow-[-1px_0_0_var(--site-line)]",
          open ? "translate-x-0 translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0 lg:translate-x-full lg:translate-y-0",
        )}
        style={{ transition: slide }}
      >
        <div className="flex h-14 flex-none items-center justify-between border-b border-site-line pr-2 pl-5">
          <h2 id={panelTitle} className="text-[17px] font-semibold tracking-[-0.01em] text-site-ink">
            Customize
          </h2>
          <button
            type="button"
            onClick={() => toggle(false)}
            aria-label="Close Customize"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-site-muted transition-[background-color,color] duration-150 hover:bg-site-fill hover:text-site-ink"
          >
            <Icon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">{editor}</div>
      </aside>
    </div>
  );
};

/* -------------------------------------------------------------------------------------------- */

/** The provider sits above the state's consumers so the motion settings reach the stage live. */
const Provider = ({ springs, reduced, children }: { springs: Springs; reduced: boolean; children: ReactNode }) => {
  const motion = useMemo(() => motionOverrides(springs), [springs]);
  return (
    <IslandProvider motion={motion} reducedMotion={reduced ? "always" : "user"}>
      {children}
    </IslandProvider>
  );
};

/** How the address bar follows the page: a plain visit stays plain, a pick names the preset, an edit carries the build. */
type Address = { readonly kind: "plain" } | { readonly kind: "preset" } | { readonly kind: "edited" };

export const Showcase = ({ registryUrl }: { registryUrl: string }) => {
  const [state, setState] = useState<PlaygroundState>(() => initialState());
  // 0 until the URL has been read, so the stage starts once, with the right build.
  const [generation, setGeneration] = useState(0);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [customized, setCustomized] = useState(false);
  const address = useRef<Address>({ kind: "plain" });

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(STATE_PARAM);
    const preset = params.get(PRESET_PARAM);
    // A shared build (`?b=`, old gallery links too) wins; `?preset=` opens a preset as it ships.
    void (raw === null ? Promise.resolve(null) : parseState(raw)).then((parsed) => {
      if (!live) return;
      if (parsed !== null) {
        setState(parsed);
        // A shared build is someone's edit, so it plays as the rebuild that holds it.
        setCustomized(true);
      }
      else if (preset !== null && isStarterKey(preset)) {
        setState(initialState(preset));
        address.current = { kind: "preset" };
      }
      setGeneration(1);
    });
    return () => {
      live = false;
    };
  }, []);

  // The share link follows the build; the address bar follows it once the reader has edited.
  useEffect(() => {
    if (generation === 0) return;
    let live = true;
    const timer = window.setTimeout(() => {
      void encodeState(state).then((encoded) => {
        if (!live) return;
        const base = `${window.location.origin}${window.location.pathname}`;
        const url = `${base}?${STATE_PARAM}=${encoded}`;
        setShareUrl(url);
        const kind = address.current.kind;
        if (kind === "edited") window.history.replaceState(window.history.state, "", url);
        if (kind === "preset") window.history.replaceState(window.history.state, "", `${base}?${PRESET_PARAM}=${state.build.from}`);
      });
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [state, generation]);

  const setBuild = useCallback((update: (build: Build) => Build) => {
    address.current = { kind: "edited" };
    setCustomized(true);
    setState((current) => ({ ...current, build: update(current.build) }));
  }, []);
  const setSprings = useCallback((springs: Springs) => {
    address.current = { kind: "edited" };
    setCustomized(true);
    setState((current) => ({ ...current, springs }));
  }, []);
  // A pick swaps the build without a new generation: the runtime morphs the running island into it.
  const pickPreset = useCallback((key: StarterKey) => {
    address.current = { kind: "preset" };
    setCustomized(false);
    setState((current) => ({ ...current, build: starterBuild(key), opens: "compact" }));
  }, []);

  return (
    <>
      <header className="mx-auto max-w-[1120px] px-5 pt-6 pb-5 sm:px-8 sm:pt-12 sm:pb-8 sm:text-center">
        <h1 className="text-title text-balance">Playground</h1>
        <p className="mt-2 text-body text-balance text-site-muted sm:mx-auto sm:max-w-[34rem]">
          Every preset, live at real size. Pick one, try its actions, then copy the code.
        </p>
      </header>
      <Provider springs={state.springs} reduced={state.reduced}>
        <ShowcaseBody
          state={state}
          generation={generation}
          registryUrl={registryUrl}
          shareUrl={shareUrl}
          setBuild={setBuild}
          setSprings={setSprings}
          pickPreset={pickPreset}
          customized={customized}
        />
      </Provider>
    </>
  );
};
