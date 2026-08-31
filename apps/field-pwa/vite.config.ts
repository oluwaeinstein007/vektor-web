import { readFileSync, existsSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mkcert from "vite-plugin-mkcert";
import { VitePWA } from "vite-plugin-pwa";

// Geolocation/DeviceOrientation/DeviceMotion all require a secure context —
// a phone hitting this dev server's LAN IP over plain http:// gets no
// permission prompt at all. mkcert gives real, phone-trustable local HTTPS
// with near-zero config (see the README for the one-time CA-trust step on
// the phone). The dev proxy is the fix for the resulting mixed-content
// problem: this page is only ever HTTPS, but ingest-svc's field endpoint is
// plain HTTP — proxying through Vite's own Node process (server-to-server,
// not subject to browser mixed-content rules) means the phone never talks
// to ingest-svc directly.
const INGEST_SVC_URL = process.env.VITE_INGEST_SVC_URL ?? "http://localhost:3011";

// mkcert's -install step needs interactive sudo to add its CA to the OS
// trust store — vite-plugin-mkcert re-runs that full command unconditionally
// on every start (it doesn't check for already-generated cert files first),
// so it can't just be pointed at an existing cert to skip the sudo step.
// VEKTOR_FIELD_HTTPS=0 disables HTTPS entirely (useful for a quick check
// against `localhost` with a browser flag; useless for a real phone).
//
// Manual-cert path: if VITE_HTTPS_CERT/VITE_HTTPS_KEY point at a cert/key
// pair already generated some other way (e.g. `mkcert -key-file ... -cert-
// file ...` run once, without `-install`, in an environment with no
// interactive sudo — see the README), Vite's own `server.https` uses those
// directly and the mkcert plugin (which would otherwise fight for the same
// role) is skipped.
const enableHttps = process.env.VEKTOR_FIELD_HTTPS !== "0";
const manualCertPath = process.env.VITE_HTTPS_CERT;
const manualKeyPath = process.env.VITE_HTTPS_KEY;
const hasManualCert = Boolean(manualCertPath && manualKeyPath && existsSync(manualCertPath) && existsSync(manualKeyPath));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(enableHttps && !hasManualCert ? [mkcert()] : []),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "VEKTOR Field",
        short_name: "VEKTOR Field",
        description: "Field operator GPS/gyro telemetry — VEKTOR",
        display: "standalone",
        theme_color: "#0a0e16",
        background_color: "#0a0e16",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    }),
  ],
  server: {
    host: true,
    https: hasManualCert ? { cert: readFileSync(manualCertPath!), key: readFileSync(manualKeyPath!) } : undefined,
    proxy: {
      "/api/v1/field": {
        target: INGEST_SVC_URL,
        changeOrigin: true,
      },
    },
  },
});
