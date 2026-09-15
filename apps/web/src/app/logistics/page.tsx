import { RequireRole } from "@/components/require-role";
import { InventoryTable } from "@/components/logistics/inventory-table";
import { RoutePlanner } from "@/components/logistics/route-planner";

export default function LogisticsPage() {
  return (
    <RequireRole requirement="logistics+">
      <main className="vektor-page" style={{ fontFamily: "ui-monospace, 'Courier New', monospace", color: "#e5e7eb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontSize: 16, marginBottom: 12, color: "#7dd3fc", letterSpacing: "0.06em" }}>Logistics</h1>
          <div className="vektor-page-grid">
            <InventoryTable />
            <RoutePlanner />
          </div>
        </div>
      </main>
    </RequireRole>
  );
}
