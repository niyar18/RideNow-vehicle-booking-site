"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  MapPin,
  Navigation,
  Loader2,
  IndianRupee,
  Clock,
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
   const router=useRouter()
  const fetchPendingBookings = async () => {
    try {
      const res = await axios.get("/api/partner/bookings/pending");
      setBookings(res.data.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
  }, []);
useEffect(() => {
  const socket = getSocket();



  socket.on("new-booking", (booking) => {
    setBookings((prev) => [booking, ...prev]);
  });

  socket.on("booking-updated", (data) => {
    setBookings((prev) =>
      prev.filter((b) => b._id !== data.bookingId)
    );
  });

  return () => {
    socket.off("new-booking");
    socket.off("booking-updated");
  };
}, []);
  const handleAction = async (
    bookingId: string,
    action: "accept" | "reject"
  ) => {
    try {
      setProcessingId(bookingId);
      await axios.post(`/api/booking/${bookingId}/${action}`);
      fetchPendingBookings();
      router.push("/partner/bookings")
    } catch {
      alert("Action failed");
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
                className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition"
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
                {/* Right Side */}
<div className="flex flex-col justify-between lg:items-end gap-6 w-full lg:w-auto">

  {/* Fare */}
  <div className="text-left lg:text-right">
    <p className="text-xs tracking-wide text-gray-400 uppercase mb-1">
      Estimated Fare
    </p>

    <div className="flex items-center gap-2 text-3xl font-bold text-gray-900 lg:justify-end">
      <IndianRupee size={20} />
      {booking.fare}
    </div>
  </div>

  {/* Buttons */}
  <div className="flex gap-4 w-full lg:w-auto">

    {/* Reject */}
    <button
      onClick={() =>
        handleAction(booking._id, "reject")
      }
      disabled={processingId === booking._id}
      className="
        flex-1 lg:flex-none
        px-6 py-3
        rounded-xl
        border border-gray-300
        bg-white
        text-gray-700
        text-sm font-semibold
        hover:bg-gray-100
        transition-all duration-200
        active:scale-[0.98]
        disabled:opacity-50
      "
    >
      Reject
    </button>

    {/* Accept */}
    <button
      onClick={() =>
        handleAction(booking._id, "accept")
      }
      disabled={processingId === booking._id}
      className="
        flex-1 lg:flex-none
        px-8 py-3
        rounded-xl
        bg-black
        text-white
        text-sm font-semibold
        shadow-md
        hover:bg-gray-900
        hover:shadow-lg
        transition-all duration-200
        active:scale-[0.98]
        disabled:opacity-50
        flex items-center justify-center
      "
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
    </div>
  );
}