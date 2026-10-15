import { LANDMARK } from '../pose/landmarks.js';
import { midpoint, Smoother } from '../pose/angles.js';
import { RepFormAccumulator } from './exerciseBase.js';

const HOLD_SECONDS = 3;
const BODY_LINE_MARGIN = 0.055;

export class PlankAnalyzer {
  static id = 'plank';
  static label = 'Plank hold';
  static topLabel = 'Ready';
  static bottomLabel = 'Holding';
  static cameraHint = 'Film from the side with your shoulders, hips, and ankles visible.';

  constructor() {
    this.lineSmoother = new Smoother(0.3);
    this.reset();
  }

  reset() {
    this.holdStartedAt = null;
    this.completed = false;
    this.repForm = new RepFormAccumulator(20);
  }

  onFrameMissing() {
    this.lineSmoother.reset();
    if (!this.completed) {
      this.holdStartedAt = null;
      this.repForm = new RepFormAccumulator(20);
    }
  }

  update(lm) {
    const shoulder = midpoint(lm[LANDMARK.LEFT_SHOULDER], lm[LANDMARK.RIGHT_SHOULDER]);
    const hip = midpoint(lm[LANDMARK.LEFT_HIP], lm[LANDMARK.RIGHT_HIP]);
    const ankle = midpoint(lm[LANDMARK.LEFT_ANKLE], lm[LANDMARK.RIGHT_ANKLE]);
    const dx = ankle.x - shoulder.x;
    const t = Math.abs(dx) > 0.05 ? (hip.x - shoulder.x) / dx : 0.5;
    const expectedHipY = shoulder.y + t * (ankle.y - shoulder.y);
    const deviation = this.lineSmoother.update(Math.abs(hip.y - expectedHipY));
    const poorLine = deviation > BODY_LINE_MARGIN;
    const now = performance.now();

    if (!poorLine && !this.completed) {
      if (this.holdStartedAt === null) this.holdStartedAt = now;
      this.repForm.tickFrame();
      this.repForm.flagIfActive('bodyLineBroken', poorLine);
    } else if (poorLine) {
      this.holdStartedAt = null;
    }

    const holdSeconds = this.holdStartedAt === null ? 0 : (now - this.holdStartedAt) / 1000;
    const repCompleted = !this.completed && holdSeconds >= HOLD_SECONDS;
    let repResult = null;
    if (repCompleted) {
      this.completed = true;
      const { score, issues } = this.repForm.finish();
      repResult = {
        reps: 1,
        score,
        issues,
        issueLabels: issues.map(() => 'Body line was not stable'),
        holdSeconds: Math.round(holdSeconds),
      };
    }

    return {
      phase: poorLine ? 'TOP' : 'BOTTOM',
      reps: this.completed ? 1 : 0,
      repCompleted,
      repResult,
      currentAngle: Math.round(deviation * 100),
      liveIssues: poorLine ? ['Keep your shoulders, hips, and ankles in one line'] : [],
    };
  }
}
