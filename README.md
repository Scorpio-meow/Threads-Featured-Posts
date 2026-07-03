# Threadfolio

一個精緻、響應式且具備高穩定性的純前端網頁應用程式，專門用來展示及分頁瀏覽 Threads貼文。專案內建強大的速率限制 (Rate Limiting) 退避機制、Iframe 載入錯誤攔截與優雅降級機制，並結合 PWA (Progressive Web App) 離線快取，提供無縫且滑順的使用者體驗。

---

## 核心功能特色 (Key Features)

### 搜尋與標籤篩選

- 提供即時搜尋輸入框搭配搜尋按鈕，可依作者帳號、貼文內文或 Hashtag 進行模糊比對。
- 搜尋框支援 `Enter` 鍵觸發搜尋，清空內容時自動重置結果。
- 頁面頂部設有熱門標籤篩選列，依標籤頻率降序排列，預設僅顯示前 10 個最熱門標籤。每個標籤同時顯示其出現次數 (如 `#程式 (12)`)。標籤列支援水平滾動，並已針對多端瀏覽器優化滾動條隱藏之相容性，以維持介面簡潔。
- 提供「更多/收起」折疊按鈕，展開時顯示完整標籤列表。若當前選中的標籤位於隱藏區域，系統會自動將其顯示出來。
- 「全部貼文」按鈕可一鍵清除標籤篩選，恢復顯示所有貼文。
- 所有篩選狀態（搜尋關鍵字、標籤篩選）與 URL 參數即時同步，利於複製分享。

### 手動與系統主題切換

- 控制列提供主題切換按鈕（太陽/月亮圖示），可於深色與淺色模式之間手動切換。
- 偏好記錄至 `localStorage`，重新開啟頁面時自動套用。
- 若無記錄則預設讀取系統的媒體查詢 (`prefers-color-scheme`) 以自動套用最適合的風格。
- 深色與淺色主題各自擁有完整的 CSS 變數設計系統（色彩、陰影、邊框、背景漸層等），並在嵌入貼文的 `blockquote` 上動態設定 `data-theme` 屬性以同步 Threads 官方嵌入樣式。

### 版面配置切換

- 提供「瀑布流 (Masonry Grid)」與「單欄列表 (List)」兩種版面供自由切換，按鈕圖示根據當前模式動態變更。
- 瀑布流模式使用 CSS `columns` 實現，在寬螢幕下以多欄瀑布流排列，窄螢幕自動降為單欄。
- 偏好以 `localStorage` 持久化儲存，並透過 `layout-grid` CSS class 控制全域樣式切換。

### 自動限流與指數退避策略

- 全域攔截 HTTP 429 錯誤與 Threads 腳本錯誤，若觸發速率限制會自動呈現倒數計時橫幅。
- 暫停載入後續貼文，並透過動態計算的回避時間 (Backoff) 自動恢復，避免前端請求爆量。
- 攔截涵蓋 `window.fetch`、`XMLHttpRequest`、`window.onerror`、`window.onunhandledrejection` 以及自訂事件 `threads:rate-limit`。
- 支援讀取伺服器回應的 `Retry-After` 標頭以精確退避。

### 效能優化與分塊渲染

- 利用 `requestIdleCallback` (或 `requestAnimationFrame`、`setTimeout` 降級) 以分塊 (chunks) 方式渲染 DOM。
- 先展示骨架屏 (Skeleton Screen) 搭配 shimmer 動畫佔位，避免阻塞瀏覽器主執行緒導致畫面卡頓。
- 在分塊渲染過程中，若偵測到單次 DOM 操作耗時超過 16 毫秒，自動將後續分塊大小按比例縮減，確保交互回應速度 (INP)。
- 使用 CSS `contain: layout paint` 進行渲染隔離，減少重排/重繪影響範圍。

### 隨機排序與種子洗牌

- 支援一鍵切換隨機與預設排序，按鈕以視覺化狀態（漸層高亮）標示是否處於隨機模式。
- 在隨機排序模式下，提供「重新洗牌」按鈕以產生新種子重新整理排序（按鈕 hover 時帶有 180 度旋轉動畫）。
- 使用基於 URL 參數的隨機排序種子 (Seed) 以確保分頁時的文章順序一致。

### PWA (Progressive Web App) 支援

- 支援離線存取功能，利用 Service Worker 快取核心靜態資源。
- 提供完整的 `manifest.json` 設定檔，支援在行動裝置與桌面端進行應用程式安裝與獨立視窗運行。
- 多尺寸圖示支援：192x192、512x512 (含 maskable 用途)、Apple Touch Icon。
- 動態快取版本雜湊機制，核心檔案任一變更即自動觸發快取更新。

