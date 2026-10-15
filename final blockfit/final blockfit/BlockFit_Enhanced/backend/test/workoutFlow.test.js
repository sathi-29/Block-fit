import assert from 'node:assert/strict';

import { createVerificationRecord } from '../src/lib/integrity.js';

const buildWorkoutResult = ({
  exercise = 'pushup',
  validReps = 18,
  invalidReps = 3,
  formScore = 87,
  performanceScore = 84,
  durationSeconds = 240,
  confidence = 0.92,
  workoutId = 'wk_001',
}) => ({
  exercise,
  validReps,
  invalidReps,
  formScore,
  performanceScore,
  durationSeconds,
  confidence,
  workoutId,
  verificationStatus: 'VERIFIED',
  issues: ['hip sag', 'incomplete movement'],
});

const runTests = () => {
  const workoutResult = buildWorkoutResult({});
  const verification = createVerificationRecord({
    verificationId: `ver_${workoutResult.workoutId}`,
    exercise: workoutResult.exercise,
    validReps: workoutResult.validReps,
    score: workoutResult.performanceScore,
    timestamp: new Date().toISOString(),
    credentialStatus: 'VERIFIED',
  });

  assert.equal(workoutResult.exercise, 'pushup');
  assert.equal(workoutResult.validReps, 18);
  assert.ok(workoutResult.validReps >= workoutResult.invalidReps, 'valid reps should not be lower than invalid reps for a passing result');
  assert.ok(workoutResult.confidence > 0.8, 'confidence should be strong enough for verification');
  assert.equal(verification.credentialStatus, 'VERIFIED');
  assert.match(verification.hash, /^[a-f0-9]+$/, 'hash should be a SHA-256 hex string');
  assert.equal(verification.transactionHash, null, 'off-chain verification must not claim a transaction hash');

  console.log('workout flow test ok');
};

runTests();
