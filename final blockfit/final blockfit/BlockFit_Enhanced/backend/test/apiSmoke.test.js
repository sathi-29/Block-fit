import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';

import app from '../src/app.js';

const startServer = async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return { server, port };
};

const postJson = (port, path, payload, headers = {}) => new Promise((resolve, reject) => {
  const body = JSON.stringify(payload);
  const req = http.request(
    `http://127.0.0.1:${port}${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
    },
    (res) => {
      let response = '';
      res.on('data', (chunk) => response += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(response || '{}') });
        } catch {
          resolve({ status: res.statusCode, body: response });
        }
      });
    }
  );

  req.on('error', reject);
  req.write(body);
  req.end();
});

const getJson = (port, path, headers = {}) => new Promise((resolve, reject) => {
  http.get(`http://127.0.0.1:${port}${path}`, { headers }, (res) => {
    let response = '';
    res.on('data', (chunk) => response += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, body: JSON.parse(response || '{}') });
      } catch {
        resolve({ status: res.statusCode, body: response });
      }
    });
  }).on('error', reject);
});

const getCorsHeaders = (port, origin) => new Promise((resolve, reject) => {
  const req = http.get(`http://127.0.0.1:${port}/api/health`, { headers: { Origin: origin } }, (res) => {
    res.resume();
    res.on('end', () => resolve(res.headers));
  });
  req.on('error', reject);
});

