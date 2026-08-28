const CACHE_NAME = 'corta-status-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

// Instala e armazena os arquivos base em cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Intercepta requisições para entregar do cache quando offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
