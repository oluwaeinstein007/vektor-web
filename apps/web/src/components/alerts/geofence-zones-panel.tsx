"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlertChannel, AlertSeverity, GeofenceTrigger } from "@vektor/shared";
import { Badge, Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError, ALERT_SVC_URL } from "@/lib/api-client";
import { satisfiesRequirement } from "@/lib/rbac";
import { isRole, type Role } from "@/lib/roles";

interface ZoneSummary {
  zone_id: string;
  name: string;
  trigger: string;
  severity: string;
  affiliation_filter: string | null;
  channels: AlertChannel[];
  active: boolean;
  created_at: string;
}

const TRIGGERS: GeofenceTrigger[] = ["ENTRY", "EXIT", "BOTH"];
const SEVERITIES: AlertSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function parsePolygon(text: string): [number, number][] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [lat, lon] = line.split(",").map((v) => Number(v.trim()));
      return [lat ?? 0, lon ?? 0] as [number, number];
    });
}

export function GeofenceZonesPanel({ role }: { role: Role | undefined }) {
  const canManage = isRole(role) && satisfiesRequirement(role, "commander");
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<GeofenceTrigger>("ENTRY");
  const [severity, setSeverity] = useState<AlertSeverity>("MEDIUM");
  const [polygonText, setPolygonText] = useState("0,0\n0,0.01\n0.01,0.01\n0.01,0");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<ZoneSummary[]>(ALERT_SVC_URL, "/api/v1/geofence-zones");
      setZones(data);
    } catch (err) {
      setZones([]);
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Failed to load geofence zones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createZone() {
    setCreating(true);
    setError(null);
    try {
      await fetchWithAuth(ALERT_SVC_URL, "/api/v1/geofence-zones", {
        method: "POST",
        body: JSON.stringify({
          name,
          trigger,
          severity,
          affiliation_filter: null,
          channels: ["IN_APP"] satisfies AlertChannel[],
          notify: { emails: [], phones: [], webhook_urls: [] },
          polygon: parsePolygon(polygonText),
        }),
      });
      setName("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Couldn't create zone.");
    } finally {
      setCreating(false);
    }
  }

  async function removeZone(id: string) {
    try {
      await fetchWithAuth(ALERT_SVC_URL, `/api/v1/geofence-zones/${id}`, { method: "DELETE" });
      setZones((prev) => prev.filter((z) => z.zone_id !== id));
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Couldn't delete zone.");
    }
  }

  return (
    <Panel tone="hud">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 12 }}>Geofence zones</strong>
        {canManage && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New zone"}
          </Button>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d", marginBottom: 8 }} aria-live="polite">
          {error}
        </p>
      )}

      {showForm && canManage && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11, marginBottom: 12, border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 4, padding: 10 }}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ display: "block", width: "100%", fontFamily: "inherit", fontSize: 11 }} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              Trigger
              <select value={trigger} onChange={(e) => setTrigger(e.target.value as GeofenceTrigger)} style={{ display: "block", width: "100%", fontSize: 11 }}>
                {TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity)} style={{ display: "block", width: "100%", fontSize: 11 }}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Polygon vertices (lat,lon per line — at least 4)
            <textarea value={polygonText} onChange={(e) => setPolygonText(e.target.value)} rows={4} style={{ display: "block", width: "100%", fontFamily: "inherit", fontSize: 11 }} />
          </label>
          <Button type="button" size="sm" disabled={!name.trim() || creating} aria-busy={creating} onClick={() => void createZone()}>
            {creating ? "Creating…" : "Create zone"}
          </Button>
        </div>
      )}

      {!error && zones.length === 0 && !loading && <p style={{ fontSize: 11, opacity: 0.7 }}>No geofence zones configured.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {zones.map((zone) => (
          <div key={zone.zone_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6 }}>
            <span style={{ flex: 1 }}>{zone.name}</span>
            <Badge variant="outline">{zone.trigger}</Badge>
            <Badge variant="secondary">{zone.severity}</Badge>
            {!zone.active && <Badge variant="destructive">inactive</Badge>}
            {canManage && (
              <Button type="button" size="sm" variant="destructive" onClick={() => void removeZone(zone.zone_id)}>
                Delete
              </Button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
