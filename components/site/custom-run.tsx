"use client";

import { useEffect, useRef } from "react";

import { Glyph, IconTile } from "@/components/islandcn/glyph";
import { CheckGlyph, ForkKnifeGlyph, PinGlyph } from "@/components/islandcn/glyphs";
import { IslandButton } from "@/components/islandcn/island-button";
import { ExpandedBottom } from "@/components/islandcn/island-layout";
import { CompactText, ExpandedValue, TitleStack } from "@/components/islandcn/island-text";
import { islandAccent } from "@/components/islandcn/theme";
import { type ActivityContent, useIslandActions } from "@/lib/island";

/*
 * An island no preset ships: a food order, built from the content kit the way
 * the playground builds one. It plays on the home page tour's last step, to
 * make the point that the island takes the shape of your app's actions.
 */

const ID = "site-order";
const accent = islandAccent.orange;

const content = (minutes: number, arrived: boolean): ActivityContent => ({
  compact: {
    leading: <Glyph icon={ForkKnifeGlyph} color={accent} />,
    trailing: <CompactText color={accent}>{arrived ? "Here" : `${minutes} min`}</CompactText>,
  },
  expanded: {
    leading: <IconTile icon={arrived ? PinGlyph : ForkKnifeGlyph} accent={accent} />,
    center: <TitleStack title={arrived ? "Your order is outside" : "Pizza is on its way"} subtitle="Margherita, large" />,
    trailing: arrived ? undefined : (
      <ExpandedValue color={accent} unit="min">
        {minutes}
      </ExpandedValue>
    ),
    bottom: arrived ? (
      <ExpandedBottom reach="action">
        <IslandButton tone={{ kind: "accent", color: accent }} onPress={() => undefined}>
          <CheckGlyph size={18} />
          Got it
        </IslandButton>
      </ExpandedBottom>
    ) : undefined,
  },
});

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

interface CustomOrderRunProps {
  /** Restarts the run when it changes. Required. */
  run: number;
  /** Called once the order has ended. Required. */
  onFinish: () => void;
  /**
   * Whether the arrival alerts, opening the expanded view. Defaults to true. Below lg the open island
   * would cover the header's mark and menu, so there the arrival changes the compact view quietly.
   */
  alert?: boolean;
}

/** Plays the order once in the nearest island: on its way, a minute ticks, it arrives (with an alert unless told not to), then it ends. */
export const CustomOrderRun = ({ run, onFinish, alert = true }: CustomOrderRunProps) => {
  const island = useIslandActions();
  const finish = useRef(onFinish);
  finish.current = onFinish;
  useEffect(() => {
    let cancelled = false;
    const play = async () => {
      island.start({ id: ID, label: "Pizza arriving in 12 minutes", ...content(12, false) });
      await wait(2200);
      if (cancelled) return;
      island.update(ID, { label: "Pizza arriving in 11 minutes", ...content(11, false) });
      await wait(1800);
      if (cancelled) return;
      island.update(ID, { label: "Your order is outside", ...content(0, true), alert });
      await wait(7600);
      if (cancelled) return;
      island.end(ID);
      await wait(900);
      if (!cancelled) finish.current();
    };
    void play();
    return () => {
      cancelled = true;
      island.end(ID);
    };
  }, [island, run, alert]);
  return null;
};
