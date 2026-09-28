"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Car, User2, Clock, Zap, IndianRupee,
  ShieldCheck, AlertCircle, Share2, CheckCircle2, Siren
} from "lucide-react";
import { getSocket } from "@/lib/socket";

const LiveRideMap = dynamic(() => import("@/components/LiveTrackingMap"), { ssr: false });

type BookingStatus =
  | "requested" | "awaiting_payment" | "confirmed"
  | "started"   | "completed"        | "cancelled"
  | "rejected"  | "expired";

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
      const res = await fetch(`/api/track/${token}`);
      if (!res.ok) throw new Error("Trip not found or invalid link");
      const data = await res.json();
      if (data.success && data.booking) {
        const b = data.booking;
        setBooking(b);
        if (b.pickupLocation?.coordinates) {
          setPickupPos([b.pickupLocation.coordinates[1], b.pickupLocation.coordinates[0]]);
        }
        if (b.dropLocation?.coordinates) {
          setDropPos([b.dropLocation.coordinates[1], b.dropLocation.coordinates[0]]);
        }
        if (b.driver?.location?.coordinates) {
          setDriverPos([b.driver.location.coordinates[1], b.driver.location.coordinates[0]]);
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
    fetchPublicTrip();
    const interval = setInterval(() => fetchPublicTrip(true), 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!booking?._id) return;
    const socket = getSocket();
    socket.emit("join-booking", booking._id);
    socket.on("driver-location", (data: any) => setDriverPos([data.latitude, data.longitude]));
    socket.on("booking-updated", (data: any) => {
      setBooking((prev: any) => prev ? { ...prev, ...data } : null);
    });
    return () => {
      socket.off("driver-location");
      socket.off("booking-updated");
    };
  }, [booking?._id]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/40 text-xs tracking-widest uppercase font-semibold">Loading Live Trip…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <AlertCircle size={44} className="text-red-400" />
          <h2 className="text-white font-bold text-lg">Unable to Track Trip</h2>
          <p className="text-zinc-400 text-xs leading-relaxed">{error || "This tracking link may be invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const status: BookingStatus = booking.status || "requested";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.requested;
  const mapStatus = status === "started" ? "ongoing" : status === "completed" ? "completed" : "arriving";

  return (
    <div className="h-screen w-full bg-zinc-900 text-white flex flex-col lg:flex-row overflow-hidden">
      
      {/* MAP */}
      <div className="relative flex-1 h-full z-0">
        {pickupPos && dropPos ? (
          <LiveRideMap
            driverLocation={driverPos}
            pickupLocation={pickupPos}
            dropLocation={dropPos}
            status={mapStatus}
            onStats={({ durationToPickup, durationToDrop }) => {
              setEta(Math.round(mapStatus === "arriving" ? durationToPickup : durationToDrop));
            }}
          />
        ) : (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
            Map coordinates loading…
          </div>
        )}

        {/* Top Header Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <div className="flex items-center gap-2.5 bg-zinc-950/90 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 shadow-xl">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} animate-pulse`} />
            <span className="text-xs font-bold text-white tracking-wide">{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* TRACKING SIDEBAR PANEL */}
      <div className="w-full lg:w-[420px] bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col overflow-y-auto">
        
        {/* BRAND BANNER */}
        <div className="bg-zinc-900 px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-black text-sm">
              RN
            </div>
            <div>
              <h1 className="text-white font-black text-base leading-tight">RideNow Security Track</h1>
              <p className="text-zinc-400 text-[10px] tracking-wider uppercase font-semibold">Shared Live Trip</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
            <ShieldCheck size={13} /> Live Secured
          </div>
        </div>

        <div className="p-6 space-y-4">
          
          {/* PANIC ALERT BANNER */}
          {booking.isPanicActive && (
            <div className="bg-red-950 border-2 border-red-600 rounded-2xl p-4 text-white animate-pulse">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-1">
                <Siren size={18} /> EMERGENCY SOS ACTIVATED
              </div>
              <p className="text-red-200 text-xs leading-relaxed">
                Passenger has triggered emergency safety alert on this trip. Dispatch safety guidelines in effect.
              </p>
            </div>
          )}

          {/* ETA / STATUS CARD */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-1">Status</p>
              <h2 className="text-white text-lg font-bold">{cfg.label}</h2>
              <p className="text-zinc-400 text-xs mt-0.5">{cfg.sublabel}</p>
            </div>
            {eta > 0 && ["confirmed", "started"].includes(status) && (
              <div className="text-right bg-zinc-800 px-4 py-2 rounded-xl">
                <p className="text-2xl font-black text-white leading-none">{eta}</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">min ETA</p>
              </div>
            )}
          </div>

          {/* DRIVER & VEHICLE INFO */}
          {booking.driver && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <User2 size={24} className="text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Driver</p>
                <p className="text-white font-bold text-sm truncate">{booking.driver.name}</p>
                {booking.vehicle && (
                  <p className="text-zinc-400 text-xs truncate mt-0.5">{booking.vehicle.vehicleModel}</p>
                )}
              </div>
              {booking.vehicle?.number && (
                <div className="flex-shrink-0 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">
                  <p className="text-white text-xs font-black tracking-widest font-mono">{booking.vehicle.number}</p>
                </div>
              )}
            </div>
          )}

          {/* ROUTE CARD */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                <div className="w-px bg-zinc-700 flex-1 my-1" style={{ minHeight: 16 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-0.5">Pickup</p>
                <p className="text-xs text-zinc-300 leading-snug">{booking.pickupAddress || "—"}</p>
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <div className="flex-shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-0.5">Drop</p>
                <p className="text-xs text-zinc-300 leading-snug">{booking.dropAddress || "—"}</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
