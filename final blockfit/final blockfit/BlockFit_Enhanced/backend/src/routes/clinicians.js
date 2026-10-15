import { randomBytes, createHash } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';

import { dataStore as store } from '../lib/dataStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const inviteSchema = z.object({
  clinicianEmail: z.string().trim().email().max(255),
});

const claimSchema = z.object({
  inviteCode: z.string().trim().min(8).max(64),
});

const hashInviteCode = (value) => createHash('sha256').update(value.trim()).digest('hex');

router.post('/invite', requireAuth, async (req, res, next) => {
  try {
    const parsed = inviteSchema.parse(req.body);
    const patientId = req.user.sub;
    const clinician = await store.findUserByEmail(parsed.clinicianEmail);
    if (!clinician) {
      return res.status(404).json({ error: 'Clinician account not found' });
    }
    if (clinician.id === patientId) {
      return res.status(400).json({ error: 'You cannot invite yourself as a clinician.' });
    }

    const inviteCode = randomBytes(8).toString('hex').toUpperCase();
    const invite = await store.createClinicianInvite({
      patientUserId: patientId,
      inviteCodeHash: hashInviteCode(inviteCode),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return res.status(201).json({
      id: invite.id,
      patientId,
      clinicianId: clinician.id,
      clinicianName: clinician.name,
      status: 'invited',
      inviteCode,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Please provide a valid clinician email.' });
    }
    return next(error);
  }
});

router.post('/claim', requireAuth, async (req, res, next) => {
  try {
    const parsed = claimSchema.parse(req.body);
    const clinicianId = req.user.sub;
    const connection = await store.claimClinicianInvite({
      clinicianUserId: clinicianId,
      inviteCodeHash: hashInviteCode(parsed.inviteCode),
    });

    if (!connection) {
      return res.status(404).json({ error: 'Invite code is invalid, expired, or already claimed.' });
    }

    return res.json({
      connectionId: connection.id,
      patientId: connection.patientUserId,
      clinicianId: connection.clinicianUserId,
      status: connection.status,
      claimedAt: connection.claimedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Please provide a valid invite code.' });
    }
    return next(error);
  }
});

router.get('/connections', requireAuth, async (req, res, next) => {
  try {
    const connections = await store.listClinicianConnections(req.user.sub);
    return res.json({ connections });
  } catch (error) {
    return next(error);
  }
});

router.post('/connections/:connectionId/approve', requireAuth, async (req, res, next) => {
  try {
    const connection = await store.approveClinicianConnection(req.user.sub, req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found or not awaiting approval.' });
    }
    return res.json({
      connectionId: connection.id,
      patientId: connection.patientUserId,
      clinicianId: connection.clinicianUserId,
      status: connection.status,
      approvedAt: connection.approvedAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/connections/:connectionId/revoke', requireAuth, async (req, res, next) => {
  try {
    const connection = await store.revokeClinicianConnection(req.user.sub, req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found or already revoked.' });
    }
    return res.json({
      connectionId: connection.id,
      patientId: connection.patientUserId,
      clinicianId: connection.clinicianUserId,
      status: connection.status,
      revokedAt: connection.revokedAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/patient/:patientId/summary', requireAuth, async (req, res, next) => {
  try {
    const patientId = req.params.patientId;
    const clinicianId = req.user.sub;
    const patient = await store.findUserById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const accessAllowed = await store.hasApprovedClinicianAccess(patientId, clinicianId);
    if (!accessAllowed) {
      return res.status(403).json({ error: 'Clinician access requires explicit patient consent.' });
    }

    const workouts = await store.listWorkouts(patientId);
    const recentSummary = workouts.slice(0, 5).map((entry) => ({
      exercise: entry.exercise,
      validReps: entry.validReps,
      formScore: entry.formScore,
      performanceScore: entry.performanceScore,
      createdAt: entry.createdAt,
    }));

    return res.json({
      patientId,
      patientName: patient.name,
      accessAllowed: true,
      totals: {
        totalSessions: workouts.length,
        recentSessions: recentSummary.length,
      },
      recentSummary,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
