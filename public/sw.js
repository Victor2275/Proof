const CACHE_NAME = 'cookbook-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension or other non-http requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Try network first
        const networkResponse = await fetch(event.request);
        
        // Cache the successful network response
        if (networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (err) {
        // If network fails (offline), fall back to cache
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        // If neither network nor cache has the response, return a graceful 503
        return new Response(JSON.stringify({ error: 'Network error and no cached data available.' }), { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })
  );
});
