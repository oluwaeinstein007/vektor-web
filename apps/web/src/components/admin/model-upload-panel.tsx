"use client";

import { useState } from "react";
import { Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError, CV_INFERENCE_SVC_URL } from "@/lib/api-client";

interface UploadResponse {
  status: "ok";
  executionProvider: "cuda" | "cpu";
}

export function ModelUploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await fetchWithAuth<UploadResponse>(CV_INFERENCE_SVC_URL, "/api/v1/models/upload", {
        method: "POST",
        body: form,
      });
      setResult(data);
      setConfirmed(false);
      setFile(null);
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Model upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <strong style={{ fontSize: 12 }}>CV model hot-swap</strong>
      <p style={{ fontSize: 11, opacity: 0.7 }}>
        Uploads a new ONNX detection model to cv-inference-svc. On success it replaces the live model immediately for every
        camera feed — there is no staged rollout or rollback.
      </p>

      <input
        type="file"
        accept=".onnx"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setConfirmed(false);
          setResult(null);
          setError(null);
        }}
        style={{ fontSize: 11 }}
      />

      {file && (
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, opacity: 0.85 }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I understand this
          replaces the live inference model for all sensors immediately.
        </label>
      )}

      <Button type="button" size="sm" variant="destructive" disabled={!file || !confirmed || busy} aria-busy={busy} onClick={() => void upload()}>
        {busy ? "Uploading…" : "Upload & hot-swap"}
      </Button>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d" }} aria-live="polite">
          {error}
        </p>
      )}

      {result && (
        <p style={{ fontSize: 11, color: "#22c55e" }} aria-live="polite">
          Model swapped — running on {result.executionProvider.toUpperCase()}.
        </p>
      )}
    </Panel>
  );
}
