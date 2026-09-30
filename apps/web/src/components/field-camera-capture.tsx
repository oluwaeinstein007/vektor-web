"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, Button, Badge } from "@vektor/ui";
import { FIELD_INGEST_URL } from "@/lib/api-client";
import { getFieldDeviceId, setFieldDeviceId, getFieldDeviceKey, setFieldDeviceKey } from "@/lib/field-device";

const CAPTURE_INTERVAL_MS = 1500;
const JPEG_QUALITY = 0.7;
// Local-dev-only convenience default — matches the FIELD_DEVICE_SHARED_SECRET
// ingest-svc is started with in dev (see the Logistics/Map/etc. dev-startup
// notes). Never do this for a real deployment; there the key has to be
// typed/scanned in deliberately, same as any other device credential.
const DEV_DEFAULT_DEVICE_KEY = "vektor-dev-field-key";

type CaptureStatus = "idle" | "starting" | "live" | "error";

/**
 * The browser-camera counterpart to ingest-svc's RTSP/IP-Webcam path
 * (src/http/app.ts's POST /api/v1/field/snapshot, already wired all the way
 * through to the dashboard's CameraFeedPanel via the same video.frame
 * topic) — this is the UI that endpoint never had (see 09-roadmap.md's
 * never-built field-pwa). Zero app install: point a phone's own browser at
 * this page, grant camera access, done. Deliberately NOT a replacement for
 * IP Webcam/RTSP — see the header comment on buildFieldIngestApp for why
 * that stays the recommended route for anything long-running (mobile
 * browsers throttle camera access hard once the tab backgrounds or the
 * screen locks). This is the fast path for "get one camera on the map for
 * a demo/test", not a durable sensor deployment.
 */
export function FieldCameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameNumberRef = useRef(0);

  const [deviceId, setDeviceId] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [framesSent, setFramesSent] = useState(0);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [insecureContext, setInsecureContext] = useState(false);

  useEffect(() => {
    setDeviceId(getFieldDeviceId());
    const storedKey = getFieldDeviceKey();
    if (storedKey) {
      setDeviceKey(storedKey);
    } else {
      setDeviceKey(DEV_DEFAULT_DEVICE_KEY);
      setFieldDeviceKey(DEV_DEFAULT_DEVICE_KEY);
    }
    // getUserMedia is only available in a secure context (https:// or
    // localhost) — a phone opening this page over plain http://<lan-ip>
    // will have no mediaDevices API at all, not just a denied permission.
    setInsecureContext(typeof window !== "undefined" && !window.isSecureContext);
    return () => stopCapture();
  }, []);

  async function sendFrame(): Promise<void> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return;

    frameNumberRef.current += 1;
    try {
      const res = await fetch(`${FIELD_INGEST_URL}/api/v1/field/snapshot`, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "X-Vektor-Device-Key": deviceKey,
          "X-Vektor-Device-Id": deviceId,
          "X-Vektor-Captured-At": new Date().toISOString(),
        },
        body: blob,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
        throw new Error(body.error ?? `upload failed: ${res.status}`);
      }
      setFramesSent((n) => n + 1);
      setLastSentAt(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Frame upload failed.");
    }
  }

  async function startCapture(): Promise<void> {
    setError(null);
    if (!deviceId.trim()) {
      setError("Set a device ID first.");
      return;
    }
    if (!deviceKey.trim()) {
      setError("Set the field device key first (matches ingest-svc's FIELD_DEVICE_SHARED_SECRET).");
      return;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("live");
      intervalRef.current = setInterval(() => void sendFrame(), CAPTURE_INTERVAL_MS);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't access the camera.");
    }
  }

  function stopCapture(): void {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStatus("idle");
  }

  return (
    <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 11 }}>
      <strong style={{ fontSize: 12 }}>Field camera</strong>
      <p style={{ opacity: 0.75 }}>
        Streams a throttled snapshot from this device&apos;s camera straight into the dashboard&apos;s camera panel — no
        app install. For a continuous, screen-lock-proof feed, use IP Webcam (or another RTSP source) into ingest-svc
        instead; this page is best for quick tests.
      </p>

      {insecureContext && (
        <p style={{ color: "#f5a623" }}>
          This page isn&apos;t loaded over HTTPS or localhost — most mobile browsers won&apos;t grant camera access
          here at all. Open it over HTTPS (or tunnel it, e.g. with a dev HTTPS proxy) to use this from a phone.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="field-device-id" style={{ opacity: 0.7 }}>
          Device ID
        </label>
        <input
          id="field-device-id"
          value={deviceId}
          disabled={status === "live" || status === "starting"}
          onChange={(e) => {
            setDeviceId(e.target.value);
            setFieldDeviceId(e.target.value);
          }}
          style={{ fontFamily: "inherit", fontSize: 11 }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="field-device-key" style={{ opacity: 0.7 }}>
          Device key (FIELD_DEVICE_SHARED_SECRET)
        </label>
        <input
          id="field-device-key"
          type="password"
          value={deviceKey}
          disabled={status === "live" || status === "starting"}
          onChange={(e) => {
            setDeviceKey(e.target.value);
            setFieldDeviceKey(e.target.value);
          }}
          style={{ fontFamily: "inherit", fontSize: 11 }}
        />
      </div>

      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: "100%", borderRadius: 4, background: "#000", display: status === "idle" ? "none" : "block" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {status !== "live" && status !== "starting" ? (
          <Button type="button" size="sm" onClick={() => void startCapture()}>
            Start camera
          </Button>
        ) : (
          <Button type="button" size="sm" variant="destructive" onClick={stopCapture} disabled={status === "starting"}>
            {status === "starting" ? "Starting…" : "Stop"}
          </Button>
        )}
        {status === "live" && <Badge>LIVE</Badge>}
      </div>

      <p style={{ opacity: 0.7 }}>
        Frames sent: {framesSent}
        {lastSentAt ? ` · last sent ${lastSentAt.toLocaleTimeString()}` : ""}
      </p>

      {error && (
        <p style={{ color: "#ff4d4d" }} aria-live="polite">
          {error}
        </p>
      )}
    </Panel>
  );
}
