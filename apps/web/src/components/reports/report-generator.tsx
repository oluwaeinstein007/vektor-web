"use client";

import { useState } from "react";
import type { Report, ReportFormat } from "@vektor/shared";
import { Button, Panel } from "@vektor/ui";
import { fetchWithAuth, fetchFileWithAuth, downloadResponse, AuthExpiredError, REPORTING_SVC_URL } from "@/lib/api-client";

const FORMATS: ReportFormat[] = ["PDF", "PPTX"];

export function ReportGenerator() {
  const [format, setFormat] = useState<ReportFormat>("PDF");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      // REQ-7.1: reporting-svc generates synchronously (within ~30s) and
      // returns the finished report record directly — no separate poll loop
      // needed for the common case.
      const result = await fetchWithAuth<Report>(REPORTING_SVC_URL, "/api/v1/reports", {
        method: "POST",
        body: JSON.stringify({ format }),
      });
      setReport(result);
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Report generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!report) return;
    try {
      const res = await fetchFileWithAuth(REPORTING_SVC_URL, `/api/v1/reports/${report.report_id}`);
      const ext = report.format === "PDF" ? "pdf" : "pptx";
      await downloadResponse(res, `sitrep-${report.report_id.slice(0, 8)}.${ext}`);
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Download failed.");
    }
  }

  return (
    <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <strong style={{ fontSize: 12 }}>Generate sitrep</strong>
      <p style={{ fontSize: 11, opacity: 0.7 }}>Builds a situation report from the current live entities/alerts snapshot.</p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
        <label htmlFor="report-format">Format</label>
        <select id="report-format" value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)}>
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" disabled={busy} aria-busy={busy} onClick={() => void generate()}>
          {busy ? "Generating…" : "Generate"}
        </Button>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d" }} aria-live="polite">
          {error}
        </p>
      )}

      {report && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
          <span>Status: {report.status}</span>
          {report.status === "COMPLETE" && (
            <Button type="button" size="sm" variant="outline" onClick={() => void download()}>
              Download
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}
