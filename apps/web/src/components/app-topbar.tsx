"use client";

import Link from "next/link";
import { useSocketStatus, type SocketStatus } from "@/hooks/useSocketStatus";

const STATUS_LABEL: Record<SocketStatus, string> = {
  connected: "LIVE",
  connecting: "CONNECTING",
  disconnected: "OFFLINE",
  unconfigured: "NO GATEWAY",
};

const STATUS_COLOR: Record<SocketStatus, string> = {
  connected: "#22c55e",
  connecting: "#eab308",
  disconnected: "#ff4d4d",
  unconfigured: "#64748b",
};

/**
 * Thin branding + live-connection strip across the top of the dashboard.
 * Before this, there was no on-screen way to tell "no entities are showing
 * up because nothing is happening" apart from "the socket dropped and
 * nobody would know" — every other HUD panel just silently goes stale.
 */
export function AppTopbar() {
  const status = useSocketStatus();

  return (
    <header
      className="hud-topbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        height: "var(--topbar-height)",
        boxSizing: "border-box",
        padding: "0 14px",
        background: "rgba(11, 18, 32, 0.92)",
        borderBottom: "1px solid #1e293b",
        color: "#e5e7eb",
        fontFamily: "ui-monospace, 'Courier New', monospace",
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        <span style={{ fontWeight: 700, letterSpacing: "0.12em", color: "#7dd3fc", fontSize: 13 }}>VEKTOR</span>
        <span
          className="app-topbar-subtitle"
          style={{
            color: "#64748b",
            fontSize: 10,
            letterSpacing: "0.04em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          OPERATOR DASHBOARD
        </span>
      </div>
      <nav aria-label="Primary" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>
          Map
        </Link>
        <Link href="/target-workbench" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>
          Target Workbench
        </Link>
        <Link href="/settings" style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>
          Settings
        </Link>
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: STATUS_COLOR[status],
            boxShadow: `0 0 4px ${STATUS_COLOR[status]}`,
          }}
        />
        <span style={{ letterSpacing: "0.06em", color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>
      </div>
    </header>
  );
}
