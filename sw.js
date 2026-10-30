const CACHE_NAME = 'copay-pointqr-v3';
const ASSETS = [
  '/pointqr/app.html',
  '/pointqr/dashboard_2.html',
  '/pointqr/manifest.json',
  '/pointqr/logo.jpg',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap'
];

// Installation — mise en cache de tous les assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

// Activation — supprimer les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — Cache first pour assets, network first pour Firebase
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase et APIs → toujours réseau (pas de cache)
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('nominatim') ||
      url.hostname.includes('cloudinary')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('{"offline":true}', {headers:{'Content-Type':'application/json'}}))
    );
    return;
  }

  // Assets statiques → Cache first, puis réseau
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/pointqr/app.html'));
    })
  );
});

// Notification push
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'COPAY Services', {
      body: data.body || 'Notification',
      icon: '/pointqr/logo.jpg',
      badge: '/pointqr/logo.jpg',
      tag: data.tag || 'copay-notif',
      requireInteraction: false
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/pointqr/app.html'));
});
