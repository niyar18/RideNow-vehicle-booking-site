"use client";



import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, MapPin, Navigation,
  Bike, Car, Truck, LocateFixed, Phone,
  CheckCircle2, ChevronRight, GraduationCap,
  Plus, X, Users, Clock, Calendar,
  Search, Edit2, Info, ChevronDown, ChevronUp,
  User, UserPlus, Check, Package, Sparkles, SlidersHorizontal, AlertTriangle, Loader2,
  Plane, Train, Building2, HeartPulse, AlertCircle, RotateCcw,
  Zap, ArrowDownUp, Settings, FileText, GripVertical,
  LogIn
} from "lucide-react";
import { HomeIcon } from "@/shared/components/icons/AppIcons";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import nextDynamic from "next/dynamic";
import { useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { RootState } from "@/redux/store";
import useGetMe from "@/shared/hooks/useGetMe";
import AuthModal from "@/features/auth/components/AuthModal";
import { calculateFareBreakdown } from "@/lib/fareEngine";
import { haversineKm as getHaversineDistance, DEFAULT_ROAD_TORTUOSITY_FACTOR } from "@/lib/routeUtils";
import { validateServiceArea, getRecentDestinations, saveRecentDestination, RecentLocation } from "@/lib/serviceArea";
import { useTranslation } from "@/context/LanguageContext";
import FamilyRiderSelector from "@/features/booking/components/FamilyRiderSelector";
import StudentPassModal from "@/features/booking/components/StudentPassModal";
import ScheduleRidePicker from "@/features/booking/components/ScheduleRidePicker";
import WaypointsManager from "@/features/booking/components/WaypointsManager";
import ActiveRideBanner from "@/features/rides/components/ActiveRideBanner";
import {
  VEHICLE_OPTIONS,
  PASSENGER_VEHICLES,
  LOGISTICS_VEHICLES,
  VehicleType,
  ServiceMode,
  recommendVehicle,
  VehicleOption,
} from "@/lib/vehicleConfig";

const RouteMap = nextDynamic(() => import("@/features/maps/components/RouteMap"), { ssr: false });

type Place = {
  id: string;
  name: string;
  title?: string;
  subtitle?: string;
  category?: string;
  lat?: number;
  lng?: number;
  countrycode?: string;
  locality?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  distanceKm?: number;
};

import { VEHICLE_SVG_ICONS } from "@/shared/components/VehicleIcons";

const VEHICLE_ICONS: Record<VehicleType, any> = {
  scooty: VEHICLE_SVG_ICONS.scooty,
  bike: VEHICLE_SVG_ICONS.bike,
  auto: VEHICLE_SVG_ICONS.auto,
  mini: VEHICLE_SVG_ICONS.mini,
  car: VEHICLE_SVG_ICONS.car,
  priority: VEHICLE_SVG_ICONS.priority,
  loading: VEHICLE_SVG_ICONS.loading,
  truck: VEHICLE_SVG_ICONS.truck,
};

const getCategoryIcon = (category?: string, name?: string) => {
  const c = (category || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (c.includes("aeroway") || c.includes("airport") || n.includes("airport") || n.includes("aerodrome")) return "✈️";
  if (c.includes("station") || c.includes("railway") || n.includes("station") || n.includes("train")) return "🚆";
  if (c.includes("subway") || c.includes("metro") || n.includes("metro")) return "🚇";
  if (c.includes("bus") || n.includes("bus") || n.includes("isbt") || n.includes("stand")) return "📍";
  if (c.includes("hospital") || c.includes("clinic") || c.includes("health") || n.includes("hospital") || n.includes("pharmacy")) return "🏥";
  if (c.includes("university") || c.includes("college") || c.includes("school") || n.includes("college") || n.includes("university") || n.includes("institute")) return "🎓";
  if (c.includes("shop") || c.includes("mall") || c.includes("supermarket") || n.includes("mall") || n.includes("bazaar") || n.includes("market")) return "🛍️";
  if (c.includes("hotel") || n.includes("hotel") || n.includes("resort") || n.includes("inn")) return "🏨";
  if (c.includes("restaurant") || n.includes("restaurant") || n.includes("dhaba") || n.includes("cafe")) return "🍽️";
  return "📍";
};

const getCategoryBadgeStyle = (category?: string, name?: string) => {
  const c = (category || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (c.includes("airport") || n.includes("airport")) return "bg-sky-50 text-sky-700 border-sky-200/80";
  if (c.includes("station") || c.includes("railway") || c.includes("metro") || n.includes("station") || n.includes("train")) return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
  if (c.includes("bus") || n.includes("bus") || n.includes("isbt")) return "bg-blue-50 text-blue-700 border-blue-200/80";
  if (c.includes("hospital") || c.includes("clinic") || n.includes("hospital")) return "bg-rose-50 text-rose-700 border-rose-200/80";
  if (c.includes("university") || c.includes("college") || c.includes("school") || n.includes("college")) return "bg-amber-50 text-amber-700 border-amber-200/80";
  if (c.includes("mall") || c.includes("market") || c.includes("shop") || n.includes("mall")) return "bg-purple-50 text-purple-700 border-purple-200/80";
  if (c.includes("hotel") || n.includes("hotel")) return "bg-teal-50 text-teal-700 border-teal-200/80";
  if (c.includes("restaurant") || n.includes("restaurant")) return "bg-orange-50 text-orange-700 border-orange-200/80";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
};

/** Single source of truth for per-vehicle distance bounds (km). */
const VEHICLE_DISTANCE_LIMITS: Record<string, { minDistance: number; maxDistance: number }> = {
  bike:    { minDistance: 0, maxDistance: 15 },
  auto:    { minDistance: 0, maxDistance: 30 },
  car:     { minDistance: 0, maxDistance: 500 }, // intercity up to 500 km
  loading: { minDistance: 0, maxDistance: 250 },
  truck:   { minDistance: 0, maxDistance: 500 },
};

export default function BookPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const { data: session, status: sessionStatus } = useSession();
  const { userData } = useSelector((state: RootState) => state.user);
  useGetMe(true);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const pendingCheckoutRef = useRef(false);

  const isAuthenticated = Boolean(userData || session?.user);

  // Prompt unauthenticated users to sign in when opening the booking page
  useEffect(() => {
    if (sessionStatus === "unauthenticated" && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [sessionStatus, isAuthenticated]);

  // Seamless checkout transition if sign-in occurred right after clicking confirm
  useEffect(() => {
    if (pendingCheckoutRef.current && (userData || session?.user)) {
      pendingCheckoutRef.current = false;
      setShowAuthModal(false);
      router.push("/checkout");
    }
  }, [userData, session?.user, router]);

  const [pickup,   setPickup]   = useState("");
  const [drop,     setDrop]     = useState("");
  const [pickupDetails, setPickupDetails] = useState<any | null>(null);
  const [dropDetails, setDropDetails] = useState<any | null>(null);
  const [mapSelectionMode, setMapSelectionMode] = useState<"none" | "pickup" | "drop">("none");
  const [showServiceUnavailableModal, setShowServiceUnavailableModal] = useState(false);
  const [serviceUnavailableMessage, setServiceUnavailableMessage] = useState("");

  const [vehicle,  setVehicle]  = useState<VehicleType>("car");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("passenger");
  const [mobile,   setMobile]   = useState("");

  /* ── GOODS TRANSPORT (LOGISTICS) CARGO STATE ── */
  const [cargoType, setCargoType] = useState<string>("Boxes & Cartons");
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(100);
  const [receiverContact, setReceiverContact] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");

  /* ── SMART VEHICLE MATCHING STATE ── */
  const [showSmartMatcher, setShowSmartMatcher] = useState<boolean>(false);
  const [smartPassengers, setSmartPassengers] = useState<number>(1);
  const [smartLuggage, setSmartLuggage] = useState<"none" | "small" | "large">("none");
  const [smartPreference, setSmartPreference] = useState<"budget" | "comfort">("budget");
  const [smartMatchResult, setSmartMatchResult] = useState<{ vehicleId: VehicleType; matchScore: number; reason: string } | null>(null);

  useEffect(() => {
    if (showSmartMatcher) {
      const rec = recommendVehicle({
        passengers: smartPassengers,
        luggage: smartLuggage,
        preference: smartPreference,
        isGoods: serviceMode === "logistics",
        cargoWeightKg,
      });
      setSmartMatchResult(rec);
    } else {
      setSmartMatchResult(null);
    }
  }, [showSmartMatcher, smartPassengers, smartLuggage, smartPreference, serviceMode, cargoWeightKg]);

  const [rates, setRates] = useState<any>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [activeExistingRide, setActiveExistingRide] = useState<any | null>(null);

  /* ── SEARCH & UI STATE ── */
  const [activeSearchField, setActiveSearchField] = useState<"pickup" | "drop" | null>(null);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [showFareReceipt, setShowFareReceipt] = useState(false);
  const [mobileSheetState, setMobileSheetState] = useState<"down" | "half" | "up">("half");
  const mobileSheetExpanded = mobileSheetState === "up";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* ── STUDENT MODE STATE ── */
  const [isStudent, setIsStudent] = useState<boolean>(false);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);

  /* ── FAMILY ACCOUNT & RIDER CONTACT STATE ── */
  const [familyAccount, setFamilyAccount] = useState<any>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<any | null>(null);

  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const res = await fetch("/api/user/family");
        const data = await res.json();
        if (data.success && data.family) {
          setFamilyAccount(data.family);
        }
      } catch (err) {
        console.error("Failed to load family account:", err);
      }
    };
    fetchFamily();
  }, []);

  const handleSelectRider = (member: any | null) => {
    setSelectedFamilyMember(member);
    if (member?.phone) {
      const cleaned = member.phone.replace(/\D/g, "");
      const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
      setMobile(tenDigits);
    } else if (!member && userData?.mobileNumber) {
      const cleaned = userData.mobileNumber.replace(/\D/g, "");
      const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
      setMobile(tenDigits);
    }
  };

  useEffect(() => {
    if (userData?.mobileNumber && !mobile) {
      const cleaned = userData.mobileNumber.replace(/\D/g, "");
      const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
      setMobile(tenDigits);
    }
    if (userData?.isStudent !== undefined) {
      setIsStudent(Boolean(userData.isStudent));
      setStudentDetails((userData as any).studentDetails || null);
    }
  }, [userData]);

  /* ── SCHEDULED RIDE (ADVANCE BOOKING) STATE ── */
  const [bookingMode, setBookingMode] = useState<"now" | "schedule">("now");

  const getDefaultScheduledTime = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const minutes = d.getMinutes();
    const rounded = Math.ceil(minutes / 15) * 15;
    d.setMinutes(rounded);
    d.setSeconds(0);
    d.setMilliseconds(0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [scheduledDateTime, setScheduledDateTime] = useState<string>(getDefaultScheduledTime());

  const getMinScheduledDateTime = () => {
    const minD = new Date(Date.now() + 30 * 60 * 1000);
    const tzOffset = minD.getTimezoneOffset() * 60000;
    return new Date(minD.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const getMaxScheduledDateTime = () => {
    const maxD = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tzOffset = maxD.getTimezoneOffset() * 60000;
    return new Date(maxD.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const formatEtaTime = (etaMinutesStr: string) => {
    const match = etaMinutesStr.match(/\d+/);
    const minutes = match ? parseInt(match[0], 10) : 3;
    const d = new Date(Date.now() + minutes * 60000);
    let hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    return `${hours}:${mins}${ampm} · ${minutes} min`;
  };

  const isScheduleValid = bookingMode === "now" || (
    Boolean(scheduledDateTime) &&
    new Date(scheduledDateTime).getTime() >= Date.now() + 25 * 60 * 1000
  );

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch(`/api/vehicles/pricing?t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.success && data.rates) {
          setRates(data.rates);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic rates:", err);
      }
    };
    fetchRates();
  }, []);

  const estimateFare = (type: string, distanceKm: number) => {
    const bd = calculateFareBreakdown(type, distanceKm, rates, undefined, 0, isStudent);
    return bd.totalFare;
  };

  const checkLimit = (type: string, dist: number) => {
    const cfg = (rates?.[type.toLowerCase()] ?? VEHICLE_DISTANCE_LIMITS[type.toLowerCase()]) ?? VEHICLE_DISTANCE_LIMITS.car;
    const min = cfg.minDistance ?? 0;
    const max = type.toLowerCase() === "car" ? 500 : (cfg.maxDistance ?? 9999);
    return dist >= min && dist <= max;
  };

  const [pickupResults, setPickupResults] = useState<Place[]>([]);
  const [dropResults,   setDropResults]   = useState<Place[]>([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDrop,   setIsSearchingDrop]   = useState(false);
  const [pickupCountry, setPickupCountry] = useState<string | null>("in");

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropLat,   setDropLat]   = useState<number | null>(null);
  const [dropLng,   setDropLng]   = useState<number | null>(null);
  const [locating,  setLocating]  = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationSettingsGuide, setShowLocationSettingsGuide] = useState(false);
  const [recentDestinations, setRecentDestinations] = useState<RecentLocation[]>([]);
  const [vehicles,  setVehicles]  = useState<any[]>([]);

  useEffect(() => {
    setRecentDestinations(getRecentDestinations());
  }, []);

  /* ── SMART PICKUP STATE ── */
  const [smartPickups, setSmartPickups] = useState<any[]>([]);
  const [selectedSmartPickup, setSelectedSmartPickup] = useState<any | null>(null);

  useEffect(() => {
    if (!pickupLat || !pickupLng) {
      setSmartPickups([]);
      setSelectedSmartPickup(null);
      return;
    }
    const fetchSmartPickups = async () => {
      try {
        const res = await fetch(`/api/places/smart-pickups?lat=${pickupLat}&lng=${pickupLng}`);
        const data = await res.json();
        if (data.success && data.spots) {
          setSmartPickups(data.spots);
        }
      } catch (err) {
        console.error("Smart pickups fetch error:", err);
      }
    };
    fetchSmartPickups();
  }, [pickupLat, pickupLng]);

  const handleSelectSmartPickup = (spot: any) => {
    setPickupLat(spot.lat);
    setPickupLng(spot.lng);
    setPickup(`${spot.venueName} - ${spot.spotName}`);
    setSelectedSmartPickup(spot);
    setPickupResults([]);
  };

  /* ── MULTI-STOP TRIP STATE ── */
  type StopItem = {
    id: string;
    address: string;
    lat: number | null;
    lng: number | null;
    results: Place[];
  };
  const [stops, setStops] = useState<StopItem[]>([]);

  const handleAddStop = () => {
    if (stops.length >= 2) return;
    setStops(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        address: "",
        lat: null,
        lng: null,
        results: [],
      },
    ]);
  };

  const handleRemoveStop = (id: string) => {
    setStops(prev => prev.filter(s => s.id !== id));
  };

  const handleStopChange = (id: string, value: string) => {
    setStops(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        return { ...s, address: value, lat: null, lng: null };
      })
    );
    if (!value || value.trim().length < 2) {
      setStops(prev => prev.map(s => (s.id === id ? { ...s, results: [] } : s)));
    } else {
      debouncedSearchAddress(
        "stop-" + id,
        value,
        (res) => {
          setStops(prev => prev.map(s => (s.id === id ? { ...s, results: res } : s)));
        },
        pickupCountry || "in"
      );
    }
  };

  const selectStopPlace = async (stopId: string, p: Place) => {
    if (typeof p.lat === "number" && typeof p.lng === "number") {
      setStops(prev =>
        prev.map(s =>
          s.id === stopId
            ? {
                ...s,
                address: p.title || p.name,
                lat: p.lat!,
                lng: p.lng!,
                results: [],
              }
            : s
        )
      );
      return;
    }

    try {
      const res = await fetch(`/api/places?action=details&placeId=${p.id}`);
      const data = await res.json();
      if (data.status === "OK" && data.result) {
        const result = data.result;
        setStops(prev =>
          prev.map(s =>
            s.id === stopId
              ? {
                  ...s,
                  address: result.formatted_address || p.name,
                  lat: result.geometry.location.lat,
                  lng: result.geometry.location.lng,
                  results: [],
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Error fetching stop place details:", err);
    }
  };

  const handleReorderWaypoint = (fromIdx: number, toIdx: number) => {
    const currentPoints = [
      {
        address: pickup,
        lat: pickupLat,
        lng: pickupLng,
        country: pickupCountry,
        details: pickupDetails,
      },
      ...stops.map((s) => ({
        id: s.id,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        country: pickupCountry,
        details: null,
      })),
      {
        address: drop,
        lat: dropLat,
        lng: dropLng,
        country: pickupCountry,
        details: dropDetails,
      },
    ];

    if (fromIdx < 0 || fromIdx >= currentPoints.length || toIdx < 0 || toIdx >= currentPoints.length || fromIdx === toIdx) return;

    const nextPoints = [...currentPoints];
    const [moved] = nextPoints.splice(fromIdx, 1);
    nextPoints.splice(toIdx, 0, moved);

    const newPickup = nextPoints[0];
    const newDrop = nextPoints[nextPoints.length - 1];
    const newStops = nextPoints.slice(1, nextPoints.length - 1);

    setPickup(newPickup.address || "");
    setPickupLat(newPickup.lat);
    setPickupLng(newPickup.lng);
    setPickupCountry(newPickup.country || "in");
    setPickupDetails(newPickup.details || null);

    setDrop(newDrop.address || "");
    setDropLat(newDrop.lat);
    setDropLng(newDrop.lng);
    setDropDetails(newDrop.details || null);

    setStops(
      newStops.map((s, idx) => ({
        id: (s as any).id || `stop-${idx}-${Date.now()}`,
        address: s.address || "",
        lat: s.lat,
        lng: s.lng,
        results: [],
      }))
    );

    setPickupResults([]);
    setDropResults([]);
  };

  const handleMoveStopUp = (stopIdx: number) => {
    handleReorderWaypoint(1 + stopIdx, stopIdx);
  };

  const handleMoveStopDown = (stopIdx: number) => {
    handleReorderWaypoint(1 + stopIdx, 2 + stopIdx);
  };

  const handleSwapLocations = () => {
    if (stops.length > 0) {
      const allAddresses = [pickup, ...stops.map((s) => s.address), drop].reverse();
      const allLats = [pickupLat, ...stops.map((s) => s.lat), dropLat].reverse();
      const allLngs = [pickupLng, ...stops.map((s) => s.lng), dropLng].reverse();

      setPickup(allAddresses[0] || "");
      setPickupLat(allLats[0] || null);
      setPickupLng(allLngs[0] || null);

      setDrop(allAddresses[allAddresses.length - 1] || "");
      setDropLat(allLats[allAddresses.length - 1] || null);
      setDropLng(allLngs[allAddresses.length - 1] || null);

      const updatedStops = stops.map((s, idx) => ({
        ...s,
        address: allAddresses[idx + 1] || "",
        lat: allLats[idx + 1] || null,
        lng: allLngs[idx + 1] || null,
        results: [],
      }));
      setStops(updatedStops);
    } else {
      const prevPickup = pickup;
      const prevLat = pickupLat;
      const prevLng = pickupLng;
      const prevDetails = pickupDetails;

      setPickup(drop);
      setPickupLat(dropLat);
      setPickupLng(dropLng);
      setPickupDetails(dropDetails);

      setDrop(prevPickup);
      setDropLat(prevLat);
      setDropLng(prevLng);
      setDropDetails(prevDetails);
    }
    setPickupResults([]);
    setDropResults([]);
  };

  const getMultiStopHaversineDistance = () => {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) return null;
    let total = 0;
    const validStops = stops.filter(s => s.lat !== null && s.lng !== null);
    const pts: [number, number][] = [
      [pickupLat, pickupLng],
      ...validStops.map(s => [s.lat!, s.lng!] as [number, number]),
      [dropLat, dropLng],
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      total += getHaversineDistance(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    }
    return Number(total.toFixed(1));
  };

  /* ── MEMOIZED GEOMETRIES (FROM NIYAR18 PERF COMMIT 595564b) ── */
  const validStopsForMap = useMemo(() => {
    return stops
      .filter((s) => s.lat !== null && s.lng !== null)
      .map((s) => ({ address: s.address, lat: s.lat!, lng: s.lng! }));
  }, [stops]);

  const memoizedPickupCoords = useMemo<[number, number] | null>(
    () => (pickupLat && pickupLng ? [pickupLat, pickupLng] : null),
    [pickupLat, pickupLng]
  );

  const memoizedDropCoords = useMemo<[number, number] | null>(
    () => (dropLat && dropLng ? [dropLat, dropLng] : null),
    [dropLat, dropLng]
  );

  const getDistanceValidity = () => {
    if (pickupLat && pickupLng) {
      const pCheck = validateServiceArea(pickupLat, pickupLng);
      if (!pCheck.isSupported) {
        return {
          valid: false,
          isServiceUnavailable: true,
          message: `Pickup area: ${pCheck.message || "Outside operational bounds"}`
        };
      }
    }
    if (dropLat && dropLng) {
      const dCheck = validateServiceArea(dropLat, dropLng);
      if (!dCheck.isSupported) {
        return {
          valid: false,
          isServiceUnavailable: true,
          message: `Drop area: ${dCheck.message || "Outside operational bounds"}`
        };
      }
    }

    if (routeDistance === -1) {
      return {
        valid: false,
        isServiceUnavailable: true,
        message: "No rides available (no road connection found)"
      };
    }
    const dist = (routeDistance !== null && routeDistance >= 0)
      ? routeDistance
      : ((pickupLat && pickupLng && dropLat && dropLng) ? getHaversineDistance(pickupLat, pickupLng, dropLat, dropLng) : null);

    if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicle || dist === null) return { valid: true };

    if (dist > 500) {
      return {
        valid: false,
        isServiceUnavailable: true,
        message: "Route exceeds maximum 500 km intercity coverage area. Please adjust your destination."
      };
    }

    // For Bike / Auto: If distance > 100 km, prompt switch to RideNow Intercity Car
    if (dist > 100 && (vehicle === "bike" || vehicle === "auto")) {
      return {
        valid: false,
        isIntercityPrompt: true,
        message: "Distance exceeds 100 km. Please select RideNow Intercity (Car/SUV) for outstation travel."
      };
    }

    const cfg = (rates?.[vehicle.toLowerCase()] ?? VEHICLE_DISTANCE_LIMITS[vehicle.toLowerCase()]) ?? VEHICLE_DISTANCE_LIMITS.car;
    const min = cfg.minDistance ?? 0;
    const max = vehicle === "car" ? 500 : (cfg.maxDistance ?? 9999);
    
    if (dist < min) {
      return { valid: false, message: `${VEHICLE_OPTIONS[vehicle]?.label || "Vehicle"} requires min ${min} km (Current: ${dist.toFixed(1)} km)` };
    }
    if (dist > max) {
      return {
        valid: false,
        isServiceUnavailable: dist > 100,
        message: dist > 100
          ? "Service not available for this vehicle type for long distance. Please select RideNow Intercity."
          : `${VEHICLE_OPTIONS[vehicle]?.label || "Vehicle"} is limited to max ${max} km`
      };
    }
    return { valid: true };
  };

  const allStopsValid = stops.every(s => s.address.trim().length > 0 && s.lat !== null && s.lng !== null);
  const distanceValidity = getDistanceValidity();
  const canContinue = !!(
    !activeExistingRide &&
    pickup &&
    drop &&
    vehicle &&
    mobile.length === 10 &&
    pickupLat &&
    pickupLng &&
    dropLat &&
    dropLng &&
    allStopsValid &&
    distanceValidity.valid &&
    routeDistance !== -1 &&
    isScheduleValid
  );

  /* ── AUTOCOMPLETE SEARCH WITH 260ms DEBOUNCE & LIVE LOADING STATE ── */
  const searchDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  const debouncedSearchAddress = (
    key: string,
    q: string,
    setResults: (r: Place[]) => void,
    restrict?: string | null
  ) => {
    if (searchDebounceRef.current[key]) {
      clearTimeout(searchDebounceRef.current[key]);
    }
    if (!q || q.trim().length < 2) {
      setResults([]);
      if (key === "pickup") setIsSearchingPickup(false);
      else setIsSearchingDrop(false);
      return;
    }
    if (key === "pickup") setIsSearchingPickup(true);
    else setIsSearchingDrop(true);

    searchDebounceRef.current[key] = setTimeout(async () => {
      try {
        await searchAddress(q, setResults, restrict);
      } finally {
        if (key === "pickup") setIsSearchingPickup(false);
        else setIsSearchingDrop(false);
      }
    }, 260);
  };

  const searchAddress = async (q: string, setResults: (r: Place[]) => void, restrict?: string | null) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    try {
      const countryFilter = restrict || pickupCountry || "in";
      let url = `/api/places?action=autocomplete&input=${encodeURIComponent(q.trim())}&country=${countryFilter}`;
      
      // Pass soft proximity bias so nearby places rank first without restricting distant destinations
      if (pickupLat !== null && pickupLng !== null) {
        url += `&lat=${pickupLat}&lng=${pickupLng}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === "OK" && Array.isArray(data.predictions)) {
        const results: Place[] = data.predictions.map((p: any) => ({
          id: p.place_id,
          name: p.description,
          title: p.title || p.description,
          subtitle: p.subtitle,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
          countrycode: p.countrycode,
          locality: p.locality,
          city: p.city,
          state: p.state,
          postalCode: p.postalCode,
          distanceKm: p.distanceKm,
        }));
        setResults(results);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Autocomplete error:", err);
      setResults([]);
    }
  };

  const selectPlace = async (p: Place, isPickup: boolean) => {
    let lat = p.lat;
    let lng = p.lng;
    let formattedAddress = p.subtitle ? `${p.title || p.name}, ${p.subtitle}` : (p.title || p.name);
    let locality = p.locality || "";
    let city = p.city || "";
    let state = p.state || "";
    let postalCode = p.postalCode || "";
    let countrycode = p.countrycode || "in";
    let name = p.title || p.name.split(",")[0];

    // 1. If place ID exists and isn't a synthetic chip, fetch authoritative details
    if (p.id && !p.id.startsWith("recent-") && !p.id.startsWith("chip-")) {
      try {
        const res = await fetch(`/api/places?action=details&placeId=${p.id}`);
        const data = await res.json();
        if (data.status === "OK" && data.result) {
          const result = data.result;
          if (result.formatted_address) formattedAddress = result.formatted_address;
          if (result.name) name = result.name;
          if (result.geometry?.location) {
            lat = result.geometry.location.lat;
            lng = result.geometry.location.lng;
          }
          if (result.locality) locality = result.locality;
          if (result.city) city = result.city;
          if (result.state) state = result.state;
          if (result.postalCode) postalCode = result.postalCode;
          if (result.address_components) {
            const countryComp = result.address_components.find((c: any) => c.types.includes("country"));
            if (countryComp) countrycode = String(countryComp.short_name || "in").toLowerCase();
          }
        }
      } catch (err) {
        console.error("Error fetching place details:", err);
      }
    }

    // 2. If coordinates exist but components are sparse (like from Photon autocomplete),
    // enrich via reverse geocode just like pin location selection does!
    if (typeof lat === "number" && typeof lng === "number" && (!city || !state || !postalCode)) {
      try {
        const enrichRes = await fetch(`/api/places?action=geocode&lat=${lat}&lng=${lng}`);
        const enrichData = await enrichRes.json();
        if (enrichData?.results?.length) {
          const first = enrichData.results[0];
          if (!formattedAddress || !formattedAddress.includes(",")) {
            formattedAddress = first.formatted_address || formattedAddress;
          }
          if (first.locality && !locality) locality = first.locality;
          if (first.city && !city) city = first.city;
          if (first.state && !state) state = first.state;
          if (first.postalCode && !postalCode) postalCode = first.postalCode;
          if (first.address_components) {
            const countryComp = first.address_components.find((c: any) => c.types.includes("country"));
            if (countryComp) countrycode = String(countryComp.short_name || "in").toLowerCase();
          }
        }
      } catch (e) {
        // Fallback gracefully
      }
    }

    if (typeof lat === "number" && typeof lng === "number") {
      const structuredDetails = {
        name,
        formattedAddress,
        locality,
        city,
        state,
        postalCode,
        countrycode,
        coordinates: [lat, lng] as [number, number],
      };

      saveRecentDestination({
        name: formattedAddress,
        subtitle: p.subtitle,
        lat,
        lng,
      });
      setRecentDestinations(getRecentDestinations());

      if (isPickup) {
        setPickup(formattedAddress);
        setPickupCountry(countrycode);
        setPickupLat(lat);
        setPickupLng(lng);
        setPickupDetails(structuredDetails);
        setPickupResults([]);
      } else {
        setDrop(formattedAddress);
        setDropLat(lat);
        setDropLng(lng);
        setDropDetails(structuredDetails);
        setDropResults([]);
      }
    }

    setActiveSearchField(null);
    setIsEditingRoute(false);
  };

  const handleGeolocationSuccess = async (coords: GeolocationCoordinates) => {
    const lat = coords.latitude;
    const lng = coords.longitude;

    setLocationError(null);
    setUserCoords([lat, lng]);
    setPickupLat(lat);
    setPickupLng(lng);
    setPickupResults([]);

    try {
      const res = await fetch(`/api/places?action=geocode&lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data?.results?.length) {
        const first = data.results[0];
        const addr = first.formatted_address || `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        let countryCode = "in";
        if (first.address_components) {
          const countryComp = first.address_components.find((c: any) => c.types.includes("country"));
          if (countryComp) {
            countryCode = String(countryComp.short_name || "in").toLowerCase();
          }
        }
        const structuredDetails = {
          name: first.name || addr.split(",")[0] || "Current Location",
          formattedAddress: addr,
          locality: first.locality || "",
          city: first.city || "",
          state: first.state || "",
          postalCode: first.postalCode || "",
          countrycode: countryCode,
          coordinates: [lat, lng] as [number, number],
        };
        setPickup(addr);
        setPickupCountry(countryCode);
        setPickupDetails(structuredDetails);
      } else {
        const fallbackAddr = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setPickup(fallbackAddr);
        setPickupCountry("in");
        setPickupDetails({
          name: "Current Location",
          formattedAddress: fallbackAddr,
          coordinates: [lat, lng],
        });
      }
    } catch (err) {
      console.error("Failed to reverse geocode current location:", err);
      const fallbackAddr = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setPickup(fallbackAddr);
      setPickupDetails({
        name: "Current Location",
        formattedAddress: fallbackAddr,
        coordinates: [lat, lng],
      });
    } finally {
      setLocating(false);
    }
  };

  const handleGeolocationError = (err: GeolocationPositionError) => {
    let msg = "Could not retrieve current location. Please select manually.";
    if (err.code === 1) {
      msg = "Location permission denied. Please allow location access or pick on map.";
    } else if (err.code === 2) {
      msg = "GPS signal unavailable. Please ensure location services are enabled.";
    } else if (err.code === 3) {
      msg = "Location request timed out. Please try again or search manually.";
    }
    setLocationError(msg);
    setLocating(false);
  };

  const locateCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationError(null);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => handleGeolocationSuccess(coords),
      (err) => {
        console.warn("High accuracy geolocation failed, attempting standard accuracy:", err);
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => handleGeolocationSuccess(coords),
          (err2) => {
            console.error("Standard geolocation failed:", err2);
            handleGeolocationError(err2);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  };

  const resetAllTripData = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("ridenow_booking_draft");
        localStorage.removeItem("ridenow_booking_draft");
      } catch (_) {}
    }
    setDrop("");
    setDropLat(null);
    setDropLng(null);
    setDropDetails(null);
    setDropResults([]);
    setStops([]);
    setRouteDistance(null);
    setSelectedSmartPickup(null);
    setSelectedFamilyMember(null);
    locateCurrentLocation();
  };

  /* ── HELPER: GEOCODE TEXT ADDRESS TO COORDINATES ── */
  const geocodeAddressText = async (addressText: string) => {
    try {
      const res = await fetch(`/api/places?action=autocomplete&input=${encodeURIComponent(addressText)}&country=in`);
      const data = await res.json();
      if (data?.predictions && data.predictions.length > 0) {
        const first = data.predictions[0];
        let lat = first.lat;
        let lng = first.lng;
        let formatted = first.subtitle ? `${first.title || first.name || addressText}, ${first.subtitle}` : (first.title || first.name || first.description || addressText);
        if ((lat === undefined || lng === undefined) && first.place_id) {
          const dRes = await fetch(`/api/places?action=details&placeId=${first.place_id}`);
          const dData = await dRes.json();
          if (dData?.result?.geometry?.location) {
            lat = dData.result.geometry.location.lat;
            lng = dData.result.geometry.location.lng;
            if (dData.result.formatted_address) formatted = dData.result.formatted_address;
          }
        }
        if (typeof lat === "number" && typeof lng === "number") {
          return {
            lat,
            lng,
            formatted,
            name: first.title || first.name || addressText,
          };
        }
      }
    } catch (err) {
      console.warn("Could not geocode address string:", addressText, err);
    }
    return null;
  };

  /* ── INITIAL MOUNT: FRESH SESSION VS CHECKOUT EDIT VS HERO SEARCH ── */
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const urlParams = new URLSearchParams(window.location.search);
      const isFresh = urlParams.get("fresh") === "true";

      const raw = sessionStorage.getItem("ridenow_booking_draft") || localStorage.getItem("ridenow_booking_draft");
      let draft: any = null;
      if (raw) {
        try {
          draft = JSON.parse(raw);
        } catch (_) {}
      }

      const rawPickup = (draft?.pickup && draft.pickup !== "Pickup Location") ? draft.pickup : urlParams.get("pickup");
      const rawDrop = (draft?.drop && draft.drop !== "Drop Location") ? draft.drop : urlParams.get("drop");

      // Only clear draft if fresh was explicitly requested AND no location parameters were passed
      if (isFresh && !rawPickup && !rawDrop) {
        try {
          sessionStorage.removeItem("ridenow_booking_draft");
          localStorage.removeItem("ridenow_booking_draft");
        } catch (_) {}
        locateCurrentLocation();
        if (window.location.search) {
          window.history.replaceState({}, "", "/book");
        }
        return;
      }

      const p = rawPickup;
      const d = rawDrop;
      const v = draft?.vehicle || urlParams.get("vehicle");
      const m = draft?.mobileNumber || draft?.mobile || urlParams.get("mobileNumber");
      const pLat = typeof draft?.pickupLat === "number" ? draft.pickupLat : urlParams.get("pickupLat") ? Number(urlParams.get("pickupLat")) : null;
      const pLng = typeof draft?.pickupLng === "number" ? draft.pickupLng : urlParams.get("pickupLng") ? Number(urlParams.get("pickupLng")) : null;
      const dLat = typeof draft?.dropLat === "number" ? draft.dropLat : urlParams.get("dropLat") ? Number(urlParams.get("dropLat")) : null;
      const dLng = typeof draft?.dropLng === "number" ? draft.dropLng : urlParams.get("dropLng") ? Number(urlParams.get("dropLng")) : null;

      if (v) setVehicle(v);
      if (m) setMobile(m);

      const category = draft?.category || urlParams.get("category");
      if (category === "trucks") {
        setServiceMode("logistics");
      }

      if (Array.isArray(draft?.stops) && draft.stops.length > 0) {
        setStops(
          draft.stops.map((s: any, idx: number) => ({
            id: s.id || `stop-${idx}`,
            address: s.address || "",
            lat: typeof s.lat === "number" ? s.lat : null,
            lng: typeof s.lng === "number" ? s.lng : null,
            results: [],
          }))
        );
      }
      if (draft?.smartPickupDetails) setSelectedSmartPickup(draft.smartPickupDetails);
      if (draft?.familyMemberDetails) setSelectedFamilyMember(draft.familyMemberDetails);
      if (draft?.pickupDetails) setPickupDetails(draft.pickupDetails);
      if (draft?.dropDetails) setDropDetails(draft.dropDetails);
      if (draft?.isScheduled || urlParams.get("isScheduled") === "true" || urlParams.get("reserve") === "true") {
        setBookingMode("schedule");
        const sched = draft?.scheduledTime || urlParams.get("scheduledTime");
        if (sched) setScheduledDateTime(sched);
      }

      // 1. Populate pickup if provided
      if (p) {
        setPickup(p);
        if (typeof pLat === "number" && !isNaN(pLat) && typeof pLng === "number" && !isNaN(pLng)) {
          setPickupLat(pLat);
          setPickupLng(pLng);
        } else {
          // Asynchronously resolve coordinates for pickup text
          geocodeAddressText(p).then((res) => {
            if (res) {
              setPickupLat(res.lat);
              setPickupLng(res.lng);
              setPickupDetails({
                name: res.name,
                formattedAddress: res.formatted,
                coordinates: [res.lat, res.lng],
              });
            }
          });
        }
      }

      // 2. Populate drop if provided
      if (d) {
        setDrop(d);
        if (typeof dLat === "number" && !isNaN(dLat) && typeof dLng === "number" && !isNaN(dLng)) {
          setDropLat(dLat);
          setDropLng(dLng);
        } else {
          // Asynchronously resolve coordinates for drop text
          geocodeAddressText(d).then((res) => {
            if (res) {
              setDropLat(res.lat);
              setDropLng(res.lng);
              setDropDetails({
                name: res.name,
                formattedAddress: res.formatted,
                coordinates: [res.lat, res.lng],
              });
            }
          });
        }
      }

      // 3. Complete route based on what was provided:
      if (!p && d) {
        // Drop was provided but no pickup -> auto-complete pickup with user's current GPS location
        locateCurrentLocation();
      } else if (!p && !d) {
        // Neither was provided -> locate user GPS
        locateCurrentLocation();
      } else if (p && !d) {
        // Pickup provided but no drop -> prompt drop input
        setActiveSearchField("drop");
        setIsEditingRoute(true);
      }

      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState({}, "", "/book");
      }
    } catch (e) {
      console.warn("Failed to restore booking draft from storage:", e);
      locateCurrentLocation();
    }
  }, []);

  /* ── FETCH NEARBY VEHICLES ── */
  useEffect(() => {
    if (!pickupLat || !pickupLng) {
      setVehicles([]);
      return;
    }
    const fetchVehicles = async () => {
      try {
        const res = await fetch("/api/vehicles/nearby", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: pickupLat,
            longitude: pickupLng,
            vehicleType: vehicle || undefined
          })
        });
        const data = await res.json();
        if (data.success) setVehicles(data.vehicles);
      } catch (err) {
        console.error(err);
      }
    };
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 15000);
    return () => clearInterval(interval);
  }, [pickupLat, pickupLng, vehicle]);

  const handleMapChange = (
    p: string,
    d: string,
    c1?: [number, number] | null,
    c2?: [number, number] | null,
    countryCode?: string | null,
    p1Details?: any,
    p2Details?: any
  ) => {
    if (p) setPickup(p);
    if (d) setDrop(d);
    if (c1) {
      setPickupLat(c1[0]);
      setPickupLng(c1[1]);
      if (p1Details) {
        setPickupDetails(p1Details);
      } else {
        setPickupDetails((prev: any) => prev || {
          name: p.split(",")[0],
          formattedAddress: p,
          coordinates: [c1[0], c1[1]],
        });
      }
    }
    if (c2) {
      setDropLat(c2[0]);
      setDropLng(c2[1]);
      if (p2Details) {
        setDropDetails(p2Details);
      } else {
        setDropDetails((prev: any) => prev || {
          name: d.split(",")[0],
          formattedAddress: d,
          coordinates: [c2[0], c2[1]],
        });
      }
    }
    if (countryCode) {
      setPickupCountry(countryCode);
    }
  };

  const handleConfirmPinSelection = (
    mode: "pickup" | "drop",
    coords: [number, number],
    address: string,
    details?: any
  ) => {
    const struct = details || {
      name: address.split(",")[0],
      formattedAddress: address,
      coordinates: coords,
    };
    if (mode === "pickup") {
      setPickup(address);
      setPickupLat(coords[0]);
      setPickupLng(coords[1]);
      setPickupDetails(struct);
    } else {
      setDrop(address);
      setDropLat(coords[0]);
      setDropLng(coords[1]);
      setDropDetails(struct);
    }
    setMapSelectionMode("none");
    setActiveSearchField(null);
    setIsEditingRoute(false);
  };

  const handleCoordinatesChange = (c1?: [number, number] | null, c2?: [number, number] | null) => {
    if (c1) {
      setPickupLat(c1[0]);
      setPickupLng(c1[1]);
    }
    if (c2) {
      setDropLat(c2[0]);
      setDropLng(c2[1]);
    }
  };

  const hasRoute = Boolean(pickupLat && pickupLng && dropLat && dropLng);
  const haversineDist =
    getMultiStopHaversineDistance() ||
    (pickupLat && pickupLng && dropLat && dropLng
      ? getHaversineDistance(pickupLat, pickupLng, dropLat, dropLng)
      : null);
  const effectiveDistance = useMemo(() => {
    if (routeDistance !== null && routeDistance > 0) {
      return Number(routeDistance.toFixed(1));
    }
    if (haversineDist !== null && haversineDist > 0) {
      return Number((haversineDist * DEFAULT_ROAD_TORTUOSITY_FACTOR).toFixed(1));
    }
    return 0;
  }, [routeDistance, haversineDist]);

  // Invalidate previous route road distance whenever coordinates change
  useEffect(() => {
    setRouteDistance(null);
  }, [pickupLat, pickupLng, dropLat, dropLng, stops.length]);

  const currentBreakdown = calculateFareBreakdown(vehicle, effectiveDistance, rates, undefined, 0, isStudent);

  const handleConfirmRide = () => {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicle) return;

    const validity = getDistanceValidity();
    if (!validity.valid) {
      if (validity.isServiceUnavailable) {
        setServiceUnavailableMessage(
          validity.message ||
            "No rides available for this route or distance exceeds active coverage area. Try adjusting your pickup or destination."
        );
        setShowServiceUnavailableModal(true);
        return;
      }
      if (validity.isIntercityPrompt) {
        setVehicle("car");
        return;
      }
      setLocationError(validity.message || "Please select a valid route");
      return;
    }

    const estFare = estimateFare(vehicle, effectiveDistance);

    const validStops = stops
      .filter((s) => s.address && s.lat !== null && s.lng !== null)
      .map((s, idx) => ({
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        order: idx + 1,
      }));

    const finalPickupDetails = pickupDetails || {
      name: pickup.split(",")[0],
      formattedAddress: pickup,
      coordinates: [pickupLat, pickupLng],
    };

    const finalDropDetails = dropDetails || {
      name: drop.split(",")[0],
      formattedAddress: drop,
      coordinates: [dropLat, dropLng],
    };

    const draftData = {
      pickup,
      drop,
      vehicle,
      fare: estFare,
      fareBreakdown: currentBreakdown,
      mobileNumber: mobile,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      distanceKm: effectiveDistance,
      pickupDetails: finalPickupDetails,
      dropDetails: finalDropDetails,
      isSmartPickup: Boolean(selectedSmartPickup),
      smartPickupDetails: selectedSmartPickup || null,
      stops: validStops,
      isFamilyRide: Boolean(selectedFamilyMember),
      familyMemberDetails: selectedFamilyMember || null,
      isScheduled: bookingMode === "schedule" && Boolean(scheduledDateTime),
      scheduledTime:
        bookingMode === "schedule" && scheduledDateTime
          ? new Date(scheduledDateTime).toISOString()
          : null,
      serviceMode,
      cargoDetails:
        serviceMode === "logistics"
          ? {
              cargoType,
              cargoWeightKg,
              receiverContact,
              deliveryNotes,
            }
          : null,
    };

    try {
      if (typeof window !== "undefined") {
        const serialized = JSON.stringify(draftData);
        sessionStorage.setItem("ridenow_booking_draft", serialized);
        localStorage.setItem("ridenow_booking_draft", serialized);
      }
    } catch (e) {
      console.warn("booking draft save error:", e);
    }

    if (!userData && !session?.user) {
      pendingCheckoutRef.current = true;
      setShowAuthModal(true);
      return;
    }

    router.push("/checkout");
  };

  /* ── SHARED FORM SECTIONS (REUSABLE ACROSS UNIFIED PANEL) ── */
  const renderLocationInputs = () => (
    <div className="space-y-2.5 relative z-40">
      {locationError && (
        <div className="p-3.5 bg-[#FAF7F0] dark:bg-[#17211B] border border-amber-300 dark:border-amber-700/50 text-[#10251C] dark:text-[#F3F1E8] rounded-[10px] text-xs space-y-2.5 shadow-xs">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-[8px] bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <LocateFixed size={13} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[11px] uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8]">Location Access Needed</p>
                <p className="text-[11px] text-[#696B64] dark:text-[#929D93] leading-snug mt-0.5">
                  Allow location access to auto-detect your pickup point, or update your browser site settings.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocationError(null);
                setShowLocationSettingsGuide(false);
              }}
              aria-label="Dismiss location guidance"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] text-[#696B64] hover:text-[#10251C] dark:hover:text-white transition cursor-pointer flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#DED7CA] dark:border-[#29372E]">
            <button
              type="button"
              onClick={locateCurrentLocation}
              disabled={locating}
              className="min-h-[44px] px-3 py-2 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] text-white text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
            >
              <LocateFixed size={11} className={locating ? "animate-spin" : ""} />
              <span>{locating ? "Detecting..." : "Ask Permission Again"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLocationSettingsGuide(true)}
              className="min-h-[44px] px-3 py-2 rounded-[8px] bg-white dark:bg-[#1E2B23] hover:bg-[#FAF7F0] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#29372E] text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
            >
              <Settings size={11} className="text-[#696B64] dark:text-[#929D93]" />
              <span>Site Settings Guide</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLocationError(null);
                setActiveSearchField(null);
                setMapSelectionMode("pickup");
              }}
              className="min-h-[44px] px-3 py-2 rounded-[8px] bg-transparent hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90C8A8] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              <MapPin size={11} />
              <span>Set on Map</span>
            </button>
          </div>
        </div>
      )}

      {/* Pickup Row */}
      <div className="relative">
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-3.5 py-2 min-h-[46px] focus-within:border-[#123D32] dark:focus-within:border-[#90C8A8] focus-within:ring-2 focus-within:ring-[#123D32]/10 transition-all shadow-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#123D32] dark:bg-[#90C8A8] flex-shrink-0" />
          
          {/* Reorder controls for Pickup */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleReorderWaypoint(0, 1)}
              aria-label="Move pickup below the next stop"
              title="Move pickup down"
              className="min-w-[44px] min-h-[44px] -my-2 flex items-center justify-center rounded-[8px] text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-[#F3F1E8] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <ChevronDown size={12} />
            </button>
            <GripVertical size={12} className="text-[#696B64]/50 dark:text-[#929D93]/50 select-none flex-shrink-0" />
          </div>

          <input
            aria-label="Pickup location"
            value={pickup}
            onFocus={() => setActiveSearchField("pickup")}
            onChange={(e) => {
              setPickup(e.target.value);
              setPickupLat(null);
              setPickupLng(null);
              debouncedSearchAddress("pickup", e.target.value, setPickupResults, pickupCountry || "in");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pickupResults.length > 0) {
                e.preventDefault();
                selectPlace(pickupResults[0], true);
              }
            }}
            placeholder={t("booking.pickup", "Pickup location")}
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-[15px] font-bold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#929D93]/60 outline-none truncate tracking-tight"
          />
          {isSearchingPickup ? (
            <Loader2 size={13} className="animate-spin text-[#696B64] dark:text-[#929D93] flex-shrink-0" />
          ) : pickup ? (
            <button
              type="button"
              onClick={() => {
                setPickup("");
                setPickupLat(null);
                setPickupLng(null);
                setPickupResults([]);
              }}
              aria-label="Clear pickup location"
              className="min-w-[40px] min-h-[40px] rounded-[8px] inline-flex items-center justify-center text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-[#F3F1E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <X size={14} />
            </button>
          ) : null}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={locateCurrentLocation}
            disabled={locating}
            title="Use current location"
            className="w-7 h-7 rounded-[6px] border border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#17211B] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] transition flex items-center justify-center flex-shrink-0 text-[#10251C] dark:text-[#F3F1E8]"
          >
            <LocateFixed size={13} className={`text-[#10251C] dark:text-[#F3F1E8] ${locating ? "animate-spin" : ""}`} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActiveSearchField(null);
              setMapSelectionMode("pickup");
            }}
            title="Choose pickup on map"
            className="w-7 h-7 rounded-[6px] border border-[#123D32] dark:border-[#28664D] bg-[#123D32] dark:bg-[#28664D] text-white hover:bg-[#0D3027] dark:hover:bg-[#347858] transition flex items-center justify-center flex-shrink-0"
          >
            <MapPin size={13} className="text-white" />
          </motion.button>
        </div>

        {/* Pickup Autocomplete Results */}
        <AnimatePresence>
          {activeSearchField === "pickup" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#17211B] border border-zinc-200/90 dark:border-[#34443A] rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-50 divide-y divide-zinc-100 dark:divide-[#34443A]/50 ring-1 ring-black/5"
            >
              {/* Option to set location on interactive map */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setActiveSearchField(null);
                  setMapSelectionMode("pickup");
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left bg-emerald-50/70 dark:bg-[#1D3428] hover:bg-emerald-100/70 dark:hover:bg-[#28664D]/50 text-emerald-950 dark:text-[#90C8A8] transition"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-900 dark:text-[#90C8A8] leading-none">Set pickup point on map</p>
                  <p className="text-[10px] text-emerald-700 dark:text-[#B8C2B8] font-semibold mt-0.5">Move map to pinpoint exact location</p>
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-[#90C8A8] bg-white dark:bg-[#17211B] px-2 py-0.5 rounded-full border border-emerald-200 dark:border-[#28664D] flex-shrink-0">
                  Pinpoint
                </span>
              </button>

              {/* Use current GPS location */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setActiveSearchField(null);
                  locateCurrentLocation();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-[#1E2B23] transition"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-[#1E2B23] text-zinc-800 dark:text-[#F3F1E8] flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-[#34443A]">
                  <LocateFixed size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-[#F3F1E8] leading-none">Current Location (GPS)</p>
                  <p className="text-[10px] text-zinc-500 dark:text-[#929D93] font-medium mt-0.5">Use device geolocation</p>
                </div>
              </button>

              {/* Live search loading feedback */}
              {isSearchingPickup && (
                <div className="flex items-center gap-2.5 px-4 py-3 text-zinc-500 dark:text-[#929D93]">
                  <Loader2 size={14} className="animate-spin text-zinc-700 dark:text-[#B8C2B8] shrink-0" />
                  <span className="text-xs font-semibold">Searching nearby places...</span>
                </div>
              )}

              {/* Suggestions List */}
              {pickupResults.map((p) => {
                const distToPoint =
                  typeof p.distanceKm === "number"
                    ? p.distanceKm
                    : (typeof p.lat === "number" && typeof p.lng === "number" && dropLat && dropLng
                        ? getHaversineDistance(dropLat, dropLng, p.lat, p.lng)
                        : null);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectPlace(p, true);
                    }}
                    className="group flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-[#1E2B23] active:bg-zinc-100 dark:active:bg-[#202B24] transition rounded-xl cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border shadow-2xs transition-transform group-hover:scale-105 ${getCategoryBadgeStyle(p.category, p.title || p.name)}`}>
                      {getCategoryIcon(p.category, p.title || p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-[#F3F1E8] truncate group-hover:text-black dark:group-hover:text-white">
                        {p.title || p.name}
                      </p>
                      {p.subtitle && (
                        <p className="text-[11px] text-zinc-500 dark:text-[#929D93] font-medium truncate mt-0.5">
                          {p.subtitle}
                        </p>
                      )}
                    </div>

                    {distToPoint !== null && (
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-[#B8C2B8] bg-zinc-100/90 dark:bg-[#1E2B23] border border-zinc-200/80 dark:border-[#34443A] px-2 py-0.5 rounded-full flex-shrink-0">
                        {typeof distToPoint === "number" ? distToPoint.toFixed(1) : distToPoint} km
                      </span>
                    )}
                    <ChevronRight size={13} className="text-zinc-300 dark:text-[#34443A] group-hover:text-zinc-500 dark:group-hover:text-[#929D93] transition-colors flex-shrink-0" />
                  </button>
                );
              })}

              {/* No results fallback */}
              {!isSearchingPickup && pickup.trim().length >= 2 && pickupResults.length === 0 && (
                <div className="px-4 py-4 text-center space-y-2">
                  <p className="text-xs font-bold text-zinc-700 dark:text-[#B8C2B8]">No exact places found for &quot;{pickup}&quot;</p>
                  <p className="text-[11px] text-zinc-400 dark:text-[#929D93]">Can&apos;t find your place? Move the pin to pick on the interactive map.</p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveSearchField(null);
                      setMapSelectionMode("pickup");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-[#28664D] text-white text-xs font-bold shadow-xs hover:bg-black dark:hover:bg-[#347858] transition"
                  >
                    <MapPin size={12} />
                    <span>Set pickup on map</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Intermediate Stops */}
      {stops.length > 0 && (
        <WaypointsManager
          stops={stops}
          onAddStop={handleAddStop}
          onRemoveStop={handleRemoveStop}
          onStopChange={handleStopChange}
          onSelectStopPlace={selectStopPlace}
          onMoveStopUp={handleMoveStopUp}
          onMoveStopDown={handleMoveStopDown}
          maxStops={2}
          hideAddButton={true}
        />
      )}

      {/* Unified Route Actions Row: Add Stop + Swap */}
      <div className="flex items-center justify-between px-0.5 py-1 relative z-20">
        {stops.length < 2 ? (
          <button
            type="button"
            onClick={handleAddStop}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-dashed border-[#DED7CA] dark:border-[#34443A] hover:border-[#123D32] dark:hover:border-[#90C8A8] bg-white dark:bg-[#1E2B23] hover:bg-[#FAF7F0] dark:hover:bg-[#17211B] text-[#10251C] dark:text-[#F3F1E8] text-[11px] font-bold tracking-tight transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
          >
            <Plus size={12} className="text-[#10251C] dark:text-[#F3F1E8]" />
            <span>Add stop (max 2)</span>
          </button>
        ) : (
          <span className="text-[10px] font-semibold text-[#696B64] dark:text-[#929D93]">Max 2 stops</span>
        )}

        <div className="h-[1px] bg-[#DED7CA] dark:bg-[#34443A] flex-1 mx-3" />

        <button
          type="button"
          onClick={handleSwapLocations}
          title="Swap pickup and destination"
          aria-label="Swap pickup and destination"
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#1E2B23] hover:bg-[#FAF7F0] dark:hover:bg-[#17211B] text-[#10251C] dark:text-[#F3F1E8] text-[11px] font-bold uppercase tracking-wider shadow-2xs transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
        >
          <ArrowDownUp size={11} className="text-[#10251C] dark:text-[#F3F1E8]" />
          <span>Swap</span>
        </button>
      </div>

      {/* Destination Row */}
      <div className="relative">
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-3.5 py-2 min-h-[46px] focus-within:border-[#E34222] dark:focus-within:border-[#E06A50] focus-within:ring-2 focus-within:ring-[#E34222]/10 transition-all shadow-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E34222] dark:bg-[#E06A50] flex-shrink-0" />

          {/* Reorder controls for Drop */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleReorderWaypoint(stops.length + 1, stops.length)}
              aria-label="Move destination above the previous stop"
              title="Move destination up"
              className="min-w-[44px] min-h-[44px] -my-2 flex items-center justify-center rounded-[8px] text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-[#F3F1E8] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <ChevronUp size={12} />
            </button>
            <GripVertical size={12} className="text-[#696B64]/50 dark:text-[#929D93]/50 select-none flex-shrink-0" />
          </div>

          <input
            aria-label="Drop location"
            value={drop}
            onFocus={() => setActiveSearchField("drop")}
            onChange={(e) => {
              setDrop(e.target.value);
              setDropLat(null);
              setDropLng(null);
              debouncedSearchAddress("drop", e.target.value, setDropResults, pickupCountry || "in");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dropResults.length > 0) {
                e.preventDefault();
                selectPlace(dropResults[0], false);
              }
            }}
            placeholder={t("booking.whereTo", "Where to?")}
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-[15px] font-bold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#929D93]/60 outline-none truncate tracking-tight"
          />
          {isSearchingDrop ? (
            <Loader2 size={13} className="animate-spin text-[#696B64] dark:text-[#929D93] flex-shrink-0" />
          ) : drop ? (
            <button
              type="button"
              onClick={() => {
                setDrop("");
                setDropLat(null);
                setDropLng(null);
                setDropResults([]);
              }}
              aria-label="Clear destination location"
              className="min-w-[40px] min-h-[40px] rounded-[8px] inline-flex items-center justify-center text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-[#F3F1E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E34222]"
            >
              <X size={14} />
            </button>
          ) : null}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActiveSearchField(null);
              setMapSelectionMode("drop");
            }}
            title="Choose destination on map"
            className="w-7 h-7 rounded-[6px] border border-[#E34222] dark:border-[#E06A50] bg-white dark:bg-[#1E2B23] hover:bg-[#faebe8] dark:hover:bg-[#3A201A] transition flex items-center justify-center flex-shrink-0"
          >
            <MapPin size={13} className="text-[#E34222] dark:text-[#E06A50]" />
          </motion.button>
        </div>

        {/* Drop Autocomplete Results & Recent Destinations */}
        <AnimatePresence>
          {activeSearchField === "drop" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#17211B] border border-zinc-200/90 dark:border-[#34443A] rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-50 divide-y divide-zinc-100 dark:divide-[#34443A]/50 ring-1 ring-black/5"
            >
              {/* Option to set location on interactive map */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setActiveSearchField(null);
                  setMapSelectionMode("drop");
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left bg-rose-50/70 dark:bg-[#3A201A]/60 hover:bg-rose-100/70 dark:hover:bg-[#3A201A] text-rose-950 dark:text-[#F3F1E8] transition"
              >
                <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-rose-900 dark:text-[#E06A50] leading-none">Set destination point on map</p>
                  <p className="text-[10px] text-rose-700 dark:text-[#B8C2B8] font-semibold mt-0.5">Move map to pinpoint exact location</p>
                </div>
                <span className="text-[10px] font-black uppercase text-rose-700 dark:text-[#E06A50] bg-white dark:bg-[#17211B] px-2 py-0.5 rounded-full border border-rose-200 dark:border-[#E06A50]/50 flex-shrink-0">
                  Pinpoint
                </span>
              </button>

              {/* Live search loading feedback */}
              {isSearchingDrop && (
                <div className="flex items-center gap-2.5 px-4 py-3 text-zinc-500 dark:text-[#929D93]">
                  <Loader2 size={14} className="animate-spin text-zinc-700 dark:text-[#B8C2B8] shrink-0" />
                  <span className="text-xs font-semibold">Searching nearby places...</span>
                </div>
              )}

              {/* Suggestions List */}
              {dropResults.map((p) => {
                const distToPoint =
                  typeof p.distanceKm === "number"
                    ? p.distanceKm
                    : (typeof p.lat === "number" && typeof p.lng === "number" && pickupLat && pickupLng
                        ? getHaversineDistance(pickupLat, pickupLng, p.lat, p.lng)
                        : null);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectPlace(p, false);
                    }}
                    className="group flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-[#1E2B23] active:bg-zinc-100 dark:active:bg-[#202B24] transition rounded-xl cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border shadow-2xs transition-transform group-hover:scale-105 ${getCategoryBadgeStyle(p.category, p.title || p.name)}`}>
                      {getCategoryIcon(p.category, p.title || p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-[#F3F1E8] truncate group-hover:text-black dark:group-hover:text-white">
                        {p.title || p.name}
                      </p>
                      {p.subtitle && (
                        <p className="text-[11px] text-zinc-500 dark:text-[#929D93] font-medium truncate mt-0.5">
                          {p.subtitle}
                        </p>
                      )}
                    </div>

                    {distToPoint !== null && (
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-[#B8C2B8] bg-zinc-100/90 dark:bg-[#1E2B23] border border-zinc-200/80 dark:border-[#34443A] px-2 py-0.5 rounded-full flex-shrink-0">
                        {typeof distToPoint === "number" ? distToPoint.toFixed(1) : distToPoint} km
                      </span>
                    )}

                    <ChevronRight size={13} className="text-zinc-300 dark:text-[#34443A] group-hover:text-zinc-500 dark:group-hover:text-[#929D93] transition-colors flex-shrink-0" />
                  </button>
                );
              })}

              {/* Recent Destinations fallback when no active input query */}
              {dropResults.length === 0 && !isSearchingDrop && recentDestinations.length > 0 && (
                <>
                  <div className="px-3.5 py-1.5 bg-zinc-50 dark:bg-[#1E2B23] border-b border-zinc-100 dark:border-[#34443A] flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-zinc-500 dark:text-[#929D93] tracking-wider">🕒 Recent Destinations</span>
                  </div>
                  {recentDestinations.map((recent) => (
                    <button
                      key={recent.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectPlace(
                          {
                            id: recent.id,
                            name: recent.name,
                            title: recent.name,
                            subtitle: recent.subtitle,
                            lat: recent.lat,
                            lng: recent.lng,
                          },
                          false
                        );
                      }}
                      className="group flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-[#1E2B23] active:bg-zinc-100 dark:active:bg-[#202B24] transition rounded-xl"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-[#1E2B23] border border-zinc-200 dark:border-[#34443A] text-zinc-600 dark:text-[#B8C2B8] flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                        🕒
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-[#F3F1E8] truncate group-hover:text-black dark:group-hover:text-white">{recent.name}</p>
                        {recent.subtitle && (
                          <p className="text-[10px] text-zinc-500 dark:text-[#929D93] font-medium truncate mt-0.5">{recent.subtitle}</p>
                        )}
                      </div>
                      <ChevronRight size={13} className="text-zinc-300 dark:text-[#34443A] group-hover:text-zinc-500 dark:group-hover:text-[#929D93] flex-shrink-0" />
                    </button>
                  ))}
                </>
              )}

              {/* No results fallback */}
              {!isSearchingDrop && drop.trim().length >= 2 && dropResults.length === 0 && (
                <div className="px-4 py-4 text-center space-y-2">
                  <p className="text-xs font-bold text-zinc-700 dark:text-[#B8C2B8]">No exact places found for &quot;{drop}&quot;</p>
                  <p className="text-[11px] text-zinc-400 dark:text-[#929D93]">Can&apos;t find your place? Move the pin to pick on the interactive map.</p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveSearchField(null);
                      setMapSelectionMode("drop");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-[#E34222] text-white text-xs font-bold shadow-xs hover:bg-black dark:hover:bg-[#8A2514] transition"
                  >
                    <MapPin size={12} />
                    <span>Set destination on map</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );

  const renderRideSelection = () => (
    <div className="space-y-4">
      {/* Mode Switcher & Schedule Picker */}
      <ScheduleRidePicker
        bookingMode={bookingMode}
        onModeChange={setBookingMode}
        scheduledTime={scheduledDateTime}
        onTimeChange={setScheduledDateTime}
        minScheduledTime={getMinScheduledDateTime()}
      />

      {/* 👤 RIDER & CONTACT DROPDOWN SELECTOR */}
      <FamilyRiderSelector
        familyAccount={familyAccount}
        selectedFamilyMember={selectedFamilyMember}
        onSelectRider={handleSelectRider}
        onAddNewContact={async (contact) => {
          if (contact.saveForFuture) {
            const res = await fetch("/api/user/family/member", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: contact.name,
                phone: contact.phone,
                relation: contact.relation,
              }),
            });
            const data = await res.json();
            if (data.success && data.family) {
              setFamilyAccount(data.family);
            }
          }
          handleSelectRider(contact);
        }}
        userData={userData}
      />



      {/* Recommended Pickup Selector UI */}
      {smartPickups.length > 0 && (
        <div className="p-3 bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#29372E] rounded-[10px] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#046A38]" />
              <p className="text-[11px] font-bold uppercase text-[#10251C] dark:text-[#F3F1E8] tracking-wider">
                📍 Recommended Pickups
              </p>
            </div>
            <span className="text-[10px] text-[#046A38] dark:text-[#347858] font-bold">Suggested</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {smartPickups.map((spot) => {
              const isSelected = selectedSmartPickup?.id === spot.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => handleSelectSmartPickup(spot)}
                  className={`flex-shrink-0 text-left p-2 rounded-[8px] border transition-colors max-w-[200px] cursor-pointer ${
                    isSelected
                      ? "bg-[#046A38] text-white border-[#046A38]"
                      : "bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] border-[#DED7CA] dark:border-[#29372E] hover:border-[#046A38]"
                  }`}
                >
                  <p className="font-bold text-[11px] leading-tight truncate">{spot.spotName}</p>
                  <p className={`text-[9px] mt-0.5 truncate ${isSelected ? "text-white/80" : "text-[#696B64] dark:text-[#929D93]"}`}>
                    {spot.venueName} • 🚶 {spot.walkingTimeText}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SERVICE MODE TOGGLE (JAATRI DESIGN SYSTEM) ── */}
      <div className="bg-[#FAF7F0] dark:bg-[#17211B] p-1 rounded-[10px] flex items-center gap-1 border border-[#DED7CA] dark:border-[#29372E] shadow-xs">
        <button
          type="button"
          onClick={() => {
            setServiceMode("passenger");
            if (vehicle === "loading" || vehicle === "truck") setVehicle("car");
          }}
          className={`flex-1 py-2 px-3 rounded-[8px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            serviceMode === "passenger"
              ? "bg-[#046A38] text-white shadow-xs"
              : "text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-white hover:bg-[#EFE9DC]/60 dark:hover:bg-[#202B24]"
          }`}
        >
          <Car size={14} className={serviceMode === "passenger" ? "text-white" : "text-[#046A38]"} />
          <span className="tracking-tight">Daily Rides & Taxi</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setServiceMode("logistics");
            if (vehicle !== "loading" && vehicle !== "truck") setVehicle("loading");
          }}
          className={`flex-1 py-2 px-3 rounded-[8px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            serviceMode === "logistics"
              ? "bg-[#046A38] text-white shadow-xs"
              : "text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-white hover:bg-[#EFE9DC]/60 dark:hover:bg-[#202B24]"
          }`}
        >
          <Package size={14} className={serviceMode === "logistics" ? "text-white" : "text-[#123D32]"} />
          <span className="tracking-tight">Express Cargo & Mini Truck</span>
        </button>
      </div>

      {/* ── SMART VEHICLE MATCHING WIDGET ── */}
      <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#29372E] rounded-[10px] p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowSmartMatcher(!showSmartMatcher)}
            className="flex items-center gap-1.5 text-left group cursor-pointer"
          >
            <Sparkles size={14} className="text-[#046A38] dark:text-[#347858] flex-shrink-0 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8] group-hover:text-[#046A38] transition">
              Smart Ride Matcher
            </span>
            <span className="text-[10px] text-[#696B64] dark:text-[#929D93] font-medium ml-1">
              {showSmartMatcher ? "Hide" : "Find best vehicle"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowSmartMatcher(!showSmartMatcher)}
            className="text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-[#F3F1E8] p-1 cursor-pointer"
          >
            {showSmartMatcher ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <AnimatePresence>
          {showSmartMatcher && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-[#DED7CA] dark:border-[#29372E] space-y-3"
            >
              {serviceMode === "passenger" ? (
                <>
                  {/* Passengers Chip selector */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#929D93] mb-1.5 block">
                      How many passengers?
                    </label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setSmartPassengers(num)}
                          className={`flex-1 py-1.5 rounded-[8px] text-xs font-bold border transition cursor-pointer ${
                            smartPassengers === num
                              ? "bg-[#046A38] text-white border-[#046A38] shadow-xs"
                              : "bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] border-[#DED7CA] dark:border-[#29372E] hover:border-[#046A38]"
                          }`}
                        >
                          {num === 6 ? "5–6 Pax" : `${num} Pax`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Luggage Chip selector */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#929D93] mb-1.5 block">
                      How much luggage?
                    </label>
                    <div className="flex gap-1.5">
                      {(
                        [
                          { id: "none", label: "No Bags" },
                          { id: "small", label: "Small Bag" },
                          { id: "large", label: "Large Bags" },
                        ] as const
                      ).map((lug) => (
                        <button
                          key={lug.id}
                          type="button"
                          onClick={() => setSmartLuggage(lug.id)}
                          className={`flex-1 py-1.5 rounded-[8px] text-xs font-bold border transition cursor-pointer ${
                            smartLuggage === lug.id
                              ? "bg-[#046A38] text-white border-[#046A38] shadow-xs"
                              : "bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] border-[#DED7CA] dark:border-[#29372E] hover:border-[#046A38]"
                          }`}
                        >
                          {lug.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preference Chip selector */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#929D93] mb-1.5 block">
                      Your priority
                    </label>
                    <div className="flex gap-1.5">
                      {(
                        [
                          { id: "budget", label: "Lowest Fare" },
                          { id: "comfort", label: "More Comfort" },
                        ] as const
                      ).map((pref) => (
                        <button
                          key={pref.id}
                          type="button"
                          onClick={() => setSmartPreference(pref.id)}
                          className={`flex-1 py-1.5 rounded-[8px] text-xs font-bold border transition cursor-pointer ${
                            smartPreference === pref.id
                              ? "bg-[#046A38] text-white border-[#046A38] shadow-xs"
                              : "bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] border-[#DED7CA] dark:border-[#29372E] hover:border-[#046A38]"
                          }`}
                        >
                          {pref.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Logistics Cargo Weight selector */
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#929D93] mb-1.5 block">
                    Estimated Cargo Weight
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { wt: 100, label: "<100 kg" },
                      { wt: 250, label: "250 kg" },
                      { wt: 500, label: "500 kg" },
                      { wt: 1000, label: "1,000+ kg" },
                    ].map((w) => (
                      <button
                        key={w.wt}
                        type="button"
                        onClick={() => setCargoWeightKg(w.wt)}
                        className={`flex-1 py-1.5 rounded-[8px] text-xs font-bold border transition cursor-pointer ${
                          cargoWeightKg === w.wt
                            ? "bg-[#046A38] text-white border-[#046A38] shadow-xs"
                            : "bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] border-[#DED7CA] dark:border-[#29372E] hover:border-[#046A38]"
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation Result Banner */}
              {smartMatchResult && (
                <div className="p-2.5 bg-[#E5EBDD] dark:bg-[#1D3428] border border-[#DED7CA] dark:border-[#28664D] rounded-[10px] flex items-center justify-between gap-2 shadow-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#123D32] dark:text-[#90C8A8] uppercase">
                      <span>⭐ Recommended Match:</span>
                      <span className="font-extrabold underline">
                        {VEHICLE_OPTIONS[smartMatchResult.vehicleId]?.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#696B64] dark:text-[#B8C2B8] leading-snug truncate mt-0.5 font-medium">
                      {smartMatchResult.reason}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVehicle(smartMatchResult.vehicleId)}
                    className="flex-shrink-0 px-2.5 py-1 bg-[#046A38] hover:bg-[#03532C] text-white rounded-[8px] text-[10px] font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
                  >
                    Select
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── GOODS TRANSPORT (LOGISTICS) DETAILS INPUTS ── */}
      {serviceMode === "logistics" && (
        <div className="bg-orange-50/60 dark:bg-[#3A201A]/60 border border-orange-200 dark:border-[#6B3A2C] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-orange-950 dark:text-orange-200 text-xs font-black uppercase tracking-wider">
            <Package size={14} className="text-orange-600 dark:text-orange-400" />
            <span>Goods & Consignment Details</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-600 dark:text-[#929D93] block mb-1">Cargo Type</label>
            <div className="flex flex-wrap gap-1.5">
              {["Boxes & Cartons", "Furniture & Home", "Commercial Goods", "Machinery & Parts"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCargoType(type)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    cargoType === type
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white dark:bg-[#1E2B23] text-zinc-700 dark:text-[#B8C2B8] border-zinc-200 dark:border-[#34443A] hover:bg-orange-50/40 dark:hover:bg-[#3A201A]/40"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-zinc-600 dark:text-[#929D93] block mb-1">Receiver Contact (Optional)</label>
              <input
                type="tel"
                placeholder="Alternate phone"
                value={receiverContact}
                onChange={(e) => setReceiverContact(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-[#34443A] bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-600 dark:text-[#929D93] block mb-1">Delivery Instructions</label>
              <input
                type="text"
                placeholder="e.g. 2nd floor, handle with care"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-[#34443A] bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Seamless Unified Vehicle Selection List */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-[#F3F1E8] font-heading">
              {serviceMode === "passenger" ? "Choose a trip" : "Goods Transport Vehicles"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#929D93] font-body">
              {serviceMode === "passenger" ? `${PASSENGER_VEHICLES.length} rides nearby` : `${LOGISTICS_VEHICLES.length} freight sizes`}
            </p>
          </div>
        </div>

        {routeDistance === -1 ? (
          <div className="p-4 bg-rose-50 dark:bg-[#3A201A]/60 border border-rose-200 dark:border-[#6B3A2C] rounded-none text-center">
            <p className="text-rose-600 dark:text-rose-300 text-xs font-black uppercase">No Rides Available</p>
            <p className="text-zinc-500 dark:text-[#929D93] text-[10px] mt-1 font-bold">No road connection found between these points.</p>
          </div>
        ) : (
          <div role="group" aria-label={serviceMode === "passenger" ? "Choose a ride vehicle" : "Choose a goods transport vehicle"} className="bg-transparent divide-y divide-zinc-100 dark:divide-[#34443A]/40">
            {(serviceMode === "passenger" ? PASSENGER_VEHICLES : LOGISTICS_VEHICLES).map((v, _index, availableVehicles) => {
              const isSelected = vehicle === v.id;
              const isLimitOk = checkLimit(v.id, effectiveDistance);
              const selectedVehicleIsAvailable = availableVehicles.some((option) => option.id === vehicle && checkLimit(option.id, effectiveDistance));
              const firstAvailableVehicleId = availableVehicles.find((option) => checkLimit(option.id, effectiveDistance))?.id;
              const isTabStop = isLimitOk && (isSelected || (!selectedVehicleIsAvailable && v.id === firstAvailableVehicleId));
              const fare = estimateFare(v.id, effectiveDistance);
              const isSmartPick = smartMatchResult?.vehicleId === v.id;
              const Icon = VEHICLE_ICONS[v.id] || Car;
              const isFastest =
                (serviceMode === "passenger" && (v.id === "bike" || v.id === "scooty")) ||
                (serviceMode === "logistics" && v.id === "loading");

              return (
                <div
                  key={v.id}
                  role={isLimitOk ? "button" : "group"}
                  aria-pressed={isLimitOk ? isSelected : undefined}
                  aria-disabled={!isLimitOk}
                  aria-label={`${v.label}, ₹${fare}${isLimitOk ? "" : ", unavailable for this route"}`}
                  tabIndex={isTabStop ? 0 : -1}
                  onClick={() => isLimitOk && setVehicle(v.id as VehicleType)}
                  onKeyDown={(event) => {
                    if (!isLimitOk) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setVehicle(v.id as VehicleType);
                      return;
                    }
                    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
                      event.preventDefault();
                      const options = Array.from(
                        event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="button"][aria-disabled="false"]') ?? []
                      );
                      const currentIndex = options.indexOf(event.currentTarget);
                      const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
                      const next = options[(currentIndex + step + options.length) % options.length];
                      next?.focus();
                      next?.click();
                    }
                  }}
                  className={`relative flex items-center justify-between px-3.5 py-3.5 transition-colors cursor-pointer select-none rounded-[10px] my-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#17211B] ${
                    isSelected
                      ? "bg-[#1E6048] text-[#F7F1E5] shadow-xs"
                      : isSmartPick
                      ? "bg-[#E5EBDD]/60 dark:bg-[#1D3428]/60 hover:bg-[#E5EBDD] dark:hover:bg-[#1D3428] text-[#10251C] dark:text-[#F3F1E8]"
                      : "hover:bg-[#FAF7F0] dark:hover:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8]"
                  } ${!isLimitOk ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {isSmartPick && !isSelected && (
                    <span className="absolute top-1.5 right-3 bg-[#046A38] text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] shadow-xs flex items-center gap-1">
                      <Sparkles size={8} />
                      <span>Best Match</span>
                    </span>
                  )}
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1 mr-2">
                    <div className="w-16 h-14 sm:w-20 sm:h-16 flex items-center justify-center flex-shrink-0 p-0.5">
                      <Icon size={56} className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Line 1: Vehicle Title + Capacity */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-base sm:text-[17px] tracking-tight leading-tight ${
                          isSelected ? "text-[#F7F1E5]" : "text-[#10251C] dark:text-[#F3F1E8]"
                        }`}>
                          {v.label}
                        </span>
                        {v.passengerCapacity ? (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                            isSelected ? "text-[#F7F1E5]/70" : "text-[#696B64] dark:text-[#929D93]"
                          }`}>
                            <User size={12} className="inline opacity-80" />
                            <span className="tabular-nums">{v.passengerCapacity}</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                            isSelected ? "text-[#F7F1E5]/70" : "text-[#696B64] dark:text-[#929D93]"
                          }`}>
                            <Package size={12} className="inline opacity-80" />
                            <span className="tabular-nums">{v.maxWeightKg} kg</span>
                          </span>
                        )}
                      </div>

                      {/* Line 2: Clock ETA duration */}
                      <div className={`text-xs mt-0.5 font-medium flex items-center gap-1 ${
                        isSelected ? "text-[#F7F1E5]/80" : "text-[#696B64] dark:text-[#929D93]"
                      }`}>
                        {isFastest && <Zap size={11} className="text-amber-500 fill-amber-500 shrink-0" />}
                        <span className="tabular-nums">{formatEtaTime(v.etaText)}</span>
                      </div>

                      {/* Line 3: Tagline */}
                      <p className={`text-xs mt-0.5 leading-snug truncate ${
                        isSelected ? "text-[#F7F1E5]/60" : "text-[#696B64] dark:text-[#929D93]"
                      }`}>
                        {v.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-2 min-w-[76px] sm:min-w-[90px]">
                    <p className={`font-black text-lg sm:text-xl leading-none tracking-tight tabular-nums whitespace-nowrap ${
                      isSelected ? "text-[#F7F1E5]" : "text-[#10251C] dark:text-[#F3F1E8]"
                    }`}>
                      ₹{fare}
                    </p>
                    {effectiveDistance > 100 && v.id === "car" ? (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] border tracking-wider block mt-1 ${
                        isSelected ? "bg-[#0D3027] dark:bg-[#1D3428] text-[#F7F1E5] border-[#123D32]" : "text-[#123D32] dark:text-[#90C8A8] bg-[#FAF7F0] dark:bg-[#17211B] border-[#DED7CA] dark:border-[#34443A]"
                      }`}>
                        Intercity
                      </span>
                    ) : !isLimitOk ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVehicle("car");
                        }}
                        className="text-[9px] font-bold uppercase text-[#E34222] dark:text-[#E06A50] bg-[#faebe8] dark:bg-[#3A201A] hover:bg-[#faebe8]/80 px-1.5 py-0.5 rounded-[4px] border border-[#E34222]/30 dark:border-[#E06A50]/40 block mt-1"
                      >
                        Use Intercity
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Itemized Fare Receipt Accordion */}
      <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#29372E] rounded-[10px] p-3.5 space-y-2 shadow-xs">
        <button
          type="button"
          aria-expanded={showFareReceipt}
          onClick={() => setShowFareReceipt(!showFareReceipt)}
          className="w-full min-h-[44px] py-1 flex items-center justify-between gap-3 text-left cursor-pointer rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] flex items-center justify-center text-[#123D32] dark:text-[#347858] flex-shrink-0">
              <FileText size={14} />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[#10251C] dark:text-[#F3F1E8] block leading-tight">
                Fare Breakdown
              </span>
              <span className="text-[11px] text-[#696B64] dark:text-[#929D93] font-medium">Upfront guaranteed pricing</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[#10251C] dark:text-[#F3F1E8] text-base sm:text-lg font-black tabular-nums">
            <span>₹{currentBreakdown.totalFare}</span>
            {showFareReceipt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {showFareReceipt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2.5 border-t border-[#DED7CA] dark:border-[#34443A] space-y-2 text-xs text-[#696B64] dark:text-[#B8C2B8] font-medium"
            >
              <div className="flex justify-between">
                <span>Base Fare</span>
                <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">₹{currentBreakdown.baseFare}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Distance Fare ({currentBreakdown.distanceKm} km × ₹{currentBreakdown.pricePerKm}/km)</span>
                <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">₹{currentBreakdown.distanceFare}</span>
              </div>
              {currentBreakdown.surgeAmount > 0 && (
                <div className="flex justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  <span>High Demand Surge ({currentBreakdown.surgeMultiplier}x)</span>
                  <span>+₹{currentBreakdown.surgeAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px]">
                <span>Platform Tech Fee</span>
                <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">₹{currentBreakdown.platformFee}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Govt GST / Taxes (5%)</span>
                <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">₹{currentBreakdown.taxes}</span>
              </div>
              {currentBreakdown.isStudentDiscountApplied && (
                <div className="flex justify-between text-[11px] text-[#046A38] dark:text-[#90C8A8] font-bold pt-1 border-t border-[#DED7CA] dark:border-[#28664D]/50">
                  <span>🎓 Student Pass Discount (-10%)</span>
                  <span>-₹{currentBreakdown.studentDiscount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-dashed border-[#DED7CA] dark:border-[#34443A] flex flex-col gap-1 text-[10px] text-[#696B64] dark:text-[#929D93] sm:flex-row sm:items-center sm:justify-between">
                <span>Payment Accepted:</span>
                <span className="font-bold text-[#10251C] dark:text-[#F3F1E8]">⚡ UPI (GPay/PhonePe) • Cash • Card</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Student Pass Banner & Verification Modal */}
      <div className="p-3 bg-[#123D32] dark:bg-[#1E2B23] text-white rounded-[10px] border border-[#123D32] dark:border-[#34443A] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[#0D3027] dark:bg-[#17211B] text-amber-400 flex items-center justify-center border border-[#28664D]/40 dark:border-[#34443A] flex-shrink-0">
            <GraduationCap size={15} />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold tracking-tight text-[#FAF7F0]">Student Pass (10% OFF)</p>
            <p className="text-[11px] text-[#A3B8B0] dark:text-[#929D93] font-medium">
              {isStudent ? "Active & Applied" : "Save 10% with college email"}
            </p>
          </div>
        </div>
        {!isStudent && (
          <button
            type="button"
            onClick={() => setShowStudentForm(true)}
            className="px-2.5 py-1 bg-[#E5EBDD] text-[#123D32] hover:bg-white font-bold text-[11px] rounded-[6px] transition cursor-pointer shadow-xs"
          >
            Verify
          </button>
        )}
      </div>

      <StudentPassModal
        isOpen={showStudentForm}
        onClose={() => setShowStudentForm(false)}
        isStudent={isStudent}
        studentDetails={studentDetails}
        onVerified={(details) => {
          setIsStudent(true);
          setStudentDetails(details);
        }}
      />

      {/* Contact Mobile Input Row (Indian Standard) */}
      <div className="flex items-center gap-2.5 bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-3.5 py-2 min-h-[46px] shadow-xs focus-within:border-[#046A38] dark:focus-within:border-[#90C8A8] transition-all">
        <span className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F3F1E8] bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] px-2 py-1 rounded-[6px] flex items-center gap-1 flex-shrink-0 select-none">
          +91
        </span>
        <input
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Enter 10-digit mobile number"
          className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64] dark:placeholder:text-[#929D93] outline-none tabular-nums min-w-[120px]"
        />
        {mobile.length === 10 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#123D32] dark:text-[#90C8A8] bg-[#E5EBDD] dark:bg-[#1D3428] px-2 py-0.5 rounded-[6px] border border-[#DED7CA] dark:border-[#28664D] flex-shrink-0">
            <CheckCircle2 size={13} className="text-[#046A38] dark:text-[#90C8A8]" />
            Verified
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[#696B64] dark:text-[#929D93] flex-shrink-0">
            OTP on arrival
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F7F1E5] dark:bg-[#101713] text-[#10251C] dark:text-[#F3F1E8] font-sans select-none flex flex-col md:flex-row">
      
      {/* ══ 1. DESKTOP / TABLET UNIFIED EDITORIAL PANEL (BOOKING SIDE) ══ */}
      <div className={`hidden md:flex w-full md:w-1/2 lg:w-1/2 xl:w-1/2 md:max-w-[50%] h-full flex-col bg-[#FAF7F0] dark:bg-[#17211B] border-r border-[#DED7CA] dark:border-[#34443A] z-10 rounded-none overflow-hidden transition-all duration-300 flex-shrink-0 ${
        mapSelectionMode !== "none" ? "opacity-0 pointer-events-none -translate-x-12" : "opacity-100 translate-x-0"
      }`}>
        
        {/* Pinned Card Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#17211B] space-y-3 relative z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="w-8 h-8 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#1E2B23] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] flex items-center justify-center text-[#10251C] dark:text-[#F3F1E8] transition cursor-pointer shrink-0"
                aria-label="Go Home"
                title="Go Home"
              >
                <HomeIcon size={15} />
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-8 h-8 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#1E2B23] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] flex items-center justify-center text-[#10251C] dark:text-[#F3F1E8] transition cursor-pointer shrink-0"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <Link href="/" className="flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer">
                <Image
                  src="/logojatri.png"
                  alt="Jaatri"
                  width={140}
                  height={44}
                  priority
                  className="h-8 sm:h-9 w-auto object-contain dark-logo-invert dark:brightness-0 dark:invert dark:opacity-95"
                />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {hasRoute && (
                <span className="text-[11px] font-black uppercase tracking-wider bg-[#123D32] dark:bg-[#28664D] text-[#F7F1E5] border border-[#123D32] dark:border-[#28664D] px-2.5 py-1 rounded-[8px] tabular-nums">
                  {effectiveDistance} km
                </span>
              )}
              {!isAuthenticated && sessionStatus !== "loading" && (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white text-xs font-bold rounded-[8px] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Ride Recovery & Double Booking Protection */}
          <ActiveRideBanner variant="inline" onActiveRideFound={setActiveExistingRide} />

          {/* Location Inputs */}
          {renderLocationInputs()}
        </div>

        {/* Scrollable Card Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!hasRoute ? (
            <div className="py-12 text-center space-y-3 text-[#696B64] dark:text-[#929D93] border border-dashed border-[#DED7CA] dark:border-[#34443A] p-8 rounded-[12px] bg-white/60 dark:bg-[#17211B]/60">
              <span className="text-4xl">🗺️</span>
              <p className="text-base font-bold text-[#10251C] dark:text-[#F3F1E8] font-serif">Enter your destination to explore rides</p>
              <p className="text-xs text-[#696B64] dark:text-[#929D93] max-w-sm mx-auto">
                Select your pickup and drop-off points to view available vehicles, live ETAs, and transparent pricing.
              </p>
            </div>
          ) : (
            renderRideSelection()
          )}
        </div>

        {/* Pinned Card Footer */}
        <div className="flex-shrink-0 p-4 border-t border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#17211B]">
          <motion.button
            whileTap={{ scale: 0.99 }}
            disabled={!canContinue}
            onClick={handleConfirmRide}
            className="w-full py-3.5 sm:py-4 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] disabled:opacity-35 text-white font-bold text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-sm min-h-[48px]"
          >
            <span>
              {!hasRoute
                ? t("booking.chooseVehicle", "Choose Destination")
                : bookingMode === "schedule"
                ? t("booking.scheduleRide", "Schedule Ride")
                : `${t("booking.confirmRide", "Confirm Ride")} • ${t(`fleet.${vehicle}.title`, VEHICLE_OPTIONS[vehicle]?.label || "Ride")}`}
            </span>
            <ArrowRight size={16} />
          </motion.button>

          {!canContinue && (
            <p className="text-center text-[10px] font-bold mt-2 text-zinc-600 dark:text-[#929D93] uppercase tracking-wider truncate">
              {activeExistingRide
                ? "Active ride already in progress. Complete or cancel it first."
                : !drop
                ? "Set drop location"
                : mobile.length !== 10
                ? "Enter valid 10-digit mobile"
                : !distanceValidity.valid
                ? distanceValidity.message
                : !isScheduleValid
                ? "Scheduled time must be at least 30 mins ahead"
                : "Complete route setup"}
            </p>
          )}
        </div>

      </div>

      {/* ══ 2. DESKTOP / TABLET MAP CANVAS (TAKES THE OTHER 50%, FULLSCREEN ONLY DURING PIN SELECTION) ══ */}
      <div className={`hidden md:block ${
        mapSelectionMode !== "none"
          ? "fixed inset-0 z-40 bg-zinc-100 dark:bg-[#101713]"
          : "w-full md:w-1/2 flex-1 h-full relative z-0 bg-zinc-100 dark:bg-[#101713]"
      }`}>
        <RouteMap
          pickup={pickup}
          drop={drop}
          pickupCoords={memoizedPickupCoords}
          dropCoords={memoizedDropCoords}
          userCoords={userCoords}
          onChange={handleMapChange}
          onCoordinatesChange={handleCoordinatesChange}
          onDistance={setRouteDistance}
          vehicles={vehicles}
          disableFallbackGeocode={false}
          smartPickups={smartPickups}
          onSelectSmartPickup={handleSelectSmartPickup}
          stops={validStopsForMap}
          bottomPadding={60}
          selectionMode={mapSelectionMode}
          onSelectionModeChange={setMapSelectionMode}
          onConfirmPinSelection={handleConfirmPinSelection}
        />
      </div>

      {/* ══ 3. MOBILE INTERFACE (< md) ══ */}
      <div className="md:hidden flex flex-col w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#FAF7F0] dark:bg-[#101713]">
        {/* Fullscreen Map when user is picking location pin on mobile */}
        {mapSelectionMode !== "none" ? (
          <div className="fixed inset-0 z-40 bg-zinc-100 dark:bg-[#101713]">
            <RouteMap
              pickup={pickup}
              drop={drop}
              pickupCoords={memoizedPickupCoords}
              dropCoords={memoizedDropCoords}
              userCoords={userCoords}
              onChange={handleMapChange}
              onCoordinatesChange={handleCoordinatesChange}
              onDistance={setRouteDistance}
              vehicles={vehicles}
              disableFallbackGeocode={false}
              smartPickups={smartPickups}
              onSelectSmartPickup={handleSelectSmartPickup}
              stops={validStopsForMap}
              bottomPadding={120}
              selectionMode={mapSelectionMode}
              onSelectionModeChange={setMapSelectionMode}
              onConfirmPinSelection={handleConfirmPinSelection}
            />
          </div>
        ) : !hasRoute ? (
          /* Mobile Search & Map when route is NOT set */
          <div className="relative w-full h-full flex flex-col">
            <div className="p-3.5 bg-[#FAF7F0] dark:bg-[#17211B] border-b border-[#DED7CA] dark:border-[#34443A] z-10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link
                    href="/"
                    className="w-8 h-8 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#1E2B23] flex items-center justify-center text-[#10251C] dark:text-[#F3F1E8] transition shrink-0"
                    aria-label="Go Home"
                    title="Go Home"
                  >
                    <HomeIcon size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-8 h-8 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#1E2B23] flex items-center justify-center text-[#10251C] dark:text-[#F3F1E8] shrink-0"
                    aria-label="Go back"
                    title="Go back"
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <Link href="/" className="flex items-center gap-1.5 hover:opacity-90 transition">
                    <Image
                      src="/logojatri.png"
                      alt="Jaatri"
                      width={120}
                      height={38}
                      priority
                      className="h-7 sm:h-8 w-auto object-contain dark-logo-invert dark:brightness-0 dark:invert dark:opacity-95"
                    />
                  </Link>
                </div>
              </div>
              <ActiveRideBanner variant="inline" onActiveRideFound={setActiveExistingRide} />
              {renderLocationInputs()}
            </div>
            <div className="flex-1 relative z-0 bg-zinc-100 dark:bg-[#101713]">
              <RouteMap
                pickup={pickup}
                drop={drop}
                pickupCoords={memoizedPickupCoords}
                dropCoords={memoizedDropCoords}
                userCoords={userCoords}
                onChange={handleMapChange}
                onCoordinatesChange={handleCoordinatesChange}
                onDistance={setRouteDistance}
                vehicles={vehicles}
                disableFallbackGeocode={false}
                smartPickups={smartPickups}
                onSelectSmartPickup={handleSelectSmartPickup}
                stops={validStopsForMap}
                bottomPadding={40}
                selectionMode={mapSelectionMode}
                onSelectionModeChange={setMapSelectionMode}
                onConfirmPinSelection={handleConfirmPinSelection}
              />
            </div>
          </div>
        ) : (
          /* Mobile Fullscreen Map with Non-Colliding Bottom Sheet Overlay */
          <div className="relative w-full h-[100dvh] overflow-hidden">
            {/* Floating Top-Left Home / Back CTA over Mobile Map */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 pointer-events-auto">
              <Link
                href="/"
                className="h-8 px-2.5 bg-white/95 dark:bg-[#17211B]/95 hover:bg-white dark:hover:bg-[#1E2B23] text-zinc-900 dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] shadow-sm flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-sm transition"
                title="Home"
              >
                <HomeIcon size={13} />
                <span>Home</span>
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-8 h-8 bg-white/95 dark:bg-[#17211B]/95 hover:bg-white dark:hover:bg-[#1E2B23] text-zinc-900 dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] shadow-sm flex items-center justify-center backdrop-blur-sm transition"
                title="Back"
              >
                <ArrowLeft size={14} />
              </button>
            </div>

            {/* Floating Top-Right Sign In CTA for Mobile when unauthenticated */}
            {!isAuthenticated && sessionStatus !== "loading" && (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="absolute top-3 right-3 z-30 h-8 px-3 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] text-white rounded-[8px] shadow-md flex items-center gap-1.5 text-xs font-bold pointer-events-auto transition active:scale-95 cursor-pointer"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}

            {/* Stable Fullscreen Map: NEVER changes container height during gestures */}
            <div className="absolute inset-0 z-0 bg-zinc-100 dark:bg-[#101713]">
              <RouteMap
                pickup={pickup}
                drop={drop}
                pickupCoords={memoizedPickupCoords}
                dropCoords={memoizedDropCoords}
                userCoords={userCoords}
                onChange={handleMapChange}
                onCoordinatesChange={handleCoordinatesChange}
                onDistance={setRouteDistance}
                vehicles={vehicles}
                disableFallbackGeocode={false}
                smartPickups={smartPickups}
                onSelectSmartPickup={handleSelectSmartPickup}
                stops={validStopsForMap}
                bottomPadding={mobileSheetState === "down" ? 130 : mobileSheetState === "up" ? 110 : 340}
                selectionMode={mapSelectionMode}
                onSelectionModeChange={setMapSelectionMode}
                onConfirmPinSelection={handleConfirmPinSelection}
              />
            </div>

            {/* Bottom Tactile Sliding Booking Interface (3 Definite Snap Points: down 110px, half 56dvh, up 88dvh) */}
            <div className="absolute bottom-0 inset-x-0 z-20 pointer-events-none flex flex-col justify-end">
              <motion.div
                animate={{
                  height:
                    mobileSheetState === "up"
                      ? "88dvh"
                      : mobileSheetState === "down"
                      ? 110
                      : "56dvh",
                }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
                className="pointer-events-auto flex flex-col bg-[#FAF7F0] dark:bg-[#17211B] rounded-t-[20px] shadow-[0_-8px_30px_rgba(0,0,0,0.18)] border-t border-[#DED7CA] dark:border-[#34443A] overflow-hidden"
              >
                {/* Interactive Drag Handle Header */}
                <div
                  className="flex-shrink-0 pt-2 pb-2.5 px-3.5 border-b border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#17211B] select-none cursor-grab active:cursor-grabbing touch-none"
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    (e.currentTarget as any)._startY = touch.clientY;
                    (e.currentTarget as any)._startTime = Date.now();
                  }}
                  onTouchEnd={(e) => {
                    const startY = (e.currentTarget as any)._startY;
                    const startTime = (e.currentTarget as any)._startTime;
                    if (typeof startY === "number") {
                      const deltaY = e.changedTouches[0].clientY - startY;
                      const deltaTime = Date.now() - (startTime || Date.now());
                      const velocityY = deltaY / Math.max(1, deltaTime);
                      if (deltaY < -35 || velocityY < -0.35) {
                        setMobileSheetState((prev) => (prev === "down" ? "half" : "up"));
                      } else if (deltaY > 35 || velocityY > 0.35) {
                        setMobileSheetState((prev) => (prev === "up" ? "half" : "down"));
                      }
                    }
                  }}
                >
                  {/* Physical slide pill bar indicator */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSheetState((prev) => (prev === "up" ? "down" : prev === "down" ? "half" : "up"));
                    }}
                    aria-label="Toggle ride drawer"
                    className="w-12 h-1.5 bg-[#DED7CA] dark:bg-[#34443A] mx-auto rounded-full mb-2 cursor-pointer hover:bg-[#696B64] active:scale-95 transition-all block"
                    title="Slide to adjust view"
                  />

                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => {
                        if (mobileSheetState === "down") setMobileSheetState("half");
                        else if (mobileSheetState === "half") setMobileSheetState("up");
                        else setMobileSheetState("half");
                      }}
                      className="flex items-center gap-2 min-w-0 pr-2 cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#046A38] dark:bg-[#90C8A8] flex-shrink-0" />
                      <span className="text-xs font-bold text-[#10251C] dark:text-[#F3F1E8] truncate max-w-[120px]">{pickup.split(',')[0]}</span>
                      <span className="text-[#696B64] dark:text-[#929D93] text-xs">→</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E34222] flex-shrink-0" />
                      <span className="text-xs font-black text-[#10251C] dark:text-[#F3F1E8] truncate max-w-[120px]">{drop.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[6px] bg-[#123D32] dark:bg-[#28664D] text-[#F7F1E5] border border-[#123D32] dark:border-[#28664D]">
                        {effectiveDistance} km
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingRoute(!isEditingRoute);
                        }}
                        className="px-2 py-0.5 rounded-[6px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#F7F1E5] dark:hover:bg-[#202B24]"
                      >
                        <Edit2 size={10} />
                        <span>{isEditingRoute ? "Done" : "Edit"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* If Mobile User Tapped Edit, Show Inputs Inline */}
                {isEditingRoute && (
                  <div className="p-3 bg-white/80 dark:bg-[#101713]/80 border-b border-[#DED7CA] dark:border-[#34443A] flex-shrink-0">
                    {renderLocationInputs()}
                  </div>
                )}

                {/* Scrollable Rides Body (Hidden only in peek down state) */}
                {mobileSheetState !== "down" ? (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 overscroll-contain">
                    {renderRideSelection()}
                  </div>
                ) : (
                  /* Compact Action Bar when bottom sheet is peeked down */
                  <div className="flex-1 px-3.5 py-2 flex items-center justify-between gap-3 bg-[#FAF7F0] dark:bg-[#17211B]">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#10251C] dark:text-[#F3F1E8] truncate">
                        {VEHICLE_OPTIONS[vehicle]?.label || "Ride"}
                      </p>
                      <p className="text-xs font-bold text-[#696B64] dark:text-[#929D93]">
                        ₹{currentBreakdown.totalFare} · Upfront fare
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMobileSheetState("half")}
                        className="px-3 py-2 border border-[#DED7CA] dark:border-[#34443A] text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold rounded-[8px] bg-white dark:bg-[#1E2B23] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] transition"
                      >
                        Rides
                      </button>
                      <button
                        type="button"
                        disabled={!canContinue}
                        onClick={handleConfirmRide}
                        className="px-4 py-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white text-xs font-bold uppercase tracking-wider rounded-[8px] transition flex items-center gap-1.5"
                      >
                        <span>Confirm</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile Pinned Bottom Action Footer: ALWAYS visible in half & up states */}
                {mobileSheetState !== "down" && (
                  <div className="flex-shrink-0 p-3 pb-[max(14px,env(safe-area-inset-bottom))] border-t border-[#DED7CA] dark:border-[#34443A] bg-[#FAF7F0] dark:bg-[#17211B] z-20 shadow-lg">
                    <motion.button
                      whileTap={{ scale: 0.99 }}
                      disabled={!canContinue}
                      onClick={handleConfirmRide}
                      className="w-full py-3.5 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] disabled:opacity-35 text-white font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition cursor-pointer min-h-[48px]"
                    >
                      <span>
                        {bookingMode === "schedule"
                          ? t("booking.scheduleRide", "Schedule Ride")
                          : `${t("booking.confirmRide", "Confirm Ride")} • ${t(`fleet.${vehicle}.title`, VEHICLE_OPTIONS[vehicle]?.label || "Ride")}`}
                      </span>
                      <ArrowRight size={16} />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* ══ 4. SERVICE UNAVAILABLE MODAL ══ */}
      <AnimatePresence>
        {showServiceUnavailableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-[12px] p-6 max-w-sm w-full shadow-2xl border border-[#DED7CA] dark:border-[#29372E] text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-[8px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#10251C] dark:text-[#F3F1E8] tracking-tight uppercase">Service unavailable</h3>
                <p className="text-xs text-[#696B64] dark:text-[#929D93] font-medium leading-relaxed">
                  {effectiveDistance > 500
                    ? `Selected route (${effectiveDistance} km) exceeds our maximum service radius of 500 km. Please select a closer destination.`
                    : "We currently do not operate trips on this route or location. Please adjust your pickup or drop location."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceUnavailableModal(false)}
                className="w-full py-2.5 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ 5. BROWSER LOCATION SETTINGS GUIDE POPUP MODAL ══ */}
      <AnimatePresence>
        {showLocationSettingsGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-[12px] p-5 sm:p-6 max-w-md w-full shadow-2xl border border-[#DED7CA] dark:border-[#29372E] relative space-y-4"
            >
              <div className="flex items-start justify-between border-b border-[#DED7CA] dark:border-[#29372E] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[8px] bg-[#123D32] dark:bg-[#1E2B23] text-white flex items-center justify-center flex-shrink-0">
                    <Settings size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#10251C] dark:text-[#F3F1E8] uppercase tracking-tight font-heading">
                      Enable Location Access
                    </h3>
                    <p className="text-[11px] text-[#696B64] dark:text-[#929D93] font-medium">Browser permission steps</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationSettingsGuide(false)}
                  className="text-[#696B64] hover:text-[#10251C] dark:hover:text-white transition p-1 cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs text-[#10251C] dark:text-[#F3F1E8]">
                <div className="p-3 bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#29372E] rounded-[8px] flex items-start gap-3 shadow-xs">
                  <span className="w-5 h-5 bg-[#123D32] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-[11px] leading-relaxed">
                    Look for the <strong>Padlock 🔒</strong> or <strong>Tune/Sliders ⚙️</strong> icon in your browser address bar next to the website URL.
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#29372E] rounded-[8px] flex items-start gap-3 shadow-xs">
                  <span className="w-5 h-5 bg-[#123D32] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-[11px] leading-relaxed">
                    Click <strong>&quot;Permissions&quot;</strong> or <strong>&quot;Site settings&quot;</strong>.
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#29372E] rounded-[8px] flex items-start gap-3 shadow-xs">
                  <span className="w-5 h-5 bg-[#123D32] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-[11px] leading-relaxed">
                    Find <strong>&quot;Location&quot;</strong> and switch from &quot;Block&quot; to <strong className="text-[#046A38] dark:text-[#90C8A8]">&quot;Allow&quot;</strong>.
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#29372E] rounded-[8px] flex items-start gap-3 shadow-xs">
                  <span className="w-5 h-5 bg-[#123D32] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">4</span>
                  <p className="text-[11px] leading-relaxed">
                    Return here and click <strong>&quot;Ask Permission Again&quot;</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#DED7CA] dark:border-[#29372E] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLocationSettingsGuide(false)}
                  className="px-4 py-2 border border-[#DED7CA] dark:border-[#29372E] bg-white dark:bg-[#1E2B23] hover:bg-[#FAF7F0] dark:hover:bg-[#202B24] text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold rounded-[8px] transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationSettingsGuide(false);
                    locateCurrentLocation();
                  }}
                  className="px-4 py-2 bg-[#046A38] hover:bg-[#03532C] text-white text-xs font-bold uppercase tracking-wider rounded-[8px] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <LocateFixed size={12} />
                  <span>Ask Permission Again</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ AUTH MODAL (SIGN IN PROMPT) ══ */}
      <AuthModal
        open={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          pendingCheckoutRef.current = false;
        }}
      />

    </div>
  );
}