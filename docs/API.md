# Apps Script 公開 API

Web App 基底網址：`https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

所有端點回傳 HTTP 內容型態 `application/json`，並使用相同 envelope。Apps Script ContentService 不適合精細控制 HTTP status，因此呼叫端必須以 `success` 與 `error.code` 判斷結果。

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-08-22T00:00:00.000Z",
    "mode": "test"
  }
}
```

錯誤格式：

```json
{
  "success": false,
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "event_code 為必填欄位" },
  "meta": { "request_id": "uuid", "timestamp": "...", "mode": "test" }
}
```

## GET 端點

所有 GET 都需要 8–128 字元的 `client_id`。建議前端第一次使用時產生 UUID 並保存在 localStorage；它不是身分驗證，只用於簡易限流。`event_code` 可用英數、底線及連字號，最長 64 字元。

| 動作     | Query                                                | 回傳資料                                                |
| -------- | ---------------------------------------------------- | ------------------------------------------------------- |
| 活動設定 | `action=settings&event_code=IMPR-DEMO&client_id=...` | 已發布的公開設定；`event_code` 可省略以取得所有公開活動 |
| 議程     | `action=agenda&event_code=IMPR-DEMO&client_id=...`   | 指定活動公開議程                                        |
| 講者     | `action=speakers&event_code=IMPR-DEMO&client_id=...` | 指定活動公開講者欄位，不含私人聯絡資料                  |
| FAQ      | `action=faq&event_code=IMPR-DEMO&client_id=...`      | 指定活動公開 FAQ                                        |
| 專有名詞 | `action=glossary&event_code=IMPR-DEMO&client_id=...` | 指定活動公開雙語名詞                                    |

範例：

```text
GET {BASE_URL}?action=agenda&event_code=IMPR-DEMO&client_id=browser_12345678
```

## POST：新增觀眾提問

為避免瀏覽器對 Apps Script 產生不必要的 preflight，相容前端可用 `Content-Type: text/plain;charset=utf-8` 傳送 JSON 字串；伺服器仍會嚴格 `JSON.parse`。

```http
POST {BASE_URL}
Content-Type: text/plain;charset=utf-8

{
  "action": "submitQuestion",
  "event_code": "IMPR-DEMO",
  "session_id": "AGN-DEMO-001",
  "question_text": "請問這項政策的執行時程為何？",
  "language": "zh-Hant",
  "client_id": "browser_12345678"
}
```

| 欄位            | 規則                                        |
| --------------- | ------------------------------------------- |
| `event_code`    | 必填，2–64 字元，英數／底線／連字號         |
| `session_id`    | 選填，最多 128 字元                         |
| `question_text` | 必填，最多 1,000 字元；公式開頭會加上單引號 |
| `language`      | `zh-Hant` 或 `en`                           |
| `client_id`     | 必填，8–128 字元，英數／底線／連字號        |

成功只回傳 `question_id` 與 `moderation_status=pending`，不回傳原文。每次成功寫入同時產生不含提問內容的 AuditLog。

伺服器會先確認該 `event_code` 至少有一筆已發布且公開的 Settings；不存在或尚未發布的活動不能接受匿名提問。

## 前端串接

`frontend/src/api.ts` 會平行讀取五種公開資料。瀏覽器只保存隨機產生的 `client_id`，不使用姓名、Email 或裝置指紋。若 API URL 或活動代碼未設定，前端顯示設定中狀態，不建立或補寫日期、地點、講者等未確認資訊。

## 錯誤碼

| 代碼                  | 說明                               |
| --------------------- | ---------------------------------- |
| `VALIDATION_ERROR`    | 缺欄位、格式或長度不符             |
| `INVALID_JSON`        | POST 內容不是有效 JSON             |
| `NOT_FOUND`           | 不支援的 action                    |
| `FORBIDDEN`           | 嘗試公開讀取內部資源               |
| `RATE_LIMITED`        | 超過簡易時間窗限制                 |
| `CONFIGURATION_ERROR` | 工作表或模式設定不完整             |
| `INTERNAL_ERROR`      | 未預期錯誤；詳細內容只寫入執行記錄 |

## 快取與一致性

公開 GET 預設快取 120 秒。提問採 Script Lock，等待鎖最長 10 秒。Apps Script 本身可能重試或逾時，呼叫端應保存 `request_id` 供除錯；本階段未實作 idempotency key，請勿對提交提問做無上限自動重試。
