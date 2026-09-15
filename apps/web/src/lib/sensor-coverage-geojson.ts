import type { SensorHealth } from "@vektor/shared";

const EARTH_RADIUS_M = 6_371_000;
const CIRCLE_STEPS = 64;

/**
 * Standard spherical destination-point formula (bearing + distance from a
 * start point) — good enough accuracy for visualizing a coverage radius,
 * not survey-grade. fusion-svc reports `coverage_radius_m` as a plain
 * number rather than a precomputed polygon (unlike no-strike zones, which
 * ARE precomputed server-side via PostGIS's ST_Buffer) because a radius is
 * more directly reusable data than a rendered shape — this is the one
 * place in the app that turns a radius into a ring, and it's cheap enough
 * to do per-render client-side.
 */
function destinationPoint(lat: number, lon: number, distanceM: number, bearingDeg: number): [number, number] {
  const angularDistance = distanceM / EARTH_RADIUS_M;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function geodesicCircleRing(lat: number, lon: number, radiusM: number): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i <= CIRCLE_STEPS; i++) {
    ring.push(destinationPoint(lat, lon, radiusM, (i * 360) / CIRCLE_STEPS));
  }
  return ring;
}

/** Only sensors with a registered position/coverage radius render — most sensors never register (see sensor-registry.ts), and a null radius means "no coverage claim," not "zero coverage." */
export function toSensorCoverageFeatureCollection(
  sensors: Map<string, SensorHealth>,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const covered = Array.from(sensors.values()).filter((s) => s.position !== null && s.coverage_radius_m !== null);
  return {
    type: "FeatureCollection",
    features: covered.map((sensor) => ({
      type: "Feature",
      id: sensor.sensor_id,
      geometry: { type: "Polygon", coordinates: [geodesicCircleRing(sensor.position!.lat, sensor.position!.lon, sensor.coverage_radius_m!)] },
      properties: { sensor_id: sensor.sensor_id, status: sensor.status },
    })),
  };
}

export function toSensorLabelPoints(sensors: Map<string, SensorHealth>): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const covered = Array.from(sensors.values()).filter((s) => s.position !== null);
  return {
    type: "FeatureCollection",
    features: covered.map((sensor) => ({
      type: "Feature",
      id: sensor.sensor_id,
      geometry: { type: "Point", coordinates: [sensor.position!.lon, sensor.position!.lat] },
      properties: { label: sensor.sensor_id.toUpperCase() },
    })),
  };
}
