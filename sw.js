/**
 * Boussole — Service Worker
 * Cache offline : app utilisable sans connexion après premier chargement
 */

const CACHE_NAME = 'boussole-v8.79';

const ASSETS_TO_CACHE = [
  '/app.js',
  '/calc.js',
  '/pdf.js',
  '/pdf_consultation.js',
  '/storage.js',
  '/styles.css',
  '/manifest.json',
  '/favicon.svg',
  '/confidentialite.html',
  '/pem_detector.js',
  '/cycle_tracker.js',
  '/correlations.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Installation : mise en cache des assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Notification click : ouvrir ou focuser l'app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});

// Fetch : cache-first pour les assets, network-first pour le reste
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  // index.html toujours depuis le réseau
  const { request } = event;
  if (request.url.endsWith('/') || request.url.endsWith('/index.html')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources valides
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline : retourner index.html pour navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
