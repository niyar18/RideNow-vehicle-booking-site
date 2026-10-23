"use client";



import Image from "next/image";
import nextDynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Car, User2, Clock, Zap, IndianRupee,
  ShieldCheck, AlertCircle, Share2, CheckCircle2, Siren
} from "lucide-react";
import { getSocket, joinBookingRoom, leaveBookingRoom } from "@/lib/socket";

const LiveRideMap = nextDynamic(() => import("@/features/maps/components/LiveTrackingMap"), { ssr: false });

type BookingStatus =
  | "requested" | "awaiting_payment" | "confirmed"
  | "started"   | "completed"        | "cancelled"
  | "rejected"  | "expired";

const TERMINAL_TRACKING_STATUSES = new Set([
  "completed", "cancelled", "rejected", "expired", "payment_failed", "no_drivers_available", "disputed",
]);

const STATUS_CONFIG: Record<BookingStatus, { label: string; sublabel: string; dot: string }> = {
  requested:        { label: "Locating Driver", sublabel: "Ride request in progress",       dot: "bg-amber-400" },
  awaiting_payment: { label: "Payment Pending", sublabel: "Awaiting customer payment",      dot: "bg-purple-400" },
  confirmed:        { label: "Driver Arriving", sublabel: "Driver heading to pickup",       dot: "bg-emerald-400" },
  started:          { label: "Trip in Progress",sublabel: "Heading to destination",          dot: "bg-blue-400" },
  completed:        { label: "Trip Completed",  sublabel: "Passenger has arrived safely",   dot: "bg-zinc-400" },
  cancelled:        { label: "Trip Cancelled",  sublabel: "This trip was cancelled",        dot: "bg-red-400" },
  rejected:         { label: "Trip Rejected",   sublabel: "Ride was not accepted",          dot: "bg-red-400" },
  expired:          { label: "Trip Expired",    sublabel: "Booking request timed out",      dot: "bg-orange-400" },
};

