import { LANDMARK } from '../pose/landmarks.js';
import { angleBetween, averageOrEither, midpoint, Smoother } from '../pose/angles.js';
import { RepPhaseTracker, RepFormAccumulator } from './exerciseBase.js';

const TOP_ANGLE = 160;
const BOTTOM_ANGLE = 125;
const GOOD_DEPTH_ANGLE = 105;
const MAX_TORSO_LEAN = 42;

export class LungeAnalyzer {
  static id = 'lunge';
  static label = 'Lunge';
  static topLabel = 'Standing';
  static bottomLabel = 'Bottom';
  static cameraHint = 'Stand at a 3/4 angle with your full body visible. Step forward into each lunge.';

  constructor() {
    this.kneeSmoother = new Smoother(0.3);
    this.torsoSmoother = new Smoother(0.3);
    this.tracker = new RepPhaseTracker({
      topThreshold: TOP_ANGLE,
      bottomThreshold: BOTTOM_ANGLE,
      minHoldFrames: 3,
    });
    this.reset();
  }

  onFrameMissing() {
    this.kneeSmoother.reset();
    this.torsoSmoother.reset();
    this.tracker.interrupt();
    this.repForm = new RepFormAccumulator(20);
    this.minKneeAngleThisRep = 180;
  }

  reset() {
    this.repForm = new RepFormAccumulator(20);
    this.minKneeAngleThisRep = 180;
  }

  update(lm) {
    const leftKnee = angleBetween(lm[LANDMARK.LEFT_HIP], lm[LANDMARK.LEFT_KNEE], lm[LANDMARK.LEFT_ANKLE]);
    const rightKnee = angleBetween(lm[LANDMARK.RIGHT_HIP], lm[LANDMARK.RIGHT_KNEE], lm[LANDMARK.RIGHT_ANKLE]);
    const kneeAngle = this.kneeSmoother.update(averageOrEither(leftKnee, rightKnee));

    const hipMid = midpoint(lm[LANDMARK.LEFT_HIP], lm[LANDMARK.RIGHT_HIP]);
    const shoulderMid = midpoint(lm[LANDMARK.LEFT_SHOULDER], lm[LANDMARK.RIGHT_SHOULDER]);
    const verticalRef = { x: hipMid.x, y: hipMid.y - 0.15 };
    const torsoLean = this.torsoSmoother.update(angleBetween(verticalRef, hipMid, shoulderMid));
    const excessiveLean = torsoLean > MAX_TORSO_LEAN;

    this.minKneeAngleThisRep = Math.min(this.minKneeAngleThisRep, kneeAngle);
    this.repForm.tickFrame();
    this.repForm.flagIfActive('excessiveForwardLean', excessiveLean);

    const { phase, repCompleted, reps } = this.tracker.update(kneeAngle);
    const liveIssues = excessiveLean ? ['Keep your chest up'] : [];
    let repResult = null;

    if (repCompleted) {
      const issues = this.repForm.finish().issues;
      const notLowEnough = this.minKneeAngleThisRep > GOOD_DEPTH_ANGLE;
      if (notLowEnough) issues.push('notLowEnough');
      repResult = {
        reps,
        score: Math.max(0, 100 - issues.length * 20),
        issues,
        issueLabels: issues.map(issueLabel),
        minKneeAngle: Math.round(this.minKneeAngleThisRep),
      };
      this.reset();
    }

    return { phase, reps, repCompleted, repResult, currentAngle: Math.round(kneeAngle), liveIssues };
  }
}

function issueLabel(key) {
  return {
    excessiveForwardLean: 'Chest dropped too far forward',
    notLowEnough: 'Did not reach full lunge depth',
  }[key] || key;
}
