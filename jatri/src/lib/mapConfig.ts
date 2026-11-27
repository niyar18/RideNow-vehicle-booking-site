import type { StyleSpecification } from "maplibre-gl";

/**
 * Common OSM raster source definition.
 */
const OSM_RASTER_SOURCE = {
  type: "raster" as const,
  tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  tileSize: 256,
  maxzoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
};

const OSM_RASTER_LAYER = {
  id: "osm-streets-layer",
  type: "raster" as const,
  source: "osm-streets",
  minzoom: 0,
  paint: {
    "raster-saturation": -0.57,
    "raster-contrast": 0.12,
    "raster-brightness-min": 0.06,
    "raster-brightness-max": 1.0,
  },
};

/**
 * Jaatri Booking Route Map Style Specification.
 * Includes route GeoJSON sources & line layers pre-compiled into the style so they
 * are guaranteed to exist in WebGL from frame 0 with ZERO dynamic layer loading race conditions.
 */
export const ROUTE_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "osm-streets": OSM_RASTER_SOURCE,
    "route-alt-source": {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    },
    "route-source": {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    },
  },
  layers: [
    OSM_RASTER_LAYER,
    // Alternative route casing & core
    {
      id: "route-alt-casing",
      type: "line",
      source: "route-alt-source",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#f3f8f6",
        "line-width": 7.0,
        "line-opacity": 0.8,
      },
    },
    {
      id: "route-alt-core",
      type: "line",
      source: "route-alt-source",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#42627a",
        "line-width": 4.5,
        "line-opacity": 0.85,
      },
    },
    // Primary route casing (crisp white halo against OSM streets)
    {
      id: "route-casing",
      type: "line",
      source: "route-source",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#f3f8f6",
        "line-width": 9.5,
        "line-opacity": 1.0,
      },
    },
    // Primary route core (Midnight line)
    {
      id: "route-core",
      type: "line",
      source: "route-source",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#142238",
        "line-width": 5.5,
        "line-opacity": 1.0,
      },
    },
  ],
};

/**
 * Jaatri Live Tracking Map Style Specification.
 * Includes persistent trip route and driver approach route pre-compiled into style.
 */
export const LIVE_TRACKING_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "osm-streets": OSM_RASTER_SOURCE,
    "trip-route": {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    },
    "driver-route": {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    },
  },
  layers: [
    OSM_RASTER_LAYER,
    // Trip route layers
    {
      id: "trip-casing",
      type: "line",
      source: "trip-route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#f3f8f6",
        "line-width": 9.5,
        "line-opacity": 1.0,
      },
    },
    {
      id: "trip-core",
      type: "line",
      source: "trip-route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#142238",
        "line-width": 5.5,
        "line-opacity": 1.0,
      },
    },
    // Driver approach route layers (dashed)
    {
      id: "driver-casing",
      type: "line",
      source: "driver-route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#f3f8f6",
        "line-width": 8.5,
        "line-opacity": 0.9,
      },
    },
    {
      id: "driver-core",
      type: "line",
      source: "driver-route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#42627a",
        "line-width": 4.5,
        "line-opacity": 0.9,
        "line-dasharray": [1, 2],
      },
    },
  ],
};

// Aliases for seamless backward compatibility
export const UBER_MINIMAL_MAP_STYLE = ROUTE_MAP_STYLE;
export const OSM_MAP_STYLE = ROUTE_MAP_STYLE;
export const VOYAGER_MAP_STYLE = ROUTE_MAP_STYLE;
export const OSM_STANDARD_STYLE = ROUTE_MAP_STYLE;
