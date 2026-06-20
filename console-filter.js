(function () {
    // ?debug=1 時完全停用 console 過濾，方便開發者除錯。
    // 仍會在偵測到速率限制時派發 threads:rate-limit 事件，確保退避機制不受影響。
    var debugMode = false;
    try {
        debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
    } catch (e) { }

    var originalError = console.error;
    var originalWarn = console.warn;
    console.error = function () {
        var args = Array.prototype.slice.call(arguments);
        var msg = args.join(' ');
        if (/429|rate.?limit|too.?many.?requests/i.test(msg)) {
            window.dispatchEvent(new CustomEvent('threads:rate-limit', { detail: { message: msg } }));
            if (!debugMode) return;
        }
        if (/Refused to display .* in a frame because it set 'X-Frame-Options' to 'deny'/i.test(msg)) {
            window.dispatchEvent(new CustomEvent('threads:xframe-block', { detail: { message: msg } }));
            if (!debugMode) return;
        }
        if (!debugMode) {
            if (/https?:\/\/[^\/]*cdninstagram\.com.*404/.test(msg)) return;
            if (/favicon\.ico.*404|404.*favicon\.ico/.test(msg)) return;
            if (/Failed to load resource.*threads\.com/i.test(msg)) return;
        }
        originalError.apply(console, arguments);
    };
    console.warn = function () {
        var args = Array.prototype.slice.call(arguments);
        var msg = args.join(' ');
        if (/429|rate.?limit|too.?many.?requests/i.test(msg)) {
            window.dispatchEvent(new CustomEvent('threads:rate-limit', { detail: { message: msg } }));
            if (!debugMode) return;
        }
        originalWarn.apply(console, arguments);
    };
})();
