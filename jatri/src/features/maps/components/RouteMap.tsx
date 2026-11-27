"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { RotateCcw, MapPin, Check, X, Loader2 } from "lucide-react";
import { UBER_MINIMAL_MAP_STYLE } from "@/lib/mapConfig";
import { applyMapPalette, fitMapPadding, gpsMarker, labelMap, makeLocationMarker, makeVehicleMarker, MapAttribution, MapControls, mapFrame, MapUnavailable, observeMapSize, prepareMapRuntime, refreshLocationMarker } from "./MapChrome";

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
  const [readyMap, setReadyMap] = useState<maplibregl.Map | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const pendingRouteRef = useRef<{ key: string; controller: AbortController } | null>(null);
  const initialPickupRef = useRef(pickupCoords);
  const [approximateRoute, setApproximateRoute] = useState(false);

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

  /* ─── REVERSE GEOCODE WITH STRUCTURED DETAILS ─── */
  const reverseGeocodeFull = useCallback(
    async (lat: number, lon: number): Promise<{ address: string; details: any }> => {
      try {
        const r = await fetch(`/api/places?action=geocode&lat=${lat}&lng=${lon}`, { signal: AbortSignal.timeout(7000) });
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

    const initialPickup = initialPickupRef.current;
    const initialCenter: [number, number] = initialPickup ? [initialPickup[1], initialPickup[0]] : [91.7516, 26.1884]; // Guwahati default [lng, lat]
    const initialZoom = initialPickup ? 13.5 : 12;

    let map: maplibregl.Map;
    try {
      prepareMapRuntime();
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: UBER_MINIMAL_MAP_STYLE,
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: false,
        scrollZoom: false,
        dragRotate: false,
      });
    } catch {
      setUnavailable(true);
      return;
    }
    labelMap(map, "Route map");
    const stopPalette = applyMapPalette(map, [
      ["route-casing", "outline"], ["route-core", "main"], ["route-alt-casing", "outline"], ["route-alt-core", "approach"],
    ]);
    const stopResize = observeMapSize(map, mapContainerRef.current);

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
    map.on("render", updateSvgOverlay);
    map.on("move", updateSvgOverlay);
    map.on("zoom", updateSvgOverlay);
    map.on("resize", updateSvgOverlay);

    mapRef.current = map;
    setReadyMap(map);

    return () => {
      pendingRouteRef.current?.controller.abort();
      pendingRouteRef.current = null;
      stopPalette();
      stopResize();
      pickupMarkerRef.current = null;
      dropMarkerRef.current = null;
      userLocationMarkerRef.current = null;
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
      ++pinGeocodeTokenRef.current;
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
      ++pinGeocodeTokenRef.current;
      if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    };
  }, [activePinMode, reverseGeocodeFull]);

  // Handle switching into / out of activePinMode (smooth camera ease ONCE on entry)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      if (activePinMode && unavailable) onSelectionModeChange?.("none");
      return;
    }

    if (activePinMode && activePinMode !== prevActivePinModeRef.current) {
      const token = ++pinGeocodeTokenRef.current;
      if (map.getContainer().clientWidth) map.getCanvas().focus({ preventScroll: true });

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
  }, [activePinMode, p1, p2, pickup, drop, reverseGeocodeFull, unavailable, onSelectionModeChange]);

  /* ─── CONFIRM PIN SELECTION HANDLER ─── */
  const handleConfirmPin = async () => {
    const map = mapRef.current;
    if (!map || !activePinMode || isMapMoving || isPinGeocoding) return;
    const token = ++pinGeocodeTokenRef.current;

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
      setIsPinGeocoding(true);
      const res = await reverseGeocodeFull(center.lat, center.lng);
      if (token !== pinGeocodeTokenRef.current) return;
      setIsPinGeocoding(false);
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
    ++pinGeocodeTokenRef.current;
    setIsMapMoving(false);
    setIsPinGeocoding(false);
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
              const responsivePadding = fitMapPadding(map, bottomPadding + 42);

              map.fitBounds(bounds, {
                padding: responsivePadding,
                duration: 700,
                maxZoom: 16,
              });
            }
            return true;
          }
        } catch {
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
        (s) => s && Number.isFinite(s.lat) && Number.isFinite(s.lng) && Math.abs(s.lat) <= 90 && Math.abs(s.lng) <= 180
      );
      const waypoints: [number, number][] = [
        pickupPt,
        ...validStops.map((s) => [s.lat, s.lng] as [number, number]),
        dropPt,
      ];

      const currentKey = waypoints.map((w) => `${w[0].toFixed(5)},${w[1].toFixed(5)}`).join(";");
      if (currentKey === lastRouteKeyRef.current && lastRouteCoordsRef.current.length > 0) {
        pendingRouteRef.current?.controller.abort();
        pendingRouteRef.current = null;
        setIsRouting(false);
        applyRouteLine(lastRouteCoordsRef.current, [], currentKey);
        return;
      }
      if (pendingRouteRef.current?.key === currentKey) return;
      pendingRouteRef.current?.controller.abort();
      const controller = new AbortController();
      pendingRouteRef.current = { key: currentKey, controller };
      setIsRouting(true);

      let routeData: any = null;

      // Tier 1: Fast direct Client-Side OSRM Road Router (<300ms)
      // Note: alternatives=false during pre-booking as requested (prevents frozen grey line)
      try {
        const coordStr = waypoints.map(([lat, lon]) => `${lon},${lat}`).join(";");
        const osrmRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&alternatives=false`,
          { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4500)]) }
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
      } catch {
        if (controller.signal.aborted) return;
      }

      // Tier 2: Next.js API Server Route Fallback (OSRM -> Valhalla -> synthetic)
      if (!routeData) {
        try {
          const pointsParam = waypoints.map(([lat, lng]) => `${lat},${lng}`).join(";");
          const res = await fetch(`/api/route?points=${encodeURIComponent(pointsParam)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(9000)]) });
          if (res.ok) {
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("json")) {
              const json = await res.json();
              if (json.success && json.primary?.geojsonCoords?.length > 0) {
                routeData = json.primary;
              }
            }
          }
        } catch {
          if (controller.signal.aborted) return;
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

      if (controller.signal.aborted) return;
      pendingRouteRef.current = null;
      if (routeData && routeData.geojsonCoords?.length > 0) {
        lastRouteKeyRef.current = currentKey;
        setApproximateRoute(["direct", "synthetic", "fallback"].includes(routeData.engine));
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
    pendingRouteRef.current?.controller.abort();
    pendingRouteRef.current = null;
    setApproximateRoute(false);
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

    const createEndpoint = (kind: "pickup" | "drop", address: string) => makeLocationMarker(kind, address, () => {
      setActivePinMode(kind);
      onSelectionModeChange?.(kind);
    });
    const syncEndpoint = (kind: "pickup" | "drop", address: string, coords: [number, number] | null, ref: typeof pickupMarkerRef) => {
      if (!coords || activePinMode === kind) {
        ref.current?.remove();
        ref.current = null;
        return;
      }
      const next = createEndpoint(kind, address);
      if (!ref.current) ref.current = new maplibregl.Marker({ element: next, anchor: "bottom" }).setLngLat([coords[1], coords[0]]).addTo(map);
      else {
        ref.current.setLngLat([coords[1], coords[0]]);
        refreshLocationMarker(ref.current.getElement(), next);
      }
    };
    syncEndpoint("pickup", pickup, p1, pickupMarkerRef);
    syncEndpoint("drop", drop, p2, dropMarkerRef);

    // 3. Multi-stop markers
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];
    if (stops && stops.length > 0) {
      stops.forEach((s, idx) => {
        if (typeof s.lat === "number" && typeof s.lng === "number") {
          const el = makeLocationMarker("stop", `Stop ${idx + 1}`);
          const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([s.lng, s.lat])
            .addTo(map);
          stopMarkersRef.current.push(marker);
        }
      });
    }

  }, [p1, p2, stops, drop, pickup, activePinMode, onSelectionModeChange]);

  useEffect(() => {
    if (p1 && p2) void renderRoute(p1, p2, stops);
    else clearRoute();
  }, [p1, p2, stops, renderRoute, clearRoute]);

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

      const el = makeVehicleMarker(typeof v.type === "string" ? v.type : undefined, "Nearby vehicle", "nearby").container;
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
        const el = gpsMarker();
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
      for (const point of lastRouteCoordsRef.current) bounds.extend(point);
      const responsivePadding = fitMapPadding(map, bottomPadding + 42);

      map.fitBounds(bounds, {
        padding: responsivePadding,
        duration: 700,
        maxZoom: 16,
      });
    } else if (p1) {
      map.easeTo({ center: [p1[1], p1[0]], zoom: 16, duration: 600 });
    } else if (p2) {
      map.easeTo({ center: [p2[1], p2[0]], zoom: 16, duration: 600 });
    } else if (userCoords) {
      map.easeTo({ center: [userCoords[1], userCoords[0]], zoom: 16, duration: 600 });
    } else {
      map.easeTo({ center: [91.7516, 26.1884], zoom: 12, duration: 600 });
    }
  };

  const handleReset = () => {
    clearRoute();
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
    <MotionConfig reducedMotion="user">
    <div className={mapFrame} onKeyDown={(event) => {
      if (activePinMode && event.key === "Escape") {
        event.preventDefault();
        handleCancelPin();
      }
    }}>
      {unavailable ? <MapUnavailable /> : <MapAttribution bottom={compactRouteSummary ? bottomPadding : 0} />}
      {/* MapLibre WebGL DOM Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${activePinMode ? "cursor-grab active:cursor-grabbing" : ""}`}
      />

      {/* ── FAIL-SAFE SVG ROUTE POLYLINE OVERLAY (STACKED UNDER DOM MARKERS) ── */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
      >
        {/* Alternative route (purged during pre-booking) */}
        <path
          ref={svgAltCasingRef}
          d=""
          stroke="var(--map-line-outline)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.8"
        />
        <path
          ref={svgAltCoreRef}
          d=""
          stroke="var(--map-secondary-line)"
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
          stroke="var(--map-line-outline)"
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
          stroke="var(--map-primary-line)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="1.0"
        />
      </svg>

      {/* ── CENTRAL FIXED PIN WITH TACTILE SPRING PHYSICS ── */}
      <AnimatePresence>
        {activePinMode && !unavailable && (
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
                  className="px-3.5 py-1.5 rounded-[8px] text-[11px] font-bold tracking-tight text-[var(--on-primary)] shadow-xl flex items-center gap-2 border border-[var(--border-interactive)] bg-[var(--brand-primary)]"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      activePinMode === "pickup"
                        ? "bg-[var(--accent-mint)]"
                        : "border border-current rounded-none"
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
                    className={activePinMode === "pickup" ? "fill-[var(--accent-mint)] stroke-[#142238] stroke-2" : "fill-[var(--brand-primary)] stroke-[var(--on-primary)] stroke-2"}
                  >
                    <path d="M 24 4 C 18.486 4 14 8.486 14 14 C 14 19.003129 17.696643 23.147695 22.5 23.875 L 22.5 42.5 A 1.50015 1.50015 0 1 0 25.5 42.5 L 25.5 23.875 C 30.303357 23.147695 34 19.003129 34 14 C 34 8.486 29.514 4 24 4 z M 21.5 10 C 22.328 10 23 10.672 23 11.5 C 23 12.328 22.328 13 21.5 13 C 20.672 13 20 12.328 20 11.5 C 20 10.672 20.672 10 21.5 10 z" />
                  </svg>
                </div>
              </motion.div>

              {/* Dynamic Ground Shadow underneath the needle */}
              <div
                className={`w-3.5 h-1.5 bg-[var(--brand-primary)]/40 rounded-full filter blur-[1px] transition-all duration-200 ${
                  isMapMoving ? "scale-75 opacity-25 translate-y-2" : "scale-100 opacity-60 translate-y-0"
                }`}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TOP CONFIRMATION BANNER WHEN IN CENTRAL PIN MODE ── */}
      <AnimatePresence>
        {activePinMode && !unavailable && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[2000] bg-[var(--surface-raised)] border border-[var(--border-interactive)] rounded-[12px] shadow-2xl p-4 flex flex-col gap-3 isolate"
            style={{ zIndex: 2000 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    activePinMode === "pickup" ? "bg-[var(--accent-ink)]" : "bg-[var(--brand-primary)] rounded-none"
                  }`}
                />
                <span className="text-xs font-bold tracking-tight text-[var(--text-primary)]">
                  {activePinMode === "pickup" ? "Confirm Pickup Point" : "Confirm Drop-off Point"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelPin}
                className="w-11 h-11 rounded-[8px] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] border border-[var(--border-interactive)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition flex items-center justify-center cursor-pointer"
                aria-label="Cancel pin selection"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">Drag the map, or use the arrow keys, to move the pin.</p>
            <div className="bg-[var(--surface)] rounded-[8px] p-2.5 border border-[var(--border-interactive)] flex items-start gap-2 shadow-xs">
              <MapPin size={15} className={`shrink-0 mt-0.5 ${activePinMode === "pickup" ? "text-[var(--accent-ink)]" : "text-[var(--brand-primary)]"}`} />
              <div className="flex-1 min-w-0" role="status">
                {isPinGeocoding ? (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
                    <Loader2 size={13} className="animate-spin text-[var(--accent-ink)]" />
                    <span>Resolving address...</span>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
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
                    className={`min-h-11 flex-1 py-2.5 px-2.5 rounded-[8px] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      isConfirmDisabled
                        ? "bg-[var(--surface-subtle)] text-[var(--text-secondary)] cursor-not-allowed shadow-none"
                        : "bg-[var(--action-bg)] hover:opacity-90 text-[var(--action-fg)] active:scale-95"
                    }`}
                  >
                    <Check size={14} />
                    <span>Confirm Location</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPin}
                    className="min-h-11 py-2.5 px-2.5 rounded-[8px] border border-[var(--border-interactive)] text-xs font-semibold bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
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
      {!activePinMode && !unavailable && (
        <div className={`absolute ${compactRouteSummary ? "top-16" : "top-2"} right-2 md:top-4 md:right-4 z-20 flex flex-col items-end gap-1.5 md:gap-2 pointer-events-none`}>
          {/* Route ETA & Distance Pill */}
          <AnimatePresence>
            {(km !== null || isRouting) && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 rounded-[8px] border border-[var(--border-interactive)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[var(--text-primary)] md:gap-3 md:px-3.5 md:py-2"
              >
                {isRouting ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-[var(--accent-ink)] animate-pulse rounded-full" />
                    <span className="text-[11px] font-semibold md:text-xs">Finding route…</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold tabular-nums md:text-xs">
                        {durationMin ?? Math.max(3, Math.round(((km || 5) / 25) * 60))} min
                      </span>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">({approximateRoute ? "≈ " : ""}{km} km)</span>
                    </div>
                    {!compactRouteSummary && (
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                        {approximateRoute ? "Approximate route" : "Road route"}
                      </span>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pinpoint Selector Pill (Hidden on mobile when route is already active to prevent map overlaps) */}
          <div className={`pointer-events-auto items-center gap-1 rounded-[8px] border border-[var(--border-interactive)] bg-[var(--surface-raised)] p-1 ${
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
              <span className="size-2.5 shrink-0 rounded-full bg-[var(--brand-primary)] rounded-none" />
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

      {!hideMapControls && !unavailable && (
        <MapControls
          map={readyMap}
          recenterLabel="Re-center on route"
          onRecenter={activePinMode ? undefined : handleRecenter}
          bottom={activePinMode ? 0 : compactRouteSummary ? bottomPadding : 22}
        />
      )}
    </div>
    </MotionConfig>
  );
}
