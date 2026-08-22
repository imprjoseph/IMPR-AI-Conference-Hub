import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["**/node_modules/**", "frontend/dist/**"],
  },
  js.configs.recommended,
  {
    files: ["apps-script/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: {
        ...globals.es2020,
        CacheService: "readonly",
        SHEET_SCHEMAS: "readonly",
        ContentService: "readonly",
        appendAuditLog: "readonly",
        apiError: "readonly",
        createQuestion: "readonly",
        enforceRateLimit: "readonly",
        getConfig: "readonly",
        getPublicFieldNames: "readonly",
        getSheetSchema: "readonly",
        hashIdentifier: "readonly",
        LockService: "readonly",
        PropertiesService: "readonly",
        readPublicRecords: "readonly",
        Session: "readonly",
        SpreadsheetApp: "readonly",
        Utilities: "readonly",
        console: "readonly",
        validateClientId: "readonly",
        validateEventCode: "readonly",
        validateQuestion: "readonly",
        validateString: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "error",
      "no-redeclare": "off",
    },
  },
  {
    files: ["tests/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
