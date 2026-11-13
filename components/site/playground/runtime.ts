"use client";

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TickingTimeSource } from "@/components/islandcn/ticking-time";
import { type ShapeTransition, islandMotion, useIsland } from "@/lib/island";

import { accentColor, activityLabels, buildNames, stageContent, timerName } from "./activity";
import type { RenderValues } from "./content";
import { type ActivitySpec, type Build, type ButtonSpec, companionFor, spokenLabel, usesProgress, usesTimer } from "./model";
import type { OpenView } from "./url-state";

/*
 * Drives the stage's island from the build: every action is the engine call
 * the generated hook makes, and the log shows that call in the hook's words.
 */

export type Slot = "primary" | "second";

export interface LogEntry {
  readonly id: number;
  readonly text: string;
  /** The activity the call was made on, so each activity's chip shows its own last call. */
  readonly slot: Slot;
  /**
   * What the tabs called that activity when the call was made ("Now playing"), so the readout's
   * chip names it even once it has left the build: Unsplit's call outlives the second activity.
   */
  readonly on: string;
}

/** The last call on each activity, and the last call of all (which says the island has started). */
export interface CallLog {
  readonly primary: LogEntry | null;
  readonly second: LogEntry | null;
  readonly last: LogEntry | null;
}

const EMPTY_LOG: CallLog = { primary: null, second: null, last: null };

/** A collapse the page made because the reader scrolled to the code (`foldForReading`), until they leave it. */
interface ReadingFold {
  /** The fold's readout line. Once another line follows it, the reader has acted and the fold stands. */
  readonly entry: number;
  readonly slot: Slot;
  readonly activityId: string;
  /** The readout before the fold, which unfolding puts back. */
  readonly before: CallLog;
  /** The collapse call the fold logged, without its note. */
  readonly call: string;
  /** What had opened the island: an alert closes by itself, so leaving never reopens it. */
  readonly opener: { readonly kind: "open" } | { readonly kind: "alert"; readonly call: string };
  /** Opened by hand since (a tap on the island writes no line): the reader's island now, not the page's. */
  touched: boolean;
}

/** How long an alert stays open before the engine collapses it, rounded for the call log. */
const ALERT_SECONDS = Math.round(islandMotion.alertHold);

export type ActionName = "show" | "update" | "expand" | "collapse" | "longPress" | "alert" | "split" | "unsplit" | "dismiss";

/** How long a fresh split takes to form before the expanded view a gallery link asked for opens over it. */
const SPLIT_SETTLE_MS = 700;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const timerSource = (activity: ActivitySpec, anchor: number): TickingTimeSource =>
  activity.timer.mode === "countdown"
    ? { kind: "remaining", until: anchor + activity.timer.seconds * 1000 }
    : { kind: "elapsed", since: anchor - activity.timer.seconds * 1000 };

/** The argument the generated `show()` and `update()` take, as the log prints it. */
const stateArgument = (activity: ActivitySpec) => {
  const fields = [
    usesProgress(activity) ? `progress: ${Number(activity.progress.toFixed(2))}` : null,
    usesTimer(activity) ? (activity.timer.mode === "countdown" ? "endsAt" : "startedAt") : null,
  ].filter((field): field is string => field !== null);
  return fields.length === 0 ? "" : `{ ${fields.join(", ")} }`;
};

/** The next progress for Update: a visible step, wrapping back near the start once full. */
const nextProgress = (progress: number) => (progress >= 0.999 ? 0.1 : Math.min(1, Math.round((progress + 0.15) * 100) / 100));

interface RuntimeOptions {
  build: Build;
  stage: RefObject<HTMLDivElement | null>;
  /** Changes when a new build should start fresh: a new starting point, or a link opened. */
  generation: number;
  /** The view a fresh build opens in: a gallery link that showed it expanded opens it expanded. */
  opens: OpenView;
  setBuild: (update: (build: Build) => Build) => void;
  /**
   * The stage plays the shipped preset instead of the build (the showcase before Customize), so a
   * fresh build or a renamed activity starts nothing. Defaults to false.
   */
  standby?: boolean;
}

