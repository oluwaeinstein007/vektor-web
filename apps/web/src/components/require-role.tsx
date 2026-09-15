"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Panel } from "@vektor/ui";
import { useAuthClaims } from "@/hooks/useAuthClaims";
import { satisfiesRequirement, type RoleRequirement } from "@/lib/rbac";
import { isRole } from "@/lib/roles";

/**
 * Client-side mirror of each service's `app.requireRole(...)` preHandler —
 * gates a whole route's content on the same tier the backend that route
 * talks to already enforces. This is a UX guard, not the security boundary:
 * every real API call still 401s/403s server-side regardless of what this
 * renders, matching coa-panel.tsx's existing Approve/Reject visibility check.
 */
export function RequireRole({ requirement, children }: { requirement: RoleRequirement; children: ReactNode }) {
  const claims = useAuthClaims();
  // useAuthClaims' own token read happens inside an effect (localStorage
  // isn't available during SSR/first paint), so `claims` starts null every
  // load regardless of an existing valid token. Rendering the denial state
  // off that would flash "access restricted" on every single page load
  // before correcting itself a tick later — wait for one mount cycle
  // (which React flushes together with useAuthClaims' own first read) so
  // the decision below is made with real data, not the SSR placeholder.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const role = claims?.role;

  if (!mounted) return null;

  if (!isRole(role)) {
    return (
      <AccessMessage title="Sign in required" body="This page needs a role-bearing session token." />
    );
  }
  if (!satisfiesRequirement(role, requirement)) {
    return (
      <AccessMessage
        title="Access restricted"
        body={`Your role (${role}) doesn't meet this page's access level (${requirement}).`}
      />
    );
  }
  return <>{children}</>;
}

function AccessMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="vektor-page" style={{ display: "grid", placeItems: "center" }}>
      <Panel
        tone="hud"
        style={{ maxWidth: 420, textAlign: "center", fontFamily: "ui-monospace, 'Courier New', monospace" }}
      >
        <p style={{ fontSize: 13, color: "#7dd3fc", letterSpacing: "0.06em", marginBottom: 8 }}>
          {title.toUpperCase()}
        </p>
        <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 14 }}>{body}</p>
        <Link href="/settings" style={{ fontSize: 12, color: "#7dd3fc" }}>
          Go to Settings →
        </Link>
      </Panel>
    </main>
  );
}
