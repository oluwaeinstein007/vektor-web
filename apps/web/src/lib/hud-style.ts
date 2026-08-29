import type { CSSProperties } from "react";

// Shared by every map-overlay HUD panel (LayerPanel, SensorHealthPanel, any
// future one) — a fixed dark tactical palette rather than the app's shared
// shadcn/ui tokens (globals.css). Those are shared across every @vektor/ui
// consumer, but a map overlay HUD is its own visual register regardless of
// the host app's light/dark theme, the same way a real C2 display doesn't
// follow the OS's appearance setting.
export const HUD_PANEL_STYLE: CSSProperties = {
  background: "rgba(11, 18, 32, 0.92)",
  color: "#e5e7eb",
  border: "1px solid #1e293b",
  borderRadius: 4,
  padding: "10px 12px",
  fontSize: 12,
  fontFamily: "ui-monospace, 'Courier New', monospace",
  boxShadow: "0 0 0 1px rgba(59,158,255,0.15), 0 4px 16px rgba(0,0,0,0.5)",
};

export const HUD_PANEL_TITLE_STYLE: CSSProperties = {
  fontWeight: 700,
  letterSpacing: "0.08em",
  fontSize: 11,
  color: "#7dd3fc",
  borderBottom: "1px solid #1e293b",
  paddingBottom: 6,
  marginBottom: 8,
};

// Title row variant for a panel that can collapse (LayerPanel,
// SensorHealthPanel on narrow viewports) — same look as HUD_PANEL_TITLE_STYLE
// but laid out to hold a toggle affordance on the right without a second
// set of one-off styles per panel.
export const HUD_PANEL_TITLE_ROW_STYLE: CSSProperties = {
  ...HUD_PANEL_TITLE_STYLE,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  cursor: "pointer",
  userSelect: "none",
};

// A tap target for the collapse chevron / any icon-only HUD control —
// sized to meet the ~44px touch-target guideline via padding rather than
// growing the visible glyph, so it stays legible at desktop sizes too.
export const HUD_ICON_BUTTON_STYLE: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "inherit",
  cursor: "pointer",
  padding: 8,
  margin: -8,
  lineHeight: 1,
  fontSize: 12,
};
