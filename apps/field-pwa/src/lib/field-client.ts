export interface FieldTelemetryPayload {
  device_id: string;
  lat: number;
  lon: number;
  alt_m: number;
  gps_accuracy_m: number | null;
  heading_deg: number | null;
  pitch_deg: number | null;
  roll_deg: number | null;
  battery_pct: number | null;
}

/**
 * Posts through Vite's dev proxy (`/api/field/*` → ingest-svc, configured
 * in vite.config.ts) so this HTTPS page never talks to plain-HTTP
 * ingest-svc directly — a real cross-origin fetch would be blocked as
 * mixed content.
 */
export async function postFieldTelemetry(payload: FieldTelemetryPayload, deviceKey: string): Promise<void> {
  const res = await fetch("/api/v1/field/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Vektor-Device-Key": deviceKey },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error(body.error ?? `telemetry post failed: ${res.status}`);
  }
}

/** Posts a JPEG snapshot (see lib/camera.ts) onto the same video.frame topic RTSP sources use — same dev-proxy reasoning as postFieldTelemetry above. */
export async function postFieldSnapshot(jpegBlob: Blob, deviceId: string, deviceKey: string): Promise<void> {
  const res = await fetch("/api/v1/field/snapshot", {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
      "X-Vektor-Device-Key": deviceKey,
      "X-Vektor-Device-Id": deviceId,
      "X-Vektor-Captured-At": new Date().toISOString(),
    },
    body: jpegBlob,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error(body.error ?? `snapshot post failed: ${res.status}`);
  }
}
