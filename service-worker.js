// Bump CACHE_VERSION on every release so players get the update.
const CACHE_VERSION = 'up-or-down-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/world.js',
  './js/plane.js',
  './js/obstacles.js',
  './js/game.js',
  './js/input.js',
  './js/audio.js',
  './js/storage.js',
  './js/ui.js',
  './js/pwa.js',
  './js/modes.js',
  './js/rider.js',
  './js/trail.js',
  './js/stars.js',
  './js/particles.js',
  './js/lib/three.module.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
