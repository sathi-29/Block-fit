import assert from 'node:assert/strict';

import { createStore } from '../src/lib/store.js';

const runTests = () => {
  const store = createStore();

  const user = store.addUser({
    id: 'user_persist_1',
    email: 'persist@example.com',
    name: 'Persist User',
    passwordHash: 'hash_123',
  });

  assert.ok(user.id, 'user should be stored');
  assert.equal(store.findUserByEmail('persist@example.com').email, 'persist@example.com');

  const workout = store.addWorkout({
    id: 'workout_persist_1',
    exercise: 'squat',
    validReps: 15,
    invalidReps: 2,
    formScore: 90,
    performanceScore: 88,
    durationSeconds: 190,
    confidence: 0.91,
    workoutId: 'wk_persist_1',
    verificationStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
  });

  assert.equal(store.listWorkouts().length, 1);
  assert.equal(store.listWorkouts()[0].workoutId, 'wk_persist_1');
  assert.equal(workout.exercise, 'squat');

  const verification = store.addVerificationRecord({
    verificationId: 'ver_persist_1',
    hash: 'abc123',
    exercise: 'squat',
    validReps: 15,
    score: 88,
    timestamp: new Date().toISOString(),
    credentialStatus: 'VERIFIED',
    transactionHash: '0xabc',
    canonical: 'canonical-data',
  });

  assert.equal(store.getVerificationById('ver_persist_1').verificationId, 'ver_persist_1');
  assert.equal(verification.exercise, 'squat');

  console.log('persistence flow test ok');
};

runTests();
