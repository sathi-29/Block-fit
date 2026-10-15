import assert from 'node:assert/strict';

import { createVerificationRecord } from '../src/lib/integrity.js';

const runTests = () => {
  const record = createVerificationRecord({
    verificationId: 'ver_test_001',
    exercise: 'pushup',
    validReps: 18,
    score: 84,
    timestamp: '2026-01-01T00:00:00.000Z',
    credentialStatus: 'VERIFIED',
  });

  assert.ok(record.hash, 'hash should exist');
  assert.match(record.verificationId, /^ver_/, 'verification ID should be set');
  assert.equal(record.exercise, 'pushup');
  assert.equal(record.validReps, 18);
  assert.equal(record.score, 84);
  assert.equal(record.transactionHash, null, 'off-chain verification must not claim a transaction hash');

  const recomputed = createVerificationRecord({
    verificationId: 'ver_test_001',
    exercise: 'pushup',
    validReps: 18,
    score: 84,
    timestamp: '2026-01-01T00:00:00.000Z',
    credentialStatus: 'VERIFIED',
  });

  assert.equal(record.hash, recomputed.hash, 'the same canonical payload should always produce the same verification hash');
  assert.equal(record.transactionHash, recomputed.transactionHash);

  const revokedRecord = createVerificationRecord({
    verificationId: 'ver_revoked_001',
    exercise: 'squat',
    validReps: 10,
    score: 70,
    credentialStatus: 'REVOKED',
  });

  assert.equal(revokedRecord.credentialStatus, 'REVOKED', 'revoked credentials should preserve their status');
  console.log('verification test ok');
};

runTests();
