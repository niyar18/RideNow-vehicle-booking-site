"use client";

import dynamic from "next/dynamic";
import {
  Phone, User2, Car, IndianRupee,
  ChevronUp, Clock, Zap,
  CheckCircle2, KeyRound, ArrowRight,
  MapPin, Navigation, MessageCircle,
  AlertCircle, XCircle
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IUser } from "@/models/user.model";
import { IVehicle } from "@/models/vehicle.model";
import RideChat from "@/components/RideChat";

const LiveRideMap = dynamic(() => import("@/components/LiveTrackingMap"), { ssr: false });

/* ─── TYPES ──────────────────────────────────────────────────────────── */
export type BookingStatus =
  | "requested" | "awaiting_payment" | "confirmed"
  | "started"   | "completed"        | "cancelled"
  | "rejected"  | "expired";

export type PaymentStatus = "pending" | "paid" | "cash" | "failed";

export interface IBooking {
  _id: string;
  user: IUser;
  driver: IUser;
  vehicle: IVehicle;
  pickupAddress: string;
  dropAddress: string;
  pickupLocation?: { type: "Point"; coordinates: [number, number] };
  dropLocation?:   { type: "Point"; coordinates: [number, number] };
  fare: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentDeadline?: Date;
  userMobileNumber: string;
  driverMobileNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

/* ─── CONFIG ──────────────────────────────────────────────────────────── */
const MAP_STATUS: Record<BookingStatus, "arriving" | "ongoing" | "completed"> = {
  requested:        "arriving",
  awaiting_payment: "arriving",
  confirmed:        "arriving",
  started:          "ongoing",
  completed:        "completed",
  cancelled:        "completed",
  rejected:         "completed",
  expired:          "completed",
};

const STATUS_LABEL: Record<BookingStatus, { label: string; sublabel: string; dot: string }> = {
  requested:        { label: "Awaiting Confirmation", sublabel: "Booking is being processed",    dot: "bg-amber-400"   },
  awaiting_payment: { label: "Payment Pending",        sublabel: "Customer payment is pending",   dot: "bg-purple-400"  },
  confirmed:        { label: "Heading to Pickup",      sublabel: "Drive to the pickup location",  dot: "bg-amber-400"   },
  started:          { label: "Ride in Progress",       sublabel: "Heading to drop location",      dot: "bg-emerald-400" },
  completed:        { label: "Ride Completed",         sublabel: "Trip has ended successfully",   dot: "bg-zinc-400"    },
  cancelled:        { label: "Ride Cancelled",         sublabel: "This ride was cancelled",       dot: "bg-red-400"     },
  rejected:         { label: "Ride Rejected",          sublabel: "Ride was rejected",             dot: "bg-red-400"     },
  expired:          { label: "Request Expired",        sublabel: "Booking timed out",             dot: "bg-orange-400"  },
};

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700"    },
  paid:    { label: "Paid",    cls: "bg-emerald-100 text-emerald-700" },
  cash:    { label: "Cash",    cls: "bg-zinc-100 text-zinc-700"       },
  failed:  { label: "Failed",  cls: "bg-red-100 text-red-700"         },
};

const TERMINAL = ["completed", "cancelled", "rejected", "expired"];
const PEEK_H   = 148;

