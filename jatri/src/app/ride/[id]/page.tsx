"use client";



import nextDynamic from "next/dynamic";
import {
  Phone, Car, User2, ChevronUp,
  Star, MessageCircle, Clock, Zap,
  IndianRupee, XCircle, AlertCircle, AlertTriangle,
  CheckCircle2, Mic, MicOff, Volume2, PhoneOff,
  ShieldAlert, Siren, PhoneCall, Share2, Navigation, KeyRound
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RideChat from "@/features/rides/components/RideChat";
import NotificationToggle from "@/shared/components/NotificationToggle";
import { getMinDistanceToPolyline, haversineKm } from "@/lib/routeUtils";
import { useTranslation } from "@/context/LanguageContext";
import RideCompletedView from "@/features/rides/components/RideCompletedView";
import RideFailedView from "@/features/rides/components/RideFailedView";
import RideSafetyAlert from "@/features/rides/components/RideSafetyAlert";
import { calculateCancellationPenalty } from "@/lib/cancellationRules";

const LiveRideMap = nextDynamic(() => import("@/features/maps/components/LiveTrackingMap"), { ssr: false });

/* ─── TYPES ──────────────────────────────────────────────────────────── */
type BookingStatus =
  | "requested" | "awaiting_payment" | "confirmed"
  | "started"   | "completed"        | "cancelled"
  | "rejected"  | "expired"          | "auto_rematching"
  | "no_drivers_available" | "scheduled";

type PaymentStatus = "pending" | "paid" | "cash" | "failed" | "refunded";

interface BookingDetails {
  _id: string;
  driver?: { _id: string; name: string };
  vehicle?: { vehicleModel: string; number: string; type?: string };
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
  dropOtp?: string;
  isPanicActive?: boolean;
  panicActivatedAt?: string;
  shareToken?: string;
  isMultiStop?: boolean;
  stops?: Array<{
    address: string;
    location: { coordinates: [number, number] };
    order: number;
    completed?: boolean;
  }>;
  isFamilyRide?: boolean;
  familyMemberDetails?: {
    name: string;
    relation: string;
    phone?: string;
  };
  isScheduled?: boolean;
  scheduledPickupTime?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDropoffTime?: string;
  actualDropoffTime?: string;
  tripDurationMinutes?: number;
  cancelledBy?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  cancellationFeeApplied?: boolean;
  cancelledAt?: string;
  createdAt?: string;
}

const CANCELLATION_REASONS = [
  "Driver is taking too long to arrive",
  "Driver asked to cancel / refuse ride",
  "Driver going in the wrong direction",
  "Changed my mind / No longer need ride",
  "Entered incorrect pickup or drop location",
  "Booked by mistake",
  "Other reason",
];

/* ─── STATUS CONFIG ──────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<BookingStatus, {
  label: string; sublabel: string; dot: string;
  mapStatus: "arriving" | "ongoing" | "completed";
}> = {
  scheduled:            { label: "Ride Scheduled",      sublabel: "Driver will be dispatched 15-30 min before pickup", dot: "bg-amber-500",   mapStatus: "arriving"  },
  requested:            { label: "Finding Driver",      sublabel: "Searching for nearby drivers",          dot: "bg-amber-400",   mapStatus: "arriving"  },
  awaiting_payment:     { label: "Payment Required",    sublabel: "Complete payment to confirm your ride", dot: "bg-purple-400",  mapStatus: "arriving"  },
  confirmed:            { label: "Driver on the Way",   sublabel: "Driver is heading to pickup",           dot: "bg-emerald-400", mapStatus: "arriving"  },
  started:              { label: "On the Way",          sublabel: "Heading to your destination",           dot: "bg-blue-400",    mapStatus: "ongoing"   },
  completed:            { label: "Ride Completed",      sublabel: "You have reached your destination",     dot: "bg-zinc-400",    mapStatus: "completed" },
  cancelled:            { label: "Ride Cancelled",      sublabel: "This ride has been cancelled",          dot: "bg-red-400",     mapStatus: "completed" },
  rejected:             { label: "Ride Rejected",       sublabel: "Driver couldn't accept the ride",       dot: "bg-red-400",     mapStatus: "completed" },
  expired:              { label: "Request Expired",     sublabel: "Booking request timed out",             dot: "bg-orange-400",  mapStatus: "completed" },
  auto_rematching:      { label: "Auto Re-matching",    sublabel: "Driver cancelled. Finding a new nearby driver...", dot: "bg-emerald-500 animate-pulse", mapStatus: "arriving" },
  no_drivers_available: { label: "No Drivers",          sublabel: "No nearby drivers accepted",            dot: "bg-red-500",     mapStatus: "completed" },
};

const PAYMENT_LABEL: Record<PaymentStatus, { label: string; cls: string }> = {
  pending:  { label: "Payment Pending", cls: "bg-amber-100 text-amber-700"    },
  paid:     { label: "Paid",            cls: "bg-emerald-100 text-emerald-700" },
  cash:     { label: "Cash",            cls: "bg-zinc-100 text-zinc-700"       },
  failed:   { label: "Payment Failed",  cls: "bg-red-100 text-red-700"         },
  refunded: { label: "Refunded",        cls: "bg-emerald-100 text-emerald-700" },
};

const REASON_KEY_MAP: Record<string, string> = {
  "Driver is taking too long to arrive": "cancellation.reasons.takingTooLong",
  "Driver asked to cancel / refuse ride": "cancellation.reasons.driverRefused",
  "Driver going in the wrong direction": "cancellation.reasons.wrongDirection",
  "Changed my mind / No longer need ride": "cancellation.reasons.changedMind",
  "Entered incorrect pickup or drop location": "cancellation.reasons.incorrectLocation",
  "Booked by mistake": "cancellation.reasons.bookedByMistake",
  "Other reason": "cancellation.reasons.other",
};

const PEEK_H = 140;

/* ══════════════════════════════════════════════════════════════════════ */
export default function RidePage() {
  const { t } = useTranslation();
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelError, setShowCancelError] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReasonNote, setCustomReasonNote] = useState<string>("");
  const [cancellingRide, setCancellingRide] = useState<boolean>(false);
  const [cancellationQuote, setCancellationQuote] = useState<any | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState<boolean>(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [panicLoading, setPanicLoading] = useState(false);

  /* ── SAFETY CHECK-IN STATE & ROUTE DEVIATION ── */
  const [showSafetyCheckIn, setShowSafetyCheckIn] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<string>("normal");
  const [deviationDistance, setDeviationDistance] = useState<number | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);

  const handleConfirmSafe = async () => {
    try {
      setSafetyLoading(true);
      const res = await fetch(`/api/booking/${id}/safety-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_safe", notes: "Passenger confirmed safe on detour" }),
      });
      const data = await res.json();
      if (data.success) {
        setSafetyStatus("passenger_confirmed_safe");
        setShowSafetyCheckIn(false);
      }
    } catch (err) {
      console.error("Safety checkin confirm error:", err);
    } finally {
      setSafetyLoading(false);
    }
  };

  const handleTriggerSosFromCheckin = async () => {
    try {
      setSafetyLoading(true);
      const res = await fetch(`/api/booking/${id}/safety-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_sos", notes: "Emergency SOS triggered from Route Deviation check-in" }),
      });
      const data = await res.json();
      if (data.success) {
        setSafetyStatus("sos_activated");
        setBooking(prev => prev ? { ...prev, isPanicActive: true } : null);
        setShowSafetyCheckIn(false);
      }
    } catch (err) {
      console.error("SOS trigger error:", err);
    } finally {
      setSafetyLoading(false);
    }
  };

  const triggerPanic = async () => {
    try {
      setPanicLoading(true);
      const res = await fetch(`/api/booking/${id}/panic`, { method: "POST" });
      if (res.ok) {
        setBooking(prev => prev ? { ...prev, isPanicActive: true } : null);
      }
    } catch (err) {
      console.error("Panic trigger error:", err);
    } finally {
      setPanicLoading(false);
      setShowPanicConfirm(false);
    }
  };

  /* Secure VoIP Call State */
  const [activeCall, setActiveCall] = useState<{ isOpen: boolean } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    isOpen: boolean;
    callerName: string;
    callerRole: "user" | "driver";
  } | null>(null);
  const [zegoContainer, setZegoContainer] = useState<HTMLDivElement | null>(null);
  const zegoCallJoined = useRef(false);
  const zpRef = useRef<any>(null);

  const playRingTone = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  const startVoipCall = () => {
    setActiveCall({ isOpen: true });
    const socket = getSocket();
    if (booking?._id) {
      socket.emit("call-user", {
        bookingId: booking._id,
        callerName: "Passenger",
        callerRole: "user",
      });
    }
  };

  useEffect(() => {
    if (!activeCall?.isOpen || !zegoContainer || zegoCallJoined.current) return;
    
    let active = true;
    zegoCallJoined.current = true;
    
    const initZego = async () => {
      try {
        const res = await fetch("/api/zego/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId: `call-${booking?._id}` }),
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch Zego token");
        }
        
        const data = await res.json();
        if (!active) return;
        
        const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");
        
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          data.appID,
          data.token,
          `call-${booking?._id}`,
          data.userID,
          data.userName
        );
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;
        
        zp.joinRoom({
          container: zegoContainer,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: false,
          turnOnCameraWhenJoining: false,
          showMyCameraToggleButton: false,
          showAudioVideoSettingsButton: false,
          showScreenSharingButton: false,
          showUserList: false,
          onLeaveRoom: () => {
            if (active) {
              setActiveCall(null);
              zegoCallJoined.current = false;
            }
          },
        });
      } catch (err) {
        console.error("Zego connection failed:", err);
        if (active) {
          zegoCallJoined.current = false;
        }
      }
    };
    
    initZego();
    
    return () => {
      active = false;
    };
  }, [activeCall?.isOpen, booking?._id, zegoContainer]);

  /* ── SAFE COORDS EXTRACTOR ── */
  const extractCoords = (loc: any): [number, number] | null => {
    if (!loc) return null;
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      return [Number(loc.coordinates[1]), Number(loc.coordinates[0])]; // [lat, lng]
    }
    if (typeof loc.lat === "number" && typeof loc.lng === "number") {
      return [loc.lat, loc.lng];
    }
    if (Array.isArray(loc) && loc.length >= 2) {
      return [Number(loc[0]), Number(loc[1])];
    }
    return null;
  };

  /* ── FETCH ── */
  const fetchBooking = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res  = await fetch(`/api/booking/${id}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to fetch booking");
      const data = await res.json();
      setBooking(data);

      const p = extractCoords(data.pickupLocation);
      const d = extractCoords(data.dropLocation);
      if (p) setPickupPos(p);
      if (d) setDropPos(d);
      
      // Update driver location dynamically from database coords if present
      if (data.driver?.location) {
        const drv = extractCoords(data.driver.location);
        if (drv) setDriverPos(drv);
      }
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { 
    fetchBooking(); 

    // Poll ride details, OTPs, and driver location every 8 seconds as safety net
    const interval = setInterval(() => {
      fetchBooking(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [id]);

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
    socket.on("auto-rematch-started", () => fetchBooking(true));
    socket.on("auto-rematch-searching", () => fetchBooking(true));
    socket.on("auto-rematch-success", () => fetchBooking(true));
    socket.on("safety-checkin-updated", (data: any) => {
      if (data.safetyStatus) setSafetyStatus(data.safetyStatus);
      if (data.isPanicActive) setBooking(prev => prev ? { ...prev, isPanicActive: true } : null);
    });

    const handleIncomingCall = (data: any) => {
      if (data && data.callerRole === "driver") {
        setIncomingCall({
          isOpen: true,
          callerName: data.callerName || booking?.driver?.name || "Driver",
          callerRole: "driver",
        });
        playRingTone();
      }
    };

    const handleCallRejected = () => {
      alert("Call was declined.");
      setActiveCall(null);
      setIncomingCall(null);
    };

    const handleCallEnded = () => {
      setActiveCall(null);
      setIncomingCall(null);
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-ended", handleCallEnded);

    return () => {
      socket.off("driver-location");
      socket.off("booking-updated");
      socket.off("driver-assigned");
      socket.off("auto-rematch-started");
      socket.off("auto-rematch-searching");
      socket.off("auto-rematch-success");
      socket.off("safety-checkin-updated");
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-ended", handleCallEnded);
    };
  }, [id, booking?._id]);

  /* ── ROUTE DEVIATION MONITORING EFFECT ── */
  useEffect(() => {
    if (!driverPos || !pickupPos || !dropPos) return;
    if (booking?.status !== "started" && booking?.status !== "confirmed") return;

    if (routePolyline.length === 0) {
      const fetchPolyline = async () => {
        try {
          const start = booking?.status === "started" ? driverPos : pickupPos;
          const end = dropPos;
          const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
          const d = await r.json();
          if (d?.routes?.[0]?.geometry?.coordinates) {
            const coords: [number, number][] = d.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon]);
            setRoutePolyline(coords);
          }
        } catch (e) {
          console.warn("Polyline fetch error for route deviation check:", e);
        }
      };
      fetchPolyline();
    }

    if (routePolyline.length > 0) {
      const distMeters = getMinDistanceToPolyline(driverPos, routePolyline);
      setDeviationDistance(distMeters);

      if (distMeters > 500 && safetyStatus !== "passenger_confirmed_safe" && safetyStatus !== "sos_activated") {
        setShowSafetyCheckIn(true);
      }
    }
  }, [driverPos, pickupPos, dropPos, booking?.status, routePolyline, safetyStatus]);

  const [rematching, setRematching] = useState(false);

  const handleManualRematch = async () => {
    try {
      setRematching(true);
      const res = await fetch(`/api/booking/${id}/rematch`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchBooking(true);
      }
    } catch (err) {
      console.error("Manual rematch error:", err);
    } finally {
      setRematching(false);
    }
  };

  const getElapsedAcceptanceSeconds = () => {
    const ref = booking?.acceptedAt || (booking?.status === "confirmed" ? (booking as any)?.updatedAt : null);
    if (!ref) return 0;
    const acceptedMs = new Date(ref).getTime();
    return Math.max(0, Math.floor((Date.now() - acceptedMs) / 1000));
  };

  const fetchCancellationQuote = async (reasonStr?: string) => {
    if (!id) return;
    try {
      setFetchingQuote(true);
      const query = new URLSearchParams({
        cancelledBy: "user",
        reason: reasonStr || "Cancelled by passenger",
      });
      const res = await fetch(`/api/booking/${id}/cancel?${query.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCancellationQuote(data);
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic cancellation quote:", err);
    } finally {
      setFetchingQuote(false);
    }
  };

  const handleCancel = () => {
    setSelectedReason("");
    setCustomReasonNote("");
    setCancellationQuote(null);
    setShowCancelConfirm(true);
    fetchCancellationQuote();
  };

  const confirmCancelRide = async () => {
    const finalReason =
      selectedReason === "Other reason" && customReasonNote.trim()
        ? `Other: ${customReasonNote.trim()}`
        : selectedReason || "Cancelled by passenger";

    try {
      setCancellingRide(true);
      const res = await fetch(`/api/booking/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: finalReason,
          cancelledBy: "user",
          distanceToPickupKm: distanceToPickup || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCancelConfirm(false);
        setBooking(prev =>
          prev
            ? {
                ...prev,
                status: "cancelled",
                cancellationReason: finalReason,
                cancellationFee: data.cancellationFee,
                cancellationFeeApplied: data.cancellationFeeApplied,
              }
            : null
        );
      } else {
        setShowCancelError(data.message || "Failed to cancel booking. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setShowCancelError("Failed to cancel booking due to a network error.");
    } finally {
      setCancellingRide(false);
    }
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
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-white font-bold text-lg">Unable to load ride</p>
        <p className="text-zinc-400 text-xs">{error || "Trip details could not be retrieved. Please check your connection."}</p>
        <div className="flex items-center gap-2.5 mt-2 w-full">
          <button
            onClick={() => fetchBooking(false)}
            className="flex-1 bg-white text-zinc-900 py-3 rounded-xl font-bold text-xs hover:bg-zinc-100 transition shadow-sm"
          >
            Retry Connection
          </button>
          <button
            onClick={() => router.push("/bookings")}
            className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-bold text-xs hover:bg-zinc-700 transition border border-zinc-700"
          >
            All Bookings
          </button>
        </div>
      </div>
    </div>
  );

  const status      = booking.status;
  const cfg         = STATUS_CONFIG[status];
  const mapStatus   = cfg.mapStatus;
  const isActive    = ["requested", "awaiting_payment", "confirmed", "started", "scheduled"].includes(status);
  const isFailed    = ["cancelled", "rejected", "expired"].includes(status);
  const isCompleted = status === "completed";
  /* chat only when driver heading to pickup, not yet started */
  const canChat     = status === "confirmed";
  const showDriver  = ["confirmed", "started", "completed"].includes(status) && !!booking.driver;

  const initialTripEta = (pickupPos && dropPos)
    ? Math.max(3, Math.round((haversineKm(pickupPos[0], pickupPos[1], dropPos[0], dropPos[1]) / 25) * 60))
    : 0;

  const initialDriverEta = (driverPos && pickupPos)
    ? Math.max(2, Math.round((haversineKm(driverPos[0], driverPos[1], pickupPos[0], pickupPos[1]) / 25) * 60))
    : 4;

  const effectiveEtaToPickup = etaToPickup > 0 ? etaToPickup : initialDriverEta;
  const effectiveEtaToDrop = etaToDrop > 0 ? etaToDrop : initialTripEta;
  const displayEta      = mapStatus === "arriving" ? effectiveEtaToPickup : effectiveEtaToDrop;
  const displayDistance = mapStatus === "arriving" ? distanceToPickup : distanceToDrop;

  /* ══ COMPLETED — FULL SCREEN ══ */
  if (isCompleted) {
    return <RideCompletedView booking={booking} />;
  }

  /* ══ FAILED — FULL SCREEN ══ */
  if (isFailed) {
    return (
      <RideFailedView
        booking={booking}
        status={status}
        label={cfg.label}
        sublabel={cfg.sublabel}
      />
    );
  }

  const panelProps = {
    booking, status, cfg, isActive, canChat, showDriver,
    displayEta, displayDistance,
    chatOpen, onChatToggle: () => canChat && setChatOpen(v => !v),
    onCancel: handleCancel, onRetryPayment: fetchBooking, router,
    onCallClick: startVoipCall,
    onPanicClick: () => setShowPanicConfirm(true),
  };

  return (
    <div className="h-screen w-full bg-zinc-100 flex flex-col lg:flex-row overflow-hidden">

      {/* ══ MAP ══ */}
      <div className="relative flex-1 h-full z-0">
        <LiveRideMap
          driverLocation={driverPos}
          pickupLocation={pickupPos}
          dropLocation={dropPos}
          status={mapStatus}
          vehicleType={booking?.vehicle?.type ?? "car"}
          etaMinutes={displayEta}
          onStats={({ distanceToPickup, durationToPickup, distanceToDrop, durationToDrop }: any) => {
            setDistanceToPickup(distanceToPickup); setEtaToPickup(durationToPickup);
            setDistanceToDrop(distanceToDrop);     setEtaToDrop(durationToDrop);
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-md border border-zinc-200">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-xs font-semibold tracking-wide text-zinc-900">{cfg.label}</span>
          </div>
        </motion.div>
      </div>

      {/* ══ DESKTOP PANEL ══ */}
      <motion.div
        initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-[420px] xl:w-[460px] bg-white border-l border-zinc-200 flex-col overflow-hidden"
      >
        <div className="bg-zinc-950 px-6 py-5 flex-shrink-0">
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase font-semibold mb-1">Live Tracking</p>
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold">Your Ride</h1>
            {isActive && (
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                <Clock size={12} className="text-zinc-400" />
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
          className="bg-white rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden border-t border-zinc-200 flex flex-col"
          animate={{ height: expanded ? "82vh" : PEEK_H }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
        >
          {/* Interactive Drag Handle Header */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.y < -35 || info.velocity.y < -250) setExpanded(true);
              else if (info.offset.y > 35 || info.velocity.y > 250) setExpanded(false);
            }}
            onClick={() => setExpanded(v => !v)}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing select-none bg-white"
          >
            <div className="pt-2.5 pb-1 flex flex-col items-center">
              <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                {expanded ? "Swipe down for map" : "Swipe up for ride details"}
              </span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between">
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
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
                >
                  <ChevronUp size={16} />
                </motion.div>
              </div>
            </div>
            <div className="h-px bg-zinc-100 mx-5" />
          </motion.div>
          <div className="overflow-y-auto h-full pb-10">
            <PanelContent {...panelProps} />
          </div>
        </motion.div>
      </div>
      {/* Custom Confirm Cancel Modal with Reason & Penalty Warning */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] px-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-900">{t("cancellation.modalTitle", "Cancel Ride")}</h3>
                    <p className="text-[11px] text-zinc-400 font-semibold">{t("cancellation.reviewPolicy", "Review policy & select reason")}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Penalty & Timing Calculation Banner */}
                {(() => {
                  const elapsedSec = getElapsedAcceptanceSeconds();
                  const hasDriverAccepted = Boolean(booking?.acceptedAt || booking?.status === "confirmed");
                  const hasDriverArrived = Boolean(booking?.pickupOtp) || (distanceToPickup > 0 && distanceToPickup <= 0.15);
                  const isDriverEnRoute = distanceToPickup > 0 && distanceToPickup <= 2.5;

                  return (
                    <div className="space-y-3">
                      {/* Live Status Indicators (Time & Location) */}
                      {hasDriverAccepted && (
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                          <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-2.5 flex items-center gap-2 text-zinc-700">
                            <Clock size={14} className="text-zinc-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Accepted</p>
                              <p className="truncate font-black text-zinc-900">{Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s ago</p>
                            </div>
                          </div>
                          <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-2.5 flex items-center gap-2 text-zinc-700">
                            <Navigation size={14} className="text-zinc-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Driver Location</p>
                              <p className="truncate font-black text-zinc-900">
                                {hasDriverArrived
                                  ? "At Pickup"
                                  : distanceToPickup > 0
                                  ? `${distanceToPickup.toFixed(1)} km (${etaToPickup}m)`
                                  : "En route"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Authoritative Dynamic Policy Evaluation Banner */}
                      {fetchingQuote ? (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-center justify-center gap-2.5 text-zinc-500 text-xs">
                          <span className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-zinc-900 animate-spin" />
                          <span>{t("cancellation.evaluatingFee", "Evaluating cancellation fee with pricing engine...")}</span>
                        </div>
                      ) : cancellationQuote ? (
                        cancellationQuote.feeApplied && cancellationQuote.fee > 0 ? (
                          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-left space-y-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-amber-950 text-xs font-black">
                                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                                <span>{t("cancellation.feeLabel", "Cancellation Fee:")} ₹{cancellationQuote.fee}</span>
                              </div>
                              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                {t("cancellation.feeActive", "Fee Applicable")}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-amber-900">
                              <span className="font-bold text-amber-950">{t("cancellation.reasonLabel", "Reason:")}</span> {cancellationQuote.reason}
                            </p>

                            {/* Transparent Financial Settlement Breakdown */}
                            <div className="bg-white/90 rounded-xl p-3 border border-amber-200 space-y-1.5 text-xs">
                              {cancellationQuote.isPrepaid ? (
                                <div className="flex justify-between text-zinc-700">
                                  <span>{t("cancellation.prepaidRefund", "Refund to Source:")}</span>
                                  <span className="font-bold text-emerald-700">₹{Math.max(0, (booking.fare || 0) - cancellationQuote.fee)}</span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between text-zinc-700">
                                    <span>{t("cancellation.walletDeduction", "Deducted from Wallet:")}</span>
                                    <span className="font-bold text-zinc-900">₹{cancellationQuote.willDeductFromWallet}</span>
                                  </div>
                                  {cancellationQuote.willAddToOutstanding > 0 && (
                                    <div className="flex justify-between text-red-700 font-bold">
                                      <span>{t("cancellation.outstandingAccrued", "Added to Outstanding Dues:")}</span>
                                      <span>₹{cancellationQuote.willAddToOutstanding}</span>
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="flex justify-between text-zinc-600 pt-1 border-t border-amber-100 text-[11px]">
                                <span>{t("cancellation.driverComp", "Driver Transit Compensation:")}</span>
                                <span className="font-bold text-zinc-900">₹{cancellationQuote.driverCompensation}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-left shadow-sm">
                            <div className="flex items-center gap-1.5 text-emerald-950 text-xs font-black mb-1">
                              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                              <span>{t("cancellation.zeroFee", "Zero Cancellation Fee (₹0)")}</span>
                            </div>
                            <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                              {cancellationQuote.reason || t("cancellation.zeroFeeDesc", "Free cancellation is currently available. You will receive a 100% full refund.")}
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 text-left">
                          <div className="flex items-center gap-1.5 text-zinc-900 text-xs font-black mb-1">
                            <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                            <span>{t("cancellation.zeroFee", "Zero Cancellation Fee")}</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 leading-relaxed">
                            {t("cancellation.zeroFeeDesc", "No penalty applies. You can cancel now with full peace of mind.")}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Reasons List */}
                <div>
                  <p className="text-xs font-bold text-zinc-800 mb-2">{t("cancellation.selectReason", "Please tell us why you are cancelling:")}</p>
                  <div className="space-y-1.5">
                    {CANCELLATION_REASONS.map((r) => {
                      const isSelected = selectedReason === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setSelectedReason(r);
                            fetchCancellationQuote(r);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between border ${
                            isSelected
                              ? "bg-zinc-950 text-white border-zinc-950 font-bold shadow-sm"
                              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                          }`}
                        >
                          <span>{t(REASON_KEY_MAP[r] || r, r)}</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-2 ${
                              isSelected ? "border-white bg-white" : "border-zinc-300 bg-white"
                            }`}
                          >
                            {isSelected && <span className="w-2 h-2 rounded-full bg-zinc-950" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedReason === "Other reason" && (
                    <textarea
                      value={customReasonNote}
                      onChange={(e) => setCustomReasonNote(e.target.value)}
                      placeholder="Please specify your cancellation reason..."
                      className="w-full text-xs p-3 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 mt-2.5 resize-none text-zinc-900"
                      rows={2}
                    />
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-5 pt-3 border-t border-zinc-100 bg-zinc-50/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancellingRide}
                  className="flex-1 py-3 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold transition active:scale-[0.98] disabled:opacity-50"
                >
                  {t("cancellation.keepRide", "Keep Ride")}
                </button>
                <button
                  type="button"
                  onClick={confirmCancelRide}
                  disabled={!selectedReason || cancellingRide}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition active:scale-[0.98] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {cancellingRide ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    t("cancellation.confirmCancel", "Confirm Cancellation")
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Error Modal */}
      <AnimatePresence>
        {showCancelError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] px-4"
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-zinc-200"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mx-auto text-red-500">
                  <XCircle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-zinc-900">Error</h3>
                  <p className="text-zinc-500 text-xs font-semibold leading-relaxed">
                    {showCancelError}
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => setShowCancelError(null)}
                  className="w-full py-3 bg-zinc-900 hover:bg-black text-white rounded-xl text-sm font-bold transition active:scale-[0.98]"
                >
                  Okay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Panic / SOS Confirm Modal */}
      <AnimatePresence>
        {showPanicConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] px-4"
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden text-white"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto text-red-400">
                  <Siren size={28} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Activate Emergency SOS?</h3>
                  <p className="text-zinc-400 text-xs font-medium leading-relaxed">
                    This will immediately alert our emergency security response team, log your live location, and notify emergency contacts.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 flex flex-col gap-2.5">
                <button
                  onClick={triggerPanic}
                  disabled={panicLoading}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  {panicLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldAlert size={18} /> Confirm Emergency Alert
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPanicConfirm(false)}
                  disabled={panicLoading}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SAFETY CHECK-IN OVERLAY MODAL ── */}
      <AnimatePresence>
        {showSafetyCheckIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-xl border border-rose-200 text-center relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center mb-4">
                <ShieldAlert size={28} />
              </div>

              <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1 rounded-md text-rose-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                Route Deviation Detected
              </div>

              <h3 className="text-xl font-black text-zinc-900 mb-1">Are You Safe?</h3>
              <p className="text-zinc-500 text-xs leading-relaxed font-medium mb-5">
                Your driver appears to have taken an unexpected route
                {deviationDistance ? ` (${deviationDistance}m off planned route)` : ""}.
                Please confirm your safety status.
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={handleConfirmSafe}
                  disabled={safetyLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs tracking-wide transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> I&apos;m Safe (Road Detour)
                </button>

                <button
                  onClick={handleTriggerSosFromCheckin}
                  disabled={safetyLoading}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs tracking-wide transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <Siren size={16} /> Get Help / Emergency SOS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECURE MASKED VOIP CALL OVERLAY */}
      <AnimatePresence>
        {activeCall && activeCall.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
          >
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-xl relative flex flex-col items-center">
              {/* Header */}
              <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Secure Voice Bridge</span>
              </div>
              
              {/* Zego Container */}
              <div 
                ref={setZegoContainer} 
                className="w-full h-[400px] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800"
              />
              
              {/* Close button */}
              <button
                onClick={() => {
                  if (booking?._id) {
                    const socket = getSocket();
                    socket.emit("end-call", { bookingId: booking._id });
                  }
                  if (zpRef.current && typeof zpRef.current.destroy === 'function') {
                    try {
                      zpRef.current.destroy();
                    } catch (e) {
                      console.error("Error destroying Zego instance:", e);
                    }
                  }
                  setActiveCall(null);
                  zegoCallJoined.current = false;
                }}
                className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition active:scale-98"
              >
                End / Close Call
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INCOMING VOICE CALL RINGING MODAL ── */}
      <AnimatePresence>
        {incomingCall && incomingCall.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-xl flex flex-col items-center"
            >
              <div className="relative mb-5">
                <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-emerald-500 opacity-40"></span>
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                  <Phone size={28} className="animate-bounce" />
                </div>
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-1">Incoming Voice Call</p>
              <h3 className="text-xl font-black text-white">{incomingCall.callerName}</h3>
              <p className="text-xs text-zinc-400 mt-1 font-medium">In-ride secure audio bridge</p>

              <div className="flex gap-3 w-full mt-6">
                <button
                  onClick={() => {
                    if (booking?._id) {
                      const socket = getSocket();
                      socket.emit("reject-call", { bookingId: booking._id });
                    }
                    setIncomingCall(null);
                  }}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <PhoneOff size={16} /> Decline
                </button>
                <button
                  onClick={() => {
                    if (booking?._id) {
                      const socket = getSocket();
                      socket.emit("accept-call", { bookingId: booking._id });
                    }
                    setIncomingCall(null);
                    setActiveCall({ isOpen: true });
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
                >
                  <PhoneCall size={16} /> Answer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}





/* ══════════════════════════════════════════════════════════════════════
   PANEL CONTENT
══════════════════════════════════════════════════════════════════════ */
function PanelContent({
  booking, status, cfg, isActive, canChat, showDriver,
  displayEta, displayDistance,
  chatOpen, onChatToggle, onCancel, onRetryPayment, router,
  onCallClick, onPanicClick,
}: any) {
  return (
    <div className="flex flex-col pt-5 pb-6 gap-3">

      {/* PUSH NOTIFICATION ENABLER BANNER */}
      {isActive && (
        <div className="mx-5 lg:mx-6">
          <NotificationToggle variant="banner" />
        </div>
      )}

      {/* PANIC ALERT ACTIVE BANNER */}
      {booking?.isPanicActive && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-red-950/90 border-2 border-red-600 rounded-2xl p-5 text-white shadow-xl shadow-red-900/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center animate-bounce flex-shrink-0">
                <Siren size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-400">Emergency SOS Triggered</p>
                <p className="text-sm font-bold text-white">Security Dispatch Notified</p>
              </div>
            </div>
            <p className="text-xs text-red-200 leading-relaxed mb-4">
              Your live location is actively being tracked by safety dispatch. Local law enforcement hotline is available below.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:112"
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                <PhoneCall size={14} /> Call 112
              </a>
              <a
                href="tel:18001234567"
                className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-zinc-200 font-bold py-2.5 rounded-xl text-xs border border-red-900 transition"
              >
                <ShieldAlert size={14} /> Security Desk
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ⏰ ADVANCE SCHEDULED RIDE CARD */}
      {status === "scheduled" && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  ⏰
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-amber-950 uppercase tracking-wider">
                      Ride Scheduled
                    </h3>
                    <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full tracking-wider">
                      Confirmed
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 font-semibold mt-0.5">
                    {booking.scheduledPickupTime
                      ? new Date(booking.scheduledPickupTime).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Upcoming Scheduled Time"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 rounded-xl p-3.5 border border-amber-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span className="font-medium">Total Fare</span>
                <span className="font-extrabold text-zinc-900 text-sm">₹{booking.fare}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span className="font-medium">Driver Dispatch</span>
                <span className="font-bold text-amber-900">15–30 min before pickup</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700 font-bold pt-1 border-t border-amber-100">
                <span>Free Cancellation</span>
                <span>Up to 60 mins prior</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-900/80 leading-snug">
              ✨ You don't need to do anything right now. When the scheduled pickup time nears, our system will automatically pair you with the best available driver and send you live tracking details!
            </p>
          </div>
        </div>
      )}

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

      {/* ETA + DROPOFF + FARE (active, not requested/payment/scheduled) */}
      {isActive && !["requested", "awaiting_payment", "scheduled"].includes(status) && (
        <div className="mx-5 lg:mx-6 grid grid-cols-3 gap-2">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">ETA</span>
              <Clock size={13} className="text-zinc-500" />
            </div>
            <p className="text-sm font-black text-zinc-900 leading-none">
              {Math.round(displayEta)}<span className="text-[10px] font-normal text-zinc-400 ml-0.5">min</span>
            </p>
          </div>

          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Drop-off</span>
              <Navigation size={13} className="text-emerald-600" />
            </div>
            <p className="text-xs font-black text-zinc-900 leading-none truncate">
              {booking.estimatedDropoffTime
                ? new Date(booking.estimatedDropoffTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                : `~${booking.tripDurationMinutes || 15}m`}
            </p>
          </div>

          <div className="bg-zinc-950 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Fare</span>
              <IndianRupee size={13} className="text-zinc-400" />
            </div>
            <p className="text-sm font-black text-white leading-none">₹{booking.fare}</p>
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

          {/* Call, Message & Share Trip */}
          {isActive && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-2">
              <button
                onClick={onCallClick}
                className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.97] transition-all text-white py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold shadow-sm"
              >
                <Phone size={14} className="sm:w-[15px] sm:h-[15px]" /> In-App Call
              </button>
              {booking.driverMobileNumber && (
                <a
                  href={`tel:${booking.driverMobileNumber}`}
                  className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 active:scale-[0.97] transition-all px-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold shadow-sm"
                  title="Direct Cellular Phone Call"
                >
                  <PhoneCall size={14} className="sm:w-[15px] sm:h-[15px]" /> Phone
                </a>
              )}
              {canChat && (
                <button onClick={onChatToggle}
                  className={`flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold ${chatOpen ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 hover:bg-zinc-800 text-white"}`}
                >
                  <MessageCircle size={14} className="sm:w-[15px] sm:h-[15px]" />
                  {chatOpen ? "Close Chat" : "Message"}
                </button>
              )}
              <button
                onClick={() => {
                  if (typeof window === "undefined") return;
                  const tokenStr = booking?.shareToken || booking?._id;
                  const shareUrl = `${window.location.origin}/track/${tokenStr}`;
                  const shareText = `Track my RideNow trip live: ${shareUrl}`;
                  if (navigator.share) {
                    navigator.share({ title: "Live Trip Tracking", text: shareText, url: shareUrl }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(shareUrl);
                    alert("Live tracking link copied to clipboard!");
                  }
                }}
                className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 active:scale-[0.97] transition-all py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold"
              >
                <Share2 size={14} className="sm:w-[15px] sm:h-[15px]" /> Share Trip
              </button>
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

      {/* 🔐 START RIDE PICKUP OTP BANNER */}
      {booking.pickupOtp && status === "confirmed" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 lg:mx-6"
        >
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-black text-emerald-800">Start Ride PIN</p>
                <p className="text-xs text-emerald-900 font-medium">Share this code with your driver</p>
              </div>
            </div>
            <div className="bg-white px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-sm">
              <span className="font-mono text-2xl font-black tracking-widest text-emerald-950">
                {booking.pickupOtp}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🏁 END RIDE DROP OTP BANNER */}
      {booking.dropOtp && status === "started" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 lg:mx-6"
        >
          <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-black text-indigo-800">Drop-off PIN</p>
                <p className="text-xs text-indigo-900 font-medium">Share at destination to end trip</p>
              </div>
            </div>
            <div className="bg-white px-3.5 py-1.5 rounded-xl border border-indigo-200 shadow-sm">
              <span className="font-mono text-2xl font-black tracking-widest text-indigo-950">
                {booking.dropOtp}
              </span>
            </div>
          </div>
        </motion.div>
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
              <p className="text-sm text-zinc-800 leading-snug">{booking.pickupAddress || "—"}</p>
              {booking.pickupOtp && status === "confirmed" && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                  <p className="text-emerald-700 text-xs font-black tracking-widest font-mono">{booking.pickupOtp}</p>
                  <p className="text-emerald-600 text-[10px] font-semibold">OTP</p>
                </div>
              )}
            </div>
          </div>

          {/* Intermediate Stops */}
          {booking.stops && booking.stops.length > 0 && booking.stops.map((stop: any, idx: number) => (
            <div key={idx} className="flex gap-3 p-4 border-b border-zinc-100 bg-blue-50/20">
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-black shadow-sm">
                  {idx + 1}
                </div>
                <div className="w-px bg-blue-200 mt-1" style={{ height: 16 }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Stop {idx + 1}</p>
                  {stop.completed && (
                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full uppercase">
                      Visited
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-800 leading-snug">{stop.address || "—"}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-3 p-4">
            <div className="flex-shrink-0 pt-1">
              <div className="w-3 h-3 rounded-sm bg-zinc-900 border-2 border-white shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Drop</p>
              <p className="text-sm text-zinc-800 leading-snug">{booking.dropAddress || "—"}</p>
              {booking.estimatedDropoffTime && (status === "confirmed" || status === "started") && (
                <p className="text-[11px] text-zinc-500 font-semibold mt-1 flex items-center gap-1">
                  <Clock size={12} className="text-zinc-400" />
                  <span>Est. Drop-off by {new Date(booking.estimatedDropoffTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })} (~{booking.tripDurationMinutes || 15} mins)</span>
                </p>
              )}
              {booking.actualDropoffTime && status === "completed" && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Dropped off at {new Date(booking.actualDropoffTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                </p>
              )}
              {booking.dropOtp && status === "started" && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                  <p className="text-emerald-700 text-xs font-black tracking-widest font-mono">{booking.dropOtp}</p>
                  <p className="text-emerald-600 text-[10px] font-semibold">OTP</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAMILY ACCOUNT RIDE CARD */}
      {booking.isFamilyRide && booking.familyMemberDetails && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
              👨👩👧
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full tracking-wider">
                  Family Account Ride
                </span>
                <span className="text-[10px] text-amber-800 font-bold">
                  Central Billing
                </span>
              </div>
              <p className="text-sm font-bold text-zinc-900 truncate">
                Rider: {booking.familyMemberDetails.name} ({booking.familyMemberDetails.relation})
              </p>
              {booking.familyMemberDetails.phone && (
                <p className="text-[11px] text-zinc-500 font-medium">
                  Contact: {booking.familyMemberDetails.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
      {["requested", "awaiting_payment", "confirmed", "scheduled"].includes(status) && (
        <div className="mx-5 lg:mx-6 mt-2">
          <button
            onClick={onCancel}
            className="w-full bg-zinc-100 hover:bg-red-50 hover:text-red-600 text-zinc-700 py-3.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2"
          >
            {status === "scheduled" ? "Cancel Scheduled Ride" : "Cancel Ride"}
          </button>
        </div>
      )}

      {/* EMERGENCY SOS BUTTON */}
      {["confirmed", "started"].includes(status) && !booking?.isPanicActive && (
        <div className="mx-5 lg:mx-6 mt-2">
          <button
            onClick={onPanicClick}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 active:scale-[0.97]"
          >
            <Siren size={18} className="animate-pulse" /> Emergency SOS Alert
          </button>
        </div>
      )}

    </div>
  );
}