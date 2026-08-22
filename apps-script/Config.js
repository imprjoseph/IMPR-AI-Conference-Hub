var CONFIG_DEFAULTS = {
  APP_MODE: "test",
  CACHE_SECONDS: 120,
  RATE_LIMIT_WINDOW_SECONDS: 60,
  RATE_LIMIT_READS: 60,
  RATE_LIMIT_WRITES: 8,
};

function getConfig() {
  var properties = PropertiesService.getScriptProperties();
  var mode = properties.getProperty("APP_MODE") || CONFIG_DEFAULTS.APP_MODE;
  if (["test", "production"].indexOf(mode) === -1) {
    throw new Error("APP_MODE must be test or production");
  }
  var spreadsheetId = properties.getProperty(
    mode === "test" ? "TEST_SPREADSHEET_ID" : "SPREADSHEET_ID",
  );
  if (!spreadsheetId)
    throw new Error("Spreadsheet ID is not configured for " + mode + " mode");

  return {
    mode: mode,
    spreadsheetId: spreadsheetId,
    cacheSeconds: Number(
      properties.getProperty("CACHE_SECONDS") || CONFIG_DEFAULTS.CACHE_SECONDS,
    ),
    readRateLimit: Number(
      properties.getProperty("RATE_LIMIT_READS") ||
        CONFIG_DEFAULTS.RATE_LIMIT_READS,
    ),
    writeRateLimit: Number(
      properties.getProperty("RATE_LIMIT_WRITES") ||
        CONFIG_DEFAULTS.RATE_LIMIT_WRITES,
    ),
    rateLimitWindowSeconds: Number(
      properties.getProperty("RATE_LIMIT_WINDOW_SECONDS") ||
        CONFIG_DEFAULTS.RATE_LIMIT_WINDOW_SECONDS,
    ),
  };
}
