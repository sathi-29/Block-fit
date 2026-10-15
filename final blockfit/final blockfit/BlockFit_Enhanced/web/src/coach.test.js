import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeExercise } from './coach.js';

test('reports a form-score improvement and the most frequent observed cue', () => {
  const summary = summarizeExercise({
    exercise: 'Squat',
    reps: [
      { score: 90, issueLabels: ['Knees caved inward'] },
      { score: 86, issueLabels: ['Knees caved inward'] },
      { score: 88, issueLabels: [] },
    ],
    previousSession: { formScore: 80 },
  });

  assert.equal(summary.formScore, 88);
  assert.match(summary.headline, /improved by 8 points/);
  assert.equal(summary.advice, 'Try keeping your knees aligned with your toes.');
});

test('uses a baseline message and avoids inventing a form issue', () => {
  const summary = summarizeExercise({
    exercise: 'Push-up',
    reps: [{ score: 90, issueLabels: [] }],
  });

  assert.match(summary.headline, /sets a form-score baseline/);
  assert.match(summary.advice, /No recurring form cue was identified/);
});

test('reports a lower score accurately without claiming a weekly trend', () => {
  const summary = summarizeExercise({
    exercise: 'Lunge',
    reps: [{ score: 70, issueLabels: ['Did not reach full depth'] }],
    previousSession: { formScore: 82 },
  });

  assert.match(summary.headline, /12 points lower than your last session/);
  assert.doesNotMatch(summary.headline, /this week/i);
  assert.equal(summary.advice, 'Work toward a comfortable, repeatable depth.');
});