const runTests = async () => {
  const { server, port } = await startServer();

  try {
    const capacitorCors = await getCorsHeaders(port, 'https://localhost');
    assert.equal(capacitorCors['access-control-allow-origin'], 'https://localhost');

    const rejectedCors = await getCorsHeaders(port, 'https://untrusted.example');
    assert.equal(rejectedCors['access-control-allow-origin'], undefined);

    const health = await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        });
      });
      req.on('error', reject);
    });

    assert.equal(health.status, 200);
    assert.equal(health.body.service, 'blockfit-backend');
    assert.equal(health.body.ok, true);

    const register = await postJson(port, '/api/auth/register', {
      email: 'api-user@example.com',
      username: 'apiuser',
      phone: '',
      password: 'StrongPass123!',
      name: 'API User',
    });

    assert.equal(register.status, 201);
    assert.ok(register.body.token, 'register endpoint should return a token');
    assert.equal(register.body.user.email, 'api-user@example.com');
    assert.equal(register.body.user.username, 'apiuser');
    assert.equal(register.body.user.passwordHash, undefined, 'password hash must not be returned');

    const usernameLogin = await postJson(port, '/api/auth/login', {
      identifier: 'apiuser',
      password: 'StrongPass123!',
    });
    assert.equal(usernameLogin.status, 200);
    assert.ok(usernameLogin.body.token, 'username login should return a token');

    const invalidLogin = await postJson(port, '/api/auth/login', {
      identifier: 'apiuser',
      password: 'WrongPass123!',
    });
    assert.equal(invalidLogin.status, 401);
    assert.equal(invalidLogin.body.error, 'Invalid email/username or password');

    const duplicateEmail = await postJson(port, '/api/auth/register', {
      email: 'API-USER@example.com',
      username: 'anotheruser',
      password: 'AnotherPass123!',
      name: 'Duplicate Email',
    });
    assert.equal(duplicateEmail.status, 409);

    const duplicateUsername = await postJson(port, '/api/auth/register', {
      email: 'another@example.com',
      username: 'APIUSER',
      password: 'AnotherPass123!',
      name: 'Duplicate Username',
    });
    assert.equal(duplicateUsername.status, 409);

    const weakPassword = await postJson(port, '/api/auth/register', {
      email: 'weak@example.com',
      username: 'weakuser',
      password: 'password-only',
      name: 'Weak Password',
    });
    assert.equal(weakPassword.status, 400);

    const unavailablePasswordReset = await postJson(port, '/api/auth/forgot-password', {
      email: 'api-user@example.com',
    });
    assert.equal(unavailablePasswordReset.status, 503);
    assert.match(unavailablePasswordReset.body.error, /not configured/i);

    const invalidPasswordReset = await postJson(port, '/api/auth/reset-password', {
      token: 'x'.repeat(64),
      password: 'UpdatedPass123!',
    });
    assert.equal(invalidPasswordReset.status, 400);
    assert.match(invalidPasswordReset.body.error, /invalid or expired/i);

    const authHeaders = { Authorization: `Bearer ${register.body.token}` };
    const nonce = await postJson(port, '/api/workouts/nonce', {}, authHeaders);
    assert.equal(nonce.status, 201);
    assert.ok(nonce.body.nonce, 'workout session should receive a nonce');

    const workout = await postJson(port, '/api/workouts', {
      exercise: 'pushup',
      validReps: 18,
      invalidReps: 2,
      formScore: 91,
      performanceScore: 88,
      durationSeconds: 180,
      confidence: 0.9,
      workoutId: 'wk_api_001',
      verificationStatus: 'VERIFIED',
    }, { ...authHeaders, 'X-Workout-Nonce': nonce.body.nonce });

    assert.equal(workout.status, 201);
    assert.equal(workout.body.exercise, 'pushup');
    assert.equal(workout.body.workoutId, 'wk_api_001');
    assert.ok(workout.body.id, 'workout record should be created with an id');
    assert.equal('integrityHmac' in workout.body, false);
    assert.equal('sequenceNumber' in workout.body, false);

    const history = await getJson(port, '/api/workouts', authHeaders);
    assert.equal(history.status, 200);
    assert.equal(history.body.workouts[0].exercise, 'pushup');
    assert.equal(history.body.workouts[0].formScore, 91);

    const rehabNonce = await postJson(port, '/api/workouts/nonce', {}, authHeaders);
    const rehabWorkout = await postJson(port, '/api/workouts', {
      exercise: 'knee-extension',
      validReps: 10,
      invalidReps: 1,
      formScore: 84,
      performanceScore: 84,
      durationSeconds: 90,
      confidence: 0.9,
      workoutId: 'wk_rom_001',
    }, { ...authHeaders, 'X-Workout-Nonce': rehabNonce.body.nonce });
    assert.equal(rehabWorkout.status, 201);
    const rom = await postJson(port, '/api/rom/wk_rom_001', {
      exercise: 'knee-extension',
      side: 'left',
      cameraView: 'side',
      measuredValue: 118,
      confidence: 0.91,
      engineVersion: 'unvalidated-v1',
    }, authHeaders);
    assert.equal(rom.status, 201);
    assert.equal(rom.body.display, 'Measured movement: 118°');
    assert.equal(rom.body.side, 'left');
    assert.equal(rom.body.cameraView, 'side');
    assert.equal(rom.body.clinicalReliance, 'Not validated for clinical decision-making.');

    const romHistory = await getJson(port, '/api/rom/wk_rom_001', authHeaders);
    assert.equal(romHistory.status, 200);
    assert.equal(romHistory.body.measurements.length, 1);

    const wrongView = await postJson(port, '/api/rom/wk_rom_001', {
      exercise: 'knee-extension',
      side: 'left',
      cameraView: 'front',
      measuredValue: 118,
      confidence: 0.91,
      engineVersion: 'unvalidated-v1',
    }, authHeaders);
    assert.equal(wrongView.status, 422);

    const otherAccount = await postJson(port, '/api/auth/register', {
      email: 'rom-private@example.com',
      username: 'romprivate',
      password: 'StrongPass123!',
      name: 'ROM Private',
    });
    const privateRom = await getJson(port, '/api/rom/wk_rom_001', {
      Authorization: `Bearer ${otherAccount.body.token}`,
    });
    assert.equal(privateRom.status, 404);

    const verification = await postJson(port, '/api/verification/register', {
      exercise: 'pushup',
      validReps: 18,
      score: 88,
      workoutId: 'wk_api_001',
      credentialStatus: 'VERIFIED',
    }, authHeaders);

    assert.equal(verification.status, 201);
    assert.equal(verification.body.exercise, 'pushup');
    assert.equal(verification.body.validReps, 18);
    assert.equal(verification.body.score, 88);
    assert.equal('hash' in verification.body, false);
    assert.equal('canonical' in verification.body, false);
    assert.equal('transactionHash' in verification.body, false);

    const sessionSummary = await getJson(port, `/api/verification/public/${verification.body.verificationId}`);
    assert.equal(sessionSummary.status, 200);
    assert.equal(sessionSummary.body.workout, 'pushup');
    assert.equal(sessionSummary.body.validReps, 18);
    assert.equal('hash' in sessionSummary.body, false);
    assert.equal('canonicalPayload' in sessionSummary.body, false);
    assert.equal('hashAlgorithm' in sessionSummary.body, false);

    const patient = await postJson(port, '/api/auth/register', {
      email: 'patient-consent@example.com',
      username: 'patientconsent',
      password: 'StrongPass123!',
      name: 'Patient Consent',
    });
    const clinicUser = await postJson(port, '/api/auth/register', {
      email: 'clinician-consent@example.com',
      username: 'clinicianconsent',
      password: 'StrongPass123!',
      name: 'Clinician Consent',
    });

    const invite = await postJson(port, '/api/clinicians/invite', {
      clinicianEmail: 'clinician-consent@example.com',
    }, { Authorization: `Bearer ${patient.body.token}` });
    assert.equal(invite.status, 201);
    assert.equal(invite.body.status, 'invited');
    assert.ok(invite.body.inviteCode, 'invite should include a patient-shareable code');

    const claim = await postJson(port, '/api/clinicians/claim', {
      inviteCode: invite.body.inviteCode,
    }, { Authorization: `Bearer ${clinicUser.body.token}` });
    assert.equal(claim.status, 200);
    assert.equal(claim.body.status, 'awaiting_patient_approval');

    const approved = await postJson(port, `/api/clinicians/connections/${claim.body.connectionId}/approve`, {}, { Authorization: `Bearer ${patient.body.token}` });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.status, 'approved');

    const clinicianAccess = await getJson(port, `/api/clinicians/patient/${patient.body.user.id}/summary`, { Authorization: `Bearer ${clinicUser.body.token}` });
    assert.equal(clinicianAccess.status, 200);
    assert.equal(clinicianAccess.body.patientId, patient.body.user.id);
    assert.equal(clinicianAccess.body.accessAllowed, true);

    const revoked = await postJson(port, `/api/clinicians/connections/${claim.body.connectionId}/revoke`, {}, { Authorization: `Bearer ${patient.body.token}` });
    assert.equal(revoked.status, 200);
    assert.equal(revoked.body.status, 'revoked');

    const deniedAccess = await getJson(port, `/api/clinicians/patient/${patient.body.user.id}/summary`, { Authorization: `Bearer ${clinicUser.body.token}` });
    assert.equal(deniedAccess.status, 403);
    assert.match(deniedAccess.body.error, /consent/i);

    console.log('api smoke test ok');
  } finally {
    server.close();
  }
};

runTests();
