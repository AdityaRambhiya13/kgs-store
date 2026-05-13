// Service Worker v40 — Smart caching for Ketan Stores PWA
// Strategy: Cache-first for fonts/icons, Network-first for API, Shell cached on install
const CACHE_VERSION = 'v40'
const SHELL_CACHE = `ketan-shell-${CACHE_VERSION}`
const ASSET_CACHE = `ketan-assets-${CACHE_VERSION}`

// App shell resources to pre-cache on install
const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_URLS).catch((err) => {
        console.warn('[SW] Shell pre-cache partial failure:', err)
      })
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const method = event.request.method

  // Only handle GET requests
  if (method !== 'GET') return

  // ── API calls: always network, offline fallback ──────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', message: 'You are offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // ── Google Fonts: cache-first ─────────────────────────────────────
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone())
            }
            return response
          }).catch(() => cached || new Response('Font unavailable', { status: 503 }))
        })
      )
    )
    return
  }

  // ── Product images (Supabase CDN): cache-first, 1-week TTL ────────
  if (url.hostname.includes('supabase.co') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/i)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone())
            }
            return response
          }).catch(() => cached)
        })
      )
    )
    return
  }

  // ── App shell (HTML / SPA routes): network-first, shell fallback ──
  if (
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    !url.pathname.includes('.')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh HTML shell
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() =>
          // Offline: serve cached shell so user sees skeleton, not blank screen
          caches.match('/').then((cached) => cached || new Response('<h1>Offline</h1>', {
            headers: { 'Content-Type': 'text/html' }
          }))
        )
    )
    return
  }

  // ── JS/CSS assets: network-first (always fresh after deploy) ──────
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style'
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) => cached || new Response('', { status: 503 }))
      )
    )
    return
  }

  // ── Default: network with silent fail ─────────────────────────────
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
