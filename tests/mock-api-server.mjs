import http from "node:http";

const common = {
  created_at: "2026-08-23T00:00:00Z",
  updated_at: "2026-08-23T00:00:00Z",
  status: "published",
  is_public: true,
};

const collections = {
  settings: [
    {
      ...common,
      setting_id: "SET-TEST-001",
      event_code: "IMPR-DEMO",
      setting_key: "event_name",
      value_zh: "IMPR 示範論壇（測試資料）",
      value_en: "IMPR Demo Forum (Test Data)",
      data_type: "string",
    },
    {
      ...common,
      setting_id: "SET-TEST-002",
      event_code: "IMPR-DEMO",
      setting_key: "event_summary",
      value_zh: "這是僅供本機介面驗收的示範內容，不代表任何真實活動。",
      value_en:
        "Local interface test content only. This does not represent a real event.",
      data_type: "string",
    },
  ],
  agenda: [
    {
      ...common,
      agenda_id: "AGN-TEST-001",
      event_code: "IMPR-DEMO",
      session_date: "2026-10-01",
      start_time: "09:00",
      end_time: "09:30",
      room: "測試會場",
      title_zh: "示範開幕場次",
      title_en: "Demo Opening Session",
      description_zh: "僅供版面測試使用。",
      description_en: "For layout testing only.",
      speaker_ids: "SPK-TEST-001",
      sort_order: 10,
    },
    {
      ...common,
      agenda_id: "AGN-TEST-002",
      event_code: "IMPR-DEMO",
      session_date: "2026-10-01",
      start_time: "10:00",
      end_time: "11:00",
      room: "測試會場",
      title_zh: "示範專題討論",
      title_en: "Demo Panel Discussion",
      description_zh: "驗證較長議程說明在不同裝置上的顯示效果。",
      description_en:
        "Tests a longer agenda description across responsive layouts.",
      speaker_ids: "SPK-TEST-001,SPK-TEST-002",
      sort_order: 20,
    },
  ],
  speakers: [
    {
      ...common,
      speaker_id: "SPK-TEST-001",
      event_code: "IMPR-DEMO",
      name_zh: "示範講者甲",
      name_en: "Demo Speaker A",
      title_zh: "示範職稱",
      title_en: "Demo Title",
      organization_zh: "示範機構",
      organization_en: "Demo Organisation",
      bio_zh: "此資料僅用於本機介面驗收。",
      bio_en: "Local interface test data only.",
      photo_url: "",
      website_url: "",
      sort_order: 10,
    },
    {
      ...common,
      speaker_id: "SPK-TEST-002",
      event_code: "IMPR-DEMO",
      name_zh: "示範講者乙",
      name_en: "Demo Speaker B",
      title_zh: "示範職稱",
      title_en: "Demo Title",
      organization_zh: "示範機構",
      organization_en: "Demo Organisation",
      bio_zh: "不含任何真實人物資訊。",
      bio_en: "Contains no real-person information.",
      photo_url: "",
      website_url: "",
      sort_order: 20,
    },
  ],
  faq: [
    {
      ...common,
      faq_id: "FAQ-TEST-001",
      event_code: "IMPR-DEMO",
      category: "test",
      question_zh: "這是真實活動資訊嗎？",
      answer_zh: "不是，這是本機驗收專用測試資料。",
      question_en: "Is this real event information?",
      answer_en: "No. This is local acceptance-test data.",
      sort_order: 10,
    },
  ],
  glossary: [
    {
      ...common,
      glossary_id: "GLO-TEST-001",
      event_code: "IMPR-DEMO",
      term_zh: "示範名詞",
      term_en: "Demo Term",
      definition_zh: "僅供驗證雙語名詞版面。",
      definition_en: "For testing the bilingual glossary layout only.",
      sort_order: 10,
    },
  ],
};

function reply(response, body) {
  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(
    JSON.stringify({
      success: true,
      data: body,
      error: null,
      meta: {
        request_id: "mock-request",
        timestamp: new Date().toISOString(),
        mode: "test",
      },
    }),
  );
}

http
  .createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1:8787");
    if (request.method === "POST") {
      request.resume();
      request.on("end", () =>
        reply(response, {
          question_id: "QUE-TEST-001",
          moderation_status: "pending",
        }),
      );
      return;
    }
    reply(response, collections[url.searchParams.get("action")] ?? []);
  })
  .listen(8787, "127.0.0.1", () => {
    console.log("Mock API listening on http://127.0.0.1:8787/exec");
  });
