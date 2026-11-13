import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { devToolsEnabled, sequenceDirs } from "@/app/api/dev/dirs";
import { shapeTransitions } from "@/lib/island";

import { LabStage, type LabSettings } from "./lab-stage";
import { builtInSequence, onTake, parseSequenceSpec, type SequenceSpec, sequenceNames, takeTimeline } from "./spec";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "islandcn lab", robots: { index: false } };

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const readSpec = async (name: string): Promise<SequenceSpec | null> => {
  for (const dir of sequenceDirs()) {
    try {
      const raw: unknown = JSON.parse(await readFile(path.join(dir, `${name}.json`), "utf8"));
      return parseSequenceSpec(name, raw);
    } catch {
      // Missing or unreadable: try the next folder, then the built-in.
    }
  }
  return builtInSequence(name);
};

const parseColour = (value: string | undefined, fallback: string) => {
  // The reference's backdrop unless the URL asks for another stage colour.
  if (!value) return fallback;
  if (/^[0-9a-f]{3,8}$/i.test(value)) return `#${value}`;
  if (/^#[0-9a-f]{3,8}$/i.test(value) || /^[a-z]+$/i.test(value)) return value;
  return "#ffffff";
};

const parseScreen = (value: string | undefined): LabSettings["screen"] => {
  if (value === "viewport") return "viewport";
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(value ?? "");
  if (!match) return { width: 402, height: 874 };
  return { width: Number(match[1]), height: Number(match[2]) };
};

/** "0.5,0.8" overrides every shape spring with that response and damping, for A/B captures. */
const parseSpring = (value: string | undefined) => {
  const match = /^(\d*\.?\d+),(\d*\.?\d+)$/.exec(value ?? "");
  if (!match) return null;
  return { response: Number(match[1]), dampingFraction: Number(match[2]) };
};

const contentKeys = ["blur", "enterBlur", "scale", "fade", "exitFade", "bubbleDelay", "trailingDelay", "trailingExitPower", "anchor", "sharpen", "leadingFade", "bubbleScale", "bubbleSpread", "bubbleStretch", "bubbleBlur", "bubbleSharpen", "centerDelay", "bubbleBlurMax", "bubbleLead", "bubbleLeadRamp", "bubbleLeadPower", "bubbleExitSlide", "bubbleExitSlidePower", "bubbleOrigin", "bubbleHold", "bubbleResolve", "bubbleFade", "exitScale", "enterScale", "enterSqueeze", "enterSqueezeOrigin", "enterNarrow", "trailingSlide", "trailingSlidePower", "enterClear", "trailingEnterClear", "clipFollow", "exitBlur", "bubbleExitBlur", "exitSharpen", "rowAnchor", "bubbleCap", "bubbleTrailingFade", "trailingEnterBlur", "trailingScale", "enterGlow", "bottomAnchor", "trailingExitAnchor", "follow"] as const;
const springKeys = {
  enterResponse: ["enter", "response"],
  enterDelay: ["enter", "delay"],
  exitResponse: ["exit", "response"],
  exitDelay: ["exit", "delay"],
  enterDamping: ["enter", "dampingFraction"],
  exitDamping: ["exit", "dampingFraction"],
  bubbleExitResponse: ["bubbleExit", "response"],
  bubbleExitDelay: ["bubbleExit", "delay"],
  bubbleEnterResponse: ["bubbleEnter", "response"],
  bubbleEnterDelay: ["bubbleEnter", "delay"],
  bubbleEnterDamping: ["bubbleEnter", "dampingFraction"],
  trailingEnterResponse: ["trailingEnter", "response"],
  trailingEnterDelay: ["trailingEnter", "delay"],
  trailingEnterDamping: ["trailingEnter", "dampingFraction"],
} as const;

const regionNames = { Leading: "leading", Center: "center", Trailing: "trailing", Bottom: "bottom" } as const;
type RegionOverrides = Partial<Record<(typeof regionNames)[keyof typeof regionNames], { fade?: number; blur?: number; soften?: number; lead?: number; peak?: number; scale?: number; lift?: number; power?: number }>>;

/** The lab key's field name to the `RegionLag` field it sets. */
const regionFields = { Fade: "fade", Blur: "blur", Soften: "soften", Lead: "lead", Peak: "peak", Scale: "scale", Lift: "lift", Power: "power" } as const satisfies Record<string, keyof NonNullable<RegionOverrides["leading"]>>;

/** `regionCenterFade=0.05` (or `absorbRegionCenterFade=`, `handoffRegionCenterFade=`) sets one region's lag in `regions`. */
const regionKey = /^(absorb|handoff)?[rR]egion(Leading|Center|Trailing|Bottom)(Fade|Blur|Soften|Lead|Peak|Scale|Lift|Power)$/;

/** `exitRegionCenterFade=1.3` sets one leaving region's fade power (`regionExitFade`). */
const exitRegionKey = /^exitRegion(Leading|Center|Trailing|Bottom)Fade$/;

/** `bottomAnchorLeading=-0.05` sets one region's own `bottomAnchor` (`regionBottomAnchor`). */
const regionAnchorKey = /^bottomAnchor(Leading|Center|Trailing|Bottom)$/;

/**
 * "dismiss:blur=4,anchor=1,exitResponse=0.25" overrides one transition's content timing, for A/B
 * captures. `bubbleExitResponse=0` cuts the bubble's content as it joins. `regionCenterFade=0.05`,
 * `regionLeadingBlur=0.02` set the expanded regions' lags; `absorbRegion...`, `absorbCenterDelay`,
 * `absorbEnterResponse` and `absorbEnterDelay` the same for a change that absorbs the bubble;
 * `handoffEnterResponse`, `handoffEnterDelay`, `handoffFade` and `handoffRegion...` set `afterHandoff`;
 * `alertEnterDelay`, `alertBubbleDelay`, `alertBubbleTrailingFade`, `alertBubbleEnterResponse`, `alertBubbleScale`,
 * `bubbleExitAccent=1`, `trailingRide` (with `trailingRideMax`), `bubbleTrailingSlide` (with `bubbleTrailingSlidePower`), `bubbleTrailingBlur` (with `bubbleTrailingBlurPower`), `partStep` (with `partStepAt`, `partStepResponse`, `partStepDamping`), `alertBubbleSpread`, `alertBubbleHold`, `alertBubbleSettle` (its depth, with `alertBubbleSettleResponse`,
 * `alertBubbleSettleDamping`, `alertBubbleSettleDelay`) and the like set `afterAlert`.
 */
const parseContent = (value: string | undefined): LabSettings["content"] => {
  const [, name, pairs] = /^([a-zA-Z]+):(.+)$/.exec(value ?? "") ?? [];
  const transition = shapeTransitions.find((candidate) => candidate === name);
  if (!transition || !pairs) return null;
  const numbers: Partial<Record<(typeof contentKeys)[number], number>> = {};
  const springs: Record<"enter" | "exit" | "bubbleExit" | "bubbleEnter" | "trailingEnter", { response?: number; delay?: number; dampingFraction?: number }> = { enter: {}, exit: {}, bubbleExit: {}, bubbleEnter: {}, trailingEnter: {} };
  const regions: RegionOverrides = {};
  const exitFades: Partial<Record<(typeof regionNames)[keyof typeof regionNames], number>> = {};
  const regionAnchors: Partial<Record<(typeof regionNames)[keyof typeof regionNames], number>> = {};
  const absorbRegions: RegionOverrides = {};
  const handoffRegions: RegionOverrides = {};
  const ride: { by?: number; max?: number } = {};
  const textSlide: { by?: number; power?: number } = {};
  const textBlur: { by?: number; power?: number } = {};
  let accentOnly: boolean | undefined;
  const part: { at?: number; by?: number; response?: number; dampingFraction?: number } = {};
  const handoff: { enter: { response?: number; dampingFraction?: number; delay?: number }; fade?: number } = { enter: {} };
  const absorb: { enter: { response?: number; dampingFraction?: number; delay?: number }; centerDelay?: number; exitFade?: number; exitSharpen?: number } = { enter: {} };
  const alert: {
    enter: { response?: number; dampingFraction?: number; delay?: number };
    bubbleEnter: { response?: number; dampingFraction?: number; delay?: number };
    bubbleSettle: { depth?: number; response?: number; dampingFraction?: number; delay?: number };
    bubbleDelay?: number;
    bubbleFade?: number;
    bubbleResolve?: number;
    bubbleTrailingFade?: number;
    bubbleBlur?: number;
    bubbleSharpen?: number;
    bubbleScale?: number;
    bubbleSpread?: number;
    bubbleHold?: number;
    bubbleTrailingSlide?: { by: number; power: number };
  } = { enter: {}, bubbleEnter: {}, bubbleSettle: {} };
  for (const pair of pairs.split(",")) {
    const [key, raw] = pair.split("=");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    const plain = contentKeys.find((name) => name === key);
    if (plain) numbers[plain] = n;
    const spring = Object.entries(springKeys).find(([name]) => name === key)?.[1];
    if (spring) springs[spring[0]][spring[1]] = n;
    const region = regionKey.exec(key ?? "");
    if (region) {
      const [, absorbing, name, field] = region;
      const target = absorbing === "absorb" ? absorbRegions : absorbing === "handoff" ? handoffRegions : regions;
      const which = Object.entries(regionNames).find(([label]) => label === name)?.[1];
      const into = Object.entries(regionFields).find(([label]) => label === field)?.[1];
      if (which && into) target[which] = { ...target[which], [into]: n };
    }
    const exitRegion = exitRegionKey.exec(key ?? "");
    if (exitRegion) {
      const which = Object.entries(regionNames).find(([label]) => label === exitRegion[1])?.[1];
      if (which) exitFades[which] = n;
    }
    const regionAnchor = regionAnchorKey.exec(key ?? "");
    if (regionAnchor) {
      const which = Object.entries(regionNames).find(([label]) => label === regionAnchor[1])?.[1];
      if (which) regionAnchors[which] = n;
    }
    if (key === "bubbleExitAccent") accentOnly = n > 0;
    if (key === "trailingRide") ride.by = n;
    if (key === "trailingRideMax") ride.max = n;
    if (key === "bubbleTrailingSlide") textSlide.by = n;
    if (key === "bubbleTrailingSlidePower") textSlide.power = n;
    if (key === "bubbleTrailingBlur") textBlur.by = n;
    if (key === "bubbleTrailingBlurPower") textBlur.power = n;
    if (key === "partStep") part.by = n;
    if (key === "partStepAt") part.at = n;
    if (key === "partStepResponse") part.response = n;
    if (key === "partStepDamping") part.dampingFraction = n;
    if (key === "absorbCenterDelay") absorb.centerDelay = n;
    if (key === "absorbExitFade") absorb.exitFade = n;
    if (key === "absorbExitSharpen") absorb.exitSharpen = n;
    if (key === "absorbEnterResponse") absorb.enter.response = n;
    if (key === "absorbEnterDelay") absorb.enter.delay = n;
    if (key === "absorbEnterDamping") absorb.enter.dampingFraction = n;
    if (key === "handoffEnterResponse") handoff.enter.response = n;
    if (key === "handoffEnterDelay") handoff.enter.delay = n;
    if (key === "handoffEnterDamping") handoff.enter.dampingFraction = n;
    if (key === "handoffFade") handoff.fade = n;
    if (key === "alertEnterResponse") alert.enter.response = n;
    if (key === "alertEnterDamping") alert.enter.dampingFraction = n;
    if (key === "alertEnterDelay") alert.enter.delay = n;
    if (key === "alertBubbleEnterResponse") alert.bubbleEnter.response = n;
    if (key === "alertBubbleEnterDamping") alert.bubbleEnter.dampingFraction = n;
    if (key === "alertBubbleEnterDelay") alert.bubbleEnter.delay = n;
    if (key === "alertBubbleDelay") alert.bubbleDelay = n;
    if (key === "alertBubbleBlur") alert.bubbleBlur = n;
    if (key === "alertBubbleSharpen") alert.bubbleSharpen = n;
    if (key === "alertBubbleFade") alert.bubbleFade = n;
    if (key === "alertBubbleResolve") alert.bubbleResolve = n;
    if (key === "alertBubbleTrailingFade") alert.bubbleTrailingFade = n;
    if (key === "alertBubbleScale") alert.bubbleScale = n;
    if (key === "alertBubbleSpread") alert.bubbleSpread = n;
    if (key === "alertBubbleHold") alert.bubbleHold = n;
    if (key === "alertBubbleTrailingSlide") alert.bubbleTrailingSlide = { by: n, power: alert.bubbleTrailingSlide?.power ?? 1 };
    if (key === "alertBubbleTrailingSlidePower") alert.bubbleTrailingSlide = { by: alert.bubbleTrailingSlide?.by ?? 0, power: n };
    if (key === "alertBubbleSettle") alert.bubbleSettle.depth = n;
    if (key === "alertBubbleSettleResponse") alert.bubbleSettle.response = n;
    if (key === "alertBubbleSettleDamping") alert.bubbleSettle.dampingFraction = n;
    if (key === "alertBubbleSettleDelay") alert.bubbleSettle.delay = n;
  }
  // An empty bubbleExit is left out, so the transition keeps its own (or none).
  const bubbleExit = Object.keys(springs.bubbleExit).length > 0 ? { bubbleExit: springs.bubbleExit } : {};
  const bubbleEnter = Object.keys(springs.bubbleEnter).length > 0 ? { bubbleEnter: springs.bubbleEnter } : {};
  const trailingEnter = Object.keys(springs.trailingEnter).length > 0 ? { trailingEnter: springs.trailingEnter } : {};
  const regionOverride = Object.keys(regions).length > 0 ? { regions } : {};
  const exitRegionOverride = {
    ...(Object.keys(exitFades).length > 0 ? { regionExitFade: exitFades } : {}),
    ...(Object.keys(regionAnchors).length > 0 ? { regionBottomAnchor: regionAnchors } : {}),
  };
  const absorbOverride =
    Object.keys(absorbRegions).length > 0 || absorb.centerDelay !== undefined || absorb.exitFade !== undefined || absorb.exitSharpen !== undefined || Object.keys(absorb.enter).length > 0
      ? { absorb: { ...absorb, ...(Object.keys(absorbRegions).length > 0 ? { regions: absorbRegions } : {}) } }
      : {};
  const handoffOverride =
    Object.keys(handoffRegions).length > 0 || handoff.fade !== undefined || Object.keys(handoff.enter).length > 0
      ? { afterHandoff: { ...handoff, ...(Object.keys(handoffRegions).length > 0 ? { regions: handoffRegions } : {}) } }
      : {};
  const { enter: alertEnter, bubbleEnter: alertBubbleEnter, bubbleSettle: alertBubbleSettle, ...alertNumbers } = alert;
  const alertSprings = {
    ...(Object.keys(alertEnter).length > 0 ? { enter: alertEnter } : {}),
    ...(Object.keys(alertBubbleEnter).length > 0 ? { bubbleEnter: alertBubbleEnter } : {}),
    ...(Object.keys(alertBubbleSettle).length > 0 ? { bubbleSettle: alertBubbleSettle } : {}),
  };
  const alertOverride = Object.keys(alertSprings).length > 0 || Object.keys(alertNumbers).length > 0 ? { afterAlert: { ...alertNumbers, ...alertSprings } } : {};
  const partOverride = part.by !== undefined ? { partStep: { by: part.by, ...(part.at !== undefined ? { at: part.at } : {}), spring: { ...(part.response !== undefined ? { response: part.response } : {}), ...(part.dampingFraction !== undefined ? { dampingFraction: part.dampingFraction } : {}) } } } : {};
  const textSlideOverride = textSlide.by !== undefined ? { bubbleTrailingSlide: { by: textSlide.by, power: textSlide.power ?? 1 } } : {};
  const textBlurOverride = textBlur.by !== undefined ? { bubbleTrailingBlur: { by: textBlur.by, power: textBlur.power ?? 1 } } : {};
  const rideOverride = ride.by !== undefined ? { trailingRide: { by: ride.by, ...(ride.max !== undefined ? { max: ride.max } : {}) } } : {};
  return { [transition]: { ...numbers, ...partOverride, ...rideOverride, ...textSlideOverride, ...textBlurOverride, ...(accentOnly !== undefined ? { bubbleExitAccent: accentOnly } : {}), enter: springs.enter, exit: springs.exit, ...bubbleExit, ...bubbleEnter, ...trailingEnter, ...regionOverride, ...exitRegionOverride, ...absorbOverride, ...handoffOverride, ...alertOverride } };
};

/** "2,0.016" overrides the shadow's grain (levels peak to peak, alpha at full strength), for A/B captures. */
const parseGrain = (value: string | undefined): LabSettings["grain"] => {
  const [levels, full] = (value ?? "").split(",").map(Number);
  return levels !== undefined && full !== undefined && Number.isFinite(levels) && Number.isFinite(full) ? { levels, full } : null;
};

/** "body.collapseSplit.response=0.45;corner.collapseSplit.delay=0.01" sets numbers in the engine's motion, for A/B captures. */
const parseSets = (value: string | undefined): LabSettings["sets"] =>
  (value ?? "").split(";").flatMap((pair) => {
    const [key, raw] = pair.split("=");
    const n = Number(raw);
    return key && Number.isFinite(n) ? [{ path: key.split("."), value: n }] : [];
  });

const LabPage = async ({ searchParams }: { searchParams: Promise<SearchParams> }) => {
  if (!devToolsEnabled()) notFound();
  const params = await searchParams;
  // ?take=expand-t2 replays expand on that unseen take's own timeline (spec.ts `takes`); an unknown
  // take is a 404 rather than a silent capture of the canonical timeline.
  const takeName = first(params.take);
  const take = takeName === undefined ? null : takeTimeline(takeName);
  if (takeName !== undefined && !take) notFound();
  const loaded = (await Promise.all(sequenceNames.map(readSpec))).filter((spec): spec is SequenceSpec => spec !== null);
  const specs = takeName === undefined ? loaded : loaded.map((spec) => onTake(spec, takeName) ?? spec);
  const requested = take?.seq ?? first(params.seq) ?? "appear";

  const sequence = specs.find((spec) => spec.name === requested) ?? specs.find((spec) => spec.name === "appear");
  const settings: LabSettings = {
    sequence: sequence?.name ?? "appear",
    screen: parseScreen(first(params.screen)),
    background: parseColour(first(params.bg), sequence?.background ?? "#fdfdfd"),
    capture: first(params.capture) === "1",
    reduced: first(params.reduced) === "1",
    loop: first(params.loop) === "1",
    spring: parseSpring(first(params.shape)),
    content: parseContent(first(params.content)),
    grain: parseGrain(first(params.grain)),
    sets: parseSets(first(params.set)),
  };

  return <LabStage specs={specs} settings={settings} />;
};

export default LabPage;
