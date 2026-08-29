import type { StyleSpecification } from "maplibre-gl";

/**
 * Real zoom-dependent basemap style, replacing the two things base-map.tsx
 * used before: MapLibre's own demo style (demotiles.maplibre.org), whose
 * vector data is only detailed enough to render up to roughly zoom 9-10
 * (past that: a blank canvas, not an error — see vektor-build-conventions),
 * and the PMTiles branch's placeholder "background"-only style (never
 * followed up once EDGE-004 map packs actually landed). Both are why the
 * map only ever showed country-level shapes.
 *
 * Layer/source-layer names follow the OpenMapTiles schema — the same
 * schema EDGE-004's tippecanoe/pmtiles pipeline emits from OSM extracts, so
 * this one style works unchanged against either source below.
 */
const GLYPHS_URL = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
const LABEL_FONT: [string] = ["Open Sans Semibold"];

const COLORS = {
  background: "#0a0e16",
  water: "#0d2438",
  landcover: "#111a13",
  park: "#12241a",
  boundaryCountry: "#3b6fa0",
  boundaryState: "#2a4a66",
  road: "#26344a",
  roadMinor: "#1c2636",
  building: "#1a2432",
  placeText: "#e5e7eb",
  placeTextMinor: "#94a3b8",
  textHalo: "#0b1220",
};

/**
 * @param vectorSourceUrl Either `pmtiles://<url>` (EDGE-004 offline map
 * pack) or a hosted OpenMapTiles-schema TileJSON URL (OpenFreeMap's public,
 * no-API-key planet endpoint, used when no offline pack is configured).
 */
export function buildBaseMapStyle(vectorSourceUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      vektor: { type: "vector", url: vectorSourceUrl },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": COLORS.background } },
      {
        id: "water",
        type: "fill",
        source: "vektor",
        "source-layer": "water",
        paint: { "fill-color": COLORS.water },
      },
      {
        id: "waterway",
        type: "line",
        source: "vektor",
        "source-layer": "waterway",
        minzoom: 8,
        paint: { "line-color": COLORS.water, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 16, 2] },
      },
      {
        id: "landcover",
        type: "fill",
        source: "vektor",
        "source-layer": "landcover",
        minzoom: 5,
        paint: { "fill-color": COLORS.landcover, "fill-opacity": 0.6 },
      },
      {
        id: "park",
        type: "fill",
        source: "vektor",
        "source-layer": "park",
        minzoom: 8,
        paint: { "fill-color": COLORS.park, "fill-opacity": 0.7 },
      },
      {
        id: "boundary-state",
        type: "line",
        source: "vektor",
        "source-layer": "boundary",
        minzoom: 4,
        filter: [">=", ["get", "admin_level"], 3],
        paint: { "line-color": COLORS.boundaryState, "line-width": 0.6, "line-dasharray": [2, 2] },
      },
      {
        id: "boundary-country",
        type: "line",
        source: "vektor",
        "source-layer": "boundary",
        filter: ["<=", ["get", "admin_level"], 2],
        paint: {
          "line-color": COLORS.boundaryCountry,
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 10, 1.6],
        },
      },
      {
        id: "road-major",
        type: "line",
        source: "vektor",
        "source-layer": "transportation",
        minzoom: 4,
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLORS.road,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 10, 1.5, 16, 5],
        },
      },
      {
        id: "road-minor",
        type: "line",
        source: "vektor",
        "source-layer": "transportation",
        minzoom: 11,
        filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary", "minor", "service"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLORS.roadMinor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 16, 3],
        },
      },
      {
        id: "building",
        type: "fill",
        source: "vektor",
        "source-layer": "building",
        minzoom: 15,
        paint: { "fill-color": COLORS.building, "fill-outline-color": COLORS.road, "fill-opacity": 0.9 },
      },
      {
        id: "road-label",
        type: "symbol",
        source: "vektor",
        "source-layer": "transportation_name",
        minzoom: 13,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": LABEL_FONT,
          "text-size": 10,
        },
        paint: { "text-color": COLORS.placeTextMinor, "text-halo-color": COLORS.textHalo, "text-halo-width": 1 },
      },
      // Split by place tier rather than one layer with a class-keyed
      // `match`/`interpolate` combo: MapLibre rejects any style expression
      // containing more than one zoom-based interpolate/step subexpression,
      // even nested inside separate `match` branches (found via real
      // browser verification — the combined layer threw at style-load
      // time). One layer per tier also means each tier's zoom range is a
      // plain `minzoom`/`maxzoom` instead of a `case` filter re-deriving
      // the same zoom logic.
      {
        id: "place-label-country",
        type: "symbol",
        source: "vektor",
        "source-layer": "place",
        filter: ["==", ["get", "class"], "country"],
        layout: {
          "text-field": ["get", "name"],
          "text-font": LABEL_FONT,
          "text-size": ["interpolate", ["linear"], ["zoom"], 0, 10, 6, 15],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.08,
        },
        paint: { "text-color": COLORS.placeText, "text-halo-color": COLORS.textHalo, "text-halo-width": 1.3 },
      },
      {
        id: "place-label-state",
        type: "symbol",
        source: "vektor",
        "source-layer": "place",
        minzoom: 3,
        filter: ["==", ["get", "class"], "state"],
        layout: { "text-field": ["get", "name"], "text-font": LABEL_FONT, "text-size": 12 },
        paint: { "text-color": COLORS.placeTextMinor, "text-halo-color": COLORS.textHalo, "text-halo-width": 1.3 },
      },
      {
        id: "place-label-city",
        type: "symbol",
        source: "vektor",
        "source-layer": "place",
        minzoom: 2,
        filter: ["==", ["get", "class"], "city"],
        layout: {
          "text-field": ["get", "name"],
          "text-font": LABEL_FONT,
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 9, 10, 15],
        },
        paint: { "text-color": COLORS.placeTextMinor, "text-halo-color": COLORS.textHalo, "text-halo-width": 1.3 },
      },
      {
        id: "place-label-town",
        type: "symbol",
        source: "vektor",
        "source-layer": "place",
        minzoom: 7,
        filter: ["==", ["get", "class"], "town"],
        layout: { "text-field": ["get", "name"], "text-font": LABEL_FONT, "text-size": 11 },
        paint: { "text-color": COLORS.placeTextMinor, "text-halo-color": COLORS.textHalo, "text-halo-width": 1.3 },
      },
      {
        id: "place-label-local",
        type: "symbol",
        source: "vektor",
        "source-layer": "place",
        minzoom: 10,
        filter: ["in", ["get", "class"], ["literal", ["village", "suburb", "neighbourhood", "hamlet"]]],
        layout: { "text-field": ["get", "name"], "text-font": LABEL_FONT, "text-size": 10 },
        paint: { "text-color": COLORS.placeTextMinor, "text-halo-color": COLORS.textHalo, "text-halo-width": 1.3 },
      },
    ],
  };
}

/**
 * OpenFreeMap's free, no-API-key, self-hostable planet vector tile endpoint
 * — same OpenMapTiles schema as EDGE-004's offline packs, used as the
 * default source so `pnpm dev` (and any deployment without a generated
 * offline pack) renders real worldwide detail instead of a demo/coarse
 * stand-in.
 */
export const OPENFREEMAP_PLANET_URL = "https://tiles.openfreemap.org/planet";
