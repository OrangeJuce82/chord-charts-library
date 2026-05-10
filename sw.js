const CACHE_VERSION = 'chord-charts-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  './',
  './index.html',
  './view.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/view.css',
  './css/fonts/Helvetica/HelveticaRegular/HelveticaRegular.woff',
  './css/fonts/Helvetica/HelveticaBold/HelveticaBold.woff',
  './css/fonts/MyriadPro/MyriadProRegular/MyriadProRegular.woff',
  './css/fonts/MyriadPro/MyriadProBold/MyriadProBold.woff',
  './css/fonts/Bravura/Bravura.woff',
  './js/config.js',
  './js/api.js',
  './js/app.js',
  './js/filters.js',
  './js/ireal-chart.js',
  './js/pwa.js',
  './js/stats.js',
  './js/table.js',
  './js/viewer.js',
  './js/vendor/ireal-renderer/ireal-reader-tiny.js',
  './js/vendor/ireal-renderer/ireal-renderer.js',
  './img/icons/favicon-16.png',
  './img/icons/favicon-32.png',
  './img/icons/apple-touch-icon.png',
  './img/icons/icon-192.png',
  './img/icons/icon-512.png'
];

const SUPABASE_HOST = 'mgwxjpryqhpnckruerij.supabase.co';

const normalizeResponseForCache = async (response) => {
  const headers = new Headers(response.headers);
  const body = await response.clone().arrayBuffer();
  return new Response(body, {
    status: response.status === 206 ? 200 : response.status,
    statusText: response.statusText,
    headers
  });
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
};

const networkFirst = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cacheableResponse = await normalizeResponseForCache(response);
      cache.put(request, cacheableResponse.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        if (url.pathname.endsWith('/view') || url.pathname.endsWith('/view.html')) {
          return caches.match('./view.html');
        }
        return caches.match('./index.html');
      })
    );
    return;
  }

  if (request.method !== 'GET') return;

  if (url.hostname === SUPABASE_HOST) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdnjs.cloudflare.com'
  ) {
    event.respondWith(cacheFirst(request));
  }
});
