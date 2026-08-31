import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Panel } from "@vektor/ui";
import type { GeoReading, GeoStatus } from "../lib/geolocation";
import type { OrientationReading, OrientationStatus } from "../lib/orientation";

const GEO_STATUS_LABEL: Record<GeoStatus, string> = {
  idle: "IDLE",
  locating: "ACQUIRING FIX…",
  locked: "GPS LOCKED",
  denied: "PERMISSION DENIED",
  unsupported: "NOT SUPPORTED",
};

const GEO_STATUS_VARIANT: Record<GeoStatus, "default" | "secondary" | "destructive" | "outline"> = {
  idle: "outline",
  locating: "outline",
  locked: "secondary",
  denied: "destructive",
  unsupported: "destructive",
};

const ORIENTATION_STATUS_LABEL: Record<OrientationStatus, string> = {
  idle: "IDLE",
  listening: "LIVE",
  denied: "PERMISSION DENIED",
  unsupported: "NOT SUPPORTED",
};

export interface StatusPanelProps {
  deviceId: string;
  deviceKey: string;
  onDeviceKeyChange: (key: string) => void;
  transmitting: boolean;
  onToggleTransmit: () => void;
  geoStatus: GeoStatus;
  orientationStatus: OrientationStatus;
  geoReading: GeoReading | null;
  orientationReading: OrientationReading | null;
  batteryPct: number | null;
  lastSentAt: string | null;
  sendError: string | null;
  sentCount: number;
}

function fmt(n: number | null | undefined, digits = 5): string {
  return n === null || n === undefined ? "—" : n.toFixed(digits);
}

export function StatusPanel(props: StatusPanelProps) {
  const canTransmit = props.deviceKey.trim().length > 0;

  return (
    <main style={{ minHeight: "100dvh", padding: 16, display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 15, letterSpacing: "0.08em", color: "var(--hud-accent)", margin: "4px 0" }}>VEKTOR FIELD</h1>

      <Card tone="hud">
        <CardHeader>
          <CardTitle>Device</CardTitle>
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11 }}>
          <div>
            <span style={{ opacity: 0.7 }}>Device ID</span>
            <div style={{ wordBreak: "break-all" }}>{props.deviceId}</div>
          </div>
          <div>
            <label htmlFor="device-key" style={{ opacity: 0.7, display: "block", marginBottom: 4 }}>
              Device key (from the operator who set up ingest-svc)
            </label>
            <input
              id="device-key"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={props.deviceKey}
              disabled={props.transmitting}
              onChange={(e) => props.onDeviceKeyChange(e.target.value.trim())}
              style={{ width: "100%", fontFamily: "inherit", fontSize: 12, boxSizing: "border-box" }}
            />
          </div>
          <Button type="button" disabled={!canTransmit} aria-busy={props.transmitting} onClick={props.onToggleTransmit}>
            {props.transmitting ? "Stop transmitting" : "Start transmitting"}
          </Button>
          {!canTransmit && <p style={{ opacity: 0.6 }}>Enter the device key before you can start.</p>}
        </CardContent>
      </Card>

      <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>GPS</strong>
          <Badge variant={GEO_STATUS_VARIANT[props.geoStatus]}>{GEO_STATUS_LABEL[props.geoStatus]}</Badge>
        </div>
        <div>Lat / Lon: {fmt(props.geoReading?.lat)} / {fmt(props.geoReading?.lon)}</div>
        <div>Altitude: {fmt(props.geoReading?.altM, 1)} m</div>
        <div>Accuracy: ±{fmt(props.geoReading?.accuracyM, 1)} m</div>
      </Panel>

      <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Orientation</strong>
          <Badge variant={props.orientationStatus === "listening" ? "secondary" : "outline"}>
            {ORIENTATION_STATUS_LABEL[props.orientationStatus]}
          </Badge>
        </div>
        <div>Heading: {fmt(props.orientationReading?.headingDeg, 0)}°</div>
        <div>Pitch: {fmt(props.orientationReading?.pitchDeg, 0)}° · Roll: {fmt(props.orientationReading?.rollDeg, 0)}°</div>
        <div>Battery: {props.batteryPct === null ? "—" : `${props.batteryPct}%`}</div>
      </Panel>

      <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }} aria-live="polite">
        <div>
          Sent: {props.sentCount} {props.lastSentAt && <span style={{ opacity: 0.6 }}>· last at {new Date(props.lastSentAt).toLocaleTimeString()}</span>}
        </div>
        {props.sendError && <div style={{ color: "#ff4d4d" }}>{props.sendError}</div>}
      </Panel>
    </main>
  );
}
