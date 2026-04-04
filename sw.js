/**
 * Boussole — Service Worker
 * Cache offline : app utilisable sans connexion après premier chargement
 */

const CACHE_NAME = 'boussole-v9.83';

const ASSETS_TO_CACHE = [
  '/app.js',
  '/calc.js',
  '/daytype.js',
  '/storage.js',
  '/pdf.js',
  '/pdf_consultation.js',
  '/traitements.js',
  '/import_mes.js',
  '/onboarding.js',
  '/score_sna.js',
  '/pacing.js',
  '/fiches_data.js',
  '/profil_data.js',
  '/pem_detector.js',
  '/cycle_tracker.js',
  '/correlations.js',
  '/charts.js',
  '/questionnaires.js',
  '/share_profile.js',
  '/styles.css',
  '/manifest.json',
  '/favicon.svg',
  '/confidentialite.html',
  '/cgu.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Installation : mise en cache des assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets obligatoires, CDN en best-effort
      const localAssets = ASSETS_TO_CACHE.filter(u => !u.startsWith('http'));
      const cdnAssets = ASSETS_TO_CACHE.filter(u => u.startsWith('http'));
      return cache.addAll(localAssets).then(() => {
        return Promise.allSettled(
          cdnAssets.map(url => cache.add(url).catch(() => console.warn('SW: CDN cache skip', url)))
        );
      });
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

  // Ignorer les schemes non supportés par le cache (chrome-extension, etc.)
  const url = new URL(event.request.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // index.html : network-first avec fallback cache
  const { request } = event;
  if (request.url.endsWith('/') || request.url.endsWith('/index.html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
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
