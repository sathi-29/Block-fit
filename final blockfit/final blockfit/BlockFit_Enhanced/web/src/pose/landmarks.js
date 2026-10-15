/**
 * landmarks.js
 * ---------------------------------------------------------------
 * MediaPipe's Pose Landmarker returns 33 body keypoints per person,
 * always in this same fixed order (0-32). We only name the ones
 * BlockFit actually uses for squats / push-ups / bicep curls, but
 * the full model still detects all 33 - we just ignore the rest
 * (face detail, fingers, etc).
 *
 * Coordinates are normalized: x and y are both in [0, 1], relative
 * to the video frame width/height. (0,0) is top-left.
 */
export const LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

/** Pairs of landmark indices to draw as skeleton lines on the canvas overlay. */
export const POSE_CONNECTIONS = [
  [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_ELBOW],
  [LANDMARK.LEFT_ELBOW, LANDMARK.LEFT_WRIST],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_ELBOW],
  [LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_WRIST],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP],
  [LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP],
  [LANDMARK.LEFT_HIP, LANDMARK.LEFT_KNEE],
  [LANDMARK.LEFT_KNEE, LANDMARK.LEFT_ANKLE],
  [LANDMARK.RIGHT_HIP, LANDMARK.RIGHT_KNEE],
  [LANDMARK.RIGHT_KNEE, LANDMARK.RIGHT_ANKLE],
];
