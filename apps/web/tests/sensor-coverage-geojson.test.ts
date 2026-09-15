import { test } from "node:test";
import assert from "node:assert/strict";
import { toSensorCoverageFeatureCollection, toSensorLabelPoints } from "../src/lib/sensor-coverage-geojson.ts";
import type { SensorHealth } from "@vektor/shared";

const EARTH_RADIUS_M = 6_371_000;

/** Independent haversine great-circle distance — written separately from
 * sensor-coverage-geojson.ts's destination-point formula so this test isn't
 * tautological against the same math it's checking. */
function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function makeSensor(overrides: Partial<SensorHealth> = {}): SensorHealth {
  return {
    sensor_id: "test-sensor",
    status: "ONLINE",
    latency_ms: 50,
    drop_rate: 0,
    last_heartbeat: new Date().toISOString(),
    position: null,
    coverage_radius_m: null,
    ...overrides,
  };
}

test("every vertex of the coverage ring is approximately the registered radius from the sensor's position", () => {
  const lat = 51.9225;
  const lon = 4.352;
  const radiusM = 40_000;
  const sensor = makeSensor({ position: { lat, lon }, coverage_radius_m: radiusM });

  const fc = toSensorCoverageFeatureCollection(new Map([[sensor.sensor_id, sensor]]));
  assert.equal(fc.features.length, 1);
  const ring = fc.features[0]!.geometry.coordinates[0]!;

  assert.ok(ring.length > 10, "expects a real polygon ring, not a degenerate shape");
  for (const [ringLon, ringLat] of ring) {
    const distance = haversineDistanceM(lat, lon, ringLat!, ringLon!);
    assert.ok(
      Math.abs(distance - radiusM) < radiusM * 0.01,
      `vertex at (${ringLat}, ${ringLon}) is ${distance}m from center, expected ~${radiusM}m`,
    );
  }

  // The ring must actually close (first and last vertex identical) — a
  // valid GeoJSON Polygon linear ring requirement.
  assert.deepEqual(ring[0], ring[ring.length - 1]);
});

test("a sensor with no registered position/radius is excluded from the coverage layer", () => {
  const registered = makeSensor({ sensor_id: "has-coverage", position: { lat: 10, lon: 20 }, coverage_radius_m: 5000 });
  const unregistered = makeSensor({ sensor_id: "no-coverage" });

  const fc = toSensorCoverageFeatureCollection(
    new Map([
      [registered.sensor_id, registered],
      [unregistered.sensor_id, unregistered],
    ]),
  );

  assert.equal(fc.features.length, 1);
  assert.equal(fc.features[0]!.properties?.sensor_id, "has-coverage");
});

test("label points only include sensors with a registered position", () => {
  const registered = makeSensor({ sensor_id: "has-position", position: { lat: 10, lon: 20 }, coverage_radius_m: 5000 });
  const unregistered = makeSensor({ sensor_id: "no-position" });

  const labels = toSensorLabelPoints(
    new Map([
      [registered.sensor_id, registered],
      [unregistered.sensor_id, unregistered],
    ]),
  );

  assert.equal(labels.features.length, 1);
  assert.equal(labels.features[0]!.properties?.label, "HAS-POSITION");
});

test("no sensors produces an empty FeatureCollection, not an error", () => {
  assert.deepEqual(toSensorCoverageFeatureCollection(new Map()), { type: "FeatureCollection", features: [] });
});
