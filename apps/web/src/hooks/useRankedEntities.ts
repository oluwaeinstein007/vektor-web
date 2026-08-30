"use client";

import { useCallback, useEffect, useState } from "react";
import { RankedEntity } from "@vektor/shared";
import { fetchWithAuth, AuthExpiredError } from "@/lib/api-client";

// REQ-4.1: "Ranking refreshes ≤ every 5s" — target-workbench/ranking.ts is
// recomputed fresh per request (no push mechanism), so this polls under that
// bar rather than subscribing to a socket event that doesn't exist.
const POLL_MS = 4000;

export function useRankedEntities(enabled: boolean) {
  const [entities, setEntities] = useState<RankedEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchWithAuth<unknown>("/api/v1/target-workbench/ranking");
      setEntities(RankedEntity.array().parse(raw));
      setError(null);
    } catch (err) {
      setEntities([]);
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Failed to load target ranking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return { entities, error, loading, refresh };
}
