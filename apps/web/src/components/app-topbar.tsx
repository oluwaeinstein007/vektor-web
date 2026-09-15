"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSocketStatus, type SocketStatus } from "@/hooks/useSocketStatus";
import { useAuthClaims } from "@/hooks/useAuthClaims";
import { satisfiesRequirement } from "@/lib/rbac";
import { isRole } from "@/lib/roles";
import { NAV_ITEMS } from "@/lib/nav";

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
 * Thin branding + role-gated nav + live-connection strip, rendered once from
 * the root layout so it's present (and consistent) on every route. Links
 * are filtered by the same RoleRequirement tiers each destination's
 * RequireRole guard checks (lib/nav.ts) — a link a role can't act on simply
 * isn't shown, rather than being shown and then denying. Settings is
 * deliberately always visible: it's the dev-auth bootstrap page, reachable
 * with no role at all.
 */
export function AppTopbar() {
  const status = useSocketStatus();
  const claims = useAuthClaims();
  // See require-role.tsx's identical `mounted` guard — without it every
  // load flashes a Settings-only nav for one tick before the real token's
  // role resolves, even when a valid session already exists.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const role = mounted && isRole(claims?.role) ? claims.role : undefined;
  const visibleItems = NAV_ITEMS.filter((item) => satisfiesRequirement(role, item.requirement));

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
        {role && (
          <span style={{ color: "#64748b", fontSize: 10, letterSpacing: "0.04em", flexShrink: 0 }}>· {role}</span>
        )}
      </div>
      <nav aria-label="Primary" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
        {visibleItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ color: "inherit", textDecoration: "none", opacity: 0.85 }}>
            {item.label}
          </Link>
        ))}
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
