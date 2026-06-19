/**
 * sw.js — Service Worker
 *
 * 版本控管策略：
 * 不再使用手動的 'threads-featured-posts-v2' 靜態字串。
 * 改為在 install 時主動 fetch config.js 並計算其內容的 djb2 hash，
 * 以此作為動態 CACHE_NAME 的一部分。
 * 只要 config.js（貼文資料）有任何更動，快取版本就會自動失效。
 */

const BASE_CACHE_PREFIX = 'threads-featured-posts';
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

/**
 * djb2 hash：把字串轉為十六進位 hash 字串（純整數運算，不依賴 SubtleCrypto）。
 * 對 config.js 這種幾百 KB 的文字檔夠用，碰撞率極低。
 */
function djb2Hash(str) {
  var hash = 5381;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & hash; // 強制轉為 32-bit 整數，避免溢位
  }
  return (hash >>> 0).toString(16); // 無號整數轉十六進位
}

/**
 * getConfigHash()
 * 抓取 config.js 的文字內容並計算 hash。
 * 若抓取失敗（離線或錯誤），回退到 Date.now() 的十六進位，
 * 確保不會意外共用舊快取。
 */
async function getConfigHash() {
  try {
    const resp = await fetch('./config.js', { cache: 'no-store' });
    if (!resp.ok) throw new Error('fetch config.js failed: ' + resp.status);
    const text = await resp.text();
    return djb2Hash(text);
  } catch (e) {
    console.warn('[Service Worker] 無法讀取 config.js，使用時間戳作為版本:', e.message);
    return Date.now().toString(16);
  }
}

// CACHE_NAME 在 install 時動態決定，並存入 IndexedDB-free 的 Cache Storage 元資料快取。
const META_CACHE = BASE_CACHE_PREFIX + '-meta';

async function getActiveCacheName() {
  try {
    const metaCache = await caches.open(META_CACHE);
    const metaResp = await metaCache.match('cache-name');
    if (metaResp) return metaResp.text();
  } catch (e) {}
  return null;
}

async function setActiveCacheName(name) {
  try {
    const metaCache = await caches.open(META_CACHE);
    await metaCache.put('cache-name', new Response(name));
  } catch (e) {}
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const hash = await getConfigHash();
    const CACHE_NAME = `${BASE_CACHE_PREFIX}-${hash}`;
    console.log('[Service Worker] 安裝，快取版本:', CACHE_NAME);
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS_TO_CACHE);
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
  if (requestUrl.origin === self.location.origin) {
    event.respondWith((async () => {
      const activeName = await getActiveCacheName();
      const CACHE_NAME = activeName || BASE_CACHE_PREFIX;
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseToCache);
        }
        return response;
      } catch (err) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.headers.get('accept') &&
            event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      }
    })());
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
