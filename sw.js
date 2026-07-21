/**
 * LifeHub AI — Service Worker
 * Responsibilities:
 *   1. Precache the app shell so the shell loads offline.
 *   2. Runtime-cache same-origin assets with a stale-while-revalidate policy.
 *   3. Serve an offline fallback view when navigation requests fail.
 *   4. Provide a background-sync hook for queued writes (finance/tasks/notes
 *      entries created while offline) — see TODO markers below.
 */

const CACHE_VERSION = 'lifehub-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/store.js',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('lifehub-') && key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation requests: network-first, fall back to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/dashboard.html'))
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (isSameOrigin) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
  // Cross-origin (API) requests are intentionally left to the network —
  // services implement their own retry/backoff (see /js/services/).
});

// TODO: register 'sync' event handling here once IndexedDB write-queue
// for offline finance/task/note mutations is implemented in store.js.
self.addEventListener('sync', (event) => {
  if (event.tag === 'lifehub-flush-queue') {
    // event.waitUntil(flushQueuedWrites());
  }
});
