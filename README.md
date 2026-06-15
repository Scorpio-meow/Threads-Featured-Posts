# Threads Featured Posts (Threads 精選貼文)

一個精緻、響應式且具備高穩定性的前端網頁應用程式，專門用來展示及分頁瀏覽 Threads 精選貼文。專案內建強大的 rate limiting (速率限制) 處理及 iframe 載入錯誤攔截機制，提供無縫的使用者體驗。

## 核心功能特色 (Key Features)

- **搜尋與標籤篩選 (Search & Tag Filter)**：控制列提供即時搜尋輸入框，可依作者名稱、貼文內文或 Hashtag 進行過濾。頁面頂部設有「熱門標籤篩選列」，預設僅顯示前 10 個最熱門標籤，並提供「更多/收起」按鈕以便展開與折疊其餘標籤（狀態保存於 `sessionStorage`），點擊標籤即可快速切換篩選，所有篩選狀態均同步至 URL 參數以利分享。
- **手動深色/淺色主題 (Manual Dark / Light Mode)**：控制列提供主題切換按鈕，點擊即可在深色與淺色模式之間手動切換，並將偏好記錄至 `localStorage` 以便下次造訪時延續設定。另外，特別優化了深色模式下分頁按鈕與隨機排序按鈕啟動狀態的對比度，提升視覺可讀性。
- **版面配置切換 (Layout Toggle)**：控制列提供版面按鈕，可在「瀑布流 (Masonry Grid)」與「單欄列表 (List)」兩種版面間自由切換，偏好同樣儲存於 `localStorage`。
- **自動限流與退避策略 (Rate Limit Handling)**：全域攔截 HTTP 429 錯誤與 Threads 腳本錯誤，若觸發速率限制會自動呈現提示，暫停載入貼文，並透過動態計算的回避時間 (Backoff) 自動恢復。
- **智慧分頁與效能優化 (Smart Pagination)**：支援 URL 狀態同步的分頁功能 (支援 5, 10, 25, 50 筆等自訂選項)，切換每頁顯示貼文數量時會重新整理（刷新）頁面以確保頁面狀態一致。透過 `requestIdleCallback` 以分塊 (chunks) 方式渲染 DOM，避免阻塞主執行緒 (Main Thread) 導致畫面卡頓。
- **隨機排序與種子洗牌 (Random Sorting & Seeded Shuffle)**：支援一鍵切換隨機排序與預設排序。在隨機排序模式下，使用基於 URL 參數的隨機排序種子 (Seed) 以確保分頁時的文章順序一致，並提供「重新洗牌」功能以重新整理隨機排序順序。
- **PWA (Progressive Web App) 支援**：支援離線存取功能，利用 Service Worker 快取核心靜態資源（包括 HTML、CSS、JS、設定檔與圖示），並提供完整的 Manifest 設定檔，支援應用程式安裝與獨立視窗運行。
- **高強度的 Iframe 監控**：使用 `MutationObserver` 嚴格監控由 `embed.js` 生成的 iframes，能自動捕捉 `X-Frame-Options` 阻擋或瀏覽器錯誤畫面，並執行優雅降級。
- **自動過濾雜訊 (Console Noise Reduction)**：內掛 `console-filter.js`，自動遮蔽 Threads 官方腳本常產生的 `postMessage` 與惱人的跨域警告，維持開發者介面乾淨。
- **現代化版面設計**：使用具質感的玻璃擬物 (Glassmorphism)、漸層背景與 CSS 動畫，具備完整的「骨架屏」(Shimmer/Skeleton) 載入狀態，完美相容各種裝置。

## 技術棧 (Tech Stack)

- **前端核心**：純 HTML5, CSS3, Vanilla JavaScript (ES5/ES6 相容)
- **框架依賴**：無任何外部框架 (Zero dependencies)
- **部署環境**：任何靜態網頁伺服器 (Static File Hosting)

## 開始使用 (Getting Started)

本專案無需編譯或安裝複雜依賴，僅需純前端環境即可運行。

### 1. 下載專案

