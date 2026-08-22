# Google Sheets 資料字典

`apps-script/Schema.js` 是可執行的單一來源；本文件提供人工審核版。記號：`!`＝必填、`U`＝唯一、`P`＝可由公開 API 回傳。每張表都有唯一識別碼、`created_at:datetime!`、`updated_at:datetime!`、`status:string!`、`is_public:boolean!`，並由初始化程式加入一筆範例資料。

| 工作表              | 用途／公開性                   | 唯一 ID                 | 專屬欄位（名稱:型態與規則）                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Settings`          | 活動基本設定；公開 GET         | `setting_id:uuid! U P`  | `event_code:string! P`, `setting_key:string! P`, `value_zh:string P`, `value_en:string P`, `data_type:enum! P`                                                                                                                                                                             |
| `Agenda`            | 中英文議程；公開 GET           | `agenda_id:uuid! U P`   | `event_code:string! P`, `session_date:date! P`, `start_time:time! P`, `end_time:time! P`, `room:string P`, `title_zh:string! P`, `title_en:string P`, `description_zh:text P`, `description_en:text P`, `speaker_ids:string[] P`, `sort_order:integer! P`                                  |
| `Speakers`          | 經核准的講者公開資料；公開 GET | `speaker_id:uuid! U P`  | `event_code:string! P`, `name_zh:string! P`, `name_en:string P`, `title_zh:string P`, `title_en:string P`, `organization_zh:string P`, `organization_en:string P`, `bio_zh:text P`, `bio_en:text P`, `photo_url:url P`, `website_url:url P`, `sort_order:integer! P`；**沒有私人聯絡欄位** |
| `FAQ`               | 雙語常見問題；公開 GET         | `faq_id:uuid! U P`      | `event_code:string! P`, `category:string P`, `question_zh:string! P`, `answer_zh:text! P`, `question_en:string P`, `answer_en:text P`, `sort_order:integer! P`                                                                                                                             |
| `Glossary`          | 雙語專有名詞；公開 GET         | `glossary_id:uuid! U P` | `event_code:string! P`, `term_zh:string! P`, `term_en:string! P`, `definition_zh:text P`, `definition_en:text P`, `sort_order:integer! P`                                                                                                                                                  |
| `Questions`         | 匿名觀眾提問；只允許 POST 新增 | `question_id:uuid! U`   | `event_code:string!`, `session_id:string`, `question_text:text!`, `language:enum!`, `moderation_status:enum!`, `submitted_at:datetime!`；所有欄位不公開                                                                                                                                    |
| `RegistrationStats` | 去識別化報名統計；內部         | `stat_id:uuid! U`       | `event_code:string!`, `stat_date:date!`, `category:string!`, `registered_count:integer!`, `attended_count:integer`；不得放完整個資                                                                                                                                                         |
| `SpeakerTracking`   | 講者聯繫流程狀態；內部         | `tracking_id:uuid! U`   | `event_code:string!`, `speaker_id:string!`, `contact_owner:string`, `contact_status:enum!`, `last_contacted_at:datetime`, `next_action_at:datetime`, `internal_notes:text`；不存電話或 Email                                                                                               |
| `Tasks`             | 工作任務；內部                 | `task_id:uuid! U`       | `event_code:string!`, `title:string!`, `description:text`, `owner_role:string`, `due_date:date`, `priority:enum!`, `task_status:enum!`                                                                                                                                                     |
| `AIOutputs`         | 未來 AI 初稿與審核；內部       | `ai_output_id:uuid! U`  | `event_code:string!`, `source_type:string!`, `source_id:string!`, `task_type:enum!`, `model_key:string!`, `prompt_version:string!`, `output_text:text!`, `is_draft:boolean!`, `review_status:enum!`, `reviewed_by:string`, `reviewed_at:datetime`                                          |
| `AuditLog`          | 操作紀錄；內部、僅附加         | `audit_id:uuid! U`      | `event_code:string`, `request_id:string!`, `actor_type:enum!`, `actor_hash:string`, `action:string!`, `resource:string!`, `result:enum!`, `details_json:json`；不得記錄提問全文或個資                                                                                                      |

## 共通欄位的公開性

在 `Settings`、`Agenda`、`Speakers`、`FAQ`、`Glossary` 中，共通欄位可被白名單選取，但只有資料列同時符合 `status=published` 及 `is_public=true` 才會回傳。其餘六張內部表的所有欄位一律不公開。

## 型態說明

| 型態       | 儲存規則                                            |
| ---------- | --------------------------------------------------- |
| `uuid`     | 不重複字串；程式寫入使用 `Utilities.getUuid()`      |
| `date`     | ISO `YYYY-MM-DD`                                    |
| `time`     | 24 小時制 `HH:mm`                                   |
| `datetime` | ISO 8601，含時區或 UTC                              |
| `boolean`  | Sheets checkbox／布林值，不使用文字 `TRUE`／`FALSE` |
| `integer`  | 大於等於 0 的整數                                   |
| `string[]` | 逗號分隔 ID；ID 本身不得含逗號                      |
| `json`     | 有效 JSON 字串，不放原始敏感 payload                |

範例資料僅用於測試結構，不代表真實活動的日期、地點、講者或價格。正式發布前必須由人工確認。
