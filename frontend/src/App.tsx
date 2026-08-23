import { useEffect, useState, type FormEvent } from "react";
import { conferenceApi } from "./api";
import type {
  AgendaItem,
  EventData,
  Language,
  Setting,
  Speaker,
} from "./types";
import { useEventData } from "./useEventData";

const interfaceCopy = {
  zh: {
    nav: [
      ["活動資訊", "#overview"],
      ["議程", "#agenda"],
      ["講者", "#speakers"],
      ["常見問題", "#faq"],
      ["專有名詞", "#glossary"],
      ["觀眾提問", "#questions"],
    ],
    eyebrow: "IMPR 會議數位中樞",
    fallbackTitle: "讓每場重要會議，\n從資訊到現場都清楚有序。",
    intro:
      "集中呈現經主辦單位核准的雙語活動資訊、議程與講者資料，並提供安全的匿名提問管道。",
    badge: "Phase 2 · Public Hub",
    loading: "正在載入活動資訊…",
    retry: "重新載入",
    setupTitle: "活動資料服務設定中",
    setupBody: "公開網站已上線，活動內容將於管理端完成連線後顯示。",
    errorTitle: "活動資訊暫時無法載入",
    testMode: "測試模式",
    sessions: "場議程",
    speakerCount: "位講者",
    faqCount: "項常見問題",
    overview: "活動資訊",
    agenda: "議程",
    speakers: "講者",
    faq: "常見問題",
    glossary: "專有名詞",
    questions: "觀眾提問",
    emptyAgenda: "議程將於主辦單位確認後公布。",
    emptySpeakers: "講者資訊將於主辦單位確認後公布。",
    emptyFaq: "目前沒有已公布的常見問題。",
    emptyGlossary: "目前沒有已公布的專有名詞。",
    noDescription: "詳細內容將於確認後公布。",
    website: "公開網站",
    allSessions: "不指定場次",
    questionLabel: "想向講者或主辦單位提問嗎？",
    questionHint:
      "請勿填寫姓名、電話、Email 或其他個人資料。提問送出後須經人工審核。",
    selectSession: "選擇議程場次（選填）",
    questionPlaceholder: "輸入問題，最多 1,000 字…",
    submit: "送出提問",
    submitting: "正在送出…",
    submitted: "提問已送出，將由工作人員人工審核。",
    questionError: "提問送出失敗，請稍後再試。",
    approvedNote: "所有活動資訊均以主辦單位人工核准後公布的內容為準。",
  },
  en: {
    nav: [
      ["Overview", "#overview"],
      ["Agenda", "#agenda"],
      ["Speakers", "#speakers"],
      ["FAQ", "#faq"],
      ["Glossary", "#glossary"],
      ["Ask", "#questions"],
    ],
    eyebrow: "IMPR CONFERENCE OPERATIONS HUB",
    fallbackTitle:
      "Make every important conference\nclear, connected, and ready.",
    intro:
      "Find organiser-approved bilingual event information, agenda and speaker profiles, with a secure channel for anonymous audience questions.",
    badge: "Phase 2 · Public Hub",
    loading: "Loading event information…",
    retry: "Try again",
    setupTitle: "Event data service is being configured",
    setupBody:
      "The public site is live. Event content will appear after the management connection is complete.",
    errorTitle: "Event information is temporarily unavailable",
    testMode: "Test mode",
    sessions: "sessions",
    speakerCount: "speakers",
    faqCount: "FAQs",
    overview: "Event overview",
    agenda: "Agenda",
    speakers: "Speakers",
    faq: "Frequently asked questions",
    glossary: "Glossary",
    questions: "Audience questions",
    emptyAgenda: "The agenda will be published after organiser approval.",
    emptySpeakers:
      "Speaker information will be published after organiser approval.",
    emptyFaq: "No FAQs have been published yet.",
    emptyGlossary: "No glossary terms have been published yet.",
    noDescription: "Details will be published after confirmation.",
    website: "Public website",
    allSessions: "No specific session",
    questionLabel: "Have a question for a speaker or the organiser?",
    questionHint:
      "Do not include your name, phone number, email address, or other personal information. Questions require human moderation.",
    selectSession: "Choose a session (optional)",
    questionPlaceholder: "Enter your question, up to 1,000 characters…",
    submit: "Submit question",
    submitting: "Submitting…",
    submitted: "Your question was submitted for human moderation.",
    questionError:
      "The question could not be submitted. Please try again later.",
    approvedNote:
      "All event information is published only after organiser approval.",
  },
} as const;