### 高強度 Iframe 監控

- 使用 `MutationObserver` 嚴格監控由官方 `embed.js` 生成的 iframes。
- 能自動捕捉 `chrome-error` 錯誤頁面、高度低於安全門檻 (200px) 的異常 iframe，以及指向已知 Facebook 錯誤網域的 iframe。
- 以 `ResizeObserver` (或定時輪詢降級) 監測 iframe 實際高度。
- 執行優雅降級，顯示「在 Threads 查看此貼文 →」之備用連結，不干擾其他貼文載入。

### 單篇預覽模式

- 支援透過 URL 參數 `post` 指定單篇貼文連結或索引，進入單篇預覽模式。
- 進入單篇模式時自動隱藏控制列、標籤篩選列與分頁元件，僅呈現該貼文與「回到完整列表」導航連結。
- 結合永久連結按鈕，可在任何貼文卡片上懸停時複製其單篇預覽連結。

### 貼文永久連結 (Permalink)

- 每張貼文卡片右上角提供分享按鈕 (hover 時浮現)。
- 點擊後自動產生該貼文的獨立預覽 URL 並複製到剪貼簿。
- 按鈕提供視覺回饋（綠色勾號動畫）確認已複製，1.8 秒後自動恢復。
- 優先使用 `navigator.clipboard.writeText()`，不支援時自動降級至 `document.execCommand('copy')` 方式。

### 自動過濾 Console 雜訊

- 內建 `console-filter.js` 攔截器，自動遮蔽 Threads 官方嵌入腳本產生的 `postMessage`、跨網域 404 資源警告與 `favicon.ico` 缺失錯誤。
- 攔截到速率限制或 X-Frame-Options 阻擋時，主動派發自訂事件交由核心邏輯處理。
- 支援 `debug=1` URL 參數暫停過濾功能。

### 常見問題與除錯模組

- 頁尾整合「常見問題與除錯」按鈕，點擊後以玻璃擬物化 (Glassmorphism) 的 Modal 對話框流暢淡入展示。
- 採用手風琴式 (Accordion) 排版展示常見問題，點擊可滑順折疊與展開，並自動收合其他已開啟的問題。
- 問題包含說明：貼文顯示「在 Threads 查看此貼文」的原因（如 Threads 帳號未登入、瀏覽器「不要追蹤 Do Not Track」隱私設定之影響等）、速率限制與 PWA 裝置安裝說明。
- 整合一鍵偵錯開關：對話框內附有偵錯模式按鈕，可一鍵切換網址的 `?debug=1` 參數並重新整理，極大便利開發與排查工作。

---

## 技術棧 (Tech Stack)

| 分類 | 技術 |
|------|------|
| **前端核心** | 純 HTML5, CSS3, Vanilla JavaScript (ES5/ES6 相容) |
| **框架依賴** | 零外部框架依賴 (Zero dependencies) |
| **字體系統** | Manrope + Noto Sans TC (Google Fonts，含 preconnect 最佳化) |
| **樣式系統** | 現代原生 CSS (CSS 變數設計系統、玻璃擬物 (Glassmorphism)、Shimmer 載入動畫、CSS Grid/Flexbox 混合佈局、CSS `columns` 瀑布流、`@supports` 漸進增強、`prefers-reduced-motion` 無障礙適配) |
| **離線技術** | Service Worker API (Cache Storage), Web App Manifest |
| **部署環境** | 支援任何靜態網頁伺服器 (如 GitHub Pages, Vercel, Netlify) |

---

## 開始使用 (Getting Started)

本專案為純前端靜態專案，無需編譯或安裝複雜依賴，僅需純前端環境即可運行。

### 1. 下載專案

```bash
git clone https://github.com/Scorpio-meow/Threads-Featured-Posts.git
cd Threads-Featured-Posts
```

### 2. 配置貼文資料

您可以手動將從 Threads 官方取得的 Embed Code 放進 `config.js` 的 `posts` 陣列中，但為求效率，建議搭配「Threads 程式碼儲存器」瀏覽器擴充功能使用：

1. **安裝 Threads 程式碼儲存器**：
   這是一個專屬的瀏覽器擴充功能，能幫您在瀏覽 Threads 時一鍵捕捉並管理貼文。
   ```bash
   git clone https://github.com/Scorpio-meow/threads-embedded-code.git
   ```
   - 進入瀏覽器的擴充功能管理頁 (如 `chrome://extensions/`)，開啟「開發人員模式」。
   - 點擊「載入未封裝項目 (Load unpacked)」，選取下載的 `threads-embedded-code` 資料夾。

