import { api } from '../api.js';

export function renderVerify(id) {
  return {
    html: `
      <section class="auth-page">
        <article class="card auth-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">SESSION</p>
              <h3>Exercise session</h3>
            </div>
          </div>
          <p class="lead" id="verify-status">Loading session summary…</p>
          <div id="verify-body"></div>
        </article>
      </section>
    `,
    mount(root) {
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'noindex,nofollow';
      document.title = `Exercise session | BlockFit`;
      api(`/verification/public/${encodeURIComponent(id)}`)
        .then((record) => {
          root.querySelector('#verify-status').textContent = 'Exercise analysis completed';
          root.querySelector('#verify-body').innerHTML = `
            <div class="mini-stats">
              <div><strong id="session-exercise"></strong><span>Exercise</span></div>
              <div><strong id="session-reps"></strong><span>Reps counted</span></div>
              <div><strong id="session-score"></strong><span>Form score</span></div>
            </div>
            <section class="verification-section">
              <p>This summary reflects movement captured during the session. Camera position and tracking quality can affect rep counts and form feedback. It is not a medical diagnosis.</p>
            </section>
          `;
          root.querySelector('#session-exercise').textContent = String(record.workout || '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
          root.querySelector('#session-reps').textContent = String(record.validReps);
          root.querySelector('#session-score').textContent = `${record.score}%`;
        })
        .catch((error) => {
          const statusCopy = {
            REVOKED: 'This session summary is no longer available.',
            ACCOUNT_DELETED: 'This session summary is unavailable because its account was removed.',
            EXPIRED: 'This session summary has expired.',
          };
          root.querySelector('#verify-status').textContent = statusCopy[error.code]
            || (error.status === 404 ? 'Session summary not found.' : 'Unable to load this session summary.');
          root.querySelector('#verify-body').innerHTML = `
            <p class="muted">Ask the person who shared this link for an updated session summary.</p>
          `;
        });
    },
  };
}
