export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 10000;

function clearRejectedSession() {
  localStorage.removeItem('blockfit_token');
  localStorage.removeItem('blockfit_user');
  if (window.location.hash !== '#/login') window.location.hash = '/login';
}

export async function api(path, { method = 'GET', body, token, headers: extraHeaders = {} } = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  const sessionToken = token || localStorage.getItem('blockfit_token');
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The request timed out. Check your connection and try again.');
    }
    throw new Error('BlockFit is offline. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && sessionToken) clearRejectedSession();
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data.verificationStatus;
    throw error;
  }
  return data;
}
