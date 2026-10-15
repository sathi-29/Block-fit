import assert from 'node:assert/strict';
import test from 'node:test';

import { RepPhaseTracker } from './exerciseBase.js';

const feed = (tracker, angles) => angles.map((angle) => tracker.update(angle));

test('requires a stable top position before accepting a full rep', () => {
  const tracker = new RepPhaseTracker({ topThreshold: 160, bottomThreshold: 100, minHoldFrames: 2 });

  feed(tracker, [90, 90, 170, 170]);
  assert.equal(tracker.reps, 0);

  feed(tracker, [130, 90, 90, 130, 170, 170]);
  assert.equal(tracker.reps, 1);
});

test('discarding an interrupted cycle preserves completed rep count', () => {
  const tracker = new RepPhaseTracker({ topThreshold: 160, bottomThreshold: 100, minHoldFrames: 2 });
  feed(tracker, [170, 170, 130, 90, 90]);

  tracker.interrupt();
  feed(tracker, [170, 170]);
  assert.equal(tracker.reps, 0);

  feed(tracker, [130, 90, 90, 130, 170, 170]);
  assert.equal(tracker.reps, 1);
});

test('non-finite angles discard the pending cycle', () => {
  const tracker = new RepPhaseTracker({ topThreshold: 160, bottomThreshold: 100, minHoldFrames: 2 });
  feed(tracker, [170, 170, 130, 90, 90]);

  const result = tracker.update(Number.NaN);

  assert.equal(result.phase, 'START');
  assert.equal(result.repCompleted, false);
  assert.equal(tracker.reps, 0);
});