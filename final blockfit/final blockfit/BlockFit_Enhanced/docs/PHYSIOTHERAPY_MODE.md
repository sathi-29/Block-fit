# Physiotherapy Mode

## Scope

BlockFit supports a physiotherapy / rehabilitation mode, but the product remains explicit that it is a movement companion and not a clinical replacement. The app supports structured rehab flows, data collection, adherence tracking, and therapist approval flows, but it does not provide diagnosis or treatment authoring by itself.

## V1 rehabilitation movements

The current product direction is limited to exactly the required V1 list:

1. Straight-Leg Raise
2. Knee Extension
3. Shoulder Raise

These are treated as the supported rehab exercises for the initial production version. They are not expanded to a broad medical catalog before the relevant benchmarks and clinical review are complete.

## Demo / non-prescriptive plans

The app explicitly marks sample rehab schedules as demo-only and non-prescriptive.

Example label:

```text
DEMO SAMPLE · NOT A PRESCRIPTION
```

This requirement is reflected in the shared catalog and the rehab page.

## Therapist access model

The backend has a consent-based clinician access model that supports:

- invitation or code-based patient connection
- patient approval state
- clinician access visibility
- revocation on patient request
- authorization checks enforced on the backend

This is intentionally not a frontend-only abstraction. It is backed by database access and audit metadata.

## What the therapist may see

With patient consent, a physiotherapist may be able to view:

- assigned exercises
- completion data and rep counts
- form score summaries
- ROM observations
- symmetry and adherence
- progress charts
- reported discomfort or pause states

The system does not expose raw camera recordings by default.

## What the therapist may not do automatically

The app does not automatically assign or modify treatment. The system is designed to preserve clinical control:

- no automatic change to therapist-prescribed targets
- no diagnosis claims
- no medical treatment creation from sensor data alone
- no storage of raw camera footage as a patient record

## Measurement constraints

Rehab metrics are measured conservatively:

- use camera view restrictions where appropriate
- only record values when landmark confidence is adequate
- require user consent and clear patient linkage for clinician view
- do not present measurements as injury diagnosis

## Launch context

The implementation is designed for a consumer product with a clear privacy and safety boundary. It should be framed as a movement and adherence companion for rehabilitation, not a replacement for care.
