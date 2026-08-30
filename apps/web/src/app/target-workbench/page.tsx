"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel } from "@vektor/ui";
import { useRankedEntities } from "@/hooks/useRankedEntities";
import { RankedEntityList } from "@/components/target-workbench/ranked-entity-list";
import { CoaPanel } from "@/components/target-workbench/coa-panel";

function isAuthError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("expired") || m.includes("bearer") || m.includes("token");
}

export default function TargetWorkbenchPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { entities, error, loading } = useRankedEntities(true);

  return (
    <main className="vektor-page" style={{ padding: 20, fontFamily: "ui-monospace, 'Courier New', monospace", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
          <Link href="/">← Map</Link> · <Link href="/settings">Settings</Link>
        </p>
        <h1 style={{ fontSize: 16, marginBottom: 12, color: "#7dd3fc", letterSpacing: "0.06em" }}>Target Workbench</h1>

        {error && (
          <Panel tone="hud" style={{ marginBottom: 12, borderColor: "#ff4d4d" }}>
            <p style={{ fontSize: 12 }} aria-live="polite">
              {error} {isAuthError(error) && <Link href="/settings">Go to Settings →</Link>}
            </p>
          </Panel>
        )}

        <div className="vektor-page-grid">
          <Panel tone="hud">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>Ranked entities</strong>
              {loading && <span style={{ fontSize: 11, opacity: 0.6 }}>refreshing…</span>}
            </div>
            <RankedEntityList entities={entities} selectedId={selectedId} onSelect={setSelectedId} />
          </Panel>

          <CoaPanel targetEntityId={selectedId} />
        </div>
      </div>
    </main>
  );
}
