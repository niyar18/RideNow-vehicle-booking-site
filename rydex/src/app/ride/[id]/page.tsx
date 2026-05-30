"use client";

import dynamic from "next/dynamic";
import {
  Phone, Car, User2, ChevronUp,
  Star, MessageCircle, Clock, Zap,
  IndianRupee, XCircle, AlertCircle,
  CheckCircle2
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RideChat from "@/components/RideChat";

const LiveRideMap = dynamic(() => import("@/components/LiveTrackingMap"), { ssr: false });

/* ─── TYPES ──────────────────────────────────────────────────────────── */
type BookingStatus =
  | "requested" | "awaiting_payment" | "confirmed"
  | "started"   | "completed"        | "cancelled"
  | "rejected"  | "expired";

type PaymentStatus = "pending" | "paid" | "cash" | "failed";

interface BookingDetails {
  _id: string;
  driver?: { _id: string; name: string };
  vehicle?: { vehicleModel: string; number: string };
  pickupAddress: string;
  dropAddress: string;
  pickupLocation: { coordinates: [number, number] };
  dropLocation:   { coordinates: [number, number] };
  fare: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  userMobileNumber: string;
  driverMobileNumber: string;
  pickupOtp?: string;
}

/* ─── STATUS CONFIG ──────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<BookingStatus, {
  label: string; sublabel: string; dot: string;
  mapStatus: "arriving" | "ongoing" | "completed";
}> = {
  requested:        { label: "Finding Driver",      sublabel: "Searching for nearby drivers",          dot: "bg-amber-400",   mapStatus: "arriving"  },
  awaiting_payment: { label: "Payment Required",    sublabel: "Complete payment to confirm your ride", dot: "bg-purple-400",  mapStatus: "arriving"  },
  confirmed:        { label: "Driver on the Way",   sublabel: "Driver is heading to pickup",           dot: "bg-emerald-400", mapStatus: "arriving"  },
  started:          { label: "On the Way",          sublabel: "Heading to your destination",           dot: "bg-blue-400",    mapStatus: "ongoing"   },
  completed:        { label: "Ride Completed",      sublabel: "You have reached your destination",     dot: "bg-zinc-400",    mapStatus: "completed" },
  cancelled:        { label: "Ride Cancelled",      sublabel: "This ride has been cancelled",          dot: "bg-red-400",     mapStatus: "completed" },
  rejected:         { label: "Ride Rejected",       sublabel: "Driver couldn't accept the ride",       dot: "bg-red-400",     mapStatus: "completed" },
  expired:          { label: "Request Expired",     sublabel: "Booking request timed out",             dot: "bg-orange-400",  mapStatus: "completed" },
};

const PAYMENT_LABEL: Record<PaymentStatus, { label: string; cls: string }> = {
  pending: { label: "Payment Pending", cls: "bg-amber-100 text-amber-700"    },
  paid:    { label: "Paid",            cls: "bg-emerald-100 text-emerald-700" },
  cash:    { label: "Cash",            cls: "bg-zinc-100 text-zinc-700"       },
  failed:  { label: "Payment Failed",  cls: "bg-red-100 text-red-700"         },
};

const PEEK_H = 140;

/* ══════════════════════════════════════════════════════════════════════ */
export default function RidePage() {
  const { id }  = useParams();
  const router  = useRouter();

  const [booking,          setBooking]          = useState<BookingDetails | null>(null);
  const [driverPos,        setDriverPos]        = useState<[number, number] | null>(null);
  const [pickupPos,        setPickupPos]        = useState<[number, number] | null>(null);
  const [dropPos,          setDropPos]          = useState<[number, number] | null>(null);
  const [distanceToPickup, setDistanceToPickup] = useState(0);
  const [etaToPickup,      setEtaToPickup]      = useState(0);
  const [distanceToDrop,   setDistanceToDrop]   = useState(0);
  const [etaToDrop,        setEtaToDrop]        = useState(0);
  /* chat only for confirmed status */
  const [chatOpen,         setChatOpen]         = useState(false);
  const [expanded,         setExpanded]         = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);

  /* ── FETCH ── */
  const fetchBooking = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`/api/booking/${id}`);
      if (!res.ok) throw new Error("Failed to fetch booking");
      const data = await res.json();
      setBooking(data);
      setPickupPos([data.pickupLocation.coordinates[1], data.pickupLocation.coordinates[0]]);
      setDropPos  ([data.dropLocation.coordinates[1],   data.dropLocation.coordinates[0]]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooking(); }, [id]);

  /* ── SOCKET ── */
  useEffect(() => {
    if (!id || !booking) return;
    const socket = getSocket();
    socket.emit("join-booking", id);
    socket.on("driver-location", (data: any) => setDriverPos([data.latitude, data.longitude]));
    socket.on("booking-updated", (data: any) => {
      setBooking(prev => prev ? { ...prev, ...data } : null);
      /* close chat if ride moves past confirmed */
      if (data.status && data.status !== "confirmed") setChatOpen(false);
    });
    socket.on("driver-assigned", (data: any) => {
      setBooking(prev => prev ? { ...prev, driver: data.driver, driverMobileNumber: data.driverMobileNumber } : null);
    });
    return () => {
      socket.off("driver-location");
      socket.off("booking-updated");
      socket.off("driver-assigned");
    };
  }, [id, booking?._id]);

  /* ── CANCEL ── */
  const handleCancel = async () => {
    if (!confirm("Cancel this ride?")) return;
    await fetch(`/api/booking/${id}/cancel`, { method: "POST" });
    fetchBooking();
  };

  /* ── LOADING ── */
  if (loading) return (
    <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/40 text-sm tracking-widest uppercase font-medium">Loading ride…</p>
      </div>
    </div>
  );

  if (error || !booking) return (
    <div className="h-screen w-full bg-zinc-950 flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-white font-bold text-lg">Failed to load ride</p>
        <p className="text-zinc-400 text-sm">{error || "Booking not found"}</p>
        <button onClick={() => router.back()} className="mt-2 bg-white text-zinc-900 px-6 py-3 rounded-xl font-semibold text-sm">
          Go Back
        </button>
      </div>
    </div>
  );

  const status      = booking.status;
  const cfg         = STATUS_CONFIG[status];
  const mapStatus   = cfg.mapStatus;
  const isActive    = ["requested", "awaiting_payment", "confirmed", "started"].includes(status);
  const isFailed    = ["cancelled", "rejected", "expired"].includes(status);
  const isCompleted = status === "completed";
  /* chat only when driver heading to pickup, not yet started */
  const canChat     = status === "confirmed";
  const showDriver  = ["confirmed", "started", "completed"].includes(status) && !!booking.driver;
  const displayEta      = mapStatus === "arriving" ? etaToPickup : etaToDrop;
  const displayDistance = mapStatus === "arriving" ? distanceToPickup : distanceToDrop;

  /* ══ COMPLETED — FULL SCREEN ══ */
  if (isCompleted) {
    return (
      <CompletedScreen booking={booking} router={router} />
    );
  }

  /* ══ FAILED — FULL SCREEN ══ */
  if (isFailed) {
    return (
      <FailedScreen booking={booking} status={status} cfg={cfg} router={router} />
    );
  }

  const panelProps = {
    booking, status, cfg, isActive, canChat, showDriver,
    displayEta, displayDistance,
    chatOpen, onChatToggle: () => canChat && setChatOpen(v => !v),
    onCancel: handleCancel, onRetryPayment: fetchBooking, router,
  };

  return (
    <div className="h-screen w-full bg-zinc-100 flex flex-col lg:flex-row overflow-hidden">

      {/* ══ MAP ══ */}
      <div className="relative flex-1 h-full z-0">
        <LiveRideMap
          driverLocation={driverPos}
          pickupLocation={pickupPos!}
          dropLocation={dropPos!}
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

      {/* ══ DESKTOP PANEL ══ */}
      <motion.div
        initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-[420px] xl:w-[460px] bg-white border-l border-zinc-100 flex-col overflow-hidden"
      >
        <div className="bg-zinc-950 px-6 py-5 flex-shrink-0">
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase font-semibold mb-1">Live Tracking</p>
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold">Your Ride</h1>
            {isActive && (
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Zap size={12} className="text-amber-400" />
                <span className="text-white text-xs font-semibold">{Math.round(displayEta)} min</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <PanelContent {...panelProps} />
        </div>
      </motion.div>

      {/* ══ MOBILE BOTTOM SHEET ══ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <motion.div
          className="bg-white rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden"
          animate={{ height: expanded ? "80vh" : PEEK_H }}
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
          <div className="overflow-y-auto h-full pb-10">
            <PanelContent {...panelProps} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COMPLETED FULL SCREEN
══════════════════════════════════════════════════════════════════════ */
function CompletedScreen({ booking, router }: { booking: BookingDetails; router: any }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitted,      setSubmitted]      = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full bg-zinc-950 flex flex-col overflow-y-auto"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
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
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <p className="text-zinc-400 text-xs uppercase tracking-[0.25em] font-semibold text-center mb-2">Trip Complete</p>
          <h1 className="text-white text-3xl font-black text-center mb-1">You've Arrived!</h1>
          <p className="text-zinc-500 text-sm text-center mb-8">Thank you for riding with us.</p>

          {/* Fare card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-3">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-1 text-center">Total Fare</p>
            <p className="text-white text-5xl font-black flex items-center justify-center gap-1 mb-4">
              <IndianRupee size={30} strokeWidth={2.5} /> {booking.fare}
            </p>
            <div className="flex items-center justify-between text-xs border-t border-zinc-800 pt-3">
              <span className="text-zinc-500">Payment</span>
              <span className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${PAYMENT_LABEL[booking.paymentStatus]?.cls ?? "bg-zinc-700 text-zinc-300"}`}>
                {PAYMENT_LABEL[booking.paymentStatus]?.label ?? booking.paymentStatus}
              </span>
            </div>
          </div>

          {/* Driver card */}
          {booking.driver && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <User2 size={20} className="text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Driver</p>
                <p className="text-white text-sm font-bold truncate">{booking.driver.name}</p>
              </div>
              {booking.vehicle && (
                <div className="flex-shrink-0 bg-zinc-800 px-2.5 py-1.5 rounded-lg">
                  <p className="text-zinc-300 text-xs font-black tracking-widest font-mono">{booking.vehicle.number}</p>
                </div>
              )}
            </div>
          )}

          {/* Route */}
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

          {/* Rating */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
            <p className="text-zinc-400 text-sm font-semibold text-center mb-3">How was your experience?</p>
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => !submitted && setSelectedRating(n)}
                  className={`w-12 h-12 rounded-xl text-xl transition-all active:scale-90 ${
                    selectedRating >= n
                      ? "bg-amber-400 text-zinc-900"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-500"
                  }`}
                >★</button>
              ))}
            </div>
            <AnimatePresence>
              {selectedRating > 0 && !submitted && (
                <motion.button
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  onClick={() => setSubmitted(true)}
                  className="w-full bg-white text-zinc-900 py-3 rounded-xl text-sm font-bold hover:bg-zinc-100 transition-colors"
                >
                  Submit Rating
                </motion.button>
              )}
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 py-2"
                >
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <p className="text-emerald-400 text-sm font-semibold">Thanks for your feedback!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full border border-zinc-700 text-zinc-400 py-3.5 rounded-2xl text-sm font-semibold hover:bg-zinc-900 transition-colors"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FAILED FULL SCREEN (cancelled / rejected / expired)
══════════════════════════════════════════════════════════════════════ */
function FailedScreen({ booking, status, cfg, router }: { booking: BookingDetails; status: BookingStatus; cfg: any; router: any }) {
  const isExpired = status === "expired";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className={`w-28 h-28 rounded-full flex items-center justify-center ${isExpired ? "bg-orange-400/10" : "bg-red-400/10"}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isExpired ? "bg-orange-400/20" : "bg-red-400/20"}`}>
            {isExpired
              ? <AlertCircle size={44} className="text-orange-400" />
              : <XCircle     size={44} className="text-red-400" />
            }
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        <h1 className="text-white text-2xl font-black mb-2">{cfg.label}</h1>
        <p className="text-zinc-500 text-sm mb-8">{cfg.sublabel}</p>

        {/* Route recap */}
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

        <button
          onClick={() => router.push("/book")}
          className="w-full bg-white text-zinc-900 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-colors mb-3"
        >
          Book a New Ride
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full border border-zinc-800 text-zinc-500 py-3.5 rounded-2xl text-sm font-semibold hover:bg-zinc-900 transition-colors"
        >
          Back to Home
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PANEL CONTENT
══════════════════════════════════════════════════════════════════════ */
function PanelContent({
  booking, status, cfg, isActive, canChat, showDriver,
  displayEta, displayDistance,
  chatOpen, onChatToggle, onCancel, onRetryPayment, router,
}: any) {
  return (
    <div className="flex flex-col pt-5 pb-6 gap-3">

      {/* SEARCHING (requested) */}
      {status === "requested" && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-zinc-900">Finding your driver</p>
              <p className="text-xs text-zinc-400 mt-0.5">This usually takes less than a minute</p>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT (awaiting_payment) */}
      {status === "awaiting_payment" && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-purple-950 rounded-2xl p-5">
            <p className="text-purple-200 text-[10px] uppercase tracking-widest font-semibold mb-1">Action Required</p>
            <p className="text-white font-bold text-lg mb-1 flex items-center gap-1">
              <IndianRupee size={18} /> {booking.fare}
            </p>
            <p className="text-purple-300 text-xs mb-4">Complete payment to confirm your ride</p>
            <button onClick={onRetryPayment} className="w-full bg-white text-purple-900 py-3 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors">
              Pay Now
            </button>
          </div>
        </div>
      )}

      {/* ETA + FARE (active, not requested/payment) */}
      {isActive && !["requested", "awaiting_payment"].includes(status) && (
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
              <p className="text-lg font-black text-white leading-none mt-0.5">₹{booking.fare}</p>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER CARD */}
      {showDriver && (
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
                <p className="text-white font-bold text-base truncate">{booking.driver?.name || "Your Driver"}</p>
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full flex-shrink-0">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  <span className="text-white text-xs font-semibold">4.9</span>
                </div>
              </div>
              {booking.vehicle && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-zinc-400 text-xs">{booking.vehicle.vehicleModel}</span>
                  <span className="text-zinc-700 text-xs">•</span>
                  <span className="text-zinc-300 text-xs bg-white/10 px-2 py-0.5 rounded-full font-mono">{booking.vehicle.number}</span>
                </div>
              )}
              <div className="mt-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PAYMENT_LABEL[booking.paymentStatus as PaymentStatus]?.cls}`}>
                  {PAYMENT_LABEL[booking.paymentStatus as PaymentStatus]?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Call always when active; Message only when canChat */}
          {isActive && (
            <div className="flex gap-2 mt-2">
              {booking.driverMobileNumber && (
                <a href={`tel:${booking.driverMobileNumber}`}
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
              <RideChat currentRole="user" rideId={booking._id.toString()} driverName={booking.driver?.name} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <p className="text-sm text-zinc-800 leading-snug">{booking.pickupAddress || "—"}</p>
              {booking.pickupOtp && status === "confirmed" && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                  <p className="text-emerald-700 text-xs font-black tracking-widest font-mono">{booking.pickupOtp}</p>
                  <p className="text-emerald-600 text-[10px] font-semibold">OTP</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <div className="flex-shrink-0 pt-1">
              <div className="w-3 h-3 rounded-sm bg-zinc-900 border-2 border-white shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Drop</p>
              <p className="text-sm text-zinc-800 leading-snug">{booking.dropAddress || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* VEHICLE CARD */}
      {booking.vehicle && showDriver && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <Car size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mb-0.5">Vehicle</p>
              <p className="text-sm font-bold text-zinc-900 truncate">{booking.vehicle.vehicleModel}</p>
            </div>
            <div className="flex-shrink-0 bg-zinc-900 px-3 py-1.5 rounded-lg">
              <p className="text-white text-xs font-black tracking-widest font-mono">{booking.vehicle.number}</p>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL BUTTON */}
     

    </div>
  );
}