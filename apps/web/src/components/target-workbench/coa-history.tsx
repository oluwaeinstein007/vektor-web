"use client";

import { useCallback, useEffect, useState } from "react";
import type { COA } from "@vektor/shared";
import { Badge, Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError, COA_SVC_URL } from "@/lib/api-client";

const STATUS_VARIANT: Record<COA["status"], "secondary" | "destructive" | "outline"> = {
  APPROVED: "secondary",
  REJECTED: "destructive",
  PENDING: "outline",
};

/** Commander/SuperAdmin-only decision log — every COA generated across every
 * situation, not just the one currently selected in the ranking above.
 * Server-side enforcement is the real gate (GET /api/v1/coa is
 * Commander-only); this only renders for a role that can actually reach it. */
export function CoaHistory() {
  const [coas, setCoas] = useState<COA[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<COA[]>(COA_SVC_URL, "/api/v1/coa?limit=100");
      setCoas(data);
    } catch (err) {
      setCoas([]);
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Failed to load COA history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Panel tone="hud">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 12 }}>Decision log</strong>
        <Button type="button" size="sm" variant="outline" disabled={loading} aria-busy={loading} onClick={() => void refresh()}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d", marginBottom: 8 }} aria-live="polite">
          {error}
        </p>
      )}

      {!error && coas.length === 0 && !loading && <p style={{ fontSize: 11, opacity: 0.7 }}>No COAs generated yet.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {coas.map((coa) => {
          const selected = coa.options.find((o) => o.rank === coa.selected_option);
          const expanded = expandedId === coa.coa_id;
          return (
            <div key={coa.coa_id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "8px 10px" }}>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : coa.coa_id)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                }}
              >
                <Badge variant={STATUS_VARIANT[coa.status]}>{coa.status}</Badge>
                <span style={{ opacity: 0.6 }}>{new Date(coa.generated_at).toLocaleString()}</span>
                <span style={{ opacity: 0.5, fontFamily: "ui-monospace, monospace" }}>{coa.situation_id.slice(0, 8)}</span>
                {selected && <span>→ {selected.title}</span>}
                <span style={{ marginLeft: "auto", opacity: 0.5 }}>{expanded ? "▲" : "▼"}</span>
              </button>

              {expanded && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                  {coa.commander_notes && <p style={{ opacity: 0.8 }}>Notes: {coa.commander_notes}</p>}
                  {coa.options.map((opt) => (
                    <div
                      key={opt.rank}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 4,
                        background: opt.rank === coa.selected_option ? "rgba(34,197,94,0.1)" : "transparent",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <strong>
                        #{opt.rank} — {opt.title}
                      </strong>
                      <p style={{ opacity: 0.7, margin: "4px 0 0" }}>{opt.rationale}</p>
                      <p style={{ opacity: 0.5, margin: "4px 0 0" }}>
                        Confidence: {(opt.confidence * 100).toFixed(0)}% · Est. duration: {opt.estimated_duration_min}min
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
