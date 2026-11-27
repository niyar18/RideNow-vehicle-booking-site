"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft, MapPin, Navigation,
  Bike, Car, Truck, Clock, Route,
  Zap, Search, RefreshCw
} from "lucide-react";
import VehicleBookingCard from "@/features/booking/components/VehicleBookingCard";

const RouteMap = dynamic(() => import("@/features/maps/components/RouteMap"), { ssr: false });
import { pricingVehicleForChoice, type FareRateTable } from "@/lib/farePolicy";
import { VEHICLE_OPTIONS } from "@/lib/vehicleConfig";

const VEHICLE_META: Record<string, { label: string; Icon: typeof Bike }> = {
  scooty:   { label: VEHICLE_OPTIONS.scooty.label,   Icon: Bike  },
  bike:     { label: VEHICLE_OPTIONS.bike.label,     Icon: Bike  },
  auto:     { label: VEHICLE_OPTIONS.auto.label,     Icon: Car   },
  mini:     { label: VEHICLE_OPTIONS.mini.label,     Icon: Car   },
  car:      { label: VEHICLE_OPTIONS.car.label,      Icon: Car   },
  priority: { label: VEHICLE_OPTIONS.priority.label, Icon: Car   },
  loading:  { label: VEHICLE_OPTIONS.loading.label,  Icon: Truck },
  truck:    { label: VEHICLE_OPTIONS.truck.label,    Icon: Truck },
};

