"use client";

import { useEffect } from "react";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import { AFFILIATION_COLORS } from "@/lib/entity-geojson";
import { toTrackLine, toTrackPoints } from "@/lib/track-geojson";
import { usePlaybackStore } from "@/stores/playback-store";
import { useEntityHistory } from "@/hooks/useEntityHistory";

const LINE_SOURCE_ID = "entity-track";
const POINT_SOURCE_ID = "entity-track-points";
const LINE_LAYER_ID = "entity-track-line";
const POINT_LAYER_ID = "entity-track-points-layer";
const LAYER_IDS = [LINE_LAYER_ID, POINT_LAYER_ID];

/**
 * NW-018 — the track line for the selected entity: where it has actually
 * been across the playback window (UC-2.2).
 *
 * Two sources rather than one: the line is a single LineString whose
 * vertices MapLibre interpolates, while the dots are real observations. An
 * analyst needs to tell those apart — a long straight run between two
 * widely spaced observations is a gap in sensor coverage, not a vehicle
 * driving in a perfect straight line for ten minutes, and drawing only the
 * line hides exactly that distinction.
 */
export function EntityTrackLayer({ map, visible }: { map: MapLibreMap; visible: boolean }) {
  const selectedEntityId = usePlaybackStore((s) => s.selectedEntityId);
  const mode = usePlaybackStore((s) => s.mode);
  const currentTs = usePlaybackStore((s) => s.currentTs);
  const { history } = useEntityHistory(selectedEntityId);

  useEffect(() => {
    if (map.getSource(LINE_SOURCE_ID)) return;

    map.addSource(LINE_SOURCE_ID, { type: "geojson", data: emptyLine() });
    map.addSource(POINT_SOURCE_ID, { type: "geojson", data: emptyPoints() });

    map.addLayer({
      id: LINE_LAYER_ID,
      type: "line",
      source: LINE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2,
        // The part of the track already played is solid; what is still
        // ahead of the scrub head is faded. Without this the operator sees
        // the entity's whole future laid out and cannot tell, at a glance,
        // which way along the line time runs.
        "line-opacity": ["case", ["<=", ["get", "ts"], currentTs], 0.9, 0.25],
      },
    });

    map.addLayer({
      id: POINT_LAYER_ID,
      type: "circle",
      source: POINT_SOURCE_ID,
      paint: {
        "circle-radius": 2.5,
        "circle-color": ["get", "color"],
        "circle-opacity": ["case", ["<=", ["get", "ts"], currentTs], 0.85, 0.2],
      },
    });
  }, [map, currentTs]);

  // The opacity expressions close over currentTs, so they are re-set as the
  // scrub head moves rather than only at layer creation. setPaintProperty
  // is cheap; re-adding the layer every frame would not be.
  useEffect(() => {
    if (!map.getLayer(LINE_LAYER_ID)) return;
    map.setPaintProperty(LINE_LAYER_ID, "line-opacity", [
      "case",
      ["<=", ["get", "ts"], currentTs],
      0.9,
      0.25,
    ]);
    map.setPaintProperty(POINT_LAYER_ID, "circle-opacity", [
      "case",
      ["<=", ["get", "ts"], currentTs],
      0.85,
      0.2,
    ]);
  }, [map, currentTs]);

  useEffect(() => {
    const lineSource = map.getSource(LINE_SOURCE_ID) as GeoJSONSource | undefined;
    const pointSource = map.getSource(POINT_SOURCE_ID) as GeoJSONSource | undefined;
    if (!lineSource || !pointSource) return;

    if (mode !== "historical" || !history || history.points.length === 0) {
      lineSource.setData(emptyLine());
      pointSource.setData(emptyPoints());
      return;
    }

    const color = AFFILIATION_COLORS[history.affiliation];
    lineSource.setData(toTrackLine(history.points, color));
    pointSource.setData(toTrackPoints(history.points, color));
  }, [map, mode, history]);

  useEffect(() => {
    const visibility = visible && mode === "historical" ? "visible" : "none";
    for (const id of LAYER_IDS) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
    }
  }, [map, visible, mode]);

  return null;
}

function emptyLine(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return { type: "FeatureCollection", features: [] };
}

function emptyPoints(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return { type: "FeatureCollection", features: [] };
}
