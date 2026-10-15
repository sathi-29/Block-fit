/**
 * bicepCurl.js
 * ---------------------------------------------------------------
 * Rep signal: elbow angle (shoulder-elbow-wrist), tracked
 * INDEPENDENTLY for each arm and summed. This is the simplest
 * design that avoids double-counting when only one arm moves, and
 * still works if you curl with both arms alternately or together.
 * For the cleanest demo, curl one arm at a time.
 *
 * Form check: "don't swing" - real bicep curls should only move at
 * the elbow. If you use momentum, the whole upper arm swings forward
 * at the shoulder. We measure the hip-shoulder-elbow angle at the
 * top of the rep as a reference, and flag it if that angle drifts
 * too far away from the reference during the rep.
 */
import { LANDMARK } from '../pose/landmarks.js';
import { angleBetween, Smoother } from '../pose/angles.js';
import { RepPhaseTracker, RepFormAccumulator } from './exerciseBase.js';

const TOP_ANGLE = 155;           // elbow angle counted as "arm extended"
const BOTTOM_ANGLE = 70;         // elbow angle that starts counting as "curling"
const GOOD_CURL_ANGLE = 50;      // must bend to at/under this for a "full" curl
const MAX_UPPER_ARM_DRIFT = 20;  // degrees the shoulder angle may drift before it's "swinging"

class ArmCurlTracker {
  constructor(side) {
    this.side = side; // 'LEFT' | 'RIGHT'
    this.elbowSmoother = new Smoother(0.3);
    this.shoulderAngleSmoother = new Smoother(0.3);
    this.tracker = new RepPhaseTracker({
      topThreshold: TOP_ANGLE,
      bottomThreshold: BOTTOM_ANGLE,
      minHoldFrames: 2,
    });
    this._resetRepAccumulators();
  }

  _resetRepAccumulators() {
    this.repForm = new RepFormAccumulator(20);
    this.minElbowAngleThisRep = 180;
    this.referenceShoulderAngle = null;
  }

  onFrameMissing() {
    this.elbowSmoother.reset();
    this.shoulderAngleSmoother.reset();
    this.tracker.interrupt();
    this.repForm = new RepFormAccumulator(20);
    this.minElbowAngleThisRep = 180;
    this.referenceShoulderAngle = null;
  }

  update(lm) {
    const S = lm[LANDMARK[`${this.side}_SHOULDER`]];
    const E = lm[LANDMARK[`${this.side}_ELBOW`]];
    const W = lm[LANDMARK[`${this.side}_WRIST`]];
    const H = lm[LANDMARK[`${this.side}_HIP`]];

    const elbowAngle = this.elbowSmoother.update(angleBetween(S, E, W));
    const shoulderAngle = this.shoulderAngleSmoother.update(angleBetween(H, S, E));

    // Capture the "still" reference angle while the arm is at the top (not yet moving).
    if (this.referenceShoulderAngle === null && this.tracker.phase === 'TOP') {
      this.referenceShoulderAngle = shoulderAngle;
    }
    const drift = this.referenceShoulderAngle === null
      ? 0
      : Math.abs(shoulderAngle - this.referenceShoulderAngle);
    const armSwinging = drift > MAX_UPPER_ARM_DRIFT;

    this.minElbowAngleThisRep = Math.min(this.minElbowAngleThisRep, elbowAngle);
    this.repForm.tickFrame();
    this.repForm.flagIfActive('armSwinging', armSwinging);

    const { phase, repCompleted, reps } = this.tracker.update(elbowAngle);

    const liveIssues = [];
    if (armSwinging) liveIssues.push(`Keep your ${this.side.toLowerCase()} upper arm still`);

    let repResult = null;
    if (repCompleted) {
      const notFullyCurled = this.minElbowAngleThisRep > GOOD_CURL_ANGLE;
      const { score: baseScore, issues } = this.repForm.finish();
      let score = baseScore;
      if (notFullyCurled) {
        issues.push('notFullyCurled');
        score = Math.max(0, score - 20);
      }
      repResult = {
        side: this.side,
        score,
        issues,
        issueLabels: issues.map(issueLabel),
        minElbowAngle: Math.round(this.minElbowAngleThisRep),
      };
      this._resetRepAccumulators();
    }

    return { phase, reps, repCompleted, repResult, currentAngle: Math.round(elbowAngle), liveIssues };
  }
}

export class BicepCurlAnalyzer {
  static id = 'curl';
  static label = 'Bicep Curl';
  static topLabel = 'Arm extended';
  static bottomLabel = 'Fully curled';
  static cameraHint = 'Curl one arm at a time, facing the camera, for the cleanest rep count.';

  constructor() {
    this.left = new ArmCurlTracker('LEFT');
    this.right = new ArmCurlTracker('RIGHT');
  }

  onFrameMissing() {
    this.left.onFrameMissing();
    this.right.onFrameMissing();
  }

  update(lm) {
    const l = this.left.update(lm);
    const r = this.right.update(lm);

    const reps = this.left.tracker.reps + this.right.tracker.reps;
    const repResults = [l.repResult, r.repResult].filter(Boolean);
    const repCompleted = repResults.length > 0;
    const repResult = repResults[0] || null;
    // Display whichever arm is currently more curled (smaller angle = more bent).
    const showLeft = l.currentAngle <= r.currentAngle;
    const phase = showLeft ? l.phase : r.phase;
    const currentAngle = showLeft ? l.currentAngle : r.currentAngle;
    const liveIssues = [...l.liveIssues, ...r.liveIssues];

    return { phase, reps, repCompleted, repResult, repResults, currentAngle, liveIssues };
  }
}

function issueLabel(key) {
  const labels = {
    armSwinging: 'Upper arm swung - used momentum',
    notFullyCurled: 'Did not fully curl',
  };
  return labels[key] || key;
}
