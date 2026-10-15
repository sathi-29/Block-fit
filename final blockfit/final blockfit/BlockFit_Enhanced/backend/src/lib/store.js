import { randomBytes, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

import { createAuditHash, hashNonce } from './integrity.js';

const users = [];
const passwordResetTokens = [];
const workouts = [];
const romMeasurements = [];
const clinicianConnections = [];
const rehabilitationPrograms = [];
const verificationRecords = [];
const workoutNonces = [];
const accountSequences = new Map();
const auditEvents = [];
const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/schema.sql');

export function createStore() {
  const addUser = (user) => {
    const normalizedUser = {
      ...user,
      accountType: user.accountType || 'patient',
      clinicianVerifiedAt: user.clinicianVerifiedAt || null,
      email: user.email.toLowerCase(),
      username: (user.username || user.email.split('@')[0]).toLowerCase(),
    };
    if (users.some((entry) => entry.email === normalizedUser.email || entry.username === normalizedUser.username)) {
      const error = new Error('Account email or username already exists');
      error.code = '23505';
      throw error;
    }
    users.push(normalizedUser);
    return normalizedUser;
  };

  const findUserByEmail = (email) => users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  const findUserByIdentifier = (identifier) => {
    const normalized = identifier.toLowerCase();
    return users.find((entry) => entry.email.toLowerCase() === normalized || entry.username.toLowerCase() === normalized);
  };
  const findUserById = (id) => users.find((entry) => entry.id === id);

  const addWorkout = (workout) => {
    workouts.push(workout);
    return workout;
  };

  const listWorkouts = (userId) => workouts.filter((entry) => !userId || entry.userId === userId);

  const findWorkoutForUser = (userId, workoutId) => workouts.find((entry) =>
    entry.userId === userId && entry.workoutId === workoutId);

  const addRomMeasurement = (measurement) => {
    const record = { id: randomUUID(), recordedAt: new Date().toISOString(), ...measurement };
    romMeasurements.push(record);
    return record;
  };

  const listRomMeasurements = (userId, workoutId) => romMeasurements.filter((entry) =>
    entry.userId === userId && (!workoutId || entry.workoutId === workoutId));

  const getAccountAccess = (userId) => {
    const user = users.find((entry) => entry.id === userId);
    return user ? { id: user.id, accountType: user.accountType, clinicianVerifiedAt: user.clinicianVerifiedAt } : null;
  };

  const verifyPhysiotherapist = (userId) => {
    const user = users.find((entry) => entry.id === userId);
    if (!user) return null;
    user.accountType = 'physiotherapist';
    user.clinicianVerifiedAt = new Date().toISOString();
    return getAccountAccess(userId);
  };

  const createClinicianInvite = ({ patientUserId, inviteCodeHash, expiresAt }) => {
    const invite = {
      id: randomUUID(), patientUserId, clinicianUserId: null, inviteCodeHash,
      status: 'invited', expiresAt: new Date(expiresAt).toISOString(), createdAt: new Date().toISOString(),
    };
    clinicianConnections.push(invite);
    return invite;
  };

  const claimClinicianInvite = ({ clinicianUserId, inviteCodeHash }) => {
    const invite = clinicianConnections.find((entry) => entry.inviteCodeHash === inviteCodeHash
      && entry.status === 'invited' && new Date(entry.expiresAt) > new Date());
    if (!invite) return null;
    invite.clinicianUserId = clinicianUserId;
    invite.status = 'awaiting_patient_approval';
    invite.claimedAt = new Date().toISOString();
    return invite;
  };

  const listClinicianConnections = (patientUserId) => clinicianConnections
    .filter((entry) => entry.patientUserId === patientUserId)
    .map(({ inviteCodeHash, ...entry }) => ({
      ...entry,
      clinicianName: users.find((user) => user.id === entry.clinicianUserId)?.name || null,
    }));

  const approveClinicianConnection = (patientUserId, connectionId) => {
    const connection = clinicianConnections.find((entry) => entry.id === connectionId
      && entry.patientUserId === patientUserId && entry.status === 'awaiting_patient_approval');
    if (!connection) return null;
    connection.status = 'approved';
    connection.approvedAt = new Date().toISOString();
    return listClinicianConnections(patientUserId).find((entry) => entry.id === connectionId);
  };

  const revokeClinicianConnection = (patientUserId, connectionId) => {
    const connection = clinicianConnections.find((entry) => entry.id === connectionId
      && entry.patientUserId === patientUserId && ['approved', 'awaiting_patient_approval'].includes(entry.status));
    if (!connection) return null;
    connection.status = 'revoked';
    connection.revokedAt = new Date().toISOString();
    return listClinicianConnections(patientUserId).find((entry) => entry.id === connectionId);
  };

  const hasApprovedClinicianAccess = (patientUserId, clinicianUserId) => clinicianConnections.some((entry) =>
    entry.patientUserId === patientUserId && entry.clinicianUserId === clinicianUserId && entry.status === 'approved');

  const addRehabilitationProgram = (program) => {
    const record = { id: randomUUID(), status: 'active', createdAt: new Date().toISOString(), ...program };
    rehabilitationPrograms.push(record);
    return record;
  };

  const listRehabilitationPrograms = (patientUserId) => rehabilitationPrograms
    .filter((entry) => entry.patientUserId === patientUserId && entry.status === 'active');

  const addVerificationRecord = (record) => {
    verificationRecords.push(record);
    return record;
  };

  const getVerificationById = (verificationId) => verificationRecords.find((entry) => entry.verificationId === verificationId);

  const issueNonce = (userId) => {
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    workoutNonces.push({ userId, nonceHash: hashNonce(nonce), expiresAt, usedAt: null });
    return { nonce, expiresAt };
  };

  const consumeNonce = (userId, nonce) => {
    const entry = workoutNonces.find((item) => item.userId === userId && item.nonceHash === hashNonce(nonce));
    if (!entry || entry.usedAt || new Date(entry.expiresAt) <= new Date()) return false;
    entry.usedAt = new Date().toISOString();
    return true;
  };

  const nextSequence = (userId) => {
    const sequence = (accountSequences.get(userId) || 0) + 1;
    accountSequences.set(userId, sequence);
    return sequence;
  };

  const addAuditEvent = ({ actorUserId = null, subjectType, subjectId, eventType, eventData = {} }) => {
    const previousEventHash = auditEvents.at(-1)?.eventHash || null;
    const event = { actorUserId, subjectType, subjectId, eventType, eventData, createdAt: new Date().toISOString() };
    const record = { id: randomUUID(), ...event, previousEventHash, eventHash: createAuditHash({ previousEventHash, event }) };
    auditEvents.push(record);
    return record;
  };

  const revokeVerification = (userId, verificationId, reason = 'account-holder-request') => {
    const record = verificationRecords.find((entry) => entry.verificationId === verificationId && entry.userId === userId);
    if (!record) return null;
    record.credentialStatus = 'REVOKED';
    record.revokedAt = new Date().toISOString();
    record.revocationReason = reason;
    return record;
  };

  const deleteAccount = (userId) => {
    const user = users.find((entry) => entry.id === userId);
    if (!user) return false;
    const deletedAt = new Date().toISOString();
    verificationRecords
      .filter((entry) => entry.userId === userId && entry.credentialStatus === 'VERIFIED')
      .forEach((entry) => {
        entry.credentialStatus = 'ACCOUNT_DELETED';
        entry.revokedAt = deletedAt;
        entry.revocationReason = 'account-deleted';
      });
    for (let index = users.length - 1; index >= 0; index -= 1) {
      if (users[index].id === userId) users.splice(index, 1);
    }
    for (let index = workouts.length - 1; index >= 0; index -= 1) {
      if (workouts[index].userId === userId) workouts.splice(index, 1);
    }
    addAuditEvent({ actorUserId: null, subjectType: 'user', subjectId: userId, eventType: 'deleted', eventData: { deletedAt } });
    return true;
  };

  return {
    addUser,
    findUserByEmail,
    findUserByIdentifier,
    findUserById,
    createPasswordResetToken: ({ userId, tokenHash, expiresAt }) => {
      for (let index = passwordResetTokens.length - 1; index >= 0; index -= 1) {
        if (passwordResetTokens[index].userId === userId) passwordResetTokens.splice(index, 1);
      }
      passwordResetTokens.push({ userId, tokenHash, expiresAt });
    },
    consumePasswordResetToken: (tokenHash) => {
      const index = passwordResetTokens.findIndex((entry) => entry.tokenHash === tokenHash && new Date(entry.expiresAt) > new Date());
      if (index < 0) return null;
      return passwordResetTokens.splice(index, 1)[0].userId;
    },
    updatePasswordHash: (userId, passwordHash) => {
      const user = users.find((entry) => entry.id === userId);
      if (!user) return false;
      user.passwordHash = passwordHash;
      return true;
    },
    addWorkout,
    listWorkouts,
    findWorkoutForUser,
    addRomMeasurement,
    listRomMeasurements,
    getAccountAccess,
    verifyPhysiotherapist,
    createClinicianInvite,
    claimClinicianInvite,
    listClinicianConnections,
    approveClinicianConnection,
    revokeClinicianConnection,
    hasApprovedClinicianAccess,
    addRehabilitationProgram,
    listRehabilitationPrograms,
    addVerificationRecord,
    getVerificationById,
    issueNonce,
    consumeNonce,
    nextSequence,
    addAuditEvent,
    revokeVerification,
    deleteAccount,
  };
}

export const store = createStore();

export function createPostgresStore(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  const initialize = async () => pool.query(fs.readFileSync(schemaPath, 'utf8'));

  return {
    initialize,
    async addUser(user) {
      const result = await pool.query(
        `INSERT INTO users (id, email, username, phone, name, password_hash) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, username, phone, name, password_hash AS "passwordHash"`,
        [user.id || randomUUID(), user.email.toLowerCase(), user.username.toLowerCase(), user.phone || null, user.name, user.passwordHash],
      );
      return result.rows[0];
    },
    async findUserByIdentifier(identifier) {
      const result = await pool.query(
        `SELECT id, email, username, phone, name, password_hash AS "passwordHash" FROM users
         WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1`,
        [identifier],
      );
      return result.rows[0];
    },
    async findUserByEmail(email) {
      const result = await pool.query(
        'SELECT id, email, username, phone, name, password_hash AS "passwordHash" FROM users WHERE LOWER(email) = LOWER($1)',
        [email],
      );
      return result.rows[0];
    },
    async createPasswordResetToken({ userId, tokenHash, expiresAt }) {
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      await pool.query(
        'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [tokenHash, userId, expiresAt],
      );
    },
    async consumePasswordResetToken(tokenHash) {
      const result = await pool.query(
        'DELETE FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id AS "userId"',
        [tokenHash],
      );
      return result.rows[0]?.userId || null;
    },
    async updatePasswordHash(userId, passwordHash) {
      const result = await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
      return result.rowCount === 1;
    },
    async findUserById(id) {
      const result = await pool.query(
        'SELECT id, email, name, account_type AS "accountType", clinician_verified_at AS "clinicianVerifiedAt" FROM users WHERE id = $1 AND deleted_at IS NULL',
        [id],
      );
      return result.rows[0];
    },
    async getAccountAccess(userId) {
      const result = await pool.query(
        'SELECT id, account_type AS "accountType", clinician_verified_at AS "clinicianVerifiedAt" FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId],
      );
      return result.rows[0] || null;
    },
    async verifyPhysiotherapist(userId) {
      const result = await pool.query(
        `UPDATE users SET account_type = 'physiotherapist', clinician_verified_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, account_type AS "accountType", clinician_verified_at AS "clinicianVerifiedAt"`,
        [userId],
      );
      return result.rows[0] || null;
    },
    async createClinicianInvite({ patientUserId, inviteCodeHash, expiresAt }) {
      const result = await pool.query(
        `INSERT INTO clinician_connections (id, patient_user_id, invite_code_hash, status, expires_at)
         VALUES ($1, $2, $3, 'invited', $4)
         RETURNING id, patient_user_id AS "patientUserId", status, expires_at AS "expiresAt", created_at AS "createdAt"`,
        [randomUUID(), patientUserId, inviteCodeHash, expiresAt],
      );
      return result.rows[0];
    },
    async claimClinicianInvite({ clinicianUserId, inviteCodeHash }) {
      const result = await pool.query(
        `UPDATE clinician_connections SET clinician_user_id = $1, status = 'awaiting_patient_approval', claimed_at = NOW()
         WHERE invite_code_hash = $2 AND status = 'invited' AND expires_at > NOW()
         RETURNING id, patient_user_id AS "patientUserId", clinician_user_id AS "clinicianUserId", status, expires_at AS "expiresAt", claimed_at AS "claimedAt"`,
        [clinicianUserId, inviteCodeHash],
      );
      return result.rows[0] || null;
    },
    async listClinicianConnections(patientUserId) {
      const result = await pool.query(
        `SELECT connections.id, connections.patient_user_id AS "patientUserId",
          connections.clinician_user_id AS "clinicianUserId", clinician.name AS "clinicianName",
          connections.status, connections.expires_at AS "expiresAt", connections.claimed_at AS "claimedAt",
          connections.approved_at AS "approvedAt", connections.revoked_at AS "revokedAt"
         FROM clinician_connections AS connections
         LEFT JOIN users AS clinician ON clinician.id = connections.clinician_user_id
         WHERE connections.patient_user_id = $1 ORDER BY connections.created_at DESC`,
        [patientUserId],
      );
      return result.rows;
    },
    async approveClinicianConnection(patientUserId, connectionId) {
      const result = await pool.query(
        `UPDATE clinician_connections SET status = 'approved', approved_at = NOW()
         WHERE id = $1 AND patient_user_id = $2 AND status = 'awaiting_patient_approval'
         RETURNING id, patient_user_id AS "patientUserId", clinician_user_id AS "clinicianUserId", status, approved_at AS "approvedAt"`,
        [connectionId, patientUserId],
      );
      return result.rows[0] || null;
    },
    async revokeClinicianConnection(patientUserId, connectionId) {
      const result = await pool.query(
        `UPDATE clinician_connections SET status = 'revoked', revoked_at = NOW()
         WHERE id = $1 AND patient_user_id = $2 AND status IN ('approved', 'awaiting_patient_approval')
         RETURNING id, patient_user_id AS "patientUserId", clinician_user_id AS "clinicianUserId", status, revoked_at AS "revokedAt"`,
        [connectionId, patientUserId],
      );
      return result.rows[0] || null;
    },
    async hasApprovedClinicianAccess(patientUserId, clinicianUserId) {
      const result = await pool.query(
        `SELECT EXISTS(SELECT 1 FROM clinician_connections
         WHERE patient_user_id = $1 AND clinician_user_id = $2 AND status = 'approved') AS allowed`,
        [patientUserId, clinicianUserId],
      );
      return result.rows[0]?.allowed === true;
    },
    async addRehabilitationProgram(program) {
      const result = await pool.query(
        `INSERT INTO rehabilitation_programs (id, patient_user_id, clinician_user_id, title, exercises)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING id, patient_user_id AS "patientUserId", clinician_user_id AS "clinicianUserId",
          title, exercises, status, created_at AS "createdAt"`,
        [randomUUID(), program.patientUserId, program.clinicianUserId, program.title, JSON.stringify(program.exercises)],
      );
      return result.rows[0];
    },
    async listRehabilitationPrograms(patientUserId) {
      const result = await pool.query(
        `SELECT id, patient_user_id AS "patientUserId", clinician_user_id AS "clinicianUserId",
          title, exercises, status, created_at AS "createdAt"
         FROM rehabilitation_programs WHERE patient_user_id = $1 AND status = 'active' ORDER BY created_at DESC`,
        [patientUserId],
      );
      return result.rows;
    },
    async addWorkout(workout) {
      const result = await pool.query(
        `INSERT INTO workouts (id, user_id, exercise_slug, status, duration_seconds, valid_reps, invalid_reps,
          form_score, performance_score, confidence, workout_id, sequence_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, exercise_slug AS exercise, status, duration_seconds AS "durationSeconds", valid_reps AS "validReps",
          invalid_reps AS "invalidReps", form_score AS "formScore", performance_score AS "performanceScore",
          confidence, workout_id AS "workoutId", created_at AS "createdAt"`,
        [workout.id || randomUUID(), workout.userId || null, workout.exercise, workout.verificationStatus || 'completed', workout.durationSeconds,
          workout.validReps, workout.invalidReps, workout.formScore, workout.performanceScore,
          workout.confidence, workout.workoutId, workout.sequenceNumber || null],
      );
      return { ...workout, ...result.rows[0] };
    },
    async listWorkouts(userId) {
      const result = await pool.query(
        `SELECT id, exercise_slug AS exercise, duration_seconds AS "durationSeconds", valid_reps AS "validReps",
          invalid_reps AS "invalidReps", form_score AS "formScore", performance_score AS "performanceScore",
          confidence, workout_id AS "workoutId", status AS "verificationStatus", created_at AS "createdAt"
         FROM workouts
         WHERE ($1::uuid IS NULL OR user_id = $1)
         ORDER BY created_at DESC`,
        [userId || null],
      );
      return result.rows;
    },
    async findWorkoutForUser(userId, workoutId) {
      const result = await pool.query(
        `SELECT workout_id AS "workoutId", exercise_slug AS exercise
         FROM workouts WHERE user_id = $1 AND workout_id = $2`,
        [userId, workoutId],
      );
      return result.rows[0] || null;
    },
    async addRomMeasurement(measurement) {
      const result = await pool.query(
        `INSERT INTO rom_measurements (id, user_id, workout_id, exercise_slug, side,
          camera_view, measured_value, confidence, engine_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, workout_id AS "workoutId", exercise_slug AS exercise, side,
          camera_view AS "cameraView", measured_value AS "measuredValue", confidence,
          engine_version AS "engineVersion", recorded_at AS "recordedAt"`,
        [randomUUID(), measurement.userId, measurement.workoutId, measurement.exercise, measurement.side,
          measurement.cameraView, measurement.measuredValue, measurement.confidence, measurement.engineVersion],
      );
      return result.rows[0];
    },
    async listRomMeasurements(userId, workoutId) {
      const result = await pool.query(
        `SELECT id, workout_id AS "workoutId", exercise_slug AS exercise, side,
          camera_view AS "cameraView", measured_value AS "measuredValue", confidence,
          engine_version AS "engineVersion", recorded_at AS "recordedAt"
         FROM rom_measurements WHERE user_id = $1 AND ($2::text IS NULL OR workout_id = $2)
         ORDER BY recorded_at DESC`,
        [userId, workoutId || null],
      );
      return result.rows;
    },
    async addVerificationRecord(record) {
      const result = await pool.query(
        `INSERT INTO verification_records (id, user_id, verification_id, hash_value, transaction_hash,
          exercise_slug, valid_reps, score, credential_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, verification_id AS "verificationId", hash_value AS hash,
          transaction_hash AS "transactionHash", exercise_slug AS exercise, valid_reps AS "validReps",
          score, timestamp, credential_status AS "credentialStatus"`,
        [randomUUID(), record.userId || null, record.verificationId, record.hash, record.transactionHash, record.exercise,
          record.validReps, record.score, record.credentialStatus || 'VERIFIED'],
      );
      return { ...record, ...result.rows[0] };
    },
    async getVerificationById(verificationId) {
      const result = await pool.query(
        `SELECT verification_id AS "verificationId", hash_value AS hash,
          transaction_hash AS "transactionHash", exercise_slug AS exercise, valid_reps AS "validReps",
          score, timestamp, credential_status AS "credentialStatus", revoked_at AS "revokedAt",
          revocation_reason AS "revocationReason", expires_at AS "expiresAt"
         FROM verification_records WHERE verification_id = $1`,
        [verificationId],
      );
      return result.rows[0];
    },
    async revokeVerification(userId, verificationId, reason = 'account-holder-request') {
      const result = await pool.query(
        `UPDATE verification_records SET credential_status = 'REVOKED', revoked_at = NOW(), revocation_reason = $1
         WHERE user_id = $2 AND verification_id = $3 AND credential_status = 'VERIFIED'
         RETURNING verification_id AS "verificationId", credential_status AS "credentialStatus"`,
        [reason, userId, verificationId],
      );
      return result.rows[0] || null;
    },
    async deleteAccount(userId) {
      const client = await pool.connect();
      const deletedAt = new Date().toISOString();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE verification_records SET credential_status = 'ACCOUNT_DELETED', revoked_at = $1,
           revocation_reason = 'account-deleted' WHERE user_id = $2 AND credential_status = 'VERIFIED'`,
          [deletedAt, userId],
        );
        await client.query('DELETE FROM landmark_streams WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM workouts WHERE user_id = $1', [userId]);
        await client.query(
          `INSERT INTO audit_events (id, subject_type, subject_id, event_type, event_data, event_hash)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), 'user', userId, 'deleted', { deletedAt }, createAuditHash({ event: { subjectType: 'user', subjectId: userId, eventType: 'deleted', deletedAt } })],
        );
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async issueNonce(userId) {
      const nonce = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await pool.query(
        `INSERT INTO workout_nonces (id, user_id, nonce_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        [randomUUID(), userId, hashNonce(nonce), expiresAt],
      );
      return { nonce, expiresAt: expiresAt.toISOString() };
    },
    async consumeNonce(userId, nonce) {
      const result = await pool.query(
        `UPDATE workout_nonces SET used_at = NOW()
         WHERE user_id = $1 AND nonce_hash = $2 AND used_at IS NULL AND expires_at > NOW()
         RETURNING id`,
        [userId, hashNonce(nonce)],
      );
      return result.rowCount === 1;
    },
    async nextSequence(userId) {
      const result = await pool.query(
        `INSERT INTO account_sequences (user_id, next_sequence) VALUES ($1, 2)
         ON CONFLICT (user_id) DO UPDATE SET next_sequence = account_sequences.next_sequence + 1,
         updated_at = NOW()
         RETURNING next_sequence - 1 AS sequence`,
        [userId],
      );
      return Number(result.rows[0].sequence);
    },
    async addAuditEvent({ actorUserId = null, subjectType, subjectId, eventType, eventData = {} }) {
      const previous = await pool.query('SELECT event_hash AS "eventHash" FROM audit_events ORDER BY created_at DESC LIMIT 1');
      const previousEventHash = previous.rows[0]?.eventHash || null;
      const event = { actorUserId, subjectType, subjectId, eventType, eventData, createdAt: new Date().toISOString() };
      const eventHash = createAuditHash({ previousEventHash, event });
      const result = await pool.query(
        `INSERT INTO audit_events (id, actor_user_id, subject_type, subject_id, event_type, event_data, previous_event_hash, event_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [randomUUID(), actorUserId, subjectType, subjectId, eventType, eventData, previousEventHash, eventHash],
      );
      return result.rows[0];
    },
  };
}
