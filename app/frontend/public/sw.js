// Service Worker - Network First strategy to avoid stale cache issues
const CACHE_NAME = 'kgs-cache-v2';

self.addEventListener('install', (event) => {
  // Skip waiting so new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear old caches on activation
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // ALWAYS fetch JS/CSS/HTML fresh from network — never serve stale assets
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For images and fonts, use cache with network fallback
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
