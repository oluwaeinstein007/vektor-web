import type { Role } from "./roles";

// Mirrors vektor-backend/packages/auth/src/roles.ts's RoleRequirement model
// exactly, including its "+" interpretation (Commander/SuperAdmin satisfy
// every "+" tier). The frontend nav and route guards ask the same question
// the backend already answers on every request, rather than inventing a
// second, driftable policy. Keep in sync if the backend model changes.
export type RoleRequirement = "all" | "analyst+" | "logistics+" | "commander" | "superadmin";

const REQUIREMENT_ALLOWS: Record<RoleRequirement, ReadonlySet<Role>> = {
  all: new Set<Role>(["Viewer", "Field Operator", "Analyst", "Logistics Officer", "Commander", "SuperAdmin"]),
  "analyst+": new Set<Role>(["Analyst", "Commander", "SuperAdmin"]),
  "logistics+": new Set<Role>(["Logistics Officer", "Commander", "SuperAdmin"]),
  commander: new Set<Role>(["Commander", "SuperAdmin"]),
  superadmin: new Set<Role>(["SuperAdmin"]),
};

export function satisfiesRequirement(role: Role | undefined, requirement: RoleRequirement): boolean {
  if (!role) return false;
  return REQUIREMENT_ALLOWS[requirement].has(role);
}
