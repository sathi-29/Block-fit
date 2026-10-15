# BlockFit Privacy Policy

Effective date: 2026-09-19

This beta policy describes the BlockFit web beta. It should be reviewed by qualified counsel before public launch, including for DPDP Act 2023, GDPR, and other applicable laws. The initial market focus is India, so patient consent, account deletion, and clinician-access controls are treated as first-class safeguards rather than optional UX details.

## India-specific safeguards

- Patient consent is required before the app shares movement or progress data with any clinician or physiotherapist.
- Clinician access is revocable at any time by the patient, and access checks are enforced on the server, not only in the UI.
- Account deletion and verification revocation are treated as user-held controls under the product's privacy model.
- Health or movement data is limited to minimal workout summaries and consented movement traces; raw video is not stored or shared by default.
- Data minimisation is a product requirement for the India launch plan: we only retain what is needed to provide coaching, progress tracking, and user support.

## What BlockFit collects

- Account name, email address, and password hash for authentication.
- Workout summaries such as exercise, rep counts, scores, duration, confidence, and timestamps.
- Consent-based quantized pose landmarks sampled at approximately 10 frames per second when landmark storage is enabled. Raw workout video is not uploaded or stored by BlockFit.
- Product events such as signup, camera start, workout completion, save failure, and public verification views. Events are used to understand the beta funnel and diagnose failures.

## Why we collect it

We use this data to provide camera coaching, save workout history, create public verification records, measure rep-count reliability, improve reliability, and respond to support or verification disputes.

## Sharing and public records

A public verification link exposes only the minimum record needed for independent verification: exercise, reps, score, status, timestamp, and canonical hash data. It does not expose email, name, raw video, or pose landmarks. Public links can be revoked and then return HTTP 410.

We do not sell personal data. Hosting and infrastructure providers process data only to operate the service.

## Retention

Raw video is never stored. Consent-based landmark streams expire after 30 days. Account data remains until deletion unless a legal retention obligation applies. Verification tombstones remain for at least 12 months so old QR links report honestly. Audit events are retained for seven years with account identity anonymized after deletion.

## Your controls

You can revoke an individual verification record, request account deletion, and withdraw consent for landmark storage. Account deletion removes credentials, profile data, workouts, and landmark streams; public verification records become `ACCOUNT_DELETED` tombstones and audit history is anonymized.

## Security and incidents

BlockFit uses password hashing, signed sessions, request validation, rate limiting, server-side integrity keys, and audit events. No online system is risk-free. Suspected incidents should be reported through the support contact supplied with the beta invitation.

## Contact and updates

The beta operator is responsible for requests, corrections, deletion, and policy updates. The production policy must replace this placeholder contact before inviting users.
