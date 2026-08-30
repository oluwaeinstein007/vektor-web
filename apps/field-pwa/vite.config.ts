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
// trust store — fine on an operator's own machine (see the README's
// walkthrough), but unavailable in a headless/CI/sandboxed environment.
// VEKTOR_FIELD_HTTPS=0 skips it for exactly that case; every real run
// (including the phone walkthrough) wants it on, so that's the default.
const enableHttps = process.env.VEKTOR_FIELD_HTTPS !== "0";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(enableHttps ? [mkcert()] : []),
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
    proxy: {
      "/api/v1/field": {
        target: INGEST_SVC_URL,
        changeOrigin: true,
      },
    },
  },
});
