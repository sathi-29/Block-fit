import { Router } from 'express';
import { z } from 'zod';

import { V1_EXERCISES } from '../../../shared/exerciseCatalog.mjs';
import { dataStore as store } from '../lib/dataStore.js';
import { requireAuth } from '../middleware/auth.js';
import { ROM_ENGINE_VERSION, MIN_ROM_LANDMARK_CONFIDENCE } from '../../../web/src/pose/romMeasurements.js';

const router = Router();
const romExercises = V1_EXERCISES.filter((exercise) => exercise.mode === 'rehabilitation').map((exercise) => exercise.id);
const romSchema = z.object({
  exercise: z.enum(romExercises),
  side: z.enum(['left', 'right']),
  cameraView: z.enum(['front', 'side']),
  measuredValue: z.number().min(0).max(180),
  confidence: z.number().min(MIN_ROM_LANDMARK_CONFIDENCE).max(1),
  engineVersion: z.literal(ROM_ENGINE_VERSION),
});

router.get('/:workoutId', requireAuth, async (req, res, next) => {
  try {
    const workout = await store.findWorkoutForUser(req.user.sub, req.params.workoutId);
    if (!workout) return res.status(404).json({ error: 'Session not found' });
    const measurements = await store.listRomMeasurements(req.user.sub, req.params.workoutId);
    return res.json({ measurements });
  } catch (error) {
    return next(error);
  }
});

router.post('/:workoutId', requireAuth, async (req, res, next) => {
  try {
    const parsed = romSchema.parse(req.body);
    const exercise = V1_EXERCISES.find((item) => item.id === parsed.exercise);
    if (!exercise?.cameraView.includes(parsed.cameraView)) {
      return res.status(422).json({ error: 'This camera view is not supported for the selected movement.' });
    }

    const workout = await store.findWorkoutForUser(req.user.sub, req.params.workoutId);
    if (!workout || workout.exercise !== parsed.exercise) {
      return res.status(404).json({ error: 'Matching session not found' });
    }

    const measurement = await store.addRomMeasurement({
      userId: req.user.sub,
      workoutId: req.params.workoutId,
      exercise: parsed.exercise,
      side: parsed.side,
      cameraView: parsed.cameraView,
      measuredValue: parsed.measuredValue,
      confidence: parsed.confidence,
      engineVersion: parsed.engineVersion,
    });

    return res.status(201).json({
      ...measurement,
      display: `Measured movement: ${measurement.measuredValue}°`,
      clinicalReliance: 'Not validated for clinical decision-making.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Please check the measurement details.' });
    }
    return next(error);
  }
});

export default router;