2. **匯出貼文並覆寫設定檔**：
   使用該擴充功能捕捉貼文後，於管理介面點擊「匯出」，複製取得的 HTML 結構化陣列資料，並直接覆寫本專案 `config.js` 內的 `posts` 變數。

### 3. 啟動本機開發伺服器

您可以使用任何靜態伺服器來預覽專案：

**使用 Python 啟動：**
```bash
python -m http.server 3000
```

**使用 Bun (http-server) 啟動：**
```bash
bunx http-server -p 3000
```

完成後，開啟瀏覽器前往 `http://localhost:3000` 即可瀏覽。

---

## 系統架構與檔案說明 (Architecture & Files)

### 目錄結構

```text
Threads-Featured-Posts/
├── assets/
│   └── icons/
│       ├── apple-touch-icon.png    # Apple 裝置觸控圖示 (180x180)
│       ├── favicon.ico             # 傳統瀏覽器 Favicon
│       ├── favicon-192x192.png     # PWA 標準圖示 (192x192, any + maskable)
│       └── favicon-512x512.png     # PWA 大尺寸圖示 (512x512, any + maskable)
├── config.js          # 設定檔 (貼文資料 posts 陣列、分頁常數、速率限制延遲設定)
├── console-filter.js  # Console 雜訊過濾器 (最先載入以攔截全域錯誤與自訂事件派發)
├── index.html         # 網頁主架構與 DOM 容器 (含 SEO meta、PWA manifest、Google Fonts preconnect)
├── manifest.json      # PWA 應用程式設定檔 (安裝名稱、顏色、圖示與啟動 URL)
├── styles.css         # UI 樣式表 (CSS 變數設計系統、深/淺色主題、玻璃擬物、瀑布流、動畫、響應式斷點)
├── sw.js              # Service Worker 腳本 (內容雜湊快取版本控制、Network-First 策略、離線降級)
└── threads-loader.js  # 核心業務邏輯 (分頁、搜尋、標籤篩選、限流退避、Iframe 監控、分塊渲染、主題/版面切換、永久連結、單篇預覽)
```

### 資料格式

`config.js` 中的 `posts` 陣列支援兩種格式：

**格式一：純 HTML 字串**

```javascript
const posts = [
    '<blockquote class="text-post-media" data-text-post-permalink="https://...">...</blockquote>',
    // ...
];
```

系統會自動解析 DOM 擷取作者、內文與標籤，但可能因 HTML 結構差異而不完整。

**格式二：結構化物件（推薦）**

```javascript
const posts = [
    {
        embedCode: '<blockquote class="text-post-media" ...>...</blockquote>',
        postLink: 'https://www.threads.com/@username/post/xxx',
        author: 'username',
        content: '貼文內文...',
        tags: ['標籤一', '標籤二']
    },
    // ...
];
```

明確宣告各欄位可獲得最佳的搜尋與標籤匹配效能。此格式由「Threads 程式碼儲存器」擴充功能自動匯出。

---

## 技術實現細節 (Technical Implementation Details)

### 1. 速率限制 (Rate Limiting) 與指數退避機制

Threads 官方嵌入腳本在短時間內處理大量貼文請求時，會對用戶端 IP 實行速率限制（拋出 HTTP 429 Too Many Requests 錯誤）。本專案透過以下設計解決此問題：

- **小批次併發限制**：在載入貼文時，系統不會一次性載入整頁。而是依 `config.js` 中定義的 `BATCH_SIZE` (預設為 3，強制限制在 1 至 4 之間) 作為併發上限。每篇貼文的初始化啟動時間以 `EMBED_STAGGER_DELAY` (預設 700 毫秒) 錯開，並加入隨機抖動 (Jitter) 避免請求同步化。
- **全域攔截**：在 `threads-loader.js` 中複寫了 `window.fetch` 以及 `XMLHttpRequest.prototype.send`，並透過監聽 `window.onerror` 以及 `window.onunhandledrejection`，捕捉任何含有 `429`、`rate limit` 或 `Too Many Requests` 字樣的錯誤。同時監聽 `console-filter.js` 派發的自訂事件 `threads:rate-limit`。
- **Retry-After 標頭解析**：當攔截到 HTTP 429 回應時，系統會嘗試讀取 `Retry-After` 標頭值，以伺服器建議的等待時間作為退避參考，避免盲目等待。
- **指數退避 (Exponential Backoff)**：當偵測到速率限制時，系統會：
  1. 立即暫停後續貼文的載入，並清除當前正在載入中的 iframe。
  2. 依據連續錯誤次數計算退避等待時間：`Math.min(RATE_LIMIT_BACKOFF * Math.pow(1.5, 錯誤次數 - 1), 300000 毫秒)`。
  3. 在 `#posts-container` 頂部插入一個倒數計時橫幅，動態顯示距離恢復載入的剩餘秒數。
  4. 倒數計時結束後，自動重設為安全加載狀態並調低延遲，恢復貼文載入流程。
