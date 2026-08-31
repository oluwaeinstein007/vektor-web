# field-pwa

A browser-based PWA an operator installs on their own phone to turn it into a live GPS/gyro sensor for VEKTOR — no app store, no native build. Referenced as a placeholder in `vektor-edge`/`vektor-infra` since Phase 0 (`apps/field-pwa`) but never built until now.

Camera/video is deliberately **not** part of this app — a separate live path (an IP Webcam-style RTSP stream from the phone straight into `ingest-svc`'s existing RTSP adapter → `cv-inference-svc`'s YOLOv8 pipeline) covers that, and gives real video + real object detection rather than this app's low-fps snapshot alternative. This app is GPS + orientation only.

## How it fits together

```
phone browser (this app)
  → Geolocation API (lat/lon/alt/accuracy) + DeviceOrientationEvent (heading/pitch/roll)
  → POST /api/v1/field/telemetry (proxied by Vite, see vite.config.ts)
  → ingest-svc's field HTTP endpoint (services/ingest-svc/src/http/app.ts)
  → Kafka {env}.vektor.iot.telemetry, payload.device_class = "phone"
  → fusion-svc's fromIot() (services/fusion-svc/src/pipeline/observationMappers.ts)
  → a FRIENDLY "Personnel.FieldOperator" Entity, same live pipeline AIS/ADS-B/MAVLink tracks use
  → apps/web's dashboard map, live, over the existing Socket.io gateway
```

## Local development

Needs `ingest-svc` running with its field endpoint enabled:

```bash
# from vektor-backend/services/ingest-svc
KAFKA_BROKERS=localhost:19092 \
FIELD_DEVICE_SHARED_SECRET=<pick-a-secret> \
  pnpm start   # field endpoint on :3011 by default (FIELD_INGEST_PORT)
```

Then run this app:

```bash
pnpm dev
```

Geolocation/DeviceOrientation/DeviceMotion all require a secure context — a phone hitting this dev server's LAN IP over plain `http://` gets no permission prompt at all, camera/gyro/GPS just silently do nothing. `vite-plugin-mkcert` gives real local HTTPS automatically; the **first run** on this machine needs an interactive terminal (`mkcert -install` asks for `sudo`) to add its CA to the system trust store — that's a one-time step. In a headless/CI/sandboxed environment with no interactive sudo, set `VEKTOR_FIELD_HTTPS=0` to skip HTTPS entirely (only useful for automated checks against `localhost` with a browser flag like `--unsafely-treat-insecure-origin-as-secure`, not for a real phone).

**If `mkcert -install` fails because no interactive sudo is available** (found running this in a sandboxed dev environment): `vite-plugin-mkcert` re-runs its full install command unconditionally on every `pnpm dev`, so it can't just be pointed at an existing cert to skip the failing step. Work around it by generating a cert directly with the plugin's own `mkcert` binary, skipping `-install` (no system trust store write, so no sudo needed):

```bash
CAROOT=~/.vite-plugin-mkcert ~/.vite-plugin-mkcert/mkcert \
  -key-file ~/.vite-plugin-mkcert/dev.pem -cert-file ~/.vite-plugin-mkcert/cert.pem \
  localhost 127.0.0.1 <this-machine's-LAN-IP>

VITE_HTTPS_CERT=~/.vite-plugin-mkcert/cert.pem VITE_HTTPS_KEY=~/.vite-plugin-mkcert/dev.pem pnpm dev
```

`vite.config.ts` picks up `VITE_HTTPS_CERT`/`VITE_HTTPS_KEY` and uses Vite's own `server.https` directly, skipping the mkcert plugin entirely when set. The resulting cert isn't in any trust store, so a phone visiting it will see a "connection is not private" warning — this is fine to click through (Chrome: Advanced → Proceed) since the page still loads as a real `https://` origin from JavaScript's point of view, which is what Geolocation/DeviceOrientation actually check for.

**To actually use it from a phone**: the phone's browser needs to trust this machine's mkcert CA too — `vite-plugin-mkcert` supports a `mkcertHost`-served CA download link (see its README), or copy `~/.vite-plugin-mkcert/rootCA.pem` from wherever mkcert stored it onto the phone and install it as a trusted certificate (Android: Settings → Security → Encryption & credentials → Install a certificate → CA certificate). Then open `https://<this-machine's-LAN-IP>:5173` on the phone, on the same network.

## Using the app

1. Ask whoever runs `ingest-svc` for the `FIELD_DEVICE_SHARED_SECRET` value and paste it into the "Device key" field — stored in this browser's `localStorage`, entered once per install.
2. Tap **Start transmitting** — this is the point permission prompts for location and motion/orientation appear (Android Chrome doesn't gate `DeviceOrientationEvent` behind an explicit permission call the way iOS Safari 13+ does; this app feature-detects that call defensively regardless, see `src/lib/orientation.ts`).
3. The status readout confirms GPS lock, live heading/pitch/roll, and a running count of successfully sent telemetry updates (every 2s while transmitting).
4. Tap **Stop transmitting** to release the location/orientation watches — also a real battery/data-usage control, not just a UI nicety, since continuous high-accuracy GPS is not cheap on either front.

The phone shows up on `apps/web`'s dashboard map as a friendly track (`Personnel.FieldOperator`) the same way any other live sensor does — no separate UI, it's the same map.
