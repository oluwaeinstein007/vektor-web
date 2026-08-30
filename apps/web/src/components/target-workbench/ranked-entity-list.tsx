"use client";

import { Fragment, useState } from "react";
import type { RankedEntity } from "@vektor/shared";
import { Badge } from "@vektor/ui";

const AFFILIATION_VARIANT: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  FRIENDLY: "secondary",
  HOSTILE: "destructive",
  NEUTRAL: "outline",
  UNKNOWN: "default",
};

export function RankedEntityList({
  entities,
  selectedId,
  onSelect,
}: {
  entities: RankedEntity[];
  selectedId: string | null;
  onSelect: (entityId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entities.length === 0) {
    return <p style={{ fontSize: 12, opacity: 0.7 }}>No active entities to rank.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <caption style={{ textAlign: "left", fontSize: 11, opacity: 0.7, marginBottom: 8 }}>
        Active entities ranked by threat score, highest first
      </caption>
      <thead>
        <tr>
          <th scope="col" style={{ textAlign: "left", padding: "6px 8px" }}>
            Classification
          </th>
          <th scope="col" style={{ textAlign: "left", padding: "6px 8px" }}>
            Affiliation
          </th>
          <th scope="col" style={{ textAlign: "left", padding: "6px 8px" }}>
            Threat
          </th>
          <th scope="col" style={{ textAlign: "left", padding: "6px 8px" }}>
            Factors
          </th>
        </tr>
      </thead>
      <tbody>
        {entities.map((r) => {
          const id = r.entity.entity_id;
          const isSelected = id === selectedId;
          const isExpanded = id === expandedId;
          return (
            <Fragment key={id}>
              <tr
                onClick={() => onSelect(id)}
                style={{
                  cursor: "pointer",
                  background: isSelected ? "rgba(125,211,252,0.14)" : undefined,
                  borderTop: "1px solid var(--hud-border)",
                }}
              >
                <td style={{ padding: "6px 8px" }}>{r.entity.classification}</td>
                <td style={{ padding: "6px 8px" }}>
                  <Badge variant={AFFILIATION_VARIANT[r.entity.affiliation] ?? "default"}>{r.entity.affiliation}</Badge>
                </td>
                <td style={{ padding: "6px 8px", fontWeight: 700 }}>{(r.threat_score * 100).toFixed(0)}%</td>
                <td style={{ padding: "6px 8px" }}>
                  <button
                    type="button"
                    aria-label={
                      isExpanded ? `Hide threat factors for ${r.entity.classification}` : `Show threat factors for ${r.entity.classification}`
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : id);
                    }}
                    style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
                  >
                    {isExpanded ? "▾" : "▸"}
                  </button>
                </td>
              </tr>
              {isExpanded && (
                <tr>
                  <td colSpan={4} style={{ padding: "0 8px 8px" }}>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, opacity: 0.85 }}>
                      {r.factors.map((f) => (
                        <li key={f.name}>
                          {f.name}: weight {f.weight.toFixed(2)} × value {f.value.toFixed(2)} = {f.contribution.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
