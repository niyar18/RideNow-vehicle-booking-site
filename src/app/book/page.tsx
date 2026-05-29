"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, MapPin, Navigation,
  Bike, Car, Truck, LocateFixed, Phone,
  CheckCircle2, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export default function BookPage() {
  const router = useRouter();

  const [pickup,   setPickup]   = useState("");
  const [drop,     setDrop]     = useState("");
  const [vehicle,  setVehicle]  = useState<VehicleType | null>(null);
  const [mobile,   setMobile]   = useState("");

  const [pickupResults, setPickupResults] = useState<Place[]>([]);
  const [dropResults,   setDropResults]   = useState<Place[]>([]);
  const [pickupCountry, setPickupCountry] = useState<string | null>(null);

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropLat,   setDropLat]   = useState<number | null>(null);
  const [dropLng,   setDropLng]   = useState<number | null>(null);
  const [locating,  setLocating]  = useState(false);

  const canContinue = !!(pickup && drop && vehicle && mobile && pickupLat && pickupLng && dropLat && dropLng);

  /* ── SEARCH ── */
  const searchAddress = async (q: string, setResults: (r: Place[]) => void, restrict?: string | null) => {
    if (!q || q.trim().length < 3) { setResults([]); return; }
    try {
      const res  = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}&limit=8&lang=en`);
      const data = await res.json();
      let results: Place[] = (data?.features ?? []).map((f: any) => ({
        id: String(f.properties.osm_id),
        name: f.properties.name,
        city: f.properties.city,
        state: f.properties.state,
        country: f.properties.country,
        countrycode: f.properties.countrycode?.toLowerCase(),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }));
      if (restrict) results = results.filter(p => p.countrycode === restrict);
      setResults(results);
    } catch { setResults([]); }
  };

  const fmt = (p: Place) => [p.name, p.city, p.state, p.country].filter(Boolean).join(", ");

  /* ── GPS ── */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://photon.komoot.io/reverse?lat=${coords.latitude}&lon=${coords.longitude}&limit=1`);
          const data = await res.json();
          if (data?.features?.length) {
            const p    = data.features[0].properties;
            const addr = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).join(", ");
            setPickup(addr);
            setPickupCountry(p.countrycode?.toLowerCase() || null);
            setPickupLat(coords.latitude);
            setPickupLng(coords.longitude);
            setPickupResults([]);
          }
        } finally { setLocating(false); }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /* ── PROGRESS ── */
  const progress = [!!vehicle, !!(mobile.length >= 10), !!pickup, !!drop].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >

        {/* ── HEADER ── */}
        <div className="flex items-center gap-4 mb-6 px-1">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.back()}
            className="w-11 h-11 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center hover:bg-zinc-50 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={17} className="text-zinc-900" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-zinc-900 text-xl font-black tracking-tight">Book a Ride</h1>
            <p className="text-zinc-400 text-xs mt-0.5">Fill in the details below</p>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ width: i < progress ? 20 : 8, background: i < progress ? "#09090b" : "#d4d4d8" }}
                transition={{ duration: 0.3 }}
                className="h-2 rounded-full"
              />
            ))}
          </div>
        </div>

        {/* ── CARD ── */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* Top strip */}
          <div className="h-1 bg-zinc-900 w-full" />

          <div className="p-6 space-y-7">

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
                  return (
                    <motion.button
                      key={v.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.07 + i * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVehicle(v.id as VehicleType)}
                      className={`relative p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all duration-200 ${
                        active
                          ? "bg-zinc-900 border-zinc-900 shadow-lg"
                          : "bg-zinc-50 border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        active ? "bg-white" : "bg-zinc-200"
                      }`}>
                        <v.Icon size={18} className={active ? "text-zinc-900" : "text-zinc-600"} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${active ? "text-white" : "text-zinc-900"}`}>{v.label}</p>
                        <p className={`text-[10px] truncate ${active ? "text-zinc-400" : "text-zinc-400"}`}>{v.desc}</p>
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

            {/* DIVIDER */}
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
              <p className="text-zinc-400 text-[10px] mt-1.5 ml-1">Ride updates will be sent to this number</p>
            </motion.div>

            {/* DIVIDER */}
            <div className="h-px bg-zinc-100" />

            {/* ══ STEP 3 — LOCATIONS ══ */}
            <motion.div variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.22 }} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[9px] font-black">3</span>
                </div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Route</p>
              </div>

              {/* Route visual connector */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-visible">

                {/* PICKUP INPUT */}
                <div className="relative z-20">
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
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto z-50"
                      >
                        {pickupResults.map((p, i) => (
                          <motion.button
                            key={p.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => {
                              setPickup(fmt(p));
                              setPickupCountry(p.countrycode || null);
                              setPickupLat(p.lat); setPickupLng(p.lng);
                              setPickupResults([]);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                          >
                            <MapPin size={13} className="text-zinc-400 flex-shrink-0" />
                            <span className="text-sm text-zinc-800 font-medium truncate">{fmt(p)}</span>
                            <ChevronRight size={13} className="text-zinc-300 flex-shrink-0 ml-auto" />
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* SEPARATOR */}
                <div className="h-px bg-zinc-200 mx-4" />

                {/* DROP INPUT */}
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
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto z-50"
                      >
                        {dropResults.map((p, i) => (
                          <motion.button
                            key={p.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => {
                              setDrop(fmt(p));
                              setDropLat(p.lat); setDropLng(p.lng);
                              setDropResults([]);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                          >
                            <Navigation size={13} className="text-zinc-400 flex-shrink-0" />
                            <span className="text-sm text-zinc-800 font-medium truncate">{fmt(p)}</span>
                            <ChevronRight size={13} className="text-zinc-300 flex-shrink-0 ml-auto" />
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* ══ CTA ══ */}
            <motion.div
              variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={canContinue ? { scale: 1.02 } : {}}
                disabled={!canContinue}
                onClick={() => router.push(
                  `/search?pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}&vehicle=${vehicle}&mobileNumber=${encodeURIComponent(mobile)}&pickupLat=${pickupLat}&pickupLng=${pickupLng}&dropLat=${dropLat}&dropLng=${dropLng}`
                )}
                className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-black disabled:opacity-35 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2.5 transition-colors shadow-lg disabled:shadow-none"
              >
                <span>Continue</span>
                <motion.div
                  animate={canContinue ? { x: [0, 4, 0] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
                >
                  <ArrowRight size={17} />
                </motion.div>
              </motion.button>

              {/* Completion hint */}
              <AnimatePresence>
                {!canContinue && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-center text-zinc-400 text-[10px] font-medium mt-2.5 tracking-wide"
                  >
                    {!vehicle ? "Select a vehicle to continue" :
                     mobile.length < 10 ? "Enter a valid mobile number" :
                     !pickup ? "Enter pickup location" :
                     !drop ? "Enter drop location" : ""}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

          </div>
        </div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center text-zinc-400 text-[10px] mt-4 tracking-wide"
        >
          Rides are subject to driver availability
        </motion.p>

      </motion.div>
    </div>
  );
}