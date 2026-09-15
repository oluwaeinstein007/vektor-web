"use client";

import { useCallback, useEffect, useState } from "react";
import type { InventoryForecast, InventoryItem } from "@vektor/shared";
import { Badge, Button, Panel } from "@vektor/ui";
import { fetchWithAuth, AuthExpiredError, LOGISTICS_SVC_URL } from "@/lib/api-client";

interface InventoryRow {
  item: InventoryItem;
  forecast: InventoryForecast | null;
}

export function InventoryTable() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<InventoryRow[]>(LOGISTICS_SVC_URL, "/api/v1/logistics/inventory");
      setRows(data);
    } catch (err) {
      setRows([]);
      setError(err instanceof AuthExpiredError ? err.message : err instanceof Error ? err.message : "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Panel tone="hud">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 12 }}>Inventory &amp; depletion forecast</strong>
        <Button type="button" size="sm" variant="outline" disabled={loading} aria-busy={loading} onClick={() => void refresh()}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#ff4d4d", marginBottom: 8 }} aria-live="polite">
          {error}
        </p>
      )}

      {!error && rows.length === 0 && !loading && (
        <p style={{ fontSize: 11, opacity: 0.7 }}>No inventory items synced from the ERP feed yet.</p>
      )}

      {rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th style={{ padding: "4px 8px 4px 0" }}>SKU</th>
                <th style={{ padding: "4px 8px" }}>Name</th>
                <th style={{ padding: "4px 8px" }}>Location</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Qty</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Reorder at</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Hrs to stockout</th>
                <th style={{ padding: "4px 8px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, forecast }) => (
                <tr key={item.item_id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={{ padding: "6px 8px 6px 0", opacity: 0.85 }}>{item.sku}</td>
                  <td style={{ padding: "6px 8px" }}>{item.name}</td>
                  <td style={{ padding: "6px 8px", opacity: 0.7 }}>{item.location}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", opacity: 0.7 }}>{item.reorder_threshold}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>
                    {forecast?.hours_to_stockout != null ? forecast.hours_to_stockout.toFixed(1) : "—"}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    {forecast?.low_stock ? (
                      <Badge variant="destructive">LOW STOCK</Badge>
                    ) : (
                      <Badge variant="outline">ok</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
