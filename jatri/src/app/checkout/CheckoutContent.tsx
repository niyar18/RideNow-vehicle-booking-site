"use client";
import { Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, ShieldCheck,
  Bike, Car, Truck, Loader2, CheckCircle2,
  XCircle, Clock, CreditCard, Banknote,
  ArrowRight, ArrowLeft, RotateCcw, AlertCircle, Wallet,
  Users, UserPlus, Share2, IndianRupee
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import useGetMe from "@/shared/hooks/useGetMe";
import AuthModal from "@/features/auth/components/AuthModal";
import { getSocket } from "@/lib/socket";
import { calculateFareBreakdown } from "@/lib/fareEngine";
import GroupRideCard from "@/features/booking/components/GroupRideCard";
import DriverSearchRadar from "@/features/booking/components/DriverSearchRadar";
import PaymentMethodSelector from "@/features/booking/components/PaymentMethodSelector";

const VEHICLE_ICONS: Record<string, any> = {
  bike: Bike, auto: Car, car: Car, loading: Truck, truck: Truck,
};

type Status =
  | "idle" | "requested" | "awaiting_payment"
  | "rejected" | "expired" | "cancelled"
  | "payment" | "confirmed" | "auto_rematching";

export default function CheckoutContent() {
  const { userData } = useSelector((state: RootState) => state.user);
  useGetMe(true);

  const params = useSearchParams();

  // Query parameter fallbacks (backwards-compatible)
  const pickupParam    = params.get("pickup")    || "Pickup Location";
  const dropParam      = params.get("drop")      || "Drop Location";
  const vehicleParam   = params.get("vehicle")   || "car";
  const vehicleIdParam = params.get("vehicleId") || undefined;
  const fareParam      = Number(params.get("fare")) || 249;
  const mobileParam    = params.get("mobileNumber") || "";
  const driverIdParam  = params.get("driverId")  || undefined;
  const pickupLatParam = params.get("pickupLat") ? Number(params.get("pickupLat")) : null;
  const pickupLngParam = params.get("pickupLng") ? Number(params.get("pickupLng")) : null;
  const dropLatParam   = params.get("dropLat") ? Number(params.get("dropLat")) : null;
  const dropLngParam   = params.get("dropLng") ? Number(params.get("dropLng")) : null;
  const isSmartPickupParam = params.get("isSmartPickup") === "true";
  const smartPickupDetailsParam = params.get("smartPickupDetails");
  const stopsParam = params.get("stops");
  const isFamilyRideParam = params.get("isFamilyRide") === "true";
  const familyMemberParam = params.get("familyMember");
  const isScheduledParam = params.get("isScheduled") === "true";
  const scheduledTimeParam = params.get("scheduledTime");

  const [pickup,       setPickup]       = useState(pickupParam);
  const [drop,         setDrop]         = useState(dropParam);
  const [vehicle,      setVehicle]      = useState(vehicleParam);
  const [vehicleId,    setVehicleId]    = useState<string | undefined>(vehicleIdParam);
  const [fare,         setFare]         = useState(fareParam);
  const [mobileNumber, setMobileNumber] = useState(mobileParam);
  const [driverId,     setDriverId]     = useState<string | undefined>(driverIdParam);
  const [pickupLat,    setPickupLat]    = useState<number | null>(pickupLatParam);
  const [pickupLng,    setPickupLng]    = useState<number | null>(pickupLngParam);
  const [dropLat,      setDropLat]      = useState<number | null>(dropLatParam);
  const [dropLng,      setDropLng]      = useState<number | null>(dropLngParam);
  const [isSmartPickup, setIsSmartPickup] = useState(isSmartPickupParam);
  const [smartPickupDetails, setSmartPickupDetails] = useState<any>(
    smartPickupDetailsParam ? (() => { try { return JSON.parse(smartPickupDetailsParam); } catch { return null; } })() : null
  );
  const [stops, setStops] = useState<Array<{ address: string; lat: number; lng: number; order: number }>>(
    stopsParam ? (() => { try { return JSON.parse(stopsParam); } catch { return []; } })() : []
  );
  const [isFamilyRide, setIsFamilyRide] = useState(isFamilyRideParam);
  const [familyMemberDetails, setFamilyMemberDetails] = useState<any>(
    familyMemberParam ? (() => { try { return JSON.parse(familyMemberParam); } catch { return null; } })() : null
  );
  const [isScheduled, setIsScheduled] = useState(isScheduledParam);
  const [scheduledPickupTime, setScheduledPickupTime] = useState<string | null>(scheduledTimeParam);
  const scheduledPickupDate = scheduledPickupTime ? new Date(scheduledPickupTime) : null;
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const VehicleIcon = VEHICLE_ICONS[vehicle.toLowerCase()] || Car;

  const [loading,       setLoading]       = useState(false);
  const [bookingId,     setBookingId]     = useState<string | null>(null);
  const [status,        setStatus]        = useState<Status>("idle");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online" | "wallet" | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [countdown,     setCountdown]     = useState(60);
  const [rates,         setRates]         = useState<any>(null);
  const [bookingBreakdown, setBookingBreakdown] = useState<any>(null);

  const computedBreakdown = useMemo(() => {
    if (bookingBreakdown) return bookingBreakdown;
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) return null;
    const allPoints: [number, number][] = [
      [pickupLat, pickupLng],
      ...stops.map((s) => [s.lat, s.lng] as [number, number]),
      [dropLat, dropLng],
    ];
    let totalDist = 0;
    for (let i = 0; i < allPoints.length - 1; i++) {
      const lat1 = allPoints[i][0];
      const lon1 = allPoints[i][1];
      const lat2 = allPoints[i + 1][0];
      const lon2 = allPoints[i + 1][1];
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += 6371 * c;
    }
    const distKm = +totalDist.toFixed(1);
    return calculateFareBreakdown(
      vehicle,
      distKm,
      rates,
      undefined,
      0,
      Boolean(userData?.isStudent)
    );
  }, [
    bookingBreakdown,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    stops,
    vehicle,
    rates,
    userData?.isStudent,
  ]);

  const effectiveFare = computedBreakdown?.totalFare ?? fare;

  useEffect(() => {
    if (computedBreakdown?.totalFare && !bookingId) {
      setFare(computedBreakdown.totalFare);
    }
  }, [computedBreakdown?.totalFare, bookingId]);

  // 1️⃣ Client-side Draft Hydration from sessionStorage (Option 1)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("ridenow_booking_draft");
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.pickup) setPickup(draft.pickup);
          if (draft.drop) setDrop(draft.drop);
          if (draft.vehicle) setVehicle(draft.vehicle);
          if (draft.vehicleId) setVehicleId(draft.vehicleId);
          if (draft.fare) setFare(Number(draft.fare));
          if (draft.mobileNumber) setMobileNumber(draft.mobileNumber);
          if (draft.driverId) setDriverId(draft.driverId);
          if (typeof draft.pickupLat === "number") setPickupLat(draft.pickupLat);
          if (typeof draft.pickupLng === "number") setPickupLng(draft.pickupLng);
          if (typeof draft.dropLat === "number") setDropLat(draft.dropLat);
          if (typeof draft.dropLng === "number") setDropLng(draft.dropLng);
          if (draft.isSmartPickup !== undefined) setIsSmartPickup(Boolean(draft.isSmartPickup));
          if (draft.smartPickupDetails) setSmartPickupDetails(draft.smartPickupDetails);
          if (Array.isArray(draft.stops)) setStops(draft.stops);
          if (draft.isFamilyRide !== undefined) setIsFamilyRide(Boolean(draft.isFamilyRide));
          if (draft.familyMemberDetails) setFamilyMemberDetails(draft.familyMemberDetails);
          if (draft.isScheduled !== undefined) setIsScheduled(Boolean(draft.isScheduled));
          if (draft.scheduledTime) setScheduledPickupTime(draft.scheduledTime);
        }
      }
    } catch (err) {
      console.warn("Failed to load booking draft from sessionStorage:", err);
    }
  }, []);

  // Sync mobile number with Redux user profile if not yet populated
  useEffect(() => {
    if (!mobileNumber && userData?.mobileNumber) {
      const cleaned = userData.mobileNumber.replace(/\D/g, "");
      const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
      setMobileNumber(tenDigits);
    }
  }, [userData, mobileNumber]);

  /* Fetch Wallet Balance */
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await fetch("/api/wallet");
        const data = await res.json();
        if (data.success) {
          setWalletBalance(data.balance ?? 0);
          // If wallet has sufficient balance, default to wallet payment
          if (data.balance >= fare) {
            setPaymentMethod("wallet");
          }
        }
      } catch (err) {
        console.error("Failed to fetch wallet in checkout:", err);
      }
    };
    fetchWallet();
  }, [fare]);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/vehicles/pricing");
        const data = await res.json();
        if (data.success) {
          setRates(data.rates);
        }
      } catch (err) {
        console.error("Failed to fetch pricing rates in checkout:", err);
      }
    };
    fetchRates();
  }, []);

  /* Group Ride & Split Fare State */
  const [isGroupRide, setIsGroupRide] = useState(false);
  const [groupInviteCode, setGroupInviteCode] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [splitFarePerPerson, setSplitFarePerPerson] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  const handleToggleGroupRide = async (activeBookingId?: string) => {
    const targetId = activeBookingId || bookingId;
    const nextVal = !isGroupRide;
    setIsGroupRide(nextVal);
    if (nextVal && targetId) {
      try {
        const res = await fetch(`/api/booking/${targetId}/group/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.success) {
          setGroupInviteCode(data.groupInviteCode);
          setGroupMembers(data.booking.groupMembers || []);
          setSplitFarePerPerson(data.splitFarePerPerson);
        }
      } catch (err) {
        console.error("Group toggle error:", err);
      }
    }
  };

  const handleSendInvite = async () => {
    if (!bookingId || !inviteEmail || !inviteName) return;
    try {
      setInviting(true);
      const res = await fetch(`/api/booking/${bookingId}/group/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeEmail: inviteEmail, inviteeName: inviteName }),
      });
      const data = await res.json();
      if (data.success) {
        setGroupInviteCode(data.groupInviteCode);
        setGroupMembers(data.booking.groupMembers || []);
        setSplitFarePerPerson(data.splitFarePerPerson);
        setInviteEmail("");
        setInviteName("");
      }
    } catch (err) {
      console.error("Invite send error:", err);
    } finally {
      setInviting(false);
    }
  };

  /* ── CREATE BOOKING ── */
  const handleCreateBooking = async () => {
    if (loading) return;
    setBookingError(null);

    if (!userData) {
      setBookingError("Please sign in or create an account to request a ride. Your booking draft is saved.");
      setShowAuthModal(true);
      return;
    }

    if (userData && (!userData.mobileNumber || !userData.isMobileVerified)) {
      setBookingError("Please verify your WhatsApp mobile number before confirming your ride.");
      window.dispatchEvent(new CustomEvent("open-phone-link-modal"));
      return;
    }

    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      setBookingError("Missing location coordinates. Please return to the map and select pickup and destination.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup,
          drop,
          vehicle,
          vehicleId,
          fare: effectiveFare,
          mobileNumber: mobileNumber || userData?.mobileNumber || "",
          driverId,
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          isSmartPickup,
          smartPickupDetails,
          stops,
          isFamilyRide,
          familyMemberDetails,
          isScheduled,
          scheduledPickupTime,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setBookingError("Please sign in to request a ride. Your booking details are preserved.");
        setShowAuthModal(true);
        return;
      }

      if (res.status === 403 && data.requiresPhoneVerification) {
        setBookingError(data.message || "Please verify your WhatsApp mobile number to proceed.");
        window.dispatchEvent(new CustomEvent("open-phone-link-modal"));
        return;
      }

      if (!res.ok || !data.success) {
        setBookingError(data.message || "Failed to create booking. Please try again.");
        return;
      }

      // Success: clear draft
      try {
        sessionStorage.removeItem("ridenow_booking_draft");
      } catch (e) {}

      setBookingId(data.booking._id);
      setFare(data.booking.fare);
      if (data.booking.fareBreakdown) setBookingBreakdown(data.booking.fareBreakdown);
      if (data.booking.pickupAddress) setPickup(data.booking.pickupAddress);
      if (data.booking.dropAddress) setDrop(data.booking.dropAddress);

      if (isScheduled) {
        window.location.href = `/ride/${data.booking._id}`;
      } else {
        setStatus("requested");
        setCountdown(20);
      }
    } catch (err: any) {
      console.error("Booking creation error:", err);
      setBookingError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── PAYMENT CONFIRM ── */
  const handlePaymentConfirm = async () => {
    if (!bookingId || loading) return;

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

      if (paymentMethod === "wallet") {
        const res = await fetch("/api/wallet/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });

        const data = await res.json();

        if (data.success) {
          window.location.href = `/ride/${bookingId}`;
          return;
        } else if (data.insufficientBalance) {
          alert(
            `Insufficient wallet balance.\nAvailable: ₹${data.balance}\nRequired: ₹${data.required}\nShortfall: ₹${data.shortfall}\n\nPlease choose Online Payment or Cash, or add funds to your wallet.`
          );
          return;
        } else {
          alert(data.error || "Wallet payment failed");
          return;
        }
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
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        handler: async function (response:any) {
          setLoading(true);
          try {
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
            } else {
              alert(verifyData.message || "Payment verification failed");
              setLoading(false);
            }
          } catch {
            alert("Payment verification error");
            setLoading(false);
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
    if (!bookingId) return;
    const socket = getSocket();
    socket.emit("join-booking", bookingId);

    socket.on("booking-updated", (data: any) => {
      if (data.status === "awaiting_payment") {
        setStatus((prev) => (prev === "payment" ? "payment" : "awaiting_payment"));
      }
      if (data.status === "rejected")         setStatus("rejected");
      if (data.status === "confirmed")        setStatus("confirmed");
      if (data.status === "auto_rematching")  setStatus("auto_rematching");
      if (data.status === "requested") {
        setStatus("requested");
        setCountdown(60); // Reset timer for next driver
      }
    });

    socket.on("auto-rematch-started", () => setStatus("auto_rematching"));
    socket.on("auto-rematch-searching", () => setStatus("auto_rematching"));
    socket.on("auto-rematch-success", () => {
      setStatus("requested");
      setCountdown(60);
    });

    return () => {
      socket.off("booking-updated");
      socket.off("auto-rematch-started");
      socket.off("auto-rematch-searching");
      socket.off("auto-rematch-success");
    };
  }, [bookingId]);

  /* ── COUNTDOWN TIMER ── */
  useEffect(() => {
    if (status !== "requested" || !bookingId) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetch(`/api/booking/${bookingId}/timeout`, { method: "POST" })
            .catch(err => console.error("Timeout trigger error:", err));
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, bookingId]);

  /* ── RESTORE & BACKGROUND POLLING FALLBACK ── */
  useEffect(() => {
    const checkActiveBooking = async () => {
      try {
        const res  = await fetch("/api/booking/my-active");
        const data = await res.json();
        if (data.booking) {
          setBookingId(data.booking._id);
          setFare(data.booking.fare);
          setPickup(data.booking.pickupAddress);
          setDrop(data.booking.dropAddress);
          if (data.booking.vehicle?.type) {
            setVehicle(data.booking.vehicle.type);
          }
          // If server state is awaiting_payment but local state is already payment, do not revert
          if (data.booking.status === "awaiting_payment" && status === "payment") {
            return;
          }
          setStatus(data.booking.status);
        }
      } catch (err) {
        console.error("Failed to check active booking:", err);
      }
    };

    checkActiveBooking();

    // Fallback poll every 8 seconds while booking is requested or awaiting payment (Socket.IO handles real-time updates)
    const interval = setInterval(() => {
      if (status === "requested" || status === "awaiting_payment") {
        checkActiveBooking();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [status]);

  /* ── awaiting_payment → payment after 2s ── */
  useEffect(() => {
    if (status !== "awaiting_payment") return;
    const t = setTimeout(() => setStatus("payment"), 2000);
    return () => clearTimeout(t);
  }, [status]);

  /* ── AUTO REDIRECT TO RIDE PAGE ── */
  useEffect(() => {
    if (status === "confirmed" && bookingId) {
      const t = setTimeout(() => {
        window.location.href = `/ride/${bookingId}`;
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [status, bookingId]);

  /* ── label ── */
  const vehicleLabel = vehicle.charAt(0).toUpperCase() + vehicle.slice(1);

  return (
    <div className="min-h-screen bg-zinc-100 px-3 sm:px-4 py-6 sm:py-12">

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
          className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="h-px w-8 bg-zinc-900" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Booking</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900">Checkout</h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1 font-medium">Review your ride and confirm</p>
          </div>

          <Link
            href="/book"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition shadow-xs active:scale-95"
          >
            <ArrowLeft size={14} className="sm:w-[15px] sm:h-[15px]" />
            <span>Edit Ride Details</span>
          </Link>
        </motion.div>

        {/* Missing locations warning banner */}
        {!pickupLat && !dropLat && (
          <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-sm gap-2">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-amber-700 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900">No active ride selected</p>
                <p className="text-[11px] text-amber-700">Please choose your pickup and drop locations to book a ride.</p>
              </div>
            </div>
            <Link
              href="/book"
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow shrink-0"
            >
              Go to Booking
            </Link>
          </div>
        )}

        {/* ── GRID ── */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">

          {/* ══ LEFT — RIDE DETAILS ══ */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
            {/* Top bar */}
            <div className="h-1 bg-zinc-900" />

            <div className="p-4 sm:p-8">
              {/* Vehicle row */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Selected Vehicle</p>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">{vehicleLabel}</h2>
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm">
                  <VehicleIcon size={22} className="sm:w-6 sm:h-6 text-white" />
                </div>
              </div>

              {/* Route */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden mb-6">
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

                {/* Intermediate Stops */}
                {stops && stops.length > 0 && stops.map((stop, idx) => (
                  <div key={idx} className="flex gap-4 px-5 py-3.5 border-b border-zinc-100 bg-blue-50/40">
                    <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shadow-sm">
                        {idx + 1}
                      </div>
                      <div className="w-px flex-1 bg-blue-200 my-1" style={{ minHeight: 10 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600 mb-0.5">Stop {idx + 1}</p>
                      <p className="text-sm font-semibold text-zinc-900 leading-snug truncate">{stop.address}</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex-shrink-0 self-center">
                      Waypoint
                    </span>
                  </div>
                ))}

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

              {/* 📍 SMART PICKUP ZONE BADGE & DETAILS */}
              {isSmartPickup && smartPickupDetails && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-sm mt-0.5">
                    📍
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase bg-emerald-700 text-white px-2 py-0.5 rounded-full tracking-wider">
                        Designated Smart Pickup
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold">
                        🚶 {smartPickupDetails.walkingTimeText || "Short Walk"}
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-zinc-900 leading-snug">
                      {smartPickupDetails.spotName}
                    </p>
                    <p className="text-xs font-semibold text-emerald-800">
                      {smartPickupDetails.venueName}
                    </p>
                    {smartPickupDetails.instructions && (
                      <p className="text-[11px] text-zinc-600 mt-1 font-medium italic bg-white/70 p-2 rounded-lg border border-emerald-100">
                        "{smartPickupDetails.instructions}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 👨👩👧 FAMILY RIDE BADGE */}
              {isFamilyRide && familyMemberDetails && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-sm mt-0.5">
                    👨👩👧
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase bg-amber-600 text-white px-2 py-0.5 rounded-full tracking-wider">
                        Family Account Ride
                      </span>
                      <span className="text-[10px] text-amber-800 font-bold">
                        Central Billing
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-zinc-900 leading-snug">
                      Booked for: {familyMemberDetails.name} ({familyMemberDetails.relation})
                    </p>
                    {familyMemberDetails.phone && (
                      <p className="text-xs font-semibold text-zinc-600 mt-0.5">
                        Passenger Phone: {familyMemberDetails.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ⏰ SCHEDULED RIDE BADGE */}
              {isScheduled && scheduledPickupDate && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                    ⏰
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase bg-amber-600 text-white px-2 py-0.5 rounded-md tracking-wider">
                        Scheduled Ride
                      </span>
                      <span className="text-[10px] text-amber-800 font-bold">
                        Advance Booking
                      </span>
                    </div>
                    <p className="text-sm font-black text-zinc-900 leading-snug">
                      Pickup: {scheduledPickupDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-1 font-medium">
                      Driver assigned 15–30 mins before pickup. Free cancellation up to 60 mins before.
                    </p>
                  </div>
                </div>
              )}

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
                  <span className="text-zinc-400 text-base sm:text-lg font-black">₹</span>
                  <span className="text-zinc-900 text-3xl sm:text-5xl font-black tracking-tight leading-none">{effectiveFare}</span>
                </motion.div>
              </div>

              {/* 💰 ITEMIZED FARE BREAKDOWN RECEIPT CARD */}
              {computedBreakdown && (
                <div className="mt-4 p-3.5 sm:p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  {(() => {
                    const breakdown = computedBreakdown;
                    return (
                      <>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-900 mb-2.5 pb-1.5 border-b border-zinc-200 flex items-center justify-between">
                          <span>Itemized Cost Receipt</span>
                          <span className="text-emerald-600 font-bold">
                            Verified Fare {breakdown.surgeMultiplier && breakdown.surgeMultiplier > 1 ? `(${breakdown.surgeMultiplier}x Surge)` : ""}
                          </span>
                        </p>
                        <div className="space-y-1.5 text-xs text-zinc-600 font-medium">
                          <div className="flex justify-between">
                            <span>Base Fare</span>
                            <span className="font-bold text-zinc-900">₹{breakdown.baseFare}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>Distance Fare ({breakdown.distanceKm} km × ₹{breakdown.pricePerKm}/km)</span>
                            <span className="font-bold text-zinc-900">₹{breakdown.distanceFare}</span>
                          </div>
                          {breakdown.surgeAmount > 0 && (
                            <div className="flex justify-between text-[11px] text-amber-600 font-bold">
                              <span>High Demand Surge ({breakdown.surgeMultiplier}x)</span>
                              <span>+₹{breakdown.surgeAmount}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[11px]">
                            <span>Platform Service Fee</span>
                            <span className="font-bold text-zinc-900">₹{breakdown.platformFee}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>Govt GST / Taxes (5%)</span>
                            <span className="font-bold text-zinc-900">₹{breakdown.taxes}</span>
                          </div>
                          {breakdown.isStudentDiscountApplied && (
                            <div className="flex justify-between text-[11px] text-emerald-600 font-extrabold pt-1 border-t border-emerald-100">
                              <span>🎓 Student Pass Discount (10% capped at ₹50)</span>
                              <span>-₹{breakdown.studentDiscount}</span>
                            </div>
                          )}
                          {Number((userData as any)?.outstandingAmount || 0) > 0 && (
                            <div className="flex justify-between text-[11px] text-rose-600 font-bold pt-1 border-t border-rose-100">
                              <span>Previous Outstanding Dues (Recovered)</span>
                              <span>+₹{Number((userData as any)?.outstandingAmount)}</span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* 🧑🤝🧑 GROUP RIDE & SPLIT FARE CARD */}
              <GroupRideCard
                isGroupRide={isGroupRide}
                effectiveFare={effectiveFare}
                fare={fare}
                groupInviteCode={groupInviteCode}
                groupMembers={groupMembers}
                splitFarePerPerson={splitFarePerPerson}
                inviteName={inviteName}
                inviteEmail={inviteEmail}
                inviting={inviting}
                onToggle={() => handleToggleGroupRide()}
                onNameChange={setInviteName}
                onEmailChange={setInviteEmail}
                onSendInvite={handleSendInvite}
              />
            </div>
          </div>

          {/* ══ RIGHT — STATUS PANEL ══ */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs flex flex-col">
            <div className="h-1 bg-zinc-900" />

            <div className="flex-1 p-4 sm:p-8 flex flex-col">
              <AnimatePresence mode="wait">

                {/* ── IDLE ── */}
                {status === "idle" && (
                  <motion.div key="idle"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col flex-1 justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Ready to go?</p>
                      <h3 className="text-2xl font-black text-zinc-900 mb-6">Confirm Your Ride</h3>
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                        {[
                          { icon: <Clock size={14} />, text: "Driver will respond within 2 minutes" },
                          { icon: <ShieldCheck size={14} />, text: "Verified & insured drivers only" },
                          { icon: <CreditCard size={14} />, text: "Pay after driver accepts" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-600 flex-shrink-0">{item.icon}</div>
                            <p className="text-zinc-600 text-xs font-medium">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {bookingError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-left mt-6">
                        <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-red-900">{bookingError}</p>
                          {bookingError.toLowerCase().includes("sign in") && (
                            <button
                              type="button"
                              onClick={() => setShowAuthModal(true)}
                              className="mt-2 text-xs font-black text-white bg-zinc-900 hover:bg-black px-3.5 py-1.5 rounded-lg transition inline-block"
                            >
                              Sign In Now
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleCreateBooking}
                      disabled={loading || !pickupLat || !dropLat}
                      className="w-full h-12 mt-6 bg-zinc-950 hover:bg-black disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-98"
                    >
                      {loading ? (
                        <><Loader2 size={17} className="animate-spin" /> Requesting…</>
                      ) : (
                        <><span>Request Ride</span><ArrowRight size={17} /></>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* ── REQUESTED (RADAR) ── */}
                {status === "requested" && (
                  <motion.div
                    key="requested"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col flex-1 items-center justify-center"
                  >
                    <DriverSearchRadar
                      countdown={countdown}
                      pickup={pickup}
                      drop={drop}
                      vehicle={vehicle}
                      onCancel={handleCancelBooking}
                      cancelling={loading}
                    />
                  </motion.div>
                )}

                {/* ── AUTO REMATCHING ── */}
                {status === "auto_rematching" && (
                  <motion.div key="auto_rematching"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col flex-1 items-center justify-center gap-6 text-center"
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-emerald-500"
                      />
                      <div className="relative w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center">
                        <RotateCcw size={30} className="text-emerald-600 animate-spin" />
                      </div>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-emerald-100 px-3 py-1 rounded-full text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        Driver Cancelled — Auto Re-dispatch
                      </div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Re-matching New Driver</h3>
                      <p className="text-zinc-500 text-xs font-medium max-w-xs mx-auto">
                        Searching nearby online drivers within 15km to take over your trip automatically.
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCancelBooking}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors border border-zinc-200 hover:border-zinc-400 px-4 py-2.5 rounded-xl"
                    >
                      <XCircle size={13} /> Cancel Ride
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
                    <PaymentMethodSelector
                      selectedMethod={paymentMethod}
                      onSelect={(method) => setPaymentMethod(method)}
                      walletBalance={walletBalance}
                      fare={fare}
                    />

                    <button
                      type="button"
                      disabled={!paymentMethod || loading}
                      onClick={handlePaymentConfirm}
                      className="w-full h-12 bg-zinc-950 hover:bg-black disabled:opacity-30 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-98 mt-auto"
                    >
                      {loading
                        ? <><Loader2 size={17} className="animate-spin" /><span>Processing…</span></>
                        : paymentMethod === "wallet"
                        ? <><Wallet size={16} /><span>Pay ₹{fare} from Wallet (1-Tap)</span></>
                        : paymentMethod === "cash"
                        ? <><Banknote size={16} /><span>Confirm Cash Ride</span></>
                        : paymentMethod === "online"
                        ? <><span>Proceed to Payment</span><ArrowRight size={16} /></>
                        : <span>Select a Method</span>
                      }
                    </button>
                  </motion.div>
                )}

                {/* ── CONFIRMED ── */}
                {status === "confirmed" && (
                  <motion.div key="confirmed"
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-zinc-900 mb-1">
                        Ride Confirmed!
                      </h3>
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
                    <button
                      type="button"
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="flex items-center gap-2 bg-zinc-900 text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-black transition-colors"
                    >
                      <RotateCcw size={14} /> Try Again
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Footer trust badge */}
              <div className="flex items-center justify-center gap-2 pt-6 mt-auto border-t border-zinc-100">
                <ShieldCheck size={13} className="text-zinc-400" />
                <span className="text-zinc-400 text-[10px] font-semibold tracking-wide uppercase">Secure & Verified Booking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal for Quick Login on Checkout */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
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