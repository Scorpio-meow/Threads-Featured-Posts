# Threads Featured Posts (Threads 精選貼文)

一個精緻、響應式且具備高穩定性的純前端網頁應用程式，專門用來展示及分頁瀏覽 Threads 精選貼文。專案內建強大的速率限制 (Rate Limiting) 退避機制、Iframe 載入錯誤攔截與優雅降級機制，並結合 PWA (Progressive Web App) 離線快取，提供無縫且滑順的使用者體驗。

---

## 核心功能特色 (Key Features)

- **搜尋與標籤篩選**：提供即時搜尋輸入框，可依作者帳號、貼文內文或 Hashtag 進行模糊比對。頁面頂部設有熱門標籤篩選列，依標籤頻率降序排列，預設僅顯示前 10 個最熱門標籤，並提供「更多/收起」折疊按鈕（其展開狀態保存於 sessionStorage）。點擊標籤即可快速篩選，所有篩選狀態與 URL 參數即時同步，利於複製分享。
- **手動與系統主題切換**：控制列提供主題切換按鈕，可於深色與淺色模式之間手動切換，偏好記錄至 localStorage。若無記錄則預設讀取系統的媒體查詢 (prefers-color-scheme) 以自動套用最適合的風格。
- **版面配置切換**：提供「瀑布流 (Masonry Grid)」與「單欄列表 (List)」兩種版面供自由切換，偏好同樣以 localStorage 持久化儲存。
- **自動限流與指數退避策略**：全域攔截 HTTP 429 錯誤與 Threads 腳本錯誤，若觸發速率限制會自動呈現倒數計時橫幅，暫停載入後續貼文，並透過動態計算的回避時間 (Backoff) 自動恢復，避免前端請求爆量。
- **效能優化與分塊渲染**：利用 requestIdleCallback (或 requestAnimationFrame) 以分塊 (chunks) 方式渲染 DOM，先展示骨架屏 (Skeleton Screen) 佔位，避免阻塞瀏覽器主執行緒導致畫面卡頓。
- **隨機排序與種子洗牌**：支援一鍵切換隨機與預設排序。在隨機排序模式下，使用基於 URL 參數的隨機排序種子 (Seed) 以確保分頁時的文章順序一致，並提供「重新洗牌」功能以產生新種子重新整理排序。
- **PWA (Progressive Web App) 支援**：支援離線存取功能，利用 Service Worker 快取核心靜態資源（包括 HTML、CSS、JS、設定檔與圖示），提供 Manifest 設定檔，支援在行動裝置與桌面端進行應用程式安裝與獨立視窗運行。
- **高強度 Iframe 監控**：使用 MutationObserver 嚴格監控由官方 embed.js 生成的 iframes，能自動捕捉 chrome-error 錯誤頁面或高度低於安全門檻 (200px) 的異常 iframe（可能由作者隱私設定或刪文引起），並執行優雅降級，顯示「在 Threads 查看此貼文」之備用連結，不干擾其他貼文載入。
- **自動過濾 Console 雜訊**：內建 console-filter.js 攔截器，自動遮蔽 Threads 官方嵌入腳本產生的 postMessage 與跨網域 404 資源警告，維持清潔的開發者日誌環境。

---

## 技術棧 (Tech Stack)

- **前端核心**：純 HTML5, CSS3, Vanilla JavaScript (ES5/ES6 相容)
- **框架依賴**：零外部框架依賴 (Zero dependencies)
- **樣式系統**：現代原生 CSS (包含 CSS 變數設計、玻璃擬物視覺、Shimmer 載入動畫、響應式斷點)
- **離線技術**：Service Worker API (Cache Storage), Web App Manifest
- **部署環境**：支援任何靜態網頁伺服器 (如 GitHub Pages, Vercel, Netlify)

---

## 開始使用 (Getting Started)

本專案為純前端靜態專案，無需編譯或安裝複雜依賴，僅需純前端環境即可運行。

### 1. 下載專案