export default function PublicTrackPage() {
  const { token } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [pickupPos, setPickupPos] = useState<[number, number] | null>(null);
  const [dropPos, setDropPos] = useState<[number, number] | null>(null);
  const [eta, setEta] = useState<number>(0);

  const fetchPublicTrip = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/track/${token}`, { cache: "no-store" });
      if (!res.ok) {
        const message = res.status === 410
          ? "This tracking link has expired."
          : "Trip not found or invalid link";
        setError(message);
        setBooking(null);
        setDriverPos(null);
        setPickupPos(null);
        setDropPos(null);
        throw new Error(message);
      }
      const data = await res.json();
      if (data.success && data.booking) {
        const b = data.booking;
        setBooking(b);
        if (b.pickupLocation?.coordinates?.length >= 2) {
          setPickupPos([b.pickupLocation.coordinates[1], b.pickupLocation.coordinates[0]]);
        }
        if (b.dropLocation?.coordinates?.length >= 2) {
          setDropPos([b.dropLocation.coordinates[1], b.dropLocation.coordinates[0]]);
        }
        if (TERMINAL_TRACKING_STATUSES.has(String(b.status || "").toLowerCase())) {
          setDriverPos(null);
          setEta(0);
        } else if (b.driver?.location?.coordinates?.length >= 2) {
          setDriverPos([b.driver.location.coordinates[1], b.driver.location.coordinates[0]]);
        } else {
          setDriverPos(null);
        }
      } else {
        throw new Error("Invalid tracking payload");
      }
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load tracking data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (error) return;
    fetchPublicTrip();
    const interval = setInterval(() => fetchPublicTrip(true), 5000);
    return () => clearInterval(interval);
  }, [token, error]);

  useEffect(() => {
    if (!booking?.bookingId || TERMINAL_TRACKING_STATUSES.has(String(booking.status || "").toLowerCase())) return;
    const bookingIdStr = String(booking.bookingId);
    const tokenStr = typeof token === "string" ? token : Array.isArray(token) ? token[0] : "";
    const socket = getSocket();
    joinBookingRoom(bookingIdStr, tokenStr);

    const handleDriverLocation = (data: any) => {
      if (typeof data?.latitude === "number" && typeof data?.longitude === "number") {
        setDriverPos([data.latitude, data.longitude]);
      }
    };

    const handleBookingUpdated = (data: any) => {
      if (TERMINAL_TRACKING_STATUSES.has(String(data?.status || "").toLowerCase())) {
        setDriverPos(null);
        setEta(0);
      }
      setBooking((prev: any) => (prev ? { ...prev, ...data } : null));
    };

    socket.on("driver-location", handleDriverLocation);
    socket.on("booking-updated", handleBookingUpdated);

    return () => {
      leaveBookingRoom(bookingIdStr);
      socket.off("driver-location", handleDriverLocation);
      socket.off("booking-updated", handleBookingUpdated);
    };
  }, [booking?.bookingId, booking?.status, token]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#F7F1E5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#123D32]/20 border-t-[#123D32] animate-spin" />
          <p className="text-[#10251C]/60 text-xs tracking-widest uppercase font-semibold">Loading Live Trip…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="h-screen w-full bg-[#F7F1E5] flex items-center justify-center px-6 text-center">
        <div className="bg-[#FAF7F0] border border-[#DED7CA] rounded-[14px] p-6 shadow-sm flex flex-col items-center gap-3 max-w-sm">
          <AlertCircle size={44} className="text-[#E34222]" />
          <h2 className="text-[#10251C] font-serif font-bold text-xl">Unable to Track Trip</h2>
          <p className="text-[#696B64] text-xs leading-relaxed">{error || "This tracking link may be invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const status: BookingStatus = booking.status || "requested";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.requested;
  const mapStatus = status === "started" ? "ongoing" : status === "completed" ? "completed" : "arriving";

  return (
    <div className="h-screen w-full bg-[#F7F1E5] text-[#10251C] flex flex-col lg:flex-row overflow-hidden">
      
      {/* MAP */}
      <div className="relative flex-1 h-full z-0">
        {pickupPos && dropPos && !TERMINAL_TRACKING_STATUSES.has(String(booking.status || "").toLowerCase()) ? (
          <LiveRideMap
            driverLocation={driverPos}
            pickupLocation={pickupPos}
            dropLocation={dropPos}
            pickupAddress={booking?.pickupAddress}
            dropAddress={booking?.dropAddress}
            status={mapStatus}
            onStats={({ durationToPickup, durationToDrop }: any) => {
              setEta(Math.round(mapStatus === "arriving" ? durationToPickup : durationToDrop));
            }}
          />
        ) : (
          <div className="w-full h-full bg-[#FAF7F0] flex items-center justify-center text-[#696B64] text-sm">
            {TERMINAL_TRACKING_STATUSES.has(String(booking.status || "").toLowerCase())
              ? "Live tracking has ended for this trip."
              : "Map coordinates loading…"}
          </div>
        )}

        {/* Top Header Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <div className="flex items-center gap-2.5 bg-[#FAF7F0]/95 backdrop-blur-md px-4 py-2 rounded-[8px] border border-[#DED7CA] shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} animate-pulse`} />
            <span className="text-xs font-bold text-[#10251C] tracking-wide">{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* TRACKING SIDEBAR PANEL */}
      <div className="w-full lg:w-[420px] bg-[#F7F1E5] border-t lg:border-t-0 lg:border-l border-[#DED7CA] flex flex-col overflow-y-auto">
        
        {/* BRAND BANNER */}
        <div className="bg-[#FAF7F0] px-6 py-4 border-b border-[#DED7CA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logojatri.png"
              alt="Jaatri"
              width={120}
              height={38}
              className="h-8 w-auto object-contain dark-logo-invert dark:brightness-0 dark:invert dark:opacity-95"
              priority
            />
            <div>
              <p className="text-[10px] tracking-wider uppercase font-bold text-[#696B64]">Live Trip Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#E5EBDD] text-[#123D32] border border-[#123D32]/20 px-2.5 py-1 rounded-[8px] text-xs font-semibold">
            <ShieldCheck size={13} /> Secured
          </div>
        </div>

        <div className="p-6 space-y-4">
          
          {/* PANIC ALERT BANNER */}
          {booking.isPanicActive && (
            <div className="bg-[#E34222]/10 border-2 border-[#E34222] rounded-[12px] p-4 text-[#10251C] animate-pulse">
              <div className="flex items-center gap-2 text-[#E34222] font-bold text-sm mb-1">
                <Siren size={18} /> EMERGENCY SOS ACTIVATED
              </div>
              <p className="text-[#10251C] text-xs leading-relaxed">
                Passenger has triggered emergency safety alert on this trip. Dispatch safety guidelines in effect.
              </p>
            </div>
          )}

          {/* ETA / STATUS CARD */}
          <div className="bg-[#FAF7F0] border border-[#DED7CA] rounded-[12px] p-5 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[#696B64] text-[10px] uppercase tracking-widest font-semibold mb-1">Status</p>
              <h2 className="text-[#10251C] font-serif text-lg font-bold">{cfg.label}</h2>
              <p className="text-[#696B64] text-xs mt-0.5">{cfg.sublabel}</p>
            </div>
            {eta > 0 && ["confirmed", "started"].includes(status) && (
              <div className="text-right bg-[#E5EBDD] px-4 py-2 rounded-[8px] border border-[#123D32]/10">
                <p className="text-2xl font-black text-[#123D32] leading-none">{eta}</p>
                <p className="text-[10px] text-[#123D32]/80 uppercase tracking-wider font-semibold">min ETA</p>
              </div>
            )}
          </div>

          {/* DRIVER & VEHICLE INFO */}
          {booking.driver && (
            <div className="bg-[#FAF7F0] border border-[#DED7CA] rounded-[12px] p-4 flex items-center gap-3 shadow-xs">
              <div className="w-12 h-12 rounded-[10px] bg-[#123D32] text-[#F7F1E5] flex items-center justify-center flex-shrink-0">
                <User2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#696B64] text-[10px] uppercase tracking-wider font-semibold">Driver</p>
                <p className="text-[#10251C] font-bold text-sm truncate">{booking.driver.name}</p>
                {booking.vehicle && (
                  <p className="text-[#696B64] text-xs truncate mt-0.5">{booking.vehicle.vehicleModel}</p>
                )}
              </div>
              {booking.vehicle?.number && (
                <div className="flex-shrink-0 bg-white px-3 py-1.5 rounded-[8px] border border-[#DED7CA]">
                  <p className="text-[#10251C] text-xs font-black tracking-widest font-mono">{booking.vehicle.number}</p>
                </div>
              )}
            </div>
          )}

          {/* ROUTE CARD */}
          <div className="bg-[#FAF7F0] border border-[#DED7CA] rounded-[12px] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#DED7CA]/70 flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#123D32]" />
                <div className="w-px bg-[#DED7CA] flex-1 my-1" style={{ minHeight: 16 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#696B64] uppercase tracking-widest font-semibold mb-0.5">Pickup</p>
                <p className="text-xs text-[#10251C] font-medium leading-snug">{booking.pickupAddress || "—"}</p>
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <div className="flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E34222]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#696B64] uppercase tracking-widest font-semibold mb-0.5">Drop</p>
                <p className="text-xs text-[#10251C] font-medium leading-snug">{booking.dropAddress || "—"}</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
