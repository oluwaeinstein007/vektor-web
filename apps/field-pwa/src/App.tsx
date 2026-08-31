import { useCallback, useEffect, useRef, useState } from "react";
import { getDeviceId, getDeviceKey, setDeviceKey } from "./lib/device-key";
import { watchGeoPosition, type GeoReading, type GeoStatus } from "./lib/geolocation";
import { watchOrientation, type OrientationReading, type OrientationStatus } from "./lib/orientation";
import { watchBatteryLevel } from "./lib/battery";
import { postFieldTelemetry, postFieldSnapshot } from "./lib/field-client";
import { startCameraPreview, captureSnapshotBlob, type CameraStatus } from "./lib/camera";
import { StatusPanel } from "./components/status-panel";

const SEND_INTERVAL_MS = 2000;
// Deliberately slower than telemetry: a JPEG snapshot is a lot more data
// than a GPS/orientation reading, and this is the fallback capture mode —
// see lib/camera.ts's header comment for why continuous streaming belongs
// to a real RTSP source instead.
const SNAPSHOT_INTERVAL_MS = 4000;

export function App() {
  const deviceId = useState(() => getDeviceId())[0];
  const [deviceKeyInput, setDeviceKeyInput] = useState(() => getDeviceKey());
  const [transmitting, setTransmitting] = useState(false);

  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [orientationStatus, setOrientationStatus] = useState<OrientationStatus>("idle");
  const [geoReading, setGeoReading] = useState<GeoReading | null>(null);
  const [orientationReading, setOrientationReading] = useState<OrientationReading | null>(null);
  const [batteryPct, setBatteryPct] = useState<number | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);

  // Camera is a secondary, opt-in capture mode (see lib/camera.ts) — off by
  // default even while transmitting telemetry, since it's meaningfully more
  // data/battery than GPS+orientation alone.
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [snapshotSentCount, setSnapshotSentCount] = useState(0);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Refs mirror the latest readings so the send-interval always POSTs
  // fresh values without needing to be torn down/recreated every time a
  // reading arrives (geolocation/orientation update far more often than
  // SEND_INTERVAL_MS).
  const geoRef = useRef<GeoReading | null>(null);
  const orientationRef = useRef<OrientationReading | null>(null);
  const batteryRef = useRef<number | null>(null);
  geoRef.current = geoReading;
  orientationRef.current = orientationReading;
  batteryRef.current = batteryPct;

  const saveDeviceKey = useCallback((key: string) => {
    setDeviceKeyInput(key);
    setDeviceKey(key);
  }, []);

  useEffect(() => {
    if (!transmitting) return;

    const geoHandle = watchGeoPosition(setGeoReading, setGeoStatus);
    let orientationHandle: { stop: () => void } | undefined;
    let batteryHandle: { stop: () => void } | undefined;
    void watchOrientation(setOrientationReading, setOrientationStatus)
      .then((h) => (orientationHandle = h))
      .catch(() => setOrientationStatus("unsupported"));
    void watchBatteryLevel(setBatteryPct)
      .then((h) => (batteryHandle = h))
      .catch(() => setBatteryPct(null));

    const intervalId = setInterval(() => {
      const geo = geoRef.current;
      if (!geo) return; // no GPS fix yet — nothing to send

      void postFieldTelemetry(
        {
          device_id: deviceId,
          lat: geo.lat,
          lon: geo.lon,
          alt_m: geo.altM ?? 0,
          gps_accuracy_m: geo.accuracyM,
          heading_deg: orientationRef.current?.headingDeg ?? null,
          pitch_deg: orientationRef.current?.pitchDeg ?? null,
          roll_deg: orientationRef.current?.rollDeg ?? null,
          battery_pct: batteryRef.current,
        },
        deviceKeyInput,
      )
        .then(() => {
          setLastSentAt(new Date().toISOString());
          setSendError(null);
          setSentCount((c) => c + 1);
        })
        .catch((err: unknown) => setSendError(err instanceof Error ? err.message : "send failed"));
    }, SEND_INTERVAL_MS);

    return () => {
      geoHandle.stop();
      orientationHandle?.stop();
      batteryHandle?.stop();
      clearInterval(intervalId);
    };
    // deviceKeyInput intentionally omitted — re-reading it fresh inside the
    // interval callback (via closure) is fine since it's a stable string
    // ref during a transmit session; restarting watchers on every keystroke
    // in the (disabled-while-transmitting) key input would be wrong anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transmitting, deviceId]);

  useEffect(() => {
    if (!transmitting || !cameraEnabled || !videoRef.current) {
      setCameraStatus("idle");
      return;
    }

    let cancelled = false;
    let handle: { stop: () => void } | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    void startCameraPreview(videoRef.current, setCameraStatus).then((h) => {
      if (cancelled) {
        h.stop();
        return;
      }
      handle = h;
      intervalId = setInterval(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;
        void captureSnapshotBlob(videoEl)
          .then((blob) => {
            if (!blob) return; // no frame yet
            return postFieldSnapshot(blob, deviceId, deviceKeyInput);
          })
          .then(() => setSnapshotSentCount((c) => c + 1))
          .catch((err: unknown) => setSnapshotError(err instanceof Error ? err.message : "snapshot send failed"));
      }, SNAPSHOT_INTERVAL_MS);
    });

    return () => {
      cancelled = true;
      handle?.stop();
      if (intervalId) clearInterval(intervalId);
    };
    // deviceKeyInput omitted for the same reason as the telemetry effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transmitting, cameraEnabled, deviceId]);

  return (
    <StatusPanel
      deviceId={deviceId}
      deviceKey={deviceKeyInput}
      onDeviceKeyChange={saveDeviceKey}
      transmitting={transmitting}
      onToggleTransmit={() => setTransmitting((t) => !t)}
      geoStatus={geoStatus}
      orientationStatus={orientationStatus}
      geoReading={geoReading}
      orientationReading={orientationReading}
      batteryPct={batteryPct}
      lastSentAt={lastSentAt}
      sendError={sendError}
      sentCount={sentCount}
      cameraEnabled={cameraEnabled}
      onCameraEnabledChange={setCameraEnabled}
      cameraStatus={cameraStatus}
      videoRef={videoRef}
      snapshotSentCount={snapshotSentCount}
      snapshotError={snapshotError}
    />
  );
}
