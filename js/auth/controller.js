/**
 * auth/controller.js — Auth UI state mutation handling.
 *
 * Owns the index.html portal only: switching between splash/login/signup/
 * reset sub-cards, form submission wiring, and surfacing auth errors as
 * toasts. Business logic itself lives in auth/core.js.
 */

import {
  initAuthObserver,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInAsGuest,
  resetPassword,
} from './core.js';

const portal = document.getElementById('auth-portal');

function showCard(name) {
  if (!portal) return;
  portal.dataset.view = name;
  portal.querySelectorAll('[data-card]').forEach((card) => {
    const isActive = card.dataset.card === name;
    card.classList.toggle('hidden', !isActive);
    card.setAttribute('aria-hidden', String(!isActive));
  });
}

function showAuthError(message) {
  const region = document.getElementById('auth-alert-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'lh-toast-item lh-glass';
  toast.style.borderColor = 'rgba(239, 68, 68, 0.4)';
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

/** Maps Firebase's raw error codes to plain, actionable copy (never expose "auth/..." to users). */
function friendlyAuthError(err) {
  const code = err?.code ?? '';
  const map = {
    'auth/invalid-credential': 'That email or password looks incorrect.',
    'auth/email-already-in-use': 'An account already exists for that email.',
    'auth/weak-password': 'Choose a password with at least 8 characters.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}

function wireNavigation() {
  portal?.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => showCard(btn.dataset.goto));
  });
}

function wireForms() {
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      showAuthError(friendlyAuthError(err));
    }
  });

  document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    try {
      await signUpWithEmail(email, password, name);
    } catch (err) {
      showAuthError(friendlyAuthError(err));
    }
  });

  document.getElementById('reset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    try {
      await resetPassword(email);
      showAuthError('Reset link sent — check your inbox.');
    } catch (err) {
      showAuthError(friendlyAuthError(err));
    }
  });

  portal?.querySelector('[data-provider="google"]')?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showAuthError(friendlyAuthError(err));
    }
  });

  portal?.querySelector('[data-provider="guest"]')?.addEventListener('click', async () => {
    try {
      await signInAsGuest();
    } catch (err) {
      showAuthError(friendlyAuthError(err));
    }
  });
}

initAuthObserver({
  onAuthenticated: () => window.location.assign('/dashboard.html'),
  onGuest: () => window.location.assign('/dashboard.html'),
  onSignedOut: () => showCard('login'),
});

wireNavigation();
wireForms();
