const CACHE_NAME = 'visitas-v2';

const urlsToCache = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'qrcode.min.js',
  'manifest.json',
  '../shared-styles.css',
  '../config.js',
  '../utils.js',
  '../Logotipo T Control.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET y llamadas a la API de Google Apps Script
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});