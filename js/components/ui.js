/**
 * components/ui.js — Core reusable element utilities.
 *
 * Small, dependency-free DOM helpers shared by every feature module.
 * Keeping these here means the empty/loading/error visual language stays
 * identical across Finance, Notes, Music, Movies, etc.
 */

/** Renders N skeleton rows into a container while data is loading. */
export function renderSkeleton(container, { rows = 3, heightPx = 32 } = {}) {
  container.innerHTML = '';
  container.setAttribute('aria-busy', 'true');
  for (let i = 0; i < rows; i += 1) {
    const row = document.createElement('div');
    row.className = 'lh-skeleton w-full mb-2';
    row.style.height = `${heightPx}px`;
    container.appendChild(row);
  }
}

/** Replaces a container's content with the shared empty-state template. */
export function renderEmptyState(container, { title, message, actionLabel, onAction } = {}) {
  const template = document.getElementById('lh-empty-state-template');
  container.setAttribute('aria-busy', 'false');
  container.innerHTML = '';
  if (!template) return;
  const node = template.content.cloneNode(true);
  if (title) node.querySelector('p.lh-display').textContent = title;
  if (message) node.querySelector('p.text-lhmuted').textContent = message;
  const btn = node.querySelector('button');
  if (actionLabel) btn.textContent = actionLabel;
  if (onAction) btn.addEventListener('click', onAction);
  container.appendChild(node);
}

/** Builds a glass card element; used by feature modules instead of inline HTML strings. */
export function createCard({ className = '', innerHTML = '' } = {}) {
  const el = document.createElement('section');
  el.className = `lh-glass p-5 ${className}`.trim();
  el.innerHTML = innerHTML;
  return el;
}

/** Escapes untrusted text before it is ever inserted via innerHTML (defense in depth
 *  alongside using textContent wherever raw HTML isn't actually required — see the
 *  input-sanitization notes in each feature module). */
export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
