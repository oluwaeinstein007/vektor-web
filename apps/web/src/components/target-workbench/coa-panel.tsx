"use client";

import { useState } from "react";
import type { COA } from "@vektor/shared";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Badge, Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError } from "@/lib/api-client";
import { useAuthClaims } from "@/hooks/useAuthClaims";

const STATUS_VARIANT: Record<COA["status"], "secondary" | "destructive" | "outline"> = {
  APPROVED: "secondary",
  REJECTED: "destructive",
  PENDING: "outline",
};

export function CoaPanel({ targetEntityId }: { targetEntityId: string | null }) {
  const [coa, setCoa] = useState<COA | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const claims = useAuthClaims();
  const isCommander = claims?.role === "Commander" || claims?.role === "SuperAdmin";

  async function generate() {
    if (!targetEntityId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fetchWithAuth<COA>("/api/v1/coa/generate", {
        method: "POST",
        body: JSON.stringify({ target_entity_id: targetEntityId }),
      });
      setCoa(result);
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "COA generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(action: "approve" | "reject", optionRank?: number) {
    if (!coa) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        action === "approve" ? { option_rank: optionRank, notes: null } : { reason: "Rejected from Target Workbench" };
      const result = await fetchWithAuth<COA>(`/api/v1/coa/${coa.coa_id}/${action}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCoa(result);
    } catch (err) {
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : `Couldn't ${action} COA.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel tone="hud" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 12 }}>Course of Action</strong>
        <Button type="button" size="sm" disabled={!targetEntityId || busy} aria-busy={busy} onClick={() => void generate()}>
          Generate COA
        </Button>
      </div>

      {!targetEntityId && <p style={{ fontSize: 11, opacity: 0.7 }}>Select a target from the ranking to generate a course of action.</p>}
      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d" }} aria-live="polite">
          {error}
        </p>
      )}

      {coa && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
            <span>Status:</span>
            <Badge variant={STATUS_VARIANT[coa.status]}>{coa.status}</Badge>
          </div>
          {coa.options.map((opt) => (
            <Card key={opt.rank} tone="hud">
              <CardHeader>
                <CardTitle>
                  #{opt.rank} — {opt.title}
                </CardTitle>
              </CardHeader>
              <CardContent style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 4 }}>
                <p>{opt.rationale}</p>
                <p>
                  Confidence: {(opt.confidence * 100).toFixed(0)}% · Est. duration: {opt.estimated_duration_min}min
                </p>
                {opt.required_assets.length > 0 && <p>Assets: {opt.required_assets.join(", ")}</p>}
              </CardContent>
              {isCommander && coa.status === "PENDING" && (
                <CardFooter>
                  <Button type="button" size="sm" disabled={busy} aria-busy={busy} onClick={() => void decide("approve", opt.rank)}>
                    Approve
                  </Button>
                  <Button type="button" size="sm" variant="destructive" disabled={busy} aria-busy={busy} onClick={() => void decide("reject")}>
                    Reject
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </Panel>
  );
}
