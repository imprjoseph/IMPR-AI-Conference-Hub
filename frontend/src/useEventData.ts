import { useCallback, useEffect, useState } from "react";
import { conferenceApi, ConferenceApiError } from "./api";
import type { EventData } from "./types";

export function useEventData() {
  const [data, setData] = useState<EventData | null>(null);
  const [error, setError] = useState<ConferenceApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    conferenceApi
      .loadEvent(controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof ConferenceApiError
            ? reason
            : new ConferenceApiError("UNKNOWN_ERROR", "活動資料暫時無法載入"),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  return { data, error, loading, retry };
}
