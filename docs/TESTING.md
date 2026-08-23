# 測試與驗收紀錄

## 自動化測試範圍

`npm run check` 依序執行：

1. Prettier 格式檢查。
2. ESLint（前端、Apps Script 與測試）。
3. React／TypeScript 型別檢查。
4. Node test runner 內的 Apps Script 模擬整合測試。
5. Vitest 前端 API 契約測試。
6. Vite production build。

Apps Script 測試涵蓋：

- 11 張表都有 ID、建立／更新時間、狀態、是否公開與等長範例資料。
- 公開 Speakers 只回傳 `is_public=true`、`status=published` 的資料。
- 即使試算表被額外加入 `private_email`，API 白名單也不會回傳。
- Questions 可成功新增，公式開頭會被中和，且 `is_public=false`。
- 成功提交會建立不含提問全文的 AuditLog。
- 無效 JSON 使用統一錯誤 envelope。
- 提問文字上限 1,000 字元。
- Sheets 日期與時間會依 schema 正規化為 `YYYY-MM-DD` 與 `HH:mm`。

前端 API 測試涵蓋：

- 五種公開資料並行載入，附帶 `event_code` 與匿名 `client_id`。
- 議程依 `sort_order` 排序。
- 提問以 `text/plain` 傳送，只含匿名提問契約欄位。
- API 錯誤碼與 `request_id` 可供介面顯示及除錯。
- 瀏覽器識別碼不使用姓名、Email 或其他個資。

## Google 實機驗收清單

CI 無法取代 Google Apps Script 實際授權與部署，部署者需完成：

- [ ] `createEventSpreadsheet` 能建立 11 張工作表。
- [ ] 新增一筆 `published`、`is_public=true` 議程後，GET agenda 可讀取。
- [ ] 新增一筆公開講者後，GET speakers 可讀取且無私人欄位。
- [ ] `is_public=false` 與非 `published` 資料不出現在任何公開回應。
- [ ] POST submitQuestion 後 Questions 與 AuditLog 各新增一列。
- [ ] 連續超過設定上限時收到 `RATE_LIMITED`。
- [ ] 測試 deployment 回傳 `meta.mode=test`，正式 deployment 回傳 `production`。
- [ ] GitHub Pages 可載入活動設定、議程、講者、FAQ 與專有名詞。
- [ ] 繁中／英文切換後顯示對應欄位，缺翻譯時才使用另一語言內容。
- [ ] 桌機與 375px 手機寬度沒有水平溢位。

## 已知限制與風險

- 匿名 `client_id` 可由呼叫端更換，屬簡易限流，不是強式防禦。
- Apps Script ContentService 回應錯誤時仍可能是 HTTP 200；前端必須檢查 envelope。
- Cache 最長有 TTL 的資料延遲。
- 寫入逾時時呼叫端無法確定是否已成功；未來需加入 idempotency key。
- 本地模擬無法驗證 Google 帳號授權、Apps Script 配額、實際 Web App redirect/CORS 行為，必須完成實機清單。
