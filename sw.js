// ResQHub Disaster Management: Offline Emergency Service Worker (Cache-First)
const CACHE_NAME = 'resqhub-disaster-offline-v7';
const PRECACHE_URLS = [
  './',
  './index.html',
  './user.html',
  './sos.html',
  './mobile.html',
  './css/styles.css',
  './js/data.js',
  './js/map.js',
  './js/app.js',
  './js/mobile.js',
  './vendor/tailwind.js',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/chart.min.js',
  './vendor/qrcode.min.js',
  './manifest.json'
];

// Install Event: Pre-cache all local assets for 100% offline usage
self.addEventListener('install', event => {
  console.log('[ResQHub Service Worker] Caching offline emergency assets for disaster resiliency...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Offline caching warning:', err))
  );
});

// Activate Event: Clear older caches
self.addEventListener('activate', event => {
  console.log('[ResQHub Service Worker] Activated & ready for offline zero-internet operations.');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First with network fallback
self.addEventListener('fetch', event => {
  // Do not intercept non-GET or internal server API endpoints
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // When completely offline and requesting page navigation, serve cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