```bash
git clone https://github.com/Scorpio-meow/Threads-Featured-Posts.git
cd Threads-Featured-Posts
```

### 2. 生成與配置貼文資料

您可以手動將官方取得的 Embed Code 放進 `posts` 陣列中，但為求效率，**強烈建議搭配「[Threads 程式碼儲存器](https://github.com/Scorpio-meow/threads-embedded-code.git)」擴充功能使用**：

1. **安裝 Threads 程式碼儲存器**：
   這是一個專屬的瀏覽器擴充功能，能幫您在瀏覽 Threads 時一鍵捕捉並管理貼文。
   ```bash
   git clone https://github.com/Scorpio-meow/threads-embedded-code.git
   ```
   * 進入瀏覽器的擴充功能管理頁 (如 `chrome://extensions/`)，並開啟「開發人員模式」。
   * 點擊「載入未封裝項目 (Load unpacked)」，選取下載的 `threads-embedded-code` 資料夾完成安裝。

2. **匯出代碼並覆寫設定檔**：
   使用該擴充功能捕捉所需貼文後，於擴充功能管理介面點擊「匯出」，將取得的 HTML 陣列代碼複製，並直接覆寫至本專案的 `config.js` 內的 `posts` 變數。

`config.js` 支援兩種貼文格式：

**格式一：純 HTML Embed Code 字串（舊格式）**

```javascript
// config.js
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]; // 每頁顯示數選項
const PAGE_SIZE = 10;                     // 預設每頁顯示篇數
const LOAD_DELAY = 1000;                  // 貼文 iframe 載入的間隔延遲 (毫秒)

const posts = [
    '<blockquote class="text-post-media" data-url="..."><a href="...">...</a></blockquote>',
    // ...
];
```

**格式二：結構化物件（推薦，支援搜尋與標籤篩選）**

```javascript
// config.js
const posts = [
    {
        embedCode: '<blockquote class="text-post-media" data-url="..."><a href="...">貼文內文 #標籤</a></blockquote>',
        content:   '貼文內文 #標籤',        // 貼文內容（用於搜尋）
        author:    '@username',             // 作者帳號（用於搜尋）
        tags:      ['標籤', 'Hashtag'],     // 標籤陣列（用於標籤篩選列）
        postLink:  'https://www.threads.com/@username/post/xxx'
    },
    // ...
];
```

> 使用結構化格式時，搜尋與標籤篩選功能將以預先解析的欄位進行匹配，效能更佳且準確性更高。

### 3. 啟動本機開發伺服器

你可以使用任何靜態伺服器來預覽專案。例如：

**使用 VS Code Live Server：**
對 `index.html` 按右鍵，選擇 **"Open with Live Server"**。

**使用 Python：**
```bash
python -m http.server 3000
```

**使用 Node.js (http-server)：**
```bash
bunx http-server -p 3000
```

完成後，開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000) 即可瀏覽。

## 系統架構 (Architecture)

### 目錄結構

```text
├── assets/            # 靜態資源 (圖示、Favicon 等)
├── config.js          # 資料與環境設定 (貼文陣列、分頁常數)
├── console-filter.js  # Console 雜訊過濾器
├── index.html         # 網頁主架構與 DOM 容器
├── manifest.json      # PWA 應用程式設定檔
├── styles.css         # UI 樣式、CSS 變數與動畫設計
├── sw.js              # Service Worker 腳本 (處理離線快取與資源管理)
└── threads-loader.js  # 核心業務邏輯 (分頁、搜尋、標籤篩選、主題、版面、限流處理、動態加載)
```

### 支援的 URL 參數

本應用程式支援透過 URL 查詢參數直接控制頁面狀態，方便進行分享或記錄特定瀏覽狀態：

