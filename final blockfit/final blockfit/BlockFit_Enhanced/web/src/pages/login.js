import { api } from '../api.js';
import { setSession } from '../auth.js';
import { track } from '../analytics.js';

function authCard({ title, subtitle, content, footer = '', intro = '' }) {
  const introMarkup = intro || `
    <div class="auth-intro-copy">
      <p class="eyebrow accent">BlockFit</p>
      <h2>Movement coaching for everyday fitness and rehab.</h2>
      <p>Track form, reps, and progress with clear feedback and honest data.</p>
    </div>
    <ul class="auth-proof-list">
      <li>Clear rep and form insight</li>
      <li>Focused fitness + rehab routines</li>
      <li>Privacy-first data handling</li>
    </ul>
  `;

  return `
    <section class="auth-page">
      <div class="auth-split">
        <aside class="auth-intro">
          ${introMarkup}
        </aside>
        <article class="card auth-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">BLOCKFIT ACCOUNT</p>
              <h3>${title}</h3>
            </div>
          </div>
          <p class="lead">${subtitle}</p>
          ${content}
          ${footer}
        </article>
      </div>
    </section>
  `;
}

function passwordField(label, name, { confirm = false } = {}) {
  return `
    <label><span>${label}</span>
      <span class="password-input-wrap">
        <input type="password" name="${name}" autocomplete="${confirm ? 'new-password' : 'current-password'}" required minlength="8" ${confirm ? 'data-confirm-password' : ''} />
        <button class="password-toggle" type="button" data-action="toggle-password" aria-label="Show ${label.toLowerCase()}" aria-pressed="false">Show</button>
      </span>
    </label>
  `;
}

function bindPasswordToggles(root) {
  root.querySelectorAll('[data-action="toggle-password"]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.closest('.password-input-wrap').querySelector('input');
      const showing = input.type === 'password';
      input.type = showing ? 'text' : 'password';
      button.textContent = showing ? 'Hide' : 'Show';
      button.setAttribute('aria-label', `${showing ? 'Hide' : 'Show'} ${input.name === 'confirmPassword' ? 'confirm password' : 'password'}`);
      button.setAttribute('aria-pressed', String(showing));
    });
  });
}

function bindForm(root, { submit, mode, successPath, validate }) {
  const form = root.querySelector('#auth-form');
  const error = root.querySelector('#auth-error');
  const message = root.querySelector('#auth-message');
  bindPasswordToggles(root);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    if (message) message.hidden = true;
    const data = Object.fromEntries(new FormData(form).entries());
    const validationError = validate?.(data);
    if (validationError) {
      error.hidden = false;
      error.textContent = validationError;
      return;
    }
    try {
      const result = await submit(data);
      if (result.token) {
        setSession(result);
        track('auth_success', { mode });
        window.location.hash = successPath;
      } else if (message) {
        message.hidden = false;
        message.textContent = result.message;
        form.reset();
      } else {
        window.location.hash = successPath;
      }
    } catch (err) {
      track('auth_failure', { mode });
      error.hidden = false;
      error.textContent = err.message;
    }
  });
}

export function renderLogin() {
  return {
    html: authCard({
      title: 'Log in',
      subtitle: 'Continue your training with BlockFit.',
      content: `
        <form id="auth-form" class="auth-form">
          <label><span>Email or username</span><input type="text" name="identifier" autocomplete="username" required /></label>
          ${passwordField('Password', 'password')}
          <p class="form-error" id="auth-error" role="alert" hidden></p>
          <button class="primary-btn wide" type="submit">Log in</button>
        </form>
      `,
      footer: `<div class="auth-links"><a href="#/forgot-password">Forgot password?</a><span>New to BlockFit? <a href="#/register">Create account</a></span></div>`,
    }),
    mount(root) {
      bindForm(root, {
        mode: 'login',
        successPath: '/dashboard',
        submit: (payload) => api('/auth/login', { method: 'POST', body: payload }),
      });
    },
  };
}

export function renderRegister() {
  return {
    html: authCard({
      title: 'Create account',
      subtitle: 'Set up your account to start training.',
      content: `
        <form id="auth-form" class="auth-form">
          <label><span>Full name</span><input type="text" name="name" autocomplete="name" required minlength="2" maxlength="100" /></label>
          <label><span>Email</span><input type="email" name="email" autocomplete="email" required maxlength="255" /></label>
          <label><span>Phone number <span class="optional-label">Optional</span></span><input type="tel" name="phone" autocomplete="tel" maxlength="30" /></label>
          <label><span>Username</span><input type="text" name="username" autocomplete="username" required minlength="3" maxlength="50" pattern="[A-Za-z0-9_.\\-]+" /></label>
          ${passwordField('Password', 'password')}
          ${passwordField('Confirm password', 'confirmPassword', { confirm: true })}
          <p class="password-hint">At least 8 characters and one number.</p>
          <p class="form-error" id="auth-error" role="alert" hidden></p>
          <button class="primary-btn wide" type="submit">Create account</button>
        </form>
      `,
      footer: `<p class="muted auth-footer">Already have an account? <a href="#/login">Log in</a>.</p>`,
    }),
    mount(root) {
      bindForm(root, {
        mode: 'register',
        successPath: '/dashboard',
        validate: ({ password, confirmPassword }) => {
          if (!/\d/.test(password)) return 'Password must contain at least one number.';
          if (password !== confirmPassword) return 'Passwords do not match.';
          return null;
        },
        submit: (payload) => api('/auth/register', { method: 'POST', body: payload }),
      });
    },
  };
}

export function renderForgotPassword() {
  return {
    html: authCard({
      title: 'Reset your password',
      subtitle: 'Enter your account email and we will send a secure reset link.',
      content: `
        <form id="auth-form" class="auth-form">
          <label><span>Email</span><input type="email" name="email" autocomplete="email" required maxlength="255" /></label>
          <p class="form-error" id="auth-error" role="alert" hidden></p>
          <p class="form-success" id="auth-message" role="status" hidden></p>
          <button class="primary-btn wide" type="submit">Send reset link</button>
        </form>
      `,
      footer: `<p class="muted auth-footer"><a href="#/login">Back to log in</a></p>`,
    }),
    mount(root) {
      bindForm(root, { mode: 'forgot_password', successPath: '/login', submit: (payload) => api('/auth/forgot-password', { method: 'POST', body: payload }) });
    },
  };
}

export function renderResetPassword(token) {
  return {
    html: authCard({
      title: 'Choose a new password',
      subtitle: 'Use at least 8 characters and include one number.',
      content: `
        <form id="auth-form" class="auth-form">
          ${passwordField('New password', 'password')}
          ${passwordField('Confirm new password', 'confirmPassword', { confirm: true })}
          <p class="form-error" id="auth-error" role="alert" hidden></p>
          <button class="primary-btn wide" type="submit">Update password</button>
        </form>
      `,
      footer: `<p class="muted auth-footer"><a href="#/login">Back to log in</a></p>`,
    }),
    mount(root) {
      bindForm(root, {
        mode: 'reset_password',
        successPath: '/login',
        validate: ({ password, confirmPassword }) => {
          if (!/\d/.test(password)) return 'Password must contain at least one number.';
          if (password !== confirmPassword) return 'Passwords do not match.';
          return null;
        },
        submit: ({ password }) => api('/auth/reset-password', { method: 'POST', body: { token, password } }),
      });
    },
  };
}
