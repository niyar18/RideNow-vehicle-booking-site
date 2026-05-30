"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation2 } from "lucide-react";

type Props = {
  pickup: string;
  drop: string;
  onDistance?: (km: number) => void;
  onChange?: (pickup: string, drop: string) => void;
};

/* ─── ICONS ── black/white theme ─────────────────────────────────── */

const pickupIcon = new L.DivIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.22))">
      <div style="
        background:#0a0a0a;color:#fff;
        padding:5px 14px;border-radius:100px;
        font-size:10px;font-weight:800;letter-spacing:0.14em;
        text-transform:uppercase;white-space:nowrap;
        font-family:-apple-system,system-ui,sans-serif;
        box-shadow:0 2px 12px rgba(0,0,0,0.25);
      ">PICKUP</div>
      <div style="width:2px;height:10px;background:#0a0a0a;opacity:0.4"></div>
      <div style="
        width:13px;height:13px;background:#0a0a0a;border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 0 0 2px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.3);
      "></div>
    </div>`,
  className: "",
  iconSize: [90, 58],
  iconAnchor: [45, 58],
});

const dropIcon = new L.DivIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.2))">
      <div style="
        background:#fff;color:#0a0a0a;
        padding:5px 14px;border-radius:100px;
        font-size:10px;font-weight:800;letter-spacing:0.14em;
        text-transform:uppercase;white-space:nowrap;
        font-family:-apple-system,system-ui,sans-serif;
        border:1.5px solid #0a0a0a;
        box-shadow:0 2px 12px rgba(0,0,0,0.15);
      ">DROP</div>
      <div style="width:2px;height:10px;background:#0a0a0a;opacity:0.4"></div>
      <div style="
        width:13px;height:13px;background:#fff;border-radius:50%;
        border:3px solid #0a0a0a;
        box-shadow:0 0 0 2px rgba(0,0,0,0.08), 0 3px 10px rgba(0,0,0,0.2);
      "></div>
    </div>`,
  className: "",
  iconSize: [80, 58],
  iconAnchor: [40, 58],
});

/* ─── FIT BOUNDS ──────────────────────────────────────────────────── */
function FitBounds({ p1, p2 }: { p1: [number, number]; p2: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.fitBounds([p1, p2], { padding: [72, 72], maxZoom: 15, animate: true, duration: 1 });
  }, [p1, p2, map]);
  return null;
}

