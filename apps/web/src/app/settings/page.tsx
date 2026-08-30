"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@vektor/ui";
import { setAuthToken, getAuthToken, clearAuthToken, decodeTokenClaims } from "@/lib/auth-token";
import { ROLES, type Role } from "@/lib/roles";

const DEV_AUTH_BRIDGE_URL = process.env.NEXT_PUBLIC_DEV_AUTH_BRIDGE_URL ?? "http://localhost:4477";

export default function SettingsPage() {
  const [role, setRole] = useState<Role>("Commander");
  const [pasted, setPasted] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());

  const claims = token ? decodeTokenClaims(token) : null;

  async function mint() {
    setStatus("Minting…");
    try {
      const res = await fetch(`${DEV_AUTH_BRIDGE_URL}/mint?role=${encodeURIComponent(role)}&sub=dev-operator`);
      if (!res.ok) throw new Error(`bridge returned ${res.status}`);
      const data = (await res.json()) as { token: string };
      setAuthToken(data.token);
      setToken(data.token);
      setStatus(`Minted a ${role} token.`);
    } catch (err) {
      setStatus(
        `Couldn't reach the dev auth bridge at ${DEV_AUTH_BRIDGE_URL} — is it running? ` +
          `(pnpm --filter @vektor/auth dev:auth-bridge) ${err instanceof Error ? err.message : ""}`,
      );
    }
  }

  function save() {
    if (!pasted.trim()) return;
    setAuthToken(pasted.trim());
    setToken(pasted.trim());
    setPasted("");
    setStatus("Token saved.");
  }

  function clear() {
    clearAuthToken();
    setToken(null);
    setStatus("Token cleared.");
  }

  return (
    <main className="vektor-page" style={{ padding: 20, fontFamily: "ui-monospace, 'Courier New', monospace", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
          <Link href="/">← Map</Link> · <Link href="/target-workbench">Target Workbench</Link>
        </p>
        <h1 style={{ fontSize: 16, marginBottom: 12, color: "#7dd3fc", letterSpacing: "0.06em" }}>Settings</h1>

        <Card tone="hud">
          <CardHeader>
            <CardTitle>Dev auth — local only</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 11 }}>
            <p style={{ opacity: 0.75 }}>
              coa-svc requires a role-bearing token for every request. This mints one from a local stand-in for Keycloak SSO
              — for development only, never point this at anything but your own machine.
            </p>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label htmlFor="role-select">Role</label>
              <select id="role-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" onClick={() => void mint()}>
                Mint via dev bridge
              </Button>
            </div>

            <div>
              <label htmlFor="paste-token" style={{ display: "block", marginBottom: 4 }}>
                …or paste a token minted elsewhere
              </label>
              <textarea
                id="paste-token"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={3}
                style={{ width: "100%", fontFamily: "inherit", fontSize: 11 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Button type="button" size="sm" variant="outline" onClick={save}>
                  Save pasted token
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={clear}>
                  Clear token
                </Button>
              </div>
            </div>

            {status && (
              <p aria-live="polite" style={{ opacity: 0.85 }}>
                {status}
              </p>
            )}

            {claims && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span>Active:</span>
                <Badge tone="hud">{claims.role ?? "unknown role"}</Badge>
                <span style={{ opacity: 0.6 }}>{claims.exp ? `expires ${new Date(claims.exp * 1000).toLocaleTimeString()}` : ""}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
