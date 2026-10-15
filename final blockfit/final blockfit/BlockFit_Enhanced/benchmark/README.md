# Benchmark Harness

This directory contains the pre-claim benchmark protocol and evaluator. It does not contain participant video or a product accuracy claim.

## Run the metric tests

From `BlockFit_Enhanced`:

```powershell
node benchmark/evaluate.test.mjs
```

## Evaluate a labeled dataset

Copy `template.json`, replace the placeholder labels and predictions with real clip data, and run:

```powershell
node benchmark/evaluate.mjs benchmark/pilot-v1.json > benchmark/pilot-v1-report.json
```

The report includes:

- labeler rep-count agreement
- coach form-score agreement
- exact match rate
- mean absolute error
- within-plus-or-minus-one rate
- temporal per-rep precision, recall, and F1
- model form-score MAE and Pearson correlation

Use `PROTOCOL.md` as the labeling contract. The pilot gate is at least 90% exact rep-count agreement between the two independent labelers across the first 10 clips. A report generated from the template is not evidence and must not be shown to users.

## Input conventions

`labels` contains two independent rep-count rows per clip and, when available, two coach form-score rows per clip. `reconciled` contains the adjudicated reference row used for model scoring. `predictions` contains the output from the pinned model and counter versions. `repPeaks` are zero-based source-video frame numbers.
