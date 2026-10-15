export const V1_EXERCISES = [
  { id: 'squat', name: 'Squat', mode: 'fitness', analysis: 'available' },
  { id: 'pushup', name: 'Push-up', mode: 'fitness', analysis: 'available' },
  { id: 'lunge', name: 'Lunge', mode: 'fitness', analysis: 'available' },
  { id: 'curl', name: 'Bicep Curl', mode: 'fitness', analysis: 'available' },
  { id: 'plank', name: 'Plank', mode: 'fitness', analysis: 'available', measurement: 'hold' },
  { id: 'straight-leg-raise', name: 'Straight-Leg Raise', mode: 'rehabilitation', analysis: 'pending', cameraView: ['side'] },
  { id: 'knee-extension', name: 'Knee Extension', mode: 'rehabilitation', analysis: 'pending', cameraView: ['side'] },
  { id: 'shoulder-raise', name: 'Shoulder Raise', mode: 'rehabilitation', analysis: 'pending', cameraView: ['front', 'side'] },
];

export const DEMO_REHABILITATION_PLAN = {
  name: 'Knee Recovery · Week 2',
  label: 'DEMO SAMPLE · NOT A PRESCRIPTION',
  clinicianReviewed: false,
  exercises: [
    { exerciseId: 'straight-leg-raise', sets: 3, repetitions: 10 },
    { exerciseId: 'knee-extension', sets: 3, repetitions: 12 },
    { exerciseId: 'squat', sets: 2, repetitions: 10 },
    { exerciseId: 'lunge', sets: 3, repetitions: 15 },
  ],
};

const DEMO_EXERCISE_IDS = new Set(V1_EXERCISES.map(({ id }) => id));
if (DEMO_REHABILITATION_PLAN.exercises.some(({ exerciseId }) => !DEMO_EXERCISE_IDS.has(exerciseId))) {
  throw new Error('DEMO_REHABILITATION_PLAN contains an exercise that is not in the V1 catalog.');
}

export const REHABILITATION_PLAN_FIELDS = [
  'exerciseId',
  'sets',
  'repetitions',
  'side',
  'durationSeconds',
  'romTargetDegrees',
  'restSeconds',
  'stopConditions',
  'modificationGuidance',
];