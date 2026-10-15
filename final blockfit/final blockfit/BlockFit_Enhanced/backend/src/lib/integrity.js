import crypto from 'crypto';

import { env } from '../config/env.js';

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

export function createCanonicalVerificationPayload({
  verificationId,
  exercise,
  validReps,
  score,
  timestamp,
  credentialStatus,
}) {
  const normalized = {
    verificationId: String(verificationId || 'unknown'),
    exercise: String(exercise || 'unknown'),
    validReps: Number(validReps || 0),
    score: Number(score || 0),
    timestamp: timestamp || new Date().toISOString(),
    credentialStatus: String(credentialStatus || 'VERIFIED'),
  };

  const canonical = JSON.stringify(normalized, Object.keys(normalized).sort());
  return {
    ...normalized,
    hash: sha256(canonical),
    canonical,
  };
}

export function createVerificationRecord(input) {
  const payload = createCanonicalVerificationPayload(input);

  return {
    userId: input.userId,
    verificationId: payload.verificationId,
    hash: payload.hash,
    exercise: payload.exercise,
    validReps: payload.validReps,
    score: payload.score,
    timestamp: payload.timestamp,
    credentialStatus: payload.credentialStatus,
    transactionHash: null,
    canonical: payload.canonical,
  };
}

function hmacKey() {
  return env.INTEGRITY_HMAC_SECRET || env.JWT_SECRET;
}

export function hashNonce(nonce) {
  return crypto.createHash('sha256').update(String(nonce), 'utf8').digest('hex');
}

export function createRecordHmac({ userId, sequenceNumber, nonce, payload }) {
  const message = JSON.stringify({
    nonce: String(nonce),
    payload,
    sequenceNumber: Number(sequenceNumber),
    userId: String(userId),
  });
  return crypto.createHmac('sha256', hmacKey()).update(message, 'utf8').digest('hex');
}

export function createAuditHash({ previousEventHash = '', event }) {
  return crypto.createHash('sha256')
    .update(`${previousEventHash}|${JSON.stringify(event)}`, 'utf8')
    .digest('hex');
}
