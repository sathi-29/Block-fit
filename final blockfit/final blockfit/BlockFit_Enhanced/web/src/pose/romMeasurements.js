import { V1_EXERCISES } from '../../../shared/exerciseCatalog.mjs';
import { angleBetween } from './angles.js';
import { LANDMARK } from './landmarks.js';

export const ROM_ENGINE_VERSION = 'unvalidated-v1';
export const MIN_ROM_LANDMARK_CONFIDENCE = 0.65;

const SIDE_LANDMARKS = {
  left: {
    shoulder: LANDMARK.LEFT_SHOULDER,
    elbow: LANDMARK.LEFT_ELBOW,
    hip: LANDMARK.LEFT_HIP,
    knee: LANDMARK.LEFT_KNEE,
    ankle: LANDMARK.LEFT_ANKLE,
  },
  right: {
    shoulder: LANDMARK.RIGHT_SHOULDER,
    elbow: LANDMARK.RIGHT_ELBOW,
    hip: LANDMARK.RIGHT_HIP,
    knee: LANDMARK.RIGHT_KNEE,
    ankle: LANDMARK.RIGHT_ANKLE,
  },
};

export const ROM_REFERENCE_CONFIG = {
  version: ROM_ENGINE_VERSION,
  clinicallyValidated: false,
  exercises: {
    'straight-leg-raise': { views: ['side'], landmarks: ['shoulder', 'hip', 'ankle'], angle: 'supplementary-hip-angle', referenceRangeDegrees: null },
    'knee-extension': { views: ['side'], landmarks: ['hip', 'knee', 'ankle'], angle: 'knee-angle', referenceRangeDegrees: null },
    'shoulder-raise': { views: ['front', 'side'], landmarks: ['hip', 'shoulder', 'elbow'], angle: 'shoulder-angle', referenceRangeDegrees: null },
  },
};

function measurementAngle(exercise, points) {
  if (exercise === 'straight-leg-raise') {
    return 180 - angleBetween(points.shoulder, points.hip, points.ankle);
  }
  if (exercise === 'knee-extension') {
    return angleBetween(points.hip, points.knee, points.ankle);
  }
  return angleBetween(points.hip, points.shoulder, points.elbow);
}

export function measureRangeOfMotion({ exercise, side, cameraView, landmarks, timestamp = new Date().toISOString() }) {
  const exerciseConfig = ROM_REFERENCE_CONFIG.exercises[exercise];
  const catalogEntry = V1_EXERCISES.find((item) => item.id === exercise);
  if (!exerciseConfig || catalogEntry?.mode !== 'rehabilitation') {
    return { status: 'unsupported-exercise', reason: 'This movement does not have a ROM measurement configuration.' };
  }
  if (!['left', 'right'].includes(side)) {
    return { status: 'invalid-side', reason: 'Measure one side at a time.' };
  }
  if (!exerciseConfig.views.includes(cameraView)) {
    return { status: 'unsupported-view', reason: `Use the ${exerciseConfig.views.join(' or ')} camera view for this measurement.` };
  }

  const indices = SIDE_LANDMARKS[side];
  const points = Object.fromEntries(exerciseConfig.landmarks.map((name) => [name, landmarks?.[indices[name]]]));
  if (Object.values(points).some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    return { status: 'low-confidence', reason: 'Required joints are not visible. Reposition and try again.', confidence: 0 };
  }

  const confidence = Math.min(...Object.values(points).map((point) => point.visibility ?? point.presence ?? 0));
  if (confidence < MIN_ROM_LANDMARK_CONFIDENCE) {
    return { status: 'low-confidence', reason: 'Required joints are not clear enough to measure reliably.', confidence };
  }

  const measuredValue = measurementAngle(exercise, points);
  if (!Number.isFinite(measuredValue) || measuredValue < 0 || measuredValue > 180) {
    return { status: 'invalid-measurement', reason: 'The movement could not be measured. Reposition and try again.', confidence };
  }

  return {
    status: 'measured',
    exercise,
    side,
    cameraView,
    measuredValue: Math.round(measuredValue),
    confidence: Math.round(confidence * 1000) / 1000,
    timestamp,
    engineVersion: ROM_ENGINE_VERSION,
    clinicallyValidated: false,
  };
}