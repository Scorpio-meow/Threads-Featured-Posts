(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    var container = null;
    var loadedCount = 0;
    var embedScriptLoading = false;
    var embedScriptReady = false;
    var allBlockquotes = [];
    var currentIndex = 0;
    var processing = false;
    var inFlight = 0;
    var EMBED_CONCURRENCY = (function () {
        var n = (typeof BATCH_SIZE !== 'undefined' && BATCH_SIZE > 0) ? BATCH_SIZE : 3;
        return Math.max(1, Math.min(4, n));
    })();
    var paused = false;
    var currentDelay = LOAD_DELAY;
    var rateLimitDetected = false;
    var consecutiveErrors = 0;
    var lastRequestTime = 0;
    var pageSizeOptions = (typeof PAGE_SIZE_OPTIONS !== 'undefined' && Array.isArray(PAGE_SIZE_OPTIONS) && PAGE_SIZE_OPTIONS.length > 0) ?
        PAGE_SIZE_OPTIONS.slice() : [5, 10, 25, 50];
    var defaultPageSize = (typeof PAGE_SIZE !== 'undefined' && pageSizeOptions.indexOf(PAGE_SIZE) !== -1) ? PAGE_SIZE : pageSizeOptions[0];
    var pageSize = defaultPageSize;
    var currentPage = 1;
    var totalPages = 1;
    var lastRenderedPageSize = pageSize;
    var renderPage = null;
    var isRandomMode = false;
    var randomSeed = null;
    var activePosts = [];
    var searchQuery = '';
    var selectedTag = '';
    var normalizedPosts = [];
    var activeTheme = 'light';
    var activeLayout = 'list';
    function normalizePost(post) {
        if (post && typeof post === 'object') {
            return {
                embedCode: post.embedCode || '',
                content: post.content || '',
                author: post.author || '',
                tags: Array.isArray(post.tags) ? post.tags : [],
                postLink: post.postLink || ''
            };
        }
        var temp = document.createElement('div');
        temp.innerHTML = post;
        var blockquote = temp.querySelector('blockquote');
        var permalink = '';
        var author = '';
        var text = '';
        var tags = [];
        if (blockquote) {
            permalink = blockquote.getAttribute('data-text-post-permalink') || '';
            var link = blockquote.querySelector('a');
            if (link) {
                if (!permalink) permalink = link.getAttribute('href') || '';
                text = link.textContent || '';
            }
            if (permalink) {
                var match = permalink.match(/threads\.net\/@([^\/]+)|threads\.com\/@([^\/]+)/);
                if (match) {
                    author = '@' + (match[1] || match[2]);
                }
            }
            if (text) {
                var hashtagRegex = /#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
                var matchTag;
                while ((matchTag = hashtagRegex.exec(text)) !== null) {
                    tags.push(matchTag[1]);
                }
            }
        }
        return {
            embedCode: post || '',
            content: text || (blockquote ? blockquote.textContent : ''),
            author: author || 'unknown',
            tags: tags,
            postLink: permalink
        };
    }
    function applyFiltersAndSorting() {
        var query = searchQuery.trim().toLowerCase();
        var filtered = normalizedPosts.filter(function (p) {
            var matchSearch = true;
            if (query) {
                var inContent = p.content.toLowerCase().indexOf(query) !== -1;
                var inAuthor = p.author.toLowerCase().indexOf(query) !== -1;
                var inTags = p.tags.some(function (t) { return t.toLowerCase().indexOf(query) !== -1; });
                matchSearch = inContent || inAuthor || inTags;
            }
            var matchTag = true;
            if (selectedTag) {
                matchTag = p.tags.some(function (t) { return t.toLowerCase() === selectedTag.toLowerCase(); });
            }
            return matchSearch && matchTag;
        });
        if (isRandomMode && randomSeed) {
            activePosts = shuffleWithSeed(filtered, randomSeed);
        } else {
            activePosts = filtered;
        }
        totalPages = Math.max(1, Math.ceil(activePosts.length / pageSize));
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
        if (currentPage < 1) {
            currentPage = 1;
        }
    }
    function shuffleWithSeed(array, seed) {
        var m = array.length, t, i;
        var copy = array.slice();
        while (m) {
            seed = (seed * 9301 + 49297) % 233280;
            i = Math.floor((seed / 233280) * m--);
            t = copy[m];
            copy[m] = copy[i];
            copy[i] = t;
        }
        return copy;
    }
    function readUrlState() {
        try {
            var params = new URLSearchParams(window.location.search);
            var p = parseInt(params.get('page'), 10);
            var s = parseInt(params.get('page_size'), 10);
            var r = params.get('random');
            var q = params.get('search');
            var t = params.get('tag');
            if (Number.isFinite(p) && p > 0) currentPage = p;
            pageSize = normalizePageSize(s, defaultPageSize);
            if (r) {
                isRandomMode = true;
                randomSeed = parseInt(r, 10) || Date.now();
            } else {
                isRandomMode = false;
                randomSeed = null;
            }
            searchQuery = q || '';
            selectedTag = t || '';
        } catch (e) { }
    }
    function copyPermalink(postLink) {
        try {
            var u = new URL(window.location.href);
            u.searchParams.set('post', postLink || '');
            u.searchParams.delete('page');
            u.searchParams.delete('page_size');
            u.searchParams.delete('random');
            if (searchQuery) u.searchParams.set('search', searchQuery);
            else u.searchParams.delete('search');
            if (selectedTag) u.searchParams.set('tag', selectedTag);
            else u.searchParams.delete('tag');
            var link = u.toString();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(link).catch(function () {
                    fallbackCopyText(link);
                });
            } else {
                fallbackCopyText(link);
            }
            return link;
        } catch (e) {
            return null;
        }
    }
    function fallbackCopyText(text) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch (e) { }
    }
    function showCopiedTooltip(btn) {
        try {
            var original = btn.innerHTML;
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            btn.classList.add('permalink-btn--copied');
            setTimeout(function () {
                btn.innerHTML = original;
                btn.classList.remove('permalink-btn--copied');
            }, 1800);
        } catch (e) { }
    }
    function updateUrlParams(push) {
        try {
            var u = new URL(window.location.href);
            u.searchParams.set('page', currentPage);
            u.searchParams.set('page_size', pageSize);
            if (isRandomMode && randomSeed) {
                u.searchParams.set('random', randomSeed);
            } else {
                u.searchParams.delete('random');
            }
            if (searchQuery) {
                u.searchParams.set('search', searchQuery);
            } else {
                u.searchParams.delete('search');
            }
            if (selectedTag) {
                u.searchParams.set('tag', selectedTag);
            } else {
                u.searchParams.delete('tag');
            }
            if (push) window.history.pushState({}, '', u);
            else window.history.replaceState({}, '', u);
        } catch (e) { }
    }
    function withJitter(ms) {
        try {
            var jitter = Math.floor(Math.random() * Math.max(0, Math.round(ms * 0.25)));
            return ms + jitter;
        } catch (e) { return ms; }
    }
    function isAllowedPageSize(size) {
        return pageSizeOptions.indexOf(size) !== -1;
    }
    function normalizePageSize(size, fallback) {
        var parsed = parseInt(size, 10);
        if (Number.isFinite(parsed) && isAllowedPageSize(parsed)) return parsed;
        return fallback;
    }
    function syncPageSizeControls() {
        try {
            var selects = document.querySelectorAll('.page-size-select');
            if (!selects || selects.length === 0) return;
            selects.forEach(function (select) {
                if (!select) return;
                var nextValue = String(pageSize);
                if (select.value !== nextValue) {
                    select.value = nextValue;
                }
            });
        } catch (e) { }
    }
    function handlePageSizeChange(nextSize) {
        var normalized = normalizePageSize(nextSize, pageSize);
        if (normalized === pageSize) {
            syncPageSizeControls();
            return;
        }
        try {
            var u = new URL(window.location.href);
            u.searchParams.set('page', 1);
            u.searchParams.set('page_size', normalized);
            window.location.href = u.toString();
        } catch (e) {
            var search = '?page=1&page_size=' + normalized;
            if (isRandomMode && randomSeed) {
                search += '&random=' + randomSeed;
            }
            if (searchQuery) {
                search += '&search=' + encodeURIComponent(searchQuery);
            }
            if (selectedTag) {
                search += '&tag=' + encodeURIComponent(selectedTag);
            }
            window.location.search = search;
        }
    }
    function buildPageSizeControl() {
        var control = document.createElement('label');
        control.className = 'page-size-control';
        var label = document.createElement('span');
        label.className = 'page-size-control__label';
        label.textContent = '每頁顯示';
        control.appendChild(label);
        var select = document.createElement('select');
        select.className = 'page-size-select';
        select.setAttribute('aria-label', '每頁顯示的貼文數');
        pageSizeOptions.forEach(function (optionValue) {
            var option = document.createElement('option');
            option.value = String(optionValue);
            option.textContent = String(optionValue);
            if (optionValue === pageSize) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        select.value = String(pageSize);
        select.addEventListener('change', function () {
            handlePageSizeChange(parseInt(select.value, 10));
        });
        control.appendChild(select);
        return control;
    }
    function ensurePageSizeControls() {
        try {
            var wrappers = document.querySelectorAll('.pagination-wrapper');
            if (!wrappers || wrappers.length === 0) return;
            wrappers.forEach(function (wrapper) {
                if (!wrapper || wrapper.querySelector('.page-size-control')) return;
                var control = buildPageSizeControl();
                wrapper.insertBefore(control, wrapper.firstChild);
            });
            syncPageSizeControls();
        } catch (e) { }
    }
    var stats = {
        total: 0,
        loaded: 0,
        failed: 0,
        rateLimitHits: 0,
        startTime: Date.now(),
        loadTimes: []
    };
    var ALLOWED_THREADS_HOSTS = ['threads.com', 'www.threads.com'];
    function isHostAllowed(url, allowedHosts) {
        try {
            var parsed = new URL(url, window.location.href);
            var host = parsed.hostname.toLowerCase();
            for (var i = 0; i < allowedHosts.length; i++) {
                var allowed = allowedHosts[i].toLowerCase();
                if (host === allowed || host === '' + allowed || host.endsWith('.' + allowed)) {
                    return true;
                }
            }
        } catch (e) {
            return false;
        }
        return false;
    }
    function logStats() {
        if (stats.total === 0) return;
        var avgLoadTime = stats.loadTimes.length > 0 ?
            (stats.loadTimes.reduce(function (sum, t) { return sum + t; }, 0) / stats.loadTimes.length).toFixed(2) : '0';
        console.log('[統計] Threads 載入統計:', {
            總數: stats.total,
            已載入: stats.loaded,
            失敗: stats.failed,
            速率限制次數: stats.rateLimitHits,
            成功率: stats.total > 0 ? ((stats.loaded / stats.total) * 100).toFixed(1) + '%' : '0%',
            耗時: ((Date.now() - stats.startTime) / 1000).toFixed(1) + '秒',
            當前延遲: (currentDelay / 1000).toFixed(1) + '秒',
            平均載入時間: avgLoadTime + '秒'
        });
    }
    function handleRateLimit(source, overrideBackoffMs) {
        if (rateLimitDetected) return;
        rateLimitDetected = true;
        paused = true;
        processing = false;
        inFlight = 0;
        stats.rateLimitHits++;
        consecutiveErrors++;
        try {
            var activeIfames = document.querySelectorAll('.post-item.current-loading iframe');
            activeIfames.forEach(function (f) {
                try { f.remove(); } catch (e) { }
            });
        } catch (e) { }
        var backoffTime = typeof overrideBackoffMs === 'number' && overrideBackoffMs > 0 ?
            Math.min(overrideBackoffMs, 300000) :
            Math.min(RATE_LIMIT_BACKOFF * Math.pow(1.5, consecutiveErrors - 1), 300000);
        currentDelay = Math.min(currentDelay * 2, MAX_DELAY);
        console.warn('[警告] 偵測到速率限制 (' + source + '),暫停載入 ' + (backoffTime / 1000) + ' 秒');
        showRateLimitBanner(backoffTime);
        console.warn('[警告] 調整延遲時間為 ' + (currentDelay / 1000) + ' 秒');
        setTimeout(function () {
            requestAnimationFrame(function () {
                rateLimitDetected = false;
                paused = false;
                if (consecutiveErrors > 3) {
                    currentDelay = MAX_DELAY;
                } else {
                    currentDelay = Math.max(LOAD_DELAY, currentDelay / 1.5);
                }
                console.log('[恢復] 速率限制解除,恢復載入,延遲: ' + (currentDelay / 1000) + ' 秒');
                pumpEmbeds();
                hideRateLimitBanner();
            });
        }, backoffTime);
    }
    window.addEventListener('threads:rate-limit', function (e) {
        handleRateLimit('console');
    });
    window.addEventListener('error', function (e) {
        if (e.message && (e.message.includes('429') || e.message.includes('rate limit') || e.message.includes('Too Many Requests'))) {
            handleRateLimit('error-event');
        }
        if (e.target && e.target.tagName === 'SCRIPT' && e.target.src && isHostAllowed(e.target.src, ALLOWED_THREADS_HOSTS)) {
            handleRateLimit('script-error');
        }
    }, true);
    window.addEventListener('unhandledrejection', function (e) {
        if (e.reason && e.reason.message && (e.reason.message.includes('429') || e.reason.message.includes('rate limit'))) {
            handleRateLimit('promise-rejection');
        }
    });
    window.addEventListener('threads:xframe-block', function (e) {
        try {
            var msg = (e && e.detail && e.detail.message) ? e.detail.message : '';
            var matches = msg.match(/'(https?:\/\/[^']+)'/);
            var url = matches ? matches[1] : null;
            if (!url) return;
            var iframes = document.querySelectorAll('iframe');
            for (var i = 0; i < iframes.length; i++) {
                var f = iframes[i];
                try {
                    var src = f.getAttribute('src') || f.src || '';
                    if (src && src.indexOf(url) !== -1) {
                        var bq = f.closest('.post-item');
                        if (bq) {
                            var blockquote = bq.querySelector('blockquote.text-post-media');
                            if (blockquote) {
                                markBlockquoteFailed(blockquote, 'xframe-deny', true);
                            }
                        }
                    }
                } catch (err) { }
            }
        } catch (err) { }
    });
    (function () {
        var originalFetch = window.fetch;
        if (originalFetch) {
            window.fetch = function (url, options) {
                return originalFetch.apply(this, arguments)
                    .then(function (response) {
                        if (response.status === 429) {
                            var ra = 0;
                            try {
                                var raf = response.headers.get('retry-after');
                                if (raf) {
                                    var rafInt = parseInt(raf, 10);
                                    if (!isNaN(rafInt)) ra = rafInt * 1000;
                                }
                            } catch (e) { }
                            handleRateLimit('fetch-response', ra || undefined);
                            throw new Error('Rate limited (429)');
                        }
                        if (response.ok) {
                            consecutiveErrors = Math.max(0, consecutiveErrors - 1);
                        }
                        return response;
                    })
                    .catch(function (error) {
                        if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
                            handleRateLimit('fetch-error');
                        }
                        throw error;
                    });
            };
        }
        var originalXHROpen = XMLHttpRequest.prototype.open;
        var originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url) {
            this._url = url;
            return originalXHROpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function () {
            var xhr = this;
            xhr.addEventListener('load', function () {
                if (xhr.status === 429) {
                    var ra = 0;
                    try { var raf = xhr.getResponseHeader('Retry-After'); if (raf) { var rafInt = parseInt(raf, 10); if (!isNaN(rafInt)) ra = rafInt * 1000; } } catch (e) { }
                    handleRateLimit('xhr-response', ra || undefined);
                }
            });
            xhr.addEventListener('error', function () {
                if (xhr._url && isHostAllowed(xhr._url, ALLOWED_THREADS_HOSTS)) {
                    handleRateLimit('xhr-error');
                }
            });
            return originalXHRSend.apply(this, arguments);
        };
    })();
    function markBlockquoteFailed(blockquote, reason, skipRetry) {
        if (!blockquote) return;
        var failureReason = reason || 'unknown';
        try {
            blockquote.dataset.embedFailed = failureReason;
            if (blockquote.dataset.embedLoading) {
                delete blockquote.dataset.embedLoading;
            }
        } catch (e) { }
        try {
            var postItem = blockquote.closest('.post-item');
            if (postItem) {
                postItem.classList.remove('current-loading');
                try {
                    var deadFrames = postItem.querySelectorAll('iframe');
                    deadFrames.forEach(function (fr) {
                        var fh = fr.offsetHeight || fr.clientHeight || 0;
                        if (fh < 50) { try { fr.remove(); } catch (e) { } }
                    });
                } catch (e) { }
            }
        } catch (e) { }
        try {
            if (failureReason === 'xframe-deny' || failureReason === 'iframe-error' || failureReason === 'timeout' || failureReason === 'process-error') {
                var fallbackUrl = blockquote.getAttribute('data-url') || '';
                if (!fallbackUrl) {
                    var fallbackLink = blockquote.querySelector('a[href]');
                    if (fallbackLink) {
                        fallbackUrl = fallbackLink.href || fallbackLink.getAttribute('href') || '';
                    }
                }
                var postItemEl = blockquote.closest('.post-item');
                if (fallbackUrl && postItemEl && !postItemEl.querySelector('.fallback-link')) {
                    var link = document.createElement('a');
                    link.href = fallbackUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.className = 'fallback-link';
                    link.textContent = '在 Threads 查看此貼文 →';
                    postItemEl.appendChild(link);
                }
            }
        } catch (e) { }
    }
    var rateLimitBannerInterval = null;
    function showRateLimitBanner(backoffTime) {
        try {
            var container = document.getElementById('posts-container');
            if (!container) return;
            var banner = document.getElementById('threads-rate-limit-warning');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'threads-rate-limit-warning';
                banner.className = 'threads-rate-limit';
                banner.style.margin = '8px 0';
                container.insertBefore(banner, container.firstChild);
            }
            var end = Date.now() + (backoffTime || RATE_LIMIT_BACKOFF);
            function updateBanner() {
                var remain = Math.max(0, Math.round((end - Date.now()) / 1000));
                banner.textContent = '已偵測到速率限制，暫時停止載入貼文 — 恢復剩餘: ' + remain + ' 秒';
                if (remain <= 0) {
                    clearInterval(rateLimitBannerInterval);
                    rateLimitBannerInterval = null;
                }
            }
            updateBanner();
            if (rateLimitBannerInterval) clearInterval(rateLimitBannerInterval);
            rateLimitBannerInterval = setInterval(updateBanner, 1000);
        } catch (e) { }
    }
    function hideRateLimitBanner() {
        try {
            if (rateLimitBannerInterval) { clearInterval(rateLimitBannerInterval); rateLimitBannerInterval = null; }
            var banner = document.getElementById('threads-rate-limit-warning');
            if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        } catch (e) { }
    }
    function processSingleEmbed() {
        if (paused || rateLimitDetected) {
            return;
        }
        if (inFlight >= EMBED_CONCURRENCY) {
            return;
        }
        if (currentIndex >= allBlockquotes.length) {
            if (inFlight === 0 && stats.total > 0) {
                logStats();
            }
            return;
        }
        var now = Date.now();
        var timeSinceLastRequest = now - lastRequestTime;
        var minDelay = typeof EMBED_STAGGER_DELAY !== 'undefined' ? EMBED_STAGGER_DELAY : 700;
        if (lastRequestTime > 0 && timeSinceLastRequest < minDelay) {
            setTimeout(pumpEmbeds, withJitter(minDelay - timeSinceLastRequest));
            return;
        }
        var blockquote = allBlockquotes[currentIndex];
        if (!blockquote || blockquote.dataset.embedLoaded === 'true' || blockquote.dataset.embedLoading === 'true' || blockquote.dataset.embedFailed) {
            currentIndex++;
            pumpEmbeds();
            return;
        }
        currentIndex++;
        inFlight++;
        lastRequestTime = Date.now();
        stats.total++;
        var startTime = Date.now();
        var attemptFinished = false;
        try {
            if (blockquote.dataset.embedPending) {
                blockquote.classList.add('text-post-media');
                delete blockquote.dataset.embedPending;
            }
        } catch (e) { }
        blockquote.dataset.embedLoading = 'true';
        var postItem = blockquote.closest('.post-item');
        if (postItem) {
            postItem.classList.add('current-loading');
        }
        function cleanupLoadingState() {
            try {
                if (postItem) {
                    postItem.classList.remove('current-loading');
                }
                if (blockquote.dataset.embedLoading) {
                    delete blockquote.dataset.embedLoading;
                }
                if (blockquote.classList && blockquote.classList.contains('text-post-media')) {
                    blockquote.classList.remove('text-post-media');
                }
            } catch (e) { }
        }
        function finishAttempt(success, reason) {
            if (attemptFinished) return;
            attemptFinished = true;
            cleanupLoadingState();
            if (success) {
                blockquote.dataset.embedLoaded = 'true';
                try { delete blockquote.dataset.embedFailed; } catch (e) { }
                stats.loaded++;
                consecutiveErrors = Math.max(0, consecutiveErrors - 1);
                stats.loadTimes.push((Date.now() - startTime) / 1000);
                console.log('[載入] embed 成功 (' + currentIndex + '/' + allBlockquotes.length + ')');
            } else {
                markBlockquoteFailed(blockquote, reason || 'timeout', true);
                stats.failed++;
            }
            inFlight = Math.max(0, inFlight - 1);
            if (!paused && !rateLimitDetected) {
                setTimeout(pumpEmbeds, withJitter(typeof EMBED_STAGGER_DELAY !== 'undefined' ? EMBED_STAGGER_DELAY : 700));
            }
        }
        function triggerEmbed() {
            try {
                if (window.instgrm && window.instgrm.Embeds && typeof window.instgrm.Embeds.process === 'function') {
                    window.instgrm.Embeds.process();
                } else {
                    setTimeout(function () {
                        try {
                            if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
                        } catch (e) { }
                    }, 500);
                }
            } catch (e) {
                console.warn('[錯誤] 呼叫 embed process 失敗:', e);
            }
        }
        try {
            loadIframeWithTimeout(blockquote, typeof IFRAME_TIMEOUT !== 'undefined' ? IFRAME_TIMEOUT : 30000)
                .then(function (success) {
                    finishAttempt(!!success, success ? null : 'timeout');
                });
            if (embedScriptReady) {
                triggerEmbed();
            } else if (!embedScriptLoading) {
                embedScriptLoading = true;
                var script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.threads.com/embed.js';
                script.onload = function () {
                    embedScriptReady = true;
                    triggerEmbed();
                };
                script.onerror = function () {
                    embedScriptLoading = false;
                    try { if (script.parentNode) script.parentNode.removeChild(script); } catch (e) { }
                    console.warn('[錯誤] Threads embed.js 載入失敗');
                    finishAttempt(false, 'process-error');
                };
                document.body.appendChild(script);
            } else {
                setTimeout(triggerEmbed, 600);
            }
        } catch (error) {
            embedScriptLoading = false;
            console.warn('[錯誤] Threads embed 初始化失敗:', error);
            finishAttempt(false, 'process-error');
            return;
        }
    }
    function pumpEmbeds() {
        if (paused || rateLimitDetected) return;
        var before = inFlight;
        processSingleEmbed();
        if (inFlight > before && inFlight < EMBED_CONCURRENCY && currentIndex < allBlockquotes.length) {
            setTimeout(pumpEmbeds, withJitter(typeof EMBED_STAGGER_DELAY !== 'undefined' ? EMBED_STAGGER_DELAY : 700));
        }
    }
    function scheduleIdle(fn) {
        if (window.requestIdleCallback) {
            requestIdleCallback(fn, { timeout: 50 });
        } else if (window.requestAnimationFrame) {
            requestAnimationFrame(fn);
        } else {
            setTimeout(fn, 16);
        }
    }
    var SUCCESS_HEIGHT_THRESHOLD = 200;
    var FACEBOOK_ERROR_HOSTS = ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com', 'static.xx.fbcdn.net'];
    function isIframeLoadSuccessful(iframeNode) {
        try {
            var src = iframeNode.getAttribute('src') || iframeNode.src || '';
            if (!src || /chrome-error:|chromewebdata/i.test(src)) return false;
            try {
                var srcHost = new URL(src).hostname.toLowerCase();
                for (var i = 0; i < FACEBOOK_ERROR_HOSTS.length; i++) {
                    if (srcHost === FACEBOOK_ERROR_HOSTS[i] || srcHost.endsWith('.' + FACEBOOK_ERROR_HOSTS[i])) {
                        console.warn('[iframe] Facebook error domain detected: ' + srcHost);
                        return false;
                    }
                }
            } catch (e) { }
            var h = iframeNode.offsetHeight || iframeNode.clientHeight || 0;
            if (h > 0 && h < SUCCESS_HEIGHT_THRESHOLD) {
                console.warn('[iframe] 高度過低 (' + h + 'px)，視為未成功渲染');
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }
    function waitForIframeHeight(iframeNode, minHeight, timeout) {
        return new Promise(function (resolve) {
            var min = minHeight || SUCCESS_HEIGHT_THRESHOLD;
            var tOut = timeout || 15000;
            var resolved = false;
            var timerId, ro;
            function cleanup() {
                if (timerId) clearTimeout(timerId);
                if (ro) { try { ro.disconnect(); } catch (e) { } }
            }
            function finish(ok) {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(ok);
            }
            var h = iframeNode.offsetHeight || iframeNode.clientHeight || 0;
            if (h >= min) { finish(true); return; }
            timerId = setTimeout(function () { finish(false); }, tOut);
            if (window.ResizeObserver) {
                ro = new ResizeObserver(function () {
                    var h2 = iframeNode.offsetHeight || iframeNode.clientHeight || 0;
                    if (h2 >= min) finish(true);
                });
                ro.observe(iframeNode);
            } else {
                var poll = setInterval(function () {
                    var h3 = iframeNode.offsetHeight || iframeNode.clientHeight || 0;
                    if (h3 >= min) { clearInterval(poll); finish(true); }
                }, 300);
                timerId = setTimeout(function () { clearInterval(poll); finish(false); }, tOut);
            }
        });
    }
    function loadIframeWithTimeout(blockquote, timeout) {
        return new Promise(function (resolve) {
            var timeoutId, observer, earlyTimeoutId;
            var resolved = false;
            function cleanup() {
                if (timeoutId) clearTimeout(timeoutId);
                if (earlyTimeoutId) clearTimeout(earlyTimeoutId);
                if (observer) observer.disconnect();
            }
            function done(success) {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(success);
            }
            timeoutId = setTimeout(function () {
                done(false);
            }, timeout || IFRAME_TIMEOUT);
            try {
                var minTout = (typeof MIN_IFRAME_TIMEOUT !== 'undefined') ? MIN_IFRAME_TIMEOUT : Math.min(10000, (timeout || IFRAME_TIMEOUT));
                earlyTimeoutId = setTimeout(function () {
                    try {
                        var parentNode = blockquote.parentNode;
                        if (!parentNode) { return; }
                        if (parentNode.querySelector('iframe')) return;
                        if (rateLimitDetected || !document.body.contains(blockquote) || blockquote.dataset.embedFailed) {
                            console.warn('[早退] 早期超時或其他條件觸發，暫時放棄等待 iframe (尚未標記為失敗)');
                        } else {
                            console.warn('[早期警告] 尚未發現 iframe，繼續等待直到主超時 (' + (timeout || IFRAME_TIMEOUT) + 'ms)');
                        }
                    } catch (e) { }
                }, minTout);
            } catch (e) { }
            if (!('MutationObserver' in window)) {
                setTimeout(function () { done(true); }, 2000);
                return;
            }
            var parentNode = blockquote.parentNode;
            if (!parentNode) {
                done(false);
                return;
            }
            try {
                if (blockquote.dataset.embedFailed || !document.body.contains(blockquote) || rateLimitDetected) {
                    done(false);
                    return;
                }
            } catch (e) { }
            observer = new MutationObserver(function (mutations) {
                var blockquoteRemoved = false;
                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];
                    if (mutation.removedNodes && mutation.removedNodes.length) {
                        for (var r = 0; r < mutation.removedNodes.length; r++) {
                            var rn = mutation.removedNodes[r];
                            if (rn === blockquote || (rn && rn.contains && rn.contains(blockquote))) {
                                blockquoteRemoved = true;
                            }
                        }
                    }
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        function checkNodeForIframes(n) {
                            try {
                                if (!n) return;
                                if (n.tagName === 'IFRAME') {
                                    node = n;
                                } else if (n.querySelector) {
                                    var nested = n.querySelectorAll('iframe');
                                    if (nested && nested.length) {
                                        node = nested[0];
                                    }
                                }
                            } catch (e) { }
                        }
                        checkNodeForIframes(node);
                        if (node.tagName === 'IFRAME') {
                            console.log('[observer] 偵測到新增 IFRAME，視為 embed 目標');
                            (function (iframeNode) {
                                var handled = false;
                                function markDone(success, reason) {
                                    if (handled) return;
                                    handled = true;
                                    if (!success) {
                                        markBlockquoteFailed(blockquote, reason || 'iframe-error', true);
                                    }
                                    done(success);
                                }
                                iframeNode.addEventListener('error', function () {
                                    console.warn('[iframe] load error: src=' + (iframeNode.src || iframeNode.getAttribute('src')));
                                    try {
                                        var src = iframeNode.getAttribute('src') || iframeNode.src || '';
                                        if (isHostAllowed(src, ALLOWED_THREADS_HOSTS)) {
                                            handleRateLimit('iframe-error');
                                        }
                                    } catch (e) { }
                                    markDone(false, 'iframe-error');
                                }, { once: true });
                                iframeNode.addEventListener('load', function () {
                                    var src = iframeNode.getAttribute('src') || iframeNode.src || '';
                                    if (/chrome-error:|chromewebdata/i.test(src)) {
                                        console.warn('[iframe] chrome error page detected: ' + src);
                                        markDone(false, 'xframe-deny');
                                        return;
                                    }
                                    if (!isIframeLoadSuccessful(iframeNode)) {
                                        var badSrc = iframeNode.getAttribute('src') || iframeNode.src || '';
                                        if (badSrc && !/^about:/.test(badSrc)) {
                                            console.warn('[iframe] load 失敗（src 檢查）: ' + badSrc);
                                            markDone(false, 'iframe-error');
                                            return;
                                        }
                                    }
                                    waitForIframeHeight(iframeNode, SUCCESS_HEIGHT_THRESHOLD, 12000)
                                        .then(function (heightOk) {
                                            if (!heightOk) {
                                                console.warn('[iframe] 高度未達標，視為載入失敗');
                                                markDone(false, 'iframe-error');
                                            } else {
                                                markDone(true);
                                            }
                                        });
                                }, { once: true });
                                setTimeout(function () {
                                    try {
                                        var src2 = iframeNode.getAttribute('src') || iframeNode.src || '';
                                        if (/chrome-error:|chromewebdata/i.test(src2)) {
                                            markDone(false, 'xframe-deny');
                                            return;
                                        }
                                    } catch (e) { }
                                }, 250);
                            })(node);
                        }
                    }
                }
                if (blockquoteRemoved) {
                    setTimeout(function () {
                        try {
                            var parentNode = blockquote.parentNode || document.querySelector('[data-posts-container]') || document.body;
                            if (parentNode) {
                                var found = parentNode.querySelector('iframe');
                                if (found) {
                                    console.log('[observer] 在 blockquote 移除後找到 iframe，視為替換成功');
                                    var src = found.getAttribute('src') || found.src || '';
                                    if (/chrome-error:|chromewebdata/i.test(src)) {
                                        markBlockquoteFailed(blockquote, 'xframe-deny', true);
                                        done(false);
                                        return;
                                    }
                                    var handled = false;
                                    function markDone(success, reason) {
                                        if (handled) return;
                                        handled = true;
                                        if (!success) markBlockquoteFailed(blockquote, reason || 'iframe-error', true);
                                        done(success);
                                    }
                                    found.addEventListener('error', function () {
                                        console.warn('[iframe] load error: src=' + (found.src || found.getAttribute('src')));
                                        try { if (isHostAllowed(found.getAttribute('src') || found.src || '', ALLOWED_THREADS_HOSTS)) handleRateLimit('iframe-error'); } catch (e) { }
                                        markDone(false, 'iframe-error');
                                    }, { once: true });
                                    found.addEventListener('load', function () {
                                        var fsrc = found.getAttribute('src') || found.src || '';
                                        if (/chrome-error:|chromewebdata/i.test(fsrc) || !isIframeLoadSuccessful(found)) {
                                            if (fsrc && !/^about:/.test(fsrc)) {
                                                markDone(false, 'iframe-error');
                                                return;
                                            }
                                        }
                                        waitForIframeHeight(found, SUCCESS_HEIGHT_THRESHOLD, 12000)
                                            .then(function (ok) {
                                                markDone(ok, ok ? null : 'iframe-error');
                                            });
                                    }, { once: true });
                                }
                            }
                        } catch (e) { }
                    }, 200);
                }
            });
            observer.observe(parentNode, {
                childList: true,
                subtree: true
            });
            var existingIframe = parentNode.querySelector('iframe');
            if (existingIframe) {
                try {
                    var src = existingIframe.getAttribute('src') || existingIframe.src || '';
                    if (/chrome-error:|chromewebdata/i.test(src)) {
                        markBlockquoteFailed(blockquote, 'xframe-deny', true);
                        done(false);
                    } else {
                        done(true);
                    }
                } catch (e) {
                    done(true);
                }
            }
        });
    }
    function init() {
        container = document.getElementById('posts-container');
        if (!container) return;
        try {
            if (!Array.isArray(posts)) return;
        } catch (e) { return; }
        var CHUNK_APPEND_SIZE = 20;
        var initialPostTarget = null;
        try {
            var _initParams = new URLSearchParams(window.location.search);
            var _postVal = _initParams.get('post');
            if (_postVal !== null && _postVal !== '') {
                initialPostTarget = _postVal;
            }
        } catch (e) { }
        readUrlState();
        normalizedPosts = posts.map(normalizePost);
        var themeToggleBtn = document.getElementById('theme-toggle');
        var savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            activeTheme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            activeTheme = 'dark';
        }
        function applyTheme(theme) {
            activeTheme = theme;
            if (theme === 'dark') {
                document.documentElement.classList.add('dark-theme');
                document.documentElement.classList.remove('light-theme');
            } else {
                document.documentElement.classList.add('light-theme');
                document.documentElement.classList.remove('dark-theme');
            }
            localStorage.setItem('theme', theme);
        }
        applyTheme(activeTheme);
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', function () {
                applyTheme(activeTheme === 'dark' ? 'light' : 'dark');
            });
        }
        var layoutToggleBtn = document.getElementById('layout-toggle');
        var savedLayout = localStorage.getItem('layout') || 'list';
        function applyLayout(layout) {
            activeLayout = layout;
            var postsContainer = document.getElementById('posts-container');
            if (postsContainer) {
                if (layout === 'grid') {
                    postsContainer.classList.add('grid-mode');
                    document.documentElement.classList.add('layout-grid');
                } else {
                    postsContainer.classList.remove('grid-mode');
                    document.documentElement.classList.remove('layout-grid');
                }
            }
            localStorage.setItem('layout', layout);
        }
        applyLayout(savedLayout);
        if (layoutToggleBtn) {
            layoutToggleBtn.addEventListener('click', function () {
                applyLayout(activeLayout === 'grid' ? 'list' : 'grid');
            });
        }
        var searchInput = document.getElementById('search-input');
        var searchSubmitBtn = document.getElementById('search-submit');
        function executeSearch() {
            if (!searchInput) return;
            var nextQuery = searchInput.value.trim();
            if (searchQuery === nextQuery) return;
            try {
                var u = new URL(window.location.href);
                u.searchParams.set('page', 1);
                if (nextQuery) {
                    u.searchParams.set('search', nextQuery);
                } else {
                    u.searchParams.delete('search');
                }
                window.location.href = u.toString();
            } catch (e) {
                var search = '?page=1&page_size=' + pageSize;
                if (isRandomMode && randomSeed) {
                    search += '&random=' + randomSeed;
                }
                if (nextQuery) {
                    search += '&search=' + encodeURIComponent(nextQuery);
                }
                if (selectedTag) {
                    search += '&tag=' + encodeURIComponent(selectedTag);
                }
                window.location.search = search;
            }
        }
        if (searchInput) {
            searchInput.value = searchQuery;
            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    executeSearch();
                }
            });
            searchInput.addEventListener('input', function () {
                if (searchInput.value === '') {
                    executeSearch();
                }
            });
        }
        if (searchSubmitBtn) {
            searchSubmitBtn.addEventListener('click', executeSearch);
        }
        var tagsExpanded = false;
        function renderTagsContainer() {
            var tagsContainer = document.getElementById('tags-container');
            if (!tagsContainer) return;
            tagsContainer.innerHTML = '';
            var tagCounts = {};
            normalizedPosts.forEach(function (p) {
                p.tags.forEach(function (t) {
                    var normalizedT = t.toLowerCase();
                    tagCounts[normalizedT] = (tagCounts[normalizedT] || 0) + 1;
                });
            });
            var sortedTags = Object.keys(tagCounts).sort(function (a, b) {
                return tagCounts[b] - tagCounts[a];
            });
            var bar = document.getElementById('tags-filter-bar');
            if (sortedTags.length === 0) {
                if (bar) bar.style.display = 'none';
                return;
            } else {
                if (bar) bar.style.display = 'block';
            }
            var limit = 10;
            var isExpanded = tagsExpanded;
            var isSelectedTagInMore = false;
            if (selectedTag) {
                var selectedIndex = sortedTags.findIndex(function (t) {
                    return t.toLowerCase() === selectedTag.toLowerCase();
                });
                if (selectedIndex >= limit) {
                    isSelectedTagInMore = true;
                }
            }
            var allPill = document.createElement('button');
            allPill.className = 'tag-pill' + (!selectedTag ? ' active' : '');
            allPill.textContent = '全部貼文';
            allPill.addEventListener('click', function () {
                if (!selectedTag) return;
                try {
                    var u = new URL(window.location.href);
                    u.searchParams.set('page', 1);
                    u.searchParams.delete('tag');
                    window.location.href = u.toString();
                } catch (e) {
                    var search = '?page=1&page_size=' + pageSize;
                    if (isRandomMode && randomSeed) search += '&random=' + randomSeed;
                    if (searchQuery) search += '&search=' + encodeURIComponent(searchQuery);
                    window.location.search = search;
                }
            });
            tagsContainer.appendChild(allPill);
            sortedTags.forEach(function (tag, index) {
                var originalTag = tag;
                for (var i = 0; i < normalizedPosts.length; i++) {
                    var found = normalizedPosts[i].tags.find(function (t) { return t.toLowerCase() === tag; });
                    if (found) {
                        originalTag = found;
                        break;
                    }
                }
                var pill = document.createElement('button');
                var isActive = selectedTag && selectedTag.toLowerCase() === tag;
                pill.className = 'tag-pill' + (isActive ? ' active' : '');
                pill.textContent = '#' + originalTag + ' (' + tagCounts[tag] + ')';
                pill.dataset.tag = tag;
                pill.addEventListener('click', function () {
                    var nextTag = isActive ? '' : originalTag;
                    try {
                        var u = new URL(window.location.href);
                        u.searchParams.set('page', 1);
                        if (nextTag) {
                            u.searchParams.set('tag', nextTag);
                        } else {
                            u.searchParams.delete('tag');
                        }
                        window.location.href = u.toString();
                    } catch (e) {
                        var search = '?page=1&page_size=' + pageSize;
                        if (isRandomMode && randomSeed) search += '&random=' + randomSeed;
                        if (searchQuery) search += '&search=' + encodeURIComponent(searchQuery);
                        if (nextTag) search += '&tag=' + encodeURIComponent(nextTag);
                        window.location.search = search;
                    }
                });
                if (index >= limit && !isExpanded && !isActive) {
                    pill.style.display = 'none';
                    pill.classList.add('tag-pill--hidden');
                }
                tagsContainer.appendChild(pill);
            });
            var totalShown = limit + (isSelectedTagInMore && !isExpanded ? 1 : 0);
            if (sortedTags.length > totalShown || isExpanded) {
                var toggleBtn = document.createElement('button');
                toggleBtn.className = 'tag-pill tag-pill--toggle';
                if (isExpanded) {
                    toggleBtn.innerHTML = '收起 <span style="font-size: 0.72rem; margin-left: 2px;">▲</span>';
                    toggleBtn.addEventListener('click', function () {
                        tagsExpanded = false;
                        renderTagsContainer();
                    });
                } else {
                    var remainingCount = sortedTags.length - totalShown;
                    toggleBtn.innerHTML = '更多 (' + remainingCount + ') <span style="font-size: 0.72rem; margin-left: 2px;">▼</span>';
                    toggleBtn.addEventListener('click', function () {
                        tagsExpanded = true;
                        renderTagsContainer();
                    });
                }
                tagsContainer.appendChild(toggleBtn);
            }
        }
        renderTagsContainer();
        applyFiltersAndSorting();
        function appendPostsInChunks(postsToAppend, done) {
            if (typeof postsToAppend === 'function') { done = postsToAppend; postsToAppend = activePosts; }
            if (!postsToAppend || postsToAppend.length === 0) return done();
            var idx = 0;
            var batchSize = CHUNK_APPEND_SIZE;
            function step(deadline) {
                var frag = document.createDocumentFragment();
                var start = performance.now();
                var count = 0;
                while (idx < postsToAppend.length && count < batchSize) {
                    if (deadline && typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() < 8) break;
                    var item = document.createElement('div');
                    item.className = 'post-item';
                    var postObj = postsToAppend[idx++];
                    var globalIdx = (currentPage - 1) * pageSize + (idx - 1);
                    var embedCode = typeof postObj === 'string' ? postObj : postObj.embedCode;
                    var embedWithTheme = embedCode;
                    var targetTheme = activeTheme === 'dark' ? 'dark' : 'light';
                    if (embedWithTheme.indexOf('data-theme=') !== -1) {
                        embedWithTheme = embedWithTheme.replace(/data-theme="[^"]*"/, 'data-theme="' + targetTheme + '"');
                    } else {
                        embedWithTheme = embedWithTheme.replace('<blockquote ', '<blockquote data-theme="' + targetTheme + '" ');
                    }
                    item.innerHTML = embedWithTheme;
                    (function (capturedPostLink, capturedGlobalIdx, capturedItem) {
                        var shareBtn = document.createElement('button');
                        shareBtn.className = 'permalink-btn';
                        shareBtn.title = '複製此貼文連結';
                        shareBtn.setAttribute('aria-label', '複製此貼文的永久連結');
                        shareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>';
                        shareBtn.addEventListener('click', function (e) {
                            e.stopPropagation();
                            copyPermalink(capturedPostLink || String(capturedGlobalIdx));
                            showCopiedTooltip(shareBtn);
                        });
                        capturedItem.appendChild(shareBtn);
                    })(postObj.postLink || '', globalIdx, item);
                    frag.appendChild(item);
                    count++;
                }
                container.appendChild(frag);
                var elapsed = performance.now() - start;
                if (elapsed > 16 && batchSize > 5) {
                    batchSize = Math.max(5, Math.floor(batchSize * 0.75));
                }
                if (idx < postsToAppend.length) {
                    scheduleIdle(step);
                } else {
                    done();
                }
            }
            scheduleIdle(step);
        }
        ensurePageSizeControls();
        ensureRandomControls();
        totalPages = Math.max(1, Math.ceil(activePosts.length / pageSize));
        function getPagePosts(page) {
            var p = Math.max(1, Math.min(totalPages, page));
            var start = (p - 1) * pageSize;
            var end = Math.min(start + pageSize, activePosts.length);
            return activePosts.slice(start, end);
        }
        function clearPageState() {
            processing = false;
            inFlight = 0;
            paused = false;
            rateLimitDetected = false;
            consecutiveErrors = 0;
            lastRequestTime = 0;
            loadedCount = 0;
            stats = { total: 0, loaded: 0, failed: 0, rateLimitHits: 0, startTime: Date.now(), loadTimes: [] };
            try { hideRateLimitBanner(); } catch (e) { }
        }
        function renderEmptyState(target) {
            if (!target) return;
            var emptyState = document.createElement('section');
            emptyState.className = 'empty-state';
            emptyState.setAttribute('role', 'status');
            emptyState.innerHTML =
                '<p class="empty-state__eyebrow">目前沒有內容</p>' +
                '<h2>Threads貼文尚未載入</h2>' +
                '<p>當貼文資料恢復後，這裡會自動轉為卡片式閱讀版面，並保留分頁與即時嵌入體驗。</p>' +
                '<div class="empty-state__chips"><span>URL 分頁</span><span>即時嵌入</span><span>響應式版面</span></div>';
            target.appendChild(emptyState);
        }
        function updatePaginationControls() {
            var paginationEls = document.querySelectorAll('.pagination');
            if (!paginationEls || paginationEls.length === 0) return;
            syncPageSizeControls();
            paginationEls.forEach(function (el) { el.innerHTML = ''; });
            var totalItems = Array.isArray(activePosts) ? activePosts.length : 0;
            if (totalItems === 0) {
                paginationEls.forEach(function (paginationEl) {
                    var emptyLabel = document.createElement('span');
                    emptyLabel.className = 'pagination-empty';
                    emptyLabel.textContent = '目前沒有可瀏覽的貼文';
                    paginationEl.appendChild(emptyLabel);
                });
                try {
                    var emptyPageInfoEls = document.querySelectorAll('.page-info');
                    if (emptyPageInfoEls && emptyPageInfoEls.length > 0) {
                        emptyPageInfoEls.forEach(function (pi) { pi.textContent = '尚無貼文'; });
                    }
                } catch (e) { }
                return;
            }
            function navigateTo(pageNum, size) {
                try {
                    var u = new URL(window.location.href);
                    u.searchParams.delete('post');
                    u.searchParams.set('page', pageNum);
                    u.searchParams.set('page_size', typeof size !== 'undefined' ? size : pageSize);
                    if (isRandomMode && randomSeed) {
                        u.searchParams.set('random', randomSeed);
                    } else {
                        u.searchParams.delete('random');
                    }
                    if (searchQuery) u.searchParams.set('search', searchQuery);
                    else u.searchParams.delete('search');
                    if (selectedTag) u.searchParams.set('tag', selectedTag);
                    else u.searchParams.delete('tag');
                    window.location.href = u.toString();
                } catch (e) {
                    var search = '?page=' + pageNum + '&page_size=' + (typeof size !== 'undefined' ? size : pageSize);
                    if (isRandomMode && randomSeed) {
                        search += '&random=' + randomSeed;
                    }
                    if (searchQuery) search += '&search=' + encodeURIComponent(searchQuery);
                    if (selectedTag) search += '&tag=' + encodeURIComponent(selectedTag);
                    window.location.search = search;
                }
            }
            function addBtnTo(parentEl, label, page, disabled, active) {
                var btn = document.createElement('button');
                btn.className = 'page-btn' + (active ? ' active' : '');
                if (disabled) btn.setAttribute('disabled', 'disabled');
                btn.textContent = label;
                if (!disabled) {
                    btn.addEventListener('click', function () {
                        if (page === currentPage) return;
                        navigateTo(page, pageSize);
                    });
                }
                parentEl.appendChild(btn);
            }
            paginationEls.forEach(function (paginationEl) {
                addBtnTo(paginationEl, 'Prev', Math.max(1, currentPage - 1), currentPage <= 1, false);
            });
            var maxButtons = 9;
            if (totalPages <= maxButtons) {
                for (var i = 1; i <= totalPages; i++) {
                    paginationEls.forEach(function (paginationEl) { addBtnTo(paginationEl, String(i), i, false, i === currentPage); });
                }
            } else {
                paginationEls.forEach(function (paginationEl) { addBtnTo(paginationEl, '1', 1, false, 1 === currentPage); });
                var left = Math.max(2, currentPage - 2);
                var right = Math.min(totalPages - 1, currentPage + 2);
                paginationEls.forEach(function (paginationEl) { if (left > 2) { var ell = document.createElement('span'); ell.className = 'ellipsis'; ell.textContent = '...'; paginationEl.appendChild(ell); } });
                for (var p = left; p <= right; p++) {
                    paginationEls.forEach(function (paginationEl) { addBtnTo(paginationEl, String(p), p, false, p === currentPage); });
                }
                paginationEls.forEach(function (paginationEl) { if (right < totalPages - 1) { var ell2 = document.createElement('span'); ell2.className = 'ellipsis'; ell2.textContent = '...'; paginationEl.appendChild(ell2); } });
                paginationEls.forEach(function (paginationEl) { addBtnTo(paginationEl, String(totalPages), totalPages, false, totalPages === currentPage); });
            }
            paginationEls.forEach(function (paginationEl) { addBtnTo(paginationEl, 'Next', Math.min(totalPages, currentPage + 1), currentPage >= totalPages, false); });
            try {
                var pageInfoEls = document.querySelectorAll('.page-info');
                if (pageInfoEls && pageInfoEls.length > 0) {
                    pageInfoEls.forEach(function (pi) { pi.textContent = '第 ' + currentPage + ' / ' + totalPages + ' 頁 · 共 ' + totalItems + ' 則貼文'; });
                }
            } catch (e) { }
        }
        function buildRandomControl() {
            var control = document.createElement('div');
            control.className = 'random-control';
            var randomBtn = document.createElement('button');
            randomBtn.className = 'random-btn' + (isRandomMode ? ' active' : '');
            randomBtn.setAttribute('aria-label', isRandomMode ? '切換為預設排序' : '切換為隨機排序');
            var btnIcon = document.createElement('span');
            btnIcon.className = 'random-btn__icon';
            btnIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>';
            btnIcon.style.display = 'inline-flex';
            btnIcon.style.alignItems = 'center';
            btnIcon.style.justifyContent = 'center';
            randomBtn.appendChild(btnIcon);
            var btnText = document.createElement('span');
            btnText.className = 'random-btn__text';
            btnText.textContent = isRandomMode ? '隨機排序中' : '隨機排序';
            randomBtn.appendChild(btnText);
            randomBtn.addEventListener('click', function () {
                if (isRandomMode) {
                    try {
                        var u = new URL(window.location.href);
                        u.searchParams.set('page', 1);
                        u.searchParams.delete('random');
                        window.location.href = u.toString();
                    } catch (e) {
                        window.location.search = '?page=1&page_size=' + pageSize;
                    }
                } else {
                    var newSeed = Date.now();
                    try {
                        var u = new URL(window.location.href);
                        u.searchParams.set('page', 1);
                        u.searchParams.set('random', newSeed);
                        window.location.href = u.toString();
                    } catch (e) {
                        window.location.search = '?page=1&page_size=' + pageSize + '&random=' + newSeed;
                    }
                }
            });
            control.appendChild(randomBtn);
            if (isRandomMode) {
                var shuffleBtn = document.createElement('button');
                shuffleBtn.className = 'shuffle-btn';
                shuffleBtn.setAttribute('aria-label', '重新洗牌貼文');
                shuffleBtn.title = '重新洗牌';
                var shuffleIcon = document.createElement('span');
                shuffleIcon.className = 'shuffle-btn__icon';
                shuffleIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';
                shuffleIcon.style.display = 'inline-flex';
                shuffleIcon.style.alignItems = 'center';
                shuffleIcon.style.justifyContent = 'center';
                shuffleBtn.appendChild(shuffleIcon);
                shuffleBtn.addEventListener('click', function () {
                    var newSeed = Date.now();
                    try {
                        var u = new URL(window.location.href);
                        u.searchParams.set('page', 1);
                        u.searchParams.set('random', newSeed);
                        window.location.href = u.toString();
                    } catch (e) {
                        window.location.search = '?page=1&page_size=' + pageSize + '&random=' + newSeed;
                    }
                });
                control.appendChild(shuffleBtn);
            }
            return control;
        }
        function ensureRandomControls() {
            try {
                var wrappers = document.querySelectorAll('.pagination-wrapper');
                if (!wrappers || wrappers.length === 0) return;
                wrappers.forEach(function (wrapper) {
                    if (!wrapper || wrapper.querySelector('.random-control')) return;
                    var control = buildRandomControl();
                    var sizeControl = wrapper.querySelector('.page-size-control');
                    if (sizeControl) {
                        wrapper.insertBefore(control, sizeControl.nextSibling);
                    } else {
                        wrapper.insertBefore(control, wrapper.firstChild);
                    }
                });
            } catch (e) { }
        }
        renderPage = function (page, opts) {
            opts = opts || {};
            var push = true;
            if (typeof opts.push !== 'undefined') push = !!opts.push;
            try { page = Math.max(1, Math.min(totalPages, page)); } catch (e) { page = 1; }
            if (!opts.force && page === currentPage && container.querySelectorAll('.post-item').length > 0 && lastRenderedPageSize === pageSize) return;
            currentPage = page;
            lastRenderedPageSize = pageSize;
            clearPageState();
            container.innerHTML = '';
            if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
            if (!activePosts || activePosts.length === 0) {
                renderEmptyState(container);
                updatePaginationControls();
                try { updateUrlParams(push); } catch (e) { }
                return;
            }
            appendPostsInChunks(getPagePosts(currentPage), function () {
                requestAnimationFrame(function () {
                    var blockquotes = container.querySelectorAll('blockquote.text-post-media');
                    allBlockquotes = Array.prototype.slice.call(blockquotes);
                    allBlockquotes.forEach(function (bq) {
                        try {
                            if (bq.classList.contains('text-post-media')) {
                                bq.classList.remove('text-post-media');
                                bq.dataset.embedPending = 'true';
                            }
                        } catch (e) { }
                    });
                    try { loadedCount = container.querySelectorAll('blockquote[data-embed-loaded="true"]').length || 0; } catch (e) { loadedCount = 0; }
                    totalPages = Math.max(1, Math.ceil(activePosts.length / pageSize));
                    currentIndex = 0;
                    updatePaginationControls();
                    try { updateUrlParams(push); } catch (e) { }
                    if (allBlockquotes.length > 0) {
                        try { currentIndex = 0; } catch (e) { }
                        pumpEmbeds();
                    }
                    ensurePageSizeControls();
                    ensureRandomControls();
                });
            });
        };
        if (initialPostTarget !== null) {
            (function () {
                try {
                    var postVal = initialPostTarget;
                    var targetGlobalIdx = -1;
                    for (var _fi = 0; _fi < activePosts.length; _fi++) {
                        if (activePosts[_fi].postLink && activePosts[_fi].postLink === postVal) {
                            targetGlobalIdx = _fi;
                            break;
                        }
                    }
                    if (targetGlobalIdx === -1) {
                        var parsedAsIdx = parseInt(postVal, 10);
                        var isNumeric = String(parsedAsIdx) === postVal && Number.isFinite(parsedAsIdx) && parsedAsIdx >= 0;
                        if (isNumeric) {
                            targetGlobalIdx = parsedAsIdx;
                        }
                    }
                    if (targetGlobalIdx < 0 || targetGlobalIdx >= activePosts.length) {
                        ensurePageSizeControls();
                        ensureRandomControls();
                        updatePaginationControls();
                        renderPage(currentPage, { push: false });
                        return;
                    }
                    var targetPost = activePosts[targetGlobalIdx];
                    document.documentElement.classList.add('single-post-mode');
                    container.innerHTML = '';
                    var singleItem = document.createElement('div');
                    singleItem.className = 'post-item post-item--single';
                    var embedCode = targetPost.embedCode || '';
                    var targetTheme = activeTheme === 'dark' ? 'dark' : 'light';
                    if (embedCode.indexOf('data-theme=') !== -1) {
                        embedCode = embedCode.replace(/data-theme="[^"]*"/, 'data-theme="' + targetTheme + '"');
                    } else {
                        embedCode = embedCode.replace('<blockquote ', '<blockquote data-theme="' + targetTheme + '" ');
                    }
                    singleItem.innerHTML = embedCode;
                    container.appendChild(singleItem);
                    var backBanner = document.createElement('div');
                    backBanner.className = 'single-post-banner';
                    var backUrl = new URL(window.location.href);
                    backUrl.searchParams.delete('post');
                    backUrl.searchParams.delete('page');
                    backUrl.searchParams.delete('page_size');
                    backBanner.innerHTML =
                        '<a class="single-post-banner__back" href="' + backUrl.toString() + '">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
                        '回到完整列表' +
                        '</a>' +
                        '<span class="single-post-banner__label">單篇預覽</span>';
                    container.insertBefore(backBanner, singleItem);
                    requestAnimationFrame(function () {
                        var bq = container.querySelector('blockquote.text-post-media');
                        if (bq) {
                            allBlockquotes = [bq];
                            currentIndex = 0;
                            pumpEmbeds();
                        }
                    });
                } catch (e) {
                    ensurePageSizeControls();
                    ensureRandomControls();
                    updatePaginationControls();
                    renderPage(currentPage, { push: false });
                }
            })();
        } else {
            ensurePageSizeControls();
            ensureRandomControls();
            updatePaginationControls();
            renderPage(currentPage, { push: false });
        }
        window.addEventListener('popstate', function () {
            try {
                readUrlState();
                applyFiltersAndSorting();
                totalPages = Math.max(1, Math.ceil(activePosts.length / pageSize));
                currentPage = Math.max(1, Math.min(totalPages, currentPage));
                renderPage(currentPage, { push: false });
                renderTagsContainer();
                var searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = searchQuery;
            } catch (e) { }
        });
    }
})();