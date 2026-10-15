import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExerciseProgress } from './progress.js';

test('groups sessions by exercise and computes form and correct-rep trends chronologically', () => {
  const progress = buildExerciseProgress([
    { exercise: 'squat', createdAt: '2026-02-02T00:00:00.000Z', formScore: 86, validReps: 9, invalidReps: 1 },
    { exercise: 'pushup', createdAt: '2026-01-01T00:00:00.000Z', formScore: 70, validReps: 7, invalidReps: 3 },
    { exercise: 'squat', createdAt: '2026-01-01T00:00:00.000Z', formScore: 68, validReps: 72, invalidReps: 28 },
  ]);

  assert.deepEqual(progress.find((item) => item.exercise === 'squat'), {
    exercise: 'squat',
    sessionCount: 2,
    firstFormScore: 68,
    latestFormScore: 86,
    firstRepAccuracy: 72,
    latestRepAccuracy: 90,
  });
  assert.equal(progress.find((item) => item.exercise === 'pushup').sessionCount, 1);
});

test('does not report rep accuracy for holds or sessions without reps', () => {
  const progress = buildExerciseProgress([
    { exercise: 'plank', createdAt: '2026-01-01T00:00:00.000Z', formScore: 84, validReps: 0, invalidReps: 0 },
    { exercise: 'pushup', createdAt: '2026-01-02T00:00:00.000Z', formScore: 84, validReps: 0, invalidReps: 0 },
  ]);

  assert.equal(progress.find((item) => item.exercise === 'plank').latestRepAccuracy, null);
  assert.equal(progress.find((item) => item.exercise === 'pushup').latestRepAccuracy, null);
});