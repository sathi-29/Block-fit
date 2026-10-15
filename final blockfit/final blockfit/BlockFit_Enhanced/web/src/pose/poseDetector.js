/**
 * poseDetector.js
 * ---------------------------------------------------------------
 * Thin wrapper around MediaPipe's PoseLandmarker (the modern
 * "Tasks Vision" API). This is the only file that talks to
 * MediaPipe directly - everything else in the app works with
 * plain {x, y} landmark objects, so you could swap in a different
 * pose model later without touching the exercise logic.
 *
 * MODEL CHOICE:
 *   MediaPipe ships 3 pose models with a speed/accuracy trade-off:
 *     - lite  : fastest, least accurate - use if the demo laptop is weak
 *     - full  : balanced (default here)
 *     - heavy : most accurate, slowest - only if you have a GPU to spare
 *   Change POSE_MODEL below if your demo machine struggles for fps.
 */
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { LANDMARK } from './landmarks.js';
import { evaluatePoseConfidence } from './movementAnalysis.js';

const POSE_MODEL = 'lite'; // 'lite' | 'full' | 'heavy'

// Loaded from jsDelivr's CDN at runtime (same pattern MediaPipe's own
// examples use) so we don't have to fight Vite over bundling .wasm
// files. Requires the demo machine to have internet access.
const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';

const MODEL_URL = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${POSE_MODEL}/float16/1/pose_landmarker_${POSE_MODEL}.task`;
const MIN_LANDMARK_VISIBILITY = 0.55;
const MAX_MODEL_LOAD_RETRIES = 2;
const REQUIRED_LANDMARKS = [
  LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP,
  LANDMARK.LEFT_KNEE, LANDMARK.RIGHT_KNEE,
  LANDMARK.LEFT_ANKLE, LANDMARK.RIGHT_ANKLE,
  LANDMARK.LEFT_ELBOW, LANDMARK.RIGHT_ELBOW,
  LANDMARK.LEFT_WRIST, LANDMARK.RIGHT_WRIST,
];

/** Creates and returns a ready-to-use PoseLandmarker running in VIDEO mode. */
export async function createPoseLandmarker() {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_MODEL_LOAD_RETRIES; attempt += 1) {
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      return landmarker;
    } catch (error) {
      lastError = error;
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const fallbackLandmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        return fallbackLandmarker;
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    }
  }

  throw new Error(`Could not initialize pose model (${lastError?.message || 'unknown error'}). Please retry or switch to a stronger network connection.`);
}

/**
 * Runs detection on a single video frame.
 * Returns the 33 normalized landmarks for the first detected person,
 * or null if no person was detected in this frame.
 */
export function detectFrame(landmarker, videoEl, timestampMs) {
  const result = landmarker.detectForVideo(videoEl, timestampMs);
  if (!result.landmarks || result.landmarks.length === 0) return null;
  const landmarks = result.landmarks[0];
  const visible = REQUIRED_LANDMARKS.every((index) => {
    const point = landmarks[index];
    return point && (point.visibility ?? point.presence ?? 1) >= MIN_LANDMARK_VISIBILITY;
  });
  if (!visible) {
    const assessment = evaluatePoseConfidence(landmarks);
    if (assessment.requiresReposition) return null;
  }
  const quality = evaluatePoseConfidence(landmarks);
  if (quality.requiresReposition) return null;
  return landmarks;
}
