"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { LIVE_TRACKING_MAP_STYLE } from "@/lib/mapConfig";
import { applyMapPalette, fitMapPadding, labelMap, makeLocationMarker, makeVehicleMarker, MapAttribution, MapControls, mapFrame, MapUnavailable, observeMapSize, prepareMapRuntime, refreshLocationMarker, vehicleSymbol } from "./MapChrome";
import styles from "./map-chrome.module.css";

type VehicleType = "auto" | "car" | "bike" | "suv" | string;

type Props = {
  driverLocation?: [number, number] | null;
  pickupLocation?: [number, number] | null;
  dropLocation?: [number, number] | null;
  pickupAddress?: string;
  dropAddress?: string;
  status: "arriving" | "ongoing" | "completed" | string;
  vehicleType?: VehicleType;
  etaMinutes?: number;
  rideOverlay?: boolean;
  onStats?: (data: {
    distanceToPickup: number;
    durationToPickup: number;
    distanceToDrop: number;
    durationToDrop: number;
  }) => void;
};

function validPosition(p?: [number, number] | null): p is [number, number] {
  return Boolean(p && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180);
}

function bearingBetween(from: [number, number], to: [number, number]) {
  const [lat1, lat2, delta] = [from[0], to[0], to[1] - from[1]].map((angle) => angle * Math.PI / 180);
  return Math.atan2(Math.sin(delta) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta)) * 180 / Math.PI;
}

function createDriverMarkerEl(type: VehicleType, etaMinutes?: number) {
  const marker = makeVehicleMarker(type, "Driver location", "driver");
  const eta = document.createElement("span");
  eta.className = styles.eta;
  eta.textContent = etaMinutes && etaMinutes > 0 ? `${Math.round(etaMinutes)} min` : "";
  eta.hidden = !eta.textContent;
  const heading = document.createElement("span");
  heading.className = styles.heading;
  heading.setAttribute("aria-hidden", "true");
  heading.hidden = true;
  marker.container.prepend(eta, heading);
  return { ...marker, eta, heading };
}

interface RouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
}

