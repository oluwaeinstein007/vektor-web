"use client";

import { RequireRole } from "@/components/require-role";
import { AlertQueue } from "@/components/alerts/alert-queue";
import { GeofenceZonesPanel } from "@/components/alerts/geofence-zones-panel";
import { useAuthClaims } from "@/hooks/useAuthClaims";
import { satisfiesRequirement } from "@/lib/rbac";
import { isRole, type Role } from "@/lib/roles";

export default function AlertsPage() {
  return (
    <RequireRole requirement="all">
      <AlertsContent />
    </RequireRole>
  );
}

function AlertsContent() {
  const claims = useAuthClaims();
  const role: Role | undefined = isRole(claims?.role) ? claims.role : undefined;
  const canSeeZones = satisfiesRequirement(role, "analyst+");

  return (
    <main className="vektor-page" style={{ fontFamily: "ui-monospace, 'Courier New', monospace", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 16, marginBottom: 12, color: "#7dd3fc", letterSpacing: "0.06em" }}>Alerts</h1>
        <div className="vektor-page-grid">
          <AlertQueue role={role} />
          {canSeeZones && <GeofenceZonesPanel role={role} />}
        </div>
      </div>
    </main>
  );
}
