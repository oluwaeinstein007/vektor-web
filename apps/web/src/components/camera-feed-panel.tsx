"use client";

import { useEffect, useState } from "react";
import { useVideoFrameStore } from "@/stores/video-frame-store";
import { useVideoFrames } from "@/hooks/useVideoFrames";
import { HudPanel } from "./hud-panel";

const STALE_AFTER_MS = 5000;
const LIVE_COLOR = "#22c55e";
const STALE_COLOR = "#eab308";

function formatAgo(iso: string, now: number): string {
  const deltaSeconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return deltaSeconds < 1 ? "now" : `${deltaSeconds}s ago`;
}

/** Live thumbnail(s) from any RTSP/phone-camera source publishing to `{env}.vektor.video.frame` — a throttled sample relayed over Socket.io (fusion-svc's videoFrameConsumer.ts), not the full-framerate Kafka stream. */
export function CameraFeedPanel() {
  useVideoFrames((event, error) => console.warn(`[CameraFeedPanel] invalid ${event} payload`, error));
  const frames = useVideoFrameStore((s) => s.frames);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const rows = Array.from(frames.values()).sort((a, b) => a.sensor_id.localeCompare(b.sensor_id));

  return (
    <HudPanel anchor="bottom-right" title="CAMERA FEEDS" minWidth={220}>
      <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.5 }}>No camera feeds active</div>
        ) : (
          rows.map((frame) => {
            const ageMs = now - Date.parse(frame.captured_at);
            const isLive = ageMs <= STALE_AFTER_MS;
            return (
              <div key={frame.sensor_id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span>{frame.sensor_id}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: isLive ? LIVE_COLOR : STALE_COLOR }}>
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: isLive ? LIVE_COLOR : STALE_COLOR,
                        boxShadow: `0 0 4px ${isLive ? LIVE_COLOR : STALE_COLOR}`,
                      }}
                    />
                    {isLive ? "LIVE" : "STALE"}
                  </span>
                </div>
                <img
                  src={`data:image/jpeg;base64,${frame.jpeg_base64}`}
                  alt={`Live camera feed from ${frame.sensor_id}`}
                  style={{ width: "100%", borderRadius: 3, display: "block", border: "1px solid #1e293b" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 10, marginTop: 2 }}>
                  <span>
                    {frame.width}×{frame.height}
                  </span>
                  <span>{formatAgo(frame.captured_at, now)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </HudPanel>
  );
}
