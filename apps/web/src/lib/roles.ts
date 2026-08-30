// Mirrors vektor-backend/packages/auth/src/roles.ts's ROLES list. Not
// imported directly — that package is a Node-only Fastify plugin (peer dep
// on fastify) with no business being a frontend dependency for six string
// literals. Keep in sync if the backend list ever changes.
export const ROLES = ["Viewer", "Field Operator", "Analyst", "Logistics Officer", "Commander", "SuperAdmin"] as const;

export type Role = (typeof ROLES)[number];
