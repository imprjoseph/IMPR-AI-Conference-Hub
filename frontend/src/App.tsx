import { useState } from "react";

const copy = {
  zh: {
    eyebrow: "IMPR 會議數位中樞",
    title: "讓每場重要會議，\n從資訊到現場都清楚有序。",
    body: "整合活動資料、雙語議程、講者資訊與觀眾提問的安全基礎平台。第一階段已完成資料架構與公開 API。",
    badge: "Phase 1 · Foundation",
    cards: [
      ["單一資料來源", "Google Sheets 管理活動內容，公開與內部資料明確分流。"],
      [
        "安全公開 API",
        "只回傳核准公開欄位，輸入驗證、速率限制與稽核紀錄一併到位。",
      ],
      ["雙語優先", "繁體中文與英文欄位自資料層開始設計，支援國際會議情境。"],
    ],
    note: "AI 功能將於後續階段導入；所有 AI 內容均須標示為初稿並經人工審核。",
  },
  en: {
    eyebrow: "IMPR CONFERENCE OPERATIONS HUB",
    title: "Make every important conference\nclear, connected, and ready.",
    body: "A secure foundation for event data, bilingual agendas, speaker profiles, FAQs, and audience questions. Phase one delivers the data model and public API.",
    badge: "Phase 1 · Foundation",
    cards: [
      [
        "One source of truth",
        "Manage event content in Google Sheets with a clean boundary between public and internal data.",
      ],
      [
        "Public API by design",
        "Allowlisted fields, input validation, rate limiting, locking, caching, and audit trails.",
      ],
      [
        "Bilingual from day one",
        "Traditional Chinese and English are modeled at the data layer for international events.",
      ],
    ],
    note: "AI capabilities are reserved for later phases. Every AI-generated item will be labelled as a draft and require human review.",
  },
} as const;

export default function App() {
  const [language, setLanguage] = useState<keyof typeof copy>("zh");
  const content = copy[language];

  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <img
          src={`${import.meta.env.BASE_URL}impr-logo.png`}
          alt="IMPR 新動力公共關係顧問股份有限公司"
        />
        <button
          type="button"
          className="language-toggle"
          onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
          aria-label={
            language === "zh" ? "Switch to English" : "切換至繁體中文"
          }
        >
          {language === "zh" ? "EN" : "繁中"}
        </button>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="badge">{content.badge}</span>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className="intro">{content.body}</p>
        </div>
        <div className="orb" aria-hidden="true">
          <div className="orb-core">AI</div>
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
        </div>
      </section>

      <section className="capabilities" aria-label="Platform capabilities">
        {content.cards.map(([title, description], index) => (
          <article key={title}>
            <span>0{index + 1}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <footer>
        <p>{content.note}</p>
        <span>© IMPR · Impetus Public Relations Consultants Co., Ltd.</span>
      </footer>
    </main>
  );
}
