# AI Architecture

## Purpose

BlockFit is an AI-assisted movement, fitness, and rehabilitation companion. The application uses on-device pose analysis to estimate exercise quality, rep progression, and range-of-motion trends without turning camera footage into a core product artifact.

The architecture is intentionally conservative:

- use MediaPipe Pose Landmarker as the primary camera perception layer
- apply deterministic, explainable logic before any future ML training path
- keep safety and movement scoring separate from medical diagnosis
- avoid storing unnecessary biometric or video data

## Runtime layout

```text
Browser / Capacitor app
  ├── exercise UI and session flow
  ├── pose detector wrapper
  ├── movement scoring and rep logic
  └── rehab / fitness mode routing

         │
         ▼
Web worker or device thread (preferred on-device processing)
  ├── landmark validation
  ├── smoothing and temporal filtering
  ├── feature extraction
  ├── rep state machine
  ├── form analysis
  └── ROM and symmetry calculation

         │
         ▼
Backend API (Express)
  ├── accounts and auth
  ├── workouts and history
  ├── clinician consent and program records
  ├── privacy-aware verification records
  └── integrity and audit helpers

         │
         ▼
PostgreSQL or in-memory dev store
  ├── user profiles
  ├── workout summaries
  ├── ROM measurements
  ├── clinician access records
  └── audit events
```

## Current implementation status

The repository already includes the core MVP pieces for the real product direction:

- fitness and rehabilitation entry points in the web app
- MediaPipe-based pose utilities in the web frontend
- rehab catalog and sample plan model in the shared layer
- backend auth and workout persistence
- clinician invitation / patient approval models
- ROM measurement utilities for rehab movements
- privacy-oriented product copy and non-diagnostic language

These pieces are treated as production-ready only when backed by tests, privacy review, safety checks, and explicit user consent.

The active browser implementation is organized under `web/src/pose/` and `web/src/exercises/`, with the session workflow in `web/src/pages/workout.js`. The disconnected experimental `ai/` engine was removed after repository-wide reference checks confirmed it was not used by the application, tests, or build. Keep movement logic out of UI components where practical, but do not introduce a second engine alongside the active analyzers.

## Input / output model

### Input

- camera frames from the device camera or video source
- pose landmarks with confidence values
- user metadata such as account and workout session state
- optional exercise mode (fitness or rehabilitation)

### Output

- movement readiness state
- rep count and phase transitions
- form score and specific coaching cues
- ROM measurement values with confidence and camera view metadata
- symmetry and trend summaries
- safety state for continuing, reducing range, resting, or stopping

## AI pipeline

1. Camera frame capture
2. MediaPipe Pose Landmarker inference
3. pose confidence validation
4. landmark filtering and smoothing
5. biomechanical feature extraction
6. exercise recognition and classification
7. temporal movement analysis
8. rep state-machine transitions
9. form and ROM analysis
10. symmetry and movement score aggregation
11. safety gating before continuing
12. persistence of only derived metrics

## Product constraints

- no blockchain or public-chain dependency as a core product feature
- no claimed medical diagnosis
- no clinically validated therapeutic claims without qualified review
- no raw camera video stored by default
- no automated therapist prescription changes in rehab mode
- no fake AI model; deterministic rule-based classification is the current implementation

## Future ML path

The repo is prepared for a future temporal ML stage, but it does not yet contain a fake trained model. The future architecture should consume normalized pose sequences and feature windows instead of raw video frames.

Supported future models:

- TCN
- GRU / LSTM
- Temporal Transformer

The training interface should be based on normalized body-relative features, not identity-sensitive or raw-camera data.

## Safety boundary

The AI layer is for support, not diagnosis. It provides movement guidance and adherence tracking, while the product keeps clinical decisions under qualified professionals.
