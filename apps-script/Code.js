var PUBLIC_ACTIONS = {
  settings: { sheet: "Settings", requireEventCode: false },
  agenda: { sheet: "Agenda", requireEventCode: true },
  speakers: { sheet: "Speakers", requireEventCode: true },
  faq: { sheet: "FAQ", requireEventCode: true },
  glossary: { sheet: "Glossary", requireEventCode: true },
};

function doGet(e) {
  var context = createRequestContext(e);
  try {
    var action = validateString("action", context.parameters.action, true);
    var route = PUBLIC_ACTIONS[action];
    if (!route) throw apiError("NOT_FOUND", "不支援的公開 API 動作");
    var clientId = validateClientId(context.parameters.client_id);
    enforceRateLimit(clientId, action, false);
    var eventCode = context.parameters.event_code
      ? validateEventCode(context.parameters.event_code)
      : "";
    if (route.requireEventCode && !eventCode) {
      throw apiError("VALIDATION_ERROR", "event_code 為必填欄位");
    }
    return jsonResponse(
      true,
      readPublicRecords(route.sheet, eventCode),
      null,
      context.requestId,
    );
  } catch (error) {
    return handleApiError(error, context.requestId);
  }
}

function doPost(e) {
  var context = createRequestContext(e);
  try {
    var payload = parsePostBody(e);
    var action = validateString("action", payload.action, true);
    if (action !== "submitQuestion")
      throw apiError("NOT_FOUND", "不支援的公開 API 動作");
    var question = validateQuestion(payload);
    enforceRateLimit(question.client_id, action, true);
    if (!readPublicRecords("Settings", question.event_code).length) {
      throw apiError("NOT_FOUND", "找不到可公開提問的活動");
    }
    return jsonResponse(
      true,
      createQuestion(question, context.requestId),
      null,
      context.requestId,
    );
  } catch (error) {
    return handleApiError(error, context.requestId);
  }
}

function createRequestContext(e) {
  return {
    requestId: Utilities.getUuid(),
    parameters: e && e.parameter ? e.parameter : {},
  };
}

function parsePostBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw apiError("VALIDATION_ERROR", "缺少請求內容");
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (_error) {
    throw apiError("INVALID_JSON", "請求內容必須是有效 JSON");
  }
}

function handleApiError(error, requestId) {
  var code = error && error.code ? error.code : "INTERNAL_ERROR";
  var publicMessage =
    code === "INTERNAL_ERROR" ? "服務暫時無法使用" : error.message;
  console.error(
    JSON.stringify({
      request_id: requestId,
      code: code,
      message: error.message,
    }),
  );
  return jsonResponse(
    false,
    null,
    { code: code, message: publicMessage },
    requestId,
  );
}

function jsonResponse(success, data, error, requestId) {
  var mode = "unknown";
  try {
    mode = getConfig().mode;
  } catch (_error) {
    // Keep the original configuration error in the response path.
  }
  var body = {
    success: success,
    data: data,
    error: error,
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      mode: mode,
    },
  };
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** Admin-only helper. Run manually in the Apps Script editor; never expose via doGet/doPost. */
function writeAuditLog(entry) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    appendAuditLog(entry);
  } finally {
    lock.releaseLock();
  }
}
