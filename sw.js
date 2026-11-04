// COPAY PointQR — Service Worker v5
// Pages (.html) : réseau d'abord (mises à jour reçues), cache en secours (hors ligne)
// Bibliothèques : cache d'abord (rapide + hors ligne)
const CACHE_NAME = 'copay-pointqr-v5';
const ASSETS = [
  '/pointqr/app.html',
  '/pointqr/dashboard_2.html',
  '/pointqr/calendrier.html',
  '/pointqr/badges_print.html',
  '/pointqr/manifest.json',
  '/pointqr/manifest_sec.json',
  '/pointqr/manifest_liv.json',
  '/pointqr/icon-192.png',
  '/pointqr/icon-512.png',
  '/pointqr/logo.jpg',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ASSETS.map(u => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Données en direct : on n'intervient pas (Firebase gère lui-même le hors ligne)
  if (url.hostname.endsWith('firestore.googleapis.com') ||
      url.hostname.endsWith('identitytoolkit.googleapis.com') ||
      url.hostname.endsWith('securetoken.googleapis.com') ||
      url.hostname.includes('nominatim') ||
      url.hostname.includes('cloudinary') ||
      url.hostname.includes('tile.openstreetmap')) return;

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html');
  if (isPage) {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() =>
        // ignoreSearch : app.html?role=sec retrouve app.html en cache
        caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('/pointqr/app.html', { ignoreSearch: true }))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'COPAY Services', {
    body: data.body || 'Notification', icon: '/pointqr/logo.jpg', badge: '/pointqr/logo.jpg', tag: data.tag || 'copay-notif'
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/pointqr/app.html'));
});
