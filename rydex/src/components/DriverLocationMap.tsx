"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

type Props = {
  coords: { latitude: number; longitude: number } | null;
};

const driverIcon = new L.DivIcon({
  html: `
    <div style="
      background:#0a0a0a;
      width:36px; height:36px;
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 0 0 2.5px #fff, 0 8px 24px rgba(0,0,0,0.3);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 11L6.5 6.5H17.5L19 11" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <rect x="3" y="11" width="18" height="7" rx="2" stroke="white" stroke-width="2"/>
        <circle cx="7.5" cy="18.5" r="1.5" fill="white"/>
        <circle cx="16.5" cy="18.5" r="1.5" fill="white"/>
      </svg>
    </div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function CenterMap({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15, { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function DriverLocationMap({ coords }: Props) {
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const center: [number, number] | null = coords
    ? [coords.latitude, coords.longitude]
    : null;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-200 shadow-inner">
      <MapContainer
        center={center ?? defaultCenter}
        zoom={center ? 15 : 5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={false}
      >
        <CenterMap center={center} />
        <TileLayer
          attribution="&copy; Google Maps"
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        {center && <Marker position={center} icon={driverIcon} />}
      </MapContainer>
    </div>
  );
}
