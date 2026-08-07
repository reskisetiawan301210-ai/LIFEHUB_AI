/**
 * LifeHub AI — Service Worker (Production Ready)
 */

const CACHE_VERSION = 'lifehub-v2';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Daftar file utama yang akan di-cache untuk offline mode
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/manifest.json',
  '/js/app.js',
  '/js/store.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(async (cache) => {
      // Menggunakan fetch manual agar jika 1 file hilang (404), instalasi TIDAK GAGAL
      await Promise.allSettled(
        APP_SHELL_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url);
            if (res.ok) await cache.put(url, res);
          } catch (err) {
            console.warn(`[SW] Skip caching ${url}:`, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
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

  // Navigation requests: network-first, fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/dashboard.html') || caches.match('/index.html'))
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate
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
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'lifehub-flush-queue') {
    // Sync logic
  }
});