export const usePlaygroundRuntime = ({ build, stage, generation, opens, setBuild, standby = false }: RuntimeOptions) => {
  const island = useIsland();
  const [anchors, setAnchors] = useState<Record<Slot, number>>(() => ({ primary: Date.now(), second: Date.now() }));
  const [log, setLog] = useState<CallLog>(EMPTY_LOG);
  const logId = useRef(0);

  // The latest values for callbacks that outlive a render: island content, timers and the readout.
  const latest = useRef({ build, anchors, island, opens, log, standby });
  latest.current = { build, anchors, island, opens, log, standby };

  /**
   * Logs a call on `slot`; `alsoOn` shows it on the other activity's line too. `from` is the build
   * the call is made on, when it is newer than the last render's (a split adding its second).
   */
  const write = useCallback((slot: Slot, text: string, { alsoOn, from }: { alsoOn?: Slot; from?: Build } = {}) => {
    logId.current += 1;
    const made = from ?? latest.current.build;
    const names = activityLabels(made.primary, made.second);
    const entry: LogEntry = { id: logId.current, text, slot, on: (slot === "primary" ? names.primary : names.second) ?? names.primary };
    setLog((all) => ({ ...all, [slot]: entry, ...(alsoOn === undefined ? {} : { [alsoOn]: entry }), last: entry }));
  }, []);

  /*
   * An alert closes by itself after `alertHold`. Until then its line says it will; once the island
   * has opened and closed again, the same line says it closed, so the readout never shows an alert
   * call as if the alert were still up. Only while that alert is still its activity's last call.
   */
  const alerting = useRef<{ slot: Slot; id: number; call: string; at: number; opened: boolean } | null>(null);
  useEffect(() => {
    const watch = alerting.current;
    if (watch === null) return;
    if (island.presentation === "expanded") {
      watch.opened = true;
      return;
    }
    if (!watch.opened) return;
    alerting.current = null;
    // Closed at the hold's end, or sooner by a press outside the island.
    const held = (performance.now() - watch.at) / 1000 >= islandMotion.alertHold - 0.5;
    logId.current += 1;
    const id = logId.current;
    const text = `${watch.call} ${held ? `${ALERT_CLOSED_NOTE} after ${ALERT_SECONDS} s` : ALERT_CLOSED_NOTE}`;
    setLog((all) => {
      const entry = all[watch.slot];
      if (entry === null || entry.id !== watch.id) return all;
      const next: LogEntry = { id, text, slot: watch.slot, on: entry.on };
      return { ...all, [watch.slot]: next, last: all.last?.id === entry.id ? next : all.last };
    });
  }, [island.presentation]);

  // The activity the playground last opened (Expand, Hold or Alert): the one an automatic fold closes.
  const opened = useRef<Slot>("primary");

  const running = useCallback((id: string) => latest.current.island.activities.some((activity) => activity.id === id), []);

  const specOf = (slot: Slot, from: Build = latest.current.build) => (slot === "primary" ? from.primary : from.second);

  /** The name the generated example gives the slot's hook result, so the log reads like the copied file. */
  const localOf = (slot: Slot, from: Build = latest.current.build) => {
    const names = buildNames(from.primary, from.second);
    return (slot === "primary" ? names.primary : names.second)?.local ?? "activity";
  };

  const pressButton = useCallback(
    (slot: Slot, button: ButtonSpec) => {
      const activity = specOf(slot);
      if (!activity) return;
      const local = localOf(slot);
      switch (button.action) {
        case "collapse":
          latest.current.island.collapse();
          write(slot, `// ${button.label}: island.collapse()`);
          return;
        case "dismiss":
          latest.current.island.end(activity.id);
          write(slot, `// ${button.label}: island.end("${activity.id}")`);
          return;
        case "none":
          write(slot, `// ${button.label} pressed in ${local}: your app's action runs here`);
          return;
        default: {
          const exhaustive: never = button.action;
          return exhaustive;
        }
      }
    },
    [write],
  );

  const valuesFor = useCallback(
    (slot: Slot, activity: ActivitySpec, anchor: number): RenderValues => ({
      accent: accentColor(activity),
      progress: activity.progress,
      timer: timerSource(activity, anchor),
      onButton: (button) => pressButton(slot, button),
    }),
    [pressButton],
  );

  /** Starts an activity with the spec given (or the slot's), resetting its timer. */
  const start = useCallback(
    (slot: Slot, given?: ActivitySpec, options: { alert?: boolean } = {}) => {
      const { build: current, island: api } = latest.current;
      const activity = given ?? specOf(slot, current);
      if (!activity) return;
      const now = Date.now();
      setAnchors((all) => ({ ...all, [slot]: now }));
      const split = current.second !== null || given !== undefined;
      api.start({
        id: activity.id,
        label: spokenLabel(activity),
        priority: split ? (slot === "primary" ? 1 : 0) : undefined,
        alert: options.alert,
        ...stageContent(activity, valuesFor(slot, activity, now)),
      });
    },
    [valuesFor],
  );

  // The second activity's show that waits one frame behind a collapse (`splitIn`), until it runs.
  const pendingShow = useRef(0);
  const cancelPendingShow = useCallback(() => {
    window.cancelAnimationFrame(pendingShow.current);
    pendingShow.current = 0;
  }, []);
  useEffect(() => cancelPendingShow, [cancelPendingShow]);

  // The accent each slot last drew, so a new colour from the swatches crossfades instead of snapping.
  const lastAccent = useRef<Record<Slot, string | null>>({ primary: null, second: null });
  // Edits reach a running activity as in-place updates, as the hook's update() does.
  const updateRunning = useCallback(
    (slot: Slot) => {
      const { anchors: anchor, island: api } = latest.current;
      const activity = specOf(slot);
      if (!activity || !running(activity.id)) return;
      const accent = accentColor(activity);
      const recoloured = lastAccent.current[slot] !== null && lastAccent.current[slot] !== accent;
      lastAccent.current[slot] = accent;
      // Only a colour change crossfades: words and values keep updating in place, digits turning over.
      api.update(activity.id, {
        label: spokenLabel(activity),
        ...stageContent(activity, valuesFor(slot, activity, anchor[slot])),
        ...(recoloured ? { transition: "crossfade" as const } : {}),
      });
    },
    [running, valuesFor],
  );
  useEffect(() => updateRunning("primary"), [build.primary, anchors.primary, updateRunning]);
  useEffect(() => updateRunning("second"), [build.second, anchors.second, updateRunning]);

  // A renamed activity is a new activity: the old id ends and the new one starts.
  const lastIds = useRef<Record<Slot, string | null>>({ primary: build.primary.id, second: build.second?.id ?? null });
  useEffect(() => {
    for (const slot of ["primary", "second"] as const) {
      const id = specOf(slot)?.id ?? null;
      const previous = lastIds.current[slot];
      lastIds.current[slot] = id;
      if (latest.current.standby) continue;
      if (previous === null || id === null || previous === id || !running(previous)) continue;
      latest.current.island.end(previous);
      start(slot);
    }
  }, [build.primary.id, build.second?.id, running, start]);

  // A fresh build ends what runs and shows the new one, the split one after the other.
  useEffect(() => {
    if (generation === 0 || latest.current.standby) return;
    let cancelled = false;
    const run = async () => {
      cancelPendingShow();
      const api = latest.current.island;
      const live = api.activities.map((activity) => activity.id);
      for (const id of live) api.end(id);
      // The old build's calls go with it; the last call of all stays, so the actions don't grey out while the new one starts.
      setLog((all) => ({ primary: null, second: null, last: all.last }));
      await wait(live.length > 0 ? 650 : 350);
      if (cancelled) return;
      start("primary");
      const { primary, second } = latest.current.build;
      write("primary", `${localOf("primary")}.show(${stateArgument(primary)})`);
      // Opened expanded (an incoming call, ringing): it appears straight into its expanded view, as an alert does.
      if (latest.current.opens === "expanded" && second === null) {
        latest.current.island.expand(primary.id);
        write("primary", `${localOf("primary")}.expand()`);
      }
      // Any second activity in the build starts too, whatever the starting point: a shared link restores a custom split.
      if (second === null) return;
      await wait(1100);
      if (cancelled) return;
      start("second");
      write("second", `${localOf("second")}.show(${stateArgument(second)})`);
      // A split the gallery showed expanded opens with its first activity expanded, as the gallery's still holds it.
      if (latest.current.opens !== "expanded") return;
      await wait(SPLIT_SETTLE_MS);
      if (cancelled) return;
      latest.current.island.expand(primary.id);
      write("primary", `${localOf("primary")}.expand()`);
    };
    void run();
    return () => {
      cancelled = true;
    };
    // Only a new generation restarts the stage (start and write are stable); edits update in place.
  }, [cancelPendingShow, generation, start, write]);

  /** Presses and holds the pill (or the bubble) with real pointer events, so the engine runs its own long-press. */
  const longPress = useCallback(
    (slot: Slot) => {
      const root = stage.current;
      const activity = specOf(slot);
      if (!root || !activity) return;
      const splitShown = latest.current.island.presentation === "minimal";
      const target = slot === "second" && splitShown ? "bubble" : "pill";
      const hit = root.querySelector<HTMLButtonElement>(`[data-islandcn-hit="${target}"]`);
      if (!hit) return;
      const init: PointerEventInit = { bubbles: true, cancelable: true, button: 0, buttons: 1, pointerId: 41, pointerType: "touch", isPrimary: true };
      hit.dispatchEvent(new PointerEvent("pointerdown", init));
      window.setTimeout(() => hit.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 })), 420);
    },
    [stage],
  );

  /**
   * Shows the second activity (`given`, or the build's), which splits the island. The engine only
   * splits a compact island; an expanded one held its expanded view and the second activity waited
   * unseen, so a Split pressed there read as broken. From expanded it collapses first and shows the
   * second activity on the next frame, in a commit of its own. In one commit the engine ran its
   * collapse into the split (`collapseSplit`), whose attached content steps 5 pt toward the bubble
   * 0.52 s in (`partStep`, fitted to split-collapse-b): in the playground's pills that read as a
   * pop, and the timer's last digit was cut on the step frame (council 20; the lab's
   * `interrupt-split-from-expanded` repeats it). A frame apart, the island turns from its collapse
   * into an ordinary split, whose content lands once where it rests. The readout prints both calls.
   */
  const splitIn = useCallback(
    (given: ActivitySpec | undefined, next: Build) => {
      const second = given ?? next.second;
      if (second === null) return;
      const api = latest.current.island;
      const expanded = api.presentation === "expanded";
      cancelPendingShow();
      if (expanded) {
        api.collapse();
        pendingShow.current = window.requestAnimationFrame(() => {
          pendingShow.current = 0;
          start("second", given);
        });
      } else {
        start("second", given);
      }
      const calls = splitCalls({ collapseFirst: expanded, first: localOf("primary", next), second: localOf("second", next), argument: stateArgument(second) });
      if (calls.first !== null) write("primary", calls.first, { from: next });
      write("second", calls.second, { from: next });
    },
    [cancelPendingShow, start, write],
  );

  const act = useCallback(
    (action: ActionName, slot: Slot) => {
      // A show still waiting behind a collapse belongs to the Split before this press.
      cancelPendingShow();
      const { build: current, island: api } = latest.current;
      const activity = specOf(slot, current);
      if (!activity) {
        if (action !== "split") return;
      }
      const local = activity ? localOf(slot, current) : "";
      switch (action) {
        case "show":
          if (!activity) return;
          start(slot);
          write(slot, `${local}.show(${stateArgument(activity)})`);
          return;
        case "update": {
          if (!activity) return;
          if (usesProgress(activity)) {
            const progress = nextProgress(activity.progress);
            setBuild((all) => patchSlot(all, slot, { progress }));
            write(slot, `${local}.update({ progress: ${progress}${usesTimer(activity) ? `, ${timerName(activity)}` : ""} })`);
            return;
          }
          if (usesTimer(activity)) {
            if (activity.timer.mode === "countdown") {
              setBuild((all) => patchSlot(all, slot, { timer: { ...activity.timer, seconds: activity.timer.seconds + 60 } }));
              write(slot, `${local}.update({ endsAt: endsAt + 60_000 })`);
            } else {
              setAnchors((all) => ({ ...all, [slot]: Date.now() + activity.timer.seconds * 1000 }));
              write(slot, `${local}.update({ startedAt: Date.now() })`);
            }
          }
          return;
        }
        case "expand":
          if (!activity) return;
          api.expand(activity.id);
          opened.current = slot;
          write(slot, `${local}.expand()`);
          return;
        case "collapse":
          api.collapse();
          write(slot, `${local}.collapse()`);
          return;
        case "longPress":
          longPress(slot);
          opened.current = slot;
          write(slot, "// Long-press: the pill swells, then expands");
          return;
        case "alert":
          if (!activity) return;
          api.update(activity.id, { ...stageContent(activity, valuesFor(slot, activity, latest.current.anchors[slot])), alert: true });
          opened.current = slot;
          // The engine holds an alert open for `alertHold`, then collapses it by itself; the log says so, so nobody waits on a Collapse.
          write(slot, `${local}.alert(${stateArgument(activity)}) // open ${ALERT_SECONDS} s, then closes`);
          alerting.current = { slot, id: logId.current, call: `${local}.alert(${stateArgument(activity)})`, at: performance.now(), opened: api.presentation === "expanded" };
          return;
        case "split": {
          // The action bar asks which second activity to add (`splitWith`); only a motion preview gets here without one.
          const second = current.second ?? companionFor(current.primary);
          if (current.second === null) setBuild((all) => ({ ...all, second }));
          splitIn(current.second === null ? second : undefined, { ...current, second });
          return;
        }
        case "unsplit":
          if (!current.second) return;
          api.end(current.second.id);
          // The actions go back to the first activity after an unsplit (playground.tsx); its line shows the call that ended the second.
          write("second", `${localOf("second", current)}.dismiss()`, { alsoOn: "primary" });
          return;
        case "dismiss":
          if (!activity) return;
          api.end(activity.id);
          write(slot, `${local}.dismiss()`);
          return;
        default: {
          const exhaustive: never = action;
          return exhaustive;
        }
      }
    },
    [cancelPendingShow, longPress, setBuild, splitIn, start, valuesFor, write],
  );

  /** Adds `second` as the build's second activity and shows it, which splits the island. */
  const splitWith = useCallback(
    (second: ActivitySpec) => {
      const next = { ...latest.current.build, second };
      setBuild((all) => ({ ...all, second }));
      splitIn(second, next);
    },
    [setBuild, splitIn],
  );

  /*
   * The fold `foldForReading` made, until the reader leaves the code. Leaving undoes it, so the island
   * the page folded opens again and the readout drops "folded while you read the code", which is only
   * true while the code is on screen. Anything the reader did in between (a press that wrote a line)
   * stands instead.
   */
  const readingFold = useRef<ReadingFold | null>(null);
  // An island opened by hand while the reader is in the code (a tap on it writes no line) is the reader's to close.
  useEffect(() => {
    if (readingFold.current !== null && island.presentation === "expanded") readingFold.current.touched = true;
  }, [island.presentation]);

  /**
   * Collapses an expanded island because the reader has scrolled to the code on a phone, where the
   * pinned strip held a 330 px expanded view over it. A real `collapse()`, so the stage, the actions
   * and the readout agree; its line says why it happened. Returns whether it collapsed anything.
   */
  const foldForReading = useCallback(() => {
    const { build: current, island: api, log: before } = latest.current;
    if (api.presentation !== "expanded") return false;
    const slot = opened.current === "second" && current.second !== null && running(current.second.id) ? "second" : "primary";
    const activity = specOf(slot, current);
    if (!activity) return false;
    // An alert open when the page folds it: its line still says it will close, so the fold takes its place.
    const alert = alerting.current !== null && alerting.current.slot === slot && before[slot]?.id === alerting.current.id ? alerting.current.call : null;
    api.collapse();
    const call = `${localOf(slot, current)}.collapse()`;
    write(slot, `${call} ${READING_CODE_NOTE}`);
    readingFold.current = { entry: logId.current, slot, activityId: activity.id, before, call, opener: alert === null ? { kind: "open" } : { kind: "alert", call: alert }, touched: false };
    return true;
  }, [running, write]);

  /** The reader has left the code: undoes the page's fold if nothing has happened since. Returns whether it reopened the island. */
  const leaveReading = useCallback(() => {
    const fold = readingFold.current;
    readingFold.current = null;
    if (fold === null) return false;
    const { island: api, log: now } = latest.current;
    // What the fold's line says once the reader is out of the code: the alert closed, or a plain collapse.
    const settledText = fold.opener.kind === "alert" ? `${fold.opener.call} ${ALERT_CLOSED_NOTE}` : fold.call;
    // A press since the fold wrote its own line: that choice stands. The press may have been on the
    // other activity (Split from the code), so the fold's chip can still carry the note; drop it there.
    if (now.last?.id !== fold.entry) {
      setLog((all) => {
        const line = all[fold.slot];
        return line?.id === fold.entry ? { ...all, [fold.slot]: { ...line, text: settledText } } : all;
      });
      return false;
    }
    /** Puts `entry` in the fold line's place, on its activity's chip and as the last call. */
    const replaceFold = (entry: LogEntry | null) =>
      setLog((all) => (all.last?.id === fold.entry ? { ...all, [fold.slot]: entry, last: entry } : all));
    const foldLine = now[fold.slot];
    const reopen = !fold.touched && running(fold.activityId) && (api.presentation === "compact" || api.presentation === "minimal");
    switch (fold.opener.kind) {
      case "alert":
        // An alert would have closed by itself by now; it stays closed, and its line says so.
        replaceFold(foldLine === null ? null : { ...foldLine, text: `${fold.opener.call} ${ALERT_CLOSED_NOTE}` });
        return false;
      case "open":
        if (!reopen) {
          // Opened by hand and closed again, or ended: the collapse stays, without the note.
          replaceFold(foldLine === null ? null : { ...foldLine, text: fold.call });
          return false;
        }
        api.expand(fold.activityId);
        opened.current = fold.slot;
        // The readout goes back to the line it showed before the fold (the Expand or Hold that opened it).
        setLog((all) => (all.last?.id === fold.entry ? fold.before : all));
        return true;
      default: {
        const exhaustive: never = fold.opener;
        return exhaustive;
      }
    }
  }, [running]);

  /** Plays a transition so its spring can be judged: the shortest run of actions that ends in it. */
  const playing = useRef(0);
  const play = useCallback(
    async (transition: ShapeTransition) => {
      playing.current += 1;
      const token = playing.current;
      // A playback still waiting when the stage hands back to the shipped preset (standby) is dropped,
      // so a late start can't add a second activity beside it.
      const live = () => token === playing.current && !latest.current.standby;
      const { build: current, island: api } = latest.current;
      const primaryOn = running(current.primary.id);
      const ensurePrimary = async () => {
        if (running(latest.current.build.primary.id)) return;
        act("show", "primary");
        await wait(900);
      };
      const ensureCompact = async () => {
        if (latest.current.island.presentation !== "expanded") return;
        act("collapse", "primary");
        await wait(900);
      };
      switch (transition) {
        case "appear":
        case "appearExpand":
          if (primaryOn) {
            act("dismiss", "primary");
            await wait(800);
          }
          if (!live()) return;
          start("primary", undefined, { alert: transition === "appearExpand" });
          write("primary", transition === "appearExpand" ? `island.start({ id: "${current.primary.id}", alert: true, ... })` : `${localOf("primary", current)}.show(${stateArgument(current.primary)})`);
          return;
        case "expand":
          await ensurePrimary();
          await ensureCompact();
          if (live()) act("expand", "primary");
          return;
        case "pressExpand":
          await ensurePrimary();
          await ensureCompact();
          if (live()) act("longPress", "primary");
          return;
        case "collapse":
          await ensurePrimary();
          if (api.presentation !== "expanded") {
            act("expand", "primary");
            await wait(1000);
          }
          if (live()) act("collapse", "primary");
          return;
        case "alertCollapse":
          await ensurePrimary();
          await ensureCompact();
          if (live()) act("alert", "primary");
          return;
        case "split":
        case "unsplit":
        case "swap":
        case "collapseSplit": {
          await ensurePrimary();
          await ensureCompact();
          const second = latest.current.build.second;
          const secondOn = second !== null && running(second.id);
          if (transition === "unsplit") {
            if (!secondOn) {
              act("split", "primary");
              await wait(1300);
            }
            if (live()) act("unsplit", "second");
            return;
          }
          if (transition === "split" && secondOn) {
            act("unsplit", "second");
            await wait(1000);
          }
          if (!live()) return;
          if (transition === "split" || !secondOn) {
            act("split", "primary");
            if (transition === "split") return;
            await wait(1300);
          }
          if (!live()) return;
          if (transition === "swap") {
            act("expand", "second");
            return;
          }
          act("expand", "primary");
          await wait(1000);
          if (live()) act("collapse", "primary");
          return;
        }
        case "dismiss":
          await ensurePrimary();
          if (!live()) return;
          for (const activity of latest.current.island.activities) latest.current.island.end(activity.id);
          write("primary", `${localOf("primary", current)}.dismiss()`);
          return;
        case "resize":
          return;
        default: {
          const exhaustive: never = transition;
          return exhaustive;
        }
      }
    },
    [act, running, start, write],
  );

  const status = useMemo(() => {
    const ids = new Set(island.activities.map((activity) => activity.id));
    return {
      presentation: island.presentation,
      primary: ids.has(build.primary.id),
      second: build.second !== null && ids.has(build.second.id),
    };
  }, [island.activities, island.presentation, build.primary.id, build.second]);

  return { act, play, splitWith, foldForReading, leaveReading, log, status, activities: island.activities };
};

