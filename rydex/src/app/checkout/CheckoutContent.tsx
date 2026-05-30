"use client";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, ShieldCheck,
  Bike, Car, Truck, Loader2, CheckCircle2,
  XCircle, Clock, CreditCard, Banknote,
  ArrowRight, RotateCcw, AlertCircle, Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";

const VEHICLE_ICONS: Record<string, any> = {
  bike: Bike, auto: Car, car: Car, loading: Truck, truck: Truck,
};

type Status =
  | "idle" | "requested" | "awaiting_payment"
  | "rejected" | "expired" | "cancelled"
  | "payment" | "confirmed";

export default function CheckoutContent() {
  const params = useSearchParams();

  const pickup    = params.get("pickup")    || "Pickup Location";
  const drop      = params.get("drop")      || "Drop Location";
  const vehicle   = params.get("vehicle")   || "car";
  const vehicleId = params.get("vehicleId");
  const fare      = Number(params.get("fare")) || 249;
  const mobileNumber = params.get("mobileNumber") || "";
  const driverId  = params.get("driverId");
  const pickupLat = Number(params.get("pickupLat"));
  const pickupLng = Number(params.get("pickupLng"));
  const dropLat   = Number(params.get("dropLat"));
  const dropLng   = Number(params.get("dropLng"));

  const VehicleIcon = VEHICLE_ICONS[vehicle.toLowerCase()] || Car;

  const [loading,       setLoading]       = useState(false);
  const [bookingId,     setBookingId]     = useState<string | null>(null);
  const [status,        setStatus]        = useState<Status>("idle");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online" | null>(null);

  /* ── CREATE BOOKING ── */
  const handleCreateBooking = async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/booking/create", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          pickup, drop, vehicle, vehicleId, fare, mobileNumber, driverId,
          pickupLat, pickupLng, dropLat, dropLng
        })
      });

      const data = await res.json();

      if(data.success){
        setBookingId(data.bookingId);
        setStatus("requested");
      }

    } catch(err){
      console.error(err);
      alert("Booking failed");
    } finally{
      setLoading(false);
    }
  };

  /* ── PAYMENT CONFIRM ── */
  const handlePaymentConfirm = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);

      if (paymentMethod === "cash") {
        const res = await fetch(`/api/booking/${bookingId}/confirm-payment`,{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ method:"cash" })
        });

        const data = await res.json();

        if(data.success){
          window.location.href = `/ride/${bookingId}`;
        }

        return;
      }

      /* LOAD RAZORPAY SCRIPT */

      const razorpayLoaded = await loadRazorpayScript();

      if (!razorpayLoaded) {
        alert("Razorpay SDK failed to load");
        return;
      }

      /* CREATE ORDER */

      const orderRes = await fetch("/api/payment/create",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ bookingId })
      });

      const orderData = await orderRes.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: orderData.amount,
        currency: "INR",
        name: "RideNow",
        description: "Ride Payment",
        order_id: orderData.orderId,

        handler: async function (response:any) {

          const verify = await fetch("/api/payment/verify",{
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify({
              bookingId,
              ...response
            })
          });

          const verifyData = await verify.json();

          if(verifyData.success){
            window.location.href = `/ride/${bookingId}`;
          }

        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    }

    catch(err){
      console.error(err);
      alert("Payment failed");
    }

    finally{
      setLoading(false);
    }
  };

  /* ── CANCEL ── */
  const handleCancelBooking = async () => {
    if (!bookingId) return;
    await fetch(`/api/booking/${bookingId}/cancel`, { method: "POST" });
    setStatus("cancelled");
  };

  /* ── SOCKET ── */
  useEffect(() => {
    const socket = getSocket();
    socket.on("booking-updated", (data) => {
      if (data.status === "awaiting_payment") setStatus("awaiting_payment");
      if (data.status === "rejected")         setStatus("rejected");
      if (data.status === "confirmed")        setStatus("confirmed");
    });
    return () => { socket.off("booking-updated"); };
  }, []);

  /* ── RESTORE ── */
  useEffect(() => {
    (async () => {
      const res  = await fetch("/api/booking/my-active");
      const data = await res.json();
      if (data.booking) { setBookingId(data.booking._id); setStatus(data.booking.status); }
    })();
  }, []);

  /* ── awaiting_payment → payment after 2s ── */
  useEffect(() => {
    if (status !== "awaiting_payment") return;
    const t = setTimeout(() => setStatus("payment"), 2000);
    return () => clearTimeout(t);
  }, [status]);

  /* ── label ── */
  const vehicleLabel = vehicle.charAt(0).toUpperCase() + vehicle.slice(1);

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-12">

      {/* subtle dot grid */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.45 }}
      />

      <div className="relative max-w-6xl mx-auto z-10">

        {/* ── PAGE HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-zinc-900" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Booking</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Checkout</h1>
          <p className="text-zinc-400 text-sm mt-1.5 font-medium">Review your ride and confirm</p>
        </motion.div>

        {/* ── GRID ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ══ LEFT — RIDE DETAILS ══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)]"
          >
            {/* Top bar */}
            <div className="h-1 bg-zinc-900" />

            <div className="p-8 sm:p-10">
              {/* Vehicle row */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Selected Vehicle</p>
                  <h2 className="text-3xl font-black tracking-tight text-zinc-900">{vehicleLabel}</h2>
                </div>
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
                  <VehicleIcon size={28} className="text-white" />
                </div>
              </div>

              {/* Route */}
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden mb-8">
                <div className="flex gap-4 px-5 py-4 border-b border-zinc-100">
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <div className="w-3 h-3 rounded-full bg-zinc-900 border-2 border-white ring-1 ring-zinc-300" />
                    <div className="w-px flex-1 bg-zinc-300 my-1" style={{ minHeight: 12 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-0.5">Pickup</p>
                    <p className="text-sm font-semibold text-zinc-900 leading-snug truncate">{pickup}</p>
                  </div>
                  <MapPin size={14} className="text-zinc-400 flex-shrink-0 mt-1" />
                </div>
                <div className="flex gap-4 px-5 py-4">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="w-3 h-3 rounded-sm bg-zinc-900 border-2 border-white ring-1 ring-zinc-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-0.5">Drop</p>
                    <p className="text-sm font-semibold text-zinc-900 leading-snug truncate">{drop}</p>
                  </div>
                  <Navigation size={14} className="text-zinc-400 flex-shrink-0 mt-1" />
                </div>
              </div>

              {/* Fare */}
              <div className="flex items-end justify-between pt-6 border-t border-zinc-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Total Fare</p>
                  <p className="text-zinc-400 text-xs font-medium">Includes base + distance charges</p>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="flex items-baseline gap-1"
                >
                  <span className="text-zinc-400 text-lg font-black">₹</span>
                  <span className="text-zinc-900 text-5xl font-black tracking-tight leading-none">{fare}</span>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ══ RIGHT — STATUS PANEL ══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)] flex flex-col"
          >
            <div className="h-1 bg-zinc-900" />

            <div className="flex-1 p-8 sm:p-10 flex flex-col">
              <AnimatePresence mode="wait">

                {/* ── IDLE ── */}
                {status === "idle" && (
                  <motion.div key="idle"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Ready to go?</p>
                      <h3 className="text-2xl font-black text-zinc-900 mb-6">Confirm Your Ride</h3>
                      <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 space-y-3">
                        {[
                          { icon: <Clock size={14} />, text: "Driver will respond within 2 minutes" },
                          { icon: <ShieldCheck size={14} />, text: "Verified & insured drivers only" },
                          { icon: <CreditCard size={14} />, text: "Pay after driver accepts" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-zinc-200 flex items-center justify-center text-zinc-600 flex-shrink-0">{item.icon}</div>
                            <p className="text-zinc-500 text-xs font-medium">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={handleCreateBooking}
                      disabled={loading}
                      className="w-full h-14 mt-8 bg-zinc-900 hover:bg-black disabled:opacity-40 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-colors shadow-md"
                    >
                      {loading ? (
                        <><Loader2 size={17} className="animate-spin" /> Requesting…</>
                      ) : (
                        <><span>Request Ride</span><ArrowRight size={17} /></>
                      )}
                    </motion.button>
                  </motion.div>
                )}

                {/* ── REQUESTED ── */}
                {status === "requested" && (
                  <motion.div key="requested"
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col flex-1 items-center justify-center gap-6 text-center"
                  >
                    {/* Pulsing ring */}
                    <div className="relative">
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-zinc-900"
                      />
                      <div className="relative w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                        <Loader2 size={28} className="text-zinc-900 animate-spin" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Finding Your Driver</h3>
                      <p className="text-zinc-400 text-sm font-medium">Waiting for driver to accept…</p>
                    </div>
                    {/* Animated dots */}
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                          className="w-2 h-2 rounded-full bg-zinc-400"
                        />
                      ))}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCancelBooking}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors border border-zinc-200 hover:border-zinc-400 px-4 py-2.5 rounded-xl"
                    >
                      <XCircle size={13} /> Cancel Request
                    </motion.button>
                  </motion.div>
                )}

                {/* ── AWAITING PAYMENT ── */}
                {status === "awaiting_payment" && (
                  <motion.div key="awaiting_payment"
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 16 }}
                      className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center"
                    >
                      <CheckCircle2 size={36} className="text-zinc-900" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Driver Accepted!</h3>
                      <p className="text-zinc-400 text-sm font-medium">Preparing payment options…</p>
                    </div>
                    <div className="w-48 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: "100%" }}
                        transition={{ duration: 2 }}
                        className="h-full bg-zinc-900 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}

                {/* ── PAYMENT ── */}
                {status === "payment" && (
                  <motion.div key="payment"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 gap-6"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Almost there</p>
                      <h3 className="text-2xl font-black text-zinc-900">Select Payment</h3>
                    </div>

                    <div className="space-y-3">
                      {[
                        { id: "cash",   Icon: Banknote,    title: "Cash",           sub: "Pay driver after ride" },
                        { id: "online", Icon: Wallet,      title: "Online Payment",  sub: "UPI · Card · Netbanking" },
                      ].map(({ id, Icon, title, sub }) => {
                        const active = paymentMethod === id;
                        return (
                          <motion.button
                            key={id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setPaymentMethod(id as any)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                              active ? "bg-zinc-900 border-zinc-900" : "bg-zinc-50 border-zinc-200 hover:border-zinc-400"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                              active ? "bg-white/10" : "bg-zinc-200"
                            }`}>
                              <Icon size={18} className={active ? "text-white" : "text-zinc-600"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${active ? "text-white" : "text-zinc-900"}`}>{title}</p>
                              <p className={`text-xs font-medium ${active ? "text-zinc-400" : "text-zinc-400"}`}>{sub}</p>
                            </div>
                            <AnimatePresence>
                              {active && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                  <CheckCircle2 size={16} className="text-white flex-shrink-0" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      whileHover={paymentMethod ? { scale: 1.02 } : {}}
                      disabled={!paymentMethod || loading}
                      onClick={handlePaymentConfirm}
                      className="w-full h-14 bg-zinc-900 hover:bg-black disabled:opacity-30 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-colors shadow-md mt-auto"
                    >
                      {loading
                        ? <Loader2 size={17} className="animate-spin" />
                        : paymentMethod === "cash"
                        ? <><Banknote size={16} /><span>Confirm Cash Ride</span></>
                        : paymentMethod === "online"
                        ? <><span>Proceed to Payment</span><ArrowRight size={16} /></>
                        : <span>Select a Method</span>
                      }
                    </motion.button>
                  </motion.div>
                )}

                {/* ── CONFIRMED ── */}
                {status === "confirmed" && (
                  <motion.div key="confirmed"
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col flex-1 items-center justify-center gap-6 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.1 }}
                      className="relative"
                    >
                      <div className="w-24 h-24 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                        <CheckCircle2 size={44} className="text-zinc-900" />
                      </div>
                      {/* Confetti rings */}
                      {[0, 1].map(i => (
                        <motion.div key={i}
                          initial={{ scale: 1, opacity: 0.5 }}
                          animate={{ scale: 2.2 + i * 0.6, opacity: 0 }}
                          transition={{ duration: 0.9, delay: 0.2 + i * 0.15 }}
                          className="absolute inset-0 rounded-full border-2 border-zinc-900"
                        />
                      ))}
                    </motion.div>
                    <div>
                      <motion.h3
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="text-2xl font-black text-zinc-900 mb-1"
                      >Ride Confirmed!</motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                        className="text-zinc-400 text-sm font-medium max-w-xs"
                      >Your driver is on the way. Track live from the ride screen.</motion.p>
                    </div>
                    <motion.button
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                      whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.03 }}
                      onClick={() => { window.location.href = `/ride/${bookingId}`; }}
                      className="flex items-center gap-2.5 bg-zinc-900 hover:bg-black text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors shadow-md"
                    >
                      Track Your Ride <ArrowRight size={16} />
                    </motion.button>
                  </motion.div>
                )}

                {/* ── CANCELLED ── */}
                {status === "cancelled" && (
                  <motion.div key="cancelled"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                      <XCircle size={34} className="text-zinc-900" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Booking Cancelled</h3>
                      <p className="text-zinc-400 text-sm font-medium">Your request has been cancelled successfully.</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="flex items-center gap-2 bg-zinc-900 text-white font-black text-sm px-6 py-3.5 rounded-2xl hover:bg-black transition-colors"
                    >
                      <RotateCcw size={14} /> Book Again
                    </motion.button>
                  </motion.div>
                )}

                {/* ── REJECTED ── */}
                {status === "rejected" && (
                  <motion.div key="rejected"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                      <XCircle size={34} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Request Rejected</h3>
                      <p className="text-zinc-400 text-sm font-medium">Driver declined this booking. Try another driver.</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="flex items-center gap-2 bg-zinc-900 text-white font-black text-sm px-6 py-3.5 rounded-2xl hover:bg-black transition-colors"
                    >
                      <RotateCcw size={14} /> Try Again
                    </motion.button>
                  </motion.div>
                )}

                {/* ── EXPIRED ── */}
                {status === "expired" && (
                  <motion.div key="expired"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                      <AlertCircle size={34} className="text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Request Timed Out</h3>
                      <p className="text-zinc-400 text-sm font-medium">No response from driver. Please try again.</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="flex items-center gap-2 bg-zinc-900 text-white font-black text-sm px-6 py-3.5 rounded-2xl hover:bg-black transition-colors"
                    >
                      <RotateCcw size={14} /> Try Again
                    </motion.button>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Footer trust badge */}
              <div className="flex items-center justify-center gap-2 pt-6 mt-auto border-t border-zinc-100">
                <ShieldCheck size={13} className="text-zinc-400" />
                <span className="text-zinc-400 text-[10px] font-semibold tracking-wide uppercase">Secure & Verified Booking</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ── RAZORPAY SCRIPT LOADER ── */
const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};