| 參數 | 說明 | 範例 |
|------|------|------|
| `page` | 目前顯示的頁碼 | `?page=2` |
| `page_size` | 每頁顯示的貼文數量，須為 `PAGE_SIZE_OPTIONS` 內的值 | `?page_size=10` |
| `random` | 隨機排序的種子值（通常為時間戳記），存在時開啟隨機排序模式 | `?random=1717750000000` |
| `search` | 搜尋關鍵字，對作者、內文與標籤進行模糊比對 | `?search=AI` |
| `tag` | 精確標籤篩選，與標籤篩選列同步 | `?tag=設計` |

### 運作生命週期 (Request Lifecycle)

1. 使用者載入 `index.html` 及其靜態資源。若是重複造訪，Service Worker 將直接由 Cache Storage 快速載入快取的靜態資源，提供離線存取支援。
2. 預先執行的 `config.js` 定義所有全域變數及 `posts` 資料。
3. `threads-loader.js` 初始化，自 URL 參數讀取目前的頁碼 (`page`)、分頁大小 (`page_size`)、隨機排序 (`random`)、搜尋字串 (`search`) 與標籤篩選 (`tag`)。並從 `localStorage` 還原主題與版面偏好。
4. 將 `posts` 資料正規化（純字串自動解析作者、標籤，結構化物件直接使用），並依當前搜尋與標籤條件篩選。
5. 若啟用隨機排序，將使用種子隨機演算法 (Seeded Shuffle) 對過濾後的貼文陣列進行打亂，確保在相同隨機參數下分頁切換時能維持一致的貼文順序。
6. 透過分塊方式 (Chunk appending) 快速將 HTML 內容推入 `#posts-container`，提供即時的骨架屏視覺，同時渲染熱門標籤篩選列。
7. 非同步載入官方的 `https://www.threads.com/embed.js`。
8. `threads-loader.js` 循序處理每一則貼文，監聽 iframe 建立狀況，並根據 `LOAD_DELAY` 動態調配載入速度以避免觸發 Threads API 封鎖。

## 部署建議 (Deployment)

專案皆為靜態檔案，您可以輕易部署到各種靜態網頁託管服務，完全無需設定 Build Command (建置指令)。

### 使用 GitHub Pages
1. 在 GitHub 專案庫中前往 **Settings** > **Pages**。
2. Source 選擇 `Deploy from a branch`。
3. 選擇 `main` 分支與 `/ (root)` 資料夾並儲存。
4. 靜候片刻，你的專案即可對外上線。

### 使用 Vercel / Netlify
1. 將專案連接至 Vercel 或 Netlify。
2. 不需設定 Build Command，發布目錄設定為專案根目錄 (`/`)。
3. 點選 Deploy 即可完成。

## 常見問題 (Troubleshooting)

### 出現「已偵測到速率限制」警告？
**原因**：當同時請求載入大量 Threads 貼文時，會遭 Threads 官方伺服器 (HTTP 429) 限流。
**解決方案**：腳本內建了指數退避 (Exponential Backoff) 的智慧重試機制，看見此警告時不需重新整理網頁，系統會在倒數計時結束後自動恢復載入。若頻繁發生，建議於 `config.js` 將 `LOAD_DELAY` 調高。

### Iframe 顯示為空白或拒絕連線？
**原因**：部分貼文可能因作者隱私設定或遭到 `X-Frame-Options` 限制，而無法在外部網站呈現。
**解決方案**：`threads-loader.js` 設有防呆機制，若偵測到 Chrome error 或載入失敗，會將該貼文標示為失敗狀態並優雅降級（顯示「在 Threads 查看此貼文 →」連結），不會引發無限等待或破壞版面。

### 搜尋功能無法找到特定貼文內容？
**原因**：若 `posts` 陣列使用純字串格式，`threads-loader.js` 會嘗試解析貼文的 `<a>` 標籤文字作為 `content`，部分貼文結構可能導致內文無法被正確擷取。
**解決方案**：改用結構化物件格式，明確提供 `content`、`author`、`tags` 等欄位，以獲得最佳搜尋精確度。

### Console 仍出現錯誤訊息？
**解決方案**：請確認 `console-filter.js` 在 `index.html` 的 `<head>` 區段中是第一個被載入的 `<script>`，確保它能盡早攔截全域的錯誤拋出。
