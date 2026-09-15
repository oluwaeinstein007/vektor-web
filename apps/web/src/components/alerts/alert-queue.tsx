"use client";

import { useCallback, useEffect, useState } from "react";
import type { Alert } from "@vektor/shared";
import { Badge, Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError, ALERT_SVC_URL } from "@/lib/api-client";
import { satisfiesRequirement } from "@/lib/rbac";
import { isRole, type Role } from "@/lib/roles";

const SEVERITY_VARIANT: Record<Alert["severity"], "outline" | "secondary" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

export function AlertQueue({ role }: { role: Role | undefined }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const canAct = isRole(role) && satisfiesRequirement(role, "analyst+");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<Alert[]>(ALERT_SVC_URL, "/api/v1/alerts");
      setAlerts(data);
    } catch (err) {
      setAlerts([]);
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(alertId: string, action: "ACKNOWLEDGE" | "ESCALATE" | "DISMISS") {
    setBusyId(alertId);
    try {
      const updated = await fetchWithAuth<Alert>(ALERT_SVC_URL, `/api/v1/alerts/${alertId}/actions`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setAlerts((prev) => prev.map((a) => (a.alert_id === alertId ? updated : a)));
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : `Couldn't ${action.toLowerCase()} alert.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel tone="hud">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 12 }}>Alert triage queue</strong>
        <Button type="button" size="sm" variant="outline" disabled={loading} aria-busy={loading} onClick={() => void refresh()}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d", marginBottom: 8 }} aria-live="polite">
          {error}
        </p>
      )}

      {!error && alerts.length === 0 && !loading && <p style={{ fontSize: 11, opacity: 0.7 }}>No alerts.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((alert) => (
          <div
            key={alert.alert_id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
              <Badge variant={SEVERITY_VARIANT[alert.severity]}>{alert.severity}</Badge>
              <Badge variant="outline">{alert.type}</Badge>
              <span style={{ opacity: 0.6 }}>{alert.status}</span>
              <span style={{ opacity: 0.5, marginLeft: "auto" }}>{new Date(alert.ts).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: 12 }}>{alert.message}</p>
            {canAct && alert.status === "OPEN" && (
              <div style={{ display: "flex", gap: 6 }}>
                <Button type="button" size="sm" disabled={busyId === alert.alert_id} onClick={() => void act(alert.alert_id, "ACKNOWLEDGE")}>
                  Acknowledge
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busyId === alert.alert_id} onClick={() => void act(alert.alert_id, "ESCALATE")}>
                  Escalate
                </Button>
                <Button type="button" size="sm" variant="destructive" disabled={busyId === alert.alert_id} onClick={() => void act(alert.alert_id, "DISMISS")}>
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
