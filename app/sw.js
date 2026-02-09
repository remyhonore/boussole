// sw.js — Boussole (neutral SW: no caching)
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-only: do not cache anything (avoids stale JS/PDF bugs)
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