/**
 * The calls a split makes, as the readout prints them: the second activity's show, and before it,
 * when the island was expanded, the collapse that lets it split (see `splitIn`). `first` is the
 * line for the first activity's chip; `second` carries both calls in order for the second's.
 */
export const splitCalls = ({ collapseFirst, first, second, argument }: { collapseFirst: boolean; first: string; second: string; argument: string }) => {
  const collapse = `${first}.collapse()`;
  const show = `${second}.show(${argument}) ${SPLIT_NOTE}`;
  return { first: collapseFirst ? collapse : null, second: collapseFirst ? `${collapse}${CALLS_SEPARATOR}${show}` : show };
};

/** Between two calls on one readout line. */
export const CALLS_SEPARATOR = "; ";

/** The comment a split's show gets. */
export const SPLIT_NOTE = "// splits the island";

/** The note the readout gives a collapse made because the reader scrolled to the code; the strip keeps it. */
export const READING_CODE_NOTE = "// folded while you read the code";

/** The note an alert's line gets once the alert has closed; the readout keeps it on a phone. */
export const ALERT_CLOSED_NOTE = "// closed";

const patchSlot = (build: Build, slot: Slot, patch: Partial<ActivitySpec>): Build =>
  slot === "primary" ? { ...build, primary: { ...build.primary, ...patch } } : build.second === null ? build : { ...build, second: { ...build.second, ...patch } };
