import assert from 'node:assert/strict';

import { evaluate, matchPeaks } from './evaluate.mjs';

const runTests = () => {
  const report = evaluate({
    manifest: {
      datasetVersion: 'pilot-v1',
      modelVersion: 'mediapipe-pose-v1',
      counterVersion: 'rep-state-machine-v1',
      repDefinitionVersion: '1.0.0',
      peakToleranceFrames: 5,
    },
    labels: [
      { clipId: 'clip-1', labelType: 'labeler', labeler: 'a', repCount: 3 },
      { clipId: 'clip-1', labelType: 'labeler', labeler: 'b', repCount: 3 },
      { clipId: 'clip-2', labelType: 'labeler', labeler: 'a', repCount: 2 },
      { clipId: 'clip-2', labelType: 'labeler', labeler: 'b', repCount: 3 },
      { clipId: 'clip-1', labelType: 'coach', labeler: 'coach-a', formScore: 80 },
      { clipId: 'clip-1', labelType: 'coach', labeler: 'coach-b', formScore: 90 },
    ],
    reconciled: [
      { clipId: 'clip-1', repCount: 3, repPeaks: [20, 50, 80], formScore: 85 },
      { clipId: 'clip-2', repCount: 2, repPeaks: [30, 60], formScore: 70 },
    ],
    predictions: [
      { clipId: 'clip-1', repCount: 3, repPeaks: [21, 49, 82], formScore: 84 },
      { clipId: 'clip-2', repCount: 3, repPeaks: [30, 61, 90], formScore: 75 },
    ],
  });

  assert.equal(report.labelerAgreement.repCount.pairedClips, 2);
  assert.equal(report.labelerAgreement.repCount.exactAgreementRate, 0.5);
  assert.equal(report.labelerAgreement.formScore.meanAbsoluteDifference, 10);
  assert.equal(report.benchmark.exactMatchRate, 0.5);
  assert.equal(report.benchmark.meanAbsoluteError, 0.5);
  assert.equal(report.benchmark.withinPlusOrMinusOneRate, 1);
  assert.equal(report.benchmark.perRep.precision, 5 / 6);
  assert.equal(report.benchmark.perRep.recall, 1);
  assert.equal(report.benchmark.perRep.f1, 10 / 11);
  assert.equal(report.formScore.meanAbsoluteError, 3);
  assert.equal(report.pilotGate.pairedClipsMet, false);
  assert.equal(report.pilotGate.exactAgreementMet, false);
  assert.equal(report.pilotGate.passed, false);
  assert.equal(matchPeaks([10], [20], 5).truePositives, 0);
  console.log('benchmark evaluator test ok');
};

runTests();
