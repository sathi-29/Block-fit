# BlockFit Architecture

## Product boundary

BlockFit is an AI-powered movement, fitness, and rehabilitation companion for consumers. It provides camera-based exercise feedback, workout tracking, and progress history. It does not diagnose conditions or replace guidance from a qualified clinician. Physiotherapy programs and clinical claims require qualified review before release.

## Current runtime

```text
Web app (Vite) ──┐
                 ├── Express API ── PostgreSQL
Android app ─────┘        │
                          └── Auth, workouts, user data, verification records

Camera frames ── MediaPipe pose detection ── Confidence checks
              ── Exercise analysis ── Feedback and workout results
```

The web app is the shared product interface. The Android app packages that interface with Capacitor. Pose processing happens on-device; the API stores account and workout data. Raw camera video is not part of the workout record.

## Responsibilities

### Web and Android apps
- account access and profile management
- fitness and rehabilitation entry points
- camera-based exercise sessions and feedback
- workout summaries, history, and progress
- accessible permission, loading, error, and low-confidence states

### Pose and movement analysis
- detect body landmarks using the pose model
- reject frames with insufficient visibility or confidence
- analyze exercise-specific movement phases and repetitions
- return structured feedback without presenting it as medical diagnosis

### Backend API
- authentication, authorization, and account lifecycle
- workout validation and persistence
- user data and analytics endpoints
- internal audit and record-integrity helpers
- privacy-aware verification records and revocation

### Persistence and integrity
- PostgreSQL is the production persistence layer
- in-memory storage is for development and tests
- SHA-256 and HMAC helpers support internal record integrity
- integrity hashes are not a public-chain feature or a claim that exercise form is clinically validated

## Delivery priorities

1. Protect user safety, privacy, and account data.
2. Validate pose confidence and exercise scoring against realistic movement tests.
3. Build structured rehabilitation plans with clinician review and clear user controls.
4. Establish production monitoring, recovery, and support workflows.
5. Expand offline behavior and native mobile support based on device testing.

Features should be described as available only after their user flows, data handling, and release checks are implemented and verified.
