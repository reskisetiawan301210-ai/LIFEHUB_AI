/**
 * components/alerts.js — Global toast & dialog notification controller.
 *
 * This is the single choke point every module funnels user-facing errors
 * and confirmations through, so raw exceptions never reach the screen
 * (see "Error Handling Architecture" in the project brief).
 */

const region = document.getElementById('toast-region');

const VARIANT_BORDER = {
  info: 'rgba(34, 211, 238, 0.4)',
  success: 'rgba(52, 211, 153, 0.4)',
  warning: 'rgba(251, 191, 36, 0.4)',
  error: 'rgba(239, 68, 68, 0.4)',
};

/**
 * @param {string} message - plain-language, actionable text. Never pass raw
 *   error.message / stack traces here — translate first (see toUserMessage).
 * @param {'info'|'success'|'warning'|'error'} variant
 * @param {number} durationMs
 */
export function showToast(message, variant = 'info', durationMs = 4000) {
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'lh-toast-item lh-glass';
  el.style.borderColor = VARIANT_BORDER[variant] ?? VARIANT_BORDER.info;
  el.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

/**
 * Central translator from technical/service errors to safe, human copy.
 * Extend the map as new service layers (aiService, musicService, ...)
 * introduce their own error shapes — never let a raw stack trace or API
 * response body reach this function's return value.
 */
export function toUserMessage(error) {
  const code = error?.code ?? error?.name ?? '';
  const knownMessages = {
    'network-error': "Couldn't connect. Check your internet connection and try again.",
    'rate-limited': "That's a lot of requests — please wait a moment and try again.",
    'permission-denied': "You don't have access to do that.",
  };
  return knownMessages[code] ?? 'Something went wrong. Please try again.';
}

export function confirmDialog(message) {
  // TODO: replace with a proper glass modal component; window.confirm is a
  // placeholder so feature modules have a stable API to call today.
  return window.confirm(message);
}
