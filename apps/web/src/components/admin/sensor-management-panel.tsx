"use client";

import { useCallback, useEffect, useState } from "react";
import type { SensorRegistration, SensorType } from "@vektor/shared";
import { Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError, FUSION_SVC_URL } from "@/lib/api-client";

const SENSOR_TYPES: SensorType[] = ["RTSP", "AIS", "ADSB", "MQTT", "GEOTIFF", "FIELD", "OTHER"];

export function SensorManagementPanel() {
  const [sensors, setSensors] = useState<SensorRegistration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sensorId, setSensorId] = useState("");
  const [sensorType, setSensorType] = useState<SensorType>("RTSP");
  const [label, setLabel] = useState("");
  const [lat, setLat] = useState(0);
  const [lon, setLon] = useState(0);
  const [radiusM, setRadiusM] = useState(5000);
  const [registering, setRegistering] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<SensorRegistration[]>(FUSION_SVC_URL, "/api/v1/sensors");
      setSensors(data);
    } catch (err) {
      setSensors([]);
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Failed to load sensors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function register() {
    setRegistering(true);
    setError(null);
    try {
      await fetchWithAuth(FUSION_SVC_URL, "/api/v1/sensors", {
        method: "POST",
        body: JSON.stringify({
          sensor_id: sensorId,
          sensor_type: sensorType,
          label,
          position: { lat, lon },
          coverage_radius_m: radiusM,
        }),
      });
      setSensorId("");
      setLabel("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Couldn't register sensor.");
    } finally {
      setRegistering(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetchWithAuth(FUSION_SVC_URL, `/api/v1/sensors/${encodeURIComponent(id)}`, { method: "DELETE" });
      setSensors((prev) => prev.filter((s) => s.sensor_id !== id));
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Couldn't remove sensor.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel tone="hud">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 12 }}>Sensor registry</strong>
        <div style={{ display: "flex", gap: 6 }}>
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void refresh()}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Register sensor"}
          </Button>
        </div>
      </div>
      <p style={{ fontSize: 11, opacity: 0.7, marginTop: -6, marginBottom: 10 }}>
        Feeds the Map&apos;s Sensor Coverage layer and sensor:status enrichment — nothing auto-populates this, every entry is
        operator-registered.
      </p>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d", marginBottom: 8 }} aria-live="polite">
          {error}
        </p>
      )}

      {showForm && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 11,
            marginBottom: 12,
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: 4,
            padding: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              Sensor ID
              <input value={sensorId} onChange={(e) => setSensorId(e.target.value)} style={{ display: "block", width: "100%", fontFamily: "inherit", fontSize: 11 }} />
            </label>
            <label style={{ flex: 1 }}>
              Type
              <select value={sensorType} onChange={(e) => setSensorType(e.target.value as SensorType)} style={{ display: "block", width: "100%", fontSize: 11 }}>
                {SENSOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Label
            <input value={label} onChange={(e) => setLabel(e.target.value)} style={{ display: "block", width: "100%", fontFamily: "inherit", fontSize: 11 }} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              Lat
              <input type="number" step="any" value={lat} onChange={(e) => setLat(Number(e.target.value))} style={{ display: "block", width: "100%", fontFamily: "inherit", fontSize: 11 }} />
            </label>
            <label style={{ flex: 1 }}>
              Lon
              <input type="number" step="any" value={lon} onChange={(e) => setLon(Number(e.target.value))} style={{ display: "block", width: "100%", fontFamily: "inherit", fontSize: 11 }} />
            </label>
            <label style={{ flex: 1 }}>
              Radius (m)
              <input type="number" min={1} value={radiusM} onChange={(e) => setRadiusM(Number(e.target.value))} style={{ display: "block", width: "100%", fontFamily: "inherit", fontSize: 11 }} />
            </label>
          </div>
          <Button type="button" size="sm" disabled={!sensorId.trim() || !label.trim() || registering} aria-busy={registering} onClick={() => void register()}>
            {registering ? "Registering…" : "Register"}
          </Button>
        </div>
      )}

      {!error && sensors.length === 0 && !loading && <p style={{ fontSize: 11, opacity: 0.7 }}>No sensors registered.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sensors.map((sensor) => (
          <div key={sensor.sensor_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6 }}>
            <span style={{ flex: 1 }}>
              {sensor.label} <span style={{ opacity: 0.5 }}>({sensor.sensor_id})</span>
            </span>
            <span style={{ opacity: 0.6 }}>{sensor.sensor_type}</span>
            <span style={{ opacity: 0.5 }}>
              {sensor.position.lat.toFixed(3)}, {sensor.position.lon.toFixed(3)} · {(sensor.coverage_radius_m / 1000).toFixed(0)}km
            </span>
            <Button type="button" size="sm" variant="destructive" disabled={busyId === sensor.sensor_id} onClick={() => void remove(sensor.sensor_id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
