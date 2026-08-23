# IMPR AI Conference Hub

供國際會議、政府論壇及金融保險研討會使用的雙語活動資訊平台。第一階段建立資料架構與安全 API；第二階段完成公開活動資訊、議程、講者、FAQ、專有名詞及匿名觀眾提問介面。

> 範圍聲明：前兩階段**未呼叫 AI 模型**。未來 AI 功能將使用 OpenAI Responses API，模型名稱由伺服器端環境變數設定；任何 AI 產出均須標示「AI 初稿」並經人工審核。API 金鑰不得放入前端、GitHub Pages、Google Sheets 或公開儲存庫。

## 目錄結構

```text
.
├── .github/workflows/ci-pages.yml   # 格式、Lint、測試、建置與 Pages 部署
├── .env.example                     # 僅有環境變數名稱
├── apps-script/
│   ├── Code.js                      # doGet、doPost、統一 JSON 回應
│   ├── Config.js                    # 測試／正式模式與 Script Properties
│   ├── Repository.js                # Sheets 讀寫、快取、鎖定與稽核
│   ├── Schema.js                    # 11 張工作表的單一資料字典來源
│   ├── Security.js                  # 驗證、長度、公式注入與速率限制
│   ├── Setup.js                     # 建表、範例資料與欄位驗證
│   ├── appsscript.json
│   └── .clasp.json.example
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DATA_DICTIONARY.md
│   ├── DEPLOYMENT.md
│   └── TESTING.md
├── frontend/
│   ├── public/impr-logo.png
│   ├── src/api.ts                  # 公開 API client 與匿名 client ID
│   ├── src/App.tsx
│   ├── src/main.tsx
│   ├── src/styles.css
│   ├── src/types.ts                # Sheets 公開資料型別
│   ├── src/useEventData.ts         # 載入、錯誤與重試狀態
│   └── Vite／TypeScript 設定
├── tests/
│   ├── apps-script.test.mjs
│   └── mock-api-server.mjs         # 僅供本機視覺驗收
├── eslint.config.js
└── package.json
```

## 快速開始

需求：Node.js 22、npm，以及可建立 Google Sheets／Apps Script 專案的 Google Workspace 帳號。

```bash
npm install
npm --prefix frontend install
npm run check
npm run dev
```

前端預設位於 `http://localhost:5173/IMPR-AI-Conference-Hub/`。建立 `.env` 並設定公開 Web App URL 與活動代碼：

```text
VITE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
VITE_EVENT_CODE=IMPR-DEMO
```

未設定時，網站只顯示「活動資料服務設定中」，不會用虛構內容代替正式資料。

## 建立活動試算表

1. 建立一個 Google Apps Script 專案並加入 `apps-script/` 下的 `.js` 檔與 manifest。
2. 在「專案設定 → 指令碼屬性」設定 `APP_MODE=test`。
3. 從編輯器執行：

   ```js
   createEventSpreadsheet("IMPR AI Conference Hub", "IMPR-DEMO", true);
   ```

4. 第一次執行時授權 Sheets 權限。函式會建立 11 張工作表、欄位列、資料驗證與範例資料，並將 ID 寫入 `TEST_SPREADSHEET_ID`。
5. 正式環境另建一份試算表，將 `APP_MODE` 改為 `production`，並設定 `SPREADSHEET_ID`。不要讓測試資料與正式資料共用同一份表。

初始化器遇到同名且已有內容的工作表會中止，不會直接清除既有成果。

完整步驟見 [部署文件](docs/DEPLOYMENT.md)，欄位見 [資料字典](docs/DATA_DICTIONARY.md)，端點見 [API 文件](docs/API.md)。

## 安全邊界

- 匿名 API 只有 `settings`、`agenda`、`speakers`、`faq`、`glossary` 與 `submitQuestion`。
- GET 同時要求 `status=published` 與 `is_public=true`，再套用欄位白名單；工作表多出私人欄位也不會被回傳。
- `Speakers` 結構沒有電話、電子郵件、護照、航班、房號、飲食或病史欄位。
- `Questions` 不收集姓名、電話或電子郵件，內容上限 1,000 字元，並防止試算表公式注入。
- 個人報名資料必須放在另一份權限受限的資料來源；本專案只有去識別化的 `RegistrationStats`。
- Apps Script Script Properties 保存試算表 ID 與模式設定；未來的 `OPENAI_API_KEY` 必須保留在伺服器端祕密管理，不能放進 Script Properties 後又由公開端點讀出。
- 匿名 Apps Script Web App 無法可靠取得來源 IP；目前速率限制是 `client_id` 雜湊＋時間窗的簡易防護。高風險正式活動應在 Cloud Run／API Gateway／WAF 前置層追加不可偽造的限流與濫用防護。
- 管理功能只允許在 Apps Script 編輯器或受限帳號下手動執行，沒有匿名管理端點。

## 設定值

`.env.example` 只列名稱，不含真實值。前端只可使用 `VITE_APPS_SCRIPT_WEB_APP_URL` 與 `VITE_EVENT_CODE`；任何 `VITE_` 變數都會進入公開建置，絕不可放金鑰。

Apps Script Properties：

| 名稱                        | 用途                                           |
| --------------------------- | ---------------------------------------------- |
| `APP_MODE`                  | `test` 或 `production`                         |
| `TEST_SPREADSHEET_ID`       | 測試資料表 ID                                  |
| `SPREADSHEET_ID`            | 正式資料表 ID                                  |
| `CACHE_SECONDS`             | 公開讀取快取秒數，預設 120                     |
| `RATE_LIMIT_WINDOW_SECONDS` | 限流時間窗，預設 60                            |
| `RATE_LIMIT_READS`          | 每 client/action/time window 讀取上限，預設 60 |
| `RATE_LIMIT_WRITES`         | 每 client/action/time window 寫入上限，預設 8  |

## CI 與 GitHub Pages

推送至 `main` 後，GitHub Actions 會依序執行 Prettier、ESLint、TypeScript、Apps Script 與前端 API 測試、Vite production build；全部通過才部署 `frontend/dist` 至 GitHub Pages。Repository Variables 必須設定 `VITE_APPS_SCRIPT_WEB_APP_URL` 與 `VITE_EVENT_CODE`。

若儲存庫名稱不是 `IMPR-AI-Conference-Hub`，請修改 `frontend/vite.config.ts` 的 `base`。

## 回復前一版本

建議以 release tag 標記每次正式版。不要用會清除未提交工作的指令。

```bash
git log --oneline
git revert <需要撤回的提交雜湊>
git push origin main
```

Apps Script 請在 Deploy → Manage deployments 選取前一個已驗證版本；試算表結構或資料則使用 Google Sheets「版本紀錄」還原。程式與資料必須分別回復。

## 尚未開發（刻意留待後續階段）

- OpenAI 問答、翻譯、分類、摘要、語音與用量計費串接
- AI 提示詞版本管理、評測與人工審核介面
- 管理後臺、登入、角色權限與內部審核工作流
- 報名個資系統、付款、電子郵件與行事曆整合
- WAF／API Gateway 等正式環境強式限流
- 監控告警、集中式日誌與災難復原自動化

公司 LOGO 由 IMPR 提供，僅用於本專案品牌呈現。
