# BlockFit Phase 0 Decisions

Status: frozen for beta planning, version 1.0.0, 2026-09-19

These decisions are the contract for Phases 1-6. A change requires a new decision version and a migration note.

## 1. Landmark streams

**Decision: yes, with explicit consent.**

BlockFit stores a quantized landmark stream for server-side re-scoring and dispute investigation. The stream is sampled at approximately 10 frames per second and contains normalized landmark coordinates, visibility, confidence, and source frame numbers. Raw video is not stored by BlockFit.

Storage requirements:

- `landmark_streams.consent_given` must be true before a stream is written.
- Consent timestamp and retention expiry are stored with the stream.
- Streams are deleted automatically 30 days after workout completion.
- Users can delete a stream earlier from account controls.
- No landmark stream is included in a public verification response.

Reflecting schema: `landmark_streams` table in `backend/src/db/schema.sql`.

## 2. Canonical record serialization

The signed and hashed verification payload is the UTF-8 byte sequence of this exact JSON serialization:

```json
{"credentialStatus":"VERIFIED","exercise":"pushup","score":84,"timestamp":"2026-01-01T00:00:00.000Z","validReps":18,"verificationId":"ver_123"}
```

The keys are sorted in ascending Unicode/code-unit order by `JSON.stringify(value, Object.keys(value).sort())`. Values are normalized as follows:

- `verificationId`, `exercise`, and `credentialStatus`: `String(value || fallback)`
- `validReps` and `score`: `Number(value || 0)`
- `timestamp`: supplied ISO-8601 string, or server-generated ISO-8601 timestamp

The hash is lowercase hexadecimal SHA-256 of the UTF-8 bytes. No whitespace, trailing newline, locale formatting, or client-provided transaction hash participates in the canonical payload. The current implementation is in `backend/src/lib/integrity.js`.

## 3. Verification status matrix

| Situation | HTTP status | `verificationStatus` | Verifier meaning |
|---|---:|---|---|
| Valid record | 200 | `VERIFIED` | Record exists and is currently active. |
| Individually revoked | 410 | `REVOKED` | Account holder revoked this record. |
| Account deleted | 410 | `ACCOUNT_DELETED` | Record is unavailable because its account was deleted. |
| Retention expired | 410 | `EXPIRED` | Record passed its published retention period. |
| Never existed | 404 | `NOT_FOUND` | No record with this identifier exists. |

The API and HTML verification page must preserve this distinction. A 410 response intentionally reveals that a record once existed; this is accepted because verifier honesty is more useful than silently treating revocation as a typo. All public verification responses will be `noindex`.

## 4. Revocation semantics

Individual revocation and account deletion are separate events:

- Individual revocation sets `credential_status = 'REVOKED'`, records `revoked_at` and `revocation_reason`, and returns 410 with copy identifying revocation by the account holder.
- Account deletion revokes all active links with `credential_status = 'ACCOUNT_DELETED'`, records the deletion event, removes or anonymizes personal data, and returns 410 with account-deletion copy.
- Retention cleanup sets `credential_status = 'EXPIRED'` where a retained tombstone is required, then deletes landmark streams.

No active verification record is silently converted to `NOT_FOUND` by a user action.

## 5. Retention policy

| Data | Retention |
|---|---|
| Raw workout video | Never stored by BlockFit. |
| Quantized landmark stream | 30 days after workout completion, with consent. |
| Account profile and authentication data | Until account deletion, subject to legally required records. |
| Active verification record | Until individual revocation, account deletion, or expiry policy. |
| Public verification tombstone | At least 12 months after revocation/deletion/expiry to support old QR codes. |
| Audit events | 7 years, with actor identity anonymized after account deletion. |
| Benchmark videos and labels | Separate research dataset, consent-controlled, not production account data. |

This is a product policy, not legal advice. The privacy policy must explain the purposes, rights, and jurisdiction-specific exceptions before beta enrollment.

## 6. Deletion policy

Account deletion removes credentials, profile data, workouts, landmark streams, and active verification access. Verification tombstones and audit events survive without email, name, or other direct identifiers. The audit record retains event type, anonymous subject identifier, timestamp, previous-event hash, and event hash so the lifecycle history remains verifiable without retaining the account identity.

Individual record deletion is implemented as revocation, not physical removal, so an old QR code returns an honest 410 response. Landmark data is physically erased on deletion or retention expiry.

## 7. Beta metric

The single beta decision metric is **exact rep-count match rate against the reconciled human label** on scorable benchmark clips, reported with dataset, model, counter, and rep-definition versions. A clip passes only when the model's total count equals the reconciled count exactly.

MAE, within-plus-or-minus-one, per-rep F1, and form-score agreement remain diagnostic metrics. They do not replace the primary beta metric.

The benchmark protocol and evaluator are in `benchmark/PROTOCOL.md` and `benchmark/evaluate.mjs`. The 10-clip labeling gate requires at least 90% exact agreement between the two independent rep labelers before scaling the dataset.

## Schema checkpoint

The database schema includes the storage structures required by these decisions:

- `landmark_streams` for consented, expiring landmark data
- `workout_nonces` for server-issued session challenges
- `account_sequences` for monotonic per-account record ordering
- `audit_events` for append-only lifecycle history
- revocation/deletion metadata on users and verification records

Phase 0 is complete when this document, the schema, and the benchmark protocol are reviewed together. Phase 1 may proceed; integrity behavior must not be claimed until Phase 2 is implemented and tested.
