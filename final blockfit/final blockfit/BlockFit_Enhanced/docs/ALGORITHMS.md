# Algorithms

## Overview

BlockFit uses a hybrid pipeline: deterministic biomechanical analysis, temporal state machines, and explainable scoring. The goal is to surface useful movement feedback without pretending that a rule engine is a medical validator.

## 1. Pose confidence validation

Used before counting reps or asking the user to continue. The system filters out low-quality or partially visible frames.

Inputs:
- landmark visibility values
- landmark confidence values
- body-region coverage checks
- camera-distance and occlusion heuristics

Outputs:
- ready / tracking / low-confidence / tracking-lost status
- user guidance such as "Move slightly farther from the camera." or "Make sure your knees are visible."

## 2. Temporal smoothing

The current architecture supports lightweight smoothing with a One Euro filter pattern, which is ideal for mobile and real-time movement analysis.

Key parameters:
- cutoff frequency
- beta
- per-landmark state
- reset on tracking loss

Why it is used:
- reduces jitter without adding long delay
- keeps feedback responsive for real-time rep counting
- works well with small mobile devices and live camera input

## 3. Biomechanical feature calculations

The shared biomechanics layer is designed around reusable functions such as:

- calculateAngle(A, B, C)
- calculate3DAngle(A, B, C)
- calculateDistance(A, B)
- calculateVelocity(previous, current, deltaTime)
- calculateSymmetry(leftValue, rightValue)

These functions support:
- joint angle extraction
- segment vectors and limb inclination
- torso and pelvic alignment
- movement velocity and acceleration
- left/right comparison

The implementation avoids scattering repeated formulas into each exercise analyzer.

## 4. Exercise feature extraction

Each exercise declares the specific features it depends on. The shared extractor pattern allows the app to keep the feature set explicit and configurable.

Examples:
- squat: knee angle, hip angle, depth, symmetry, hip displacement
- push-up: elbow angle, body straightness, depth, torso alignment
- lunge: front/back knee angle, step distance, symmetry
- bicep curl: elbow angle, upper-arm movement, curl velocity
- plank: shoulder and hip alignment, hold duration
- straight-leg raise: hip angle, leg elevation, ROM, side
- knee extension: knee angle, lower-leg movement, ROM
- shoulder raise: shoulder elevation, trunk compensation, ROM

## 5. Rep state machine

The app uses a finite-state design for temporal exercise recognition:

- TOP
- DESCENDING
- BOTTOM
- ASCENDING
- TOP
- REP COMPLETED

This helps prevent double counting and supports noisy transitions, partial reps, and tracking interruptions.

Behavioral rules include:
- minimum movement amplitude
- minimum time between repetitions
- noise debounce
- confidence threshold
- incomplete repetition handling
- reset on tracking loss

## 6. Form analysis

Form scoring is kept separate from rep counting so the UI can explain quality independently from repetition progress.

Structured output:

```js
{
  score: 82,
  issues: [{
    type: 'KNEE_ALIGNMENT',
    severity: 'moderate',
    message: 'Your knee is moving inward.',
    correction: 'Keep your knee tracking more closely over your foot.'
  }],
  severity: 'moderate',
  explanation: 'The knee deviates inwards during the descent.',
  correction: 'Keep the knee aligned over the foot and maintain a steady torso.',
  confidence: 0.88
}
```

This is designed to be explainable and not a diagnosis.

## 7. ROM measurement

ROM is measured as an observed geometric range over time. For the current V1 rehab movements, the app records:

- exercise
- side
- start angle
- minimum angle
- maximum angle
- ROM
- confidence
- camera view
- timestamp

Example:

```text
ROM = maximum angle - minimum angle
```

This is stored as a measurement artifact, not a medical claim.

## 8. Symmetry engine

Symmetry compares left and right ROM or movement quality to reveal imbalances. A simple implementation is:

```text
symmetry = 100 - (abs(leftROM - rightROM) / max(leftROM, rightROM) * 100)
```

Tracked values include:
- ROM symmetry
- angle symmetry
- movement velocity symmetry
- repetition symmetry
- movement amplitude symmetry

## 9. Movement score

The current BlockFit movement score is a configurable, non-clinical metric. It combines weighted factors, not a validated clinical indicator.

Current weighting:
- Form Quality: 25%
- Movement Control: 20%
- ROM: 20%
- Symmetry: 15%
- Consistency: 10%
- Progress: 10%

This metric is labeled as a BlockFit movement metric and is not a clinically validated score.

## 10. Safety engine

Safety logic operates as a separate decision layer:

- SAFE_TO_CONTINUE
- SLOW_DOWN
- REDUCE_RANGE
- REST
- STOP_EXERCISE
- SEEK_PROFESSIONAL_GUIDANCE

Safety is based on:
- pose confidence
- movement quality
- velocity
- excessive range of motion
- abnormal movement patterns
- user-reported discomfort or pain
- tracking quality

The app pauses analysis if confidence becomes too low and stops or recommends professional guidance when pain is reported.

## 11. Personalization and progression

The personalization model compares the current session against the user's own baseline for:
- typical ROM
- form score
- movement speed
- symmetry
- rep quality

This helps show trends like: "ROM increased by 8.6% compared with your baseline." It is not interpreted as a medical recovery claim.

## 12. Future ML interface

The repo is prepared for a future temporal sequence model. The future model should operate on normalized feature sequences and not raw video data.

Required interface shape:

```js
TemporalExerciseModel.predict(sequence)
```

The current implementation intentionally uses deterministic logic until there is real training data and qualified validation.
