import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppTopbar } from "@/components/app-topbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "VEKTOR",
  description: "Visual Edge & Kinematic Tracking Operations Runtime",
};

// viewport-fit=cover + the maximumScale/userScalable lock below matter more
// here than on a typical page: this is a full-bleed MapLibre canvas that
// already has its own pinch-to-zoom, so letting the browser page itself
// also zoom on a double-tap fights the map's own gesture handling. Safe
// area insets (globals.css's env(safe-area-inset-*) usage) only take effect
// with viewport-fit=cover.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0e16",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppTopbar />
        {children}
      </body>
    </html>
  );
}
