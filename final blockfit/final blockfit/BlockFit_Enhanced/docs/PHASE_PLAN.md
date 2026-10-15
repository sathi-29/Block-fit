# Phase Plan

# BlockFit Delivery Plan

This plan tracks production readiness for the consumer fitness and rehabilitation app. A phase is complete only when implementation and its release checks are verified.

## 1. Product foundation
- Keep fitness and rehabilitation as the primary user modes.
- Make privacy, consent, and camera controls clear.
- Avoid diagnostic and unreviewed treatment claims.

## 2. Movement quality
- Validate exercise state transitions and repetition counting against noisy and incomplete poses.
- Measure tracking confidence and explain when users need to reposition.
- Benchmark supported exercises before expanding the catalog.
- Keep V1 to five-to-eight evidence-backed movements; add rehabilitation exercises only after movement benchmarks and qualified review.

## 3. Rehabilitation workflows
- Define structured plans and progress measures with qualified clinical review.
- Let users pause, stop, and review their history.
- Keep AI guidance supportive and non-diagnostic.
- Add optional physiotherapist accounts, consent-based patient linking, assigned plans, and clinician progress views only after patient privacy and access controls are validated.
- Validate camera angle and measurement reliability before reporting ROM or asymmetry trends.

## 4. Production operations
- Verify production secrets, database persistence, backups, and account deletion.
- Add monitoring and actionable service health checks.
- Test browser-to-API and physical Android device workflows.

## 5. Release and iteration
- Run backend, movement benchmark, build, privacy, and accessibility checks.
- Validate model assets, offline behavior, and mobile permissions on supported devices.
- Release incrementally and prioritize issues from real user feedback.
