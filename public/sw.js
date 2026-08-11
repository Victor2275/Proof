const CACHE_NAME = 'cookbook-cache-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/manifest.json', '/logo.png']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  // Never cache API calls in service worker
  if (url.pathname.startsWith('/api/')) return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        return new Response(JSON.stringify({ error: 'Network error and no cached data available.' }), { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })
  );
});
