"use client";

import { useEffect, useRef, useState } from "react";
import { Map, Marker } from "maplibre-gl";
import { VOYAGER_MAP_STYLE } from "@/lib/mapConfig";
import { applyMapPalette, labelMap, makeVehicleMarker, MapAttribution, MapControls, mapFrame, MapUnavailable, observeMapSize, prepareMapRuntime } from "./MapChrome";

type Props = {
  coords: { latitude: number; longitude: number } | null;
  vehicleType?: string;
};

export default function DriverLocationMap({ coords, vehicleType }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<Marker | null>(null);
  const initial = useRef(coords);
  const [map, setMap] = useState<Map | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const lat = coords?.latitude;
  const lng = coords?.longitude;

  useEffect(() => {
    if (!container.current) return;
    const c = initial.current;
    const valid = Boolean(c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
    let instance: Map;
    try {
      prepareMapRuntime();
      instance = new Map({
        container: container.current,
        style: VOYAGER_MAP_STYLE,
        center: valid && c ? [c.longitude, c.latitude] : [78.9629, 20.5937],
        zoom: valid ? 15.5 : 5,
        attributionControl: false,
        scrollZoom: false,
      });
    } catch {
      setUnavailable(true);
      return;
    }
    labelMap(instance, "Partner location map");
    const stopResize = observeMapSize(instance, container.current);
    const stopPalette = applyMapPalette(instance, []);
    setMap(instance);
    return () => { marker.current?.remove(); marker.current = null; stopResize(); stopPalette(); instance.remove(); };
  }, []);

  useEffect(() => {
    if (!map) return;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const markerName = "Your vehicle location";
    const icon = makeVehicleMarker(vehicleType, markerName, "driver");
    if (!marker.current) {
      marker.current = new Marker({ element: icon.container, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
      map.jumpTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15) });
    } else {
      marker.current.getElement().replaceChildren(icon.vehicleEl);
      marker.current.setLngLat([lng, lat]);
    }
  }, [map, lat, lng, vehicleType]);

  return (
    <div className={mapFrame}>
      <div ref={container} className="size-full" />
      {unavailable ? <MapUnavailable /> : <>
        <MapAttribution />
        <MapControls map={map} recenterLabel="Re-center on your vehicle" onRecenter={typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) ? () => map?.jumpTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15) }) : undefined} />
      </>}
    </div>
  );
}