- **錯誤次數自動衰減**：每次 fetch 成功回應時，連續錯誤計數會逐步遞減，使系統自然回復正常延遲水準。

### 2. MutationObserver Iframe 異常檢測與優雅降級

由於 Threads 貼文可能因作者隱私設定變更或跨網域安全性政策 (`X-Frame-Options: deny`) 導致 iframe 無法正確顯示，專案實作了高強度的防呆機制：

- **DOM 變更監控**：利用 `MutationObserver` 監聽貼文容器內部節點。當偵測到 `embed.js` 動態生成 iframe 並將其插入 DOM 或取代 blockquote 時，立即綁定該 iframe 的 `load` 與 `error` 事件。同時處理 blockquote 被移除後 iframe 替代出現的情境。
- **異常狀態判定**：
  - 當 iframe `load` 事件觸發後，若其 `src` 包含 `chrome-error:` 或 `chromewebdata` 網址，判定載入失敗。
  - 當 iframe 指向已知的 Facebook 錯誤網域（`facebook.com`、`fb.com`、`static.xx.fbcdn.net` 等），判定載入失敗。
  - 當 iframe 完成渲染後，利用 `ResizeObserver`（不支援時降級為定時輪詢）監測其高度。若高度低於 `SUCCESS_HEIGHT_THRESHOLD` (200px)，判定載入失敗。
  - 當 iframe 在 `IFRAME_TIMEOUT` (預設 20000 毫秒) 內未能達到成功高度，判定為超時失敗。
  - 當 `threads:xframe-block` 自訂事件觸發時，從錯誤訊息中提取被阻擋的 URL，精確定位對應 iframe 並標記失敗。
- **早期超時檢查**：在 `MIN_IFRAME_TIMEOUT` (預設 8000 毫秒) 時進行早期檢查，若此時仍未偵測到 iframe 元素，記錄警告以輔助除錯。
- **優雅降級**：一旦判定失敗，系統會立即移除異常 iframe（高度低於 50px 者），將對應的 blockquote 標記為 `dataset.embedFailed`，並在卡片底部動態渲染「在 Threads 查看此貼文 →」文字連結。此機制確保死貼不會導致頁面載入無限期阻塞或留下空白崩潰畫面。

### 3. requestIdleCallback 高效分塊渲染

為避免一次向 DOM 插入過多貼文結構而阻礙瀏覽器的渲染主執行緒，專案採用了時間分片渲染技術：

- **分塊渲染**：核心函數 `appendPostsInChunks` 接收當前頁面的貼文資料，並以 `CHUNK_APPEND_SIZE` (預設 20) 筆為一組進行分塊。
- **空閒排程**：利用 `window.requestIdleCallback` (不支援的瀏覽器將自動降級使用 `requestAnimationFrame` 或 `setTimeout(fn, 16)`) 在瀏覽器每幀的空閒時間內向 DOM 推入貼文 HTML，並先展示骨架屏 (Skeleton Screen)。
- **Deadline-Aware 排程**：在 `requestIdleCallback` 回呼中主動檢查 `deadline.timeRemaining()`，若剩餘時間不足 8 毫秒則中斷當次批次，等待下一幀再繼續。
- **動態縮小分塊**：在分塊渲染過程中，如果使用 `performance.now()` 偵測到單次 DOM 操作耗時超過 16 毫秒，系統會自動將後續的分塊大小按比例縮減至 75%（最低 5 筆），確保頁面的交互回應速度 (INP) 與滑動順暢度。
- **DocumentFragment 批次插入**：使用 `document.createDocumentFragment()` 組裝批次 DOM 節點，減少直接操作 DOM 樹的次數。

### 4. 隨機排序與種子洗牌演算法 (Seeded Shuffle)

當使用者在啟用隨機排序的情況下切換分頁時，若每次隨機結果不同，會導致使用者在不同分頁看到重複的貼文。為了解決此問題，專案引入了確定性隨機洗牌演算法：

