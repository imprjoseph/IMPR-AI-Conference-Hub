# 部署與設定

## 1. 建立 Apps Script 專案

可選擇 Apps Script 編輯器手動建立檔案，或使用 clasp：

```bash
npm install --global @google/clasp
clasp login
cd apps-script
cp .clasp.json.example .clasp.json
# 將 .clasp.json 的 scriptId 換成實際專案 ID
clasp push
```

請確認 `appsscript.json` 使用 V8 runtime、時區為 `Asia/Taipei`。`.clasp.json` 已被 Git 忽略。

## 2. 設定測試模式

Apps Script → Project Settings → Script Properties：

```text
APP_MODE=test
CACHE_SECONDS=120
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_READS=60
RATE_LIMIT_WRITES=8
```

不要在 Sheets 儲存任何 API 金鑰。前兩階段沒有 OpenAI 呼叫，不需要設定 `OPENAI_API_KEY`。

## 3. 建立工作表

從 Apps Script 編輯器選取 `createEventSpreadsheet`，以實際參數執行：

```js
createEventSpreadsheet("活動名稱", "EVENT-2026", true);
```

Apps Script 編輯器不能直接在 Run 按鈕傳參數時，可暫時新增管理者 helper：

```js
function setupMyEvent() {
  return createEventSpreadsheet("活動名稱", "EVENT-2026", true);
}
```

完成後刪除 helper。函式會建立新 Spreadsheet 並將 ID 寫入 `TEST_SPREADSHEET_ID`。也可將 Apps Script 綁定到既有空白 Spreadsheet，執行 `initializeActiveSpreadsheet()`。

為避免覆蓋成果，只要偵測到任一同名工作表已有內容，初始化就會中止；請改用全新試算表，不要清除或覆寫原資料。

先保留範例資料完成驗收，再刪除或改為經核准的資料。不要把範例日期、地點、講者視為真實活動資訊。

## 4. 部署 Web App

1. Deploy → New deployment → Web app。
2. Execute as：**Me**（部署管理者）。
3. Who has access：**Anyone**（只因本專案包含公開活動 API 與匿名提問）。
4. Deploy，保存 `/exec` 網址。
5. 以測試模式逐一驗證 API，尤其確認草稿與 `is_public=false` 不會回傳。

匿名部署只暴露 `doGet`／`doPost` 中明確列出的公開 action；初始化與 `writeAuditLog` 不在路由中。不要新增匿名管理 action。

每次程式更新後建立新 version，再更新既有 deployment 指向該版本。不要使用 `/dev` 網址作正式服務。

## 5. 切換正式模式

1. 另建正式 Spreadsheet，移除範例資料並完成人工核准。
2. 在 Script Properties 設定正式表的 `SPREADSHEET_ID`。
3. 將 `APP_MODE` 改為 `production`。
4. 建立新 Apps Script version 並部署。
5. 驗證回應 `meta.mode` 為 `production`。

正式與測試資料必須分開。建議正式 deployment 與測試 deployment 也使用不同 Apps Script 專案，避免操作錯誤。

## 6. GitHub Pages

1. 將 repository 名稱設為 `IMPR-AI-Conference-Hub`；若不同，修改 `frontend/vite.config.ts` 的 `base`。
2. Repository Settings → Pages → Source 選 GitHub Actions。
3. 推送 `main`。`quality` job 全部通過後才會執行 deploy。
4. 在 GitHub Repository Settings → Secrets and variables → Actions → Variables 設定：

   ```text
   VITE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
   VITE_EVENT_CODE=EVENT-2026
   ```

   兩者都會進入公開前端；只能放公開 Web App URL 與非敏感活動代碼，不能放金鑰或試算表 ID。

5. 重新執行 workflow 或推送新提交，確認網站不再顯示「活動資料服務設定中」。

## 回復

- 原始碼：`git revert <commit>` 建立可追蹤的反向提交。
- Apps Script：Manage deployments 選取上一個已驗證 version。
- Sheets：File → Version history 還原，先匯出備份並確認只影響目標試算表。
- GitHub Pages：回復提交通過 CI 後會自動重新部署。
