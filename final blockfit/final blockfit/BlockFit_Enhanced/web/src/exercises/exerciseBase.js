/**
 * exerciseBase.js
 * ---------------------------------------------------------------
 * A generic 4-phase rep counter, shared by squat / push-up / curl.
 * This matches the STANDING -> DESCENDING -> BOTTOM -> ASCENDING
 * state machine used by the original squat tracker - just
 * generalised so every exercise can reuse it instead of copy-pasting.
 *
 * HOW IT WORKS:
 *   We track ONE "primary angle" per exercise (knee angle for squat,
 *   elbow angle for push-up/curl). Two thresholds define the ends
 *   of the movement:
 *     topThreshold    - angle is at/above this near the "open" end
 *                        (standing, arms extended)
 *     bottomThreshold - angle is at/below this near the "closed" end
 *                        (squat depth, bottom of push-up, top of curl)
 *
 *   A rep only counts when the athlete goes ALL THE WAY DOWN and ALL
 *   THE WAY BACK UP - i.e. we require reachedBottom to have been true
 *   before a return-to-top counts as a rep. This stops partial
 *   reps / small wobbles near the top from being counted.
 *
 *   `minHoldFrames` adds a little hysteresis: the angle must stay
 *   past the bottom threshold for a few consecutive frames before we
 *   trust it (on top of the EMA smoothing already applied to the
 *   angle itself). This is what stops a single noisy frame from
 *   triggering a false rep.
 */
export class RepPhaseTracker {
  constructor({ topThreshold, bottomThreshold, minHoldFrames = 3 }) {
    this.topThreshold = topThreshold;
    this.bottomThreshold = bottomThreshold;
    this.minHoldFrames = minHoldFrames;

    this.phase = 'START';
    this.prevAngle = null;
    this.bottomHoldFrames = 0;
    this.topHoldFrames = 0;
    this.reachedBottom = false;
    this.armedAtTop = false;
    this.reps = 0;
  }

  /**
   * Call once per frame with the current (smoothed) primary angle.
   * Returns { phase, repCompleted, reps }.
   */
  update(angle) {
    if (!Number.isFinite(angle)) {
      this.interrupt();
      return { phase: this.phase, repCompleted: false, reps: this.reps };
    }

    const direction = this.prevAngle === null ? 0 : angle - this.prevAngle;
    let repCompleted = false;

    if (angle <= this.bottomThreshold) {
      this.bottomHoldFrames += 1;
      this.topHoldFrames = 0;
      if (this.armedAtTop && this.bottomHoldFrames >= this.minHoldFrames) {
        this.phase = 'BOTTOM';
        this.reachedBottom = true;
      } else if (!this.armedAtTop && direction < 0) {
        this.phase = 'DESCENDING';
      }
    } else {
      this.bottomHoldFrames = 0;
      if (angle >= this.topThreshold) {
        this.topHoldFrames += 1;
        if (this.topHoldFrames >= this.minHoldFrames) {
          if (this.armedAtTop && this.reachedBottom) {
            this.reps += 1;
            repCompleted = true;
          }
          this.armedAtTop = true;
          this.reachedBottom = false;
          this.phase = 'TOP';
        }
      } else {
        this.topHoldFrames = 0;
        this.phase = direction < 0 ? 'DESCENDING' : 'ASCENDING';
      }
    }

    this.prevAngle = angle;
    return { phase: this.phase, repCompleted, reps: this.reps };
  }

  reset() {
    this.interrupt();
    this.reps = 0;
  }

  interrupt() {
    this.phase = 'START';
    this.prevAngle = null;
    this.bottomHoldFrames = 0;
    this.topHoldFrames = 0;
    this.reachedBottom = false;
    this.armedAtTop = false;
  }
}

/**
 * Tracks form quality across a single rep, then produces a 0-100
 * score for that rep when it completes.
 *
 * Usage per exercise module:
 *   const rep = new RepFormAccumulator();
 *   // each frame during the rep:
 *   rep.flagIfActive('kneesCavingIn', kneesAreCavingInThisFrame);
 *   rep.flagIfActive('notLowEnough', depthWasInsufficientThisFrame);
 *   // when RepPhaseTracker reports repCompleted:
 *   const { score, issues } = rep.finish();
 */
export class RepFormAccumulator {
  constructor(penaltyPerIssue = 20) {
    this.penaltyPerIssue = penaltyPerIssue;
    this.activeIssueFrames = {}; // { issueKey: frameCount }
    this.totalFrames = 0;
  }

  /** Call every frame of the rep with whether each issue is present right now. */
  flagIfActive(issueKey, isActiveThisFrame) {
    if (isActiveThisFrame) {
      this.activeIssueFrames[issueKey] = (this.activeIssueFrames[issueKey] || 0) + 1;
    }
  }

  tickFrame() {
    this.totalFrames += 1;
  }

  /**
   * An issue only "counts" against the rep if it was present for a
   * meaningful fraction of the rep (default 25%+ of frames) - this
   * stops a single glitchy frame from tanking the score.
   */
  finish(presenceThreshold = 0.25) {
    const issues = [];
    for (const [key, frames] of Object.entries(this.activeIssueFrames)) {
      if (this.totalFrames === 0 || frames / this.totalFrames >= presenceThreshold) {
        issues.push(key);
      }
    }
    const score = Math.max(0, 100 - issues.length * this.penaltyPerIssue);
    return { score, issues };
  }
}
