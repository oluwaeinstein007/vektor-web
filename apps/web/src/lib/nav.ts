import type { RoleRequirement } from "./rbac";

export interface NavItem {
  href: string;
  label: string;
  requirement: RoleRequirement;
}

// Single source of truth for both AppTopbar's visible links and each route's
// RequireRole guard, driven by the exact same tiers vektor-backend already
// enforces per-service — a link is never shown for a page that then denies
// access, or vice versa. Settings is deliberately not listed here: it's the
// dev-auth bootstrap page and must stay reachable with no role at all.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Map", requirement: "analyst+" },
  { href: "/target-workbench", label: "Target Workbench", requirement: "analyst+" },
  { href: "/alerts", label: "Alerts", requirement: "all" },
  { href: "/logistics", label: "Logistics", requirement: "logistics+" },
  { href: "/admin", label: "Admin", requirement: "superadmin" },
];
