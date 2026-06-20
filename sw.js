/**
 * sw.js — Service Worker
 *
 * 版本控管策略（自動化）：
 * 不使用任何手動維護的靜態版本字串。install 時主動 fetch 所有「核心程式/資料檔」
 * （config.js、threads-loader.js、console-filter.js、styles.css、index.html、
 * manifest.json），把內容合併後計算 djb2 hash，做為動態 CACHE_NAME 的一部分。
 *
 * 只要其中任何一個檔案有任何更動（新增貼文、改 JS 邏輯、改樣式…），
 * hash 就會改變 → CACHE_NAME 改變 → activate 時自動刪除舊快取，
 * 使用者重新整理即取得新版，完全不需手動更新版本號或清快取。
 *
 * 另含 SW_SCHEMA_VERSION：當這支 sw.js 的快取邏輯本身（例如資產清單、策略）
 * 改動時，手動 +1 即可強制翻新版本，避免邏輯改了但版本沒變。
 */

const BASE_CACHE_PREFIX = 'threads-featured-posts';
const SW_SCHEMA_VERSION = '3'; // 改動下方快取邏輯/資產清單時 +1

// 會被快取的所有資產。
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

// 參與版本 hash 計算的「核心檔案」——任何一個改動都應翻新快取版本。
// （圖示等二進位資產不參與 hash，因為它們極少變動且不易以文字 hash。）
const VERSION_SOURCE_FILES = [
  './config.js',
  './threads-loader.js',
  './console-filter.js',
  './styles.css',
  './index.html',
  './manifest.json'
];

// network-first 的資產類型（內容會更新，須優先取網路最新版並回寫快取）。
function isNetworkFirst(requestUrl, request) {
  const path = requestUrl.pathname;
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) return true; // 導覽請求
  return /\.(?:js|css|json)$/i.test(path);
}

/**
 * djb2 hash：把字串轉為十六進位 hash（純整數運算，不依賴 SubtleCrypto）。
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & hash; // 強制 32-bit
  }
  return (hash >>> 0).toString(16);
}

/**
 * 抓取所有核心檔案內容並計算合併後的 hash。
 * 任一檔案抓取失敗即回退到 Date.now()，確保不會誤用舊快取。
 */
async function getVersionHash() {
  try {
    const texts = await Promise.all(
      VERSION_SOURCE_FILES.map(async (url) => {
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error('fetch failed ' + url + ': ' + resp.status);
        return resp.text();
      })
    );
    // 以分隔符串接，避免不同檔案邊界碰撞
    const combined = texts.join('\u0000');
    return djb2Hash(combined);
  } catch (e) {
    console.warn('[Service Worker] 核心檔案讀取失敗，改用時間戳作為版本:', e.message);
    return Date.now().toString(16);
  }
}

// 動態決定的 CACHE_NAME 存於專用 meta 快取，供 fetch/activate 讀取。
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
    const hash = await getVersionHash();
    const CACHE_NAME = `${BASE_CACHE_PREFIX}-v${SW_SCHEMA_VERSION}-${hash}`;
    console.log('[Service Worker] 安裝，快取版本:', CACHE_NAME);
    const cache = await caches.open(CACHE_NAME);
    // 用 no-store 重新抓取，確保快取的是最新內容而非瀏覽器 HTTP 快取的舊版
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

  // 跨域請求：直接走網路，失敗才回退快取。
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
      // network-first：優先取最新版並回寫快取，離線時回退快取。
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

    // cache-first：圖示等少變動的靜態資產，優先用快取、背景補抓。
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
