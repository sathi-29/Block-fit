const EXERCISE_NAMES = {
  curl: 'Bicep curl',
  plank: 'Plank hold',
  pushup: 'Push-up',
};

export function formatExerciseName(exercise) {
  const value = String(exercise || 'Exercise');
  return EXERCISE_NAMES[value] || value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildExerciseProgress(workouts = []) {
  const sorted = [...workouts]
    .filter((workout) => workout.exercise)
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const grouped = new Map();

  for (const workout of sorted) {
    const formScore = Number(workout.formScore);
    const validReps = Number(workout.validReps);
    const invalidReps = Number(workout.invalidReps);
    const totalReps = validReps + invalidReps;
    const sessions = grouped.get(workout.exercise) || [];
    sessions.push({
      formScore: Number.isFinite(formScore) ? Math.round(formScore) : null,
      repAccuracy: workout.exercise !== 'plank' && totalReps > 0
        ? Math.round((validReps / totalReps) * 100)
        : null,
    });
    grouped.set(workout.exercise, sessions);
  }

  return [...grouped.entries()].map(([exercise, sessions]) => ({
    exercise,
    sessionCount: sessions.length,
    firstFormScore: sessions[0].formScore,
    latestFormScore: sessions.at(-1).formScore,
    firstRepAccuracy: sessions[0].repAccuracy,
    latestRepAccuracy: sessions.at(-1).repAccuracy,
  }));
}