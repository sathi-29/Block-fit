# BlockFit Rep and Form Benchmark Protocol

Status: draft v1.0.0

This protocol defines the benchmark required before BlockFit publishes an accuracy claim. Results are valid only for the exact model, counter, and dataset versions recorded in the benchmark manifest.

## Rep definition

A rep is counted only when the athlete starts in the exercise's top position, reaches the required bottom position, and returns to the top position. The bottom and top positions must each be held for at least two consecutive frames. A partial movement, a movement that does not reach the threshold, and a movement interrupted by missing visibility are not reps. A rep that reaches both thresholds but has a form fault is still a rep; form quality is measured separately.

The labeler records the frame at the center of the completed top-position hold as the rep peak. Frame numbers are zero-based and use the source video's original frame rate.

### Squat v1

- Start: standing, hips and knees extended, torso visible.
- Bottom: the knee angle is at or below 110 degrees for at least two frames, interpreted alongside visible hip descent. A shallow bend does not count.
- End: return to a knee angle at or above 150 degrees for at least two frames.
- Partial reps: exclude from the rep count and mark `partial` in the clip notes.
- Tempo: no minimum or maximum for the benchmark; record tempo as normal, fast, paused, or partial.

### Push-up v1

- Start: high plank with shoulders, hips, and ankles visible and the body in one controlled line.
- Bottom: elbows are bent to approximately 90 degrees or less for at least two frames while the chest has clearly descended.
- End: elbows return to at least 150 degrees for at least two frames while the body returns to the plank line.
- Partial reps: exclude from the rep count and mark `partial` in the clip notes.
- Tempo: no minimum or maximum for the benchmark; record tempo as normal, fast, paused, or partial.

If a clip cannot be labeled confidently because the required landmarks are occluded, label it `unscorable` rather than guessing. Keep unscorable clips in the dataset report and exclude them from the primary accuracy denominator.

## Labeling procedure

1. Record 10 pilot clips: five squat and five push-up clips covering clean and difficult conditions.
2. Two labelers independently label every clip without seeing the other labeler's result or the model output.
3. Record total reps, rep peak frames, form issues, and scorable status.
4. Calculate exact count agreement and within-plus-or-minus-one agreement.
5. Reconcile disagreements and update this protocol before scaling the dataset.
6. Do not proceed to a headline model claim unless exact count agreement is at least 90% on the pilot set. If it is lower, tighten the definition and relabel the pilot set.

## Minimum viable dataset

The first benchmark contains two exercises, five people, three camera angles, and two lighting conditions: 60 clips total. Stratify the report by exercise, angle, lighting, framing, clothing, tempo, and camera stability. Add an adversarial subset containing partial reps, a person crossing the frame, camera shake, and a phone set down mid-set.

## Required rep metrics

- **Exact match rate:** fraction of clips where predicted and reconciled rep counts are identical.
- **MAE:** mean absolute error in reps per clip.
- **Within-plus-or-minus-one rate:** fraction of clips with absolute count error no greater than one.
- **Per-rep precision, recall, and F1:** a predicted rep is a true positive when its peak frame is within the configured tolerance of an unmatched labeled peak. Report the tolerance in frames.

Report all metrics overall and by exercise and adversarial status. Never reduce the benchmark to one unqualified accuracy percentage.

## Form-score benchmark

Two coaches independently score form on a 0-100 scale and record issue labels. Calculate coach-vs-coach MAE and Pearson correlation first. Then compare the model score to the reconciled coach score using the same metrics. Treat coach agreement as the practical ceiling; do not claim model precision beyond the agreement supported by the coaches.

## Version manifest

Every result must record:

- `datasetVersion`
- `modelVersion`
- `counterVersion`
- `repDefinitionVersion`
- `peakToleranceFrames`
- source video and MediaPipe model version
- date and evaluator version

Changing thresholds, smoothing, hysteresis, pose model, labeling definitions, or dataset membership requires a new version and a benchmark rerun.

## Revocation and privacy

Do not publish raw video or personally identifying information in the benchmark artifact. Use participant IDs, consent records stored separately, and stable clip IDs. Keep the benchmark data private unless participants explicitly consent to release it.
