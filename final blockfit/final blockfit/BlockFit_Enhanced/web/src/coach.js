const CUE_ADVICE = {
  'Knees caved inward': 'Try keeping your knees aligned with your toes.',
  'Chest dropped too far forward': 'Keep your chest lifted as you lower.',
  'Did not reach full depth': 'Work toward a comfortable, repeatable depth.',
  'Hips sagged toward the floor': 'Keep your shoulders, hips, and ankles aligned.',
  'Hips piked up too high': 'Keep your shoulders, hips, and ankles aligned.',
  'Did not go low enough': 'Aim for a comfortable, consistent range of motion.',
  'Body line was not stable': 'Keep your shoulders, hips, and ankles aligned throughout the hold.',
  'Keep your chest up': 'Keep your chest lifted as you move.',
  'Push your knees out over your toes': 'Try keeping your knees aligned with your toes.',
  'Engage your core - hips are sagging': 'Brace your core and keep your body in a straight line.',
  'Lower your hips into a straight line': 'Keep your shoulders, hips, and ankles aligned.',
};

export function summarizeExercise({ exercise, reps, previousSession }) {
  const exerciseName = String(exercise || 'Exercise');
  const exerciseLower = exerciseName.toLowerCase();
  const formScore = Math.round(reps.reduce((total, rep) => total + rep.score, 0) / reps.length);
  const cueCounts = new Map();

  for (const rep of reps) {
    for (const cue of new Set(rep.issueLabels || [])) {
      cueCounts.set(cue, (cueCounts.get(cue) || 0) + 1);
    }
  }

  const mostFrequentCue = [...cueCounts.entries()]
    .sort((left, right) => right[1] - left[1])[0]?.[0];
  const advice = mostFrequentCue
    ? CUE_ADVICE[mostFrequentCue] || 'Keep your movement controlled and within a comfortable range.'
    : 'No recurring form cue was identified. Keep your movement controlled and comfortable.';

  if (previousSession && Number.isFinite(Number(previousSession.formScore))) {
    const difference = formScore - Number(previousSession.formScore);
    if (difference > 0) {
      return {
        headline: `Your ${exerciseLower} form score improved by ${difference} points since your last session.`,
        advice,
        formScore,
      };
    }
    if (difference < 0) {
      return {
        headline: `Your ${exerciseLower} form score was ${Math.abs(difference)} points lower than your last session.`,
        advice,
        formScore,
      };
    }
    return {
      headline: `Your ${exerciseLower} form score held steady since your last session.`,
      advice,
      formScore,
    };
  }

  return {
    headline: `This ${exerciseLower} session sets a form-score baseline for future comparisons.`,
    advice,
    formScore,
  };
}