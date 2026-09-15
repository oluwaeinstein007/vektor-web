"use client";

import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT, decodeTokenClaims, getAuthToken, type DecodedTokenClaims } from "@/lib/auth-token";

/** Re-reads localStorage on mount, and again whenever a token is minted,
 * pasted, or cleared (lib/auth-token.ts's AUTH_CHANGE_EVENT) — AppTopbar's
 * nav lives in the root layout and stays mounted across client-side
 * navigations, so a mount-only read would miss a role change made from
 * Settings without a full page reload. "storage" also picks up a change
 * made from another tab. */
export function useAuthClaims(): DecodedTokenClaims | null {
  const [claims, setClaims] = useState<DecodedTokenClaims | null>(null);

  useEffect(() => {
    const read = () => {
      const token = getAuthToken();
      setClaims(token ? decodeTokenClaims(token) : null);
    };
    read();
    window.addEventListener(AUTH_CHANGE_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return claims;
}
