import { getUser, clearSession } from '../auth.js';
import { api } from '../api.js';

export function renderProfile() {
  const user = getUser();
  return {
    html: `
      <section class="profile-shell">
        <header class="profile-hero card">
          <div class="profile-avatar">${(user?.name || 'A').charAt(0).toUpperCase()}</div>
          <div>
            <p class="eyebrow accent">Profile</p>
            <h2>${user?.name || 'Athlete'}</h2>
            <p class="lead">${user?.email || 'No email on file'}</p>
          </div>
          <div class="profile-score">
            <span>Movement score</span>
            <strong>87</strong>
          </div>
        </header>

        <section class="stats-grid profile-stats">
          <article class="metric-card card"><p>Goal</p><h3>Strength</h3><span class="trend positive">Build consistency</span></article>
          <article class="metric-card card"><p>Level</p><h3>Intermediate</h3><span class="trend positive">Balanced progression</span></article>
          <article class="metric-card card"><p>Streak</p><h3>12 days</h3><span class="trend neutral">Keep going</span></article>
          <article class="metric-card card"><p>Privacy</p><h3>Protected</h3><span class="trend positive">Local analysis</span></article>
        </section>

        <section class="profile-grid">
          <article class="card profile-panel">
            <div class="panel-header">
              <div><p class="eyebrow">Goals</p><h3>Preferences</h3></div>
            </div>
            <div class="settings-list">
              <div class="setting-item"><span>Primary goal</span><strong>Strength & control</strong></div>
              <div class="setting-item"><span>Experience</span><strong>Intermediate</strong></div>
              <div class="setting-item"><span>Preferred mode</span><strong>Fitness + rehab</strong></div>
              <div class="setting-item"><span>Camera guidance</span><strong>Adaptive cues</strong></div>
            </div>
          </article>

          <article class="card profile-panel">
            <div class="panel-header">
              <div><p class="eyebrow">Settings</p><h3>Account</h3></div>
            </div>
            <div class="settings-list">
              <div class="setting-item"><span>Physio access</span><strong>Connected</strong></div>
              <div class="setting-item"><span>Notifications</span><strong>Enabled</strong></div>
              <div class="setting-item"><span>Camera setup</span><strong>Configured</strong></div>
              <div class="setting-item"><span>Privacy policy</span><strong>Current</strong></div>
            </div>
          </article>
        </section>

        <section class="card profile-actions">
          <div class="panel-header">
            <div><p class="eyebrow">Controls</p><h3>Account actions</h3></div>
          </div>
          <div class="cta-row">
            <a class="primary-btn" href="#/workout">Start a session</a>
            <button class="ghost-btn" id="delete-account" type="button">Delete account</button>
          </div>
          <p class="form-error" id="profile-error" hidden></p>
          <p class="muted" id="profile-status"></p>
        </section>
      </section>
    `,
    mount(root) {
      root.querySelector('#delete-account').addEventListener('click', async () => {
        if (!window.confirm('Delete your account and remove its stored movement history? This cannot be undone.')) return;
        const button = root.querySelector('#delete-account');
        button.disabled = true;
        try {
          await api('/users/me', { method: 'DELETE' });
          clearSession();
          window.location.hash = '/';
        } catch (error) {
          button.disabled = false;
          const message = root.querySelector('#profile-error');
          message.hidden = false;
          message.textContent = error.message;
        }
      });
    },
  };
}
