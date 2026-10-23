"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, ArrowRight, User, Car, Clock, ShieldCheck } from "lucide-react";
import { getSocket } from "@/lib/socket";

interface ActiveRideBannerProps {
  variant?: "floating" | "inline";
  onActiveRideFound?: (booking: any) => void;
}

export default function ActiveRideBanner({
  variant = "floating",
  onActiveRideFound,
}: ActiveRideBannerProps) {
  const { data: session, status: authStatus } = useSession();
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveRide = useCallback(async () => {
    if (!session?.user?.id) {
      setActiveBooking(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/booking/my-active");
      const data = await res.json();
      if (data?.booking) {
        setActiveBooking(data.booking);
        onActiveRideFound?.(data.booking);
      } else {
        setActiveBooking(null);
        onActiveRideFound?.(null);
      }
    } catch {
      setActiveBooking(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, onActiveRideFound]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session?.user?.id) {
      setLoading(false);
      setActiveBooking(null);
      return;
    }

    fetchActiveRide();

    const socket = getSocket();
    const handleUpdate = (data: any) => {
      if (data?.status === "completed" || data?.status === "cancelled") {
        setActiveBooking(null);
        onActiveRideFound?.(null);
      } else {
        fetchActiveRide();
      }
    };

    socket.on("booking-updated", handleUpdate);
    socket.on("auto-rematch-started", fetchActiveRide);
    socket.on("auto-rematch-success", fetchActiveRide);

    // Light poll every 12 seconds as a fallback
    const interval = setInterval(fetchActiveRide, 12000);

    return () => {
      socket.off("booking-updated", handleUpdate);
      socket.off("auto-rematch-started", fetchActiveRide);
      socket.off("auto-rematch-success", fetchActiveRide);
      clearInterval(interval);
    };
  }, [authStatus, session?.user?.id, fetchActiveRide]);

  if (loading || !activeBooking) return null;

  const status = activeBooking.status;
  const isTerminal = ["completed", "cancelled", "rejected", "expired"].includes(status);
  if (isTerminal) return null;

  const targetUrl =
    status === "payment"
      ? "/checkout"
      : status === "requested"
      ? "/checkout"
      : `/ride/${activeBooking._id}`;

  const statusLabel =
    status === "started"
      ? "Trip in Progress"
      : status === "confirmed"
      ? "Driver Assigned & Arriving"
      : status === "awaiting_payment" || status === "payment"
      ? "Payment Pending"
      : status === "auto_rematching"
      ? "Re-matching Driver"
      : "Connecting Driver...";

  const pulseColor =
    status === "started"
      ? "bg-blue-500"
      : status === "confirmed"
      ? "bg-emerald-500"
      : "bg-amber-500";

  if (variant === "inline") {
    return (
      <div className="bg-[#FAF7F0] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[14px] p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${pulseColor}`} />
            </span>
            <div>
              <p className="text-xs font-black text-[#10251C] dark:text-[#F3F1E8] uppercase tracking-wider">
                {statusLabel}
              </p>
              <p className="text-[11px] text-[#696B64] dark:text-[#929D93] font-medium truncate max-w-[220px] sm:max-w-md mt-0.5">
                To: {activeBooking.dropAddress || "Destination"}
              </p>
            </div>
          </div>
          <Link
            href={targetUrl}
            className="min-h-[44px] flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] text-white text-xs font-bold transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
          >
            <span>Resume Ride</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  // Floating variant (for landing page or global overlay)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-5 right-3 left-3 sm:right-5 sm:left-auto sm:w-96 z-50"
      >
        <div className="bg-[#FAF7F0]/95 dark:bg-[#17211B]/95 text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] rounded-[16px] p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${pulseColor}`} />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8]">
                {statusLabel}
              </span>
            </div>
            <span className="text-[10px] text-[#696B64] dark:text-[#929D93] font-bold">
              Ride #{activeBooking._id.slice(-5)}
            </span>
          </div>

          <div className="text-xs text-[#10251C] dark:text-[#F3F1E8] mb-3 space-y-1">
            <p className="truncate font-semibold">
              📍 {activeBooking.pickupAddress?.split(",")[0]} → {activeBooking.dropAddress?.split(",")[0]}
            </p>
            {activeBooking.driver?.name && (
              <p className="text-[11px] text-[#696B64] dark:text-[#929D93]">
                Driver: <span className="text-[#10251C] dark:text-[#F3F1E8] font-bold">{activeBooking.driver.name}</span>
                {activeBooking.vehicle?.number && ` (${activeBooking.vehicle.number})`}
              </p>
            )}
          </div>

          <Link
            href={targetUrl}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] text-white rounded-[8px] font-bold text-xs transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
          >
            <span>Track Live Ride</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
