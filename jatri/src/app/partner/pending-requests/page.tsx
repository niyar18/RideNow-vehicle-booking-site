"use client";



import { PartnerPageTitle, PartnerWorkspaceNav } from "@/features/partner/components/PartnerWorkspace";
import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Loader2,
  IndianRupee,
  Clock,
  Zap,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

type Booking = {
  _id: string;
  pickupAddress: string;
  dropAddress: string;
  fare: number;
  createdAt: string;
};

export default function VendorPendingPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeDispatch, setActiveDispatch] = useState<Booking | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(45);

  const fetchPendingBookings = async () => {
    try {
      const res = await axios.get("/api/partner/bookings/pending");
      const list = res.data.bookings || [];
      setBookings(list);
      if (list.length > 0 && !activeDispatch) {
        setActiveDispatch(list[0]);
        setTimeLeft(45);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
    const interval = setInterval(fetchPendingBookings, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleNewBooking = (booking: Booking) => {
      setBookings((prev) => [booking, ...prev]);
      setActiveDispatch(booking);
      setTimeLeft(45);
    };

    const handleBookingUpdated = (data: any) => {
      setBookings((prev) => prev.filter((b) => b._id !== data.bookingId));
      if (activeDispatch?._id === data.bookingId) {
        setActiveDispatch(null);
      }
    };

    socket.on("new-booking", handleNewBooking);
    socket.on("booking-updated", handleBookingUpdated);

    return () => {
      socket.off("new-booking", handleNewBooking);
      socket.off("booking-updated", handleBookingUpdated);
    };
  }, [activeDispatch?._id]);

  const handleDeclineOrTimeout = async (bookingId: string) => {
    try {
      setProcessingId(bookingId);
      await axios.post("/api/partner/bookings/dispatch-next", { bookingId });
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
      setActiveDispatch(null);
    } catch (err) {
      console.error("Escalation error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    if (!activeDispatch) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDeclineOrTimeout(activeDispatch._id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeDispatch]);

  const handleAccept = async (bookingId: string) => {
    try {
      setProcessingId(bookingId);
      await axios.post(`/api/booking/${bookingId}/accept`);
      router.push("/partner/active-ride");
    } catch (err) {
      alert("Accept failed");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <PartnerWorkspaceNav current="requests" />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
        <PartnerPageTitle label="Driver workspace" title="Ride requests" description="Review the pickup, drop-off and fare before accepting an offer." />
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-8 h-8 text-[var(--accent-ink)]" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-[var(--surface-raised)] rounded-[14px] border border-[var(--border-default)] p-8 sm:p-16 text-center ">
            <h2 className="text-lg font-semibold">No requests right now</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">New offers will appear here while you are online.</p>
          </div>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2">
            {bookings.map((booking) => (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="only:col-span-full bg-[var(--surface-raised)] rounded-[14px] border border-[var(--border-default)] p-4 sm:p-6 transition cursor-pointer select-none"
              >
                <div className="flex h-full flex-col justify-between gap-5">

                  {/* Left Info */}
                  <div className="flex-1 space-y-4 sm:space-y-6">
                    <div className="flex gap-3 sm:gap-4">
                      <div className="bg-[var(--surface-subtle)] p-2.5 sm:p-3 rounded-[8px] flex items-center justify-center shrink-0 border border-[var(--border-default)]">
                        <MapPin size={18} className="text-[var(--accent-ink)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase text-[var(--accent-ink)] mb-0.5 sm:mb-1 font-bold tracking-wider">
                          Pickup Location
                        </p>
                        <p className="text-[var(--text-primary)] font-semibold text-xs sm:text-base leading-snug">
                          {booking.pickupAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 sm:gap-4">
                      <div className="bg-[#992f22]/10 dark:bg-[#ffab9c]/20 p-2.5 sm:p-3 rounded-[8px] flex items-center justify-center shrink-0 border border-[#992f22]/20 dark:border-[#ffab9c]/30">
                        <Navigation size={18} className="text-[#992f22] dark:text-[#ffab9c]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase text-[#992f22] dark:text-[#ffab9c] mb-0.5 sm:mb-1 font-bold tracking-wider">
                          Drop Location
                        </p>
                        <p className="text-[var(--text-primary)] font-semibold text-xs sm:text-base leading-snug">
                          {booking.dropAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-secondary)] mt-2 font-medium">
                      <Clock size={14} className="opacity-70 shrink-0 text-[var(--text-secondary)]" />
                      <span>
                        {new Date(booking.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Right Side */}
                  <div className="flex flex-col justify-between lg:items-end gap-4 sm:gap-6 w-full lg:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--border-default)]">
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] sm:text-xs tracking-wider text-[var(--text-secondary)] uppercase mb-0.5 sm:mb-1 font-bold">
                        Estimated Fare
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-2xl sm:text-3xl font-bold text-[var(--text-primary)] lg:justify-end">
                        <IndianRupee size={20} className="text-[var(--accent-ink)]" />
                        {booking.fare}
                      </div>
                    </div>

                    <div className="flex gap-3 w-full lg:w-auto">
                      <button
                        onClick={() => handleDeclineOrTimeout(booking._id)}
                        disabled={processingId === booking._id}
                        className="flex-1 lg:flex-none px-4 sm:px-6 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs sm:text-sm font-semibold hover:bg-[#e4eeeb] dark:hover:bg-[#2b4160] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                      >
                        Decline
                      </button>

                      <button
                        onClick={() => handleAccept(booking._id)}
                        disabled={processingId === booking._id}
                        className="flex-1 lg:flex-none px-5 sm:px-8 py-2.5 rounded-[8px] bg-[var(--action-bg)] hover:opacity-90 text-[var(--action-fg)] text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {processingId === booking._id ? (
                          <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        ) : (
                          "Accept Ride"
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        )}

      </main>

      {/* ⚡ HIGH-PRIORITY 45-SECOND DISPATCH OVERLAY */}
      <AnimatePresence>
        {activeDispatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              role="dialog"
              aria-labelledby="driver-offer-title"
              className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 text-[var(--text-primary)] sm:p-6"
            >
              {/* Top Banner */}
              <div className="flex items-center justify-between mb-6 border-b border-[var(--border-default)] pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--midnight)] dark:bg-[var(--accent-mint)] motion-safe:animate-ping" />
                  <h2 id="driver-offer-title" className="text-base font-semibold">Incoming ride offer</h2>
                </div>
                {/* 45s Circular Countdown Ring */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-12 h-12 -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" className="text-[#b8c7ca] dark:text-[#374d62]" fill="transparent" />
                    <circle
                      cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4"
                      className="text-[var(--accent-ink)] transition-all duration-1000"
                      fill="transparent"
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 * (1 - timeLeft / 45)}
                    />
                  </svg>
                  <span className="absolute font-bold text-sm text-[var(--text-primary)]">{timeLeft}s</span>
                </div>
              </div>

              {/* Fare Banner */}
              <div className="bg-[var(--background)] border border-[var(--border-default)] rounded-[12px] p-5 text-center mb-5">
                <p className="text-[var(--text-secondary)] text-[10px] font-bold mb-1">Estimated Fare</p>
                <div className="text-4xl font-bold text-[var(--text-primary)] flex items-center justify-center gap-1 font-sans">
                  <IndianRupee size={28} className="text-[var(--accent-ink)]" /> {activeDispatch.fare}
                </div>
              </div>

              {/* Pickup & Drop Details */}
              <div className="bg-[var(--background)] border border-[var(--border-default)] rounded-[12px] p-4 space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[var(--surface-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--border-default)]">
                    <MapPin size={16} className="text-[var(--accent-ink)]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--accent-ink)] ">Pickup</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{activeDispatch.pickupAddress}</p>
                  </div>
                </div>
                <div className="h-px bg-[#b8c7ca] dark:bg-[#374d62] ml-11" />
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[#992f22]/10 dark:bg-[#ffab9c]/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#992f22]/20 dark:border-[#ffab9c]/30">
                    <Navigation size={16} className="text-[#992f22] dark:text-[#ffab9c]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#992f22] dark:text-[#ffab9c] ">Drop</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{activeDispatch.dropAddress}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeclineOrTimeout(activeDispatch._id)}
                  disabled={processingId === activeDispatch._id}
                  className="flex-1 py-3 bg-[var(--surface-subtle)] hover:bg-[#e4eeeb] dark:hover:bg-[#2b4160] border border-[var(--border-default)] text-[var(--text-primary)] rounded-[8px] text-sm font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(activeDispatch._id)}
                  disabled={processingId === activeDispatch._id}
                  className="flex-1 py-3 bg-[var(--action-bg)] hover:opacity-90 text-[var(--action-fg)] rounded-[8px] text-sm font-bold transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {processingId === activeDispatch._id ? (
                    <Loader2 className="animate-spin w-5 h-5 text-white" />
                  ) : (
                    <>
                      <Zap size={16} /> Accept ({timeLeft}s)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}