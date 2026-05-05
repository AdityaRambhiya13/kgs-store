// Service Worker v8 — Aggressive cache busting for Ketan Stores
const CACHE_NAME = 'ketan-cache-v8';

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
  
  // NEVER cache: JS, CSS, HTML, API calls, manifest, sw itself, and SPA routes
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js' ||
    !url.pathname.includes('.') // SPA routes like /login, /cart, etc.
  ) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.error('[SW] Fetch failed:', error);
        return new Response('Network error. Please check your connection.', {
          status: 503,
          headers: { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*'
          }
        });
      })
    );
    return;
  }
  
  // For images/fonts only — cache with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Silent fail for assets, or could return a placeholder
          return new Response('Not found', { status: 404 });
        });
    })
  );
});
