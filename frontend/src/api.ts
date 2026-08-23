import type {
  AgendaItem,
  ApiEnvelope,
  EventData,
  FaqItem,
  GlossaryItem,
  Setting,
  Speaker,
} from "./types";

type PublicAction = "settings" | "agenda" | "speakers" | "faq" | "glossary";
type Fetcher = typeof fetch;

export class ConferenceApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ConferenceApiError";
  }
}

function createClientId(): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "")
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `browser_${randomPart}`.slice(0, 128);
}

export function getClientId(
  storage?: Pick<Storage, "getItem" | "setItem">,
): string {
  const target =
    storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  const existing = target?.getItem("impr_conference_client_id");
  if (existing && /^[A-Za-z0-9_-]{8,128}$/.test(existing)) return existing;
  const clientId = createClientId();
  target?.setItem("impr_conference_client_id", clientId);
  return clientId;
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  if (!response.ok) {
    throw new ConferenceApiError(
      "NETWORK_ERROR",
      `公開資料服務回應異常（${response.status}）`,
    );
  }
  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ConferenceApiError(
      "INVALID_RESPONSE",
      "公開資料服務回應格式不正確",
    );
  }
  if (!envelope.success || envelope.data === null) {
    throw new ConferenceApiError(
      envelope.error?.code ?? "API_ERROR",
      envelope.error?.message ?? "公開資料服務暫時無法使用",
      envelope.meta?.request_id,
    );
  }
  return envelope;
}

export function createConferenceApi(options: {
  baseUrl: string;
  eventCode: string;
  fetcher?: Fetcher;
  clientId?: string;
}) {
  const baseUrl = options.baseUrl.trim();
  const eventCode = options.eventCode.trim();
  const fetcher = options.fetcher ?? fetch;
  const clientId = options.clientId ?? getClientId();

  function assertConfigured() {
    if (!baseUrl || !eventCode) {
      throw new ConferenceApiError(
        "CONFIGURATION_MISSING",
        "活動資料服務尚未完成設定",
      );
    }
  }

  async function getCollection<T>(
    action: PublicAction,
    signal?: AbortSignal,
  ): Promise<ApiEnvelope<T[]>> {
    assertConfigured();
    const url = new URL(baseUrl);
    url.searchParams.set("action", action);
    url.searchParams.set("event_code", eventCode);
    url.searchParams.set("client_id", clientId);
    return parseEnvelope<T[]>(await fetcher(url, { method: "GET", signal }));
  }

  return {
    async loadEvent(signal?: AbortSignal): Promise<EventData> {
      const [settings, agenda, speakers, faq, glossary] = await Promise.all([
        getCollection<Setting>("settings", signal),
        getCollection<AgendaItem>("agenda", signal),
        getCollection<Speaker>("speakers", signal),
        getCollection<FaqItem>("faq", signal),
        getCollection<GlossaryItem>("glossary", signal),
      ]);
      return {
        settings: settings.data ?? [],
        agenda: (agenda.data ?? []).sort((a, b) => a.sort_order - b.sort_order),
        speakers: (speakers.data ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
        faq: (faq.data ?? []).sort((a, b) => a.sort_order - b.sort_order),
        glossary: (glossary.data ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
        mode: settings.meta.mode,
      };
    },

    async submitQuestion(input: {
      sessionId: string;
      questionText: string;
      language: "zh-Hant" | "en";
    }): Promise<{ question_id: string; moderation_status: string }> {
      assertConfigured();
      const response = await fetcher(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "submitQuestion",
          event_code: eventCode,
          session_id: input.sessionId,
          question_text: input.questionText,
          language: input.language,
          client_id: clientId,
        }),
      });
      const envelope = await parseEnvelope<{
        question_id: string;
        moderation_status: string;
      }>(response);
      return envelope.data!;
    },
  };
}

export const conferenceApi = createConferenceApi({
  baseUrl: import.meta.env.VITE_APPS_SCRIPT_WEB_APP_URL ?? "",
  eventCode: import.meta.env.VITE_EVENT_CODE ?? "",
});
