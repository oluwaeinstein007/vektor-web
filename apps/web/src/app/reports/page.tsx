import { RequireRole } from "@/components/require-role";
import { ReportGenerator } from "@/components/reports/report-generator";
import { DataExport } from "@/components/reports/data-export";

export default function ReportsPage() {
  return (
    <RequireRole requirement="analyst+">
      <main className="vektor-page" style={{ fontFamily: "ui-monospace, 'Courier New', monospace", color: "#e5e7eb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontSize: 16, marginBottom: 12, color: "#7dd3fc", letterSpacing: "0.06em" }}>Reports</h1>
          <div className="vektor-page-grid">
            <ReportGenerator />
            <DataExport />
          </div>
        </div>
      </main>
    </RequireRole>
  );
}
