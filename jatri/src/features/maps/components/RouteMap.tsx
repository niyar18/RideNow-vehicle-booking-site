"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Plus, Minus, RotateCcw, MapPin, Check, X, Loader2 } from "lucide-react";
import { UBER_MINIMAL_MAP_STYLE } from "@/lib/mapConfig";

type Props = {
  pickup: string;
  drop: string;
  pickupCoords?: [number, number] | null;
  dropCoords?: [number, number] | null;
  userCoords?: [number, number] | null;
  onDistance?: (km: number) => void;
  onChange?: (
    pickup: string,
    drop: string,
    p1?: [number, number] | null,
    p2?: [number, number] | null,
    pickupCountry?: string | null,
    pickupDetails?: any,
    dropDetails?: any
  ) => void;
  onCoordinatesChange?: (
    p1: [number, number] | null,
    p2: [number, number] | null
  ) => void;
  vehicles?: any[];
  disableFallbackGeocode?: boolean;
  smartPickups?: any[];
  onSelectSmartPickup?: (spot: any) => void;
  stops?: Array<{ address: string; lat: number; lng: number }>;
  bottomPadding?: number;
  hideMapControls?: boolean;
  compactRouteSummary?: boolean;
  selectionMode?: "none" | "pickup" | "drop";
  onSelectionModeChange?: (mode: "none" | "pickup" | "drop") => void;
  onConfirmPinSelection?: (
    mode: "pickup" | "drop",
    coords: [number, number],
    address: string,
    details?: any
  ) => void;
};

/* ─── DOM MARKER GENERATORS (ELEVATED STEM ZERO-COLLISION CALLOUTS) ─────── */

function createPickupEl(locationName?: string, durationMin?: number | null): HTMLElement {
  const el = document.createElement("div");
  el.className = "cursor-grab active:cursor-grabbing select-none flex flex-col items-center pointer-events-auto";
  el.style.zIndex = "1000";

  const rawTitle = (locationName || "").split(",")[0].trim();
  const cleanTitle = rawTitle && rawTitle.length > 0 ? (rawTitle.length > 20 ? rawTitle.slice(0, 18) + "…" : rawTitle) : "Pickup";
  const etaBadge = durationMin && durationMin > 0 ? ` • ${durationMin} min` : "";

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;position:relative;z-index:1000;filter:drop-shadow(0 4px 10px rgba(18,61,50,0.18));transform:translateY(3px);">
      <!-- Elevated Callout Badge (Jaatri Emerald & Ivory Design) -->
      <div style="
        background: var(--surface-raised);
        color: var(--text-primary);
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: -0.01em;
        white-space: nowrap;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 12px rgba(18,61,50,0.15);
        border: 1.5px solid var(--border-default);
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--accent-mint);display:inline-block;flex-shrink:0;box-shadow:0 0 0 2px rgba(4,106,56,0.2);"></span>
        <span>${cleanTitle}</span>
        ${etaBadge ? `<span style="color:var(--text-primary);font-size:9px;font-weight:700;">${etaBadge}</span>` : ""}
      </div>

      <!-- Hairline Elevated Stem -->
      <div style="
        width: 2px;
        height: 6px;
        background: #142238;
      "></div>

      <!-- Precision Road Contact Anchor Circle -->
      <div style="
        width: 7px;
        height: 7px;
        background: #142238;
        border-radius: 50%;
        border: 1.5px solid #ffffff;
        box-shadow: 0 0 0 1px #142238;
      "></div>
    </div>
  `;
  return el;
}

function createDropEl(locationName?: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "cursor-grab active:cursor-grabbing select-none flex flex-col items-center pointer-events-auto";
  el.style.zIndex = "1000";

  const rawTitle = (locationName || "").split(",")[0].trim();
  const cleanTitle = rawTitle && rawTitle.length > 0 ? (rawTitle.length > 20 ? rawTitle.slice(0, 18) + "…" : rawTitle) : "Drop";

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;position:relative;z-index:1000;filter:drop-shadow(0 4px 10px rgba(227,66,34,0.18));transform:translateY(2px);">
      <!-- Elevated Callout Badge (Jaatri Assamese Vermilion Accent) -->
      <div style="
        background: var(--brand-primary);
        color: var(--on-primary);
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: -0.01em;
        white-space: nowrap;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 12px rgba(18,61,50,0.25);
        border: 1.5px solid var(--on-primary);
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="width:7px;height:7px;border-radius:50%;background:#E34222;display:inline-block;flex-shrink:0;box-shadow:0 0 0 2px rgba(227,66,34,0.35);"></span>
        <span>${cleanTitle}</span>
      </div>

      <!-- Hairline Elevated Stem -->
      <div style="
        width: 2px;
        height: 6px;
        background: #E34222;
      "></div>

      <!-- Precision Road Contact Anchor Circle -->
      <div style="
        width: 7px;
        height: 7px;
        background: #E34222;
        border-radius: 50%;
        border: 1.5px solid #ffffff;
        box-shadow: 0 0 0 1px #E34222;
      "></div>
    </div>
  `;
  return el;
}

function createStopEl(index: number): HTMLElement {
  const el = document.createElement("div");
  el.style.zIndex = "1000";
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 8px rgba(18,61,50,0.2));">
      <div style="
        background:var(--brand-primary);color:var(--on-primary);
        padding:3px 8px;border-radius:6px;
        font-size:9px;font-weight:900;
        white-space:nowrap;
        border:1.5px solid #DED7CA;
        box-shadow:0 2px 8px rgba(0,0,0,0.2);
      ">STOP ${index + 1}</div>
      <div style="width:2px;height:6px;background:#123D32;"></div>
      <div style="
        width:7px;height:7px;background:#123D32;border-radius:50%;
        border:1.5px solid #ffffff;
      "></div>
    </div>
  `;
  return el;
}

/**
 * Google Maps Style Pulsing Current Location GPS Beacon
 */
function createCurrentLocationEl(): HTMLElement {
  const el = document.createElement("div");
  el.className = "select-none pointer-events-none";
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;position:relative;width:34px;height:34px;">
      <!-- Google Maps Pulsing Accuracy Halo -->
      <div style="position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(37,99,235,0.22);animation:pulse 2s infinite ease-in-out;"></div>
      <!-- Crisp White Outer Ring -->
      <div style="position:relative;width:16px;height:16px;border-radius:50%;background:#ffffff;box-shadow:0 1px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <!-- Vibrant Google Blue Core -->
        <div style="width:10px;height:10px;border-radius:50%;background:#1d4ed8;"></div>
      </div>
    </div>
  `;
  return el;
}