/* ─── FETCH ROAD ROUTE VIA API ──────────────────────────────────────── */
async function fetchRoadRoute(
  from: [number, number],
  to: [number, number],
  signal: AbortSignal
): Promise<RouteResult> {
  const dLat = ((to[0] - from[0]) * Math.PI) / 180;
  const dLon = ((to[1] - from[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from[0] * Math.PI) / 180) *
      Math.cos((to[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const directDistKm = Number(
    (6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
  );
  const directDuration = Math.max(2, Math.round((directDistKm / 25) * 60));

  // Try OSRM directly first (fast, client-side, <300ms)
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`,
      { signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.routes?.[0]?.geometry?.coordinates?.length) {
        const route = data.routes[0];
        const distKm = Number((route.distance / 1000).toFixed(1));
        const durMin = Math.max(1, Math.round(route.duration / 60));
        return {
          coordinates: route.geometry.coordinates,
          distanceKm: distKm,
          durationMinutes: durMin,
        };
      }
    }
  } catch { signal.throwIfAborted(); }

  // Fallback to our API route
  try {
    const ptsParam = `${from[0]},${from[1]};${to[0]},${to[1]}`;
    const res = await fetch(`/api/route?points=${encodeURIComponent(ptsParam)}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        const data = await res.json();
        if (data.success && data.primary?.geojsonCoords?.length) {
          const distKm = Number(data.primary.distanceKm ?? directDistKm);
          const durMin = Math.max(
            1,
            Math.round(data.primary.durationMinutes ?? directDuration)
          );
          return {
            coordinates: data.primary.geojsonCoords,
            distanceKm: distKm,
            durationMinutes: durMin,
          };
        }
      }
    }
  } catch { signal.throwIfAborted(); }

  // Fail-safe direct fallback so the polyline is 100% NEVER blank
  return {
    coordinates: [
      [from[1], from[0]],
      [to[1], to[0]],
    ],
    distanceKm: directDistKm,
    durationMinutes: directDuration,
  };
}

/* ─── MAIN COMPONENT ────────────────────────────────────────────────── */
export default function LiveTrackingMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  pickupAddress,
  dropAddress,
  status,
  vehicleType = "car",
  etaMinutes,
  onStats,
  rideOverlay = false,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [readyMap, setReadyMap] = useState<maplibregl.Map | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const initial = useRef({ driverLocation, pickupLocation, dropLocation });
  const tripRequest = useRef<AbortController | null>(null);
  const approachRequest = useRef<AbortController | null>(null);
  const vehicleTypeRef = useRef(vehicleType);

  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const vehicleElRef = useRef<HTMLElement | null>(null);
  const etaBadgeRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLElement | null>(null);
  const lastDriverPosition = useRef<[number, number] | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropMarkerRef = useRef<maplibregl.Marker | null>(null);

  const lastDriverRouteFetchRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const lastTripRouteFetchRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const drawnTripKey = useRef("");

  const tripCoordsRef = useRef<[number, number][]>([]);
  const driverCoordsRef = useRef<[number, number][]>([]);

  const svgTripCasingRef = useRef<SVGPathElement | null>(null);
  const svgTripCoreRef = useRef<SVGPathElement | null>(null);
  const svgDriverCasingRef = useRef<SVGPathElement | null>(null);
  const svgDriverCoreRef = useRef<SVGPathElement | null>(null);

  const updateSvgOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Trip Route (Pickup -> Drop or Driver -> Drop)
    const tripCoords = tripCoordsRef.current;
    if (tripCoords && tripCoords.length > 0) {
      let d = "";
      for (let i = 0; i < tripCoords.length; i++) {
        const pt = map.project(tripCoords[i]);
        d += (i === 0 ? "M " : " L ") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
      }
      if (svgTripCasingRef.current) svgTripCasingRef.current.setAttribute("d", d);
      if (svgTripCoreRef.current) svgTripCoreRef.current.setAttribute("d", d);
    } else {
      if (svgTripCasingRef.current) svgTripCasingRef.current.setAttribute("d", "");
      if (svgTripCoreRef.current) svgTripCoreRef.current.setAttribute("d", "");
    }

    // 2. Driver Approach Route (Driver -> Pickup)
    const driverCoords = driverCoordsRef.current;
    if (driverCoords && driverCoords.length > 0) {
      let d = "";
      for (let i = 0; i < driverCoords.length; i++) {
        const pt = map.project(driverCoords[i]);
        d += (i === 0 ? "M " : " L ") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
      }
      if (svgDriverCasingRef.current) svgDriverCasingRef.current.setAttribute("d", d);
      if (svgDriverCoreRef.current) svgDriverCoreRef.current.setAttribute("d", d);
    } else {
      if (svgDriverCasingRef.current) svgDriverCasingRef.current.setAttribute("d", "");
      if (svgDriverCoreRef.current) svgDriverCoreRef.current.setAttribute("d", "");
    }
  }, []);

  /* ─── INITIALIZE MAP ─── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const { driverLocation, pickupLocation, dropLocation } = initial.current;
    const pos = [driverLocation, pickupLocation, dropLocation].find(validPosition);
    let map: maplibregl.Map;
    try {
      prepareMapRuntime();
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: LIVE_TRACKING_MAP_STYLE,
        center: pos ? [pos[1], pos[0]] : [91.7516, 26.1884],
        zoom: 14.5,
        attributionControl: false,
        scrollZoom: false,
        dragRotate: false,
      });
    } catch {
      setUnavailable(true);
      return;
    }
    labelMap(map, "Live trip map");
    const stopPalette = applyMapPalette(map, [
      ["trip-casing", "outline"], ["trip-core", "main"], ["driver-casing", "outline"], ["driver-core", "approach"],
    ]);
    const stopResize = observeMapSize(map, mapContainerRef.current);
    const onStyleReady = () => {
      for (const [name, coords] of [["trip-route", tripCoordsRef.current], ["driver-route", driverCoordsRef.current]] as const) {
        map.getSource<maplibregl.GeoJSONSource>(name)?.setData({
          type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords },
        });
      }
      updateSvgOverlay();
    };
    map.on("load", onStyleReady);
    map.on("render", updateSvgOverlay);
    map.on("move", updateSvgOverlay);
    map.on("zoom", updateSvgOverlay);
    map.on("resize", updateSvgOverlay);

    mapRef.current = map;
    setReadyMap(map);

    return () => {
      tripRequest.current?.abort();
      approachRequest.current?.abort();
      drawnTripKey.current = "";
      lastDriverRouteFetchRef.current = null;
      lastDriverPosition.current = null;
      stopResize();
      stopPalette();
      pickupMarkerRef.current = null;
      dropMarkerRef.current = null;
      driverMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [updateSvgOverlay]);

  useEffect(() => {
    if (!readyMap) return;
    const sync = (kind: "pickup" | "drop", point: [number, number] | null | undefined, address: string | undefined, ref: typeof pickupMarkerRef) => {
      if (!validPosition(point)) {
        ref.current?.remove();
        ref.current = null;
        return;
      }
      const next = makeLocationMarker(kind, address);
      if (!ref.current) {
        ref.current = new maplibregl.Marker({ element: next, anchor: "bottom" }).setLngLat([point[1], point[0]]).addTo(readyMap);
      } else {
        ref.current.setLngLat([point[1], point[0]]);
        refreshLocationMarker(ref.current.getElement(), next);
      }
    };
    sync("pickup", pickupLocation, pickupAddress, pickupMarkerRef);
    sync("drop", dropLocation, dropAddress, dropMarkerRef);
  }, [readyMap, pickupLocation, dropLocation, pickupAddress, dropAddress]);

  useEffect(() => {
    if (!readyMap) return;
    if (!validPosition(driverLocation) || status === "completed") {
      driverMarkerRef.current?.remove();
      driverMarkerRef.current = null;
      vehicleElRef.current = null;
      etaBadgeRef.current = null;
      headingRef.current = null;
      lastDriverPosition.current = null;
      return;
    }

    const point: [number, number] = [driverLocation[1], driverLocation[0]];
    if (!driverMarkerRef.current) {
      const { container, vehicleEl, eta, heading } = createDriverMarkerEl(vehicleType, etaMinutes);
      vehicleElRef.current = vehicleEl;
      etaBadgeRef.current = eta;
      headingRef.current = heading;
      driverMarkerRef.current = new maplibregl.Marker({ element: container, anchor: "center" }).setLngLat(point).addTo(readyMap);
      vehicleTypeRef.current = vehicleType;
    } else {
      driverMarkerRef.current.setLngLat(point);
      if (vehicleTypeRef.current !== vehicleType) {
        const next = vehicleSymbol(vehicleType);
        vehicleElRef.current?.replaceWith(next);
        vehicleElRef.current = next;
        vehicleTypeRef.current = vehicleType;
      }
      const eta = etaBadgeRef.current;
      if (eta) {
        eta.textContent = etaMinutes && etaMinutes > 0 ? `${Math.round(etaMinutes)} min` : "";
        eta.hidden = !eta.textContent;
      }
    }
    const previous = lastDriverPosition.current;
    const heading = headingRef.current;
    if (!previous) lastDriverPosition.current = driverLocation;
    else if (heading && Math.hypot(driverLocation[0] - previous[0], driverLocation[1] - previous[1]) > .00005) {
      heading.style.transform = `rotate(${bearingBetween(previous, driverLocation)}deg)`;
      heading.hidden = false;
      lastDriverPosition.current = driverLocation;
    }
  }, [readyMap, driverLocation, vehicleType, etaMinutes, status]);

  const onStatsRef = useRef(onStats);
  useEffect(() => {
    onStatsRef.current = onStats;
  }, [onStats]);

  const statsRef = useRef({
    distanceToPickup: 0,
    durationToPickup: 0,
    distanceToDrop: 0,
    durationToDrop: 0,
  });

  const draw = useCallback((kind: "trip" | "driver", coords: [number, number][]) => {
    const lineRef = kind === "trip" ? tripCoordsRef : driverCoordsRef;
    lineRef.current = coords;
    const map = mapRef.current;
    if (!map) return;
    updateSvgOverlay();
    map.getSource<maplibregl.GeoJSONSource>(`${kind}-route`)?.setData({
      type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords },
    });
  }, [updateSvgOverlay]);

  const dLat = driverLocation?.[0], dLng = driverLocation?.[1];
  const pLat = pickupLocation?.[0], pLng = pickupLocation?.[1];
  const tLat = dropLocation?.[0], tLng = dropLocation?.[1];
  const fromLat = status === "ongoing" ? dLat ?? pLat : pLat;
  const fromLng = status === "ongoing" ? dLng ?? pLng : pLng;

  // An older request may not overwrite a newer point or restore a line cleared by a status change.
  useEffect(() => {
    const endpoint = `${status}:${pLat},${pLng};${tLat},${tLng}`;
    if (!readyMap || status === "completed" || fromLat == null || fromLng == null || tLat == null || tLng == null) {
      tripRequest.current?.abort();
      drawnTripKey.current = "";
      lastTripRouteFetchRef.current = null;
      draw("trip", []);
      return;
    }
    const start: [number, number] = [fromLat, fromLng];
    const end: [number, number] = [tLat, tLng];
    if (!validPosition(start) || !validPosition(end)) return;
    const changed = drawnTripKey.current !== endpoint;
    const prev = lastTripRouteFetchRef.current;
    if (!changed && (status !== "ongoing" || prev && Date.now() - prev.time < 12000 && Math.hypot(fromLat - prev.lat, fromLng - prev.lng) < 0.001)) return;
    tripRequest.current?.abort();
    const controller = new AbortController();
    tripRequest.current = controller;
    lastTripRouteFetchRef.current = { lat: fromLat, lng: fromLng, time: Date.now() };
    drawnTripKey.current = endpoint;
    void fetchRoadRoute(start, end, controller.signal).then((route) => {
      if (controller.signal.aborted) return;
      draw("trip", route.coordinates);
      statsRef.current.distanceToDrop = route.distanceKm;
      statsRef.current.durationToDrop = route.durationMinutes;
      onStatsRef.current?.({ ...statsRef.current });
    }).catch((error) => {
      if (!controller.signal.aborted) { drawnTripKey.current = ""; console.warn("Trip route unavailable", error); }
    });
  }, [readyMap, status, pLat, pLng, tLat, tLng, fromLat, fromLng, draw]);

  const approachKey = useRef("");
  useEffect(() => {
    if (!readyMap || status === "ongoing" || status === "completed" || dLat == null || dLng == null || pLat == null || pLng == null) {
      approachRequest.current?.abort();
      approachKey.current = "";
      lastDriverRouteFetchRef.current = null;
      draw("driver", []);
      return;
    }
    const start: [number, number] = [dLat, dLng];
    const end: [number, number] = [pLat, pLng];
    if (!validPosition(start) || !validPosition(end)) return;
    const key = `${status}:${pLat},${pLng}`;
    const prev = lastDriverRouteFetchRef.current;
    if (approachKey.current === key && prev && Date.now() - prev.time < 12000 && Math.hypot(dLat - prev.lat, dLng - prev.lng) < 0.001) return;
    approachRequest.current?.abort();
    const controller = new AbortController();
    approachRequest.current = controller;
    approachKey.current = key;
    lastDriverRouteFetchRef.current = { lat: dLat, lng: dLng, time: Date.now() };
    void fetchRoadRoute(start, end, controller.signal).then((route) => {
      if (controller.signal.aborted) return;
      draw("driver", route.coordinates);
      statsRef.current.distanceToPickup = route.distanceKm;
      statsRef.current.durationToPickup = route.durationMinutes;
      onStatsRef.current?.({ ...statsRef.current });
    }).catch((error) => {
      if (!controller.signal.aborted) { approachKey.current = ""; console.warn("Pickup approach unavailable", error); }
    });
  }, [readyMap, status, dLat, dLng, pLat, pLng, draw]);

  /* Frame on endpoint/status change or when the driver first appears, not on every GPS update. */
  const points = useRef({ pickupLocation, dropLocation, driverLocation });

  useEffect(() => { points.current = { pickupLocation, dropLocation, driverLocation }; }, [pickupLocation, dropLocation, driverLocation]);

  const fitRouteCamera = useCallback(() => {
    if (!readyMap) return;
    const { pickupLocation, dropLocation, driverLocation } = points.current;
    const positions = [pickupLocation, dropLocation, driverLocation].filter(validPosition);
    if (!positions.length) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const pos of positions) bounds.extend([pos[1], pos[0]]);
    const mobileOverlay = rideOverlay && window.innerWidth < 1024;
    readyMap.fitBounds(bounds, {
      padding: fitMapPadding(readyMap, mobileOverlay ? 220 : 56),
      duration: 400,
      maxZoom: 16,
    });
  }, [readyMap, rideOverlay]);

  const hasDriver = validPosition(driverLocation);
  useEffect(() => { fitRouteCamera(); }, [pLat, pLng, tLat, tLng, hasDriver, status, fitRouteCamera]);

  return (
    <div className={mapFrame}>
      <div ref={mapContainerRef} className="size-full" />
      {unavailable ? <MapUnavailable /> : <>
        <MapAttribution top={rideOverlay} />
        <MapControls map={readyMap} onRecenter={fitRouteCamera} recenterLabel="Re-center on trip route" top={rideOverlay} bottom={24} />
      </>}

      {/* ── FAIL-SAFE SVG ROUTE POLYLINE OVERLAY ── */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
      >
        {/* Driver approach route (dashed cyan with white halo) */}
        <path
          ref={svgDriverCasingRef}
          d=""
          stroke="var(--map-line-outline)"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />
        <path
          ref={svgDriverCoreRef}
          d=""
          stroke="var(--map-secondary-line)"
          strokeWidth="4.5"
          strokeDasharray="6, 8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
        />
        {/* Trip route (Jaatri Emerald with white halo casing) */}
        <path
          ref={svgTripCasingRef}
          d=""
          stroke="var(--map-line-outline)"
          strokeWidth="9.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="1.0"
        />
        <path
          ref={svgTripCoreRef}
          d=""
          stroke="var(--map-primary-line)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="1.0"
        />
      </svg>
    </div>
  );
}