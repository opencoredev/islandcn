import { type SpringConfig, solveSpring } from "@/lib/island";

/** A spring as a CSS transition: a `linear()` easing sampled from the engine's own solver, and how long it runs. */
export interface SpringEasing {
  /** Seconds until the spring is within 0.1% of its target. */
  duration: number;
  /** A CSS `linear()` easing function. */
  easing: string;
}

/** Points sampled along the curve: enough that a 300 px move never steps by more than a pixel or two. */
const SAMPLES = 48;
/** Longest it runs, in seconds, whatever the spring: a soft spring otherwise drags on for its tail. */
const MAX_SECONDS = 1.2;

/**
 * Turns a spring into a CSS easing, so layout that follows the island (a stage growing as it
 * expands) moves on the same physics without a frame loop. Browsers without `linear()` drop the
 * transition and the change lands at once.
 */
export const springEasing = (spring: SpringConfig): SpringEasing => {
  let duration = MAX_SECONDS;
  for (let t = 0.05; t < MAX_SECONDS; t += 0.01) {
    const { x, v } = solveSpring(spring, -1, 0, t);
    if (Math.abs(x) < 0.001 && Math.abs(v) < 0.01) {
      duration = t;
      break;
    }
  }
  const points: string[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = (duration * i) / SAMPLES;
    const value = i === SAMPLES ? 1 : 1 + solveSpring(spring, -1, 0, t).x;
    points.push(value.toFixed(4));
  }
  return { duration: Number(duration.toFixed(3)), easing: `linear(${points.join(", ")})` };
};

/** The transition shorthand for `property` on `spring`. */
export const springTransition = (property: string, spring: SpringConfig) => {
  const { duration, easing } = springEasing(spring);
  return `${property} ${duration}s ${easing}`;
};
