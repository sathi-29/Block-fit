import { isLoggedIn } from './auth.js';
import { renderLanding } from './pages/landing.js';
import { renderLogin, renderForgotPassword, renderResetPassword } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderWorkout } from './pages/workout.js';
import { renderRehabilitation } from './pages/rehabilitation.js';
import { renderHistory } from './pages/history.js';
import { renderProfile } from './pages/profile.js';
import { renderVerify } from './pages/verify.js';
import { getUser, clearSession } from './auth.js';

const routes = {
  '/': { render: renderLanding, public: true },
  '/login': { render: renderLogin, public: true },
  '/register': { render: renderRegister, public: true },
  '/forgot-password': { render: renderForgotPassword, public: true },
  '/dashboard': { render: renderDashboard },
  '/workout': { render: renderWorkout },
  '/rehabilitation': { render: renderRehabilitation },
  '/history': { render: renderHistory },
  '/profile': { render: renderProfile },
};

export function navigate(path) {
  if (!path.startsWith('#')) {
    window.location.hash = path.startsWith('/') ? path : `/${path}`;
    return;
  }
  window.location.hash = path.slice(1);
}

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash.startsWith('/') ? hash : `/${hash}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function shell(content, { active = '' } = {}) {
  const user = getUser();
  const loggedIn = isLoggedIn();

  return `
    <div class="page-shell">
      <header class="topbar">
        <a class="brand-wrap" href="#/">
          <div class="brand-mark">B</div>
          <div>
            <p class="eyebrow">AI FITNESS</p>
            <h1>BlockFit</h1>
          </div>
        </a>
        <nav class="nav">
          ${loggedIn ? `
            <a class="${active === 'dashboard' ? 'is-active' : ''}" href="#/dashboard">Dashboard</a>
            <a class="${active === 'workout' ? 'is-active' : ''}" href="#/workout">Workout</a>
            <a class="${active === 'rehabilitation' ? 'is-active' : ''}" href="#/rehabilitation">Rehabilitation</a>
            <a class="${active === 'history' ? 'is-active' : ''}" href="#/history">History</a>
            <a class="${active === 'profile' ? 'is-active' : ''}" href="#/profile">Profile</a>
          ` : `
            <a href="#/">Overview</a>
            <a href="#/login">Log in</a>
          `}
        </nav>
        <div class="nav-actions">
          ${loggedIn ? `
            <span class="user-chip">${escapeHtml(user?.name || 'Athlete')}</span>
            <button class="ghost-btn" data-action="logout" type="button">Log out</button>
          ` : `
            <a class="ghost-btn" href="#/login">Log in</a>
            <a class="primary-btn" href="#/register">Get started</a>
          `}
        </div>
      </header>
      <main>${content}</main>
    </div>
  `;
}

function renderAppError() {
  return `
    <section class="auth-page" role="alert">
      <article class="card auth-panel app-error">
        <p class="eyebrow accent">TEMPORARY ERROR</p>
        <h2>We couldn't load this view.</h2>
        <p class="lead">Your data is safe. Try again, or return to the dashboard.</p>
        <div class="cta-row">
          <button class="primary-btn" type="button" data-action="retry">Try again</button>
          <a class="ghost-btn" href="#/">Return home</a>
        </div>
      </article>
    </section>
  `;
}

export function startApp() {
  const root = document.getElementById('app');
  let cleanup = () => {};

  const render = () => {
    cleanup();
    const path = currentPath();

    if (path.startsWith('/verify/')) {
      const id = path.replace('/verify/', '');
      root.innerHTML = shell(renderVerify(id), { active: '' });
      return;
    }

    if (path.startsWith('/reset-password/')) {
      const token = path.slice('/reset-password/'.length);
      const result = renderResetPassword(token);
      root.innerHTML = shell(result.html);
      cleanup = result.mount(root) || (() => {});
      return;
    }

    if (path === '/' && !isLoggedIn()) {
      window.location.hash = '/login';
      return;
    }
    if (path === '/' && isLoggedIn()) {
      window.location.hash = '/dashboard';
      return;
    }

    const route = routes[path] || routes['/'];
    if (!route.public && !isLoggedIn()) {
      window.location.hash = '/login';
      return;
    }
    if ((path === '/login' || path === '/register') && isLoggedIn()) {
      window.location.hash = '/dashboard';
      return;
    }

    const active = path.replace('/', '') || 'home';
    let result;
    try {
      result = route.render();
    } catch (error) {
      console.error('[APP ERROR]', error);
      root.innerHTML = shell(renderAppError(), { active });
      root.querySelector('[data-action="retry"]')?.addEventListener('click', render);
      return;
    }
    const html = typeof result === 'string' ? result : result.html;
    root.innerHTML = shell(html, { active });

    root.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
      clearSession();
      window.location.hash = '/login';
    });

    try {
      cleanup = typeof result === 'object' && result.mount ? result.mount(root) || (() => {}) : () => {};
    } catch (error) {
      console.error('[APP ERROR]', error);
      root.innerHTML = shell(renderAppError(), { active });
      root.querySelector('[data-action="retry"]')?.addEventListener('click', render);
    }
  };

  window.addEventListener('hashchange', render);
  if (!window.location.hash) window.location.hash = '/';
  render();
}
