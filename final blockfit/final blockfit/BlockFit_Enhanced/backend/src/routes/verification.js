import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import { createVerificationRecord } from '../lib/integrity.js';
import { dataStore as store } from '../lib/dataStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const verificationSchema = z.object({
  exercise: z.string().min(1),
  validReps: z.number().int().nonnegative(),
  score: z.number().min(0).max(100),
  workoutId: z.string().min(1),
  verificationId: z.string().min(1).optional(),
  credentialStatus: z.string().optional(),
});

router.get('/public/:verificationId', async (req, res, next) => {
  try {
  const record = await store.getVerificationById(req.params.verificationId);
  if (!record) {
    return res.status(404).json({ error: 'Verification not found' });
  }

  if (['REVOKED', 'ACCOUNT_DELETED', 'EXPIRED'].includes(record.credentialStatus)) {
    const messages = {
      REVOKED: 'This verification was revoked by the account holder.',
      ACCOUNT_DELETED: 'This verification is unavailable because the account was deleted.',
      EXPIRED: 'This verification has expired under the published retention policy.',
    };
    return res.status(410).json({
      error: messages[record.credentialStatus],
      verificationId: record.verificationId,
      verificationStatus: record.credentialStatus,
    });
  }

  return res.json({
    verificationId: record.verificationId,
    workout: record.exercise,
    validReps: record.validReps,
    score: record.score,
    serverTimestamp: record.timestamp,
  });
  } catch (error) {
    next(error);
  }
});

router.post('/register', requireAuth, async (req, res, next) => {
  try {
    const parsed = verificationSchema.parse(req.body);
    const record = createVerificationRecord({
      verificationId: parsed.verificationId || `ver_${randomUUID()}`,
      userId: req.user.sub,
      exercise: parsed.exercise,
      validReps: parsed.validReps,
      score: parsed.score,
      timestamp: new Date().toISOString(),
      credentialStatus: parsed.credentialStatus || 'VERIFIED',
    });

    const stored = await store.addVerificationRecord(record);
    await store.addAuditEvent({
      actorUserId: req.user.sub,
      subjectType: 'verification',
      subjectId: stored.verificationId,
      eventType: 'created',
      eventData: { credentialStatus: stored.credentialStatus },
    });
    res.status(201).json({
      verificationId: stored.verificationId,
      exercise: stored.exercise,
      validReps: stored.validReps,
      score: stored.score,
      timestamp: stored.timestamp,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:verificationId/revoke', requireAuth, async (req, res, next) => {
  try {
    const record = await store.revokeVerification(req.user.sub, req.params.verificationId, 'account-holder-request');
    if (!record) return res.status(404).json({ error: 'Verification not found or already inactive' });
    await store.addAuditEvent({
      actorUserId: req.user.sub,
      subjectType: 'verification',
      subjectId: req.params.verificationId,
      eventType: 'revoked',
      eventData: { reason: 'account-holder-request' },
    });
    return res.json({ verificationId: req.params.verificationId, verificationStatus: 'REVOKED' });
  } catch (error) {
    return next(error);
  }
});

export default router;
