"use client";
import { Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, ShieldCheck,
  Bike, Car, Truck, Loader2, CheckCircle2,
  XCircle, Clock, CreditCard, Banknote,
  ArrowRight, ArrowLeft, RotateCcw, AlertCircle, Wallet,
  Users, UserPlus, Share2, IndianRupee, Package, Edit2
} from "lucide-react";
import { HomeIcon } from "@/shared/components/icons/AppIcons";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import useGetMe from "@/shared/hooks/useGetMe";
import AuthModal from "@/features/auth/components/AuthModal";
import { getSocket, joinBookingRoom, leaveBookingRoom } from "@/lib/socket";
import { calculateFareBreakdown } from "@/lib/fareEngine";
import { DEFAULT_ROAD_TORTUOSITY_FACTOR } from "@/lib/routeUtils";
import GroupRideCard from "@/features/booking/components/GroupRideCard";
import DriverSearchRadar from "@/features/booking/components/DriverSearchRadar";
import PaymentMethodSelector from "@/features/booking/components/PaymentMethodSelector";
import DriverPreferenceSelector from "@/features/booking/components/DriverPreferenceSelector";
import NoWomenDriversModal from "@/features/booking/components/NoWomenDriversModal";
import { DriverPreference } from "@/lib/safetyMatching";
import { VEHICLE_OPTIONS } from "@/lib/vehicleConfig";

const VEHICLE_ICONS: Record<string, any> = {
  scooty: Bike,
  bike: Bike,
  auto: Car,
  mini: Car,
  car: Car,
  priority: Car,
  intercity: Car,
  loading: Truck,
  truck: Truck,
};

type Status =
  | "idle" | "requested" | "awaiting_payment"
  | "rejected" | "expired" | "cancelled"
  | "payment" | "confirmed" | "auto_rematching";

