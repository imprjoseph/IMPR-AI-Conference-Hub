function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("IMPR Conference Hub")
    .addItem("初始化目前試算表", "initializeActiveSpreadsheet")
    .addToUi();
}

/**
 * Creates a new event spreadsheet and stores its ID for the selected mode.
 * Run this from the Apps Script editor while signed in as an administrator.
 */
function createEventSpreadsheet(name, eventCode, includeExamples) {
  var safeName = validateString(
    "spreadsheet_name",
    name || "IMPR AI Conference Hub",
    true,
  );
  var safeEventCode = validateEventCode(eventCode || "IMPR-DEMO");
  var spreadsheet = SpreadsheetApp.create(safeName + " - " + safeEventCode);
  initializeSpreadsheet(spreadsheet, includeExamples !== false);
  var mode =
    PropertiesService.getScriptProperties().getProperty("APP_MODE") || "test";
  var propertyName =
    mode === "production" ? "SPREADSHEET_ID" : "TEST_SPREADSHEET_ID";
  PropertiesService.getScriptProperties().setProperty(
    propertyName,
    spreadsheet.getId(),
  );
  return { id: spreadsheet.getId(), url: spreadsheet.getUrl(), mode: mode };
}

function initializeActiveSpreadsheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  initializeSpreadsheet(spreadsheet, true);
  var mode =
    PropertiesService.getScriptProperties().getProperty("APP_MODE") || "test";
  var propertyName =
    mode === "production" ? "SPREADSHEET_ID" : "TEST_SPREADSHEET_ID";
  PropertiesService.getScriptProperties().setProperty(
    propertyName,
    spreadsheet.getId(),
  );
}

function initializeSpreadsheet(spreadsheet, includeExamples) {
  var names = Object.keys(SHEET_SCHEMAS);
  assertSafeToInitialize(spreadsheet, names);
  names.forEach(function (name, index) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet =
        index === 0 && spreadsheet.getSheets().length === 1
          ? spreadsheet.getSheets()[0].setName(name)
          : spreadsheet.insertSheet(name);
    }
    var schema = getSheetSchema(name);
    sheet.clear();
    var headers = schema.fields.map(function (field) {
      return field.name;
    });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setBackground("#f47510")
      .setFontColor("#11100e")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
    if (includeExamples && schema.example) {
      sheet
        .getRange(2, 1, 1, schema.example.length)
        .setValues([schema.example]);
    }
    applySheetValidation(sheet, schema);
    sheet.autoResizeColumns(1, headers.length);
  });
}

function assertSafeToInitialize(spreadsheet, names) {
  var populatedSheets = names.filter(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    return sheet && sheet.getLastRow() > 0;
  });
  if (populatedSheets.length) {
    throw new Error(
      "為避免覆蓋既有資料，初始化已中止。已有內容的工作表：" +
        populatedSheets.join(", "),
    );
  }
}

function applySheetValidation(sheet, schema) {
  schema.fields.forEach(function (field, index) {
    var range = sheet.getRange(
      2,
      index + 1,
      Math.max(sheet.getMaxRows() - 1, 1),
      1,
    );
    var rule = null;
    if (field.type === "boolean") {
      rule = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .setAllowInvalid(false)
        .build();
    } else if (field.type === "integer") {
      rule = SpreadsheetApp.newDataValidation()
        .requireNumberGreaterThanOrEqualTo(0)
        .setAllowInvalid(false)
        .build();
    } else if (field.name === "language") {
      rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["zh-Hant", "en"], true)
        .setAllowInvalid(false)
        .build();
    }
    if (rule) range.setDataValidation(rule);
    range.setNote(
      [
        "型態: " + field.type,
        "必填: " + (field.required ? "是" : "否"),
        "唯一: " + (field.unique ? "是" : "否"),
        "公開: " + (field.public ? "是" : "否"),
      ].join("｜"),
    );
  });
}
