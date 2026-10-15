/**
 * squat.js
 * ---------------------------------------------------------------
 * This is "Squat AI v2" - it takes your v1 knee-angle state machine
 * and adds the four things you scoped for v2:
 *   1. Knee alignment  (are the knees caving inward?)
 *   2. Hip depth       (did they actually squat low enough?)
 *   3. Torso angle     (is the chest collapsing forward?)
 *   4. Form score       (0-100 per rep, from the issues above)
 * Multi-frame smoothing is handled by the Smoother class from angles.js.
 *
 * CAMERA ANGLE NOTE (explain this to judges - it's a deliberate,
 * understood trade-off, not a bug):
 *   We only look at 2D x,y pixel positions (no depth/z), so the best
 *   angle actually depends on WHICH check matters more:
 *     - Knee-cave-in needs some FRONTAL view (both knees visible
 *       side by side) to compare their left-right gap.
 *     - Knee-bend depth needs some SIDE view, because forward knee
 *       flexion mostly moves the knee toward/away from a front-on
 *       camera (barely visible in x,y) but shows up clearly as an
 *       x,y angle change from the side.
 *   A 3/4 angle (not straight-on) is the standard compromise used by
 *   most single-camera pose-fitness apps: it keeps both knees
 *   distinguishable AND keeps enough of the forward knee travel
 *   visible in the 2D image for the angle math to work.
 */
import { LANDMARK } from '../pose/landmarks.js';
import { angleBetween, averageOrEither, midpoint, Smoother } from '../pose/angles.js';
import { RepPhaseTracker, RepFormAccumulator } from './exerciseBase.js';

// --- Tunable thresholds (degrees unless noted) -------------------
const TOP_ANGLE = 160;          // knee angle counted as "standing"
const BOTTOM_ANGLE = 130;       // knee angle that starts counting as "in the squat"
const GOOD_DEPTH_ANGLE = 100;   // must dip at/under this for "good depth" (~thighs parallel or lower)
const MAX_TORSO_LEAN = 45;      // degrees from vertical before we flag forward lean
const KNEE_GAP_RATIO = 0.7;     // knees narrower than (ankleGap * this) => caving in

export class SquatAnalyzer {
  static id = 'squat';
  static label = 'Squat';
  static topLabel = 'Standing';
  static bottomLabel = 'Bottom';
  static cameraHint = 'Stand at a 3/4 angle to the camera (not straight-on) - full body in frame.';

  constructor() {
    this.kneeSmoother = new Smoother(0.3);
    this.torsoSmoother = new Smoother(0.3);
    this.tracker = new RepPhaseTracker({
      topThreshold: TOP_ANGLE,
      bottomThreshold: BOTTOM_ANGLE,
      minHoldFrames: 2,
    });
    this._resetRepAccumulators();
  }

  onFrameMissing() {
    this.kneeSmoother.reset();
    this.torsoSmoother.reset();
    this.tracker.interrupt();
    this._resetRepAccumulators();
  }

  _resetRepAccumulators() {
    this.repForm = new RepFormAccumulator(20); // -20 per distinct issue
    this.minKneeAngleThisRep = 180;
  }

  /** Returns per-frame analysis. See exerciseBase.js for the shape of the return value. */
  update(lm) {
    const leftKneeAngle = angleBetween(lm[LANDMARK.LEFT_HIP], lm[LANDMARK.LEFT_KNEE], lm[LANDMARK.LEFT_ANKLE]);
    const rightKneeAngle = angleBetween(lm[LANDMARK.RIGHT_HIP], lm[LANDMARK.RIGHT_KNEE], lm[LANDMARK.RIGHT_ANKLE]);
    const kneeAngle = this.kneeSmoother.update(averageOrEither(leftKneeAngle, rightKneeAngle));

    // Torso lean: angle between "straight up from the hips" and the actual hip->shoulder line.
    const hipMid = midpoint(lm[LANDMARK.LEFT_HIP], lm[LANDMARK.RIGHT_HIP]);
    const shoulderMid = midpoint(lm[LANDMARK.LEFT_SHOULDER], lm[LANDMARK.RIGHT_SHOULDER]);
    const verticalRefPoint = { x: hipMid.x, y: hipMid.y - 0.15 };
    const torsoLeanRaw = angleBetween(verticalRefPoint, hipMid, shoulderMid);
    const torsoLean = this.torsoSmoother.update(torsoLeanRaw);

    // Knee alignment (valgus / "knees caving in").
    const kneeGap = Math.abs(lm[LANDMARK.LEFT_KNEE].x - lm[LANDMARK.RIGHT_KNEE].x);
    const ankleGap = Math.abs(lm[LANDMARK.LEFT_ANKLE].x - lm[LANDMARK.RIGHT_ANKLE].x);
    const kneesCavingIn = ankleGap > 0.02 && kneeGap < ankleGap * KNEE_GAP_RATIO;
    const excessiveLean = torsoLean > MAX_TORSO_LEAN;

    this.minKneeAngleThisRep = Math.min(this.minKneeAngleThisRep, kneeAngle);
    this.repForm.tickFrame();
    this.repForm.flagIfActive('excessiveForwardLean', excessiveLean);
    this.repForm.flagIfActive('kneesCavingIn', kneesCavingIn);

    const { phase, repCompleted, reps } = this.tracker.update(kneeAngle);

    const liveIssues = [];
    if (excessiveLean) liveIssues.push('Keep your chest up');
    if (kneesCavingIn) liveIssues.push('Push your knees out over your toes');

    let repResult = null;
    if (repCompleted) {
      const notLowEnough = this.minKneeAngleThisRep > GOOD_DEPTH_ANGLE;
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
        minKneeAngle: Math.round(this.minKneeAngleThisRep),
      };
      this._resetRepAccumulators();
    }

    return {
      phase,
      reps,
      repCompleted,
      repResult,
      currentAngle: Math.round(kneeAngle),
      liveIssues,
    };
  }
}

function issueLabel(key) {
  const labels = {
    excessiveForwardLean: 'Chest dropped too far forward',
    kneesCavingIn: 'Knees caved inward',
    notLowEnough: 'Did not reach full depth',
  };
  return labels[key] || key;
}
