import type { EntityHistoryPoint } from "@vektor/shared";

/**
 * NW-018 — pure GeoJSON builders for an entity's historical track.
 *
 * Lives in lib/ rather than beside the layer component for the same reason
 * entity-geojson.ts does: these are pure functions with real edge cases
 * (empty tracks, single-point tracks, sparse arrays) and the test runner
 * (`node --experimental-strip-types`) cannot load a .tsx file.
 */

/**
 * One LineString per consecutive pair of points, rather than one LineString
 * for the whole track. The per-segment `ts` is what lets the layer's paint
 * expression fade the not-yet-played portion — a single feature has one
 * property value and could only be all-played or all-unplayed.
 */
export function toTrackLine(
  points: EntityHistoryPoint[],
  color: string,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (let i = 1; i < points.length; i++) {
    // Indexed access is `T | undefined` under this project's
    // noUncheckedIndexedAccess; skipping rather than asserting keeps a
    // sparse array from producing a NaN coordinate MapLibre silently drops.
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] },
      // The segment is "played" once the LATER of its two endpoints has
      // been reached, so a segment is never drawn as complete before the
      // entity actually finished traversing it.
      properties: { ts: Date.parse(b.ts), color },
    });
  }
  return { type: "FeatureCollection", features };
}

/**
 * Every real observation as its own dot. An analyst needs these separate
 * from the line: a long straight run between two widely spaced
 * observations is a gap in sensor coverage, not a vehicle driving in a
 * perfect straight line for ten minutes, and drawing only the interpolated
 * line hides exactly that distinction.
 */
export function toTrackPoints(
  points: EntityHistoryPoint[],
  color: string,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { ts: Date.parse(p.ts), color, speed_kmh: p.speed_kmh },
    })),
  };
}
