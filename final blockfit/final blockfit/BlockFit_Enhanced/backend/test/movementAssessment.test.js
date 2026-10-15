import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluatePoseConfidence, getMovementFeedback } from '../../web/src/pose/movementAnalysis.js';

const makeLandmarks = ({ visibility = 0.9 } = {}) => Array.from({ length: 33 }, (_, index) => ({
  x: 0.5,
  y: 0.5,
  z: 0,
  visibility,
  presence: visibility,
  index,
}));

test('evaluatePoseConfidence accepts a well-framed pose', () => {
  const result = evaluatePoseConfidence(makeLandmarks({ visibility: 0.9 }));
  assert.equal(result.fullBodyVisible, true);
  assert.ok(result.confidence >= 0.75);
  assert.equal(result.requiresReposition, false);
});

test('getMovementFeedback warns users when tracking confidence is too low', () => {
  const result = evaluatePoseConfidence(makeLandmarks({ visibility: 0.3 }));
  assert.equal(result.fullBodyVisible, false);
  assert.equal(result.requiresReposition, true);
  assert.match(getMovementFeedback(result), /farther from the camera|reposition/i);
});
