"use client";

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
  const [timeLeft, setTimeLeft] = useState<number>(15);

  const fetchPendingBookings = async () => {
    try {
      const res = await axios.get("/api/partner/bookings/pending");
      const list = res.data.bookings || [];
      setBookings(list);
      if (list.length > 0 && !activeDispatch) {
        setActiveDispatch(list[0]);
        setTimeLeft(15);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
    const interval = setInterval(fetchPendingBookings, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on("new-booking", (booking: Booking) => {
      setBookings((prev) => [booking, ...prev]);
      setActiveDispatch(booking);
      setTimeLeft(15);
    });

    socket.on("booking-updated", (data: any) => {
      setBookings((prev) => prev.filter((b) => b._id !== data.bookingId));
      if (activeDispatch?._id === data.bookingId) {
        setActiveDispatch(null);
      }
    });

    return () => {
      socket.off("new-booking");
      socket.off("booking-updated");
    };
  }, [activeDispatch?._id]);

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
    <div className="min-h-screen bg-[#f4f5f7]">

      {/* Top Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-semibold text-gray-900">
            Ride Requests
          </h1>
          <p className="mt-3 text-gray-500 text-lg">
            Manage incoming ride requests and respond in real time.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-8 h-8 text-gray-700" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <p className="text-gray-500 text-lg">
              No pending ride requests.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition cursor-pointer select-none"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

                  {/* Left Info */}
                  <div className="flex-1 space-y-6">
                    <div className="flex gap-4">
                      <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-center">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-400 mb-1">
                          Pickup Location
                        </p>
                        <p className="text-gray-900 font-medium">
                          {booking.pickupAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-center">
                        <Navigation size={18} />
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-400 mb-1">
                          Drop Location
                        </p>
                        <p className="text-gray-900 font-medium">
                          {booking.dropAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                      <Clock size={14} className="opacity-70" />
                      <span className="font-medium">
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
                  <div className="flex flex-col justify-between lg:items-end gap-6 w-full lg:w-auto">
                    <div className="text-left lg:text-right">
                      <p className="text-xs tracking-wide text-gray-400 uppercase mb-1">
                        Estimated Fare
                      </p>
                      <div className="flex items-center gap-2 text-3xl font-bold text-gray-900 lg:justify-end">
                        <IndianRupee size={20} />
                        {booking.fare}
                      </div>
                    </div>

                    <div className="flex gap-4 w-full lg:w-auto">
                      <button
                        onClick={() => handleDeclineOrTimeout(booking._id)}
                        disabled={processingId === booking._id}
                        className="flex-1 lg:flex-none px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                      >
                        Decline
                      </button>

                      <button
                        onClick={() => handleAccept(booking._id)}
                        disabled={processingId === booking._id}
                        className="flex-1 lg:flex-none px-8 py-3 rounded-xl bg-black text-white text-sm font-semibold shadow-md hover:bg-gray-900 hover:shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                      >
                        {processingId === booking._id ? (
                          <Loader2 className="animate-spin w-5 h-5" />
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

      </div>

      {/* ⚡ HIGH-PRIORITY 15-SECOND DISPATCH OVERLAY */}
      <AnimatePresence>
        {activeDispatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-lg flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden"
            >
              {/* Top Banner */}
              <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Incoming Ride Offer</span>
                </div>
                {/* 15s Circular Countdown Ring */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-12 h-12 -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" className="text-zinc-800" fill="transparent" />
                    <circle
                      cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4"
                      className="text-emerald-400 transition-all duration-1000"
                      fill="transparent"
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 * (1 - timeLeft / 15)}
                    />
                  </svg>
                  <span className="absolute font-black text-sm text-white">{timeLeft}s</span>
                </div>
              </div>

              {/* Fare Banner */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-center mb-5">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-1">Estimated Fare</p>
                <div className="text-4xl font-black text-white flex items-center justify-center gap-1">
                  <IndianRupee size={28} /> {activeDispatch.fare}
                </div>
              </div>

              {/* Pickup & Drop Details */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pickup</p>
                    <p className="text-sm font-semibold text-zinc-200 leading-snug">{activeDispatch.pickupAddress}</p>
                  </div>
                </div>
                <div className="h-px bg-zinc-800 ml-11" />
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Navigation size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Drop</p>
                    <p className="text-sm font-semibold text-zinc-200 leading-snug">{activeDispatch.dropAddress}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeclineOrTimeout(activeDispatch._id)}
                  disabled={processingId === activeDispatch._id}
                  className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(activeDispatch._id)}
                  disabled={processingId === activeDispatch._id}
                  className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-xl text-sm font-bold transition active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === activeDispatch._id ? (
                    <Loader2 className="animate-spin w-5 h-5" />
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