- **隨機種子**：在隨機排序模式下，URL 參數會包含一個 `random=種子值` (通常為啟用隨機時的時間戳記)。
- **確定性洗牌**：透過 `shuffleWithSeed` 函式，利用線性同餘產生器 (Linear Congruential Generator, LCG) 的遞迴公式 `(seed * 9301 + 49297) % 233280` 作為虛擬隨機數來源。在相同的種子值下，無論重新整理頁面或切換至任何分頁，洗牌後的陣列順序均完全一致，保證分頁瀏覽邏輯的正確性。
- **Fisher-Yates 洗牌**：結合 Fisher-Yates 演算法，從陣列末端向前逐一交換，確保每個元素被放置到每個位置的機率相等。

### 5. PWA 與 Service Worker 快取機制

專案具備完整的漸進式網頁應用程式 (PWA) 特性，支援離線快取與本地快取更新比對：

- **動態快取版本雜湊 (Cache Versioning)**：在 `sw.js` 安裝階段，會透過 `getVersionHash` 函式對 6 個核心檔案 (`config.js`, `threads-loader.js`, `console-filter.js`, `styles.css`, `index.html`, `manifest.json`) 發送 `fetch` 請求（帶 `cache: 'no-store'`），將其文字內容合併後通過 `djb2Hash` 雜湊演算法計算出一個唯一的 16 進位內容特徵值。搭配全域結構版本號 (`SW_SCHEMA_VERSION`，目前為 `'3'`) 組合成快取名稱 `threads-featured-posts-v3-{hash}`。這代表開發者只要修改任何一個核心檔案，快取雜湊就會自動改變，觸發 Service Worker 的啟用階段以清理舊版本的快取快照。
- **快取名稱持久化 (Meta Cache Tracking)**：使用獨立的 `threads-featured-posts-meta` 快取儲存當前活躍的快取區域名稱。此機制確保了快取寫入與讀取時的命名一致性，並在更新快取時避免資源讀取衝突。
- **Network-First 快取原則**：對 HTML (`accept: text/html`)、CSS 與 JS 等核心檔案（`/\.(?:js|css|json)$/i`）採用 Network-First 策略，優先獲取最新網路資源，若離線或網路連線失敗，則自動讀取快取中的備用檔案。HTML 請求失敗時額外提供 `index.html` 作為 SPA 降級。
- **Cache-First 靜態資源**：對圖示等非核心靜態資源採用 Cache-First 策略，優先讀取快取以加速頁面載入。
- **快取清理**：在 `activate` 階段，Service Worker 會自動檢查並清理所有非當前活躍快照版本且非 meta 快取的舊快取檔案，避免佔用用戶端多餘的快取空間。
- **跨域請求處理**：對非同源的請求（如 Google Fonts CDN、Threads embed.js），採用 Network-Only 策略並在失敗時嘗試快取回退。

### 6. Console 雜訊過濾器 (console-filter.js)

Threads 官方嵌入檔案 `embed.js` 在執行期間會拋出大量關於跨網域 `postMessage` 的安全警告以及 CDN 資源載入警告。

- **靜音機制**：在 `index.html` 的 `<head>` 區段第一順位載入 `console-filter.js`。透過複寫 `window.console.error` 與 `window.console.warn`，使用正規表達式篩選出無關的安全警告或跨網域警告並將其過濾。過濾規則包含：
  - `https?:\/\/[^\/]*cdninstagram\.com.*404`：過濾官方嵌入貼文中丟失的 Instagram CDN 媒體資源所導致的 404 錯誤。
  - `favicon\.ico.*404|404.*favicon\.ico`：過濾網域預設圖示遺失的常見日誌雜訊。
  - `Failed to load resource.*threads\.com`：過濾 Threads 伺服器偶發的網路阻礙。
- **自訂事件轉換**：
  - 若攔截到的錯誤/警告訊息中包含 `429`、`rate limit` 或 `Too Many Requests`，過濾器會主動向全域派發自訂事件 `threads:rate-limit`，交由核心邏輯進行退避處理。**`console.error` 與 `console.warn` 均會觸發此事件。**
  - 若攔截到 `Refused to display ... in a frame because it set 'X-Frame-Options' to 'deny'` 訊息，派發 `threads:xframe-block` 事件，交由核心邏輯精確定位失敗的 iframe 並執行降級。
- **除錯模式**：若 URL 查詢參數包含 `debug=1`，則過濾器會暫停運作，完整顯示所有 Console 的原始警告與日誌。

### 7. 分頁系統

