const BASE_CACHE_PREFIX = 'threads-featured-posts';
const SW_SCHEMA_VERSION = '3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './threads-loader.js',
  './config.js',
  './console-filter.js',
  './manifest.json',
  './assets/icons/favicon.ico',
  './assets/icons/favicon-192x192.png',
  './assets/icons/favicon-512x512.png',
  './assets/icons/apple-touch-icon.png'
];
const VERSION_SOURCE_FILES = [
  './config.js',
  './threads-loader.js',
  './console-filter.js',
  './styles.css',
  './index.html',
  './manifest.json'
];
function isNetworkFirst(requestUrl, request) {
  const path = requestUrl.pathname;
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) return true;
  return /\.(?:js|css|json)$/i.test(path);
}
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16);
}
async function getVersionHash() {
  try {
    const texts = await Promise.all(
      VERSION_SOURCE_FILES.map(async (url) => {
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error('fetch failed ' + url + ': ' + resp.status);
        return resp.text();
      })
    );
    const combined = texts.join('\u0000');
    return djb2Hash(combined);
  } catch (e) {
    console.warn('[Service Worker] 核心檔案讀取失敗，改用時間戳作為版本:', e.message);
    return Date.now().toString(16);
  }
}
const META_CACHE = BASE_CACHE_PREFIX + '-meta';
async function getActiveCacheName() {
  try {
    const metaCache = await caches.open(META_CACHE);
    const metaResp = await metaCache.match('cache-name');
    if (metaResp) return metaResp.text();
  } catch (e) { }
  return null;
}
async function setActiveCacheName(name) {
  try {
    const metaCache = await caches.open(META_CACHE);
    await metaCache.put('cache-name', new Response(name));
  } catch (e) { }
}
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const hash = await getVersionHash();
    const CACHE_NAME = `${BASE_CACHE_PREFIX}-v${SW_SCHEMA_VERSION}-${hash}`;
    console.log('[Service Worker] 安裝，快取版本:', CACHE_NAME);
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      ASSETS_TO_CACHE.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'no-store' });
          if (resp && resp.ok) await cache.put(url, resp.clone());
        } catch (e) {
          console.warn('[Service Worker] 預快取失敗:', url, e.message);
        }
      })
    );
    await setActiveCacheName(CACHE_NAME);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const activeName = await getActiveCacheName();
    const allCacheNames = await caches.keys();
    await Promise.all(
      allCacheNames
        .filter((name) => name !== META_CACHE && name !== activeName)
        .map((name) => {
          console.log('[Service Worker] 刪除舊快取:', name);
          return caches.delete(name);
        })
    );
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith((async () => {
    const activeName = await getActiveCacheName();
    const CACHE_NAME = activeName || (BASE_CACHE_PREFIX + '-v' + SW_SCHEMA_VERSION);
    if (isNetworkFirst(requestUrl, event.request)) {
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (err) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const accept = event.request.headers.get('accept') || '';
        if (accept.includes('text/html')) {
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
        }
        throw err;
      }
    }
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response && response.status === 200 && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (err) {
      return cached;
    }
  })());
});
