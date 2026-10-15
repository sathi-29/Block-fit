import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';

import app from '../src/app.js';

function requestJson(port, path, { method = 'GET', body, token, nonce } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(nonce ? { 'X-Workout-Nonce': nonce } : {}),
      },
    }, (res) => {
      let output = '';
      res.on('data', (chunk) => output += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: output ? JSON.parse(output) : null }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const runTests = async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    const register = await requestJson(port, '/api/auth/register', {
      method: 'POST',
      body: { email: 'privacy-flow@example.com', username: 'privacyflow', password: 'StrongPass123!', name: 'Privacy Flow' },
    });
    const token = register.body.token;
    const created = await requestJson(port, '/api/verification/register', {
      method: 'POST',
      token,
      body: { exercise: 'squat', validReps: 5, score: 80, workoutId: 'wk_privacy_1' },
    });
    const verificationId = created.body.verificationId;

    const revoked = await requestJson(port, `/api/verification/${verificationId}/revoke`, { method: 'POST', token });
    assert.equal(revoked.status, 200);
    const revokedPublic = await requestJson(port, `/api/verification/public/${verificationId}`);
    assert.equal(revokedPublic.status, 410);
    assert.equal(revokedPublic.body.verificationStatus, 'REVOKED');

    const accountRegister = await requestJson(port, '/api/auth/register', {
      method: 'POST',
      body: { email: 'delete-flow@example.com', username: 'deleteflow', password: 'StrongPass123!', name: 'Delete Flow' },
    });
    const accountToken = accountRegister.body.token;
    const accountRecord = await requestJson(port, '/api/verification/register', {
      method: 'POST',
      token: accountToken,
      body: { exercise: 'pushup', validReps: 4, score: 75, workoutId: 'wk_privacy_2' },
    });
    const deleted = await requestJson(port, '/api/users/me', { method: 'DELETE', token: accountToken });
    assert.equal(deleted.status, 204);
    const deletedPublic = await requestJson(port, `/api/verification/public/${accountRecord.body.verificationId}`);
    assert.equal(deletedPublic.status, 410);
    assert.equal(deletedPublic.body.verificationStatus, 'ACCOUNT_DELETED');

    console.log('privacy flow test ok');
  } finally {
    server.close();
  }
};

runTests();
