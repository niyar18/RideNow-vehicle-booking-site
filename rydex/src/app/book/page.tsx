"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, MapPin, Navigation,
  Bike, Car, Truck, LocateFixed, Phone,
  CheckCircle2, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type Place = {
  id: string; name: string; city?: string; state?: string;
  country?: string; countrycode?: string; lat: number; lng: number;
};
type VehicleType = "bike" | "auto" | "car" | "loading" | "truck";

const VEHICLES = [
  { id: "bike",    label: "Bike",    Icon: Bike,  desc: "Quick & affordable" },
  { id: "auto",    label: "Auto",    Icon: Car,   desc: "Everyday rides"     },
  { id: "car",     label: "Car",     Icon: Car,   desc: "Comfort rides"      },
  { id: "loading", label: "Loading", Icon: Truck, desc: "Small cargo"        },
  { id: "truck",   label: "Truck",   Icon: Truck, desc: "Heavy transport"    },
];

const stepVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export default function BookPage() {
  const router = useRouter();

  const [pickup,   setPickup]   = useState("");
  const [drop,     setDrop]     = useState("");
  const [vehicle,  setVehicle]  = useState<VehicleType | null>(null);
  const [mobile,   setMobile]   = useState("");

  const [rates, setRates] = useState<any>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/vehicles/pricing");
        const data = await res.json();
        if (data.success) {
          setRates(data.rates);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic rates:", err);
      }
    };
    fetchRates();
  }, []);

  const estimateFare = (type: string, distanceKm: number) => {
    const defaultRates: Record<string, { baseFare: number; pricePerKm: number; pricePerMinute: number; multiplier: number; minDistance: number; maxDistance: number }> = {
      bike:    { baseFare: 30,  pricePerKm: 8,   pricePerMinute: 1.5, multiplier: 1.0, minDistance: 0, maxDistance: 15 },
      auto:    { baseFare: 50,  pricePerKm: 12,  pricePerMinute: 2.0, multiplier: 1.2, minDistance: 0, maxDistance: 30 },
      car:     { baseFare: 80,  pricePerKm: 18,  pricePerMinute: 3.0, multiplier: 1.5, minDistance: 0, maxDistance: 100 },
      loading: { baseFare: 120, pricePerKm: 24,  pricePerMinute: 4.0, multiplier: 1.8, minDistance: 0, maxDistance: 150 },
      truck:   { baseFare: 180, pricePerKm: 30,  pricePerMinute: 5.0, multiplier: 2.2, minDistance: 0, maxDistance: 500 },
    };

    const source = rates || defaultRates;
    const cfg = source[type.toLowerCase()] || defaultRates.car;
    const timeMinutes = (distanceKm / 25) * 60;
    const fare = (cfg.baseFare + distanceKm * cfg.pricePerKm + timeMinutes * cfg.pricePerMinute) * cfg.multiplier;
    return Math.round(fare);
  };

  const checkLimit = (type: string, dist: number) => {
    const defaultLimits: Record<string, { minDistance: number; maxDistance: number }> = {
      bike:    { minDistance: 0, maxDistance: 15 },
      auto:    { minDistance: 0, maxDistance: 30 },
      car:     { minDistance: 0, maxDistance: 100 },
      loading: { minDistance: 0, maxDistance: 150 },
      truck:   { minDistance: 0, maxDistance: 500 },
    };
    const source = rates || defaultLimits;
    const cfg = source[type.toLowerCase()] || defaultLimits.car;
    const min = cfg.minDistance !== undefined ? cfg.minDistance : 0;
    const max = cfg.maxDistance !== undefined ? cfg.maxDistance : 9999;
    return dist >= min && dist <= max;
  };

  const getDistanceValidity = () => {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicle) return { valid: true };
    const distanceKm = getHaversineDistance(pickupLat, pickupLng, dropLat, dropLng);
    
    const defaultLimits: Record<string, { minDistance: number; maxDistance: number }> = {
      bike:    { minDistance: 0, maxDistance: 15 },
      auto:    { minDistance: 0, maxDistance: 30 },
      car:     { minDistance: 0, maxDistance: 100 },
      loading: { minDistance: 0, maxDistance: 150 },
      truck:   { minDistance: 0, maxDistance: 500 },
    };
    
    const source = rates || defaultLimits;
    const cfg = source[vehicle.toLowerCase()] || defaultLimits.car;
    const min = cfg.minDistance !== undefined ? cfg.minDistance : 0;
    const max = cfg.maxDistance !== undefined ? cfg.maxDistance : 9999;
    
    if (distanceKm < min) {
      return { valid: false, message: `${VEHICLES.find(v => v.id === vehicle)?.label} requires a minimum ride distance of ${min} km (Current: ${distanceKm.toFixed(1)} km)` };
    }
    if (distanceKm > max) {
      return { valid: false, message: `${VEHICLES.find(v => v.id === vehicle)?.label} is limited to a maximum ride distance of ${max} km (Current: ${distanceKm.toFixed(1)} km)` };
    }
    return { valid: true };
  };

  const [pickupResults, setPickupResults] = useState<Place[]>([]);
  const [dropResults,   setDropResults]   = useState<Place[]>([]);
  const [pickupCountry, setPickupCountry] = useState<string | null>(null);

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropLat,   setDropLat]   = useState<number | null>(null);
  const [dropLng,   setDropLng]   = useState<number | null>(null);
  const [locating,  setLocating]  = useState(false);
  const [vehicles,  setVehicles]  = useState<any[]>([]);

  const distanceValidity = getDistanceValidity();
  const canContinue = !!(pickup && drop && vehicle && mobile && pickupLat && pickupLng && dropLat && dropLng && distanceValidity.valid);

  /* ── SEARCH ── */
  const searchAddress = async (q: string, setResults: (r: Place[]) => void, restrict?: string | null) => {
    if (!q || q.trim().length < 3) { setResults([]); return; }
    try {
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}`;
      if (restrict) {
        url += `&countrycode=${restrict}`;
      }
      const res  = await fetch(url);
      const data = await res.json();
      
      const results: Place[] = (data?.features || []).map((feature: any) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [0, 0];
        const description = [props.name, props.city, props.state, props.country]
          .filter(Boolean)
          .join(", ");
        return {
          id: `${props.osm_type || "N"}-${props.osm_id || Math.random()}`,
          name: description,
          city: props.city,
          state: props.state,
          country: props.country,
          countrycode: String(props.countrycode || "in").toLowerCase(),
          lat: coords[1],
          lng: coords[0],
        };
      });
      setResults(results);
    } catch (err) {
      console.error("Photon autocomplete error:", err);
      setResults([]);
    }
  };

  const fmt = (p: Place) => p.name;

  const selectPlace = (p: Place, isPickup: boolean) => {
    if (isPickup) {
      setPickup(p.name);
      setPickupCountry(p.countrycode || null);
      setPickupLat(p.lat);
      setPickupLng(p.lng);
      setPickupResults([]);
    } else {
      setDrop(p.name);
      setDropLat(p.lat);
      setDropLng(p.lng);
      setDropResults([]);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://photon.komoot.io/reverse?lat=${coords.latitude}&lon=${coords.longitude}`);
          const data = await res.json();
          if (data?.features?.length) {
            const first = data.features[0];
            const props = first.properties || {};
            const addr = [props.name, props.city, props.state, props.country]
              .filter(Boolean)
              .join(", ");
            const countryCode = String(props.countrycode || "in").toLowerCase();

            setPickup(addr);
            setPickupCountry(countryCode);
            setPickupLat(coords.latitude);
            setPickupLng(coords.longitude);
            setPickupResults([]);
          }
        } catch (err) {
          console.error("Failed to reverse geocode current location:", err);
        } finally { setLocating(false); }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /* ── INITIAL LOCATION ON MOUNT ── */
  useEffect(() => {
    useCurrentLocation();
  }, []);

  /* ── FETCH NEARBY VEHICLES ── */
  useEffect(() => {
    if (!pickupLat || !pickupLng) {
      setVehicles([]);
      return;
    }
    const fetchVehicles = async () => {
      try {
        const res = await fetch("/api/vehicles/nearby", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: pickupLat,
            longitude: pickupLng,
            vehicleType: vehicle || undefined
          })
        });
        const data = await res.json();
        if (data.success) setVehicles(data.vehicles);
      } catch (err) {
        console.error(err);
      }
    };
    fetchVehicles();

    // Auto-refresh drivers location every 8 seconds
    const interval = setInterval(fetchVehicles, 8000);
    return () => clearInterval(interval);
  }, [pickupLat, pickupLng, vehicle]);

  const handleMapChange = (p: string, d: string, c1?: [number, number] | null, c2?: [number, number] | null) => {
    setPickup(p);
    setDrop(d);
    if (c1) {
      setPickupLat(c1[0]);
      setPickupLng(c1[1]);
    }
    if (c2) {
      setDropLat(c2[0]);
      setDropLng(c2[1]);
    }
  };

  /* ── PROGRESS ── */
  const progress = [!!vehicle, !!(mobile.length >= 10), !!pickup, !!drop].filter(Boolean).length;

  return (
    <div className="relative min-h-screen w-full bg-zinc-100 flex flex-col md:flex-row overflow-hidden">
      
      {/* ── LEFT PANEL (Booking Form) ── */}
      <div className="w-full md:w-[450px] bg-white border-r border-zinc-200 shadow-2xl z-20 flex flex-col h-[55vh] md:h-screen flex-shrink-0 order-2 md:order-1 pt-24 md:pt-4">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-4 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} className="text-zinc-900" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-zinc-900 text-lg font-black tracking-tight leading-none">Book a Ride</h1>
            <p className="text-zinc-400 text-[10px] font-bold mt-1 uppercase tracking-wider">RideNow Fleet</p>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ width: i < progress ? 16 : 6, background: i < progress ? "#09090b" : "#d4d4d8" }}
                transition={{ duration: 0.3 }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ══ STEP 1 — VEHICLE ══ */}
          <motion.div variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.05 }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[9px] font-black">1</span>
              </div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Choose Vehicle</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {VEHICLES.map((v, i) => {
                const active = vehicle === v.id;
                const distanceKm = (pickupLat && pickupLng && dropLat && dropLng) ? getHaversineDistance(pickupLat, pickupLng, dropLat, dropLng) : null;
                const isLimitOk = distanceKm !== null ? checkLimit(v.id, distanceKm) : true;
                return (
                  <motion.button
                    key={v.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.07 + i * 0.05 }}
                    whileTap={isLimitOk ? { scale: 0.95 } : {}}
                    onClick={() => setVehicle(v.id as VehicleType)}
                    className={`relative p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all duration-200 ${
                      active
                        ? "bg-zinc-900 border-zinc-900 shadow-lg"
                        : "bg-zinc-50 border-zinc-200 hover:border-zinc-400"
                    } ${!isLimitOk ? "opacity-45 hover:border-zinc-200 cursor-not-allowed" : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? "bg-white" : "bg-zinc-200"
                    }`}>
                      <v.Icon size={18} className={active ? "text-zinc-900" : "text-zinc-600"} />
                    </div>
                    <div className="min-w-0 font-sans">
                      <p className={`text-sm font-bold truncate ${active ? "text-white" : "text-zinc-900"}`}>{v.label}</p>
                      <p className={`text-[10px] truncate ${active ? "text-zinc-400" : "text-zinc-400"}`}>{v.desc}</p>
                      {distanceKm !== null && (
                        <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                          <p className={`text-xs font-black leading-none ${active ? "text-amber-400" : "text-zinc-900"}`}>
                            ₹{estimateFare(v.id, distanceKm)}
                          </p>
                          {!isLimitOk && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md leading-none border border-rose-200 shadow-sm">
                              Limit Exceeded
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {active && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute top-2.5 right-2.5"
                      >
                        <CheckCircle2 size={13} className="text-white fill-white/20" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <div className="h-px bg-zinc-100" />

          {/* ══ STEP 2 — MOBILE ══ */}
          <motion.div variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[9px] font-black">2</span>
              </div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mobile Number</p>
            </div>

            <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 focus-within:border-zinc-900 focus-within:bg-white transition-all">
              <div className="w-8 h-8 rounded-xl bg-zinc-200 flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-zinc-600" />
              </div>
              <input
                type="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter your mobile number"
                inputMode="numeric"
                maxLength={15}
                className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none"
              />
              <AnimatePresence>
                {mobile.length >= 10 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-50 flex-shrink-0" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <div className="h-px bg-zinc-100" />

          {/* ══ STEP 3 — ROUTE ══ */}
          <motion.div variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.22 }} className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[9px] font-black">3</span>
              </div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Route Setup</p>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-visible">
              
              {/* Pickup input */}
              <div className="relative z-30">
                <div className="flex items-center gap-3 px-4 py-3.5 focus-within:bg-white rounded-t-2xl transition-colors">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow" />
                    <div className="w-px h-5 bg-zinc-300 mt-1" />
                  </div>
                  <input
                    value={pickup}
                    onChange={e => { setPickup(e.target.value); searchAddress(e.target.value, setPickupResults); }}
                    placeholder="Pickup location"
                    className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none"
                  />
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className="w-8 h-8 rounded-xl bg-zinc-200 hover:bg-zinc-300 transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    <LocateFixed size={14} className={`text-zinc-700 ${locating ? "animate-spin" : ""}`} />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {pickupResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto z-50"
                    >
                      {pickupResults.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => selectPlace(p, true)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                        >
                          <MapPin size={13} className="text-zinc-400 flex-shrink-0" />
                          <span className="text-sm text-zinc-800 font-medium truncate">{fmt(p)}</span>
                          <ChevronRight size={13} className="text-zinc-300 flex-shrink-0 ml-auto" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-px bg-zinc-200 mx-4" />

              {/* Drop input */}
              <div className="relative z-10">
                <div className="flex items-center gap-3 px-4 py-3.5 focus-within:bg-white rounded-b-2xl transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 rounded-sm bg-zinc-900 border-2 border-white shadow" />
                  </div>
                  <input
                    value={drop}
                    onChange={e => { setDrop(e.target.value); searchAddress(e.target.value, setDropResults, pickupCountry); }}
                    disabled={!pickupCountry}
                    placeholder={pickupCountry ? "Drop location" : "Select pickup first"}
                    className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none disabled:opacity-50"
                  />
                  <Navigation size={14} className="text-zinc-300 flex-shrink-0" />
                </div>

                <AnimatePresence>
                  {dropResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto z-50"
                    >
                      {dropResults.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => selectPlace(p, false)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                        >
                          <Navigation size={13} className="text-zinc-400 flex-shrink-0" />
                          <span className="text-sm text-zinc-800 font-medium truncate">{fmt(p)}</span>
                          <ChevronRight size={13} className="text-zinc-300 flex-shrink-0 ml-auto" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>

          {/* ══ CONTINUE CTA ══ */}
          <motion.div variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={canContinue ? { scale: 1.02 } : {}}
              disabled={!canContinue}
              onClick={() => {
                if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicle) return;
                const distanceKm = getHaversineDistance(pickupLat, pickupLng, dropLat, dropLng);
                const estFare = estimateFare(vehicle, distanceKm);
                router.push(
                  `/checkout?pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}&vehicle=${vehicle}&mobileNumber=${encodeURIComponent(mobile)}&pickupLat=${pickupLat}&pickupLng=${pickupLng}&dropLat=${dropLat}&dropLng=${dropLng}&fare=${estFare}`
                );
              }}
              className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-black disabled:opacity-35 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2.5 transition-colors shadow-lg disabled:shadow-none"
            >
              <span>Request Ride</span>
              <motion.div
                animate={canContinue ? { x: [0, 4, 0] } : {}}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
              >
                <ArrowRight size={17} />
              </motion.div>
            </motion.button>
            
            <AnimatePresence>
              {!canContinue && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={`text-center text-[10px] font-bold mt-2.5 uppercase tracking-wider ${
                    !distanceValidity.valid ? "text-rose-500" : "text-zinc-400"
                  }`}
                >
                  {!vehicle ? "Select a vehicle type" :
                   mobile.length < 10 ? "Enter mobile number" :
                   !pickup ? "Set pickup location" :
                   !drop ? "Set drop location" :
                   !distanceValidity.valid ? distanceValidity.message : ""}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>

      {/* ── RIGHT PANEL (Full Map) ── */}
      <div className="flex-1 h-[45vh] md:h-screen z-10 order-1 md:order-2 relative">
        <RouteMap
          pickup={pickup}
          drop={drop}
          pickupCoords={pickupLat && pickupLng ? [pickupLat, pickupLng] : null}
          dropCoords={dropLat && dropLng ? [dropLat, dropLng] : null}
          onChange={handleMapChange}
          vehicles={vehicles}
        />
      </div>

    </div>
  );
}