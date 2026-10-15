# ML Training

## Purpose

The system is prepared for future temporal ML, but it is intentionally not pretending to have a trained model today.

The current logic is deterministic and explainable. This keeps the product honest and safe while preparing the data pipeline for a future supervised learning stage.

## Training data format

Each training sequence should include:

- timestamp
- exercise
- phase
- landmarks / features
- side
- confidence
- form label
- rep label
- quality label

This is the expected data shape for a future classification or temporal model.

## Normalization approach

The training pipeline should normalize body coordinates relative to the user rather than collecting identity-sensitive or raw-image data.

Use:

- hip-centered coordinates
- scale-normalized distances
- relative joint angles
- velocities and acceleration features
- body-relative symmetry measures

Not raw video, and not unnecessary biometric attributes.

## Candidate architectures

The repo is intentionally prepared for:

- TCN
- GRU / LSTM
- Temporal Transformer

The future model should consume a sequence of normalized features rather than raw video. This keeps the modeling path aligned with device privacy and explainability.

## Why not a fake model

A fake or placeholder AI model would be misleading. This repo therefore keeps the deterministic pipeline as the active runtime model and leaves the ML layer as a forward-compatible interface.

Any future model must only be added when:

- the data is real and label quality is validated
- the feature pipeline is stable
- the safety and privacy review is complete
- the model is tested and clearly labeled as a support system, not a medical diagnostic tool

## Data minimization

The app stores only derived metrics needed for progress tracking. It does not store unnecessary camera footage or raw video sequences by default.

## Minimum future requirements

Before a production ML model is released, the product should have:

- dataset review by the engineering and product team
- privacy validation
- model benchmarking against deterministic baselines
- safety and release sign-off
- clinician review for any rehab-specific claims