export default function SearchPageContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [pickup,   setPickup]   = useState(params.get("pickup") || "");
  const [drop,     setDrop]     = useState(params.get("drop") || "");
  const [km,       setKm]       = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [rates, setRates] = useState<FareRateTable | null>(null);

  const vehicle      = params.get("vehicle") || "";
  const mobileNumber = params.get("mobileNumber") || "";
  const pickupLat    = Number(params.get("pickupLat"));
  const pickupLng    = Number(params.get("pickupLng"));
  const meta         = VEHICLE_META[vehicle];
  const eta          = km !== null ? Math.max(3, Math.round((km / 25) * 60)) : null;

  async function fetchNearbyVehicles(lat: number, lng: number, silent = false) {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }

  const handleDistance = useCallback((distance: number) => {
    setKm(distance);
  }, []);

  const handleMapChange = useCallback((p: string, d: string) => {
    setPickup(p);
    setDrop(d);
  }, []);

  useEffect(() => {
    if (!pickupLat || !pickupLng) return;
    fetchNearbyVehicles(pickupLat, pickupLng);

    // Auto-refresh drivers location every 15 seconds silently
    const interval = setInterval(() => {
      fetchNearbyVehicles(pickupLat, pickupLng, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [pickupLat, pickupLng, vehicle]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/vehicles/pricing", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((data) => { if (data.success && !controller.signal.aborted) setRates(data.rates); })
      .catch(() => { /* Default rates are fallback estimates only. */ });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex max-w-[86rem] items-center gap-3 px-4 py-4 sm:px-7">
          <button
            type="button"
            onClick={() => router.back()}
            className="grid size-11 shrink-0 place-items-center rounded-[8px] border border-[var(--border-default)] hover:bg-[var(--surface-subtle)]"
            aria-label="Go back"
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Plan your trip</p>
            <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">Available rides</h1>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[86rem] gap-4 px-4 py-4 sm:gap-6 sm:px-7 sm:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)] lg:items-start">
      <section aria-label="Route map" className="relative isolate h-[30dvh] min-h-48 overflow-hidden rounded-[12px] border border-[var(--border-default)] lg:sticky lg:top-6 lg:h-[min(74dvh,52rem)]">
        <RouteMap
          pickup={pickup}
          drop={drop}
          pickupCoords={(pickupLat && pickupLng) ? [pickupLat, pickupLng] : null}
          dropCoords={(params.get("dropLat") && params.get("dropLng")) ? [Number(params.get("dropLat")), Number(params.get("dropLng"))] : null}
          onDistance={handleDistance}
          onChange={handleMapChange}
          vehicles={vehicles}
          bottomPadding={40}
        />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute top-3 left-3 flex items-center gap-2 z-10"
        >
          <div className="flex items-center gap-2 bg-[var(--surface-raised)] border border-[var(--border-default)] px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[var(--text-primary)]">
            <Route size={12} className="text-[var(--text-primary)]" />
            <span>{km ? `${km} km` : "Calculating…"}</span>
          </div>
          <div className="flex items-center gap-2 bg-[var(--surface-raised)] border border-[var(--border-default)] px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[var(--text-primary)]">
            <Clock size={12} className="text-[var(--text-primary)]" />
            <span>{eta ? `${eta} min` : "—"}</span>
          </div>
        </motion.div>
      </section>

      <motion.section
        aria-label="Ride options"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
        className="min-w-0 pb-8"
      >
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[12px] overflow-hidden mb-5 shadow-2xs"
          >
            <div className="flex gap-3 px-4 py-3 border-b border-[var(--border-default)]/60">
              <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#142238]" />
                <div className="w-px flex-1 bg-[#b3c8ca] my-1" style={{ minHeight: 14 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-0.5">Pickup</p>
                <p className="text-sm text-[var(--text-primary)] font-semibold leading-snug truncate">{pickup || "—"}</p>
              </div>
              <MapPin size={14} className="text-[var(--text-primary)] flex-shrink-0 mt-1.5" />
            </div>
            <div className="flex gap-3 px-4 py-3">
              <div className="flex-shrink-0 pt-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E34222]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-0.5">Drop</p>
                <p className="text-sm text-[var(--text-primary)] font-semibold leading-snug truncate">{drop || "—"}</p>
              </div>
              <Navigation size={14} className="text-[#E34222] flex-shrink-0 mt-1.5" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between mb-4"
          >
            <div>
              <h2 className="text-[var(--text-primary)] text-lg font-bold tracking-tight">
                {loading
                  ? "Finding vehicles…"
                  : vehicles.length > 0
                  ? `${vehicles.length} Available`
                  : "No vehicles nearby"}
              </h2>
              {meta && (
                <p className="text-[var(--text-secondary)] text-xs mt-0.5">
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
                  className="flex items-center gap-2 bg-[var(--surface-subtle)] border border-[var(--border-default)] px-3 py-1.5 rounded-full"
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#142238]/30 border-t-[#142238] animate-spin" />
                  <span className="text-[var(--text-primary)] text-xs font-semibold">Searching</span>
                </motion.div>
              ) : vehicles.length > 0 ? (
                <motion.div
                  key="live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 bg-[var(--surface-subtle)] border border-[var(--border-default)] px-3 py-1.5 rounded-full"
                >
                  <Zap size={11} className="text-[var(--text-primary)] fill-[#142238]" />
                  <span className="text-[var(--text-primary)] text-xs font-bold">Live</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {!loading && vehicles.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 text-center"
              >
                <div className="w-16 h-16 rounded-[12px] bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center mb-3 text-[var(--text-primary)]">
                  <Search size={24} />
                </div>
                <p className="text-[var(--text-primary)] font-bold text-base mb-1">No vehicles found</p>
                <p className="text-[var(--text-secondary)] text-sm max-w-xs leading-relaxed">
                  No {meta?.label || "vehicle"} drivers are available near your pickup right now.
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchNearbyVehicles(pickupLat, pickupLng)}
                  className="mt-4 flex items-center gap-2 bg-[#142238] hover:bg-[#101c2f] text-white text-xs font-bold px-5 py-2.5 rounded-[8px] transition cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Retry Search</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
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
                  rates={rates}
                  isRecommended={i === 0}
                  onBook={() => {
                    const draft = {
                      pickup,
                      drop,
                      vehicle:    pricingVehicleForChoice(v.type, km ?? 0),
                      driverId:   v.owner,
                      vehicleId:  v._id,
                      pickupLat:  Number(pickupLat),
                      pickupLng:  Number(pickupLng),
                      dropLat:    params.get("dropLat") ? Number(params.get("dropLat")) : null,
                      dropLng:    params.get("dropLng") ? Number(params.get("dropLng")) : null,
                      mobileNumber,
                      distanceKm: km,
                    };
                    try {
                      if (typeof window !== "undefined") {
                        const serialized = JSON.stringify(draft);
                        sessionStorage.setItem("ridenow_booking_draft", serialized);
                        localStorage.setItem("ridenow_booking_draft", serialized);
                      }
                    } catch (e) {
                      console.warn("sessionStorage save error:", e);
                    }
                    router.push("/checkout");
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
      </div>
    </div>
  );
}
