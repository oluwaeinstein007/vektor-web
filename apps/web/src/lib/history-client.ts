import {
  EntityHistoryResponse,
  EntitySnapshotResponse,
  HistoryCoverageResponse,
  PatternOfLifeResponse,
} from "@vektor/shared";
import { GEOSPATIAL_SVC_URL, fetchWithAuth, AuthExpiredError } from "./api-client";

/**
 * NW-018 — client for the entity-history read surface (UC-2.2).
 *
 * Every response is parsed through the @vektor/proto Zod schema rather than
 * cast: this is a new API and the UI silently rendering a shape that drifted
 * from the contract is exactly the failure the shared-schema convention
 * exists to prevent.
 */

/**
 * The history API is newer than the rest of geospatial-svc, so a deployment can
 * legitimately be running a build without it. That is a different situation
 * from "the request failed", and the UI has to tell them apart: an absent
 * API means "this feature isn't available on this deployment", a failure
 * means "something is wrong". Collapsing the two produces a time-slider
 * that looks broken on every older deployment.
 */
export class HistoryUnavailableError extends Error {
  constructor() {
    super("This deployment's geospatial-svc has no history API — historical playback is unavailable.");
    this.name = "HistoryUnavailableError";
  }
}

async function getHistory<T>(path: string, schema: { parse: (v: unknown) => T }): Promise<T> {
  try {
    const body = await fetchWithAuth<unknown>(GEOSPATIAL_SVC_URL, path);
    return schema.parse(body);
  } catch (error) {
    if (error instanceof AuthExpiredError) throw error;
    // fetchWithAuth turns a non-2xx into an Error carrying the status text
    // or the service's own error body; a 404 on these paths specifically
    // means the route isn't registered, not that the entity is unknown —
    // the routes return an empty result set for an unknown entity.
    if (error instanceof Error && /\b404\b|not found/i.test(error.message)) {
      throw new HistoryUnavailableError();
    }
    throw error;
  }
}

/** What history exists at all, so the slider can size itself to real data. */
export function fetchHistoryCoverage(): Promise<HistoryCoverageResponse> {
  return getHistory("/api/v1/entities/history/coverage", HistoryCoverageResponse);
}

/** One entity's track line over a window — UC-2.2 proper. */
export function fetchEntityHistory(
  entityId: string,
  from: Date,
  to: Date,
  maxPoints = 2000,
): Promise<EntityHistoryResponse> {
  const q = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    max_points: String(maxPoints),
  });
  return getHistory(`/api/v1/entities/${encodeURIComponent(entityId)}/history?${q}`, EntityHistoryResponse);
}

/**
 * Every entity's last known state at or before `ts` — the time-slider's
 * scrub query. `bbox` is the current viewport, so scrubbing does not pull
 * the whole world's history for a map showing one harbour.
 */
export function fetchSnapshotAt(
  ts: Date,
  bbox?: [number, number, number, number],
  maxStalenessS = 300,
): Promise<EntitySnapshotResponse> {
  const q = new URLSearchParams({ ts: ts.toISOString(), max_staleness_s: String(maxStalenessS) });
  if (bbox) q.set("bbox", bbox.join(","));
  return getHistory(`/api/v1/entities/at?${q}`, EntitySnapshotResponse);
}

/** Dwell clustering for one entity — the pattern-of-life half of NW-018. */
export function fetchPatternOfLife(
  entityId: string,
  from: Date,
  to: Date,
  clusterRadiusM = 150,
  minDwellS = 300,
): Promise<PatternOfLifeResponse> {
  const q = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    cluster_radius_m: String(clusterRadiusM),
    min_dwell_s: String(minDwellS),
  });
  return getHistory(
    `/api/v1/entities/${encodeURIComponent(entityId)}/pattern-of-life?${q}`,
    PatternOfLifeResponse,
  );
}
