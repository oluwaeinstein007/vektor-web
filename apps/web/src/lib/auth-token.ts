const STORAGE_KEY = "vektor.devAuthToken";

// Dispatched whenever the token changes so any always-mounted listener
// (AppTopbar's nav now lives in the root layout, not remounted per route
// like Settings/Target Workbench are) can pick up a role change without
// requiring a full page navigation.
export const AUTH_CHANGE_EVENT = "vektor-auth-changed";

export interface DecodedTokenClaims {
  sub: string;
  role: string | undefined;
  preferred_username: string | undefined;
  exp: number | undefined;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/**
 * Decodes a JWT's payload for display only — no signature verification.
 * coa-svc (via @vektor/auth) is the only thing that actually verifies a
 * token; this just lets the settings screen show what role/expiry a pasted
 * or minted token claims before it's used.
 */
export function decodeTokenClaims(token: string): DecodedTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    const realmAccess = payload.realm_access as { roles?: unknown } | undefined;
    const roles = Array.isArray(realmAccess?.roles) ? realmAccess.roles : [];
    const role = typeof roles[0] === "string" ? roles[0] : undefined;
    return {
      sub: typeof payload.sub === "string" ? payload.sub : "",
      role,
      preferred_username: typeof payload.preferred_username === "string" ? payload.preferred_username : undefined,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}
