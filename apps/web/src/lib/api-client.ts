import { getAuthToken } from "./auth-token";

// coa-svc hosts the Target Workbench + COA REST API on its own port,
// separate from fusion-svc's gateway (NEXT_PUBLIC_SOCKET_URL) — matches
// coa-svc/src/index.ts's own default (PORT ?? 3010).
export const COA_SVC_URL = process.env.NEXT_PUBLIC_COA_SVC_URL ?? "http://localhost:3010";

export class AuthExpiredError extends Error {
  constructor() {
    super("Session expired or missing — mint or paste a token in Settings.");
    this.name = "AuthExpiredError";
  }
}

/**
 * Thin fetch wrapper for coa-svc's role-gated REST API: attaches the dev
 * auth bridge token (see lib/auth-token.ts) as a Bearer header and surfaces
 * a 401 as a typed error so callers can prompt "go re-mint a token" instead
 * of silently rendering an empty list.
 */
export async function fetchWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${COA_SVC_URL}${path}`, { ...init, headers });

  if (res.status === 401) throw new AuthExpiredError();
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error(body.error ?? `request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