- **智慧省略頁碼**：當總頁數超過 9 頁時，分頁導航會自動使用省略號 (`...`) 縮略中間頁碼，僅顯示首頁、末頁與當前頁碼周圍各 2 頁。
- **雙分頁導航**：頁面頂部與底部各提供一組完整的分頁導航（含 Prev/Next、頁碼按鈕、頁面資訊、每頁筆數選擇器與隨機排序控制），使用者無需滾動至頁面頂部即可切換頁面。
- **每頁筆數控制**：提供下拉選單切換每頁顯示筆數（預設選項：1, 3, 5, 10, 25, 50），切換時自動重設至第一頁。
- **頁面資訊顯示**：即時顯示「第 X / Y 頁 · 共 Z 則貼文」資訊。無貼文時顯示「尚無貼文」。
- **popstate 監聽**：支援瀏覽器前進/後退按鈕，透過 `window.addEventListener('popstate', ...)` 自動同步 URL 參數與頁面狀態。

### 8. 視覺設計系統

- **CSS 變數設計系統**：所有色彩、陰影、圓角、過渡時間皆以 CSS 變數統一管理，深色/淺色主題各自定義完整變數集合。
- **玻璃擬物效果 (Glassmorphism)**：頁面標頭、控制列、分頁面板均採用 `backdrop-filter: blur(18px)` 搭配半透明背景實現磨砂玻璃效果。
- **漸層裝飾**：頁面背景使用多重 `radial-gradient` 疊加，加上 `body::before` 與 `body::after` 偽元素產生模糊光暈效果。每張貼文卡片與頁面標頭頂部均有 Threads 品牌漸層色帶 (`--gradient-threads`)。
- **交錯入場動畫**：貼文卡片使用 `fadeInUp` 動畫，前 5 張卡片各以 50ms 遞增延遲進場。
- **Shimmer 骨架屏**：等待嵌入載入期間顯示 shimmer 閃爍動畫，搭配虛線邊框暗示佔位。
- **微互動**：卡片 hover 上移 4px 並加深陰影、分頁按鈕 hover 上移 2px、搜尋按鈕 active 縮放 95%、洗牌按鈕 hover 旋轉 180 度。
- **`prefers-reduced-motion` 支援**：完全禁用所有動畫與過渡效果，確保前庭運動敏感使用者的無障礙體驗。
- **響應式斷點**：針對 `900px`、`640px`、`576px` 三個斷點分別調整佈局、間距、字型大小與圓角。

---

## 系統配置設定 (Configuration Settings)

於 `config.js` 檔案頂部可以調整以下常數以優化應用程式行為：

| 配置項 | 說明 | 預設值 |
|------|------|------:|
| `LOAD_DELAY` | 指數退避機制解除後，或遭遇限流時的基礎加載等待時間 (毫秒) | `4000` |
| `BATCH_SIZE` | 小批次併發載入上限（強制限制在 1 至 4 之間，避免觸發限流） | `3` |
| `EMBED_STAGGER_DELAY` | 同一併發批次內，相鄰兩篇貼文開始載入的時間錯開間隔 (毫秒) | `700` |
| `IFRAME_TIMEOUT` | 單個 iframe 載入的超時等待時間 (毫秒) | `20000` |
| `MIN_IFRAME_TIMEOUT` | 開始進行早期 iframe 存在性檢查的最小等待時間門檻 (毫秒) | `8000` |
| `RATE_LIMIT_BACKOFF` | 遭遇限流 (429) 時的基礎退避時間 (毫秒，後續重試將以此基礎進行 1.5 倍指數遞增，上限 300 秒) | `60000` |
| `MAX_DELAY` | 動態延遲時間的上限 (毫秒) | `60000` |
| `MIN_DELAY_BETWEEN_REQUESTS` | 相鄰兩次嵌入請求之間的最小安全等待間隔 (毫秒) | `2500` |
| `MAX_VISIBLE_QUEUE` | 限制瀏覽器中同時載入/渲染的貼文卡片最大佇列數量，防止記憶體洩漏與效能下降 | `30` |
| `PAGE_SIZE_OPTIONS` | 分頁大小控制列提供的每頁顯示筆數選項陣列 | `[1, 3, 5, 10, 25, 50]` |
| `PAGE_SIZE` | 預設的每頁顯示貼文筆數（需存在於 `PAGE_SIZE_OPTIONS` 中） | `10` |

---

## URL 查詢參數說明 (URL Query Parameters)

本應用程式支援完整的 URL 狀態同步，可透過以下參數直接存取特定的頁面狀態：

