import assert from 'node:assert/strict';
import test from 'node:test';

import { measureRangeOfMotion, ROM_ENGINE_VERSION } from './romMeasurements.js';
import { LANDMARK } from './landmarks.js';

function makePose({ shoulder, hip, knee, ankle, elbow }) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.9 }));
  for (const [index, point] of [
    [LANDMARK.LEFT_SHOULDER, shoulder],
    [LANDMARK.LEFT_HIP, hip],
    [LANDMARK.LEFT_KNEE, knee],
    [LANDMARK.LEFT_ANKLE, ankle],
    [LANDMARK.LEFT_ELBOW, elbow],
  ]) {
    if (point) landmarks[index] = { ...point, visibility: 0.9 };
  }
  return landmarks;
}

test('measures knee extension with side-view landmarks and includes required metadata', () => {
  const result = measureRangeOfMotion({
    exercise: 'knee-extension',
    side: 'left',
    cameraView: 'side',
    landmarks: makePose({
      hip: { x: 0.5, y: 0.2 },
      knee: { x: 0.5, y: 0.5 },
      ankle: { x: 0.5, y: 0.8 },
    }),
    timestamp: '2026-01-01T00:00:00.000Z',
  });

  assert.equal(result.status, 'measured');
  assert.equal(result.measuredValue, 180);
  assert.equal(result.cameraView, 'side');
  assert.equal(result.side, 'left');
  assert.equal(result.timestamp, '2026-01-01T00:00:00.000Z');
  assert.equal(result.engineVersion, ROM_ENGINE_VERSION);
  assert.equal(result.clinicallyValidated, false);
});

test('rejects a camera view that is unreliable for the selected movement', () => {
  const result = measureRangeOfMotion({
    exercise: 'straight-leg-raise',
    side: 'left',
    cameraView: 'front',
    landmarks: makePose({}),
  });

  assert.equal(result.status, 'unsupported-view');
});

test('rejects measurements with low landmark visibility', () => {
  const landmarks = makePose({
    hip: { x: 0.5, y: 0.2 },
    knee: { x: 0.5, y: 0.5 },
    ankle: { x: 0.5, y: 0.8 },
  });
  landmarks[LANDMARK.LEFT_KNEE].visibility = 0.3;

  const result = measureRangeOfMotion({
    exercise: 'knee-extension',
    side: 'left',
    cameraView: 'side',
    landmarks,
  });

  assert.equal(result.status, 'low-confidence');
});