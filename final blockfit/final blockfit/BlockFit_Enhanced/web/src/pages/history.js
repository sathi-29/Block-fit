import { api } from '../api.js';
import { buildExerciseProgress, formatExerciseName } from '../progress.js';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatChange(start, latest, unit, sessionCount) {
  if (start === null || latest === null) return 'Not available';
  if (sessionCount === 1) return `${latest}${unit} · baseline`;
  if (start === latest) return `${latest}${unit} · no change`;
  const change = latest - start;
  const suffix = unit === '%' ? ' pts' : unit;
  return `${start}${unit} → ${latest}${unit} · ${change > 0 ? '+' : ''}${change}${suffix}`;
}

function renderProgress(workouts) {
  const progress = buildExerciseProgress(workouts);
  if (!progress.length) {
    return '<p class="muted">Progress comparisons will appear after supported exercise sessions are saved.</p>';
  }

  return progress.map((item) => `
    <article class="progress-item">
      <div class="progress-exercise">
        <h4>${escapeHtml(formatExerciseName(item.exercise))}</h4>
        <span class="muted">${item.sessionCount} ${item.sessionCount === 1 ? 'session' : 'sessions'}</span>
      </div>
      <div class="progress-measure">
        <span>Form score</span>
        <strong>${formatChange(item.firstFormScore, item.latestFormScore, '%', item.sessionCount)}</strong>
      </div>
      <div class="progress-measure">
        <span>Correct reps</span>
        <strong>${formatChange(item.firstRepAccuracy, item.latestRepAccuracy, '%', item.sessionCount)}</strong>
      </div>
    </article>
  `).join('');
}

export function renderHistory() {
  return {
    html: `
      <section class="hero compact history-hero">
        <div class="hero-copy">
          <p class="eyebrow accent">History</p>
          <h2>Movement history</h2>
          <p class="lead">Track repetitions, movement quality, and progress over time in a privacy-first, exercise-focused history.</p>
          <div class="cta-row">
            <a class="primary-btn large" href="#/workout">Start a session</a>
            <a class="ghost-btn large" href="#/dashboard">Back to dashboard</a>
          </div>
        </div>
        <aside class="focus-card history-focus">
          <p class="eyebrow accent">Current trend</p>
          <h3>Small changes reveal the pattern.</h3>
          <ul class="focus-list">
            <li>Form quality over pace</li>
            <li>Consistency across reps</li>
            <li>Progress without clinical overclaiming</li>
          </ul>
          <div class="status-pill">Privacy-first analysis</div>
        </aside>
      </section>

      <section class="history-summary-grid">
        <article class="metric-card card"><p>Sessions</p><h3 id="history-session-count">0</h3><span class="trend positive" id="history-session-meta">No saves yet</span></article>
        <article class="metric-card card"><p>Best form</p><h3 id="history-best-score">—</h3><span class="trend positive" id="history-best-meta">Keep building</span></article>
        <article class="metric-card card"><p>Latest</p><h3 id="history-latest-exercise">None</h3><span class="trend neutral" id="history-latest-meta">Awaiting a set</span></article>
      </section>

      <section class="progress-section">
        <div class="panel-header"><div><p class="eyebrow">Your progress</p><h3>Changes by exercise</h3></div></div>
        <div id="progress-list" class="progress-list"><p class="muted">Loading progress…</p></div>
        <p class="muted quiet-note">ROM and asymmetry are not shown because BlockFit does not yet record validated measurements for them.</p>
      </section>
      <section class="card workout-panel history-panel">
        <div class="panel-header"><div><p class="eyebrow">Sessions</p><h3>Recent activity</h3></div></div>
        <div id="history-list" class="workout-list"><p class="muted">Loading…</p></div>
      </section>
    `,
    mount(root) {
      const list = root.querySelector('#history-list');
      const progressList = root.querySelector('#progress-list');
      const sessionCountEl = root.querySelector('#history-session-count');
      const bestScoreEl = root.querySelector('#history-best-score');
      const latestExerciseEl = root.querySelector('#history-latest-exercise');
      const sessionMetaEl = root.querySelector('#history-session-meta');
      const bestMetaEl = root.querySelector('#history-best-meta');
      const latestMetaEl = root.querySelector('#history-latest-meta');

      api('/workouts')
        .then((payload) => {
          const workouts = [...(payload.workouts || [])]
            .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

          const bestScore = workouts.reduce((max, item) => Math.max(max, Number(item.formScore) || 0), 0);
          const latest = workouts[0];

          sessionCountEl.textContent = String(workouts.length);
          bestScoreEl.textContent = workouts.length ? `${bestScore}%` : '—';
          latestExerciseEl.textContent = latest ? formatExerciseName(latest.exercise) : 'None';
          sessionMetaEl.textContent = workouts.length ? `${workouts.length} saved` : 'No saves yet';
          bestMetaEl.textContent = workouts.length ? 'Peak form so far' : 'Keep building';
          latestMetaEl.textContent = latest ? new Date(latest.createdAt).toLocaleString() : 'Awaiting a set';

          progressList.innerHTML = renderProgress(workouts);
          if (!workouts.length) {
            list.innerHTML = `
              <div class="empty-state">
                <h4>No workouts yet</h4>
                <p>Complete your first movement session to unlock your progress history and form trends.</p>
                <a class="primary-btn" href="#/workout">Start your first set</a>
              </div>
            `;
            return;
          }
          list.innerHTML = workouts
            .map((item) => `
                <div class="workout-item">
                  <div class="exercise-badge">${escapeHtml(String(item.exercise || 'EX').slice(0, 2).toUpperCase())}</div>
                  <div>
                    <h4>${escapeHtml(formatExerciseName(item.exercise))}</h4>
                    <div class="workout-meta">
                      <span>${item.validReps} correct / ${item.invalidReps} needs work</span>
                      <span>${item.durationSeconds}s</span>
                      <span>${new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div class="score-pill">${item.formScore}%</div>
                </div>
              `).join('');
        })
        .catch((error) => {
          list.innerHTML = `
            <div class="error-state">
              <h4>History is unavailable</h4>
              <p>${escapeHtml(error.message)}</p>
              <a class="primary-btn" href="#/workout">Return to session</a>
            </div>
          `;
          progressList.innerHTML = '<p class="muted">Progress is unavailable right now.</p>';
        });
    },
  };
}