/**
 * Sleek Top-Down / Isometric Dispatch Vehicle Silhouette
 */
function createVehicleMapMarkerEl(type?: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "select-none pointer-events-none";
  const normalized = (type || "").toLowerCase();
  const isAuto = normalized === "auto";
  const isBike = normalized === "bike" || normalized === "scooty";
  const isTruck = normalized === "loading" || normalized === "truck" || normalized === "pickup_truck" || normalized === "tata_ace";
  const isSuv = normalized === "suv" || normalized === "xl";

  if (isBike) {
    el.innerHTML = `
      <div style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3));width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#09090b" stroke-width="2.4" stroke-linecap="round">
          <circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 18l4-7h4l4 7"/><path d="M12 11V7h3"/>
        </svg>
      </div>
    `;
  } else if (isAuto) {
    el.innerHTML = `
      <div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.32));width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
        <svg width="26" height="24" viewBox="0 0 28 26" fill="none">
          <rect x="4" y="3" width="20" height="15" rx="3" fill="#09090b" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="6" y="5" width="16" height="5" rx="1.5" fill="#fbbf24"/>
          <circle cx="7" cy="21" r="2.5" fill="#09090b" stroke="#ffffff" stroke-width="1"/>
          <circle cx="21" cy="21" r="2.5" fill="#09090b" stroke="#ffffff" stroke-width="1"/>
        </svg>
      </div>
    `;
  } else if (isTruck) {
    el.innerHTML = `
      <div style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.38));width:26px;height:34px;display:flex;align-items:center;justify-content:center;">
        <svg width="24" height="32" viewBox="0 0 24 36" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="2" fill="#18181b" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="4" y="22" width="16" height="11" rx="3" fill="#09090b" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="6" y="24" width="12" height="4" rx="1" fill="#f59e0b" fill-opacity="0.9"/>
          <circle cx="5" cy="5" r="1.5" fill="#ffffff"/>
          <circle cx="19" cy="5" r="1.5" fill="#ffffff"/>
        </svg>
      </div>
    `;
  } else if (isSuv) {
    el.innerHTML = `
      <div style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.38));width:26px;height:32px;display:flex;align-items:center;justify-content:center;">
        <svg width="22" height="30" viewBox="0 0 26 38" fill="none">
          <rect x="2.5" y="3" width="21" height="32" rx="5" fill="#09090b" stroke="#ffffff" stroke-width="1.6"/>
          <rect x="4.5" y="7" width="17" height="7" rx="2" fill="#6366f1" fill-opacity="0.85"/>
          <rect x="4.5" y="24" width="17" height="6" rx="2" fill="#6366f1" fill-opacity="0.85"/>
          <circle cx="6" cy="4.5" r="1.5" fill="#fef08a"/>
          <circle cx="20" cy="4.5" r="1.5" fill="#fef08a"/>
        </svg>
      </div>
    `;
  } else {
    // Sleek Dispatch Sedan/Car
    el.innerHTML = `
      <div style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.35));width:24px;height:30px;display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="28" viewBox="0 0 24 36" fill="none">
          <rect x="3" y="4" width="18" height="28" rx="4.5" fill="#09090b" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="5" y="8" width="14" height="6" rx="2" fill="#38bdf8" fill-opacity="0.85"/>
          <rect x="5" y="22" width="14" height="5" rx="1.5" fill="#38bdf8" fill-opacity="0.85"/>
          <circle cx="6" cy="5.5" r="1.5" fill="#fef08a"/>
          <circle cx="18" cy="5.5" r="1.5" fill="#fef08a"/>
        </svg>
      </div>
    `;
  }
  return el;
}

