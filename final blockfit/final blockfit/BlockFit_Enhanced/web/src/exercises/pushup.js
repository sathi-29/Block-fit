/**
 * pushup.js
 * ---------------------------------------------------------------
 * Rep signal: elbow angle (shoulder-elbow-wrist).
 * Form checks:
 *   1. Depth   - elbow must bend past ~90 degrees for a full rep.
 *   2. Body line - shoulders/hips/ankles should stay roughly straight.
 *      We don't just check "is the angle close to 180", we also work
 *      out WHICH way the hip has drifted (below the line = sagging,
 *      above the line = piking), so the coaching message is specific.
 *
 * CAMERA ANGLE NOTE: film from the side for this one - that's the
 * only angle a straight-line body check makes sense from.
 */
import { LANDMARK } from '../pose/landmarks.js';
import { angleBetween, averageOrEither, midpoint, Smoother } from '../pose/angles.js';
import { RepPhaseTracker, RepFormAccumulator } from './exerciseBase.js';

const TOP_ANGLE = 155;         // elbow angle counted as "arms extended"
const BOTTOM_ANGLE = 110;      // elbow angle that starts counting as "in the rep"
const GOOD_DEPTH_ANGLE = 95;   // must bend to at/under this for a "full" rep
const BODY_LINE_MARGIN = 0.04; // normalized-coordinate tolerance before flagging sag/pike

export class PushUpAnalyzer {
  static id = 'pushup';
  static label = 'Push-up';
  static topLabel = 'Arms extended';
  static bottomLabel = 'Chest low';
  static cameraHint = 'Film from the side so your full body line is visible.';

  constructor() {
    this.elbowSmoother = new Smoother(0.3);
    this.tracker = new RepPhaseTracker({
      topThreshold: TOP_ANGLE,
      bottomThreshold: BOTTOM_ANGLE,
      minHoldFrames: 2,
    });
    this._resetRepAccumulators();
  }

  onFrameMissing() {
    this.elbowSmoother.reset();
    this.tracker.interrupt();
    this._resetRepAccumulators();
  }

  _resetRepAccumulators() {
    this.repForm = new RepFormAccumulator(20);
    this.minElbowAngleThisRep = 180;
  }

  update(lm) {
    const leftElbow = angleBetween(lm[LANDMARK.LEFT_SHOULDER], lm[LANDMARK.LEFT_ELBOW], lm[LANDMARK.LEFT_WRIST]);
    const rightElbow = angleBetween(lm[LANDMARK.RIGHT_SHOULDER], lm[LANDMARK.RIGHT_ELBOW], lm[LANDMARK.RIGHT_WRIST]);
    const elbowAngle = this.elbowSmoother.update(averageOrEither(leftElbow, rightElbow));

    // Body line: is the hip above/below the straight line from shoulder to ankle?
    const shoulderMid = midpoint(lm[LANDMARK.LEFT_SHOULDER], lm[LANDMARK.RIGHT_SHOULDER]);
    const hipMid = midpoint(lm[LANDMARK.LEFT_HIP], lm[LANDMARK.RIGHT_HIP]);
    const ankleMid = midpoint(lm[LANDMARK.LEFT_ANKLE], lm[LANDMARK.RIGHT_ANKLE]);

    let sagging = false;
    let piking = false;
    const dx = ankleMid.x - shoulderMid.x;
    if (Math.abs(dx) > 0.05) {
      const t = (hipMid.x - shoulderMid.x) / dx;
      const expectedHipY = shoulderMid.y + t * (ankleMid.y - shoulderMid.y);
      const deviation = hipMid.y - expectedHipY; // +y is DOWN in image coords
      if (deviation > BODY_LINE_MARGIN) sagging = true;
      else if (deviation < -BODY_LINE_MARGIN) piking = true;
    }

    this.minElbowAngleThisRep = Math.min(this.minElbowAngleThisRep, elbowAngle);
    this.repForm.tickFrame();
    this.repForm.flagIfActive('hipsSagging', sagging);
    this.repForm.flagIfActive('hipsPiking', piking);

    const { phase, repCompleted, reps } = this.tracker.update(elbowAngle);

    const liveIssues = [];
    if (sagging) liveIssues.push('Engage your core - hips are sagging');
    if (piking) liveIssues.push('Lower your hips into a straight line');

    let repResult = null;
    if (repCompleted) {
      const notLowEnough = this.minElbowAngleThisRep > GOOD_DEPTH_ANGLE;
      const { score: baseScore, issues } = this.repForm.finish();
      let score = baseScore;
      if (notLowEnough) {
        issues.push('notLowEnough');
        score = Math.max(0, score - 20);
      }
      repResult = {
        reps,
        score,
        issues,
        issueLabels: issues.map(issueLabel),
        minElbowAngle: Math.round(this.minElbowAngleThisRep),
      };
      this._resetRepAccumulators();
    }

    return {
      phase,
      reps,
      repCompleted,
      repResult,
      currentAngle: Math.round(elbowAngle),
      liveIssues,
    };
  }
}

function issueLabel(key) {
  const labels = {
    hipsSagging: 'Hips sagged toward the floor',
    hipsPiking: 'Hips piked up too high',
    notLowEnough: 'Did not go low enough',
  };
  return labels[key] || key;
}
