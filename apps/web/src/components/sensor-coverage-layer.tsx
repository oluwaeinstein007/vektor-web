"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import { useSensorHealthStore } from "@/stores/sensor-health-store";
import { toSensorCoverageFeatureCollection, toSensorLabelPoints } from "@/lib/sensor-coverage-geojson";

const SOURCE_ID = "sensor-coverage";
const LABEL_SOURCE_ID = "sensor-coverage-labels";
const FILL_LAYER_ID = "sensor-coverage";
const OUTLINE_LAYER_ID = "sensor-coverage-outline";
const LABEL_LAYER_ID = "sensor-coverage-label";
const ALL_LAYER_IDS = [FILL_LAYER_ID, OUTLINE_LAYER_ID, LABEL_LAYER_ID];

/**
 * The "Sensor Coverage" map-layer checkbox has existed since FE-001 (Phase
 * 1) but was a permanent no-op — SensorHealth carried no position/coverage
 * data because nothing ever registered where a sensor actually is (see
 * vektor-proto's sensor-registry.ts header comment). This reads the same
 * useSensorHealthStore the Sensor Health panel already populates from the
 * live socket — no separate fetch — so a sensor's ring appears/updates the
 * instant its next sensor:status arrives, same as EntityLayer.
 */
export function SensorCoverageLayer({ map, visible }: { map: MapLibreMap; visible: boolean }) {
  const sensors = useSensorHealthStore((s) => s.sensors);

  useEffect(() => {
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, { type: "geojson", data: toSensorCoverageFeatureCollection(new Map()) });
    map.addSource(LABEL_SOURCE_ID, { type: "geojson", data: toSensorLabelPoints(new Map()) });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      paint: { "fill-color": "#38bdf8", "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: { "line-color": "#38bdf8", "line-width": 1.5, "line-dasharray": [4, 2] },
    });
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: LABEL_SOURCE_ID,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-font": ["Open Sans Semibold"],
        "text-offset": [0, -1],
        "text-allow-overlap": false,
        "text-optional": true,
      },
      paint: { "text-color": "#7dd3fc", "text-halo-color": "#0b1220", "text-halo-width": 1.2 },
    });
  }, [map]);

  useEffect(() => {
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toSensorCoverageFeatureCollection(sensors));
    const labelSource = map.getSource(LABEL_SOURCE_ID) as GeoJSONSource | undefined;
    labelSource?.setData(toSensorLabelPoints(sensors));
  }, [map, sensors]);

  useEffect(() => {
    const visibility = visible ? "visible" : "none";
    for (const id of ALL_LAYER_IDS) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
    }
  }, [map, visible]);

  return null;
}
