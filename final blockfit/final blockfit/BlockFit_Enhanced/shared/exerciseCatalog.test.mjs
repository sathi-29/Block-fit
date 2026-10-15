import assert from 'node:assert/strict';
import test from 'node:test';

import { DEMO_REHABILITATION_PLAN, REHABILITATION_PLAN_FIELDS, V1_EXERCISES } from './exerciseCatalog.mjs';

test('V1 catalog contains exactly the agreed eight exercises and no duplicates', () => {
  assert.equal(V1_EXERCISES.length, 8);
  assert.equal(new Set(V1_EXERCISES.map((exercise) => exercise.id)).size, 8);
  assert.deepEqual(V1_EXERCISES.filter((exercise) => exercise.mode === 'fitness').map((exercise) => exercise.name), [
    'Squat', 'Push-up', 'Lunge', 'Bicep Curl', 'Plank',
  ]);
  assert.deepEqual(V1_EXERCISES.filter((exercise) => exercise.mode === 'rehabilitation').map((exercise) => exercise.name), [
    'Straight-Leg Raise', 'Knee Extension', 'Shoulder Raise',
  ]);
});

test('sample rehabilitation plan is explicitly a demo and contains no unprovided prescription fields', () => {
  assert.match(DEMO_REHABILITATION_PLAN.label, /DEMO SAMPLE.*NOT A PRESCRIPTION/);
  assert.equal(DEMO_REHABILITATION_PLAN.clinicianReviewed, false);
  assert.ok(DEMO_REHABILITATION_PLAN.exercises.every((exercise) =>
    Object.keys(exercise).every((field) => ['exerciseId', 'sets', 'repetitions'].includes(field))));
  assert.deepEqual(REHABILITATION_PLAN_FIELDS, [
    'exerciseId', 'sets', 'repetitions', 'side', 'durationSeconds', 'romTargetDegrees', 'restSeconds',
    'stopConditions', 'modificationGuidance',
  ]);
});