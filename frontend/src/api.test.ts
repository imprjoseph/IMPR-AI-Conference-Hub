import { describe, expect, it, vi } from "vitest";
import { ConferenceApiError, createConferenceApi, getClientId } from "./api";

function envelope<T>(data: T, mode = "test") {
  return {
    success: true,
    data,
    error: null,
    meta: { request_id: "request-1", timestamp: "2026-08-23T00:00:00Z", mode },
  };
}

describe("conference API", () => {
  it("loads all public collections with the required safe query parameters", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      const action = url.searchParams.get("action");
      expect(url.searchParams.get("event_code")).toBe("IMPR-DEMO");
      expect(url.searchParams.get("client_id")).toBe("browser_test_1234");
      const records =
        action === "agenda"
          ? [
              { agenda_id: "second", sort_order: 20 },
              { agenda_id: "first", sort_order: 10 },
            ]
          : [];
      return new Response(JSON.stringify(envelope(records)), { status: 200 });
    }) as typeof fetch;

    const api = createConferenceApi({
      baseUrl: "https://example.test/exec",
      eventCode: "IMPR-DEMO",
      clientId: "browser_test_1234",
      fetcher,
    });
    const result = await api.loadEvent();

    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(result.agenda.map((item) => item.agenda_id)).toEqual([
      "first",
      "second",
    ]);
    expect(result.mode).toBe("test");
  });

  it("submits only the anonymous question contract as text/plain JSON", async () => {
    const fetcher = vi.fn(
      async (_input: URL | RequestInfo, init?: RequestInit) => {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toEqual({
          "Content-Type": "text/plain;charset=utf-8",
        });
        expect(JSON.parse(String(init?.body))).toEqual({
          action: "submitQuestion",
          event_code: "IMPR-DEMO",
          session_id: "AGN-1",
          question_text: "What is the review process?",
          language: "en",
          client_id: "browser_test_1234",
        });
        return new Response(
          JSON.stringify(
            envelope({ question_id: "QUE-1", moderation_status: "pending" }),
          ),
        );
      },
    ) as typeof fetch;

    const api = createConferenceApi({
      baseUrl: "https://example.test/exec",
      eventCode: "IMPR-DEMO",
      clientId: "browser_test_1234",
      fetcher,
    });
    await expect(
      api.submitQuestion({
        sessionId: "AGN-1",
        questionText: "What is the review process?",
        language: "en",
      }),
    ).resolves.toEqual({ question_id: "QUE-1", moderation_status: "pending" });
  });

  it("surfaces the API error code and request ID", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { code: "RATE_LIMITED", message: "請稍後再試" },
            meta: {
              request_id: "request-rate",
              timestamp: "now",
              mode: "test",
            },
          }),
        ),
    ) as typeof fetch;
    const api = createConferenceApi({
      baseUrl: "https://example.test/exec",
      eventCode: "IMPR-DEMO",
      clientId: "browser_test_1234",
      fetcher,
    });

    await expect(api.loadEvent()).rejects.toMatchObject({
      name: "ConferenceApiError",
      code: "RATE_LIMITED",
      requestId: "request-rate",
    } satisfies Partial<ConferenceApiError>);
  });

  it("creates and reuses a non-personal browser identifier", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const first = getClientId(storage);
    const second = getClientId(storage);
    expect(first).toMatch(/^browser_[A-Za-z0-9_-]+$/);
    expect(second).toBe(first);
  });
});
