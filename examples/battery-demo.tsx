"use client";

import { useEffect, useState } from "react";

import { BatteryActivity, chargingIndicatorHold } from "@/components/islandcn/battery-activity";

import { DemoStage, StageActions, StageButton, type DemoBaseProps } from "./demo-stage";
import { batterySample } from "./samples";

export interface BatteryDemoProps extends DemoBaseProps {
  /** Starting charge, 0 to 100. Defaults to 42. */
  level?: number;
  /** Plugged in. Defaults to true. */
  charging?: boolean;
}

/** How long the live demo waits on an empty island before it plugs in again, in ms. */
const replugAfter = 2500;
/** How much charge each plug-in adds, so the level moves between showings. */
const chargePerPlug = 0.03;

/**
 * Plug in, and the charging pill shows for a moment: its battery fills to the level, it holds and it
 * goes, as the system's charging indicator does. Live, it plugs in again after a pause. The other
 * states hold the pill so it can be looked at.
 */
export const BatteryDemo = ({ level: start = batterySample.level * 100, charging = true, view = "live", height, theme, reducedMotion }: BatteryDemoProps) => {
  const live = view === "live";
  const [level, setLevel] = useState(start / 100);
  // Each plug-in mounts a fresh activity, so it plays its appearance again.
  const [plugs, setPlugs] = useState(0);
  const [shown, setShown] = useState(true);

  const plugIn = () => {
    setLevel((current) => Math.min(1, current + chargePerPlug));
    setPlugs((count) => count + 1);
    setShown(true);
  };

  useEffect(() => {
    if (shown || !live) return;
    const timer = window.setTimeout(plugIn, replugAfter);
    return () => window.clearTimeout(timer);
  }, [shown, live]);

  // A knob change starts over from the new level.
  useEffect(() => setLevel(start / 100), [start]);

  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} hint={shown ? undefined : "Plugging in again in a moment."}>
      {shown || !live ? (
        <BatteryActivity
          key={plugs}
          level={level}
          charging={charging}
          timeToFull={(1 - level) * batterySample.fullCharge * 60_000}
          dismissAfter={live ? chargingIndicatorHold : undefined}
          onDismiss={() => setShown(false)}
        />
      ) : null}
      {live ? (
        <StageActions>
          <StageButton onClick={plugIn}>Plug in</StageButton>
        </StageActions>
      ) : null}
    </DemoStage>
  );
};
