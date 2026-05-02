"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft, MapPin, Navigation,
  Bike, Car, Truck, Clock, Route,
  Zap, Search, RefreshCw
} from "lucide-react";
import VehicleBookingCard from "@/components/VehicleBookingCard";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

const VEHICLE_META: any = {
  bike:    { label: "Bike",    Icon: Bike  },
  auto:    { label: "Auto",    Icon: Car   },
  car:     { label: "Car",     Icon: Car   },
  loading: { label: "Loading", Icon: Truck },
  truck:   { label: "Truck",   Icon: Truck },
};

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();

  const [pickup,   setPickup]   = useState(params.get("pickup") || "");
  const [drop,     setDrop]     = useState(params.get("drop") || "");
  const [km,       setKm]       = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);

  const vehicle      = params.get("vehicle") || "";
  const mobileNumber = params.get("mobileNumber") || "";
  const pickupLat    = Number(params.get("pickupLat"));
  const pickupLng    = Number(params.get("pickupLng"));
  const meta         = VEHICLE_META[vehicle];
  const eta          = km !== null ? Math.max(3, Math.round((km / 25) * 60)) : null;

  async function fetchNearbyVehicles(lat: number, lng: number) {
    try {
      setLoading(true);
      const res  = await fetch("/api/vehicles/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, vehicleType: vehicle }),
      });
      const data = await res.json();
      if (data.success) setVehicles(data.vehicles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pickupLat || !pickupLng) return;
    fetchNearbyVehicles(pickupLat, pickupLng);
  }, [pickupLat, pickupLng]);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 overflow-x-hidden">

      {/* ── BACK BUTTON ── */}
      <div className="absolute top-5 left-5 z-50">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => router.back()}
          className="w-11 h-11 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:bg-zinc-50 transition-colors"
        >
          <ArrowLeft size={17} className="text-zinc-900" />
        </motion.button>
      </div>

      {/* ── MAP ── */}
      <div className="relative w-full h-[52vh] z-0">
        <RouteMap
          pickup={pickup}
          drop={drop}
          onDistance={setKm}
          onChange={(p, d) => { setPickup(p); setDrop(d); }}
        />

        {/* Soft fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-100 to-transparent pointer-events-none z-10" />

        {/* FLOATING METRICS — top center */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[999]"
        >
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-zinc-200 shadow-sm px-4 py-2 rounded-full text-xs font-semibold text-zinc-700">
            <Route size={12} className="text-zinc-400" />
            <span>{km ? `${km} km` : "Calculating…"}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-zinc-200 shadow-sm px-4 py-2 rounded-full text-xs font-semibold text-zinc-700">
            <Clock size={12} className="text-zinc-400" />
            <span>{eta ? `${eta} min` : "—"}</span>
          </div>
        </motion.div>
      </div>

      {/* ── BOTTOM SHEET ── */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
        className="relative z-20 -mt-10 bg-white rounded-t-[28px] border-t border-zinc-200 shadow-[0_-8px_40px_rgba(0,0,0,0.08)] pt-5 pb-20 min-h-[52vh]"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-5" />

        <div className="px-5 lg:px-8 max-w-6xl mx-auto">

          {/* ROUTE SUMMARY */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden mb-5"
          >
            <div className="flex gap-3 px-4 py-3 border-b border-zinc-100">
              <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                <div className="w-px flex-1 bg-zinc-300 my-1" style={{ minHeight: 14 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-0.5">Pickup</p>
                <p className="text-sm text-zinc-900 font-semibold leading-snug truncate">{pickup || "—"}</p>
              </div>
              <MapPin size={14} className="text-zinc-400 flex-shrink-0 mt-1.5" />
            </div>
            <div className="flex gap-3 px-4 py-3">
              <div className="flex-shrink-0 pt-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-zinc-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-0.5">Drop</p>
                <p className="text-sm text-zinc-900 font-semibold leading-snug truncate">{drop || "—"}</p>
              </div>
              <Navigation size={14} className="text-zinc-400 flex-shrink-0 mt-1.5" />
            </div>
          </motion.div>

          {/* SECTION HEADER */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between mb-4"
          >
            <div>
              <h2 className="text-zinc-900 text-lg font-black tracking-tight">
                {loading
                  ? "Finding vehicles…"
                  : vehicles.length > 0
                  ? `${vehicles.length} Available`
                  : "No vehicles nearby"}
              </h2>
              {meta && (
                <p className="text-zinc-400 text-xs mt-0.5">
                  {meta.label} rides near your pickup
                </p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="flex items-center gap-2 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-full"
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin" />
                  <span className="text-zinc-500 text-xs font-semibold">Searching</span>
                </motion.div>
              ) : vehicles.length > 0 ? (
                <motion.div
                  key="live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full"
                >
                  <Zap size={11} className="text-emerald-600 fill-emerald-600" />
                  <span className="text-emerald-700 text-xs font-bold">Live</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          {/* EMPTY STATE */}
          <AnimatePresence>
            {!loading && vehicles.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-4">
                  <Search size={26} className="text-zinc-400" />
                </div>
                <p className="text-zinc-900 font-bold text-base mb-1">No vehicles found</p>
                <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                  No {meta?.label || "vehicle"} drivers are available near your pickup right now.
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchNearbyVehicles(pickupLat, pickupLng)}
                  className="mt-5 flex items-center gap-2 bg-zinc-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  <RefreshCw size={14} /> Retry Search
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* VEHICLE GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {vehicles.map((v, i) => (
              <motion.div
                key={v._id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              >
                <VehicleBookingCard
                  vehicle={v}
                  distanceKm={km ?? undefined}
                  isRecommended={i === 0}
                  onBook={() => {
                    const url = new URLSearchParams({
                      pickup, drop,
                      vehicle:    v.type,
                      driverId:   v.owner,
                      vehicleId:  v._id,
                      fare:       String(Math.round(v.baseFare + (km ?? 0) * v.pricePerKm)),
                      pickupLat:  String(pickupLat),
                      pickupLng:  String(pickupLng),
                      dropLat:    params.get("dropLat") || "",
                      dropLng:    params.get("dropLng") || "",
                      mobileNumber,
                    });
                    router.push(`/checkout?${url.toString()}`);
                  }}
                />
              </motion.div>
            ))}
          </div>

        </div>
      </motion.div>
    </div>
  );
}