export default function CheckoutContent() {
  const router = useRouter();
  const { userData } = useSelector((state: RootState) => state.user);
  useGetMe(true);

  const params = useSearchParams();

  // Query parameter fallbacks (backwards-compatible)
  const pickupParam    = params.get("pickup")    || "";
  const dropParam      = params.get("drop")      || "";
  const vehicleParam   = params.get("vehicle")   || "";
  const vehicleIdParam = params.get("vehicleId") || undefined;
  const fareParam      = params.get("fare") ? Number(params.get("fare")) : 0;
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

  const [pickup,       setPickup]       = useState(pickupParam || "Pickup Location");
  const [drop,         setDrop]         = useState(dropParam || "Drop Location");
  const [vehicle,      setVehicle]      = useState(vehicleParam || "car");
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
  const [serviceMode, setServiceMode] = useState<"passenger" | "logistics">("passenger");
  const [cargoDetails, setCargoDetails] = useState<any | null>(null);
  const [pickupDetails, setPickupDetails] = useState<any | null>(null);
  const [dropDetails, setDropDetails] = useState<any | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [driverPreference, setDriverPreference] = useState<DriverPreference>("any");
  const [noWomenDrivers, setNoWomenDrivers] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(10);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const VehicleIcon = VEHICLE_ICONS[vehicle.toLowerCase()] || Car;

  const [loading,       setLoading]       = useState(false);
  const [bookingId,     setBookingId]     = useState<string | null>(null);
  const [status,        setStatus]        = useState<Status>("idle");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online" | "wallet" | null>(null);
  const [useWallet,     setUseWallet]     = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [countdown,     setCountdown]     = useState(60);
  const [rates,         setRates]         = useState<any>(null);
  const [bookingBreakdown, setBookingBreakdown] = useState<any>(null);
  const [distanceKm,    setDistanceKm]    = useState<number | null>(null);

  const computedBreakdown = useMemo(() => {
    const userOutstanding = Number((userData as any)?.outstandingAmount || 0);

    if (bookingBreakdown && (!vehicle || bookingBreakdown.vehicleType?.toLowerCase() === vehicle?.toLowerCase())) {
      if (userOutstanding > 0 && (!bookingBreakdown.cancellationDues || bookingBreakdown.cancellationDues !== userOutstanding)) {
        return {
          ...bookingBreakdown,
          cancellationDues: userOutstanding,
          totalFare: (bookingBreakdown.totalFare - (bookingBreakdown.cancellationDues || 0)) + userOutstanding,
        };
      }
      return bookingBreakdown;
    }
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) return null;
    
    const allPoints: [number, number][] = [
      [pickupLat, pickupLng],
      ...stops.filter((s) => typeof s.lat === "number" && typeof s.lng === "number").map((s) => [s.lat, s.lng] as [number, number]),
      [dropLat, dropLng],
    ];
    let calculatedRoadDist = 0;
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
      calculatedRoadDist += 6371 * c;
    }
    const roadDistWithTortuosity = +(calculatedRoadDist * DEFAULT_ROAD_TORTUOSITY_FACTOR).toFixed(1);

    // Safeguard: use distanceKm only if consistent with current waypoints, otherwise recompute
    let distKm: number;
    if (
      distanceKm &&
      distanceKm > 0 &&
      roadDistWithTortuosity > 0 &&
      Math.abs(distanceKm - roadDistWithTortuosity) < Math.max(2, roadDistWithTortuosity * 0.5)
    ) {
      distKm = distanceKm;
    } else {
      distKm = roadDistWithTortuosity;
    }

    return calculateFareBreakdown(
      vehicle,
      distKm,
      rates,
      undefined,
      0,
      Boolean(userData?.isStudent),
      undefined,
      undefined,
      userOutstanding
    );
  }, [
    bookingBreakdown,
    distanceKm,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    stops,
    vehicle,
    rates,
    userData?.isStudent,
    (userData as any)?.outstandingAmount,
  ]);

  const effectiveFare = computedBreakdown?.totalFare ?? fare;

  useEffect(() => {
    if (computedBreakdown?.totalFare && !bookingId) {
      setFare(computedBreakdown.totalFare);
    }
  }, [computedBreakdown?.totalFare, bookingId]);

  // 1️⃣ Client-side Draft Hydration from sessionStorage / localStorage
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("ridenow_booking_draft") || localStorage.getItem("ridenow_booking_draft");
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.pickup && draft.pickup !== "Pickup Location") setPickup(draft.pickup);
          if (draft.drop && draft.drop !== "Drop Location") setDrop(draft.drop);
          if (draft.vehicle) setVehicle(draft.vehicle);
          if (draft.vehicleId) setVehicleId(draft.vehicleId);
          if (draft.fare) setFare(Number(draft.fare));
          if (draft.fareBreakdown) setBookingBreakdown(draft.fareBreakdown);
          if (draft.mobileNumber) setMobileNumber(draft.mobileNumber);
          if (draft.driverId) setDriverId(draft.driverId);
          if (typeof draft.pickupLat === "number") setPickupLat(draft.pickupLat);
          if (typeof draft.pickupLng === "number") setPickupLng(draft.pickupLng);
          if (typeof draft.dropLat === "number") setDropLat(draft.dropLat);
          if (typeof draft.dropLng === "number") setDropLng(draft.dropLng);
          if (typeof draft.distanceKm === "number") setDistanceKm(draft.distanceKm);
          if (draft.isSmartPickup !== undefined) setIsSmartPickup(Boolean(draft.isSmartPickup));
          if (draft.smartPickupDetails) setSmartPickupDetails(draft.smartPickupDetails);
          if (Array.isArray(draft.stops)) setStops(draft.stops);
          if (draft.isFamilyRide !== undefined) setIsFamilyRide(Boolean(draft.isFamilyRide));
          if (draft.familyMemberDetails) setFamilyMemberDetails(draft.familyMemberDetails);
          if (draft.isScheduled !== undefined) setIsScheduled(Boolean(draft.isScheduled));
          if (draft.scheduledTime) setScheduledPickupTime(draft.scheduledTime);
          if (draft.serviceMode) setServiceMode(draft.serviceMode);
          if (draft.cargoDetails) setCargoDetails(draft.cargoDetails);
          if (draft.pickupDetails) setPickupDetails(draft.pickupDetails);
          if (draft.dropDetails) setDropDetails(draft.dropDetails);
        }
      }
      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState({}, "", "/checkout");
      }
    } catch (err) {
      console.warn("Failed to load booking draft from storage:", err);
    } finally {
      setIsHydrated(true);
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
        const res = await fetch(`/api/vehicles/pricing?t=${Date.now()}`, { cache: "no-store" });
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
  const handleCreateBooking = async (overrideOptions?: {
    overridePreference?: DriverPreference;
    overrideRadius?: number;
  }) => {
    if (loading) return;
    setBookingError(null);

    const activePreference = overrideOptions?.overridePreference || driverPreference;
    const activeRadius = overrideOptions?.overrideRadius || searchRadiusKm;

    if (overrideOptions?.overridePreference) {
      setDriverPreference(overrideOptions.overridePreference);
    }
    if (overrideOptions?.overrideRadius) {
      setSearchRadiusKm(overrideOptions.overrideRadius);
    }

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
          cancellationDues: Number((userData as any)?.outstandingAmount || 0),
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
          serviceMode,
          cargoDetails,
          pickupDetails: pickupDetails || (pickupLat && pickupLng ? {
            name: pickup.split(",")[0],
            formattedAddress: pickup,
            coordinates: [pickupLat, pickupLng],
          } : undefined),
          dropDetails: dropDetails || (dropLat && dropLng ? {
            name: drop.split(",")[0],
            formattedAddress: drop,
            coordinates: [dropLat, dropLng],
          } : undefined),
          distanceKm: computedBreakdown?.distanceKm || distanceKm || undefined,
          driverPreference: activePreference,
          searchRadiusKm: activeRadius,
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

      if (res.status === 404 && data.noWomenDriversAvailable) {
        setNoWomenDrivers(true);
        setBookingError(null);
        return;
      }

      if (!res.ok || !data.success) {
        setBookingError(data.message || "Failed to create booking. Please try again.");
        return;
      }

      // Success: clear draft
      try {
        sessionStorage.removeItem("ridenow_booking_draft");
        localStorage.removeItem("ridenow_booking_draft");
      } catch (e) {}

      setBookingId(data.booking._id);
      setFare(data.booking.fare);
      if (data.booking.fareBreakdown) setBookingBreakdown(data.booking.fareBreakdown);
      const createdType = data.booking.fareBreakdown?.vehicleType || data.booking.vehicle?.type || vehicle;
      if (createdType) setVehicle(createdType);
      if (data.booking.pickupAddress) setPickup(data.booking.pickupAddress);
      if (data.booking.dropAddress) setDrop(data.booking.dropAddress);

      if (isScheduled) {
        window.location.href = `/ride/${data.booking._id}`;
      } else {
        setStatus("requested");
        setCountdown(45);
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

      const walletToDeduct = useWallet && (walletBalance || 0) > 0 ? Math.min(walletBalance || 0, fare) : 0;
      const remainingFare = Math.max(0, fare - walletToDeduct);

      // If full fare is covered by wallet or wallet payment chosen
      if (remainingFare === 0 || paymentMethod === "wallet") {
        const res = await fetch("/api/wallet/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });

        const data = await res.json();

        if (data.success || data.alreadyConfirmed) {
          setStatus("confirmed");
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

      if (paymentMethod === "cash") {
        const res = await fetch(`/api/booking/${bookingId}/confirm-payment`,{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({
            method:"cash",
            useWallet: walletToDeduct > 0,
            walletAmount: walletToDeduct,
          })
        });

        const data = await res.json();

        if (data.success || data.alreadyConfirmed) {
          setStatus("confirmed");
          window.location.href = `/ride/${bookingId}`;
        } else {
          alert(data.message || "Failed to confirm cash payment. Please retry.");
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
        key:
          process.env.NEXT_PUBLIC_RAZORPAY_KEY ||
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
          (orderData as any)?.keyId ||
          "",
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

            if (verifyData.success || verifyData.alreadyConfirmed) {
              setStatus("confirmed");
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
    const currentUid = userData?._id ? String(userData._id) : undefined;
    const socket = getSocket(currentUid ? { userId: currentUid } : undefined);
    joinBookingRoom(bookingId);

    const onConnect = () => {
      // Re-fetch authoritative status on reconnect to catch missed events
      fetch(`/api/booking/${bookingId}/status`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.status) {
            handleUpdate({ status: data.status });
          }
        })
        .catch(() => {});
    };
    socket.on("connect", onConnect);

    const handleUpdate = (data: any) => {
      if (data.status === "awaiting_payment") {
        setStatus((prev) => (prev === "payment" || prev === "confirmed" ? prev : "awaiting_payment"));
      }
      if (data.status === "rejected")         setStatus("rejected");
      if (["confirmed", "driver_assigned", "driver_arriving", "driver_arrived", "started", "ride_started", "ride_in_progress"].includes(data.status)) {
        setStatus("confirmed");
      }
      if (data.status === "auto_rematching")  setStatus("auto_rematching");
      if (data.status === "requested") {
        setStatus("requested");
        setCountdown(45); // Reset timer for next driver
      }
    };

    const handleRematchStarted = () => setStatus("auto_rematching");
    const handleRematchSearching = () => setStatus("auto_rematching");
    const handleRematchSuccess = () => {
      setStatus("requested");
      setCountdown(45);
    };

    socket.on("booking-updated", handleUpdate);
    socket.on("booking-status-update", handleUpdate);
    socket.on("auto-rematch-started", handleRematchStarted);
    socket.on("auto-rematch-searching", handleRematchSearching);
    socket.on("auto-rematch-success", handleRematchSuccess);

    return () => {
      leaveBookingRoom(bookingId);
      socket.off("connect", onConnect);
      socket.off("booking-updated", handleUpdate);
      socket.off("booking-status-update", handleUpdate);
      socket.off("auto-rematch-started", handleRematchStarted);
      socket.off("auto-rematch-searching", handleRematchSearching);
      socket.off("auto-rematch-success", handleRematchSuccess);
    };
  }, [bookingId, userData?._id]);

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
          // If the page is in 'idle' mode and user hasn't initiated a booking on this draft,
          // only take over if the booking is actively confirmed, started, or awaiting payment.
          // Don't hijack a fresh user draft with an unconfirmed pending search from an old session.
          if (status === "idle" && !bookingId && ["requested", "searching_driver", "auto_rematching"].includes(data.booking.status)) {
            return;
          }

          setBookingId(data.booking._id);
          setFare(data.booking.fare);
          setPickup(data.booking.pickupAddress);
          setDrop(data.booking.dropAddress);
          if (data.booking.fareBreakdown) {
            setBookingBreakdown(data.booking.fareBreakdown);
          }
          const resolvedType = data.booking.fareBreakdown?.vehicleType || data.booking.vehicle?.type;
          if (resolvedType) {
            setVehicle(resolvedType);
          }
          // If server state is awaiting_payment but local state is already payment or confirmed, do not revert
          if (data.booking.status === "awaiting_payment") {
            setStatus((prev) => (prev === "payment" || prev === "confirmed" ? prev : "awaiting_payment"));
            return;
          }
          if (["confirmed", "driver_assigned", "driver_arriving", "driver_arrived", "started", "ride_started", "ride_in_progress"].includes(data.booking.status)) {
            setStatus("confirmed");
            window.location.href = `/ride/${data.booking._id}`;
            return;
          }
          setStatus(data.booking.status);
        }
      } catch (err) {
        console.error("Failed to check active booking:", err);
      }
    };

    checkActiveBooking();

    // Adaptive poll interval: slower during payment (2500ms) to avoid race conditions,
    // faster during driver search (1500ms) for snappy UX.
    // "confirmed" and terminal statuses don't need aggressive polling — socket handles them.
    const intervalMs =
      status === "payment" ? 2500 :
      status === "requested" || status === "awaiting_payment" ? 1500 :
      status === "auto_rematching" ? 2000 :
      5000; // idle / confirmed fallback heartbeat

    const interval = setInterval(() => {
      if (status === "requested" || status === "awaiting_payment" || status === "payment" || status === "auto_rematching") {
        checkActiveBooking();
      }
    }, intervalMs);

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

  /* ── label & link ── */
  const opt = VEHICLE_OPTIONS[vehicle.toLowerCase() as keyof typeof VEHICLE_OPTIONS];
  const vehicleLabel = opt?.label || (vehicle.charAt(0).toUpperCase() + vehicle.slice(1));

  const editBookUrl = "/book?edit=true";

  const handleReturnToBook = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (typeof window !== "undefined" && pickupLat && dropLat && pickup !== "Pickup Location") {
      try {
        const draft = {
          pickup,
          drop,
          vehicle,
          vehicleId,
          fare: effectiveFare,
          fareBreakdown: computedBreakdown || bookingBreakdown,
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          distanceKm,
          mobileNumber,
          isScheduled,
          scheduledTime: scheduledPickupTime,
          stops,
          smartPickupDetails: isSmartPickup ? smartPickupDetails : null,
          familyMemberDetails: isFamilyRide ? familyMemberDetails : null,
          pickupDetails,
          dropDetails,
          serviceMode,
          cargoDetails,
        };
        const serialized = JSON.stringify(draft);
        sessionStorage.setItem("ridenow_booking_draft", serialized);
        localStorage.setItem("ridenow_booking_draft", serialized);
      } catch (_) {}
    }
    router.push("/book?edit=true");
  };

  return (
    <div className="min-h-screen bg-[#F7F1E5] dark:bg-[#101713] text-[#10251C] dark:text-[#F3F1E8] px-3 sm:px-4 py-5 sm:py-10">

      {/* subtle dot grid */}
      <div className="fixed inset-0 pointer-events-none opacity-60 dark:opacity-20"
        style={{ backgroundImage: "radial-gradient(circle, #DED7CA 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />

      <div className="relative max-w-2xl mx-auto z-10 space-y-4 sm:space-y-6">

        {/* ── PAGE HEADER & NAVIGATION ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DED7CA] dark:border-[#34443A] pb-3"
        >
          <div className="flex items-center gap-2.5">
            <Link
              href={editBookUrl}
              onClick={handleReturnToBook}
              className="min-w-[44px] min-h-[44px] rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#1E2B23] hover:bg-white dark:hover:bg-[#202B24] flex items-center justify-center text-[#10251C] dark:text-[#F3F1E8] transition shadow-none cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
              aria-label="Back to Map"
              title="Back to Map"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E34222]">Step 2 of 2</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#10251C] dark:text-[#F3F1E8]">
                Review & Confirm Ride
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#1E2B23] hover:bg-white dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold transition shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
              title="Go to Home"
            >
              <HomeIcon size={13} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              href={editBookUrl}
              onClick={handleReturnToBook}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#1E2B23] hover:bg-white dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold transition shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <Edit2 size={12} />
              <span>Edit Route</span>
            </Link>
          </div>
        </motion.div>

        {/* Missing locations warning banner */}
        {isHydrated && (!pickupLat || !dropLat || pickup === "Pickup Location" || drop === "Drop Location") && (
          <div className="p-3.5 sm:p-4 bg-[#faebe8] dark:bg-[#3A201A] border border-[#f0c8c1] dark:border-[#6B3A2C] rounded-[10px] flex items-center justify-between shadow-none gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle size={18} className="text-[#E34222] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#782313] dark:text-rose-200 uppercase tracking-wide">No active route selected</p>
                <p className="text-[11px] text-[#782313]/90 dark:text-rose-300/90 font-medium">Please choose your pickup and drop locations on the map.</p>
              </div>
            </div>
            <Link
              href={editBookUrl}
              onClick={handleReturnToBook}
              className="min-h-[44px] px-3.5 py-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white text-xs font-bold uppercase tracking-wider rounded-[8px] transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
            >
              Choose on Map
            </Link>
          </div>
        )}

        {/* ── UNIFIED BOOKING FLOW (ALL IN ONE TYPE) ── */}
        <div className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-[14px] border border-[#DED7CA] dark:border-[#34443A] overflow-hidden shadow-sm">

          {/* ══ 1. VEHICLE & TOTAL FARE SUMMARY ROW ══ */}
          <div className="p-4 sm:p-6 border-b border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#1E2B23] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#90C8A8] rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-2xs border border-[#cdd6c3] dark:border-[#2D4E3A]">
                <VehicleIcon size={24} className="text-[#123D32] dark:text-[#90C8A8]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E34222]">
                    {opt?.categoryTitle || "Jaatri Fleet"}
                  </span>
                  {opt?.etaText && (
                    <span className="text-[10px] font-mono text-[#123D32] dark:text-[#90C8A8] bg-[#E5EBDD] dark:bg-[#1D3428] px-2 py-0.5 rounded-full font-bold">
                      {opt.etaText}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-serif text-[#10251C] dark:text-[#F3F1E8] tracking-tight truncate">
                  {vehicleLabel}
                </h2>
                <p className="text-[11px] text-[#696B64] dark:text-[#929D93] font-medium truncate mt-0.5">
                  {opt?.tagline || opt?.description || "Verified drivers with upfront guaranteed pricing"}
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#929D93]">Total Upfront</p>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#10251C] dark:text-[#F3F1E8] font-mono">
                ₹{effectiveFare}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* ══ 2. ROUTE TIMELINE (CLEAN MINIMALIST VERTICAL FLOW) ══ */}
            <div className="bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] p-3.5 sm:p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#DED7CA]/60 dark:border-[#34443A]/60 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#929D93]">Route Overview</span>
                <Link
                  href={editBookUrl}
                  onClick={handleReturnToBook}
                  className="text-[11px] font-bold text-[#123D32] dark:text-[#90C8A8] hover:underline flex items-center gap-1"
                >
                  <MapPin size={11} />
                  <span>Change</span>
                </Link>
              </div>

              {/* Pickup Point */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <span className="w-2.5 h-2.5 bg-[#123D32] dark:bg-[#90C8A8] rounded-full" />
                  <span className="w-px h-6 bg-[#DED7CA] dark:bg-[#34443A] my-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#929D93]">Pickup</p>
                  <p className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F3F1E8] leading-snug truncate">
                    {pickup}
                  </p>
                </div>
              </div>

              {/* Intermediate Stops */}
              {stops && stops.length > 0 && stops.map((stop, idx) => (
                <div key={idx} className="flex items-start gap-3 pl-0.5">
                  <div className="flex flex-col items-center flex-shrink-0 pt-1">
                    <span className="w-2 h-2 border border-[#123D32] dark:border-[#90C8A8] bg-[#E5EBDD] dark:bg-[#1D3428] rounded-full" />
                    <span className="w-px h-6 bg-[#DED7CA] dark:bg-[#34443A] my-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#929D93]">Stop {idx + 1}</p>
                    <p className="text-xs font-semibold text-[#10251C] dark:text-[#F3F1E8] leading-snug truncate">{stop.address}</p>
                  </div>
                </div>
              ))}

              {/* Drop Point */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">
                  <span className="w-2.5 h-2.5 bg-[#E34222] dark:bg-[#E06A50] rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#E34222] dark:text-[#E06A50]">Destination</p>
                  <p className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F3F1E8] leading-snug truncate">
                    {drop}
                  </p>
                </div>
              </div>

              {/* Distance and Estimated Travel Time Stats */}
              <div className="pt-2 border-t border-[#DED7CA]/60 dark:border-[#34443A]/60 flex items-center justify-between text-[11px] font-mono text-[#696B64] dark:text-[#929D93]">
                <span>Distance: <strong className="text-[#10251C] dark:text-[#F3F1E8]">{computedBreakdown?.distanceKm || distanceKm || "—"} km</strong></span>
                <span>Est. Time: <strong className="text-[#10251C] dark:text-[#F3F1E8]">{computedBreakdown?.distanceKm ? `${Math.max(4, Math.round(computedBreakdown.distanceKm * 2.5))} mins` : "10-15 mins"}</strong></span>
              </div>
            </div>

            {/* ══ CONTEXTUAL BADGES ══ */}
            {/* Smart Pickup Zone */}
            {isSmartPickup && smartPickupDetails && (
              <div className="p-3 bg-[#FAF7F0] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] flex items-start gap-3 text-xs">
                <div className="w-7 h-7 bg-[#123D32] dark:bg-[#28664D] text-white rounded-[6px] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  📍
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8]">
                    Designated Smart Pickup · {smartPickupDetails.walkingTimeText || "Short Walk"}
                  </p>
                  <p className="font-extrabold text-[#10251C] dark:text-[#F3F1E8] mt-0.5">{smartPickupDetails.spotName} — {smartPickupDetails.venueName}</p>
                  {smartPickupDetails.instructions && (
                    <p className="text-[11px] text-[#696B64] dark:text-[#929D93] italic mt-1">&quot;{smartPickupDetails.instructions}&quot;</p>
                  )}
                </div>
              </div>
            )}

            {/* Family Ride Badge */}
            {isFamilyRide && familyMemberDetails && (
              <div className="p-3 bg-[#FAF7F0] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] flex items-start gap-3 text-xs">
                <div className="w-7 h-7 bg-[#123D32] dark:bg-[#28664D] text-white rounded-[6px] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  👨‍👩‍👧
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8]">Family Account Ride</p>
                  <p className="font-extrabold text-[#10251C] dark:text-[#F3F1E8] mt-0.5">
                    Booked for: {familyMemberDetails.name} ({familyMemberDetails.relation}) · {familyMemberDetails.phone || ""}
                  </p>
                </div>
              </div>
            )}

            {/* Scheduled Ride Badge */}
            {isScheduled && scheduledPickupDate && (
              <div className="p-3 bg-[#FAF7F0] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] flex items-start gap-3 text-xs">
                <div className="w-7 h-7 bg-[#123D32] dark:bg-[#28664D] text-white rounded-[6px] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  ⏰
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8]">Scheduled Advance Trip</p>
                  <p className="font-extrabold text-[#10251C] dark:text-[#F3F1E8] mt-0.5">
                    Pickup: {scheduledPickupDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-[11px] text-[#696B64] dark:text-[#929D93] mt-0.5">Driver assigned 15-30 mins prior to pickup time.</p>
                </div>
              </div>
            )}

            {/* Logistics Cargo Details */}
            {serviceMode === "logistics" && cargoDetails && (
              <div className="p-3 bg-[#FAF7F0] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] flex items-start gap-3 text-xs">
                <div className="w-7 h-7 bg-[#123D32] dark:bg-[#28664D] text-white rounded-[6px] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  <Package size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8]">Goods Transport Details</p>
                  <p className="font-extrabold text-[#10251C] dark:text-[#F3F1E8] mt-0.5">
                    {cargoDetails.cargoType || "General Cargo"} {cargoDetails.cargoWeightKg ? `· ~${cargoDetails.cargoWeightKg} kg` : ""}
                  </p>
                  {cargoDetails.receiverContact && (
                    <p className="text-[11px] text-[#696B64] dark:text-[#929D93]">Receiver: {cargoDetails.receiverContact}</p>
                  )}
                </div>
              </div>
            )}

            {/* ══ 3. ITEMIZED FARE RECEIPT ══ */}
            {computedBreakdown && (
              <div className="border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] bg-[#FAF7F0]/80 dark:bg-[#1E2B23]/70 p-3.5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8] pb-2 border-b border-[#DED7CA] dark:border-[#34443A] flex items-center justify-between">
                  <span>Guaranteed Upfront Pricing</span>
                  <span className="font-mono text-[#696B64] dark:text-[#929D93]">No Hidden Costs</span>
                </p>
                <div className="space-y-1.5 text-xs text-[#696B64] dark:text-[#929D93] font-medium pt-2">
                  <div className="flex justify-between">
                    <span>Base Flagdown Fare</span>
                    <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">₹{computedBreakdown.baseFare}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Distance Charge ({computedBreakdown.distanceKm} km × ₹{computedBreakdown.pricePerKm}/km)</span>
                    <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">₹{computedBreakdown.distanceFare}</span>
                  </div>
                  {computedBreakdown.surgeAmount > 0 && (
                    <div className="flex justify-between text-[11px] text-[#E34222] dark:text-[#E06A50] font-bold">
                      <span>High Demand Surge ({computedBreakdown.surgeMultiplier}x)</span>
                      <span>+₹{computedBreakdown.surgeAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px]">
                    <span>Platform Service Fee</span>
                    <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">₹{computedBreakdown.platformFee}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Govt GST / Taxes (5%)</span>
                    <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">₹{computedBreakdown.taxes}</span>
                  </div>
                  {computedBreakdown.isStudentDiscountApplied && (
                    <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold pt-1 border-t border-[#DED7CA] dark:border-[#34443A]">
                      <span>🎓 Student Pass Discount (10% OFF)</span>
                      <span>-₹{computedBreakdown.studentDiscount}</span>
                    </div>
                  )}
                  {(computedBreakdown.cancellationDues ? computedBreakdown.cancellationDues > 0 : Number((userData as any)?.outstandingAmount || 0) > 0) && (
                    <div className="flex justify-between text-[11px] text-[#E34222] dark:text-[#E06A50] font-bold pt-1 border-t border-[#DED7CA] dark:border-[#34443A]">
                      <span>Unsettled Cancellation Dues</span>
                      <span>+₹{computedBreakdown.cancellationDues || Number((userData as any)?.outstandingAmount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-[#10251C] dark:text-[#F3F1E8] pt-2 border-t border-[#DED7CA] dark:border-[#34443A]">
                    <span>Final Fare</span>
                    <span className="font-mono text-[#123D32] dark:text-[#D7AC62]">₹{effectiveFare}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══ 4. GROUP RIDE & SPLIT FARE ══ */}
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

            {/* ══ 5. DYNAMIC STATUS & ACTIONS (RADAR, PAYMENT, OR SUBMISSION) ══ */}
            <div className="pt-2">
              <AnimatePresence mode="wait">

                {/* ── IDLE / INITIAL SUBMISSION ── */}
                {status === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Error Banner */}
                    {bookingError && (
                      <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-[8px] flex items-start gap-3 text-left">
                        <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-red-900 dark:text-red-200">{bookingError}</p>
                          {bookingError.toLowerCase().includes("sign in") && (
                            <button
                              type="button"
                              onClick={() => setShowAuthModal(true)}
                              className="mt-2 text-xs font-bold text-white bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] px-3.5 py-1.5 rounded-[6px] transition cursor-pointer"
                            >
                              Sign In Now
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Driver Preference Selector */}
                    <div className="pt-1 pb-1">
                      <DriverPreferenceSelector
                        value={driverPreference}
                        onChange={(pref) => {
                          setDriverPreference(pref);
                          setSearchRadiusKm(10);
                        }}
                      />
                    </div>

                    {/* Booking Confirmation CTA Button */}
                    <button
                      type="button"
                      onClick={() => handleCreateBooking()}
                      disabled={loading || !pickupLat || !dropLat}
                      className="w-full h-13 py-3.5 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] disabled:opacity-40 text-white font-bold text-sm uppercase tracking-wider rounded-[8px] flex items-center justify-center gap-2 transition cursor-pointer shadow-sm min-h-[50px] active:scale-[0.99]"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Assigning Nearest Driver...</span>
                        </>
                      ) : (
                        <>
                          <span>Request {vehicleLabel} • ₹{effectiveFare}</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-4 text-[10px] text-[#696B64] dark:text-[#929D93] font-bold uppercase tracking-wider pt-1">
                      <span>• Driver answers in &lt; 2 min</span>
                      <span>• Pay after trip begins</span>
                      <span>• 100% verified fleet</span>
                    </div>
                  </motion.div>
                )}

                {/* ── RADAR SEARCH (REQUESTED) ── */}
                {status === "requested" && (
                  <motion.div
                    key="requested"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="py-6 flex flex-col items-center justify-center"
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
                  <motion.div
                    key="auto_rematching"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="py-8 flex flex-col items-center justify-center gap-5 text-center"
                  >
                    <div className="relative w-16 h-16 rounded-full bg-[#FAF7F0] dark:bg-[#1E2B23] border-2 border-[#DED7CA] dark:border-[#34443A] flex items-center justify-center">
                      <RotateCcw size={26} className="text-[#10251C] dark:text-[#F3F1E8] animate-spin" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 bg-[#FAF7F0] dark:bg-[#1E2B23] px-3 py-1 rounded-full text-[#10251C] dark:text-[#F3F1E8] text-[10px] font-black uppercase tracking-wider mb-2 border border-[#DED7CA] dark:border-[#34443A]">
                        Auto Re-dispatch Active
                      </div>
                      <h3 className="text-lg font-black text-[#10251C] dark:text-[#F3F1E8] font-heading">Re-matching New Driver</h3>
                      <p className="text-[#696B64] dark:text-[#929D93] text-xs font-medium max-w-xs mx-auto mt-1">
                        Scanning active drivers within 15 km to take over your ride request automatically.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelBooking}
                      className="min-h-[44px] flex items-center gap-2 text-xs font-bold text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-[#F3F1E8] transition border border-[#DED7CA] dark:border-[#34443A] px-4 py-2 rounded-[8px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
                    >
                      <XCircle size={13} />
                      <span>Cancel Ride</span>
                    </button>
                  </motion.div>
                )}

                {/* ── AWAITING PAYMENT / DRIVER ACCEPTED ── */}
                {status === "awaiting_payment" && (
                  <motion.div
                    key="awaiting_payment"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="py-8 flex flex-col items-center justify-center gap-5 text-center"
                  >
                    <div className="w-16 h-16 rounded-[12px] bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#10251C] dark:text-[#F3F1E8] font-heading">Driver Accepted!</h3>
                      <p className="text-[#696B64] dark:text-[#929D93] text-xs font-medium mt-1">
                        Trip confirmed. Loading payment options…
                      </p>
                    </div>
                    <div className="w-48 h-1.5 bg-[#E8E1D5] dark:bg-[#202B24] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2 }}
                        className="h-full bg-[#123D32] dark:bg-[#28664D]"
                      />
                    </div>
                  </motion.div>
                )}

                {/* ── PAYMENT METHOD SELECTION ── */}
                {status === "payment" && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <PaymentMethodSelector
                      selectedMethod={paymentMethod}
                      onSelect={(method) => setPaymentMethod(method)}
                      walletBalance={walletBalance}
                      fare={fare}
                      useWallet={useWallet}
                      onToggleWallet={(val) => {
                        setUseWallet(val);
                        if (val && walletBalance !== null && walletBalance >= fare) {
                          setPaymentMethod("wallet");
                        }
                      }}
                    />

                    {(() => {
                      const walletDeduct = useWallet && (walletBalance || 0) > 0 ? Math.min(walletBalance || 0, fare) : 0;
                      const remaining = Math.max(0, fare - walletDeduct);

                      return (
                        <button
                          type="button"
                          disabled={(!paymentMethod && remaining > 0) || loading}
                          onClick={handlePaymentConfirm}
                          className="w-full h-12 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] disabled:opacity-30 text-white font-bold text-xs uppercase tracking-wider rounded-[8px] flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          {loading ? (
                            <><Loader2 size={16} className="animate-spin" /><span>Processing…</span></>
                          ) : remaining === 0 || paymentMethod === "wallet" ? (
                            <><Wallet size={15} /><span>Pay ₹{fare} from Wallet (1-Tap)</span></>
                          ) : paymentMethod === "cash" ? (
                            <><Banknote size={15} /><span>{walletDeduct > 0 ? `Pay ₹${walletDeduct} Wallet + ₹${remaining} Cash` : "Confirm Cash Ride"}</span></>
                          ) : paymentMethod === "online" ? (
                            <><span>{walletDeduct > 0 ? `Pay ₹${walletDeduct} Wallet + ₹${remaining} Online` : "Proceed to Online Payment"}</span><ArrowRight size={15} /></>
                          ) : (
                            <span>Select Cash or Online for ₹{remaining}</span>
                          )}
                        </button>
                      );
                    })()}
                  </motion.div>
                )}

                {/* ── CONFIRMED ── */}
                {status === "confirmed" && (
                  <motion.div
                    key="confirmed"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="py-8 flex flex-col items-center justify-center gap-4 text-center"
                  >
                    <div className="w-14 h-14 rounded-[12px] bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center">
                      <CheckCircle2 size={30} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#10251C] dark:text-[#F3F1E8] font-heading">Ride Confirmed!</h3>
                      <p className="text-[#696B64] dark:text-[#929D93] text-xs font-medium mt-1 max-w-xs">
                        Your driver is en route to pickup point. Live telemetry active.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { window.location.href = `/ride/${bookingId}`; }}
                      className="mt-2 flex items-center gap-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-[8px] transition cursor-pointer"
                    >
                      <span>Track Your Ride</span>
                      <ArrowRight size={15} />
                    </button>
                  </motion.div>
                )}

                {/* ── CANCELLED ── */}
                {status === "cancelled" && (
                  <motion.div
                    key="cancelled"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="py-8 flex flex-col items-center justify-center gap-4 text-center"
                  >
                    <div className="w-14 h-14 rounded-[12px] bg-[#FAF7F0] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] flex items-center justify-center text-[#10251C] dark:text-[#F3F1E8]">
                      <XCircle size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#10251C] dark:text-[#F3F1E8] font-heading">Booking Cancelled</h3>
                      <p className="text-[#696B64] dark:text-[#929D93] text-xs font-medium mt-1">Your ride request has been cancelled.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="min-h-[44px] flex items-center justify-center gap-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-[8px] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
                    >
                      <RotateCcw size={13} />
                      <span>Book Again</span>
                    </button>
                  </motion.div>
                )}

                {/* ── REJECTED ── */}
                {status === "rejected" && (
                  <motion.div
                    key="rejected"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="py-8 flex flex-col items-center justify-center gap-4 text-center"
                  >
                    <div className="w-14 h-14 rounded-[12px] bg-[#FAF7F0] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] flex items-center justify-center text-[#E34222] dark:text-[#E06A50]">
                      <XCircle size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#10251C] dark:text-[#F3F1E8] font-heading">Request Declined</h3>
                      <p className="text-[#696B64] dark:text-[#929D93] text-xs font-medium mt-1">Nearby driver was unavailable. Try requesting again.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="min-h-[44px] flex items-center justify-center gap-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-[8px] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
                    >
                      <RotateCcw size={13} />
                      <span>Try Again</span>
                    </button>
                  </motion.div>
                )}

                {/* ── EXPIRED ── */}
                {status === "expired" && (
                  <motion.div
                    key="expired"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="py-8 flex flex-col items-center justify-center gap-4 text-center"
                  >
                    <div className="w-14 h-14 rounded-[12px] bg-[#FAF7F0] dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <AlertCircle size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#10251C] dark:text-[#F3F1E8] font-heading">Request Timed Out</h3>
                      <p className="text-[#696B64] dark:text-[#929D93] text-xs font-medium mt-1">No driver accepted within 2 minutes. Please try again.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="min-h-[44px] flex items-center justify-center gap-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-[8px] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
                    >
                      <RotateCcw size={13} />
                      <span>Try Again</span>
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>

          {/* Footer trust badge */}
          <div className="flex items-center justify-center gap-2 py-3 bg-[#FAF7F0] dark:bg-[#17211B] border-t border-[#DED7CA] dark:border-[#34443A]">
            <ShieldCheck size={13} className="text-[#696B64] dark:text-[#929D93]" />
            <span className="text-[#696B64] dark:text-[#929D93] text-[10px] font-bold uppercase tracking-wider">
              Secure & Verified Booking · GPS Tracked
            </span>
          </div>
        </div>
      </div>

      {/* Auth Modal for Quick Login on Checkout */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Dedicated Woman Driver Availability Modal */}
      <NoWomenDriversModal
        isOpen={noWomenDrivers}
        onClose={() => setNoWomenDrivers(false)}
        onKeepSearching={() => {
          setNoWomenDrivers(false);
          handleCreateBooking({ overridePreference: "woman", overrideRadius: 10 });
        }}
        onSearchWiderArea={() => {
          setNoWomenDrivers(false);
          handleCreateBooking({ overridePreference: "woman", overrideRadius: 25 });
        }}
        onSwitchToAnyDriver={() => {
          setNoWomenDrivers(false);
          setDriverPreference("any");
          handleCreateBooking({ overridePreference: "any", overrideRadius: 10 });
        }}
      />
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