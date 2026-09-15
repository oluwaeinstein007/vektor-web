"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { AuditEntry } from "@vektor/shared";
import { Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError, AUDIT_SVC_URL } from "@/lib/api-client";

export function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [limit, setLimit] = useState(100);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      if (actorFilter.trim()) params.set("actor_user_id", actorFilter.trim());
      const data = await fetchWithAuth<AuditEntry[]>(AUDIT_SVC_URL, `/api/v1/audit?${params.toString()}`);
      setEntries(data);
      setSearched(true);
    } catch (err) {
      setEntries([]);
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, actorFilter, limit]);

  return (
    <Panel tone="hud">
      <strong style={{ fontSize: 12 }}>Audit log</strong>
      <p style={{ fontSize: 11, opacity: 0.7, margin: "4px 0 10px" }}>Append-only record of every auditable action platform-wide.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 10, fontSize: 11 }}>
        <Field label="Action">
          <input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="e.g. coa.approve"
            style={{ fontFamily: "inherit", fontSize: 11, width: 140 }}
          />
        </Field>
        <Field label="Actor user ID">
          <input
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            style={{ fontFamily: "inherit", fontSize: 11, width: 140 }}
          />
        </Field>
        <Field label="Limit">
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ fontFamily: "inherit", fontSize: 11, width: 70 }}
          />
        </Field>
        <Button type="button" size="sm" disabled={loading} aria-busy={loading} onClick={() => void search()}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d", marginBottom: 8 }} aria-live="polite">
          {error}
        </p>
      )}

      {searched && !error && entries.length === 0 && (
        <p style={{ fontSize: 11, opacity: 0.7 }}>No matching audit entries.</p>
      )}

      {entries.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th style={{ padding: "4px 8px 4px 0" }}>Time</th>
                <th style={{ padding: "4px 8px" }}>Actor</th>
                <th style={{ padding: "4px 8px" }}>Role</th>
                <th style={{ padding: "4px 8px" }}>Action</th>
                <th style={{ padding: "4px 8px" }}>Resource</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.audit_id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={{ padding: "6px 8px 6px 0", opacity: 0.7, whiteSpace: "nowrap" }}>
                    {new Date(entry.ts).toLocaleString()}
                  </td>
                  <td style={{ padding: "6px 8px" }}>{entry.actor_user_id}</td>
                  <td style={{ padding: "6px 8px", opacity: 0.7 }}>{entry.actor_role}</td>
                  <td style={{ padding: "6px 8px" }}>{entry.action}</td>
                  <td style={{ padding: "6px 8px", opacity: 0.7 }}>
                    {entry.resource_type}
                    {entry.resource_id ? ` #${entry.resource_id}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ opacity: 0.7 }}>{label}</label>
      {children}
    </div>
  );
}
