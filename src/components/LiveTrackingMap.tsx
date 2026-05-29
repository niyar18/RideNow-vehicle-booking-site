"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

type Props = {
  driverLocation: [number, number] | null;
  pickupLocation: [number, number];
  dropLocation: [number, number];
  status: "arriving" | "ongoing" | "completed";
  onStats?: (data: {
    distanceToPickup: number;
    durationToPickup: number;
    distanceToDrop: number;
    durationToDrop: number;
  }) => void;
};

/* ─── ICONS ────────────────────────────────────────────────────────── */

const driverIcon = new L.DivIcon({
  html: `
    <div id="car-marker" style="
      width:52px; height:52px;
      display:flex; align-items:center; justify-content:center;
      transform-origin:center;
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      filter: drop-shadow(0 6px 18px rgba(0,0,0,0.5));
    ">
      <div style="
        background:#0a0a0a;
        width:46px; height:46px;
        border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 0 0 3px #fff,0 0 0 5px #0a0a0a,0 8px 28px rgba(0,0,0,0.5);
      ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 11L6.5 6.5H17.5L19 11" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
          <rect x="3" y="11" width="18" height="7" rx="2" stroke="white" stroke-width="1.6"/>
          <circle cx="7.5" cy="18.5" r="1.5" fill="white"/>
          <circle cx="16.5" cy="18.5" r="1.5" fill="white"/>
          <path d="M3 14H21" stroke="white" stroke-width="1" opacity="0.35"/>
        </svg>
      </div>
    </div>`,
  className: "",
  iconSize: [52, 52],
  iconAnchor: [26, 26],
});

const pickupIcon = new L.DivIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.28))">
      <div style="background:#0a0a0a;color:#fff;padding:5px 13px;border-radius:100px;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;font-family:system-ui">
        PICKUP
      </div>
      <div style="width:2px;height:9px;background:#0a0a0a"></div>
      <div style="width:10px;height:10px;background:#0a0a0a;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
    </div>`,
  className: "",
  iconSize: [80, 50],
  iconAnchor: [40, 50],
});

const dropIcon = new L.DivIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.25))">
      <div style="background:#fff;color:#0a0a0a;padding:5px 13px;border-radius:100px;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;border:1.5px solid #0a0a0a;font-family:system-ui">
        DROP
      </div>
      <div style="width:2px;height:9px;background:#0a0a0a"></div>
      <div style="width:10px;height:10px;background:#fff;border-radius:50%;border:2.5px solid #0a0a0a;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>
    </div>`,
  className: "",
  iconSize: [70, 50],
  iconAnchor: [35, 50],
});

/* ─── AUTO FOLLOW ─────────────────────────────────────────────────── */

function AutoFollow({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) {
      const z = map.getZoom() < 15 ? 15 : map.getZoom();
      map.flyTo(pos, z, { duration: 0.7, easeLinearity: 0.25 });
    }
  }, [pos, map]);
  return null;
}

/* ─── MAIN ────────────────────────────────────────────────────────── */

export default function LiveRideMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  status,
  onStats,
}: Props) {
  const [routeToPickup, setRouteToPickup] = useState<[number, number][]>([]);
  const [routeToDrop,   setRouteToDrop]   = useState<[number, number][]>([]);
  const prevLocation = useRef<[number, number] | null>(null);
  const prevStatus   = useRef<string | null>(null);

  /*
   * Status-based display logic:
   *
   * arriving  → show pickup marker + dashed line to pickup + solid line to drop
   * ongoing   → hide pickup marker, clear pickup route, solid line to drop only
   * completed → hide both routes, show only drop marker (and driver position)
   */
  const showPickupMarker = status === "arriving";
  const showPickupRoute  = status === "arriving" && routeToPickup.length > 0;
  const showDropRoute    = status !== "completed" && routeToDrop.length > 0;

  const rotateCar = (from: [number, number], to: [number, number]) => {
    const angle = Math.atan2(to[0] - from[0], to[1] - from[1]) * (180 / Math.PI);
    const el = document.getElementById("car-marker");
    if (el) el.style.transform = `rotate(${angle}deg)`;
  };

  useEffect(() => {
    if (!driverLocation) return;

    const base = "https://router.project-osrm.org/route/v1/driving/";
    const qs   = "?overview=full&geometries=geojson";
    const [dlat, dlng]   = driverLocation;
    const [plat, plng]   = pickupLocation;
    const [drlat, drlng] = dropLocation;

    const statusChanged = prevStatus.current !== status;
    prevStatus.current  = status;

    if (status === "arriving") {
      // Fetch route to pickup AND route to drop (for ETA display)
      Promise.all([
        fetch(`${base}${dlng},${dlat};${plng},${plat}${qs}`).then(r => r.json()),
        fetch(`${base}${dlng},${dlat};${drlng},${drlat}${qs}`).then(r => r.json()),
      ]).then(([pData, dData]) => {
        if (pData.routes?.length)
          setRouteToPickup(
            pData.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon])
          );
        if (dData.routes?.length)
          setRouteToDrop(
            dData.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon])
          );
        onStats?.({
          distanceToPickup: (pData.routes?.[0]?.distance ?? 0) / 1000,
          durationToPickup: (pData.routes?.[0]?.duration ?? 0) / 60,
          distanceToDrop:   (dData.routes?.[0]?.distance ?? 0) / 1000,
          durationToDrop:   (dData.routes?.[0]?.duration ?? 0) / 60,
        });
      });

    } else {
      // ongoing / completed — only need driver→drop
      // Clear pickup route immediately when status changes away from arriving
      if (statusChanged) setRouteToPickup([]);

      fetch(`${base}${dlng},${dlat};${drlng},${drlat}${qs}`)
        .then(r => r.json())
        .then(dData => {
          if (dData.routes?.length)
            setRouteToDrop(
              dData.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon])
            );
          onStats?.({
            distanceToPickup: 0,
            durationToPickup: 0,
            distanceToDrop:   (dData.routes?.[0]?.distance ?? 0) / 1000,
            durationToDrop:   (dData.routes?.[0]?.duration ?? 0) / 60,
          });
        });
    }

    if (prevLocation.current) rotateCar(prevLocation.current, driverLocation);
    prevLocation.current = driverLocation;
  }, [driverLocation, status]);

  return (
    <MapContainer
      center={pickupLocation}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors © CARTO"
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <AutoFollow pos={driverLocation} />

      {/* Driver */}
      {driverLocation && (
        <Marker position={driverLocation} icon={driverIcon}>
          <Tooltip permanent={false} direction="top" offset={[0, -32]}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", fontFamily: "system-ui" }}>
              YOUR DRIVER
            </span>
          </Tooltip>
        </Marker>
      )}

      {/* Pickup marker — only while driver is still arriving */}
      {showPickupMarker && (
        <Marker position={pickupLocation} icon={pickupIcon} />
      )}

      {/* Drop marker — always visible */}
      <Marker position={dropLocation} icon={dropIcon} />

      {/* Dashed line → pickup (arriving only) */}
      {showPickupRoute && (
        <Polyline
          positions={routeToPickup}
          pathOptions={{ color: "#888", weight: 4, dashArray: "2 10", lineCap: "round" }}
        />
      )}

      {/* Solid line → drop (arriving + ongoing) */}
      {showDropRoute && (
        <Polyline
          positions={routeToDrop}
          pathOptions={{ color: "#0a0a0a", weight: 5, lineCap: "round", lineJoin: "round" }}
        />
      )}
    </MapContainer>
  );
}