function localized(record: object, field: string, language: Language): string {
  const values = record as Record<string, unknown>;
  const preferred = String(values[`${field}_${language}`] ?? "").trim();
  const fallback = String(
    values[`${field}_${language === "zh" ? "en" : "zh"}`] ?? "",
  ).trim();
  return preferred || fallback;
}

function settingValue(
  settings: Setting[],
  key: string,
  language: Language,
): string {
  const setting = settings.find((item) => item.setting_key === key);
  return setting ? localized(setting, "value", language) : "";
}

function formatDate(value: string, language: Language): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(language === "zh" ? "zh-TW" : "en-GB", {
    year: "numeric",
    month: language === "zh" ? "long" : "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function speakerNames(
  item: AgendaItem,
  speakers: Speaker[],
  language: Language,
): string {
  const ids = String(item.speaker_ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids
    .map((id) => speakers.find((speaker) => speaker.speaker_id === id))
    .filter((speaker): speaker is Speaker => Boolean(speaker))
    .map((speaker) => localized(speaker, "name", language))
    .filter(Boolean)
    .join(" · ");
}

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="section-heading">
      <span>{index}</span>
      <h2>{title}</h2>
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return <p className="empty-state">{children}</p>;
}

function QuestionForm({
  language,
  data,
}: {
  language: Language;
  data: EventData;
}) {
  const content = interfaceCopy[language];
  const [sessionId, setSessionId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!questionText.trim() || submitting) return;
    setSubmitting(true);
    setResult("idle");
    try {
      await conferenceApi.submitQuestion({
        sessionId,
        questionText: questionText.trim(),
        language: language === "zh" ? "zh-Hant" : "en",
      });
      setQuestionText("");
      setSessionId("");
      setResult("success");
    } catch (_error) {
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="question-form" onSubmit={handleSubmit}>
      <div>
        <h3>{content.questionLabel}</h3>
        <p>{content.questionHint}</p>
      </div>
      <label>
        <span>{content.selectSession}</span>
        <select
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
        >
          <option value="">{content.allSessions}</option>
          {data.agenda.map((item) => (
            <option value={item.agenda_id} key={item.agenda_id}>
              {item.start_time} · {localized(item, "title", language)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">{content.questionLabel}</span>
        <textarea
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          maxLength={1000}
          rows={5}
          required
          placeholder={content.questionPlaceholder}
        />
      </label>
      <div className="form-actions">
        <span>{questionText.length} / 1000</span>
        <button type="submit" disabled={submitting || !questionText.trim()}>
          {submitting ? content.submitting : content.submit}
        </button>
      </div>
      <div className="form-status" aria-live="polite">
        {result === "success" && (
          <p className="success-message">{content.submitted}</p>
        )}
        {result === "error" && (
          <p className="error-message">{content.questionError}</p>
        )}
      </div>
    </form>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>("zh");
  const { data, error, loading, retry } = useEventData();
  const content = interfaceCopy[language];
  const settings = data?.settings ?? [];
  const eventName = settingValue(settings, "event_name", language);
  const eventSummary =
    settingValue(settings, "event_summary", language) || content.intro;
  const eventDate = settingValue(settings, "event_date", language);
  const eventVenue = settingValue(settings, "venue", language);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
  }, [language]);

  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a
          className="brand"
          href="#overview"
          aria-label="IMPR AI Conference Hub"
        >
          <img
            src={`${import.meta.env.BASE_URL}impr-logo.png`}
            alt="IMPR 新動力公共關係顧問股份有限公司"
          />
        </a>
        <div className="nav-links">
          {content.nav.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </div>
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

      <section className="hero" id="overview">
        <div className="hero-copy">
          <div className="hero-badges">
            <span className="badge">{content.badge}</span>
            {data?.mode === "test" && (
              <span className="mode-badge">{content.testMode}</span>
            )}
          </div>
          <p className="eyebrow">{content.eyebrow}</p>
          {eventName && <p className="event-name">{eventName}</p>}
          <h1>{content.fallbackTitle}</h1>
          <p className="intro">{eventSummary}</p>
          {(eventDate || eventVenue) && (
            <div className="event-meta">
              {eventDate && <span>{eventDate}</span>}
              {eventVenue && <span>{eventVenue}</span>}
            </div>
          )}
        </div>
        <div className="phase-mark" aria-hidden="true">
          <span>PHASE</span>
          <strong>02</strong>
          <i />
        </div>
      </section>

      {loading && (
        <div className="system-message loading-message">{content.loading}</div>
      )}

      {!loading && error && (
        <section className="system-message error-panel" role="alert">
          <span>
            {error.code === "CONFIGURATION_MISSING" ? "SETUP" : "ERROR"}
          </span>
          <div>
            <h2>
              {error.code === "CONFIGURATION_MISSING"
                ? content.setupTitle
                : content.errorTitle}
            </h2>
            <p>
              {error.code === "CONFIGURATION_MISSING"
                ? content.setupBody
                : error.message}
            </p>
            {error.code !== "CONFIGURATION_MISSING" && (
              <button type="button" onClick={retry}>
                {content.retry}
              </button>
            )}
          </div>
        </section>
      )}

      {data && (
        <>
          <section className="metrics" aria-label={content.overview}>
            <article>
              <strong>{data.agenda.length}</strong>
              <span>{content.sessions}</span>
            </article>
            <article>
              <strong>{data.speakers.length}</strong>
              <span>{content.speakerCount}</span>
            </article>
            <article>
              <strong>{data.faq.length}</strong>
              <span>{content.faqCount}</span>
            </article>
          </section>

          <section className="content-section" id="agenda">
            <SectionHeading index="01" title={content.agenda} />
            {data.agenda.length ? (
              <div className="agenda-list">
                {data.agenda.map((item) => {
                  const names = speakerNames(item, data.speakers, language);
                  return (
                    <article className="agenda-item" key={item.agenda_id}>
                      <div className="agenda-time">
                        <span>{formatDate(item.session_date, language)}</span>
                        <strong>
                          {item.start_time}–{item.end_time}
                        </strong>
                        {item.room && <small>{item.room}</small>}
                      </div>
                      <div>
                        <h3>{localized(item, "title", language)}</h3>
                        {names && <p className="agenda-speakers">{names}</p>}
                        <p>
                          {localized(item, "description", language) ||
                            content.noDescription}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState>{content.emptyAgenda}</EmptyState>
            )}
          </section>

          <section className="content-section" id="speakers">
            <SectionHeading index="02" title={content.speakers} />
            {data.speakers.length ? (
              <div className="speaker-grid">
                {data.speakers.map((speaker) => {
                  const name = localized(speaker, "name", language);
                  const image = safeExternalUrl(speaker.photo_url);
                  const website = safeExternalUrl(speaker.website_url);
                  return (
                    <article className="speaker-card" key={speaker.speaker_id}>
                      <div className="speaker-image">
                        {image ? (
                          <img src={image} alt={name} loading="lazy" />
                        ) : (
                          <span>{name.slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h3>{name}</h3>
                        <p className="speaker-role">
                          {[
                            localized(speaker, "title", language),
                            localized(speaker, "organization", language),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {localized(speaker, "bio", language) && (
                          <p>{localized(speaker, "bio", language)}</p>
                        )}
                        {website && (
                          <a href={website} target="_blank" rel="noreferrer">
                            {content.website} ↗
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState>{content.emptySpeakers}</EmptyState>
            )}
          </section>

          <section className="content-section two-column-section" id="faq">
            <SectionHeading index="03" title={content.faq} />
            {data.faq.length ? (
              <div className="faq-list">
                {data.faq.map((item) => (
                  <details key={item.faq_id}>
                    <summary>{localized(item, "question", language)}</summary>
                    <p>{localized(item, "answer", language)}</p>
                  </details>
                ))}
              </div>
            ) : (
              <EmptyState>{content.emptyFaq}</EmptyState>
            )}
          </section>

          <section className="content-section" id="glossary">
            <SectionHeading index="04" title={content.glossary} />
            {data.glossary.length ? (
              <div className="glossary-grid">
                {data.glossary.map((item) => (
                  <article key={item.glossary_id}>
                    <span>{item.term_en}</span>
                    <h3>{item.term_zh}</h3>
                    <p>{localized(item, "definition", language)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>{content.emptyGlossary}</EmptyState>
            )}
          </section>

          <section className="content-section questions-section" id="questions">
            <SectionHeading index="05" title={content.questions} />
            <QuestionForm language={language} data={data} />
          </section>
        </>
      )}

      <footer>
        <p>{content.approvedNote}</p>
        <span>© IMPR · Impetus Public Relations Consultants Co., Ltd.</span>
      </footer>
    </main>
  );
}
