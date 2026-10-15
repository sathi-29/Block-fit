import { api } from '../api.js';
import { getUser } from '../auth.js';
import { V1_EXERCISES } from '../../../shared/exerciseCatalog.mjs';

export function renderDashboard() {
  const user = getUser();
  return {
    html: `
      <section class="hero compact dashboard-hero">
        <div class="hero-copy">
          <p class="eyebrow accent">Dashboard</p>
          <h2>Welcome back, ${user?.name || 'athlete'}.</h2>
          <p class="lead">Your next session is ready. Start with one focused movement, then review the pattern and form with honest data.</p>
          <div class="cta-row">
            <a class="primary-btn large" href="#/workout">Start workout</a>
            <a class="ghost-btn large" href="#/history">Review history</a>
          </div>
        </div>
        <aside class="focus-card">
          <p class="eyebrow accent">Current focus</p>
          <h3>Build form before volume.</h3>
          <ul class="focus-list">
            <li>Squat · confidence-first strength</li>
            <li>Push-up · consistency check</li>
            <li>Rehab flow · safe progression</li>
          </ul>
          <div class="status-pill">Session ready</div>
        </aside>
      </section>
      <section class="stats-grid" id="dash-metrics">
        <article class="metric-card card"><p>API</p><h3 id="health-value">…</h3><span class="trend" id="health-meta">Checking</span></article>
        <article class="metric-card card"><p>Workouts</p><h3 id="workout-count">0</h3><span class="trend positive">Stored</span></article>
        <article class="metric-card card"><p>Best form</p><h3 id="best-form">—</h3><span class="trend positive">Across sets</span></article>
        <article class="metric-card card"><p>Latest</p><h3 id="latest-ex">None</h3><span class="trend neutral" id="latest-meta">No session yet</span></article>
      </section>
      <section class="content-grid">
        <article class="card workout-panel">
          <div class="panel-header">
            <div><p class="eyebrow">Program</p><h3>Choose an exercise</h3></div>
          </div>
          <div class="workout-list">
            ${V1_EXERCISES.map((exercise) => `
              <div class="workout-item ${exercise.analysis === 'available' ? 'is-active' : ''}">
                <div class="exercise-badge">${exercise.name.slice(0, 2).toUpperCase()}</div>
                <div><h4>${exercise.name}</h4><div class="workout-meta"><span>${exercise.mode === 'fitness' ? 'Fitness' : 'Rehabilitation'}</span></div></div>
                <div class="score-pill">${exercise.analysis === 'available' ? '<a href="#/workout">Start</a>' : 'Validation'}</div>
              </div>
            `).join('')}
          </div>
        </article>
        <aside class="card feedback-panel">
          <div class="panel-header"><div><p class="eyebrow">Progress</p><h3>Latest status</h3></div></div>
          <div class="empty-state" id="empty-state">
            <h4>No movement sessions yet</h4>
            <p>Your first verified set will appear here as soon as you capture a workout.</p>
            <a class="primary-btn" href="#/workout">Start your first set</a>
          </div>
          <p class="status-copy" id="dash-status">No training data yet.</p>
        </aside>
      </section>
    `,
    mount(root) {
      (async () => {
        try {
          const [health, workoutPayload] = await Promise.all([
            api('/health'),
            api('/workouts'),
          ]);
          const workouts = workoutPayload.workouts || [];
          const best = workouts.reduce((max, item) => Math.max(max, item.formScore || 0), 0);
          const latest = workouts.at(-1);
          root.querySelector('#health-value').textContent = health.ok ? 'Online' : 'Down';
          root.querySelector('#health-meta').textContent = health.service || 'blockfit';
          root.querySelector('#workout-count').textContent = String(workouts.length);
          root.querySelector('#best-form').textContent = workouts.length ? `${best}%` : '—';
          root.querySelector('#latest-ex').textContent = latest?.exercise || 'None';
          root.querySelector('#latest-meta').textContent = latest ? new Date(latest.createdAt).toLocaleString() : 'No session yet';

          if (workouts.length) {
            root.querySelector('#empty-state').innerHTML = `
              <h4>Recent momentum</h4>
              <p>${workouts.length} movement session${workouts.length > 1 ? 's' : ''} are stored and ready to review.</p>
              <a class="primary-btn" href="#/history">Review progress</a>
            `;
            root.querySelector('#dash-status').textContent = `${workouts.length} movement session${workouts.length > 1 ? 's are' : ' is'} stored and ready for review.`;
          } else {
            root.querySelector('#dash-status').textContent = 'Your first set will show up here once a workout is recorded.';
          }
        } catch (error) {
          root.querySelector('#health-value').textContent = 'Offline';
          root.querySelector('#health-meta').textContent = 'Connection check';
          root.querySelector('#empty-state').innerHTML = `
            <h4>Sync paused</h4>
            <p>Your data is still safe. Start a set when the connection is back or review the app once the service is reachable.</p>
            <a class="primary-btn" href="#/workout">Try a workout</a>
          `;
          root.querySelector('#dash-status').textContent = 'Connection check is currently paused; your next session can still be started.';
        }
      })();
    },
  };
}
