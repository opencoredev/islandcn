"use client";

import { useState } from "react";

import { EtaActivity, type EtaKind } from "@/components/islandcn/eta-activity";

import { DemoStage, type DemoBaseProps, type DemoView } from "./demo-stage";
import { etaSample } from "./samples";

export interface EtaDemoProps extends DemoBaseProps {
  /** Ride or delivery. Defaults to "ride". */
  kind?: EtaKind;
  /** Minutes until arrival at the start. Defaults to 6. */
  minutes?: number;
}

const copy = { ride: etaSample.ride, delivery: etaSample.delivery } as const satisfies Record<EtaKind, { title: string; subtitle: string }>;

/**
 * A trip on its way: the minutes count down. A ride shows its driver, plate and car and the
 * Message capsule; a delivery what is coming.
 */
export const EtaDemo = ({ kind = "ride", minutes = etaSample.minutes, view = "live", height, theme, reducedMotion }: EtaDemoProps) => {
  const [arrivesAt] = useState(() => Date.now() + minutes * 60_000);
  const { ride } = etaSample;
  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} hint="Hold the island for the driver.">
      {kind === "ride" ? (
        // The capsule shows when it has a handler; the demo has no one to message.
        <EtaActivity kind="ride" arrivesAt={arrivesAt} title={ride.title} driverName={ride.driverName} plate={ride.plate} vehicle={ride.vehicle} onContact={() => undefined} />
      ) : (
        <EtaActivity kind="delivery" arrivesAt={arrivesAt} title={copy.delivery.title} subtitle={copy.delivery.subtitle} />
      )}
    </DemoStage>
  );
};