/* ══════════════════════════════════════════════════════════════════════ */
export default function DriverRidePage() {

  const [booking,       setBooking]       = useState<IBooking | null>(null);
  const [fetchDone,     setFetchDone]     = useState(false);
  const [driverPos,     setDriverPos]     = useState<[number, number] | null>(null);
  const [pickupPos,     setPickupPos]     = useState<[number, number] | null>(null);
  const [dropPos,       setDropPos]       = useState<[number, number] | null>(null);
  const [etaToPickup,   setEtaToPickup]   = useState(0);
  const [etaToDrop,     setEtaToDrop]     = useState(0);
  const [distanceToPickup, setDistanceToPickup] = useState(0);
  const [distanceToDrop,   setDistanceToDrop]   = useState(0);

  /* Pickup OTP */
  const [otpMode,     setOtpMode]     = useState(false);
  const [otp,         setOtp]         = useState("");
  const [loadingOtp,  setLoadingOtp]  = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError,    setOtpError]    = useState("");

  /* Drop OTP */
  const [dropOtpMode,    setDropOtpMode]    = useState(false);
  const [dropOtp,        setDropOtp]        = useState("");
  const [loadingDropOtp, setLoadingDropOtp] = useState(false);
  const [dropOtpError,   setDropOtpError]   = useState("");

  /* Chat & Sheet */
  const [chatOpen, setChatOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  /* Keep latest booking in a ref so GPS callback never has stale closure */
  const bookingRef = useRef<IBooking | null>(null);
  bookingRef.current = booking;

  /* ── FETCH ── */
  useEffect(() => {
    fetch("/api/partner/bookings/active")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data._id) {
          setBooking(data);
          if (data.pickupLocation?.coordinates) {
            setPickupPos([data.pickupLocation.coordinates[1], data.pickupLocation.coordinates[0]]);
          }
          if (data.dropLocation?.coordinates) {
            setDropPos([data.dropLocation.coordinates[1], data.dropLocation.coordinates[0]]);
          }
          if (data.status === "started")   { setOtpVerified(true); setOtpMode(false); }
          if (data.status === "completed") { setOtpVerified(true); }
        }
      })
      .catch(err => console.error("Fetch error:", err))
      .finally(() => setFetchDone(true));
  }, []);

  /* ── GPS — only for active rides, uses ref to avoid stale closure ── */
  useEffect(() => {
    if (!booking?._id) return;
    if (TERMINAL.includes(booking.status)) return;
    if (!navigator.geolocation) return;

    const socket = getSocket();
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const b = bookingRef.current;
        if (!b?._id || TERMINAL.includes(b.status)) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDriverPos([lat, lng]);
        socket.emit("driver-location-update", {
          bookingId: b._id, latitude: lat, longitude: lng, status: b.status,
        });
      },
      err => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [booking?._id, booking?.status]);

  /* ── SOCKET ── */
  useEffect(() => {
    if (!booking?._id) return;
    if (TERMINAL.includes(booking.status)) return;
    const socket = getSocket();
    socket.emit("join-booking", booking._id);
    socket.on("driver-location", (d: any) => setDriverPos([d.latitude, d.longitude]));
    return () => { socket.off("driver-location"); };
  }, [booking?._id, booking?.status]);

  /* ── OTP HANDLERS ── */
  const sendPickupOtp = async () => {
    if (!booking?._id) return;
    await fetch("/api/partner/bookings/send-pickup-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking._id }),
    }).catch(console.error);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) return;
    setOtpError("");
    try {
      setLoadingOtp(true);
      const res  = await fetch("/api/partner/bookings/verify-pickup-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking?._id, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.message || "Invalid OTP"); return; }
      setOtpVerified(true);
      setOtpMode(false);
      setOtp("");
      setChatOpen(false);
      setBooking(prev => prev ? { ...prev, status: "started" } : prev);
    } catch { setOtpError("Verification failed"); }
    finally   { setLoadingOtp(false); }
  };

  const sendDropOtp = async () => {
    if (!booking?._id) return;
    await fetch("/api/partner/bookings/send-drop-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking._id }),
    }).catch(console.error);
  };

  const handleVerifyDropOtp = async () => {
    if (!dropOtp || dropOtp.length < 4) return;
    setDropOtpError("");
    try {
      setLoadingDropOtp(true);
      const res  = await fetch("/api/partner/bookings/verify-drop-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking?._id, otp: dropOtp }),
      });
      const data = await res.json();
      if (!res.ok) { setDropOtpError(data.message || "Invalid OTP"); return; }
      setDropOtp("");
      setDropOtpMode(false);
      setBooking(prev => prev ? { ...prev, status: "completed" } : prev);
    } catch { setDropOtpError("Verification failed"); }
    finally   { setLoadingDropOtp(false); }
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER LOGIC — all hooks above, early returns below
  ══════════════════════════════════════════════════════════════════ */

  /* Loading */
  if (!fetchDone) return (
    <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/40 text-sm tracking-widest uppercase font-medium">Loading ride…</p>
      </div>
    </div>
  );

  /* No active booking */
  if (!booking) return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="w-28 h-28 rounded-full bg-zinc-800/60 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-zinc-700/60 flex items-center justify-center">
            <Car size={40} className="text-zinc-500" />
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-white text-2xl font-black mb-2">No Active Ride</h1>
        <p className="text-zinc-500 text-sm mb-8 max-w-xs">You don't have any active booking right now. Go online to start receiving ride requests.</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.location.href = "/partner"}
          className="bg-white text-zinc-900 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-colors"
        >
          Back to Dashboard
        </motion.button>
      </motion.div>
    </div>
  );

  const status    = (booking?.status ?? "confirmed") as BookingStatus;
  const cfg       = STATUS_LABEL[status];
  const mapStatus = MAP_STATUS[status];

  /* ── COMPLETED — full screen, no map ── */
  if (status === "completed" && booking) {
    return <CompletedScreen booking={booking} />;
  }

  /* ── FAILED (cancelled / rejected / expired) — full screen, no map ── */
  if (TERMINAL.includes(status) && status !== "completed" && booking) {
    return <FailedScreen booking={booking} status={status} cfg={cfg} />;
  }

  /* No booking found after fetch */
  if (!booking || !pickupPos || !dropPos) return (
    <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/40 text-sm tracking-widest uppercase font-medium">Loading ride…</p>
      </div>
    </div>
  );

  const isActive        = ["confirmed", "started"].includes(status);
  const canChat         = status === "confirmed";
  const displayEta      = mapStatus === "arriving" ? etaToPickup : etaToDrop;
  const displayDistance = mapStatus === "arriving" ? distanceToPickup : distanceToDrop;

  const panelProps = {
    booking, status, cfg, isActive, canChat, displayEta, displayDistance,
    otpMode, otp, loadingOtp, otpVerified, otpError,
    setOtpMode, setOtp, setOtpError, handleVerifyOtp, sendPickupOtp,
    dropOtpMode, dropOtp, loadingDropOtp, dropOtpError,
    setDropOtpMode, setDropOtp, setDropOtpError, handleVerifyDropOtp, sendDropOtp,
    chatOpen, onChatToggle: () => canChat && setChatOpen(v => !v),
  };

  return (
    <div className="h-screen w-full bg-zinc-100 flex flex-col lg:flex-row overflow-hidden">

      {/* MAP */}
      <div className="relative flex-1 h-full z-0">
        <LiveRideMap
          driverLocation={driverPos}
          pickupLocation={pickupPos}
          dropLocation={dropPos}
          status={mapStatus}
          onStats={({ distanceToPickup, durationToPickup, distanceToDrop, durationToDrop }) => {
            setDistanceToPickup(distanceToPickup); setEtaToPickup(durationToPickup);
            setDistanceToDrop(distanceToDrop);     setEtaToDrop(durationToDrop);
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-zinc-100">
            <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
            <span className="text-xs font-semibold tracking-wide text-zinc-900">{cfg.label}</span>
          </div>
        </motion.div>
      </div>

      {/* DESKTOP PANEL */}
      <motion.div
        initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-[420px] xl:w-[460px] bg-white border-l border-zinc-100 flex-col overflow-hidden"
      >
        <div className="bg-zinc-950 px-6 py-5 flex-shrink-0">
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase font-semibold mb-1">Driver Panel</p>
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold">Active Ride</h1>
            {isActive && (
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Zap size={12} className="text-amber-400" />
                <span className="text-white text-xs font-semibold">{Math.round(displayEta)} min</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <PanelContent {...panelProps} />
          </div>
          <ActionBar {...panelProps} />
        </div>
      </motion.div>

      {/* MOBILE BOTTOM SHEET */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <motion.div
          className="bg-white rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col"
          animate={{ height: expanded ? "82vh" : PEEK_H }}
          transition={{ type: "spring", stiffness: 320, damping: 38 }}
        >
          <div
            className="flex-shrink-0 cursor-pointer select-none"
            onClick={() => setExpanded(v => !v)}
            onPointerDown={e => {
              const startY = e.clientY;
              const onUp = (ev: PointerEvent) => {
                if (ev.clientY - startY < -30) setExpanded(true);
                if (ev.clientY - startY >  30) setExpanded(false);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointerup", onUp);
            }}
          >
            <div className="pt-3 pb-1"><div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto" /></div>
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div>
                  <p className="text-sm font-bold text-zinc-900 leading-tight">{cfg.label}</p>
                  <p className="text-xs text-zinc-400 leading-tight">{cfg.sublabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isActive && (
                  <div className="text-right">
                    <p className="text-2xl font-black text-zinc-900 leading-none">{Math.round(displayEta)}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">min</p>
                  </div>
                )}
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.28 }}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                >
                  <ChevronUp size={16} className="text-zinc-600" />
                </motion.div>
              </div>
            </div>
            <div className="h-px bg-zinc-100 mx-5" />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <PanelContent {...panelProps} />
          </div>
          <ActionBar {...panelProps} />
        </motion.div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ACTION BAR
══════════════════════════════════════════════════════════════════════ */
function ActionBar({
  status,
  otpMode, otp, loadingOtp, otpVerified, otpError,
  setOtpMode, setOtp, setOtpError, handleVerifyOtp, sendPickupOtp,
  dropOtpMode, dropOtp, loadingDropOtp, dropOtpError,
  setDropOtpMode, setDropOtp, setDropOtpError, handleVerifyDropOtp, sendDropOtp,
}: any) {
  if (!["confirmed", "started"].includes(status)) return null;

  return (
    <div className="flex-shrink-0 border-t border-zinc-100 bg-white px-5 py-4">
      <AnimatePresence mode="wait">

        {/* STATE 1 — Arrived */}
        {status === "confirmed" && !otpMode && !otpVerified && (
          <motion.button key="arrived"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            onClick={async () => { await sendPickupOtp(); setOtpMode(true); }}
            className="w-full bg-zinc-900 hover:bg-zinc-800 active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
          >
            <MapPin size={16} /> I've Arrived at Pickup <ArrowRight size={15} className="ml-1" />
          </motion.button>
        )}

        {/* STATE 2 — Pickup OTP */}
        {status === "confirmed" && otpMode && !otpVerified && (
          <motion.div key="pickup-otp"
            initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.3 }}
            className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden"
          >
            <div className="bg-zinc-950 px-4 py-3 flex items-center gap-2">
              <KeyRound size={14} className="text-amber-400" />
              <p className="text-white text-xs font-bold tracking-wide uppercase">Enter Customer OTP</p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-zinc-500">Ask the customer for their 4-digit OTP to start the ride.</p>
              <div className="flex justify-center">
                <input type="text" inputMode="numeric" maxLength={4} value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                  placeholder="· · · ·"
                  className="w-48 border-2 border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-black outline-none transition-colors"
                />
              </div>
              {otpError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs text-center font-medium">{otpError}</motion.p>}
              <div className="flex gap-2">
                <button onClick={() => { setOtpMode(false); setOtp(""); setOtpError(""); }}
                  className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"
                >Cancel</button>
                <button onClick={handleVerifyOtp} disabled={loadingOtp || otp.length < 4}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold active:scale-[0.97] transition-all"
                >
                  {loadingOtp ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</span> : "Verify OTP"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STATE 3 — Pickup verified */}
        {otpVerified && status === "confirmed" && (
          <motion.div key="pickup-verified"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl">
              <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-700 text-xs font-semibold">OTP Verified — Ride has started</p>
            </div>
          </motion.div>
        )}

        {/* STATE 4 — Mark as Dropped */}
        {status === "started" && !dropOtpMode && (
          <motion.button key="drop-btn"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            onClick={async () => { await sendDropOtp(); setDropOtpMode(true); }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
          >
            <Navigation size={16} /> Mark as Dropped <ArrowRight size={15} />
          </motion.button>
        )}

        {/* STATE 5 — Drop OTP */}
        {status === "started" && dropOtpMode && (
          <motion.div key="drop-otp"
            initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.3 }}
            className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden"
          >
            <div className="bg-emerald-700 px-4 py-3 flex items-center gap-2">
              <KeyRound size={14} className="text-white" />
              <p className="text-white text-xs font-bold tracking-wide uppercase">Confirm Drop OTP</p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-zinc-500">Ask the customer for their drop OTP to complete the ride.</p>
              <div className="flex justify-center">
                <input type="text" inputMode="numeric" maxLength={4} value={dropOtp}
                  onChange={e => { setDropOtp(e.target.value.replace(/\D/g, "")); setDropOtpError(""); }}
                  placeholder="· · · ·"
                  className="w-48 border-2 border-zinc-200 focus:border-emerald-600 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-black outline-none transition-colors"
                />
              </div>
              {dropOtpError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs text-center font-medium">{dropOtpError}</motion.p>}
              <div className="flex gap-2">
                <button onClick={() => { setDropOtpMode(false); setDropOtp(""); setDropOtpError(""); }}
                  className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"
                >Cancel</button>
                <button onClick={handleVerifyDropOtp} disabled={loadingDropOtp || dropOtp.length < 4}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold active:scale-[0.97] transition-all"
                >
                  {loadingDropOtp ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</span> : "Complete Ride"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PANEL CONTENT
══════════════════════════════════════════════════════════════════════ */
function PanelContent({ booking, status, isActive, canChat, displayEta, chatOpen, onChatToggle }: any) {
  return (
    <div className="flex flex-col pt-5 pb-4 gap-3">

      {/* ETA + FARE */}
      {isActive && (
        <div className="mx-5 lg:mx-6 grid grid-cols-2 gap-2">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">ETA</p>
              <p className="text-lg font-black text-zinc-900 leading-none mt-0.5">
                {Math.round(displayEta)}<span className="text-xs font-normal text-zinc-400 ml-0.5">min</span>
              </p>
            </div>
          </div>
          <div className="bg-zinc-950 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <IndianRupee size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Fare</p>
              <p className="text-lg font-black text-white leading-none mt-0.5">₹{booking?.fare ?? "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER CARD */}
      {booking?.user && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-5 lg:mx-6">
          <div className="bg-zinc-950 rounded-2xl p-4 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center">
                <User2 size={26} className="text-zinc-300" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-400 w-4 h-4 rounded-full border-2 border-zinc-950" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-white font-bold text-base truncate">{(booking.user as any)?.name || "Customer"}</p>
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full flex-shrink-0">
                  <IndianRupee size={10} className="text-amber-400" />
                  <span className="text-white text-xs font-semibold">{booking.fare}</span>
                </div>
              </div>
              {booking.paymentStatus && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PAYMENT_BADGE[booking.paymentStatus as PaymentStatus]?.cls ?? "bg-zinc-700 text-zinc-300"}`}>
                    {PAYMENT_BADGE[booking.paymentStatus as PaymentStatus]?.label ?? booking.paymentStatus}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isActive && (
            <div className="flex gap-2 mt-2">
              {booking.userMobileNumber && (
                <a href={`tel:${booking.userMobileNumber}`}
                  className={`flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 active:scale-[0.97] transition-all text-zinc-900 py-3 rounded-xl text-sm font-semibold ${canChat ? "flex-1" : "w-full"}`}
                >
                  <Phone size={15} /> Call
                </a>
              )}
              {canChat && (
                <button onClick={onChatToggle}
                  className={`flex-1 flex items-center justify-center gap-2 active:scale-[0.97] transition-all py-3 rounded-xl text-sm font-semibold ${chatOpen ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 hover:bg-zinc-800 text-white"}`}
                >
                  <MessageCircle size={15} />
                  {chatOpen ? "Close Chat" : "Message"}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* CHAT — confirmed only */}
      <AnimatePresence>
        {chatOpen && canChat && (
          <motion.div key="chat"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-5 lg:mx-6 overflow-hidden"
          >
            <div className="rounded-2xl overflow-hidden border border-zinc-100 h-[460px]">
              <RideChat currentRole="driver" rideId={booking._id} userName={(booking?.user as any)?.name} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VEHICLE CARD */}
      {booking?.vehicle && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <Car size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Your Vehicle</p>
              <p className="text-sm font-bold text-zinc-900 truncate">{(booking.vehicle as any).vehicleModel}</p>
            </div>
            {(booking.vehicle as any).number && (
              <div className="flex-shrink-0 bg-zinc-900 px-3 py-1.5 rounded-lg">
                <p className="text-white text-xs font-black tracking-widest font-mono">{(booking.vehicle as any).number}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROUTE CARD */}
      <div className="mx-5 lg:mx-6">
        <div className="bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden">
          <div className="flex gap-3 p-4 border-b border-zinc-100">
            <div className="flex flex-col items-center flex-shrink-0 pt-1">
              <div className="w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow-sm" />
              <div className="w-px bg-zinc-200 mt-1" style={{ height: 20 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Pickup</p>
              <p className="text-sm text-zinc-800 leading-snug">{booking?.pickupAddress || "—"}</p>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <div className="flex-shrink-0 pt-1">
              <div className="w-3 h-3 rounded-sm bg-zinc-900 border-2 border-white shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Drop</p>
              <p className="text-sm text-zinc-800 leading-snug">{booking?.dropAddress || "—"}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COMPLETED FULL SCREEN
══════════════════════════════════════════════════════════════════════ */
function CompletedScreen({ booking }: { booking: IBooking }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="h-screen w-full bg-zinc-950 flex flex-col overflow-y-auto"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="w-32 h-32 rounded-full bg-emerald-400/10 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-emerald-400/20 flex items-center justify-center">
              <CheckCircle2 size={52} className="text-emerald-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <p className="text-zinc-400 text-xs uppercase tracking-[0.25em] font-semibold text-center mb-2">Trip Complete</p>
          <h1 className="text-white text-3xl font-black text-center mb-1">Ride Completed!</h1>
          <p className="text-zinc-500 text-sm text-center mb-8">You have successfully dropped the customer.</p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-3">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-1 text-center">Fare Collected</p>
            <p className="text-white text-5xl font-black flex items-center justify-center gap-1 mb-4">
              <IndianRupee size={30} strokeWidth={2.5} /> {booking.fare}
            </p>
            <div className="flex items-center justify-between text-xs border-t border-zinc-800 pt-3">
              <span className="text-zinc-500">Payment Status</span>
              <span className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${PAYMENT_BADGE[booking.paymentStatus]?.cls ?? "bg-zinc-700 text-zinc-300"}`}>
                {PAYMENT_BADGE[booking.paymentStatus]?.label ?? booking.paymentStatus}
              </span>
            </div>
          </div>

          {booking.user && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <User2 size={20} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Customer</p>
                <p className="text-white text-sm font-bold">{(booking.user as any)?.name || "Customer"}</p>
              </div>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
            <div className="flex gap-3 p-4 border-b border-zinc-800">
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 border-2 border-zinc-900" />
                <div className="w-px bg-zinc-700 mt-1" style={{ height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Pickup</p>
                <p className="text-sm text-zinc-300 leading-snug">{booking.pickupAddress || "—"}</p>
              </div>
            </div>
            <div className="flex gap-3 p-4">
              <div className="flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border-2 border-zinc-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Drop</p>
                <p className="text-sm text-zinc-300 leading-snug">{booking.dropAddress || "—"}</p>
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.href = "/partner"}
            className="w-full bg-white text-zinc-900 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-colors"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FAILED FULL SCREEN (cancelled / rejected / expired)
══════════════════════════════════════════════════════════════════════ */
function FailedScreen({ booking, status, cfg }: {
  booking: IBooking;
  status: BookingStatus;
  cfg: { label: string; sublabel: string; dot: string };
}) {
  const isExpired = status === "expired";
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className={`w-28 h-28 rounded-full flex items-center justify-center ${isExpired ? "bg-orange-400/10" : "bg-red-400/10"}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isExpired ? "bg-orange-400/20" : "bg-red-400/20"}`}>
            {isExpired ? <AlertCircle size={44} className="text-orange-400" /> : <XCircle size={44} className="text-red-400" />}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        <h1 className="text-white text-2xl font-black mb-2">{cfg.label}</h1>
        <p className="text-zinc-500 text-sm mb-8">{cfg.sublabel}</p>

        {booking.user && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 mb-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <User2 size={18} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Customer</p>
              <p className="text-white text-sm font-bold">{(booking.user as any)?.name || "Customer"}</p>
            </div>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6 text-left">
          <div className="flex gap-3 p-4 border-b border-zinc-800">
            <div className="flex flex-col items-center flex-shrink-0 pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <div className="w-px bg-zinc-700 mt-1" style={{ height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Pickup</p>
              <p className="text-sm text-zinc-300 leading-snug">{booking.pickupAddress || "—"}</p>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <div className="flex-shrink-0 pt-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-zinc-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Drop</p>
              <p className="text-sm text-zinc-300 leading-snug">{booking.dropAddress || "—"}</p>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.location.href = "/partner"}
          className="w-full bg-white text-zinc-900 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-colors"
        >
          Back to Dashboard
        </motion.button>
      </motion.div>
    </motion.div>
  );
}