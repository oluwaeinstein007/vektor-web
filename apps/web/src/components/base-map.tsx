"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { EntityLayer } from "./entity-layer";
import { NoStrikeZoneLayer } from "./no-strike-zone-layer";
import { SensorHealthPanel } from "./sensor-health-panel";
import { CameraFeedPanel } from "./camera-feed-panel";
import { AppTopbar } from "./app-topbar";
import { HudPanel } from "./hud-panel";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { buildBaseMapStyle, OPENFREEMAP_PLANET_URL } from "@/lib/base-map-style";

export interface MapLayer {
  id: string;
  label: string;
  visible: boolean;
}

// FE-001's "layer system" — a small, real toggle registry other components
// (FE-002's entity layer, alert overlays, etc.) extend by adding entries
// here and a matching MapLibre layer id, not a placeholder.
const INITIAL_LAYERS: MapLayer[] = [
  { id: "entities", label: "Entities", visible: true },
  { id: "sensors", label: "Sensor Coverage", visible: true },
  { id: "no-strike-zones", label: "No-Strike Zones", visible: false },
];

/**
 * PMTiles archive this app serves through — points at map-tile-server
 * (SVC-006) / an EDGE-004 offline map pack. Falls back to OpenFreeMap's
 * free hosted planet vector tiles (same OpenMapTiles schema) when unset, so
 * `pnpm dev` and any deployment without a generated offline pack still
 * renders real worldwide street/place/building detail — not the old
 * MapLibre demo style, whose data only went up to roughly zoom 9-10 and
 * rendered blank past that (see vektor-build-conventions).
 */
const PMTILES_URL = process.env.NEXT_PUBLIC_PMTILES_URL;

export function BaseMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  // Subscribed here, not inside EntityLayer: this runs as soon as the
  // socket connects, independent of the map's "load" event (which can take
  // much longer) — see entity-layer.tsx's comment for why that ordering
  // matters.
  useEntityUpdates((event, error) => console.warn(`[BaseMap] invalid ${event} payload`, error));
  // Separate from mapRef: FE-002's EntityLayer needs to render only once
  // MapLibre has actually finished loading the style (addSource/addLayer
  // throw before that), and a ref change alone doesn't trigger a re-render.
  const [readyMap, setReadyMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildBaseMapStyle(PMTILES_URL ? `pmtiles://${PMTILES_URL}` : OPENFREEMAP_PLANET_URL),
      center: [0, 20],
      zoom: 2,
    });

    mapRef.current = map;
    map.on("load", () => setReadyMap(map));

    // Dev-only escape hatch so tooling (e.g. a Playwright screenshot script)
    // can drive the map without simulating mouse gestures — never present
    // in a production build.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __vektorMap?: MapLibreMap }).__vektorMap = map;
    }

    return () => {
      map.remove();
      maplibregl.removeProtocol("pmtiles");
      mapRef.current = null;
      setReadyMap(null);
    };
  }, []);

  function toggleLayer(id: string) {
    let nextVisible = false;
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== id) return layer;
        nextVisible = !layer.visible;
        return { ...layer, visible: nextVisible };
      }),
    );

    const map = mapRef.current;
    if (!map?.getLayer(id)) return; // no-op until FE-002 actually adds these MapLibre layers
    map.setLayoutProperty(id, "visibility", nextVisible ? "visible" : "none");
  }

  const entityLayerVisible = layers.find((l) => l.id === "entities")?.visible ?? true;
  const noStrikeZonesVisible = layers.find((l) => l.id === "no-strike-zones")?.visible ?? false;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {readyMap && <EntityLayer map={readyMap} visible={entityLayerVisible} />}
      {readyMap && <NoStrikeZoneLayer map={readyMap} visible={noStrikeZonesVisible} />}
      <AppTopbar />
      <LayerPanel layers={layers} onToggle={toggleLayer} />
      <SensorHealthPanel />
      <CameraFeedPanel />
    </div>
  );
}

function LayerPanel({
  layers,
  onToggle,
}: {
  layers: MapLayer[];
  onToggle: (id: string) => void;
}) {
  return (
    <HudPanel anchor="top-right" title="MAP LAYERS" minWidth={168}>
      {layers.map((layer) => (
        <label
          key={layer.id}
          style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", cursor: "pointer", minHeight: 24 }}
        >
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={() => onToggle(layer.id)}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ letterSpacing: "0.02em" }}>{layer.label.toUpperCase()}</span>
        </label>
      ))}
    </HudPanel>
  );
}
