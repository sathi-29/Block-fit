# Safety and Risk Controls

## Product boundaries

BlockFit is a movement-analysis product, not a diagnosis tool. It can provide posture, rep, ROM, and trend feedback in support of fitness and rehabilitation routines. It cannot diagnose injury or provide medical treatment decisions.

## Safety states

The current safety engine logic supports these states:

- SAFE_TO_CONTINUE
- SLOW_DOWN
- REDUCE_RANGE
- REST
- STOP_EXERCISE
- SEEK_PROFESSIONAL_GUIDANCE

These states are triggered by a combination of:

- confidence and pose quality
- risky movement velocity
- excessive range-of-motion excursions
- abnormal movement patterns
- repeated low-quality tracking frames
- user discomfort or pain reports

## Safety checks run before and during movement

Before an exercise begins, the app checks:

- person detected
- required landmarks visible
- body region in frame
- sufficient confidence
- camera orientation
- user not too close or too far
- occlusion and motion blur

During movement, the app continues to check tracking quality and can pause or stop if confidence becomes too low or if the user reports discomfort.

## Clinical boundary

The product makes no claim that the movement score or ROM readings are clinically validated or diagnostic. They are measurements and trend summaries that can assist a user or clinician, but they cannot define treatment or diagnose injury.

## Physiotherapy guardrails

For rehabilitation workflows:

- keep ROM tracking conservative
- label all demo plans as non-prescriptive
- preserve the requirement for qualified clinical oversight
- do not automatically modify therapist-assigned targets
- do not expose camera recordings by default

## Privacy and data security

The app keeps camera processing local and stores only derived metrics required for tracking and progress.

This means:

- no default camera video upload
- no blockchain-based medical record storage
- no raw biometric or diagnosis artifact allowed as a user-facing claim
- database access controls for clinician or patient connections

## Limitations

The product is not a substitute for a physiotherapist and should not claim to detect injury. It can support awareness, adherence, and structured movement tracking, but it remains bounded by the quality of the device camera, landmark visibility, and the non-diagnostic product scope.
