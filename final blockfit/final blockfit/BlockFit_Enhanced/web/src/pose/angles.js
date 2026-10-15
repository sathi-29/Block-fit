/**
 * angles.js
 * ---------------------------------------------------------------
 * Pure math helpers. No MediaPipe or DOM code here, so you can
 * unit-test this file on its own.
 */

/**
 * Returns the angle ABC (the angle at vertex B), in degrees, given
 * three landmarks with {x, y} coordinates.
 *
 *        A
 *         \
 *          \  <- this is the angle we return
 *           B ------ C
 *
 * Example: for a knee angle, A = hip, B = knee, C = ankle.
 * Standing straight -> ~170-180 degrees. Deep squat -> ~70-100 degrees.
 */
export function angleBetween(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((radians * 180.0) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

/** Straight-line (Euclidean) distance between two {x, y} landmarks. */
export function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Midpoint of two {x, y} landmarks - used to build a "torso centre-line" from L/R shoulder or hip. */
export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Exponential Moving Average smoother.
 *
 * Raw landmark coordinates from the camera are noisy frame-to-frame
 * (a few pixels of jitter), which makes raw angles jump around by
 * several degrees even when you're holding still. That jitter can:
 *   - falsely trigger a rep-phase transition (miscounting reps), or
 *   - falsely trigger a "bad form" flag for one frame.
 *
 * An EMA smooths this out: each new value nudges the running average
 * instead of replacing it outright. `alpha` controls how quickly it
 * reacts — lower alpha = smoother but more lag, higher alpha = more
 * responsive but noisier. 0.3-0.4 is a good default for 30fps video.
 */
export class Smoother {
  constructor(alpha = 0.35) {
    this.alpha = alpha;
    this.value = null;
  }

  update(newValue) {
    if (newValue === null || Number.isNaN(newValue)) return this.value;
    this.value = this.value === null
      ? newValue
      : this.alpha * newValue + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset() {
    this.value = null;
  }
}

/** Average of two numbers, ignoring null/undefined (falls back to whichever is present). */
export function averageOrEither(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  return (a + b) / 2;
}
