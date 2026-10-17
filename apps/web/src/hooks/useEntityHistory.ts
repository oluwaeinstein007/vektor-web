"use client";

import { useEffect, useState } from "react";
import type { EntityHistoryResponse } from "@vektor/shared";
import { fetchEntityHistory, HistoryUnavailableError } from "@/lib/history-client";
import { usePlaybackStore } from "@/stores/playback-store";

/**
 * NW-018 — fetches one entity's full track for the current playback window.
 *
 * Keyed on the window, not on the scrub position: the track line does not
 * change as the clock moves, only how much of it is drawn as "played"
 * does. Re-fetching per scrub tick would make dragging the slider issue a
 * request per frame for data already in hand.
 */
export function useEntityHistory(entityId: string | null) {
  const range = usePlaybackStore((s) => s.range);
  const mode = usePlaybackStore((s) => s.mode);
  const setError = usePlaybackStore((s) => s.setError);
  const [history, setHistory] = useState<EntityHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const from = range?.from;
  const to = range?.to;

  useEffect(() => {
    if (mode !== "historical" || !entityId || from === undefined || to === undefined) {
      setHistory(null);
      return;
    }

    // An in-flight request for a previously selected entity must not land
    // after a newer one and overwrite it — selecting B then A quickly would
    // otherwise leave B's track drawn while A is selected.
    let cancelled = false;
    setLoading(true);

    fetchEntityHistory(entityId, new Date(from), new Date(to))
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setHistory(null);
        setError(
          error instanceof HistoryUnavailableError
            ? error.message
            : `Could not load track history: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, mode, from, to, setError]);

  return { history, loading };
}