```bash
git clone https://github.com/Scorpio-meow/Threads-Featured-Posts.git
cd Threads-Featured-Posts
```

### 2. 配置貼文資料

您可以手動將從 Threads 官方取得的 Embed Code 放進 config.js 的 posts 陣列中，但為求效率，建議搭配「Threads 程式碼儲存器」瀏覽器擴充功能使用：

1. **安裝 Threads 程式碼儲存器**：
   這是一個專屬的瀏覽器擴充功能，能幫您在瀏覽 Threads 時一鍵捕捉並管理貼文。
   ```bash
   git clone https://github.com/Scorpio-meow/threads-embedded-code.git
   ```
   * 進入瀏覽器的擴充功能管理頁 (如 chrome://extensions/)，開啟「開發人員模式」。
   * 點擊「載入未封裝項目 (Load unpacked)」，選取下載的 threads-embedded-code 資料夾。

2. **匯出貼文並覆寫設定檔**：
   使用該擴充功能捕捉貼文後，於管理介面點擊「匯出」，複製取得的 HTML 結構化陣列資料，並直接覆寫本專案 config.js 內的 posts 變數。

### 3. 啟動本機開發伺服器

您可以使用任何靜態伺服器來預覽專案：

**使用 Python 啟動：**
```bash
python -m http.server 3000
```

**使用 Node.js / Bun (http-server) 啟動：**
```bash
bunx http-server -p 3000
```

完成後，開啟瀏覽器前往 http://localhost:3000 即可瀏覽。

---

## 系統架構與檔案說明 (Architecture & Files)

### 目錄結構

```text
├── assets/            # 靜態資源 (包含應用程式圖示、Favicon 等)
├── config.js          # 設定檔 (包含貼文資料 posts 陣列、分頁常數、速率限制延遲設定)
├── console-filter.js  # Console 雜訊過濾器 (最先載入以攔截全域錯誤)
├── index.html         # 網頁主架構與 DOM 容器
├── manifest.json      # PWA 應用程式設定檔 (設定安裝名稱、顏色與圖示)
├── styles.css         # UI 樣式表 (CSS 變數、深/淺色主題變數、玻璃擬物與動畫樣式)
├── sw.js              # Service Worker 腳本 (處理離線快取與靜態資源雜湊版本比對)
└── threads-loader.js  # 核心業務邏輯 (分頁、搜尋、標籤篩選、限流處理、Iframe 監控、分塊渲染)
```

---

## 技術實現細節 (Technical Implementation Details)

### 1. 速率限制 (Rate Limiting) 與指數退避機制

Threads 官方嵌入腳本在短時間內處理大量貼文請求時，會對用戶端 IP 實行速率限制（拋出 HTTP 429 Too Many Requests 錯誤）。本專案透過以下設計解決此問題：
- **小批次併發限制**：在載入貼文時，系統不會一次性載入整頁。而是依 config.js 中定義的 BATCH_SIZE (預設為 3，強制限制在 1 至 4 之間) 作為併發上限。每篇貼文的初始化啟動時間以 EMBED_STAGGER_DELAY (預設 700 毫秒) 錯開。
- **全域攔截**：在 threads-loader.js 中複寫了 window.fetch 以及 XMLHttpRequest.prototype.send，並透過監聽 window.onerror 以及 window.onunhandledrejection，捕捉任何含有 429、rate limit 或 Too Many Requests 字樣的錯誤。
- **指數退避 (Exponential Backoff)**：當偵測到速率限制時，系統會：
  1. 立即暫停後續貼文的載入，並清除當前正在載入中的 iframe。
  2. 依據發生錯誤的次數計算退避等待時間：Math.min(RATE_LIMIT_BACKOFF * Math.pow(1.5, 錯誤次數 - 1), 300000 毫秒)。
  3. 在 `#posts-container` 頂部插入一個倒數計時橫幅，動態顯示距離恢復載入的剩餘秒數。
  4. 倒數計時結束後，自動重設為安全加載狀態並調低延遲，恢復貼文載入流程。

### 2. MutationObserver Iframe 異常檢測與優雅降級

由於 Threads 貼文可能因作者隱私設定變更、刪文或跨網域安全性政策 (X-Frame-Options: deny) 導致 iframe 無法正確顯示，專案實作了高強度的防呆機制：
- **DOM 變更監控**：利用 MutationObserver 監聽貼文容器內部節點。當偵測到 embed.js 動態生成 iframe 並將其插入 DOM 或取代 blockquote 時，立即綁定該 iframe 的 load 與 error 事件。
- **異常狀態判定**：
  - 當 iframe load 事件觸發後，若其 src 包含 chrome-error: 或 chromewebdata 網址，或指向已知的 Facebook 錯誤網域 (如 static.xx.fbcdn.net 等)，判定載入失敗。
  - 當 iframe 完成渲染後，利用 ResizeObserver 或定時輪詢監測其高度。若高度小於 SUCCESS_HEIGHT_THRESHOLD (200px)，表示該貼文已被隱私設定阻擋或內容已失效，判定載入失敗。
  - 當 iframe 在 IFRAME_TIMEOUT (預設 20000 毫秒) 內未能達到成功高度，判定為超時失敗。
- **優雅降級**：一旦判定失敗，系統會立即移除該異常 iframe，將對應的 blockquote 標記為 dataset.embedFailed，並在卡片底部動態渲染「在 Threads 查看此貼文 →」文字連結。此機制能確保死貼不會導致頁面載入無限期阻塞或留下空白崩潰畫面。

### 3. requestIdleCallback 高效分塊渲染

為避免一次向 DOM 插入過多貼文結構而阻礙瀏覽器的渲染主執行緒，專案採用了時間分片渲染技術：
- **分塊渲染**：核心函數 appendPostsInChunks 接收當前頁面的貼文資料，並以 CHUNK_APPEND_SIZE (預設 20) 筆為一組進行分塊。
- **空閒排程**：利用 window.requestIdleCallback (不支援的瀏覽器將自動降級使用 requestAnimationFrame 或 setTimeout) 在瀏覽器每幀的空閒時間內向 DOM 推入貼文 HTML，並先展示骨架屏 (Skeleton Screen)。
- **動態縮小分塊**：在分塊渲染過程中，如果檢測到單次 DOM 操作耗時超過 16 毫秒，系統會自動將後續的分塊大小按比例縮減，確保頁面的交互回應速度 (INP) 與滑動順暢度。

### 4. 隨機排序與種子洗牌演算法 (Seeded Shuffle)

當使用者在啟用隨機排序的情況下切換分頁時，若每次隨機結果不同，會導致使用者在不同分頁看到重複的貼文。為了解決此問題，專案引入了確定性隨機洗牌演算法：
- **隨機種子**：在隨機排序模式下，URL 參數會包含一個 random=種子值 (通常為啟用隨機時的時間戳記)。
- **確定性洗牌**：透過 shuffleWithSeed 函式，利用線性同餘產生器 (Linear Congruential Generator, LCG) 的遞迴公式 (seed * 9301 + 49297) % 233280 作為虛擬隨機數來源。在相同的種子值下，無論重新整理頁面或切換至任何分頁，洗牌後的陣列順序均完全一致，保證分頁瀏覽邏輯的正確性。

### 5. PWA 與 Service Worker 快取機制

專案具備完整的漸進式網頁應用程式 (PWA) 特性，支援離線快取與本地快取更新比對：
- **動態快取版本雜湊 (Cache Versioning)**：在 sw.js 安裝階段，會透過 getVersionHash 函式發送 fetch 請求讀取核心檔案 (index.html, styles.css, threads-loader.js, config.js, console-filter.js, manifest.json)，將其文字內容合併後通過 djb2Hash 雜湊演算法計算出一個唯一的 16 進位內容特徵值。搭配全域結構版本號 (SW_SCHEMA_VERSION，預設為 '3') 組合成快取名稱 `${BASE_CACHE_PREFIX}-v${SW_SCHEMA_VERSION}-${hash}`，作為當前的快取快照版本號。這代表開發者只要修改任何一個核心檔案，快取雜湊就會自動改變，觸發 Service Worker 的啟用階段以清理舊版本的快取快照。
- **快取名稱持久化 (Meta Cache Tracking)**：在 sw.js 中，使用獨立的 `threads-featured-posts-meta` 快取儲存當前活躍的快取區域名稱。此機制確保了快取寫入與讀取時的命名一致性，並在更新快取時避免資源讀取衝突。
- **Network-First 快取原則**：對 HTML、CSS 與 JS 等核心檔案採用 Network-First 策略，優先獲取最新網路資源，若離線或網路連線失敗，則自動讀取快取中的備用檔案。
- **快取清理**：在 activate 階段，Service Worker 會自動檢查並清理非當前活躍快照版本的舊快取檔案，避免佔用用戶端多餘的快取空間。

### 6. Console 雜訊過濾器 (console-filter.js)

Threads 官方嵌入檔案 embed.js 在執行期間會拋出大量關於跨網域 postMessage 的安全警告以及 CDN 資源載入警告。
- **靜音機制**：在 index.html 的 head 區段第一順位載入 console-filter.js。透過複寫 window.console.error 與 window.console.warn，使用正規表達式篩選出無關的安全警告或跨網域警告並將其過濾。過濾規則包含：
  - `https?:\/\/[^\/]*cdninstagram\.com.*404`：過濾官方嵌入貼文中丟失的 Instagram CDN 媒體資源所導致的 404 錯誤。
  - `favicon\.ico.*404|404.*favicon\.ico`：過濾網域預設圖示遺失的常見日誌雜訊。
  - `Failed to load resource.*threads\.com`：過濾 Threads 伺服器偶發的網路阻礙。
- **自訂事件轉換**：如果攔截到的錯誤訊息中包含 429 速率限制或 X-Frame-Options deny 阻擋（例如 `Refused to display ... in a frame because it set 'X-Frame-Options' to 'deny'`），過濾器會主動向全域派發自訂事件 `threads:rate-limit` 或 `threads:xframe-block`，交由核心邏輯 threads-loader.js 進行退避與降級處理。
- **除錯模式**：若 URL 查詢參數包含 debug=1，則過濾器會暫停運作，完整顯示所有 Console 的原始警告與日誌。

---

## 系統配置設定 (Configuration Settings)

於 config.js 檔案頂部可以調整以下常數以優化應用程式行為：

| 配置項 | 說明 | 預設值 |
|------|------|------|
| `LOAD_DELAY` | 指數退避機制解除後，或遭遇限流時的基礎加載等待時間 (毫秒) | `4000` |
| `BATCH_SIZE` | 小批次併發載入上限（建議設定在 1 至 4 之間，避免觸發限流） | `3` |
| `EMBED_STAGGER_DELAY` | 同一併發批次內，相鄰兩篇貼文開始載入的時間錯開間隔 (毫秒) | `700` |
| `IFRAME_TIMEOUT` | 單個 iframe 載入的超時等待時間 (毫秒) | `20000` |
| `MIN_IFRAME_TIMEOUT` | 開始檢查 iframe 是否存在的最小等待時間門檻 (毫秒) | `8000` |
| `RATE_LIMIT_BACKOFF` | 遭遇限流 (429) 時的基礎退避時間 (毫秒，後續重試將以此基礎進行指數遞增) | `60000` |
| `MAX_DELAY` | 動態延遲時間的上限 (毫秒) | `60000` |
| `MIN_DELAY_BETWEEN_REQUESTS` | 相鄰兩次嵌入請求之間的最小安全等待間隔 (毫秒) | `2500` |
| `MAX_VISIBLE_QUEUE` | 限制瀏覽器中同時載入/渲染的貼文卡片最大佇列數量，防止記憶體洩漏與效能下降 | `30` |
| `PAGE_SIZE_OPTIONS` | 分頁大小控制列提供的每頁顯示筆數選項陣列 | `[1, 3, 5, 10, 25, 50]` |
| `PAGE_SIZE` | 預設的每頁顯示貼文筆數 | `10` |

---

## URL 查詢參數說明 (URL Query Parameters)

本應用程式支援完整的 URL 狀態同步，可透過以下參數直接存取特定的頁面狀態：

| 參數 | 說明 | 範例 |
|------|------|------|
| `page` | 目標顯示的頁碼。 | `?page=2` |
| `page_size` | 每頁顯示的貼文筆數，必須符合 config.js 中的選項。 | `?page_size=25` |
| `random` | 隨機排序的種子值（隨機時間戳記），帶有此參數時即啟用確定性隨機洗牌。 | `?random=1717750000000` |
| `search` | 搜尋關鍵字，支援對作者帳號、貼文內文與標籤進行模糊匹配。 | `?search=技術` |
| `tag` | 精確標籤篩選，僅顯示包含該標籤的貼文（不包含字元 #）。 | `?tag=程式` |
| `post` | 單篇預覽模式，值為目標貼文的原始連結 (postLink)，在此模式下只會載入並渲染該單篇貼文。 | `?post=https://www.threads.com/@username/post/xxx` |
| `debug` | 設定為 1 時會停用 console-filter.js，完整輸出所有日誌與跨域錯誤。 | `?debug=1` |

---

## 部署建議 (Deployment)

本專案全為前端靜態檔案，完全不需要伺服器端環境或建置流程 (Build Step)：

### 1. 部署至 GitHub Pages
1. 在 GitHub 專案庫中前往 Settings > Pages。
2. Build and deployment 下的 Source 選擇 Deploy from a branch。
3. Branch 選擇 main 與 / (root) 資料夾，點選 Save。
4. 等待部署流程完成即可存取網頁。

### 2. 部署至 Vercel
1. 將專案推送至您的 GitHub 儲存庫。
2. 於 Vercel 點選 Add New > Project 並匯入該儲存庫。
3. Framework Preset 保持預設，無需設定 Build Command。
4. Output Directory 保持專案根目錄，點選 Deploy 即可。

---

## 常見問題與除錯 (Troubleshooting)

### 出現「已偵測到速率限制」警告橫幅？
- **原因**：網頁短時間內發送大量載入貼文請求被 Threads 官方伺服器拒絕 (HTTP 429)。
- **解決方案**：系統已自動開啟指數退避倒數。請靜候橫幅上的倒數時間歸零，系統會自動重啟載入。若頻繁發生，建議於 config.js 中將 LOAD_DELAY 調高，或將 BATCH_SIZE 調小（例如設為 2 或 1）。

### 部分貼文卡片顯示「在 Threads 查看此貼文 →」連結且未呈現內容？
- **原因**：該貼文已被作者刪除、改為私密貼文，或受瀏覽器安全性限制 (X-Frame-Options) 導致無法嵌入 iframe。
- **解決方案**：此為優雅降級的正常現象，該連結允許使用者直接前往官方網站瀏覽。

### 為什麼修改 config.js 的貼文後，重新整理網頁沒有更新？
- **原因**：Service Worker 已將舊的 config.js 快取在瀏覽器中。
- **解決方案**：
  1. Service Worker 具備內容雜湊偵測，通常在多次重新整理或關閉分頁重開後會自動更新。
  2. 若想立即看到變更，可開啟瀏覽器開發者工具 (F12) > Application > Service Workers，點選 Update 或 Unregister，接著重新整理網頁。

### 搜尋功能無法精確比對？
- **原因**：如果 posts 資料陣列中使用了純 HTML 字串（格式一），系統需要動態解析 DOM 取得文字。如果 HTML 標籤結構與預期不符，解析可能不完整。
- **解決方案**：強烈建議將 config.js 中的 posts 使用結構化物件格式（格式二），明確宣告 content、author、tags、postLink 欄位，以獲得最佳的搜尋與標籤匹配效能。