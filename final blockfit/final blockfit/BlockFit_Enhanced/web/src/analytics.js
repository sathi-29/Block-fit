const SESSION_KEY = 'blockfit_analytics_session';

function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

export function track(event, properties = {}) {
  const payload = JSON.stringify({
    event: String(event).slice(0, 80),
    properties,
    sessionId: sessionId(),
    occurredAt: new Date().toISOString(),
  });
  try {
    navigator.sendBeacon?.('/api/analytics', new Blob([payload], { type: 'application/json' }));
  } catch {
    // Analytics must never interrupt a workout or authentication flow.
  }
}

export function installErrorTracking() {
  window.addEventListener('error', (event) => {
    track('client_error', { message: event.message, source: event.filename || 'unknown' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    track('client_error', { message: String(event.reason?.message || event.reason || 'Unhandled rejection') });
  });
}
