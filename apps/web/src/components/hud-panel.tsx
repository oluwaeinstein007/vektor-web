"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HUD_PANEL_STYLE, HUD_PANEL_TITLE_ROW_STYLE } from "@/lib/hud-style";

const NARROW_VIEWPORT_QUERY = "(max-width: 640px)";

/**
 * Shared chrome for every floating HUD panel (map layers, sensor health):
 * fixed-anchored via globals.css's `.hud-anchor-*` classes and collapsible
 * by tapping the title bar. Collapsed by default on a narrow viewport —
 * two ~200-300px-tall panels permanently open would otherwise eat most of
 * a phone-sized map view. Desktop keeps the old always-open behavior.
 */
export function HudPanel({
  anchor,
  title,
  minWidth,
  children,
}: {
  anchor: "top-right" | "bottom-left" | "bottom-right";
  title: string;
  minWidth: number;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(NARROW_VIEWPORT_QUERY);
    setCollapsed(mql.matches);
  }, []);

  return (
    <div className={`hud-anchor hud-anchor-${anchor}`} style={{ ...HUD_PANEL_STYLE, minWidth: collapsed ? undefined : minWidth }}>
      <div style={{ ...HUD_PANEL_TITLE_ROW_STYLE, marginBottom: collapsed ? 0 : HUD_PANEL_TITLE_ROW_STYLE.marginBottom }}>
        <span>{title}</span>
        <button
          type="button"
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          onClick={() => setCollapsed((c) => !c)}
          style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 8, margin: -8, fontSize: 11 }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}
