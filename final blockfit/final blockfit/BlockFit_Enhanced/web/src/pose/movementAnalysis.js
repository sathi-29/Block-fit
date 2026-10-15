import { LANDMARK } from './landmarks.js';

const MOVEMENT_LANDMARKS = [
  LANDMARK.LEFT_SHOULDER,
  LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_ELBOW,
  LANDMARK.RIGHT_ELBOW,
  LANDMARK.LEFT_WRIST,
  LANDMARK.RIGHT_WRIST,
  LANDMARK.LEFT_HIP,
  LANDMARK.RIGHT_HIP,
  LANDMARK.LEFT_KNEE,
  LANDMARK.RIGHT_KNEE,
  LANDMARK.LEFT_ANKLE,
  LANDMARK.RIGHT_ANKLE,
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getVisibility(point) {
  if (!point) return 0;
  if (typeof point.visibility === 'number') return point.visibility;
  if (typeof point.presence === 'number') return point.presence;
  return 1;
}

export function evaluatePoseConfidence(landmarks = []) {
  if (!Array.isArray(landmarks) || landmarks.length === 0) {
    return {
      confidence: 0,
      averageVisibility: 0,
      bodyCoverage: 0,
      fullBodyVisible: false,
      requiresReposition: true,
      warning: 'Unable to reliably detect your movement. Please move farther from the camera.',
      visibleLandmarks: 0,
    };
  }

  const relevant = MOVEMENT_LANDMARKS.map((index) => landmarks[index])
    .filter(Boolean);

  const visibleLandmarks = relevant.filter((point) => getVisibility(point) >= 0.45).length;
  const averageVisibility = relevant.length
    ? relevant.reduce((sum, point) => sum + getVisibility(point), 0) / relevant.length
    : 0;
  const bodyCoverage = relevant.length ? visibleLandmarks / relevant.length : 0;
  const confidence = clamp((bodyCoverage * 0.7) + (averageVisibility * 0.3), 0, 1);
  const fullBodyVisible = bodyCoverage >= 0.7 && averageVisibility >= 0.55;
  const requiresReposition = !fullBodyVisible || confidence < 0.6;

  return {
    confidence,
    averageVisibility,
    bodyCoverage,
    fullBodyVisible,
    requiresReposition,
    visibleLandmarks,
    warning: requiresReposition
      ? 'Unable to reliably detect your movement. Please move farther from the camera.'
      : 'Tracking confidence is good. Continue with the movement.',
  };
}

export function getMovementFeedback(result) {
  if (!result) return 'Unable to reliably detect your movement. Please move farther from the camera.';
  if (result.requiresReposition) {
    return 'Unable to reliably detect your movement. Please move farther from the camera.';
  }
  if (result.confidence < 0.75) {
    return 'Tracking confidence is moderate. Please improve framing, lighting, or distance.';
  }
  return 'Movement tracking is stable. Keep your range of motion controlled.';
}
