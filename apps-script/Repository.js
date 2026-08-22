function getSpreadsheet() {
  return SpreadsheetApp.openById(getConfig().spreadsheetId);
}

function sheetRowsToObjects(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet)
    throw apiError("CONFIGURATION_ERROR", "找不到工作表：" + sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values
    .slice(1)
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== "";
      });
    })
    .map(function (row) {
      var record = {};
      headers.forEach(function (header, index) {
        record[header] = normalizeCellValue(row[index]);
      });
      return record;
    });
}

function normalizeCellValue(value) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function readPublicRecords(sheetName, eventCode) {
  var schema = getSheetSchema(sheetName);
  if (!schema.publicApi) throw apiError("FORBIDDEN", "此資源不提供公開讀取");
  var cache = CacheService.getScriptCache();
  var cacheKey = ["public", sheetName, eventCode || "all"].join(":");
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var allowedFields = getPublicFieldNames(sheetName);
  var records = sheetRowsToObjects(sheetName)
    .filter(function (record) {
      return (
        record.is_public === true &&
        record.status === "published" &&
        (!eventCode || record.event_code === eventCode)
      );
    })
    .map(function (record) {
      var safeRecord = {};
      allowedFields.forEach(function (field) {
        safeRecord[field] = record[field];
      });
      return safeRecord;
    });

  cache.put(cacheKey, JSON.stringify(records), getConfig().cacheSeconds);
  return records;
}

function appendRowBySchema(sheetName, record) {
  var schema = getSheetSchema(sheetName);
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet)
    throw apiError("CONFIGURATION_ERROR", "找不到工作表：" + sheetName);
  var row = schema.fields.map(function (field) {
    return Object.prototype.hasOwnProperty.call(record, field.name)
      ? record[field.name]
      : "";
  });
  sheet.appendRow(row);
}

function appendAuditLog(entry) {
  var now = new Date().toISOString();
  appendRowBySchema("AuditLog", {
    audit_id: Utilities.getUuid(),
    event_code: entry.event_code || "",
    request_id: entry.request_id,
    actor_type: entry.actor_type || "anonymous",
    actor_hash: entry.actor_hash || "",
    action: entry.action,
    resource: entry.resource,
    result: entry.result,
    details_json: JSON.stringify(entry.details || {}),
    created_at: now,
    updated_at: now,
    status: "recorded",
    is_public: false,
  });
}

function createQuestion(input, requestId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var now = new Date().toISOString();
    var questionId = Utilities.getUuid();
    appendRowBySchema("Questions", {
      question_id: questionId,
      event_code: input.event_code,
      session_id: input.session_id,
      question_text: input.question_text,
      language: input.language,
      moderation_status: "pending",
      submitted_at: now,
      created_at: now,
      updated_at: now,
      status: "pending",
      is_public: false,
    });
    appendAuditLog({
      event_code: input.event_code,
      request_id: requestId,
      actor_hash: hashIdentifier(input.client_id),
      action: "question.create",
      resource: "Questions",
      result: "success",
      details: { question_id: questionId, mode: getConfig().mode },
    });
    return { question_id: questionId, moderation_status: "pending" };
  } finally {
    lock.releaseLock();
  }
}
