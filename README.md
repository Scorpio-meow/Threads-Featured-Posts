# Threads Featured Posts (Threads 精選貼文)

一個精緻、響應式且具備高穩定性的前端網頁應用程式，專門用來展示及分頁瀏覽 Threads 精選貼文。專案內建強大的 rate limiting (速率限制) 處理及 iframe 載入錯誤攔截機制，提供無縫的使用者體驗。

## 核心功能特色 (Key Features)

- **自動限流與退避策略 (Rate Limit Handling)**：全域攔截 HTTP 429 錯誤與 Threads 腳本錯誤，若觸發速率限制會自動呈現提示，暫停載入貼文，並透過動態計算的回避時間 (Backoff) 自動恢復。
- **智慧分頁與效能優化 (Smart Pagination)**：支援 URL 狀態同步的分頁功能 (支援 5, 10, 25, 50 筆等自訂選項)。透過 `requestIdleCallback` 以分塊 (chunks) 方式渲染 DOM，避免阻塞主執行緒 (Main Thread) 導致畫面卡頓。
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
   使用該擴充功能捕捉所需貼文後，於擴充功能管理介面點擊「匯出」，將取得的 HTML 陣列代碼複製，並直接覆寫至本專案的 `config.js` 內的 `posts` 變數：

```javascript
// config.js
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]; // 每頁顯示數選項
const PAGE_SIZE = 10;                     // 預設每頁顯示篇數
const LOAD_DELAY = 1000;                  // 貼文 iframe 載入的間隔延遲 (毫秒)

const posts = [
    // 貼上由 "Threads 程式碼儲存器" 匯出的 HTML 陣列內容
    '<blockquote class="text-post-media" data-url="..."><a href="...">...</a></blockquote>',
    // ... 
];
```

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
npx http-server -p 3000
```

完成後，開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000) 即可瀏覽。

## 系統架構 (Architecture)

### 目錄結構

```text
├── config.js          # 資料與環境設定 (貼文陣列、分頁常數)
├── console-filter.js  # Console 雜訊過濾器
├── favicon.png        # 網站圖示
├── index.html         # 網頁主架構與 DOM 容器
├── styles.css         # UI 樣式、CSS 變數與動畫設計
└── threads-loader.js  # 核心業務邏輯 (分頁、狀態管理、限流處理、動態加載)
```

### 運作生命週期 (Request Lifecycle)

1. 使用者載入 `index.html` 及其靜態資源。
2. 預先執行的 `config.js` 定義所有全域變數及 `posts` 資料。
3. `threads-loader.js` 初始化，讀取 URL 參數決定目前的頁碼與分頁大小。
4. 透過分塊方式 (Chunk appending) 快速將 HTML 內容推入 `#posts-container`，提供即時的骨架屏視覺。
5. 非同步載入官方的 `https://www.threads.com/embed.js`。
6. `threads-loader.js` 循序處理每一則貼文，監聽 iframe 建立狀況，並根據 `LOAD_DELAY` 動態調配載入速度以避免觸發 Threads API 封鎖。

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
**解決方案**：`threads-loader.js` 設有防呆機制，若偵測到 Chrome error 或載入失敗，會將該貼文標示為失敗狀態並優雅降級，不會引發無限等待或破壞版面。

### Console 仍出現錯誤訊息？
**解決方案**：請確認 `console-filter.js` 在 `index.html` 的 `<head>` 區段中是第一個被載入的 `<script>`，確保它能盡早攔截全域的錯誤拋出。