/* ─── ZOOM CONTROLS (inside MapContainer) ────────────────────────── */
function ZoomControlsWrapper() {
  const map = useMap();
  return (
    <div
      style={{ position: "absolute", bottom: 24, right: 16, zIndex: 500, display: "flex", flexDirection: "column", gap: 6 }}
      onClick={e => e.stopPropagation()}
    >
      {[
        { label: "+", action: () => map.zoomIn()  },
        { label: "−", action: () => map.zoomOut() },
      ].map(({ label, action }) => (
        <button
          key={label}
          onClick={action}
          style={{
            width: 40, height: 40,
            background: "#fff",
            border: "1.5px solid #e4e4e7",
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#0a0a0a",
            fontSize: 18, fontWeight: 400,
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            transition: "background 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f4f4f5"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.14)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#fff";    e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.1)";  }}
        >{label}</button>
      ))}
    </div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────────── */
export default function RouteMap({ pickup, drop, onDistance, onChange }: Props) {
  const [p1,    setP1]    = useState<[number, number] | null>(null);
  const [p2,    setP2]    = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [ready, setReady] = useState(false);
  const [km,    setKm]    = useState<number | null>(null);

  const geocode = async (q: string): Promise<[number, number] | null> => {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`);
    const d = await r.json();
    if (!d?.features?.length) return null;
    const [lon, lat] = d.features[0].geometry.coordinates;
    return [lat, lon];
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1`);
    const d = await r.json();
    if (!d?.features?.length) return "";
    const p = d.features[0].properties;
    return [p.name, p.city, p.state, p.country].filter(Boolean).join(", ");
  };

  const loadRoute = async (a: [number, number], b: [number, number]) => {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`
    );
    const d = await r.json();
    if (!d?.routes?.length) return;
    setRoute(d.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon]));
    const distKm = +((d.routes[0].distance / 1000).toFixed(2));
    setKm(distKm);
    onDistance?.(distKm);
  };

  useEffect(() => {
    setReady(false);
    setRoute([]);
    (async () => {
      const a = await geocode(pickup);
      const b = await geocode(drop);
      if (!a || !b) return;
      setP1(a); setP2(b);
      await loadRoute(a, b);
      setReady(true);
    })();
  }, [pickup, drop]);

  const onDragPickup = async (lat: number, lon: number) => {
    const addr = await reverseGeocode(lat, lon);
    setP1([lat, lon]);
    onChange?.(addr, drop);
    if (p2) loadRoute([lat, lon], p2);
  };

  const onDragDrop = async (lat: number, lon: number) => {
    const addr = await reverseGeocode(lat, lon);
    setP2([lat, lon]);
    onChange?.(pickup, addr);
    if (p1) loadRoute(p1, [lat, lon]);
  };

  return (
    <div className="relative h-full w-full bg-zinc-100">

      {/* ── MAP ── */}
      <MapContainer
        center={p1 ?? [20.5937, 78.9629]}
        zoom={p1 ? 13 : 5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        dragging
        zoomControl={false}
      >
        {/* CartoDB light — clean white/grey streets */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {p1 && p2 && <FitBounds p1={p1} p2={p2} />}

        {p1 && (
          <Marker
            position={p1}
            icon={pickupIcon}
            draggable
            eventHandlers={{ dragend: e => { const m = e.target.getLatLng(); onDragPickup(m.lat, m.lng); } }}
          />
        )}

        {p2 && (
          <Marker
            position={p2}
            icon={dropIcon}
            draggable
            eventHandlers={{ dragend: e => { const m = e.target.getLatLng(); onDragDrop(m.lat, m.lng); } }}
          />
        )}

        {/* Route — black triple layer on white map */}
        {route.length > 0 && (
          <>
            <Polyline positions={route} pathOptions={{ color: "#0a0a0a", weight: 14, opacity: 0.05, lineCap: "round", lineJoin: "round" }} />
            <Polyline positions={route} pathOptions={{ color: "#0a0a0a", weight: 6,  opacity: 0.12, lineCap: "round", lineJoin: "round" }} />
            <Polyline positions={route} pathOptions={{ color: "#0a0a0a", weight: 3.5, opacity: 1,  lineCap: "round", lineJoin: "round" }} />
          </>
        )}

        <ZoomControlsWrapper />
      </MapContainer>

      {/* ── LOADING OVERLAY ── */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 z-[999] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-4"
          >
            <div className="relative w-14 h-14 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-zinc-900"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border border-transparent border-t-zinc-300"
              />
              <MapPin size={15} className="text-zinc-800" />
            </div>
            <div className="text-center">
              <p className="text-zinc-900 text-xs font-black tracking-[0.22em] uppercase">Loading Map</p>
              <p className="text-zinc-400 text-[10px] font-medium tracking-wider mt-0.5">Plotting your route…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROUTE BADGE (bottom left) ── */}
      <AnimatePresence>
        {ready && km !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-6 left-4 z-[500] flex items-center gap-2 bg-white border border-zinc-200 px-3.5 py-2 rounded-xl shadow-lg"
          >
            <Navigation2 size={13} className="text-zinc-900" />
            <span className="text-zinc-900 text-xs font-bold">{km} km</span>
            <span className="w-px h-3 bg-zinc-200" />
            <span className="text-zinc-400 text-xs font-medium">
              ~{Math.max(3, Math.round((km / 25) * 60))} min
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DRAG HINT ── */}
      <AnimatePresence>
        {ready && <DragHintBadge />}
      </AnimatePresence>
    </div>
  );
}

/* ── Drag hint auto-hides after 3s ── */
function DragHintBadge() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-[500] pointer-events-none flex items-center gap-2 bg-white border border-zinc-200 shadow-md px-3 py-1.5 rounded-full"
        >
          <motion.div
            animate={{ x: [0, 4, 0, -4, 0] }}
            transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}
          >
            <MapPin size={11} className="text-zinc-500" />
          </motion.div>
          <span className="text-zinc-500 text-[10px] font-semibold tracking-wide">Drag pins to adjust</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}