| 參數 | 說明 | 範例 |
|------|------|------|
| `page` | 目標顯示的頁碼。 | `?page=2` |
| `page_size` | 每頁顯示的貼文筆數，必須符合 `config.js` 中的 `PAGE_SIZE_OPTIONS` 選項。 | `?page_size=25` |
| `random` | 隨機排序的種子值（隨機時間戳記），帶有此參數時即啟用確定性隨機洗牌。 | `?random=1717750000000` |
| `search` | 搜尋關鍵字，支援對作者帳號、貼文內文與標籤進行模糊匹配。 | `?search=技術` |
| `tag` | 精確標籤篩選，僅顯示包含該標籤的貼文（不包含字元 `#`）。 | `?tag=程式` |
| `post` | 單篇預覽模式。值可為目標貼文的原始連結 (`postLink`)，或其在 `activePosts` 中的全域索引。在此模式下只會載入並渲染該單篇貼文，並隱藏控制列、標籤與分頁。 | `?post=https://www.threads.com/@username/post/xxx` |
| `debug` | 設定為 `1` 時會停用 `console-filter.js`，完整輸出所有日誌與跨域錯誤。 | `?debug=1` |

---

## 部署建議 (Deployment)

本專案全為前端靜態檔案，完全不需要伺服器端環境或建置流程 (Build Step)：

### 1. 部署至 GitHub Pages
1. 在 GitHub 專案庫中前往 **Settings > Pages**。
2. **Build and deployment** 下的 **Source** 選擇 **Deploy from a branch**。
3. **Branch** 選擇 `main` 與 `/ (root)` 資料夾，點選 **Save**。
4. 等待部署流程完成即可存取網頁。

### 2. 部署至 Vercel
1. 將專案推送至您的 GitHub 儲存庫。
2. 於 Vercel 點選 **Add New > Project** 並匯入該儲存庫。
3. **Framework Preset** 保持預設，無需設定 **Build Command**。
4. **Output Directory** 保持專案根目錄，點選 **Deploy** 即可。

---

## 常見問題與除錯 (Troubleshooting)

### 出現「已偵測到速率限制」警告橫幅？

- **原因**：網頁短時間內發送大量載入貼文請求被 Threads 官方伺服器拒絕 (HTTP 429)。
- **解決方案**：系統已自動開啟指數退避倒數。請靜候橫幅上的倒數時間歸零，系統會自動重啟載入。若頻繁發生，建議於 `config.js` 中將 `LOAD_DELAY` 調高，或將 `BATCH_SIZE` 調小（例如設為 `2` 或 `1`）。

### 部分貼文卡片顯示「在 Threads 查看此貼文 →」連結且未呈現內容？

- **原因**：以下任一情況均可能導致 embed 無法正常渲染：
  - 貼文已被作者改為私密（需登入且為追蹤者才可查看）
  - **瀏覽器目前未登入 Threads**，而 Threads 對部分貼文強制要求登入狀態才能存取
  - **瀏覽器開啟了「不要追蹤 (Do Not Track)」功能**，這會限制官方的第三方嵌入腳本載入
  - 瀏覽器安全性限制（`X-Frame-Options: deny`）或第三方廣告/隱私阻擋擴充功能（如 AdBlock）阻止了 iframe 載入
  - Threads 官方 embed.js 回傳異常高度（低於 200px）或載入逾時（超過 20 秒）