function ensureRouteLayers(map: maplibregl.Map): boolean {
  if (!map) return false;

  try {
    // 1. Alternative Route Source & Layers
    if (!map.getSource("route-alt-source")) {
      map.addSource("route-alt-source", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });
    }

    if (!map.getLayer("route-alt-casing")) {
      map.addLayer({
        id: "route-alt-casing",
        type: "line",
        source: "route-alt-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 7.0,
          "line-opacity": 0.8,
        },
      });
    }

    if (!map.getLayer("route-alt-core")) {
      map.addLayer({
        id: "route-alt-core",
        type: "line",
        source: "route-alt-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#94a3b8",
          "line-width": 4.5,
          "line-opacity": 0.85,
        },
      });
    }

    // 2. Primary Route Source & Layers (Vivid, road-following Google Maps style)
    if (!map.getSource("route-source")) {
      map.addSource("route-source", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });
    }

    // White halo casing for maximum contrast over OSM roads
    if (!map.getLayer("route-casing")) {
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 9.5,
          "line-opacity": 1.0,
        },
      });
    }

    // Core road polyline — Jaatri Emerald brand line
    if (!map.getLayer("route-core")) {
      map.addLayer({
        id: "route-core",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#142238",
          "line-width": 5.5,
          "line-opacity": 1.0,
        },
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

export default function RouteMap({
  pickup,
  drop,
  pickupCoords,
  dropCoords,
  userCoords,
  onDistance,
  onChange,
  onCoordinatesChange,
  vehicles,
  disableFallbackGeocode = false,
  smartPickups,
  onSelectSmartPickup,
  stops,
  bottomPadding = 340,
  hideMapControls = false,
  compactRouteSummary = false,
  selectionMode,
  onSelectionModeChange,
  onConfirmPinSelection,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropMarkerRef = useRef<maplibregl.Marker | null>(null);
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const vehicleMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routeRetryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRouteCoordsRef = useRef<[number, number][]>([]);
  const lastAltCoordsRef = useRef<[number, number][]>([]);
  const lastRouteKeyRef = useRef<string>("");
  const hasFittedRouteRef = useRef<string | null>(null);
  const prevActivePinModeRef = useRef<"pickup" | "drop" | null>(null);

  const svgCasingRef = useRef<SVGPathElement | null>(null);
  const svgCoreRef = useRef<SVGPathElement | null>(null);
  const svgAltCasingRef = useRef<SVGPathElement | null>(null);
  const svgAltCoreRef = useRef<SVGPathElement | null>(null);

  const [p1, setP1] = useState<[number, number] | null>(pickupCoords ?? null);
  const [p2, setP2] = useState<[number, number] | null>(dropCoords ?? null);
  const [km, setKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Centralized Fixed Pin Mode state machine
  const [activePinMode, setActivePinMode] = useState<"pickup" | "drop" | null>(
    selectionMode && selectionMode !== "none" ? selectionMode : null
  );
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [pinAddress, setPinAddress] = useState<string>("");
  const [pinDetails, setPinDetails] = useState<any>(null);
  const [isPinGeocoding, setIsPinGeocoding] = useState(false);
  const reverseGeocodeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pinGeocodeTokenRef = useRef<number>(0);

  // Sync coords strictly from explicit parent coordinates
  useEffect(() => {
    setP1(pickupCoords ?? null);
  }, [pickupCoords]);

  useEffect(() => {
    setP2(dropCoords ?? null);
  }, [dropCoords]);

  // Synchronize selectionMode from parent prop
  useEffect(() => {
    if (selectionMode !== undefined) {
      const target = selectionMode === "none" ? null : selectionMode;
      setActivePinMode(target);
    }
  }, [selectionMode]);

  /* ─── GEOCODE ADDRESS WITH PROXIMITY BIAS ─── */
  const geocodeAddress = async (
    q: string,
    biasPt?: [number, number] | null
  ): Promise<[number, number] | null> => {
    if (!q || q.trim().length < 2) return null;
    try {
      let url = `/api/places?action=geocode&address=${encodeURIComponent(q.trim())}`;
      if (biasPt) {
        url += `&lat=${biasPt[0]}&lng=${biasPt[1]}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data?.results?.length) {
        const loc = data.results[0].geometry?.location;
        if (loc?.lat && loc?.lng) {
          return [loc.lat, loc.lng];
        }
      }
    } catch (err) {
      console.error("Geocoding failed for", q, err);
    }
    return null;
  };

  /* ─── REVERSE GEOCODE WITH STRUCTURED DETAILS ─── */
  const reverseGeocodeFull = useCallback(
    async (lat: number, lon: number): Promise<{ address: string; details: any }> => {
      try {
        const r = await fetch(`/api/places?action=geocode&lat=${lat}&lng=${lon}`);
        const d = await r.json();
        if (d?.results?.length) {
          const first = d.results[0];
          const countryCode = first.address_components?.find((c: any) => c.types?.includes("country"))?.short_name || "in";
          const addr = first.formatted_address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          return {
            address: addr,
            details: {
              name: first.name || addr.split(",")[0],
              formattedAddress: addr,
              locality: first.locality || "",
              city: first.city || "",
              state: first.state || "",
              postalCode: first.postalCode || "",
              countrycode: countryCode,
              coordinates: [lat, lon],
            },
          };
        }
      } catch (err) {
        console.error("Reverse geocode failed:", err);
      }
      const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      return {
        address: fallback,
        details: {
          name: "Pinned Location",
          formattedAddress: fallback,
          coordinates: [lat, lon],
        },
      };
    },
    []
  );

  // Route and coordinates are strictly established upon explicit location selection
  // (autocomplete selection, recent destinations, GPS, or map pin confirmation).
  // Keystrokes while typing do NOT trigger background geocoding or premature routing.

  /* ─── INITIALIZE MAPLIBRE ─── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = p1 ? [p1[1], p1[0]] : [91.7516, 26.1884]; // Guwahati default [lng, lat]
    const initialZoom = p1 ? 13.5 : 12;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: UBER_MINIMAL_MAP_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      pitch: 0,
      attributionControl: false,
    });

    const updateSvgOverlay = () => {
      const m = mapRef.current;
      if (!m) return;

      const coords = lastRouteCoordsRef.current;
      if (coords && coords.length > 0) {
        let d = "";
        for (let i = 0; i < coords.length; i++) {
          const pt = m.project(coords[i]);
          d += (i === 0 ? "M " : " L ") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
        }
        if (svgCasingRef.current) svgCasingRef.current.setAttribute("d", d);
        if (svgCoreRef.current) svgCoreRef.current.setAttribute("d", d);
      } else {
        if (svgCasingRef.current) svgCasingRef.current.setAttribute("d", "");
        if (svgCoreRef.current) svgCoreRef.current.setAttribute("d", "");
      }

      // Explicit purge of alternative line
      const altCoords = lastAltCoordsRef.current;
      if (altCoords && altCoords.length > 0) {
        let dAlt = "";
        for (let i = 0; i < altCoords.length; i++) {
          const pt = m.project(altCoords[i]);
          dAlt += (i === 0 ? "M " : " L ") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
        }
        if (svgAltCasingRef.current) svgAltCasingRef.current.setAttribute("d", dAlt);
        if (svgAltCoreRef.current) svgAltCoreRef.current.setAttribute("d", dAlt);
      } else {
        if (svgAltCasingRef.current) svgAltCasingRef.current.setAttribute("d", "");
        if (svgAltCoreRef.current) svgAltCoreRef.current.setAttribute("d", "");
      }
    };

    const onReady = () => {
      ensureRouteLayers(map);
      if (lastRouteCoordsRef.current && lastRouteCoordsRef.current.length > 0) {
        const source = map.getSource("route-source") as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: lastRouteCoordsRef.current,
            },
          });
        }
      }
      updateSvgOverlay();
    };

    map.on("load", onReady);
    map.on("styledata", onReady);
    map.on("render", updateSvgOverlay);
    map.on("move", updateSvgOverlay);
    map.on("zoom", updateSvgOverlay);
    map.on("resize", updateSvgOverlay);

    mapRef.current = map;

    return () => {
      if (routeRetryTimerRef.current) {
        clearInterval(routeRetryTimerRef.current);
        routeRetryTimerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ─── MOVING MAP & CENTRAL PIN EVENT HANDLERS ─── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMoveStart = () => {
      if (!activePinMode) return;
      setIsMapMoving(true);
      if (reverseGeocodeTimerRef.current) {
        clearTimeout(reverseGeocodeTimerRef.current);
        reverseGeocodeTimerRef.current = null;
      }
    };

    const handleMoveEnd = () => {
      if (!activePinMode) return;
      setIsMapMoving(false);
      setIsPinGeocoding(true);

      const center = map.getCenter();
      const lat = center.lat;
      const lng = center.lng;

      if (reverseGeocodeTimerRef.current) {
        clearTimeout(reverseGeocodeTimerRef.current);
      }

      const token = ++pinGeocodeTokenRef.current;
      const targetMode = activePinMode;

      reverseGeocodeTimerRef.current = setTimeout(async () => {
        const res = await reverseGeocodeFull(lat, lng);
        if (token !== pinGeocodeTokenRef.current) return;
        setPinAddress(res.address);
        setPinDetails(res.details);
        setIsPinGeocoding(false);
      }, 250);
    };

    map.on("movestart", handleMoveStart);
    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("movestart", handleMoveStart);
      map.off("moveend", handleMoveEnd);
    };
  }, [activePinMode, reverseGeocodeFull]);

  // Handle switching into / out of activePinMode (smooth camera ease ONCE on entry)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activePinMode && activePinMode !== prevActivePinModeRef.current) {
      const token = ++pinGeocodeTokenRef.current;
      const targetMode = activePinMode;

      if (activePinMode === "pickup") {
        const target: [number, number] = p1 ? [p1[1], p1[0]] : [91.7516, 26.1884];
        map.easeTo({ center: target, zoom: 16, duration: 600 });
        if (pickup) {
          setPinAddress(pickup);
          if (p1) setPinDetails({ name: pickup.split(",")[0], formattedAddress: pickup, coordinates: p1 });
        } else {
          setPinAddress("Moving map to pinpoint pickup...");
          setIsPinGeocoding(true);
          reverseGeocodeFull(target[1], target[0]).then((res) => {
            if (token !== pinGeocodeTokenRef.current) return;
            setPinAddress(res.address);
            setPinDetails(res.details);
            setIsPinGeocoding(false);
          });
        }
      } else if (activePinMode === "drop") {
        const target: [number, number] = p2 ? [p2[1], p2[0]] : (p1 ? [p1[1], p1[0]] : [91.7516, 26.1884]);
        map.easeTo({ center: target, zoom: 16, duration: 600 });
        if (drop && p2) {
          setPinAddress(drop);
          setPinDetails({ name: drop.split(",")[0], formattedAddress: drop, coordinates: p2 });
        } else {
          setPinAddress("Moving map to pinpoint drop...");
          setIsPinGeocoding(true);
          reverseGeocodeFull(target[1], target[0]).then((res) => {
            if (token !== pinGeocodeTokenRef.current) return;
            setPinAddress(res.address);
            setPinDetails(res.details);
            setIsPinGeocoding(false);
          });
        }
      }
    }
    prevActivePinModeRef.current = activePinMode;
  }, [activePinMode, p1, p2, pickup, drop, reverseGeocodeFull]);

  /* ─── CONFIRM PIN SELECTION HANDLER ─── */
  const handleConfirmPin = async () => {
    const map = mapRef.current;
    if (!map || !activePinMode) return;

    const center = map.getCenter();
    const confirmedCoords: [number, number] = [center.lat, center.lng];
    let address = pinAddress;
    let details = pinDetails;

    const detailsCoords = details?.coordinates;
    const isStaleOrMismatch =
      !address ||
      address.includes("Moving map") ||
      !detailsCoords ||
      Math.abs(detailsCoords[0] - center.lat) > 0.002 ||
      Math.abs(detailsCoords[1] - center.lng) > 0.002;

    if (isStaleOrMismatch) {
      const res = await reverseGeocodeFull(center.lat, center.lng);
      address = res.address;
      details = res.details;
    }

    if (activePinMode === "pickup") {
      setP1(confirmedCoords);
      onCoordinatesChange?.(confirmedCoords, p2);
      onConfirmPinSelection?.("pickup", confirmedCoords, address, details);
      if (onChange) onChange(address, drop, confirmedCoords, p2, details?.countrycode || "in", details, undefined);
    } else if (activePinMode === "drop") {
      setP2(confirmedCoords);
      onCoordinatesChange?.(p1, confirmedCoords);
      onConfirmPinSelection?.("drop", confirmedCoords, address, details);
      if (onChange) onChange(pickup, address, p1, confirmedCoords, details?.countrycode || "in", undefined, details);
    }

    setActivePinMode(null);
    onSelectionModeChange?.("none");
  };

  const handleCancelPin = () => {
    setActivePinMode(null);
    onSelectionModeChange?.("none");
  };

  /* ─── SAFE & CRASH-PROOF ROUTE RENDERING ─── */
  const applyRouteLine = useCallback(
    (coords: [number, number][], altCoords?: [number, number][], routeKey?: string) => {
      lastRouteCoordsRef.current = coords || [];
      // STRICT FIX: Always clear alternative coords when none provided (prevents frozen grey line bug)
      lastAltCoordsRef.current = altCoords && altCoords.length > 0 ? altCoords : [];
      const map = mapRef.current;
      if (!map) return;

      // Update SVG overlay immediately (zero-lag 2D compositor)
      if (coords && coords.length > 0) {
        let d = "";
        for (let i = 0; i < coords.length; i++) {
          const pt = map.project(coords[i]);
          d += (i === 0 ? "M " : " L ") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
        }
        if (svgCasingRef.current) svgCasingRef.current.setAttribute("d", d);
        if (svgCoreRef.current) svgCoreRef.current.setAttribute("d", d);
      } else {
        if (svgCasingRef.current) svgCasingRef.current.setAttribute("d", "");
        if (svgCoreRef.current) svgCoreRef.current.setAttribute("d", "");
      }

      if (altCoords && altCoords.length > 0) {
        let dAlt = "";
        for (let i = 0; i < altCoords.length; i++) {
          const pt = map.project(altCoords[i]);
          dAlt += (i === 0 ? "M " : " L ") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
        }
        if (svgAltCasingRef.current) svgAltCasingRef.current.setAttribute("d", dAlt);
        if (svgAltCoreRef.current) svgAltCoreRef.current.setAttribute("d", dAlt);
      } else {
        // Clear immediately if no alternative
        if (svgAltCasingRef.current) svgAltCasingRef.current.setAttribute("d", "");
        if (svgAltCoreRef.current) svgAltCoreRef.current.setAttribute("d", "");
      }
      map.triggerRepaint();

      const tryApply = () => {
        try {
          ensureRouteLayers(map);
          const source = map.getSource("route-source") as maplibregl.GeoJSONSource;
          const altSource = map.getSource("route-alt-source") as maplibregl.GeoJSONSource;

          if (altSource) {
            altSource.setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: altCoords && altCoords.length > 0 ? altCoords : [],
              },
            });
          }

          if (source && coords && coords.length > 0) {
            source.setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: coords,
              },
            });

            // STRICT FIX: Only fitBounds when NOT in active pin selection mode
            // AND only once per new route (routeKey) to prevent auto-zooming loops
            if (!activePinMode && (!routeKey || hasFittedRouteRef.current !== routeKey)) {
              if (routeKey) hasFittedRouteRef.current = routeKey;
              const bounds = new maplibregl.LngLatBounds();
              for (const c of coords) {
                bounds.extend(c as [number, number]);
              }
              const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
              const responsivePadding = isDesktop
                ? { top: 80, bottom: 80, left: 60, right: 60 }
                : { top: 70, bottom: Math.max(160, bottomPadding), left: 35, right: 35 };

              map.fitBounds(bounds, {
                padding: responsivePadding,
                duration: 700,
                maxZoom: 16,
              });
            }
            return true;
          }
        } catch (err) {
          return false;
        }
        return false;
      };

      if (tryApply()) return;

      if (routeRetryTimerRef.current) {
        clearInterval(routeRetryTimerRef.current);
        routeRetryTimerRef.current = null;
      }

      // Retry polling until layer is ready
      routeRetryTimerRef.current = setInterval(() => {
        if (tryApply()) {
          if (routeRetryTimerRef.current) {
            clearInterval(routeRetryTimerRef.current);
            routeRetryTimerRef.current = null;
          }
        }
      }, 100);
      setTimeout(() => {
        if (routeRetryTimerRef.current) {
          clearInterval(routeRetryTimerRef.current);
          routeRetryTimerRef.current = null;
        }
      }, 4000);
    },
    [bottomPadding, activePinMode]
  );

  /* ─── ROUTE FETCHING WITH AUTOMATIC FALLBACKS ─── */
  const renderRoute = useCallback(
    async (
      pickupPt: [number, number],
      dropPt: [number, number],
      interStops?: Array<{ address: string; lat: number; lng: number }>
    ) => {
      const validStops = (interStops || []).filter(
        (s) => s && typeof s.lat === "number" && typeof s.lng === "number"
      );
      const waypoints: [number, number][] = [
        pickupPt,
        ...validStops.map((s) => [s.lat, s.lng] as [number, number]),
        dropPt,
      ];

      const currentKey = waypoints.map((w) => `${w[0].toFixed(5)},${w[1].toFixed(5)}`).join(";");
      if (currentKey === lastRouteKeyRef.current && lastRouteCoordsRef.current.length > 0) {
        applyRouteLine(lastRouteCoordsRef.current, [], currentKey);
        return;
      }
      lastRouteKeyRef.current = currentKey;

      setIsRouting(true);

      let routeData: any = null;

      // Tier 1: Fast direct Client-Side OSRM Road Router (<300ms)
      // Note: alternatives=false during pre-booking as requested (prevents frozen grey line)
      try {
        const coordStr = waypoints.map(([lat, lon]) => `${lon},${lat}`).join(";");
        const osrmRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&alternatives=false`,
          { signal: AbortSignal.timeout(4500) }
        );
        if (osrmRes.ok) {
          const osrmJson = await osrmRes.json();
          if (osrmJson.routes && osrmJson.routes.length > 0) {
            const r = osrmJson.routes[0];
            routeData = {
              distanceKm: +((r.distance / 1000).toFixed(2)),
              durationMinutes: Math.max(2, Math.round(r.duration / 60)),
              geojsonCoords: r.geometry.coordinates,
              engine: "osrm",
            };
          }
        }
      } catch (e) {
        console.warn("Client OSRM fallback failed, trying API route:", e);
      }

      // Tier 2: Next.js API Server Route Fallback (OSRM -> Valhalla -> synthetic)
      if (!routeData) {
        try {
          const pointsParam = waypoints.map(([lat, lng]) => `${lat},${lng}`).join(";");
          const res = await fetch(`/api/route?points=${encodeURIComponent(pointsParam)}`);
          if (res.ok) {
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("json")) {
              const json = await res.json();
              if (json.success && json.primary?.geojsonCoords?.length > 0) {
                routeData = json.primary;
              }
            }
          }
        } catch (e) {
          console.warn("Proxy route fetch failed:", e);
        }
      }

      // Tier 3: Guaranteed fallback direct spline so line is 100% NEVER blank
      if (!routeData) {
        const coords: [number, number][] = waypoints.map(([lat, lon]) => [lon, lat]);
        const straightDistKm = Math.round(
          Math.hypot(dropPt[0] - pickupPt[0], dropPt[1] - pickupPt[1]) * 111 * 10
        ) / 10;
        routeData = {
          distanceKm: straightDistKm || 5,
          durationMinutes: Math.max(3, Math.round((straightDistKm || 5) * 2.5)),
          geojsonCoords: coords,
          engine: "direct",
        };
      }

      if (routeData && routeData.geojsonCoords?.length > 0) {
        // Snap connection: If the route end point snapped away from true drop point, extend directly to the drop coordinate
        const lastPt = routeData.geojsonCoords[routeData.geojsonCoords.length - 1];
        const dEndKm = Math.hypot(lastPt[1] - dropPt[0], lastPt[0] - dropPt[1]) * 111;
        if (dEndKm > 0.012 && dEndKm < 1.5) {
          routeData.geojsonCoords.push([dropPt[1], dropPt[0]]);
        }

        const firstPt = routeData.geojsonCoords[0];
        const dStartKm = Math.hypot(firstPt[1] - pickupPt[0], firstPt[0] - pickupPt[1]) * 111;
        if (dStartKm > 0.012 && dStartKm < 1.5) {
          routeData.geojsonCoords.unshift([pickupPt[1], pickupPt[0]]);
        }

        setKm(routeData.distanceKm);
        setDurationMin(routeData.durationMinutes);
        onDistance?.(routeData.distanceKm);
        applyRouteLine(routeData.geojsonCoords, [], currentKey);
      }

      setIsRouting(false);
    },
    [onDistance, applyRouteLine]
  );

  /* ─── CLEAR ROUTE WHEN COORDS ARE MISSING (PREVENTS PREMATURE ROUTING) ─── */
  const clearRoute = useCallback(() => {
    hasFittedRouteRef.current = null;
    lastRouteCoordsRef.current = [];
    lastAltCoordsRef.current = [];
    lastRouteKeyRef.current = "";
    setKm(null);
    setDurationMin(null);
    setIsRouting(false);
    onDistance?.(0);

    const map = mapRef.current;
    if (map) {
      ensureRouteLayers(map);
      const source = map.getSource("route-source") as maplibregl.GeoJSONSource;
      const altSource = map.getSource("route-alt-source") as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
      }
      if (altSource) {
        altSource.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
      }
    }
    if (svgCasingRef.current) svgCasingRef.current.setAttribute("d", "");
    if (svgCoreRef.current) svgCoreRef.current.setAttribute("d", "");
    if (svgAltCasingRef.current) svgAltCasingRef.current.setAttribute("d", "");
    if (svgAltCoreRef.current) svgAltCoreRef.current.setAttribute("d", "");
  }, [onDistance]);

  /* ─── SYNC MARKERS AND ROUTE (INDEPENDENT LOCK / UNLOCK) ─── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Pickup Marker (Hidden while actively setting pickup with center pin)
    if (p1 && activePinMode !== "pickup") {
      const attachPickupClickHandler = (el: HTMLElement) => {
        el.style.cursor = "pointer";
        el.title = "Click to adjust pickup location on map";
        el.onclick = (e) => {
          e.stopPropagation();
          setActivePinMode("pickup");
          onSelectionModeChange?.("pickup");
        };
      };

      if (!pickupMarkerRef.current) {
        const el = createPickupEl(pickup, durationMin);
        attachPickupClickHandler(el);
        const marker = new maplibregl.Marker({
          element: el,
          draggable: false, // Strictly locked to ground, NO direct dragging!
          anchor: "bottom",
        })
          .setLngLat([p1[1], p1[0]])
          .addTo(map);

        pickupMarkerRef.current = marker;
      } else {
        pickupMarkerRef.current.setLngLat([p1[1], p1[0]]);
        const el = createPickupEl(pickup, durationMin);
        attachPickupClickHandler(el);
        pickupMarkerRef.current.getElement().innerHTML = el.innerHTML;
        attachPickupClickHandler(pickupMarkerRef.current.getElement());
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    // 2. Drop Marker (Hidden while actively setting drop with center pin)
    if (p2 && activePinMode !== "drop") {
      const attachDropClickHandler = (el: HTMLElement) => {
        el.style.cursor = "pointer";
        el.title = "Click to adjust drop-off location on map";
        el.onclick = (e) => {
          e.stopPropagation();
          setActivePinMode("drop");
          onSelectionModeChange?.("drop");
        };
      };

      if (!dropMarkerRef.current) {
        const el = createDropEl(drop);
        attachDropClickHandler(el);
        const marker = new maplibregl.Marker({
          element: el,
          draggable: false, // Strictly locked to ground, NO direct dragging!
          anchor: "bottom",
        })
          .setLngLat([p2[1], p2[0]])
          .addTo(map);

        dropMarkerRef.current = marker;
      } else {
        dropMarkerRef.current.setLngLat([p2[1], p2[0]]);
        const el = createDropEl(drop);
        attachDropClickHandler(el);
        dropMarkerRef.current.getElement().innerHTML = el.innerHTML;
        attachDropClickHandler(dropMarkerRef.current.getElement());
      }
    } else if (dropMarkerRef.current) {
      dropMarkerRef.current.remove();
      dropMarkerRef.current = null;
    }

    // 3. Multi-stop markers
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];
    if (stops && stops.length > 0) {
      stops.forEach((s, idx) => {
        if (typeof s.lat === "number" && typeof s.lng === "number") {
          const el = createStopEl(idx);
          const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([s.lng, s.lat])
            .addTo(map);
          stopMarkersRef.current.push(marker);
        }
      });
    }

    // 4. Trigger route calculation strictly when both p1 and p2 exist, otherwise purge line
    if (p1 && p2) {
      renderRoute(p1, p2, stops);
    } else {
      clearRoute();
    }
  }, [p1, p2, stops, renderRoute, clearRoute, drop, onChange, onCoordinatesChange, pickup, activePinMode, durationMin, reverseGeocodeFull]);

  // 5. Vehicles (Live nearby fleet markers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    vehicleMarkersRef.current.forEach((m) => m.remove());
    vehicleMarkersRef.current = [];

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return;
    }

    vehicles.forEach((v: any) => {
      const loc = v.location?.coordinates || [v.lng, v.lat];
      if (!loc || loc.length < 2) return;
      const [lng, lat] = loc;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const el = createVehicleMapMarkerEl(v.type);
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
      vehicleMarkersRef.current.push(marker);
    });

    return () => {
      vehicleMarkersRef.current.forEach((m) => m.remove());
      vehicleMarkersRef.current = [];
    };
  }, [vehicles]);

  // 6. User GPS Location Beacon (Google Maps pulsating blue halo + dot)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userCoords) {
      if (!userLocationMarkerRef.current) {
        const el = createCurrentLocationEl();
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([userCoords[1], userCoords[0]])
          .addTo(map);
        userLocationMarkerRef.current = marker;
      } else {
        userLocationMarkerRef.current.setLngLat([userCoords[1], userCoords[0]]);
      }
    } else if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }
  }, [userCoords]);

  /* ── RE-CENTER ON ROUTE OR CURRENT LOCATION ── */
  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;

    if (p1 && p2) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([p1[1], p1[0]]);
      bounds.extend([p2[1], p2[0]]);
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
      const responsivePadding = isDesktop
        ? { top: 80, bottom: 80, left: 60, right: 60 }
        : { top: 70, bottom: Math.max(160, bottomPadding), left: 35, right: 35 };

      map.fitBounds(bounds, {
        padding: responsivePadding,
        duration: 700,
        maxZoom: 16,
      });
    } else if (p1) {
      map.easeTo({ center: [p1[1], p1[0]], zoom: 16, duration: 600 });
    } else if (p2) {
      map.easeTo({ center: [p2[1], p2[0]], zoom: 16, duration: 600 });
    }
  };

  const handleReset = () => {
    hasFittedRouteRef.current = null;
    setP1(null);
    setP2(null);
    onCoordinatesChange?.(null, null);
    if (onChange) onChange("", "");
    setActivePinMode(null);
    onSelectionModeChange?.("none");
    setKm(null);
    lastRouteCoordsRef.current = [];
    lastAltCoordsRef.current = [];
    if (svgCasingRef.current) svgCasingRef.current.setAttribute("d", "");
    if (svgCoreRef.current) svgCoreRef.current.setAttribute("d", "");
    if (svgAltCasingRef.current) svgAltCasingRef.current.setAttribute("d", "");
    if (svgAltCoreRef.current) svgAltCoreRef.current.setAttribute("d", "");

    const map = mapRef.current;
    if (map) {
      ensureRouteLayers(map);
      const source = map.getSource("route-source") as maplibregl.GeoJSONSource;
      const altSource = map.getSource("route-alt-source") as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
      }
      if (altSource) {
        altSource.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
      }
    }
  };

  return (
    <div className="maplibre-map-container relative w-full h-full overflow-hidden select-none bg-slate-100">
      {/* MapLibre WebGL DOM Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${activePinMode ? "cursor-grab active:cursor-grabbing" : ""}`}
      />

      {/* ── FAIL-SAFE SVG ROUTE POLYLINE OVERLAY (STACKED UNDER DOM MARKERS) ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
      >
        {/* Alternative route (purged during pre-booking) */}
        <path
          ref={svgAltCasingRef}
          d=""
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.8"
        />
        <path
          ref={svgAltCoreRef}
          d=""
          stroke="#94a3b8"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        />
        {/* Primary route casing (crisp white halo) */}
        <path
          ref={svgCasingRef}
          d=""
          stroke="#ffffff"
          strokeWidth="9.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="1.0"
        />
        {/* Primary route core (Midnight route line) */}
        <path
          ref={svgCoreRef}
          d=""
          stroke="#142238"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="1.0"
        />
      </svg>

      {/* ── CENTRAL FIXED PIN WITH TACTILE SPRING PHYSICS ── */}
      <AnimatePresence>
        {activePinMode && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
            <div className="relative flex flex-col items-center">
              {/* Floating Pin Assembly */}
              <motion.div
                initial={{ scale: 0.8, y: -20, opacity: 0 }}
                animate={{
                  scale: isMapMoving ? 1.08 : 1.0,
                  y: isMapMoving ? -14 : 0,
                  opacity: 1,
                }}
                exit={{ scale: 0.8, y: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className="flex flex-col items-center pointer-events-none"
              >
                {/* Floating Callout Badge (Jaatri Design System) */}
                <div
                  className="px-3.5 py-1.5 rounded-[8px] text-[11px] font-bold tracking-tight text-[#FAF7F0] shadow-xl flex items-center gap-2 border border-[#426457]/40 bg-[#123D32]"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      activePinMode === "pickup"
                        ? "bg-[#046A38] shadow-[0_0_6px_rgba(4,106,56,0.6)]"
                        : "bg-[#E34222] shadow-[0_0_6px_rgba(227,66,34,0.6)]"
                    }`}
                  />
                  <span>{activePinMode === "pickup" ? "Move Map to Set Pickup" : "Move Map to Set Drop"}</span>
                </div>

                {/* Pin using icons8-map-pin-96.svg */}
                <div className="relative mt-0.5 filter drop-shadow-md flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    width="44"
                    height="44"
                    className={activePinMode === "pickup" ? "fill-[#046A38]" : "fill-[#E34222]"}
                  >
                    <path d="M 24 4 C 18.486 4 14 8.486 14 14 C 14 19.003129 17.696643 23.147695 22.5 23.875 L 22.5 42.5 A 1.50015 1.50015 0 1 0 25.5 42.5 L 25.5 23.875 C 30.303357 23.147695 34 19.003129 34 14 C 34 8.486 29.514 4 24 4 z M 21.5 10 C 22.328 10 23 10.672 23 11.5 C 23 12.328 22.328 13 21.5 13 C 20.672 13 20 12.328 20 11.5 C 20 10.672 20.672 10 21.5 10 z" />
                  </svg>
                </div>
              </motion.div>

              {/* Dynamic Ground Shadow underneath the needle */}
              <div
                className={`w-3.5 h-1.5 bg-[#123D32]/40 rounded-full filter blur-[1px] transition-all duration-200 ${
                  isMapMoving ? "scale-75 opacity-25 translate-y-2" : "scale-100 opacity-60 translate-y-0"
                }`}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TOP CONFIRMATION BANNER WHEN IN CENTRAL PIN MODE ── */}
      <AnimatePresence>
        {activePinMode && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[2000] bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#1E3E34] rounded-[12px] shadow-2xl p-4 flex flex-col gap-3 isolate"
            style={{ zIndex: 2000 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    activePinMode === "pickup" ? "bg-[#046A38]" : "bg-[#E34222]"
                  }`}
                />
                <span className="text-xs font-bold tracking-tight text-[#10251C] dark:text-[#F7F5ED]">
                  {activePinMode === "pickup" ? "Confirm Pickup Point" : "Confirm Drop-off Point"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelPin}
                className="w-7 h-7 rounded-[8px] bg-white dark:bg-[#10352C] hover:bg-[#FAF7F0] dark:hover:bg-[#143D32] border border-[#DED7CA] dark:border-[#1E3E34] text-[#696B64] hover:text-[#10251C] transition flex items-center justify-center cursor-pointer"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>

            <div className="bg-white dark:bg-[#10352C] rounded-[8px] p-2.5 border border-[#DED7CA] dark:border-[#1E3E34] flex items-start gap-2 shadow-xs">
              <MapPin size={15} className={`shrink-0 mt-0.5 ${activePinMode === "pickup" ? "text-[#046A38]" : "text-[#E34222]"}`} />
              <div className="flex-1 min-w-0">
                {isPinGeocoding ? (
                  <div className="flex items-center gap-2 text-[#696B64] text-xs">
                    <Loader2 size={13} className="animate-spin text-[#123D32] dark:text-[#347858]" />
                    <span>Resolving address...</span>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-[#10251C] dark:text-[#F7F5ED] leading-snug line-clamp-2">
                    {pinAddress || "Move map to choose location"}
                  </p>
                )}
              </div>
            </div>

            {(() => {
              const isConfirmDisabled =
                isPinGeocoding ||
                isMapMoving ||
                !pinAddress ||
                pinAddress.trim() === "" ||
                pinAddress === "Move map to choose location" ||
                pinAddress.includes("Moving map") ||
                pinAddress.includes("Resolving address");

              return (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmPin}
                    disabled={isConfirmDisabled}
                    className={`flex-1 py-2.5 px-4 rounded-[8px] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      isConfirmDisabled
                        ? "bg-[#DED7CA] text-[#696B64] cursor-not-allowed shadow-none"
                        : "bg-[#046A38] hover:bg-[#03532C] text-white active:scale-95"
                    }`}
                  >
                    <Check size={14} />
                    <span>Confirm Location</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPin}
                    className="py-2.5 px-3.5 rounded-[8px] border border-[#DED7CA] dark:border-[#1E3E34] text-xs font-semibold bg-white dark:bg-[#10352C] text-[#10251C] dark:text-[#F7F5ED] hover:bg-[#FAF7F0] dark:hover:bg-[#143D32] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP RIGHT MAP CONTROLS & ROUTE ETA PILL (WHEN NOT IN PIN MODE) ── */}
      {!activePinMode && (
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20 flex flex-col items-end gap-1.5 md:gap-2 pointer-events-none">
          {/* Route ETA & Distance Pill */}
          <AnimatePresence>
            {(km !== null || isRouting) && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[var(--text-primary)] md:gap-3 md:px-3.5 md:py-2"
              >
                {isRouting ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-[#046A38] animate-pulse rounded-full" />
                    <span className="text-[11px] font-semibold md:text-xs">Finding route…</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold tabular-nums md:text-xs">
                        {durationMin ?? Math.max(3, Math.round(((km || 5) / 25) * 60))} min
                      </span>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">({km} km)</span>
                    </div>
                    {!compactRouteSummary && (
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                        Fastest route
                      </span>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pinpoint Selector Pill (Hidden on mobile when route is already active to prevent map overlaps) */}
          <div className={`pointer-events-auto items-center gap-1 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-1 ${
            p1 && p2 ? "hidden md:flex" : "flex"
          }`}>
            <button
              type="button"
              onClick={() => {
                setActivePinMode("pickup");
                onSelectionModeChange?.("pickup");
              }}
              className="flex min-h-11 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            >
              <span className="size-2.5 shrink-0 rounded-full bg-[var(--text-primary)]" />
              <span>Pin Pickup</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePinMode("drop");
                onSelectionModeChange?.("drop");
              }}
              className="flex min-h-11 items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            >
              <span className="size-2.5 shrink-0 rounded-full bg-[var(--accent-vermilion)]" />
              <span>Pin Drop</span>
            </button>

            {(p1 || p2) && (
              <button
                type="button"
                onClick={handleReset}
                title="Reset pins"
                aria-label="Reset pins"
                className="grid size-11 place-items-center rounded-[6px] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── BOTTOM RIGHT CONTROLS (RE-CENTER CROSSHAIR & ZOOM) ── */}
      <div
        hidden={hideMapControls}
        className={`absolute right-4 z-20 flex-col gap-2 ${hideMapControls ? "hidden" : "flex"}`}
        style={{
          bottom: bottomPadding && bottomPadding > 40 ? `${Math.min(bottomPadding + 14, 280)}px` : "24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Re-center / Locate Crosshair Button */}
        <button
          onClick={handleRecenter}
          aria-label="Re-center on route"
          title="Re-center view"
          className="grid size-11 place-items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
        >
          <Crosshair size={18} aria-hidden="true" />
        </button>

        {/* Zoom In & Out */}
        <div className="flex flex-col rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Zoom in"
            className="grid size-11 place-items-center rounded-[7px] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            <Plus size={15} />
          </button>
          <div className="h-px bg-[var(--border-default)]" />
          <button
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Zoom out"
            className="grid size-11 place-items-center rounded-[7px] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            <Minus size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}