import { RequireRole } from "@/components/require-role";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";
import { ModelUploadPanel } from "@/components/admin/model-upload-panel";

export default function AdminPage() {
  return (
    <RequireRole requirement="superadmin">
      <main className="vektor-page" style={{ fontFamily: "ui-monospace, 'Courier New', monospace", color: "#e5e7eb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontSize: 16, marginBottom: 12, color: "#7dd3fc", letterSpacing: "0.06em" }}>Admin Console</h1>
          <div className="vektor-page-grid">
            <AuditLogViewer />
            <ModelUploadPanel />
          </div>
        </div>
      </main>
    </RequireRole>
  );
}
