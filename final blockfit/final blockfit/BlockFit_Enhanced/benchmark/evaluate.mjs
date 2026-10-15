import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_TOLERANCE_FRAMES = 5;
const PROTOCOL_VERSION = '1.0.0';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function absoluteDifference(a, b) {
  return Math.abs(Number(a) - Number(b));
}

function pearson(valuesA, valuesB) {
  if (valuesA.length < 2 || valuesA.length !== valuesB.length) return null;
  const meanA = mean(valuesA);
  const meanB = mean(valuesB);
  const numerator = valuesA.reduce((sum, value, index) => sum + (value - meanA) * (valuesB[index] - meanB), 0);
  const denominatorA = Math.sqrt(valuesA.reduce((sum, value) => sum + (value - meanA) ** 2, 0));
  const denominatorB = Math.sqrt(valuesB.reduce((sum, value) => sum + (value - meanB) ** 2, 0));
  return denominatorA && denominatorB ? numerator / (denominatorA * denominatorB) : null;
}

function matchPeaks(referencePeaks = [], predictedPeaks = [], toleranceFrames) {
  const unmatchedReference = [...referencePeaks].sort((a, b) => a - b);
  const unmatchedPredicted = [...predictedPeaks].sort((a, b) => a - b);
  let truePositives = 0;
  let totalFrameError = 0;

  for (const predicted of unmatchedPredicted) {
    let bestIndex = -1;
    let bestDistance = Infinity;
    unmatchedReference.forEach((reference, index) => {
      const distance = Math.abs(predicted - reference);
      if (distance <= toleranceFrames && distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    });
    if (bestIndex >= 0) {
      truePositives += 1;
      totalFrameError += bestDistance;
      unmatchedReference.splice(bestIndex, 1);
    }
  }

  return {
    truePositives,
    falsePositives: predictedPeaks.length - truePositives,
    falseNegatives: referencePeaks.length - truePositives,
    meanMatchedFrameError: truePositives ? totalFrameError / truePositives : null,
  };
}

function repMetrics(rows, toleranceFrames) {
  const countErrors = rows.map((row) => absoluteDifference(row.predicted.repCount, row.reference.repCount));
  const peakTotals = rows.reduce((totals, row) => {
    const matched = matchPeaks(row.reference.repPeaks, row.predicted.repPeaks, toleranceFrames);
    totals.truePositives += matched.truePositives;
    totals.falsePositives += matched.falsePositives;
    totals.falseNegatives += matched.falseNegatives;
    totals.frameErrors.push(...(matched.meanMatchedFrameError === null ? [] : [matched.meanMatchedFrameError]));
    return totals;
  }, { truePositives: 0, falsePositives: 0, falseNegatives: 0, frameErrors: [] });
  const precision = peakTotals.truePositives + peakTotals.falsePositives
    ? peakTotals.truePositives / (peakTotals.truePositives + peakTotals.falsePositives)
    : null;
  const recall = peakTotals.truePositives + peakTotals.falseNegatives
    ? peakTotals.truePositives / (peakTotals.truePositives + peakTotals.falseNegatives)
    : null;

  return {
    clips: rows.length,
    exactMatchRate: rows.length ? rows.filter((row) => row.predicted.repCount === row.reference.repCount).length / rows.length : null,
    meanAbsoluteError: mean(countErrors),
    withinPlusOrMinusOneRate: rows.length ? rows.filter((_, index) => countErrors[index] <= 1).length / rows.length : null,
    perRep: {
      precision,
      recall,
      f1: precision !== null && recall !== null && precision + recall ? (2 * precision * recall) / (precision + recall) : null,
      peakToleranceFrames: toleranceFrames,
      meanMatchedFrameError: mean(peakTotals.frameErrors),
    },
  };
}

function agreementMetrics(rows, valueKey) {
  const pairs = [];
  const grouped = new Map();
  rows.forEach((row) => {
    const list = grouped.get(row.clipId) || [];
    list.push(row);
    grouped.set(row.clipId, list);
  });
  for (const [clipId, labels] of grouped) {
    if (labels.length !== 2 || labels.some((label) => label[valueKey] === undefined)) continue;
    pairs.push({ clipId, first: labels[0][valueKey], second: labels[1][valueKey] });
  }
  const differences = pairs.map((pair) => absoluteDifference(pair.first, pair.second));
  return {
    pairedClips: pairs.length,
    exactAgreementRate: pairs.length ? pairs.filter((pair) => pair.first === pair.second).length / pairs.length : null,
    meanAbsoluteDifference: mean(differences),
    withinPlusOrMinusOneRate: pairs.length ? differences.filter((difference) => difference <= 1).length / pairs.length : null,
  };
}

function pairedNumericMetrics(rows, valueKey) {
  const grouped = new Map();
  rows.forEach((row) => {
    const list = grouped.get(row.clipId) || [];
    list.push(row);
    grouped.set(row.clipId, list);
  });
  const pairs = [...grouped.values()]
    .filter((labels) => labels.length === 2 && labels.every((label) => label[valueKey] !== undefined))
    .map(([first, second]) => [Number(first[valueKey]), Number(second[valueKey])]);
  const differences = pairs.map(([first, second]) => Math.abs(first - second));
  return {
    pairedClips: pairs.length,
    meanAbsoluteDifference: mean(differences),
    pearsonCorrelation: pearson(pairs.map(([first]) => first), pairs.map(([, second]) => second)),
  };
}

function formMetrics(rows, modelKey, referenceKey) {
  const paired = rows.filter((row) => row[modelKey] !== undefined && row[referenceKey] !== undefined);
  const model = paired.map((row) => Number(row[modelKey]));
  const reference = paired.map((row) => Number(row[referenceKey]));
  return {
    pairedClips: paired.length,
    meanAbsoluteError: mean(model.map((value, index) => Math.abs(value - reference[index]))),
    pearsonCorrelation: pearson(model, reference),
  };
}

function evaluate(input) {
  const toleranceFrames = input.manifest?.peakToleranceFrames || DEFAULT_TOLERANCE_FRAMES;
  const labels = input.labels || [];
  const predictions = input.predictions || [];
  const reconciled = input.reconciled || [];
  const predictionByClip = new Map(predictions.map((row) => [row.clipId, row]));
  const referenceRows = reconciled
    .filter((row) => row.scorable !== false && predictionByClip.has(row.clipId))
    .map((reference) => ({ reference, predicted: predictionByClip.get(reference.clipId) }));

  const report = {
    protocolVersion: PROTOCOL_VERSION,
    manifest: input.manifest || {},
    labelerAgreement: {
      repCount: agreementMetrics(labels.filter((row) => row.labelType === 'labeler'), 'repCount'),
      formScore: pairedNumericMetrics(labels.filter((row) => row.labelType === 'coach'), 'formScore'),
    },
    benchmark: repMetrics(referenceRows, toleranceFrames),
    formScore: formMetrics(referenceRows.map(({ reference, predicted }) => ({
      modelScore: predicted.formScore,
      coachScore: reference.formScore,
    })), 'modelScore', 'coachScore'),
  };

  report.pilotGate = {
    requiredPairedClips: 10,
    minimumExactAgreementRate: 0.9,
    pairedClipsMet: report.labelerAgreement.repCount.pairedClips >= 10,
    exactAgreementMet: report.labelerAgreement.repCount.exactAgreementRate !== null
      && report.labelerAgreement.repCount.exactAgreementRate >= 0.9,
    passed: report.labelerAgreement.repCount.pairedClips >= 10
      && report.labelerAgreement.repCount.exactAgreementRate !== null
      && report.labelerAgreement.repCount.exactAgreementRate >= 0.9,
  };

  return report;
}

export { evaluate, matchPeaks };

if (path.basename(process.argv[1] || '') === 'evaluate.mjs') {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node benchmark/evaluate.mjs <benchmark.json>');
    process.exit(1);
  }

  console.log(JSON.stringify(evaluate(readJson(inputPath)), null, 2));
}
