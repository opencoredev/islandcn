import { type IslandMetricsOverrides, islandMetrics } from "@/lib/island";

/**
 * The engine's metrics with every length multiplied by `scale`, for drawing a
 * large island natively. Ratios, exponents, alphas and the metaball's
 * dimensionless handle stay as they are; springs are scale-free already.
 *
 * Why not CSS zoom or transform: the engine sizes compact slots from
 * getBoundingClientRect, which includes an ancestor's zoom or scale, so a
 * scaled island measures its content too wide.
 */
export const scaledMetrics = (scale: number): IslandMetricsOverrides => {
  const m = islandMetrics;
  const s = (value: number) => value * scale;
  return {
    screen: { width: s(m.screen.width), height: s(m.screen.height) },
    top: s(m.top),
    idle: { width: s(m.idle.width), height: s(m.idle.height) },
    compact: {
      height: s(m.compact.height),
      sensorWidth: s(m.compact.sensorWidth),
      edgePadding: s(m.compact.edgePadding),
      innerPadding: { leading: s(m.compact.innerPadding.leading), trailing: s(m.compact.innerPadding.trailing) },
      maxSlotWidth: s(m.compact.maxSlotWidth),
      maxWidth: s(m.compact.maxWidth),
    },
    minimal: {
      height: s(m.minimal.height),
      attached: { outerPadding: s(m.minimal.attached.outerPadding), innerPadding: s(m.minimal.attached.innerPadding) },
      detached: { padding: s(m.minimal.detached.padding), minWidth: s(m.minimal.detached.minWidth) },
      gap: s(m.minimal.gap),
    },
    split: {
      attached: {
        outerPadding: s(m.split.attached.outerPadding),
        gap: s(m.split.attached.gap),
        innerPadding: s(m.split.attached.innerPadding),
      },
      detached: {
        outerPadding: s(m.split.detached.outerPadding),
        gap: s(m.split.detached.gap),
        trailingPadding: s(m.split.detached.trailingPadding),
        // The bubble's fixed width and the room its trailing slot gets: unscaled, the "7" had no room
        // and the bubble drew as a 36.85 pt circle beside a label that says 62.18.
        width: s(m.split.detached.width),
        slotGap: s(m.split.detached.slotGap),
        slotEnd: s(m.split.detached.slotEnd),
      },
      maxSpan: s(m.split.maxSpan),
    },
    expanded: {
      sideInset: s(m.expanded.sideInset),
      top: s(m.expanded.top),
      minHeight: s(m.expanded.minHeight),
      maxHeight: s(m.expanded.maxHeight),
      radius: s(m.expanded.radius),
      padding: {
        top: s(m.expanded.padding.top),
        side: s(m.expanded.padding.side),
        // Overrides merge into the engine's padding, so an unscaled `trailing` would survive.
        trailing: s(m.expanded.padding.trailing ?? m.expanded.padding.side),
        bottom: s(m.expanded.padding.bottom),
      },
      bottomInset: s(m.expanded.bottomInset),
      centerTop: s(m.expanded.centerTop),
      rowGap: s(m.expanded.rowGap),
      shadow: { offsetY: s(m.expanded.shadow.offsetY), blur: s(m.expanded.shadow.blur) },
    },
    contentClip: { radius: s(m.contentClip.radius), chamfer: s(m.contentClip.chamfer) },
    bridge: { maxGap: s(m.bridge.maxGap) },
    content: { blur: s(m.content.blur) },
    keyline: { width: s(m.keyline.width) },
  };
};
