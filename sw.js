// Fitly Service Worker — offline fallback
const CACHE = 'fitly-offline-v1';

// Pre-cache the offline page at install time
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add('/404.html')).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept navigation requests — serve offline page from cache on network failure
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(CACHE).then((cache) => cache.match('/404.html')).then((cached) =>
        cached || new Response('Offline', { status: 503 })
      )
    )
  );
});
