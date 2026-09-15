"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@vektor/ui";
import { buildBaseMapStyle, OPENFREEMAP_PLANET_URL } from "@/lib/base-map-style";

const SOURCE_ID = "zone-draw";
const FILL_LAYER = "zone-draw-fill";
const LINE_LAYER = "zone-draw-line";
const POINT_LAYER = "zone-draw-points";

/** Click-to-place vertices on a real map instead of typing lat/lon pairs by
 * hand — emits open-ring [lon, lat] vertices (map order, matching what
 * alert-svc's polygon column actually expects); the caller closes the ring
 * (repeats the first point) only when submitting, not while still editing. */
export function ZonePolygonDrawer({
  vertices,
  onChange,
}: {
  vertices: [number, number][];
  onChange: (vertices: [number, number][]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const verticesRef = useRef(vertices);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  verticesRef.current = vertices;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildBaseMapStyle(process.env.NEXT_PUBLIC_PMTILES_URL ? `pmtiles://${process.env.NEXT_PUBLIC_PMTILES_URL}` : OPENFREEMAP_PLANET_URL),
      center: [0, 0],
      zoom: 2,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: toFeatureCollection(verticesRef.current) });
      map.addLayer({ id: FILL_LAYER, type: "fill", source: SOURCE_ID, filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#7dd3fc", "fill-opacity": 0.15 } });
      map.addLayer({ id: LINE_LAYER, type: "line", source: SOURCE_ID, filter: ["!=", ["geometry-type"], "Point"], paint: { "line-color": "#7dd3fc", "line-width": 2 } });
      map.addLayer({ id: POINT_LAYER, type: "circle", source: SOURCE_ID, filter: ["==", ["geometry-type"], "Point"], paint: { "circle-color": "#7dd3fc", "circle-radius": 4, "circle-stroke-color": "#0a0e16", "circle-stroke-width": 1 } });
      setReady(true);
    });

    map.on("click", (e) => {
      onChangeRef.current([...verticesRef.current, [e.lngLat.lng, e.lngLat.lat]]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Intentionally mount-once: onChange/vertices flow through refs so this
    // effect never tears down and rebuilds the map on every vertex click.
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const source = map.getSource<GeoJSONSource>(SOURCE_ID);
    source?.setData(toFeatureCollection(vertices));
  }, [vertices, ready]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div ref={containerRef} style={{ height: 220, borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
        <span style={{ opacity: 0.7 }}>
          Click the map to place vertices — {vertices.length} placed{vertices.length > 0 && vertices.length < 3 ? " (need ≥3)" : ""}.
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <Button type="button" size="sm" variant="outline" disabled={vertices.length === 0} onClick={() => onChange(vertices.slice(0, -1))}>
            Undo point
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={vertices.length === 0} onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

function toFeatureCollection(vertices: [number, number][]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = vertices.map((v) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: v },
    properties: {},
  }));
  if (vertices.length >= 3) {
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[...vertices, vertices[0]!]] },
      properties: {},
    });
  } else if (vertices.length === 2) {
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: vertices },
      properties: {},
    });
  }
  return { type: "FeatureCollection", features };
}
