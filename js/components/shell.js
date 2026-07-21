/**
 * components/shell.js — Shared navigation shell behavior.
 *
 * Handles the parts of the app shell that are identical across every hub:
 * sidebar collapse/expand, mobile drawer toggle, theme switching, and
 * marking the active nav link. Hub-specific content is owned by each
 * /js/features/*.js module instead.
 */

import { store } from '../store.js';

const shellEl = document.getElementById('lh-shell');
const sidebarToggle = document.getElementById('lh-sidebar-toggle');
const themeToggle = document.getElementById('lh-theme-toggle');
const logoutBtn = document.getElementById('lh-logout');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (themeToggle) themeToggle.textContent = theme === 'dark' ? '◐' : '◑';
}

function applySidebarState(state) {
  shellEl?.setAttribute('data-sidebar', state);
  sidebarToggle?.setAttribute('aria-expanded', String(state !== 'collapsed'));
}

function highlightActiveNav(hubName) {
  document.querySelectorAll('[data-hub-link]').forEach((link) => {
    const isActive = link.dataset.hubLink === hubName;
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

sidebarToggle?.addEventListener('click', () => {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) {
    const next = shellEl.dataset.sidebar === 'open' ? 'expanded' : 'open';
    applySidebarState(next);
    return;
  }
  const next = store.get('sidebar') === 'collapsed' ? 'expanded' : 'collapsed';
  store.set('sidebar', next);
});

themeToggle?.addEventListener('click', () => {
  const next = store.get('theme') === 'dark' ? 'light' : 'dark';
  store.set('theme', next);
});

logoutBtn?.addEventListener('click', async () => {
  const { logOut } = await import('../auth/core.js');
  await logOut();
});

store.subscribe('theme', applyTheme);
store.subscribe('sidebar', applySidebarState);
store.subscribe('activeHub', highlightActiveNav);

applyTheme(store.get('theme'));
applySidebarState(store.get('sidebar'));
