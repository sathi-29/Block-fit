import { Router } from 'express';
import { z } from 'zod';

import { dataStore as store } from '../lib/dataStore.js';
import { requireAuth } from '../middleware/auth.js';
import { V1_EXERCISES } from '../../../shared/exerciseCatalog.mjs';

const router = Router();

const workoutSchema = z.object({
  exercise: z.string().refine((value) => V1_EXERCISES.some((exercise) => exercise.id === value), {
    message: 'Choose one of the eight supported V1 exercises.',
  }),
  validReps: z.number().int().nonnegative(),
  invalidReps: z.number().int().nonnegative(),
  formScore: z.number().min(0).max(100),
  performanceScore: z.number().min(0).max(100),
  durationSeconds: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  workoutId: z.string().min(1),
  verificationStatus: z.string().default('UNVERIFIED'),
});

router.post('/nonce', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json(await store.issueNonce(req.user.sub));
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ workouts: await store.listWorkouts(req.user.sub) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = workoutSchema.parse(req.body);
    const nonce = req.get('X-Workout-Nonce');
    if (!nonce || !(await store.consumeNonce(req.user.sub, nonce))) {
      return res.status(409).json({ error: 'A fresh workout session nonce is required.' });
    }
    const sequenceNumber = await store.nextSequence(req.user.sub);
    const record = {
      id: `workout_${Date.now()}`,
      userId: req.user.sub,
      sequenceNumber,
      ...parsed,
      createdAt: new Date().toISOString(),
    };
    const stored = await store.addWorkout(record);
    await store.addAuditEvent({
      actorUserId: req.user.sub,
      subjectType: 'workout',
      subjectId: stored.id,
      eventType: 'created',
      eventData: { sequenceNumber },
    });
    res.status(201).json({
      id: stored.id,
      exercise: stored.exercise,
      validReps: stored.validReps,
      invalidReps: stored.invalidReps,
      formScore: stored.formScore,
      durationSeconds: stored.durationSeconds,
      workoutId: stored.workoutId,
      createdAt: stored.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
