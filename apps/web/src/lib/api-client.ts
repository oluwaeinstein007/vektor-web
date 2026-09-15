import { getAuthToken } from "./auth-token";

// Each RBAC-gated service hosts its own REST API on its own port — these
// match each service's own src/index.ts PORT default.
export const COA_SVC_URL = process.env.NEXT_PUBLIC_COA_SVC_URL ?? "http://localhost:3010";
export const LOGISTICS_SVC_URL = process.env.NEXT_PUBLIC_LOGISTICS_SVC_URL ?? "http://localhost:3014";
export const AUDIT_SVC_URL = process.env.NEXT_PUBLIC_AUDIT_SVC_URL ?? "http://localhost:3009";
export const CV_INFERENCE_SVC_URL = process.env.NEXT_PUBLIC_CV_INFERENCE_SVC_URL ?? "http://localhost:3006";

export class AuthExpiredError extends Error {
  constructor() {
    super("Session expired or missing — mint or paste a token in Settings.");
    this.name = "AuthExpiredError";
  }
}

/**
 * Thin fetch wrapper for a role-gated service REST API: attaches the dev
 * auth bridge token (see lib/auth-token.ts) as a Bearer header and surfaces
 * a 401 as a typed error so callers can prompt "go re-mint a token" instead
 * of silently rendering an empty list. `init.body` is only stamped
 * "application/json" when it's a plain string — a multipart upload passes a
 * FormData body and must keep the browser's own boundary-bearing header.
 */
export async function fetchWithAuth<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });

  if (res.status === 401) throw new AuthExpiredError();
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error(body.error ?? `request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
