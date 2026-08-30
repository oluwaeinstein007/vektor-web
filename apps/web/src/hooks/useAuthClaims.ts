"use client";

import { useEffect, useState } from "react";
import { decodeTokenClaims, getAuthToken, type DecodedTokenClaims } from "@/lib/auth-token";

/** Re-reads localStorage on mount — sufficient given Settings and Target
 * Workbench are separate routes (a full navigation remounts this). */
export function useAuthClaims(): DecodedTokenClaims | null {
  const [claims, setClaims] = useState<DecodedTokenClaims | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    setClaims(token ? decodeTokenClaims(token) : null);
  }, []);

  return claims;
}
