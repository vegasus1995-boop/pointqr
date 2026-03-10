const CACHE_NAME = 'pointqr-v1';
const urlsToCache = [
  '/pointqr/dashboard.html',
  '/pointqr/scanner.html',
  '/pointqr/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