- **解決方案**：
  - **確認登入狀態**：請在同一個瀏覽器中新開分頁前往 [Threads 首頁](https://www.threads.com) 並登入帳號，隨後重新整理本站頁面，以利官方腳本攜帶 Cookie 取得內容。
  - **關閉不要追蹤與防護設定**：請在瀏覽器設定中關閉「不要追蹤 (Do Not Track)」功能，並確認廣告攔截器已將本站加入白名單或暫時停用。
  - **移除私密貼文**：若貼文已設為私密，則無法透過嵌入方式取得內容，建議從 `config.js` 移除該筆資料以維持展示品質。
  - **開啟偵錯模式**：可在本站底部的「常見問題與除錯」中一鍵開啟「偵錯模式」或在 URL 加上 `?debug=1` 參數，並開啟瀏覽器開發者工具（`F12`）的 Console 查看詳細阻擋訊息。


> **注意**：若貼文已被作者**刪除**，Threads 官方 embed 會在卡片內直接顯示「無法顯示串文」提示，此情況不會觸發本系統的優雅降級機制。建議定期從 `config.js` 移除已失效的貼文資料。

> **三星瀏覽器（Samsung Internet）使用者注意**：若已在瀏覽器登入 Threads，但部分 embed 仍顯示「在 Threads 查看此貼文 →」，或 embed 顯示的內容與 Threads 上的實際貼文內容不符，請檢查三星瀏覽器的**智慧反追蹤**設定（路徑：瀏覽器選單 → 設定 → 隱私權 → 智慧反追蹤）。當此功能設為「標準」或「嚴格」時，瀏覽器會封鎖來自 `cdninstagram.com`、`fbcdn.net` 等第三方網域的請求並自動刪除跨站 Cookie，導致 Threads embed.js 無法正確取得登入狀態，進而將部分需要登入才可查看的貼文誤判為未登入狀態並顯示備用連結。建議將智慧反追蹤設定切換為**關**以確保 embed 正常運作。

### 為什麼修改 config.js 的貼文後，重新整理網頁沒有更新？

- **原因**：Service Worker 已將舊的 `config.js` 快取在瀏覽器中。
- **解決方案**：
  1. Service Worker 具備內容雜湊偵測（djb2 雜湊比對 6 個核心檔案），通常在多次重新整理或關閉分頁重開後會自動更新。
  2. 若想立即看到變更，可開啟瀏覽器開發者工具 (`F12`) > **Application** > **Service Workers**，點選 **Update** 或 **Unregister**，接著重新整理網頁。

### 搜尋功能無法精確比對？

- **原因**：如果 `posts` 資料陣列中使用了純 HTML 字串（格式一），系統需要動態建立臨時 DOM 元素解析 HTML 以擷取文字。如果 HTML 標籤結構與預期不符（如 `data-text-post-permalink` 屬性缺失），解析可能不完整。
- **解決方案**：強烈建議將 `config.js` 中的 `posts` 使用結構化物件格式（格式二），明確宣告 `content`、`author`、`tags`、`postLink` 欄位，以獲得最佳的搜尋與標籤匹配效能。

### 瀑布流模式在手機上只有一欄？

- **原因**：瀑布流模式使用 CSS `columns: 340px` 實現，瀏覽器會根據可用寬度自動決定欄數。在螢幕寬度不足 640px 時，CSS 會強制將欄數設為 1 以確保行動裝置的閱讀體驗。
- **解決方案**：此為預期行為。在桌面或平板裝置上即可體驗多欄瀑布流排列。

---

## 無障礙支援 (Accessibility)

- 所有互動元素皆設有 `aria-label` 與 `title` 屬性。
- 語義化 HTML 結構：使用 `<header>`、`<main>`、`<nav>`、`<section>` 等語義標籤。
- `aria-live="polite"` 動態內容區域，確保螢幕閱讀器可即時播報內容更新。
- `aria-busy` 屬性標示載入狀態。
- `role="navigation"` 與 `role="status"` 語義角色定義。
- `prefers-reduced-motion` 媒體查詢完全禁用動畫。
- `prefers-color-scheme` 媒體查詢自動適配系統主題偏好。
- 搜尋輸入框支援 `type="search"` 語義標記。
- `:focus-visible` 聚焦指示器，確保鍵盤導航可見性。

---

## 瀏覽器相容性 (Browser Compatibility)

| 功能 | 降級策略 |
|------|----------|
| `requestIdleCallback` | 自動降級至 `requestAnimationFrame`，再降級至 `setTimeout(fn, 16)` |
| `ResizeObserver` | 自動降級至 `setInterval` 定時輪詢 iframe 高度 |
| `MutationObserver` | 不支援時跳過 iframe 監控，2 秒後直接視為成功 |
| `navigator.clipboard` | 自動降級至 `document.execCommand('copy')` |
| CSS `translate` 屬性 | 透過 `@supports not (translate: 0 -2px)` 降級至 `transform: translateY()` |
| CSS `gap` 屬性 | 透過 `@supports not (gap: 8px)` 降級至 `margin` 間距 |
| `URLSearchParams` | 包裹於 `try/catch` 中，失敗時使用手動字串拼接 |
| CSS `backdrop-filter` | 同時宣告 `-webkit-backdrop-filter` 與 `backdrop-filter` |
| CSS `min()` / `clamp()` | 用於響應式尺寸，不支援時瀏覽器自動忽略 |
| 隱藏滾動條 (Scrollbar Hiding) | 使用 `scrollbar-width: none` 搭配 `::-webkit-scrollbar { display: none; }` 與 `-ms-overflow-style: none`，確保 Chrome、Safari、Firefox 及 IE/Edge 等瀏覽器上皆能隱藏滾動條且無相容性警告。 |
