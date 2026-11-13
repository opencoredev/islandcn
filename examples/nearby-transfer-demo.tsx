"use client";

import { useEffect, useState } from "react";

import { type NearbyDevice, NearbyTransferActivity } from "@/components/islandcn/nearby-transfer-activity";

import { DemoStage, type DemoBaseProps, type DemoView } from "./demo-stage";
import { transferSample } from "./samples";

export interface NearbyTransferDemoProps extends DemoBaseProps {
  /** Send or receive. Defaults to "send". */
  direction?: "send" | "receive";
  /** The other device. Defaults to "Maya's Laptop". */
  deviceName?: string;
  /** Device glyph. Defaults to "laptop". */
  device?: NearbyDevice;
  /** Seconds for the transfer. Defaults to 6. */
  seconds?: number;
  /** Progress a compact or expanded view holds; 1 shows the finished transfer. Defaults to the sample's 0.64. */
  still?: number;
}

/** A photo going to a laptop nearby (or coming from it): the ring fills, shows a check, leaves, and starts again. */
export const NearbyTransferDemo = ({
  direction = "send",
  deviceName = transferSample.deviceName,
  device = "laptop",
  seconds = 6,
  still = transferSample.still,
  view = "live",
  height,
  theme,
  reducedMotion,
}: NearbyTransferDemoProps) => {
  const [run, setRun] = useState(0);
  const [progress, setProgress] = useState(view === "live" ? 0 : still);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (view !== "live") return;
    setVisible(true);
    setProgress(0);
    const started = Date.now() + 900;
    // Once a second, as often as a live status activity is updated: each change turns its digits over.
    const timer = window.setInterval(() => {
      const t = (Date.now() - started) / (seconds * 1000);
      setProgress(Math.min(1, Math.max(0, t)));
      if (t >= 1) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, seconds, run]);

  useEffect(() => {
    if (progress < 1 || view !== "live") return;
    const hide = window.setTimeout(() => setVisible(false), 2000);
    const again = window.setTimeout(() => setRun((n) => n + 1), 3600);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(again);
    };
  }, [progress, view]);

  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} hint="Hold the island to see who it's going to.">
      {visible ? (
        <NearbyTransferActivity
          direction={direction}
          deviceName={deviceName}
          device={device}
          itemName={direction === "send" ? transferSample.itemName : transferSample.receive.itemName}
          src={direction === "send" ? transferSample.src : transferSample.receive.src}
          progress={progress}
          onCancel={() => {
            setVisible(false);
            window.setTimeout(() => setRun((n) => n + 1), 1500);
          }}
        />
      ) : null}
    </DemoStage>
  );
};
