"use client";

import { useEffect, useState } from "react";

import { islandAccent } from "@/components/islandcn/theme";
import { UploadActivity } from "@/components/islandcn/upload-activity";

import { DemoStage, type DemoBaseProps, type DemoView } from "./demo-stage";
import { uploadSample } from "./samples";

export interface UploadDemoProps extends DemoBaseProps {
  /** File name. Defaults to "mochi-asleep.jpg". */
  fileName?: string;
  /** Seconds for the whole upload. Defaults to 9. */
  seconds?: number;
  /** Total size in MB. Defaults to 6. */
  sizeMb?: number;
  /** Accent colour. Defaults to blue. */
  accent?: string;
  /** Progress a compact or expanded view holds; 1 shows the finished upload. Defaults to the sample's 0.42. */
  still?: number;
}

/** A photo upload whose ring fills with the percentage in it, shows a check, leaves, and starts again. */
export const UploadDemo = ({ fileName = uploadSample.fileName, seconds = 9, sizeMb = uploadSample.sizeMb, accent = islandAccent.blue, still = uploadSample.still, view = "live", height, theme, reducedMotion }: UploadDemoProps) => {
  const [run, setRun] = useState(0);
  const [progress, setProgress] = useState(view === "live" ? 0 : still);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (view !== "live") return;
    setVisible(true);
    setProgress(0);
    const started = Date.now();
    // Uneven steps, like a real network, once a second, as often as a live status activity is updated:
    // each change turns its digits over for half a second.
    const timer = window.setInterval(() => {
      const t = (Date.now() - started) / (seconds * 1000);
      if (t >= 1) {
        setProgress(1);
        window.clearInterval(timer);
        return;
      }
      setProgress(Math.min(0.99, t + Math.sin(t * 9) * 0.02));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, seconds, run]);

  useEffect(() => {
    if (progress < 1 || view !== "live") return;
    const hide = window.setTimeout(() => setVisible(false), 2200);
    const again = window.setTimeout(() => setRun((n) => n + 1), 3800);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(again);
    };
  }, [progress, view]);

  return (
    <DemoStage view={view} height={height} theme={theme} reducedMotion={reducedMotion} hint="Hold the island to see where the photo goes.">
      {visible ? (
        <UploadActivity
          fileName={fileName}
          src={uploadSample.src}
          progress={progress}
          totalBytes={sizeMb * 1_000_000}
          destination={uploadSample.destination}
          accent={accent}
        />
      ) : null}
    </DemoStage>
  );
};
