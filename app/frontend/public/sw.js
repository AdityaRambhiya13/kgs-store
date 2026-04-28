// Service Worker v3 — Aggressive cache busting for Ketan Stores
const CACHE_NAME = 'ketan-cache-v3';

self.addEventListener('install', (event) => {
  // Skip waiting so new SW activates immediately — no waiting for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately so new code takes effect without reload
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map(k => caches.delete(k))) // Delete ALL caches unconditionally
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NEVER cache: JS, CSS, HTML, API calls, manifest, sw itself
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For images/fonts only — cache with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
