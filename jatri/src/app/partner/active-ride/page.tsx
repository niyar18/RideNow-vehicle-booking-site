"use client";



import nextDynamic from "next/dynamic";
import {
  Phone, User2, Car, IndianRupee,
  ChevronUp, Clock, Zap,
  CheckCircle2, KeyRound, ArrowRight,
  MapPin, Navigation, MessageCircle,
  AlertCircle, XCircle, AlertTriangle,
  Mic, MicOff, Volume2, PhoneOff, PhoneCall, Siren, ShieldAlert,
  ExternalLink
} from "lucide-react";
import { HomeIcon } from "@/shared/components/icons/AppIcons";
import Link from "next/link";
import { getSocket, joinBookingRoom, leaveBookingRoom } from "@/lib/socket";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IUser } from "@/models/user.model";
import { IVehicle } from "@/models/vehicle.model";
import RideChat from "@/features/rides/components/RideChat";
import { haversineKm } from "@/lib/routeUtils";
import { useWakeLock } from "@/shared/hooks/useWakeLock";
import FareCollectionModal from "@/features/rides/components/FareCollectionModal";

const LiveRideMap = nextDynamic(() => import("@/features/maps/components/LiveTrackingMap"), { ssr: false });

export const DRIVER_CANCELLATION_REASONS = [
  "Vehicle breakdown / Mechanical issue",
  "Heavy traffic / Impassable route",
  "Rider requested cancellation",
  "Rider did not answer phone / Unavailable",
  "Personal or medical emergency",
  "Other operational reason",
];

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
  adminCommission?: number;
  partnerAmount?: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  settlementStatus?: "pending" | "success" | "failed";
  paymentDeadline?: Date;
  userMobileNumber: string;
  driverMobileNumber: string;
  isPanicActive?: boolean;
  panicActivatedAt?: Date;
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
  completed:        { label: "Ride Completed",         sublabel: "Trip has ended successfully",   dot: "bg-stone-400 dark:bg-stone-500" },
  cancelled:        { label: "Ride Cancelled",         sublabel: "This ride was cancelled",       dot: "bg-red-400"     },
  rejected:         { label: "Ride Rejected",          sublabel: "Ride was rejected",             dot: "bg-red-400"     },
  expired:          { label: "Request Expired",        sublabel: "Booking timed out",             dot: "bg-orange-400"  },
};

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
  paid:    { label: "Paid",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  cash:    { label: "Cash",    cls: "bg-[#F7F1E5] text-[#10251C] dark:bg-[#1E2B23] dark:text-[#F3F1E8]" },
  failed:  { label: "Failed",  cls: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" },
};

const TERMINAL = ["completed", "cancelled", "rejected", "expired"];
const PEEK_H   = 148;

function extractCoords(val: any): [number, number] | null {
  if (!val) return null;
  if (Array.isArray(val) && val.length >= 2) {
    const [a, b] = val.map(Number);
    if (isNaN(a) || isNaN(b)) return null;
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [a, b];
    if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return [b, a];
    return [a, b];
  }
  if (val.coordinates && Array.isArray(val.coordinates) && val.coordinates.length >= 2) {
    const [lng, lat] = val.coordinates.map(Number);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  if (typeof val.lat === "number" && typeof val.lng === "number") {
    return [val.lat, val.lng];
  }
  if (typeof val.latitude === "number" && typeof val.longitude === "number") {
    return [val.latitude, val.longitude];
  }
  return null;
}

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

  // Keep driver mobile screen awake during active trip navigation
  const isRideActive = Boolean(booking?._id && !TERMINAL.includes(booking.status));
  const { isLocked: isWakeLockActive } = useWakeLock(isRideActive);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(true);

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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelError, setShowCancelError] = useState<string | null>(null);
  const [selectedDriverReason, setSelectedDriverReason] = useState<string>("");
  const [customDriverNote, setCustomDriverNote] = useState<string>("");
  const [cancellingRide, setCancellingRide] = useState<boolean>(false);

  /* Chat & Sheet */
  const [chatOpen, setChatOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
  const lastGpsEmitRef = useRef<{ time: number; lat: number; lng: number }>({ time: 0, lat: 0, lng: 0 });

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
        callerName: (booking?.driver as any)?.name || "Driver",
        callerRole: "driver",
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

  /* Keep latest booking in a ref so GPS callback never has stale closure */
  const bookingRef = useRef<IBooking | null>(null);
  useEffect(() => {
    bookingRef.current = booking;
  }, [booking]);

  /* ── FETCH ── */
  const fetchBookingDetails = () => {
    const bookingId = bookingRef.current?._id;
    const url = bookingId ? `/api/booking/${bookingId}` : "/api/partner/bookings/active";
    fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data._id) {
          setBooking(data);
          const p = extractCoords(data.pickupLocation);
          if (p) setPickupPos(p);
          const d = extractCoords(data.dropLocation);
          if (d) setDropPos(d);
          const drv = extractCoords(data.driver?.location);
          if (drv) setDriverPos(prev => prev || drv);

          if (data.status === "started")   { setOtpVerified(true); setOtpMode(false); }
          if (data.status === "completed") { setOtpVerified(true); }
        } else {
          // Safeguard: Never mark booking as cancelled just because an API roundtrip returned null
          // or was interrupted by a page refresh/network lag. Only clear if no booking was ever loaded.
          if (!bookingId) {
            setBooking(null);
          }
        }
      })
      .catch(err => console.error("Fetch error:", err))
      .finally(() => setFetchDone(true));
  };

  useEffect(() => {
    fetchBookingDetails();

    // Fast initial GPS fix for driver map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setDriverPos([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    // Adaptive polling: poll every 2s on cellular stutter/socket disconnect, 3s when healthy
    const pollInterval = isSocketConnected ? 3000 : 2000;
    const interval = setInterval(fetchBookingDetails, pollInterval);
    return () => clearInterval(interval);
  }, [isSocketConnected]);

  /* ── GPS — only for active rides, uses ref to avoid stale closure ── */
  useEffect(() => {
    if (!booking?._id) return;
    if (TERMINAL.includes(booking.status)) return;
    if (!navigator.geolocation) return;

    const driverId = (booking?.driver as any)?._id || booking?.driver;
    const socket = getSocket(driverId ? { userId: String(driverId) } : undefined);
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const b = bookingRef.current;
        if (!b?._id || TERMINAL.includes(b.status)) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const now = Date.now();
        const last = lastGpsEmitRef.current;
        const dLat = Math.abs(lat - last.lat);
        const dLng = Math.abs(lng - last.lng);
        const timeElapsed = now - last.time;
        const movedSignificantly = dLat > 0.00004 || dLng > 0.00004;

        // Smooth GPS throttling: minimum 2 seconds between updates when moving, or 8s heartbeat
        if ((timeElapsed >= 2000 && movedSignificantly) || timeElapsed >= 8000) {
          lastGpsEmitRef.current = { time: now, lat, lng };
          setDriverPos([lat, lng]);
          socket.emit("driver-location-update", {
            bookingId: b._id, latitude: lat, longitude: lng, status: b.status,
          });
        }
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
    const driverId = (booking?.driver as any)?._id || booking?.driver;
    const socket = getSocket(driverId ? { userId: String(driverId) } : undefined);
    if (driverId) {
      socket.emit("identity", String(driverId));
    }
    const bookingIdStr = String(booking._id);

    joinBookingRoom(bookingIdStr);
    setIsSocketConnected(socket.connected);

    const onConnect = () => {
      setIsSocketConnected(true);
      // Re-fetch booking status on reconnect to catch any state transitions during network interruption
      if (bookingIdStr) {
        fetch(`/api/booking/${bookingIdStr}/status`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.status) {
              setBooking((prev) => (prev ? { ...prev, status: data.status } : null));
            }
          })
          .catch(() => {});
      }
    };
    const onDisconnect = () => setIsSocketConnected(false);
    const onConnectError = () => setIsSocketConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    const handleDriverLocation = (d: any) => {
      if (d?.latitude && d?.longitude) {
        setDriverPos([d.latitude, d.longitude]);
      }
    };
    const handleBookingUpdated = (data: any) => {
      setBooking((prev) => (prev ? { ...prev, ...data } : null));
    };

    socket.on("driver-location", handleDriverLocation);
    socket.on("booking-updated", handleBookingUpdated);

    const handleIncomingCall = (data: any) => {
      if (data && data.callerRole === "user") {
        setIncomingCall({
          isOpen: true,
          callerName: data.callerName || (booking?.user as any)?.name || "Passenger",
          callerRole: "user",
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
      leaveBookingRoom(bookingIdStr);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("driver-location", handleDriverLocation);
      socket.off("booking-updated", handleBookingUpdated);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-ended", handleCallEnded);
    };
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

      // The verified API emits the authoritative booking update. Do not
      // broadcast OTPs or client-supplied status through the shared socket room.
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

      // The verified API emits the authoritative completion update.
    } catch { setDropOtpError("Verification failed"); }
    finally   { setLoadingDropOtp(false); }
  };

  const getElapsedAcceptanceSeconds = () => {
    const ref = (booking as any)?.acceptedAt || booking?.updatedAt || booking?.createdAt;
    if (!ref) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(ref).getTime()) / 1000));
  };

  const handleCancel = () => {
    setSelectedDriverReason("");
    setCustomDriverNote("");
    setShowCancelConfirm(true);
  };

  const confirmCancelRide = async () => {
    if (!booking?._id) return;
    const finalReason =
      selectedDriverReason === "Other operational reason" && customDriverNote.trim()
        ? `Other: ${customDriverNote.trim()}`
        : selectedDriverReason || "Driver cancelled ride";

    try {
      setCancellingRide(true);
      const res = await fetch(`/api/partner/bookings/${booking._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason, cancelledBy: "driver" }),
      });
      if (res.ok) {
        setShowCancelConfirm(false);
        setBooking(prev => (prev ? { ...prev, status: "cancelled", cancellationReason: finalReason } : null));
      } else {
        const data = await res.json().catch(() => ({}));
        setShowCancelError(data.message || "Failed to cancel booking. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setShowCancelError("Failed to cancel booking due to a network error.");
    } finally {
      setCancellingRide(false);
    }
  };

  const [actionPending, setActionPending] = useState(false);

  const handleAcceptRide = async () => {
    if (!booking?._id || actionPending) return;
    try {
      setActionPending(true);
      const res = await fetch(`/api/booking/${booking._id}/accept`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setBooking(data.booking);
        fetchBookingDetails();
      } else {
        alert(data.message || "Failed to accept ride");
      }
    } catch (err) {
      console.error("Accept ride error:", err);
      alert("Failed to accept ride");
    } finally {
      setActionPending(false);
    }
  };

  const handleDeclineRide = async () => {
    if (!booking?._id || actionPending) return;
    try {
      setActionPending(true);
      await fetch("/api/partner/bookings/dispatch-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id }),
      });
      setBooking(null);
      window.location.href = "/partners/dashboard";
    } catch (err) {
      console.error("Decline ride error:", err);
      window.location.href = "/partners/dashboard";
    } finally {
      setActionPending(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER LOGIC — all hooks above, early returns below
  ══════════════════════════════════════════════════════════════════ */

  /* Loading */
  if (!fetchDone) return (
    <div className="h-screen w-full bg-[#F7F1E5] dark:bg-[#101713] flex items-center justify-center transition-colors">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#123D32]/20 border-t-[#123D32] dark:border-white/20 dark:border-t-[#FAF7F0] animate-spin" />
        <p className="text-[#696B64] dark:text-[#929D93] text-xs tracking-widest uppercase font-semibold">Loading ride…</p>
      </div>
    </div>
  );

  /* No active booking */
  if (!booking) return (
    <div className="min-h-[100dvh] w-full bg-[#F7F1E5] dark:bg-[#101713] flex flex-col items-center justify-center px-6 transition-colors pb-[max(24px,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] flex items-center justify-center shadow-sm">
          <Car size={36} className="text-[#123D32] dark:text-[#347858]" />
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-[#10251C] dark:text-[#F3F1E8] text-2xl font-serif font-bold mb-2">No Active Ride</h1>
        <p className="text-[#696B64] dark:text-[#929D93] text-xs mb-8 max-w-xs font-medium">You don&apos;t have any active booking right now. Go online to start receiving ride requests.</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.location.href = "/partners/dashboard"}
          className="bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] px-8 py-3.5 rounded-[8px] text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
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
    <div className="h-screen w-full bg-[#F7F1E5] dark:bg-[#101713] flex items-center justify-center transition-colors">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#123D32]/20 border-t-[#123D32] dark:border-white/20 dark:border-t-[#FAF7F0] animate-spin" />
        <p className="text-[#696B64] dark:text-[#929D93] text-xs tracking-widest uppercase font-semibold">Loading ride…</p>
      </div>
    </div>
  );

  const isActive        = ["confirmed", "started"].includes(status);
  const canChat         = status === "confirmed";

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

  const panelProps = {
    booking, status, cfg, isActive, canChat, displayEta, displayDistance,
    pickupPos, dropPos,
    otpMode, otp, loadingOtp, otpVerified, otpError,
    setOtpMode, setOtp, setOtpError, handleVerifyOtp, sendPickupOtp,
    dropOtpMode, dropOtp, loadingDropOtp, dropOtpError,
    setDropOtpMode, setDropOtp, setDropOtpError, handleVerifyDropOtp, sendDropOtp,
    chatOpen, onChatToggle: () => canChat && setChatOpen(v => !v),
    onCancel: handleCancel,
    onCallClick: startVoipCall,
    onAcceptRide: handleAcceptRide,
    onDeclineRide: handleDeclineRide,
    actionPending,
  };

  return (
    <div className="h-screen w-full bg-[#F7F1E5] dark:bg-[#101713] flex flex-col lg:flex-row overflow-hidden transition-colors">

      {/* MAP */}
      <div className="relative flex-1 h-full z-0">
        <LiveRideMap
          driverLocation={driverPos}
          pickupLocation={pickupPos}
          dropLocation={dropPos}
          pickupAddress={booking?.pickupAddress}
          dropAddress={booking?.dropAddress}
          status={mapStatus}
          onStats={({ distanceToPickup, durationToPickup, distanceToDrop, durationToDrop }: any) => {
            setDistanceToPickup(distanceToPickup); setEtaToPickup(durationToPickup);
            setDistanceToDrop(distanceToDrop);     setEtaToDrop(durationToDrop);
          }}
        />
        {/* Floating Top Navigation & Status Bar - Non-overlapping layout */}
        <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 z-[500] flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            <Link
              href="/"
              className="h-8 sm:h-9 px-2.5 sm:px-3 bg-[#FAF7F0]/95 hover:bg-[#FAF7F0] dark:bg-[#17211B]/95 dark:hover:bg-[#17211B] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] shadow-sm flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm transition"
              title="Home"
            >
              <HomeIcon size={16} className="text-[#123D32] dark:text-[#347858]" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              href="/partners/dashboard"
              className="h-8 sm:h-9 px-2.5 sm:px-3 bg-[#FAF7F0]/95 hover:bg-[#FAF7F0] dark:bg-[#17211B]/95 dark:hover:bg-[#17211B] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] shadow-sm flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm transition"
              title="Vendor Dashboard"
            >
              <span>Dashboard</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-[#FAF7F0]/95 dark:bg-[#17211B]/95 px-2.5 sm:px-3.5 py-1.5 rounded-[8px] shadow-sm border border-[#DED7CA] dark:border-[#34443A] backdrop-blur-sm shrink-0"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <span className="text-xs font-semibold text-[#10251C] dark:text-[#F3F1E8] whitespace-nowrap">{cfg.label}</span>
            {isWakeLockActive && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-[#123D32] dark:text-[#347858] bg-[#123D32]/10 dark:bg-[#28664D]/25 px-1.5 py-0.5 rounded-[4px] border border-[#123D32]/20 dark:border-[#28664D]/40 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#123D32] dark:bg-[#347858] animate-pulse" />
                AWAKE
              </span>
            )}
            {!isSocketConnected && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-[4px] border border-amber-300 dark:border-amber-700/60 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                6s POLLING
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* DESKTOP PANEL */}
      <motion.div
        initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-[420px] xl:w-[460px] bg-[#FAF7F0] dark:bg-[#17211B] border-l border-[#DED7CA] dark:border-[#34443A] flex-col overflow-hidden"
      >
        <div className="bg-[#123D32] dark:bg-[#0D3027] px-6 py-5 flex-shrink-0 border-b border-[#0D3027] dark:border-[#34443A]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FAF7F0]/80 hover:text-[#FAF7F0] transition"
                title="Go to Home"
              >
                <HomeIcon size={13} />
                <span>Home</span>
              </Link>
              <span className="text-[#FAF7F0]/40 text-xs">•</span>
              <Link
                href="/partner/dashboard"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FAF7F0]/80 hover:text-[#FAF7F0] transition"
                title="Partner Dashboard"
              >
                <span>Dashboard</span>
              </Link>
            </div>
            <p className="text-[#FAF7F0]/70 text-[10px] tracking-[0.15em] uppercase font-bold">Driver Console</p>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-[#FAF7F0] text-xl font-serif font-bold">Active Ride</h1>
            <div className="flex items-center gap-2">
              {isWakeLockActive && (
                <div className="flex items-center gap-1 bg-white/15 border border-white/25 px-2 py-1 rounded-[6px] text-[10px] font-mono font-bold text-[#FAF7F0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AWAKE
                </div>
              )}
              {!isSocketConnected && (
                <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-300/40 px-2 py-1 rounded-[6px] text-[10px] font-mono font-bold text-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  6s POLLING
                </div>
              )}
              {isActive && (
                <div className="flex items-center gap-1.5 bg-[#0D3027] dark:bg-[#123D32] border border-[#123D32] dark:border-[#28664D] px-3 py-1.5 rounded-[8px]">
                  <Zap size={12} className="text-amber-400" />
                  <span className="text-[#FAF7F0] text-xs font-mono font-bold">{Math.round(displayEta)} MIN</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F7F1E5] dark:bg-[#101713]">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <PanelContent {...panelProps} />
          </div>
          <ActionBar {...panelProps} />
        </div>
      </motion.div>

      {/* MOBILE BOTTOM SHEET */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <motion.div
          className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-t-[20px] shadow-2xl pointer-events-auto overflow-hidden border-t border-[#DED7CA] dark:border-[#34443A] flex flex-col"
          animate={{ height: expanded ? "min(85dvh, 85vh)" : `calc(${status === "requested" ? 140 : 200}px + env(safe-area-inset-bottom, 0px))` }}
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
            className="flex-shrink-0 cursor-grab active:cursor-grabbing select-none bg-[#FAF7F0] dark:bg-[#17211B] border-b border-[#DED7CA] dark:border-[#34443A]"
          >
            <div className="pt-2 pb-1 flex flex-col items-center">
              <div className="w-12 h-1 bg-[#DED7CA] dark:bg-[#34443A] rounded-full mb-1 cursor-pointer hover:bg-[#696B64] dark:hover:bg-[#929D93] transition-colors" />
              <span className="text-[9px] font-bold text-[#696B64] dark:text-[#929D93] uppercase tracking-wider">
                {expanded ? "Swipe down for map" : "Swipe up for ride details"}
              </span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#10251C] dark:text-[#F3F1E8] leading-tight truncate">{cfg.label}</p>
                  <p className="text-[11px] text-[#696B64] dark:text-[#929D93] font-medium leading-tight truncate">{cfg.sublabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                {isActive && (
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#123D32] dark:text-[#347858] leading-none">{Math.round(displayEta)}</p>
                    <p className="text-[9px] font-bold text-[#696B64] dark:text-[#929D93] uppercase tracking-wider">min</p>
                  </div>
                )}
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-7 h-7 rounded-[6px] border border-[#DED7CA] dark:border-[#34443A] bg-[#F7F1E5] dark:bg-[#101713] flex items-center justify-center text-[#10251C] dark:text-[#F3F1E8]"
                >
                  <ChevronUp size={14} />
                </motion.div>
              </div>
            </div>
          </motion.div>
          <div className="flex-1 overflow-y-auto min-h-0 bg-[#F7F1E5] dark:bg-[#101713]">
            <PanelContent {...panelProps} />
          </div>
          <ActionBar {...panelProps} />
        </motion.div>
      </div>

      {/* ── DRIVER CANCELLATION & PENALTY WARNING MODAL ── */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[9999] px-4"
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15 }}
              className="bg-[#FAF7F0] dark:bg-[#17211B] w-full max-w-md rounded-[16px] shadow-2xl overflow-hidden border border-[#DED7CA] dark:border-[#34443A] flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-[#DED7CA] dark:border-[#34443A] flex items-center justify-between bg-[#F7F1E5] dark:bg-[#1E2B23]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[8px] bg-red-100 dark:bg-red-950/50 text-[#E34222] dark:text-[#E06A50] flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#10251C] dark:text-[#F3F1E8]">Cancel Accepted Ride</h3>
                    <p className="text-[11px] text-[#696B64] dark:text-[#929D93] font-medium">Review reasons and reliability impact</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close cancellation dialog"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-10 h-10 min-h-[44px] rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] hover:bg-[#FAF7F0] dark:hover:bg-[#17211B] flex items-center justify-center text-[#696B64] dark:text-[#929D93] transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Time & Location Indicators */}
                {(() => {
                  const elapsedSec = getElapsedAcceptanceSeconds();
                  const isNearPickup = distanceToPickup > 0 && distanceToPickup <= 1.0;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                        <div className="bg-[#F7F1E5] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] p-2.5 flex items-center gap-2 text-[#10251C] dark:text-[#F3F1E8]">
                          <Clock size={14} className="text-[#696B64] dark:text-[#929D93] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-wider text-[#696B64] dark:text-[#929D93] font-bold">Accepted</p>
                            <p className="truncate font-bold text-[#10251C] dark:text-[#F3F1E8]">{Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s ago</p>
                          </div>
                        </div>
                        <div className="bg-[#F7F1E5] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] p-2.5 flex items-center gap-2 text-[#10251C] dark:text-[#F3F1E8]">
                          <Navigation size={14} className="text-[#696B64] dark:text-[#929D93] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-wider text-[#696B64] dark:text-[#929D93] font-bold">Pickup Distance</p>
                            <p className="truncate font-bold text-[#10251C] dark:text-[#F3F1E8]">
                              {distanceToPickup > 0 ? `${distanceToPickup.toFixed(1)} km (${etaToPickup}m)` : "Arrived"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Penalty Impact Warning */}
                      {isNearPickup || elapsedSec > 120 ? (
                        <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-[10px] p-3.5 text-left">
                          <div className="flex items-center gap-1.5 text-[#E34222] dark:text-[#E06A50] text-xs font-bold mb-1">
                            <AlertTriangle size={15} className="text-[#E34222] dark:text-[#E06A50] flex-shrink-0" />
                            <span>Driver Penalty & Reliability Impact</span>
                          </div>
                          <p className="text-[11px] text-red-900 dark:text-red-200 leading-relaxed font-medium">
                            You accepted this ride <strong>{Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s ago</strong> and are <strong>{distanceToPickup > 0 ? `${distanceToPickup.toFixed(1)} km from pickup` : "at pickup"}</strong>. Cancelling after approaching the passenger lowers your Reliability Score and may temporarily pause new booking requests.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-[#F7F1E5] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] p-3.5 text-left">
                          <div className="flex items-center gap-1.5 text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold mb-1">
                            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <span>Early Cancellation Notice</span>
                          </div>
                          <p className="text-[11px] text-[#696B64] dark:text-[#929D93] leading-relaxed font-medium">
                            Please cancel only when unavoidable. Another nearby driver will be auto-dispatched to assist the passenger.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Driver Reasons */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8] mb-2">Select cancellation reason:</p>
                  <div className="space-y-1.5">
                    {DRIVER_CANCELLATION_REASONS.map((r) => {
                      const isSelected = selectedDriverReason === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedDriverReason(r)}
                          className={`w-full text-left px-3.5 py-3 min-h-[44px] rounded-[8px] text-xs transition-all flex items-center justify-between border cursor-pointer ${
                            isSelected
                              ? "bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] border-[#123D32] dark:border-[#28664D] font-semibold"
                              : "bg-[#FAF7F0] dark:bg-[#1E2B23] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] border-[#DED7CA] dark:border-[#34443A]"
                          }`}
                        >
                          <span>{r}</span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ml-2 ${
                              isSelected ? "border-white bg-white" : "border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#17211B]"
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#123D32] dark:bg-[#28664D]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDriverReason === "Other operational reason" && (
                    <textarea
                      value={customDriverNote}
                      onChange={(e) => setCustomDriverNote(e.target.value)}
                      placeholder="Please specify operational reason..."
                      className="w-full text-xs p-3 border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] outline-none focus:border-[#123D32] dark:focus:border-[#28664D] mt-2.5 resize-none text-[#10251C] dark:text-[#F3F1E8] bg-white dark:bg-[#101713]"
                      rows={2}
                    />
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-[#DED7CA] dark:border-[#34443A] bg-[#F7F1E5] dark:bg-[#1E2B23] flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancellingRide}
                  className="flex-1 py-3 border border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#17211B] hover:bg-[#FAF7F0]/80 dark:hover:bg-[#17211B]/80 text-[#10251C] dark:text-[#F3F1E8] rounded-[8px] text-xs font-semibold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  Keep Ride
                </button>
                <button
                  type="button"
                  onClick={confirmCancelRide}
                  disabled={!selectedDriverReason || cancellingRide}
                  className="flex-1 py-3 bg-[#E34222] dark:bg-[#E34222] hover:bg-[#9E2F1B] text-[#FAF7F0] rounded-[8px] text-xs font-semibold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {cancellingRide ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    "Confirm Cancellation"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] px-4"
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15 }}
              className="bg-[#FAF7F0] dark:bg-[#17211B] w-full max-w-sm rounded-[16px] shadow-2xl overflow-hidden border border-[#DED7CA] dark:border-[#34443A]"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto text-[#E34222] dark:text-[#E06A50]">
                  <XCircle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#10251C] dark:text-[#F3F1E8]">Error</h3>
                  <p className="text-[#696B64] dark:text-[#929D93] text-xs font-medium leading-relaxed">
                    {showCancelError}
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => setShowCancelError(null)}
                  className="w-full py-3 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] rounded-[8px] text-xs font-semibold uppercase tracking-wider transition active:scale-[0.98] cursor-pointer shadow-sm"
                >
                  Okay
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
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-lg flex items-center justify-center p-4"
          >
            <div className="bg-[#17211B] border border-[#34443A] w-full max-w-lg rounded-[16px] p-6 shadow-2xl relative flex flex-col items-center">
              {/* Header */}
              <div className="flex items-center gap-2 bg-[#1E2B23] px-3 py-1 rounded-full border border-[#34443A] shadow-sm mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#B8C2B8]">Secure Voice Bridge</span>
              </div>
              
              {/* Zego Container */}
              <div 
                ref={setZegoContainer} 
                className="w-full h-[400px] rounded-[12px] overflow-hidden bg-[#101713] border border-[#34443A]"
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
                className="mt-4 bg-[#E34222] hover:bg-[#9E2F1B] text-white font-semibold text-xs uppercase tracking-wider px-6 py-3 min-h-[44px] rounded-[8px] transition active:scale-95 cursor-pointer shadow-sm flex items-center justify-center"
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
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#17211B] border border-[#34443A] rounded-[16px] p-6 w-full max-w-sm text-center shadow-2xl flex flex-col items-center"
            >
              <div className="relative mb-5">
                <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-emerald-500 opacity-40"></span>
                <div className="w-16 h-16 rounded-full bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] flex items-center justify-center shadow-lg">
                  <Phone size={28} className="animate-bounce" />
                </div>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Incoming Voice Call</p>
              <h3 className="text-xl font-bold text-[#F3F1E8]">{incomingCall.callerName}</h3>
              <p className="text-xs text-[#929D93] mt-1 font-medium">In-ride secure audio bridge</p>

              <div className="flex gap-3 w-full mt-6">
                <button
                  onClick={() => {
                    if (booking?._id) {
                      const socket = getSocket();
                      socket.emit("reject-call", { bookingId: booking._id });
                    }
                    setIncomingCall(null);
                  }}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold py-3 min-h-[44px] rounded-[8px] text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
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
                  className="flex-1 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] font-semibold py-3 min-h-[44px] rounded-[8px] text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
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
   ACTION BAR
══════════════════════════════════════════════════════════════════════ */
function ActionBar({
  status,
  booking,
  pickupPos,
  dropPos,
  otpMode, otp, loadingOtp, otpVerified, otpError,
  setOtpMode, setOtp, setOtpError, handleVerifyOtp, sendPickupOtp,
  dropOtpMode, dropOtp, loadingDropOtp, dropOtpError,
  setDropOtpMode, setDropOtp, setDropOtpError, handleVerifyDropOtp, sendDropOtp,
  onAcceptRide, onDeclineRide, actionPending,
}: any) {
  if (status === "requested") {
    return (
      <div className="flex-shrink-0 border-t border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#17211B] px-4 py-3 flex gap-2" style={{ paddingBottom: "max(12px, calc(env(safe-area-inset-bottom, 0px) + 8px))" }}>
        <button
          type="button"
          onClick={onDeclineRide}
          disabled={actionPending}
          className="flex-1 bg-[#FAF7F0] hover:bg-[#F7F1E5] dark:bg-[#1E2B23] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAcceptRide}
          disabled={actionPending}
          className="flex-1 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider transition cursor-pointer active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
        >
          <CheckCircle2 size={15} />
          <span>{actionPending ? "Accepting..." : "Accept Ride"}</span>
        </button>
      </div>
    );
  }

  const isPreTrip = ["confirmed", "driver_assigned", "driver_arriving", "driver_arrived", "awaiting_payment"].includes(status);
  const isStarted = ["started", "ride_started", "ride_in_progress"].includes(status);

  if (!isPreTrip && !isStarted) return null;

  const targetCoords = isStarted ? dropPos : pickupPos;
  const targetAddress = isStarted ? booking?.dropAddress : booking?.pickupAddress;
  const navUrl = targetCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${targetCoords[0]},${targetCoords[1]}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targetAddress || "")}&travelmode=driving`;

  return (
    <div className="flex-shrink-0 border-t border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#17211B] px-4 py-3" style={{ paddingBottom: "max(12px, calc(env(safe-area-inset-bottom, 0px) + 8px))" }}>
      {/* 🧭 Turn-by-Turn GPS Navigation Action */}
      <a
        href={navUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full mb-2.5 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] active:scale-[0.98] text-[#FAF7F0] py-3 px-4 min-h-[44px] rounded-[8px] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
      >
        <Navigation size={14} className="fill-[#FAF7F0]" />
        <span>Navigate in Maps ({isStarted ? "To Drop" : "To Pickup"})</span>
        <ExternalLink size={13} className="opacity-80 ml-1" />
      </a>

      <AnimatePresence mode="wait">

        {/* STATE 1 — Arrived */}
        {isPreTrip && !otpMode && !otpVerified && (
          <motion.button key="arrived"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            onClick={async () => { await sendPickupOtp(); setOtpMode(true); }}
            className="w-full bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] active:scale-[0.98] text-[#FAF7F0] py-3.5 min-h-[44px] rounded-[8px] font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <MapPin size={15} /> I&apos;ve Arrived at Pickup <ArrowRight size={14} className="ml-1" />
          </motion.button>
        )}

        {/* STATE 2 — Pickup OTP */}
        {isPreTrip && otpMode && !otpVerified && (
          <motion.div key="pickup-otp"
            initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }}
            className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] overflow-hidden shadow-sm"
          >
            <div className="bg-[#123D32] dark:bg-[#0D3027] px-4 py-2.5 flex items-center gap-2">
              <KeyRound size={14} className="text-amber-400" />
              <p className="text-[#FAF7F0] text-xs font-semibold tracking-wider uppercase">Enter Customer OTP</p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-[#696B64] dark:text-[#929D93] font-medium">Ask customer for their 4-digit PIN to start ride.</p>
              <div className="flex justify-center">
                <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                  placeholder="· · · ·"
                  className="w-48 border border-[#DED7CA] dark:border-[#34443A] focus:border-[#123D32] dark:focus:border-[#28664D] rounded-[8px] px-4 py-2 text-center text-2xl tracking-[0.5em] font-mono font-bold outline-none transition-colors bg-white dark:bg-[#101713] text-[#10251C] dark:text-[#F3F1E8]"
                />
              </div>
              {otpError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#E34222] dark:text-[#E06A50] text-xs text-center font-bold">{otpError}</motion.p>}
              <div className="flex gap-2">
                <button onClick={() => { setOtpMode(false); setOtp(""); setOtpError(""); }}
                  className="flex-1 border border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#1E2B23] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer"
                >Cancel</button>
                <button onClick={handleVerifyOtp} disabled={loadingOtp || otp.length < 4}
                  className="flex-1 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] disabled:opacity-40 text-[#FAF7F0] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  {loadingOtp ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</span> : "Verify OTP"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STATE 3 — Pickup verified */}
        {otpVerified && isPreTrip && (
          <motion.div key="pickup-verified"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-4 py-2.5 rounded-[8px]">
              <CheckCircle2 size={15} className="text-[#123D32] dark:text-emerald-400 flex-shrink-0" />
              <p className="text-[#123D32] dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">OTP Verified — Trip In Progress</p>
            </div>
          </motion.div>
        )}

        {/* STATE 4 — Mark as Dropped */}
        {isStarted && !dropOtpMode && (
          <motion.button key="drop-btn"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            onClick={async () => { await sendDropOtp(); setDropOtpMode(true); }}
            className="w-full bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] active:scale-[0.98] text-[#FAF7F0] py-3.5 rounded-[8px] font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Navigation size={15} /> Mark as Dropped <ArrowRight size={14} />
          </motion.button>
        )}

        {/* STATE 5 — Drop OTP */}
        {isStarted && dropOtpMode && (
          <motion.div key="drop-otp"
            initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }}
            className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] overflow-hidden shadow-sm"
          >
            <div className="bg-[#123D32] dark:bg-[#0D3027] px-4 py-2.5 flex items-center gap-2">
              <KeyRound size={14} className="text-[#FAF7F0]" />
              <p className="text-[#FAF7F0] text-xs font-semibold tracking-wider uppercase">Confirm Drop OTP</p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-[#696B64] dark:text-[#929D93] font-medium">Ask customer for their drop PIN to end the ride.</p>
              <div className="flex justify-center">
                <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={dropOtp}
                  onChange={e => { setDropOtp(e.target.value.replace(/\D/g, "")); setDropOtpError(""); }}
                  placeholder="· · · ·"
                  className="w-48 border border-[#DED7CA] dark:border-[#34443A] focus:border-[#123D32] dark:focus:border-[#28664D] rounded-[8px] px-4 py-2 text-center text-2xl tracking-[0.5em] font-mono font-bold outline-none transition-colors bg-white dark:bg-[#101713] text-[#10251C] dark:text-[#F3F1E8]"
                />
              </div>
              {dropOtpError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#E34222] dark:text-[#E06A50] text-xs text-center font-bold">{dropOtpError}</motion.p>}
              <div className="flex gap-2">
                <button onClick={() => { setDropOtpMode(false); setDropOtp(""); setDropOtpError(""); }}
                  className="flex-1 border border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#1E2B23] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer"
                >Cancel</button>
                <button onClick={handleVerifyDropOtp} disabled={loadingDropOtp || dropOtp.length < 4}
                  className="flex-1 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] disabled:opacity-40 text-[#FAF7F0] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer shadow-sm"
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
function PanelContent({
  booking, status, isActive, canChat, displayEta, chatOpen, onChatToggle, onCancel, onCallClick,
  onAcceptRide, onDeclineRide, actionPending,
}: any) {
  return (
    <div className="flex flex-col pt-4 pb-4 gap-3">

      {/* ── NEW INCOMING TRIP REQUEST BANNER & ACCEPT/DECLINE CONTROLS ── */}
      {status === "requested" && (
        <div className="mx-4 lg:mx-6 p-4 bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] text-[#10251C] dark:text-[#F3F1E8] rounded-[12px] shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#DED7CA] dark:border-[#34443A] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Incoming Ride Request</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-[#123D32] dark:text-[#347858] font-mono">₹{booking?.partnerAmount || Math.round((booking?.fare || 0) * 0.9)}</span>
              <p className="text-[9px] text-[#696B64] dark:text-[#929D93] uppercase tracking-wider font-semibold">Net Payout</p>
            </div>
          </div>

          <p className="text-xs text-[#696B64] dark:text-[#929D93] font-medium leading-relaxed">
            A passenger nearby has requested a ride. Accept to confirm booking and start navigating.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onDeclineRide}
              disabled={actionPending}
              className="flex-1 bg-[#FAF7F0] hover:bg-[#F7F1E5] dark:bg-[#1E2B23] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAcceptRide}
              disabled={actionPending}
              className="flex-1 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider transition cursor-pointer active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 size={15} />
              <span>{actionPending ? "Accepting..." : "Accept Ride"}</span>
            </button>
          </div>
        </div>
      )}

      {/* DRIVER PANIC ALERT BANNER */}
      {booking?.isPanicActive && (
        <div className="mx-4 lg:mx-6">
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[12px] p-4 text-[#E34222] dark:text-[#E06A50] flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#E34222] flex items-center justify-center flex-shrink-0 text-white">
              <Siren size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#E34222] dark:text-[#E06A50]">Emergency SOS Triggered</p>
              <p className="text-xs font-medium text-red-900 dark:text-red-200">Passenger requested emergency safety assistance. Please adhere to standard safety guidelines.</p>
            </div>
          </div>
        </div>
      )}

      {/* ETA + GUARANTEED EARNINGS */}
      {isActive && (
        <div className="mx-4 lg:mx-6 grid grid-cols-2 gap-2">
          <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] p-3.5 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-[8px] bg-[#F7F1E5] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] flex items-center justify-center flex-shrink-0">
              <Clock size={15} className="text-[#123D32] dark:text-[#347858]" />
            </div>
            <div>
              <p className="text-[10px] text-[#696B64] dark:text-[#929D93] uppercase tracking-wider font-semibold">ETA</p>
              <p className="text-base font-bold text-[#10251C] dark:text-[#F3F1E8] leading-none mt-0.5">
                {Math.round(displayEta)}<span className="text-xs font-normal text-[#696B64] dark:text-[#929D93] ml-0.5">min</span>
              </p>
            </div>
          </div>
          <div className="bg-[#0D3027] dark:bg-[#10251C] border border-[#123D32] dark:border-[#28664D] rounded-[12px] p-3.5 flex items-center gap-3 shadow-sm text-[#FAF7F0]">
            <div className="w-8 h-8 rounded-[8px] bg-[#123D32] dark:bg-[#1E2B23] flex items-center justify-center flex-shrink-0">
              <IndianRupee size={15} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#FAF7F0]/70 uppercase tracking-wider font-semibold truncate">Your Earning</p>
              <p className="text-base font-bold text-emerald-400 leading-none mt-0.5 font-mono">
                ₹{booking?.partnerAmount || (booking?.fare ? Math.round(booking.fare * 0.9) : "—")}
              </p>
              <span className="text-[9px] text-[#FAF7F0]/80 font-medium uppercase tracking-wider block mt-0.5">
                ● Guaranteed Net
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER CARD */}
      {booking?.user && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-4 lg:mx-6">
          <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] p-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-[10px] bg-[#123D32]/10 dark:bg-[#28664D]/25 border border-[#123D32]/20 dark:border-[#28664D]/40 flex items-center justify-center text-[#123D32] dark:text-[#347858]">
                  <User2 size={24} />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-[#FAF7F0] dark:border-[#17211B]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[#10251C] dark:text-[#F3F1E8] font-bold text-sm truncate uppercase tracking-tight">{(booking.user as any)?.name || "Customer"}</p>
                  <div className="flex items-center gap-1 bg-[#F7F1E5] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] px-2.5 py-1 rounded-[6px] flex-shrink-0">
                    <span className="text-[9px] text-[#696B64] dark:text-[#929D93] font-semibold uppercase mr-0.5">
                      {booking.paymentStatus === "cash" ? "Collect:" : "Fare:"}
                    </span>
                    <IndianRupee size={11} className="text-[#123D32] dark:text-[#347858]" />
                    <span className="text-[#10251C] dark:text-[#F3F1E8] text-xs font-mono font-bold">
                      {booking.paymentStatus === "cash" && typeof booking.cashAmountDue === "number" && booking.cashAmountDue >= 0
                        ? booking.cashAmountDue
                        : booking.fare}
                    </span>
                  </div>
                </div>
                {booking.paymentStatus && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-[4px] font-mono font-bold uppercase tracking-wider ${
                      booking.paymentStatus === "cash"
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60"
                        : "bg-emerald-100 dark:bg-emerald-950/60 text-[#123D32] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60"
                    }`}>
                      {booking.paymentStatus === "cash"
                        ? (booking.walletAmountPaid && booking.walletAmountPaid > 0
                            ? `Split: ₹${booking.walletAmountPaid} Wallet Paid`
                            : "Collect Cash on Drop")
                        : "Paid Online"}
                    </span>
                    <span className="text-[10px] text-[#696B64] dark:text-[#929D93] font-mono">
                      {booking.paymentStatus === "cash"
                        ? `Rider pays ₹${typeof booking.cashAmountDue === "number" && booking.cashAmountDue >= 0 ? booking.cashAmountDue : booking.fare} cash`
                        : "Wallet auto-credited"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isActive && (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#DED7CA] dark:border-[#34443A]">
                <button
                  onClick={onCallClick}
                  className="flex items-center justify-center gap-1.5 bg-[#FAF7F0] hover:bg-[#F7F1E5] dark:bg-[#1E2B23] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] active:scale-[0.98] transition-all py-2.5 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  <Phone size={13} className="text-[#123D32] dark:text-[#347858]" /> <span>Call</span>
                </button>
                {booking.userMobileNumber ? (
                  <a
                    href={`tel:${booking.userMobileNumber}`}
                    className="flex items-center justify-center gap-1.5 bg-[#FAF7F0] hover:bg-[#F7F1E5] dark:bg-[#1E2B23] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] active:scale-[0.98] transition-all py-2.5 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider cursor-pointer text-center shadow-sm"
                    title="Direct Cellular Phone Call"
                  >
                    <PhoneCall size={13} className="text-[#123D32] dark:text-[#347858]" /> <span>Phone</span>
                  </a>
                ) : (
                  <div />
                )}
                {canChat && (
                  <button onClick={onChatToggle}
                    className={`flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all py-2 rounded-[8px] text-xs font-semibold uppercase tracking-wider border cursor-pointer shadow-sm ${chatOpen ? "bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] border-[#123D32] dark:border-[#28664D]" : "bg-[#FAF7F0] hover:bg-[#F7F1E5] dark:bg-[#1E2B23] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A]"}`}
                  >
                    <MessageCircle size={13} />
                    <span>{chatOpen ? "Close" : "Chat"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* CHAT — confirmed only */}
      <AnimatePresence>
        {chatOpen && canChat && (
          <motion.div key="chat"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-4 lg:mx-6 overflow-hidden"
          >
            <div className="rounded-[12px] overflow-hidden border border-[#DED7CA] dark:border-[#34443A] h-[460px] shadow-sm">
              <RideChat currentRole="driver" rideId={booking._id} userName={(booking?.user as any)?.name} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VEHICLE CARD */}
      {booking?.vehicle && (
        <div className="mx-4 lg:mx-6">
          <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] p-3.5 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-[8px] bg-[#123D32]/10 dark:bg-[#28664D]/25 border border-[#123D32]/20 dark:border-[#28664D]/40 flex items-center justify-center flex-shrink-0 text-[#123D32] dark:text-[#347858]">
              <Car size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#696B64] dark:text-[#929D93] uppercase tracking-wider font-semibold mb-0.5">Your Vehicle</p>
              <p className="text-xs font-bold text-[#10251C] dark:text-[#F3F1E8] truncate uppercase">{(booking.vehicle as any).vehicleModel}</p>
            </div>
            {(booking.vehicle as any).number && (
              <div className="flex-shrink-0 bg-[#10251C] dark:bg-[#1E2B23] px-3 py-1 rounded-[6px] border border-[#10251C] dark:border-[#34443A]">
                <p className="text-[#FAF7F0] text-xs font-bold tracking-widest font-mono">{(booking.vehicle as any).number}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROUTE CARD */}
      <div className="mx-4 lg:mx-6">
        <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] overflow-hidden shadow-sm">
          <div className="flex gap-3 p-3.5 border-b border-[#DED7CA] dark:border-[#34443A]">
            <div className="flex flex-col items-center flex-shrink-0 pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#123D32] dark:bg-[#28664D] flex-shrink-0" />
              <div className="w-0.5 bg-[#DED7CA] dark:bg-[#34443A] mt-1 flex-1 min-h-[20px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#696B64] dark:text-[#929D93] uppercase tracking-wider mb-0.5">Pickup</p>
              <p className="text-xs font-medium text-[#10251C] dark:text-[#F3F1E8] leading-snug">{booking?.pickupAddress || "—"}</p>
            </div>
          </div>
          <div className="flex gap-3 p-3.5">
            <div className="flex-shrink-0 pt-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-[#123D32] dark:border-[#28664D] bg-[#FAF7F0] dark:bg-[#17211B] flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#696B64] dark:text-[#929D93] uppercase tracking-wider mb-0.5">Drop</p>
              <p className="text-xs font-semibold text-[#10251C] dark:text-[#F3F1E8] leading-snug">{booking?.dropAddress || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CANCEL BUTTON */}
      {["confirmed", "awaiting_payment"].includes(status) && (
        <div className="mx-4 lg:mx-6 mt-1">
          <button
            onClick={onCancel}
            className="w-full bg-[#FAF7F0] hover:bg-[#F7F1E5] dark:bg-[#1E2B23] dark:hover:bg-[#202B24] text-[#E34222] dark:text-[#E06A50] py-3 rounded-[8px] text-xs font-semibold uppercase tracking-wider transition-all border border-[#DED7CA] dark:border-[#34443A] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shadow-sm"
          >
            Cancel Ride
          </button>
        </div>
      )}

      {/* DRIVER EMERGENCY SOS & HELPLINE */}
      {["confirmed", "started"].includes(status) && (
        <div className="mx-4 lg:mx-6 mt-2 pt-2 border-t border-[#DED7CA] dark:border-[#34443A] flex gap-2">
          <a
            href="tel:112"
            className="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-[#E34222] dark:text-[#E06A50] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
          >
            <Siren size={14} className="text-[#E34222] dark:text-[#E06A50]" />
            Police (112)
          </a>
          <button
            type="button"
            onClick={async () => {
              if (confirm("Trigger Driver Emergency Assistance? This will alert RideNow Dispatch & Safety.")) {
                try {
                  await fetch(`/api/booking/${booking._id}/panic`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: "Driver triggered emergency safety assistance" }),
                  });
                  alert("Emergency assistance alert dispatched. Operations team alerted.");
                } catch (e) {
                  console.error("Driver panic error:", e);
                }
              }
            }}
            className="flex-1 bg-[#10251C] hover:bg-black dark:bg-[#1E2B23] dark:hover:bg-[#28664D] text-[#FAF7F0] py-3 min-h-[44px] rounded-[8px] text-xs font-semibold uppercase tracking-wider border border-[#10251C] dark:border-[#34443A] transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] shadow-sm"
          >
            <ShieldAlert size={14} className="text-amber-400" />
            Safety SOS
          </button>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COMPLETED FULL SCREEN
══════════════════════════════════════════════════════════════════════ */
function CompletedScreen({ booking }: { booking: IBooking }) {
  const [showFareModal, setShowFareModal] = useState(true);

  return (
    <>
      <FareCollectionModal
        isOpen={showFareModal}
        onClose={() => setShowFareModal(false)}
        booking={booking as any}
        perspective="vendor"
      />
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        className="min-h-[100dvh] w-full bg-[#F7F1E5] dark:bg-[#101713] flex flex-col overflow-y-auto transition-colors pb-[max(24px,env(safe-area-inset-bottom))]"
      >
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-[#123D32]/10 dark:bg-[#28664D]/25 border border-[#123D32]/20 dark:border-[#28664D]/40 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-[#123D32] dark:text-[#347858]" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-md"
        >
          <p className="text-[#696B64] dark:text-[#929D93] text-[11px] uppercase tracking-[0.2em] font-semibold text-center mb-1">Trip Complete</p>
          <h1 className="text-[#10251C] dark:text-[#F3F1E8] text-2xl sm:text-3xl font-serif text-center mb-1">Ride Completed!</h1>
          <p className="text-[#696B64] dark:text-[#929D93] text-xs text-center mb-6">You have successfully dropped the customer.</p>

          <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[16px] p-5 mb-4 shadow-sm">
            <p className="text-[#696B64] dark:text-[#929D93] text-[10px] uppercase tracking-wider font-semibold mb-1 text-center">Net Earnings Credited</p>
            <p className="text-[#123D32] dark:text-emerald-400 text-3xl sm:text-4xl font-bold flex items-center justify-center gap-1 mb-4 font-mono">
              <IndianRupee size={28} strokeWidth={2.5} /> {booking.partnerAmount || Math.round(booking.fare * 0.9)}
            </p>

            {/* Itemized Price Confirmation */}
            <div className="space-y-2 border-t border-[#DED7CA] dark:border-[#34443A] pt-3 pb-3 text-xs">
              <div className="flex justify-between text-[#696B64] dark:text-[#929D93] font-medium">
                <span>Customer Gross Fare:</span>
                <span className="font-mono text-[#10251C] dark:text-[#F3F1E8] font-semibold">₹{booking.fare}</span>
              </div>
              <div className="flex justify-between text-[#696B64] dark:text-[#929D93] font-medium">
                <span>Platform Commission (10%):</span>
                <span className="font-mono text-[#E34222] dark:text-[#E06A50] font-semibold">-₹{booking.adminCommission || Math.round(booking.fare * 0.1)}</span>
              </div>
              <div className="flex justify-between text-[#10251C] dark:text-[#F3F1E8] font-bold border-t border-[#DED7CA] dark:border-[#34443A] pt-2">
                <span className="text-[#123D32] dark:text-emerald-400">Net Driver Payout:</span>
                <span className="font-mono text-[#123D32] dark:text-emerald-400 text-sm">₹{booking.partnerAmount || Math.round(booking.fare * 0.9)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-[#DED7CA] dark:border-[#34443A] pt-3">
              <span className="text-[#696B64] dark:text-[#929D93] font-bold uppercase text-[10px] tracking-wider">Payment Mode</span>
              <span className={`px-2.5 py-1 rounded-[6px] font-mono font-bold text-[10px] uppercase tracking-wider ${
                booking.paymentStatus === "cash"
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60"
                  : "bg-emerald-100 dark:bg-emerald-950/60 text-[#123D32] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60"
              }`}>
                {booking.paymentStatus === "cash" ? "Cash (Keep Full Fare)" : "Online Wallet Credited"}
              </span>
            </div>

            {booking.settlementStatus === "failed" && (
              <div className="mt-3 p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                <span className="font-medium">Earnings settlement queued. Your driver wallet will refresh automatically.</span>
              </div>
            )}
          </div>

          {booking.user && (
            <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] p-3.5 flex items-center gap-3 mb-3 shadow-sm">
              <div className="w-10 h-10 rounded-[8px] bg-[#123D32]/10 dark:bg-[#28664D]/25 flex items-center justify-center flex-shrink-0 text-[#123D32] dark:text-[#347858]">
                <User2 size={20} />
              </div>
              <div>
                <p className="text-[#696B64] dark:text-[#929D93] text-[10px] uppercase tracking-wider font-semibold">Customer</p>
                <p className="text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold uppercase">{(booking.user as any)?.name || "Customer"}</p>
              </div>
            </div>
          )}

          <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] overflow-hidden mb-5 shadow-sm">
            <div className="flex gap-3 p-3.5 border-b border-[#DED7CA] dark:border-[#34443A]">
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#123D32] dark:bg-[#28664D]" />
                <div className="w-0.5 bg-[#DED7CA] dark:bg-[#34443A] mt-1 flex-1 min-h-[16px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-[#696B64] dark:text-[#929D93] uppercase tracking-wider mb-0.5">Pickup</p>
                <p className="text-xs text-[#10251C] dark:text-[#F3F1E8] leading-snug">{booking.pickupAddress || "—"}</p>
              </div>
            </div>
            <div className="flex gap-3 p-3.5">
              <div className="flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-[#123D32] dark:border-[#28664D] bg-[#FAF7F0] dark:bg-[#17211B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-[#696B64] dark:text-[#929D93] uppercase tracking-wider mb-0.5">Drop</p>
                <p className="text-xs text-[#10251C] dark:text-[#F3F1E8] leading-snug">{booking.dropAddress || "—"}</p>
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = "/partners/dashboard"}
            className="w-full bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] py-3.5 rounded-[8px] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
    </>
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
      className="h-screen w-full bg-[#F7F1E5] dark:bg-[#101713] flex flex-col items-center justify-center px-6 transition-colors"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center border ${isExpired ? "bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/30" : "bg-red-500/10 dark:bg-red-500/20 border-red-500/30"}`}>
          {isExpired ? <AlertCircle size={36} className="text-orange-500 dark:text-orange-400" /> : <XCircle size={36} className="text-[#E34222] dark:text-[#E06A50]" />}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        <h1 className="text-[#10251C] dark:text-[#F3F1E8] text-2xl font-serif mb-1">{cfg.label}</h1>
        <p className="text-[#696B64] dark:text-[#929D93] text-xs mb-6">{cfg.sublabel}</p>

        {booking.user && (
          <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] p-3.5 flex items-center gap-3 mb-3 text-left shadow-sm">
            <div className="w-10 h-10 rounded-[8px] bg-[#123D32]/10 dark:bg-[#28664D]/25 flex items-center justify-center flex-shrink-0 text-[#123D32] dark:text-[#347858]">
              <User2 size={18} />
            </div>
            <div>
              <p className="text-[#696B64] dark:text-[#929D93] text-[10px] uppercase tracking-wider font-semibold">Customer</p>
              <p className="text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold uppercase">{(booking.user as any)?.name || "Customer"}</p>
            </div>
          </div>
        )}

        <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] overflow-hidden mb-5 text-left shadow-sm">
          <div className="flex gap-3 p-3.5 border-b border-[#DED7CA] dark:border-[#34443A]">
            <div className="flex flex-col items-center flex-shrink-0 pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#123D32] dark:bg-[#28664D]" />
              <div className="w-0.5 bg-[#DED7CA] dark:bg-[#34443A] mt-1 flex-1 min-h-[16px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#696B64] dark:text-[#929D93] uppercase tracking-wider mb-0.5">Pickup</p>
              <p className="text-xs text-[#10251C] dark:text-[#F3F1E8] leading-snug">{booking.pickupAddress || "—"}</p>
            </div>
          </div>
          <div className="flex gap-3 p-3.5">
            <div className="flex-shrink-0 pt-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-[#123D32] dark:border-[#28664D] bg-[#FAF7F0] dark:bg-[#17211B]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#696B64] dark:text-[#929D93] uppercase tracking-wider mb-0.5">Drop</p>
              <p className="text-xs text-[#10251C] dark:text-[#F3F1E8] leading-snug">{booking.dropAddress || "—"}</p>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => window.location.href = "/partners/dashboard"}
          className="w-full bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] py-3.5 rounded-[8px] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
        >
          Back to Dashboard
        </motion.button>
      </motion.div>
    </motion.div>
  );
}