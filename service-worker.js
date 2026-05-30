const CACHE_NAME = 'audio-sync-reader-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://img.icons8.com/fluency/192/headphones.png',
  'https://img.icons8.com/fluency/512/headphones.png',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache during install:', error);
      })
  );
});

self.addEventListener('fetch', event => {
  // A robust strategy for Single-Page Applications (SPA).
  // For any navigation request, always serve the main index.html file.
  // This ensures the app loads correctly when launched from the home screen,
  // regardless of the path it was saved from.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // For all other requests (assets like scripts, styles, images),
  // use a "cache-first" strategy.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we have a response in the cache, return it.
        if (response) {
          return response;
        }

        // If not in cache, fetch from the network.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          networkResponse => {
            // Check if we received a valid response to cache.
            if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
              return networkResponse;
            }
            
            // Clone the response because it's a one-time-use stream.
            const responseToCache = networkResponse.clone();
            
            // Don't cache streaming media files.
            const contentType = networkResponse.headers.get('content-type');
            if (contentType && (contentType.startsWith('audio/') || contentType.startsWith('video/'))) {
                return networkResponse;
            }

            caches.open(CACHE_NAME)
              .then(cache => {
                // Cache the fetched response.
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
    );
});


self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
