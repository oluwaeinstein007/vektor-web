"use client";

import { useState } from "react";
import { Button, Panel } from "@vektor/ui";
import { fetchFileWithAuth, downloadResponse, AuthExpiredError, REPORTING_SVC_URL } from "@/lib/api-client";

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export function DataExport() {
  const [format, setFormat] = useState<"csv" | "geojson">("csv");
  const [from, setFrom] = useState(() => isoHoursAgo(24).slice(0, 16));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 16));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        format,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      });
      const res = await fetchFileWithAuth(REPORTING_SVC_URL, `/api/v1/export?${params.toString()}`);
      await downloadResponse(res, `entities-export.${format === "csv" ? "csv" : "geojson"}`);
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <strong style={{ fontSize: 12 }}>Raw data export</strong>
      <p style={{ fontSize: 11, opacity: 0.7 }}>Exports entity history over a time window as CSV or GeoJSON.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          From
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} style={{ fontFamily: "inherit", fontSize: 11 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          To
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} style={{ fontFamily: "inherit", fontSize: 11 }} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
        <label htmlFor="export-format">Format</label>
        <select id="export-format" value={format} onChange={(e) => setFormat(e.target.value as "csv" | "geojson")}>
          <option value="csv">CSV</option>
          <option value="geojson">GeoJSON</option>
        </select>
        <Button type="button" size="sm" disabled={busy} aria-busy={busy} onClick={() => void exportData()}>
          {busy ? "Exporting…" : "Export"}
        </Button>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d" }} aria-live="polite">
          {error}
        </p>
      )}
    </Panel>
  );
}
