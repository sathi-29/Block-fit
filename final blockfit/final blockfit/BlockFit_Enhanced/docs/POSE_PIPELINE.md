# Pose Pipeline

## Overview

The pose pipeline is designed to keep motion analysis local to the device and to reject low-quality or ambiguous frames before they affect counting or scoring.

## Full pipeline

```text
camera frame
  -> MediaPipe Pose Landmarker
  -> landmark visibility checks
  -> outlier and invalid landmark rejection
  -> temporal smoothing
  -> biomechanics extraction
  -> exercise feature extraction
  -> temporal exercise recognition
  -> form analysis
  -> ROM / symmetry analysis
  -> safety gating
  -> UI feedback + workout persistence
```

## Frame-level checks

For every frame, the system should:

1. validate landmark visibility
2. reject invalid or outlier landmarks
3. smooth landmark movement using lightweight temporal filtering
4. handle missing landmarks gracefully
5. reset filter state when tracking is lost

## Quality states

The system uses the following readiness states:

- NOT_READY
- READY
- TRACKING
- LOW_CONFIDENCE
- TRACKING_LOST

These states are used to decide whether the app is safe to start counting reps or whether it should prompt the user to reposition.

## User guidance examples

Examples already used by the design and logic:

- "Move slightly farther from the camera."
- "Make sure your knees are visible."
- "Turn sideways for this exercise."
- "Full body must be visible."
- "Lighting is too low."

## Why the pipeline is conservative

The goal is low latency and reliable user guidance, not speculative AI certainty. That means:

- skip rep counting until confidence is adequate
- pause analysis when the pose is unclear
- prefer honest low-confidence states over false positives
- use deterministic movement thresholds for V1 reliability

## Device and performance constraints

The app intentionally avoids expensive per-frame work by:

- checking only the required landmarks for the active exercise
- using temporal windows rather than analyzing every frame as a full-body model
- reusing small biomechanical helper functions
- keeping the processing path on-device whenever possible
- avoiding unnecessary upload of video or raw camera data

## Current repo implementation

The repository currently contains the relevant building blocks in the web pose utilities, including:

- pose confidence evaluation logic
- exercise-specific movement analysis
- ROM measurement utilities
- landmark references and angle helpers
- motion trend summaries for progress and history

This satisfies the V1 architecture for a consumer-facing movement app without inventing unsupported medical claims.
