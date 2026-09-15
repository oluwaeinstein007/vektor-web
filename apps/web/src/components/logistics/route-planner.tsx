"use client";

import { useState } from "react";
import type { LatLon, RouteResult } from "@vektor/shared";
import { Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError, LOGISTICS_SVC_URL } from "@/lib/api-client";

const DEFAULT_START: LatLon = { lat: 0, lon: 0 };
const DEFAULT_END: LatLon = { lat: 0.05, lon: 0.05 };

export function RoutePlanner() {
  const [start, setStart] = useState<LatLon>(DEFAULT_START);
  const [end, setEnd] = useState<LatLon>(DEFAULT_END);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function plan() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchWithAuth<RouteResult>(LOGISTICS_SVC_URL, "/api/v1/logistics/route", {
        method: "POST",
        body: JSON.stringify({ start, end }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Route planning failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <strong style={{ fontSize: 12 }}>Route planner</strong>
      <p style={{ fontSize: 11, opacity: 0.7 }}>
        Finds the shortest supply route over the road network, automatically avoiding any edge flagged as a hazard.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
        <LatLonInput label="Start lat/lon" value={start} onChange={setStart} />
        <LatLonInput label="End lat/lon" value={end} onChange={setEnd} />
      </div>

      <Button type="button" size="sm" disabled={busy} aria-busy={busy} onClick={() => void plan()}>
        {busy ? "Planning…" : "Plan route"}
      </Button>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d" }} aria-live="polite">
          {error}
        </p>
      )}

      {result && (
        <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 6 }}>
          <p>
            Distance: <strong>{(result.distance_m / 1000).toFixed(2)} km</strong> · Waypoints: {result.path.length} · Hazard
            edges avoided: {result.avoided_edge_ids.length}
          </p>
          <div
            style={{
              maxHeight: 140,
              overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              padding: "4px 8px",
              fontFamily: "ui-monospace, 'Courier New', monospace",
              opacity: 0.8,
            }}
          >
            {result.path.map((p, i) => (
              <div key={i}>
                {i}: {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function LatLonInput({ label, value, onChange }: { label: string; value: LatLon; onChange: (v: LatLon) => void }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label htmlFor={`${id}-lat`} style={{ opacity: 0.7 }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          id={`${id}-lat`}
          type="number"
          step="any"
          value={value.lat}
          onChange={(e) => onChange({ ...value, lat: Number(e.target.value) })}
          style={{ width: "50%", fontFamily: "inherit", fontSize: 11 }}
        />
        <input
          id={`${id}-lon`}
          type="number"
          step="any"
          value={value.lon}
          onChange={(e) => onChange({ ...value, lon: Number(e.target.value) })}
          style={{ width: "50%", fontFamily: "inherit", fontSize: 11 }}
        />
      </div>
    </div>
  );
}
