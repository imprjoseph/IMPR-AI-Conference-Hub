var INPUT_LIMITS = {
  event_code: 64,
  session_id: 128,
  question_text: 1000,
  client_id: 128,
  language: 16,
};

function validateEventCode(value) {
  var normalized = validateString("event_code", value, true);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$/.test(normalized)) {
    throw apiError("VALIDATION_ERROR", "event_code 格式不正確");
  }
  return normalized;
}

function validateString(field, value, required) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string")
    throw apiError("VALIDATION_ERROR", field + " 必須是字串");
  var normalized = value.trim();
  if (required && !normalized)
    throw apiError("VALIDATION_ERROR", field + " 為必填欄位");
  var limit = INPUT_LIMITS[field] || 500;
  if (normalized.length > limit) {
    throw apiError(
      "VALIDATION_ERROR",
      field + " 不得超過 " + limit + " 個字元",
    );
  }
  return normalized;
}

function validateQuestion(payload) {
  var language = validateString(
    "language",
    payload.language || "zh-Hant",
    true,
  );
  if (["zh-Hant", "en"].indexOf(language) === -1) {
    throw apiError("VALIDATION_ERROR", "language 僅接受 zh-Hant 或 en");
  }
  return {
    event_code: validateEventCode(payload.event_code),
    session_id: validateString("session_id", payload.session_id || "", false),
    question_text: preventFormulaInjection(
      validateString("question_text", payload.question_text, true),
    ),
    language: language,
    client_id: validateClientId(payload.client_id),
  };
}

function validateClientId(value) {
  var clientId = validateString("client_id", value, true);
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(clientId)) {
    throw apiError("VALIDATION_ERROR", "client_id 格式不正確");
  }
  return clientId;
}

function preventFormulaInjection(value) {
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value.trimStart()) ? "'" + value : value;
}

function hashIdentifier(value) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
  );
  return digest
    .map(function (byte) {
      return (byte + 256).toString(16).slice(-2);
    })
    .join("");
}

function enforceRateLimit(clientId, action, isWrite) {
  var config = getConfig();
  var cache = CacheService.getScriptCache();
  var windowId = Math.floor(
    Date.now() / (config.rateLimitWindowSeconds * 1000),
  );
  var key = [
    "rate",
    hashIdentifier(clientId).slice(0, 24),
    action,
    windowId,
  ].join(":");
  var current = Number(cache.get(key) || 0);
  var limit = isWrite ? config.writeRateLimit : config.readRateLimit;
  if (current >= limit)
    throw apiError("RATE_LIMITED", "請求過於頻繁，請稍後再試");
  cache.put(key, String(current + 1), config.rateLimitWindowSeconds + 5);
}

function apiError(code, message) {
  var error = new Error(message);
  error.code = code;
  return error;
}
