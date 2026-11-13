/**
 * Measured island geometry for the site's dimension callouts and spec copy,
 * in points (1 pt = 1 CSS px). Copied from reference/MEASUREMENTS.md (iOS 27,
 * iPhone 18 Pro simulator), which is the source of truth; the engine's own
 * table lives in lib/island/metrics.ts and is being calibrated to the same
 * numbers by track B.
 */
export const MEASURED = {
  idle: { top: 13.91, width: 94.85, height: 36.84 },
  compact: { width: 150.18, height: 36.85 },
  expanded: { inset: 13.83, width: 374.34, height: 104.52, radius: 48.2 },
  split: { pill: 156.85, bubble: 62.18, gap: 7.82 },
  screen: { width: 402, height: 874 },
} as const satisfies {
  idle: { top: number; width: number; height: number };
  compact: { width: number; height: number };
  expanded: { inset: number; width: number; height: number; radius: number };
  split: { pill: number; bubble: number; gap: number };
  screen: { width: number; height: number };
};

/**
 * Springs fitted to the simulator recordings (reference/MEASUREMENTS.md,
 * canonical take), in SwiftUI units, keyed by the engine's transition names.
 * Expand is the alert expand; a long-press expand fits 0.414 / 0.784. Collapse
 * is the width spring; its height settles on a stiffer 0.478 / 0.88.
 */
export const MEASURED_SPRINGS = {
  appear: { response: 0.479, dampingFraction: 0.63 },
  expand: { response: 0.519, dampingFraction: 0.818 },
  collapse: { response: 0.589, dampingFraction: 0.475 },
  split: { response: 0.511, dampingFraction: 0.817 },
  unsplit: { response: 0.505, dampingFraction: 0.765 },
  dismiss: { response: 0.478, dampingFraction: 0.893 },
} as const satisfies Record<string, { response: number; dampingFraction: number }>;
