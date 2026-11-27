"use client";



import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, MapPin, Navigation,
  Bike, Car, Truck, LocateFixed, Phone,
  CheckCircle2, ChevronRight, GraduationCap,
  Plus, X, Users, Clock, Calendar,
  Search, Edit2, Info, ChevronDown, ChevronUp,
  UserPlus, Check, Package, Sparkles, SlidersHorizontal, AlertTriangle, Loader2,
  Plane, Train, Building2, HeartPulse, AlertCircle, RotateCcw,
  ArrowDownUp, Settings, FileText, GripVertical,
  LogIn, Minus
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
  VehicleType,
  ServiceMode,
  recommendVehicle,
  RecommendationResult,
} from "@/lib/vehicleConfig";
import DriverPreferenceSelector from "@/features/booking/components/DriverPreferenceSelector";
import SmartRideAssistantModal from "@/features/booking/components/SmartRideAssistantModal";
import { DriverPreference } from "@/lib/safetyMatching";
import TripVehicleChooser from "@/features/booking/components/TripVehicleChooser";

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
  return "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]";
};

/** Single source of truth for per-vehicle distance bounds (km). */
const VEHICLE_DISTANCE_LIMITS: Record<string, { minDistance: number; maxDistance: number }> = {
  "e-rickshaw": { minDistance: 0, maxDistance: 20 },
  bike:    { minDistance: 0, maxDistance: 15 },
  auto:    { minDistance: 0, maxDistance: 30 },
  car:     { minDistance: 0, maxDistance: 500 }, // intercity up to 500 km
  loading: { minDistance: 0, maxDistance: 250 },
  truck:   { minDistance: 0, maxDistance: 500 },
};

export default function BookPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

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

  /* ── DRIVER SAFETY PREFERENCE STATE ── */
  const [driverPreference, setDriverPreference] = useState<DriverPreference>("any");
  const [womenDriversCount, setWomenDriversCount] = useState<number | undefined>(undefined);

  /* ── SMART VEHICLE MATCHING & ASSISTANT STATE ── */
  const [showSmartAssistantModal, setShowSmartAssistantModal] = useState<boolean>(false);
  const [smartMatchResult, setSmartMatchResult] = useState<RecommendationResult | null>(null);
  const [selectionToast, setSelectionToast] = useState<string | null>(null);

  useEffect(() => {
    if (!selectionToast) return;
    const timer = setTimeout(() => setSelectionToast(null), 3500);
    return () => clearTimeout(timer);
  }, [selectionToast]);

  const handleSelectFromAssistant = (selectedVehicleId: VehicleType, recommendation: RecommendationResult) => {
    setVehicle(selectedVehicleId);
    setSmartMatchResult(recommendation);
    setShowSmartAssistantModal(false);
    setSelectionToast(`${VEHICLE_OPTIONS[selectedVehicleId]?.label || selectedVehicleId} selected for your journey.`);

    setTimeout(() => {
      const el = Array.from(document.querySelectorAll<HTMLInputElement>(`[data-trip-vehicle="${selectedVehicleId}"]`))
        .find((option) => option.offsetParent !== null);
      if (el) {
        el.closest("label")?.scrollIntoView({ block: "nearest" });
        el.focus({ preventScroll: true });
      }
    }, 120);
  };

  const [rates, setRates] = useState<any>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [activeExistingRide, setActiveExistingRide] = useState<any | null>(null);

  /* ── SEARCH & UI STATE ── */
  const [activeSearchField, setActiveSearchField] = useState<"pickup" | "drop" | null>(null);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [showFareReceipt, setShowFareReceipt] = useState(false);
  const [mobileSheetState, setMobileSheetState] = useState<"down" | "half" | "up">("up");
  const sheetGesture = useRef<{ y: number; time: number } | null>(null);
  const sheetControlRef = useRef<HTMLButtonElement>(null);
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
      const studentVer = (userData as any).studentVerification;
      const isExpired = Boolean(
        studentVer?.expiresAt && new Date(studentVer.expiresAt).getTime() < Date.now()
      );
      setIsStudent(Boolean(userData.isStudent) && !isExpired);
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
    if (dist > 100 && (vehicle === "bike" || vehicle === "auto" || vehicle === "e-rickshaw")) {
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
    setDriverPreference("any");
    setSmartMatchResult(null);
    setSelectionToast(null);
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

      let draft: any = null;
      if (isFresh) {
        // A new trip must not inherit a previous trip's route, vehicle or stops.
        try { sessionStorage.removeItem("ridenow_booking_draft"); } catch {}
        try { localStorage.removeItem("ridenow_booking_draft"); } catch {}
      } else {
        const raw = sessionStorage.getItem("ridenow_booking_draft") || localStorage.getItem("ridenow_booking_draft");
        if (raw) {
          try { draft = JSON.parse(raw); } catch {}
        }
      }

      const urlPickup = urlParams.get("pickup");
      const urlDrop = urlParams.get("drop");
      const p = urlPickup || (draft?.pickup !== "Pickup Location" ? draft?.pickup : null);
      const d = urlDrop || (draft?.drop !== "Drop Location" ? draft?.drop : null);
      const rawVehicle = urlParams.get("vehicle") || draft?.vehicle;
      const v = typeof rawVehicle === "string" && Object.hasOwn(VEHICLE_OPTIONS, rawVehicle) ? rawVehicle as VehicleType : null;
      const m = urlParams.get("mobileNumber") || draft?.mobileNumber || draft?.mobile;
      const readCoordinate = (key: "pickupLat" | "pickupLng" | "dropLat" | "dropLng", explicitStop: string | null) => {
        const value = urlParams.get(key);
        if (value !== null && value.trim()) {
          const coordinate = Number(value);
          return Number.isFinite(coordinate) ? coordinate : null;
        }
        return !explicitStop && typeof draft?.[key] === "number" ? draft[key] : null;
      };
      const pLat = readCoordinate("pickupLat", urlPickup);
      const pLng = readCoordinate("pickupLng", urlPickup);
      const dLat = readCoordinate("dropLat", urlDrop);
      const dLng = readCoordinate("dropLng", urlDrop);

      if (m) setMobile(m);
      const category = urlParams.get("category") || draft?.category;
      const logistics = category === "trucks" || urlParams.get("serviceMode") === "logistics" ||
        (v !== null && VEHICLE_OPTIONS[v].serviceMode === "logistics");
      if (logistics) setServiceMode("logistics");
      if (v) setVehicle(v);
      else if (logistics) setVehicle("loading");

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
      if (draft?.driverPreference === "any" || draft?.driverPreference === "woman") {
        setDriverPreference(draft.driverPreference);
      } else if (urlParams.get("driverPreference") === "woman") {
        setDriverPreference("woman");
      }
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
        if (data.success) {
          setVehicles(data.vehicles);
          if (typeof data.womenDriversCount === "number") {
            setWomenDriversCount(data.womenDriversCount);
          }
        }
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
      driverPreference,
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
        <div className="p-3.5 bg-[var(--surface-raised)] border border-amber-300 dark:border-amber-700/50 text-[var(--text-primary)] rounded-[10px] text-xs space-y-2.5 shadow-xs">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-[8px] bg-amber-500/20 border border-amber-500/40 text-[var(--accent-gold)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <LocateFixed size={13} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-primary)]">Location Access Needed</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug mt-0.5">
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
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-white transition cursor-pointer flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={locateCurrentLocation}
              disabled={locating}
              className="min-h-[44px] px-3 py-2 rounded-[8px] bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
            >
              <LocateFixed size={11} className={locating ? "animate-spin" : ""} />
              <span>{locating ? "Detecting..." : "Ask Permission Again"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLocationSettingsGuide(true)}
              className="min-h-[44px] px-3 py-2 rounded-[8px] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
            >
              <Settings size={11} className="text-[var(--text-secondary)]" />
              <span>Site Settings Guide</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLocationError(null);
                setActiveSearchField(null);
                setMapSelectionMode("pickup");
              }}
              className="min-h-[44px] px-3 py-2 rounded-[8px] bg-transparent hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-interactive)] text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
            >
              <MapPin size={11} />
              <span>Set on Map</span>
            </button>
          </div>
        </div>
      )}

      {/* Pickup Row */}
      <div className="relative">
        <div className="flex items-center gap-2.5 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] px-3.5 py-2 min-h-[46px] focus-within:border-[var(--border-interactive)] dark:focus-within:border-[var(--border-interactive)] focus-within:ring-2 focus-within:ring-[var(--focus-ring)]/10 transition-all shadow-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)] flex-shrink-0" />
          
          {/* Reorder controls for Pickup (only when intermediate stops exist) */}
          {stops.length > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleReorderWaypoint(0, 1)}
                aria-label="Move pickup below the next stop"
                title="Move pickup down"
                className="size-11 flex items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <ChevronDown size={12} />
              </button>
              <GripVertical size={12} className="text-[var(--text-secondary)]/50 dark:text-[var(--text-secondary)]/50 select-none flex-shrink-0" />
            </div>
          )}

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
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-[15px] font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] truncate tracking-tight"
          />
          {isSearchingPickup ? (
            <Loader2 size={13} className="animate-spin text-[var(--text-secondary)] flex-shrink-0" />
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
              className="min-w-11 min-h-11 rounded-[8px] inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <X size={14} />
            </button>
          ) : null}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={locateCurrentLocation}
            disabled={locating}
            title="Use current location"
            className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] transition flex items-center justify-center flex-shrink-0 text-[var(--text-primary)]"
          >
            <LocateFixed size={13} className={`text-[var(--text-primary)] ${locating ? "animate-spin" : ""}`} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActiveSearchField(null);
              setMapSelectionMode("pickup");
            }}
            title="Choose pickup on map"
            className="w-7 h-7 rounded-[6px] border border-[var(--border-interactive)] bg-[var(--brand-primary)] text-[var(--on-primary)] hover:bg-[var(--surface-subtle)] dark:hover:bg-[var(--brand-strong)] transition flex items-center justify-center flex-shrink-0"
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
              className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-[14px] shadow-2xl max-h-72 overflow-y-auto z-50 divide-y divide-[var(--border-default)]/60 dark:divide-[var(--border-default)]/50 ring-1 ring-black/5"
            >
              {/* Option to set location on interactive map */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setActiveSearchField(null);
                  setMapSelectionMode("pickup");
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left bg-emerald-50/70 dark:bg-[var(--surface-subtle)] hover:bg-emerald-100/70 dark:hover:bg-[var(--brand-strong)]/50 text-emerald-950 dark:text-[var(--text-primary)] transition"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] text-[var(--on-primary)] flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-900 dark:text-[var(--text-primary)] leading-none">Set pickup point on map</p>
                  <p className="text-[10px] text-emerald-700 dark:text-[var(--text-secondary)] font-semibold mt-0.5">Move map to pinpoint exact location</p>
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-[var(--text-primary)] bg-white dark:bg-[var(--surface-subtle)] px-2 py-0.5 rounded-full border border-emerald-200 dark:border-[var(--border-interactive)] flex-shrink-0">
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
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[var(--surface-subtle)] transition"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center justify-center flex-shrink-0 border border-[var(--border-default)]">
                  <LocateFixed size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] leading-none">Current Location (GPS)</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5">Use device geolocation</p>
                </div>
              </button>

              {/* Live search loading feedback */}
              {isSearchingPickup && (
                <div className="flex items-center gap-2.5 px-4 py-3 text-[var(--text-secondary)]">
                  <Loader2 size={14} className="animate-spin text-[var(--text-primary)] shrink-0" />
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
                    className="group flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-[var(--surface-subtle)] active:bg-[var(--surface-subtle)] dark:active:bg-[var(--surface-subtle)] transition rounded-[10px] cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border transition-transform group-hover:scale-105 ${getCategoryBadgeStyle(p.category, p.title || p.name)}`}>
                      {getCategoryIcon(p.category, p.title || p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-black dark:group-hover:text-white">
                        {p.title || p.name}
                      </p>
                      {p.subtitle && (
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                          {p.subtitle}
                        </p>
                      )}
                    </div>

                    {distToPoint !== null && (
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] px-2 py-0.5 rounded-full flex-shrink-0">
                        {typeof distToPoint === "number" ? distToPoint.toFixed(1) : distToPoint} km
                      </span>
                    )}
                    <ChevronRight size={13} className="text-[var(--text-secondary)]/50 dark:text-[var(--border-default)] group-hover:text-[var(--text-primary)] dark:group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0" />
                  </button>
                );
              })}

              {/* No results fallback */}
              {!isSearchingPickup && pickup.trim().length >= 2 && pickupResults.length === 0 && (
                <div className="px-4 py-4 text-center space-y-2">
                  <p className="text-xs font-bold text-[var(--text-secondary)]">No exact places found for &quot;{pickup}&quot;</p>
                  <p className="text-[11px] text-[var(--text-secondary)]/80 dark:text-[var(--text-secondary)]">Can&apos;t find your place? Move the pin to pick on the interactive map.</p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveSearchField(null);
                      setMapSelectionMode("pickup");
                    }}
                    className="min-h-11 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] text-xs font-bold transition"
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
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-dashed border-[var(--border-default)] hover:border-[var(--border-interactive)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] text-[11px] font-bold tracking-tight transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <Plus size={12} className="text-[var(--text-primary)]" />
            <span>Add stop (max 2)</span>
          </button>
        ) : (
          <span className="text-[10px] font-semibold text-[var(--text-secondary)]">Max 2 stops</span>
        )}

        <div className="h-[1px] bg-[var(--border-default)] flex-1 mx-3" />

        <button
          type="button"
          onClick={handleSwapLocations}
          title="Swap pickup and destination"
          aria-label="Swap pickup and destination"
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] text-[11px] font-bold uppercase tracking-wider transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <ArrowDownUp size={11} className="text-[var(--text-primary)]" />
          <span>Swap</span>
        </button>
      </div>

      {/* Destination Row */}
      <div className="relative">
        <div className="flex items-center gap-2.5 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] px-3.5 py-2 min-h-[46px] focus-within:border-[var(--accent-vermilion)] dark:focus-within:border-[var(--accent-vermilion)] focus-within:ring-2 focus-within:ring-[#E34222]/10 transition-all shadow-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-vermilion)] flex-shrink-0" />

          {/* Reorder controls for Drop (only when intermediate stops exist) */}
          {stops.length > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleReorderWaypoint(stops.length + 1, stops.length)}
                aria-label="Move destination above the previous stop"
                title="Move destination up"
                className="size-11 flex items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <ChevronUp size={12} />
              </button>
              <GripVertical size={12} className="text-[var(--text-secondary)]/50 dark:text-[var(--text-secondary)]/50 select-none flex-shrink-0" />
            </div>
          )}

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
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-[15px] font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] truncate tracking-tight"
          />
          {isSearchingDrop ? (
            <Loader2 size={13} className="animate-spin text-[var(--text-secondary)] flex-shrink-0" />
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
              className="min-w-11 min-h-11 rounded-[8px] inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
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
            className="w-7 h-7 rounded-[6px] border border-[var(--accent-vermilion)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] transition flex items-center justify-center flex-shrink-0"
          >
            <MapPin size={13} className="text-[var(--accent-vermilion)] dark:text-[var(--accent-vermilion)]" />
          </motion.button>
        </div>

        {/* Drop Autocomplete Results & Recent Destinations */}
        <AnimatePresence>
          {activeSearchField === "drop" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-[14px] shadow-2xl max-h-72 overflow-y-auto z-50 divide-y divide-[var(--border-default)]/60 dark:divide-[var(--border-default)]/50 ring-1 ring-black/5"
            >
              {/* Option to set location on interactive map */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setActiveSearchField(null);
                  setMapSelectionMode("drop");
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left bg-rose-50/70 dark:bg-[var(--surface-subtle)]/60 hover:bg-rose-100/70 dark:hover:bg-[var(--surface-subtle)] text-rose-950 dark:text-[var(--text-primary)] transition"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] text-[var(--on-primary)] flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-rose-900 dark:text-[var(--accent-vermilion)] leading-none">Set destination point on map</p>
                  <p className="text-[10px] text-rose-700 dark:text-[var(--text-secondary)] font-semibold mt-0.5">Move map to pinpoint exact location</p>
                </div>
                <span className="text-[10px] font-black uppercase text-rose-700 dark:text-[var(--accent-vermilion)] bg-white dark:bg-[var(--surface-subtle)] px-2 py-0.5 rounded-full border border-rose-200 dark:border-[var(--accent-vermilion)]/50 flex-shrink-0">
                  Pinpoint
                </span>
              </button>

              {/* Live search loading feedback */}
              {isSearchingDrop && (
                <div className="flex items-center gap-2.5 px-4 py-3 text-[var(--text-secondary)]">
                  <Loader2 size={14} className="animate-spin text-[var(--text-primary)] shrink-0" />
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
                    className="group flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-[var(--surface-subtle)] active:bg-[var(--surface-subtle)] dark:active:bg-[var(--surface-subtle)] transition rounded-[10px] cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border transition-transform group-hover:scale-105 ${getCategoryBadgeStyle(p.category, p.title || p.name)}`}>
                      {getCategoryIcon(p.category, p.title || p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-black dark:group-hover:text-white">
                        {p.title || p.name}
                      </p>
                      {p.subtitle && (
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                          {p.subtitle}
                        </p>
                      )}
                    </div>

                    {distToPoint !== null && (
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] px-2 py-0.5 rounded-full flex-shrink-0">
                        {typeof distToPoint === "number" ? distToPoint.toFixed(1) : distToPoint} km
                      </span>
                    )}

                    <ChevronRight size={13} className="text-[var(--text-secondary)]/50 dark:text-[var(--border-default)] group-hover:text-[var(--text-primary)] dark:group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0" />
                  </button>
                );
              })}

              {/* Recent Destinations fallback when no active input query */}
              {dropResults.length === 0 && !isSearchingDrop && recentDestinations.length > 0 && (
                <>
                  <div className="px-3.5 py-1.5 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]/60 dark:border-[var(--border-default)] flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-wider">🕒 Recent Destinations</span>
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
                      className="group flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-[var(--surface-subtle)] active:bg-[var(--surface-subtle)] dark:active:bg-[var(--surface-subtle)] transition rounded-[10px]"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                        🕒
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-black dark:group-hover:text-white">{recent.name}</p>
                        {recent.subtitle && (
                          <p className="text-[10px] text-[var(--text-secondary)] font-medium truncate mt-0.5">{recent.subtitle}</p>
                        )}
                      </div>
                      <ChevronRight size={13} className="text-[var(--text-secondary)]/50 dark:text-[var(--border-default)] group-hover:text-[var(--text-primary)] dark:group-hover:text-[var(--text-primary)] flex-shrink-0" />
                    </button>
                  ))}
                </>
              )}

              {/* No results fallback */}
              {!isSearchingDrop && drop.trim().length >= 2 && dropResults.length === 0 && (
                <div className="px-4 py-4 text-center space-y-2">
                  <p className="text-xs font-bold text-[var(--text-secondary)]">No exact places found for &quot;{drop}&quot;</p>
                  <p className="text-[11px] text-[var(--text-secondary)]/80 dark:text-[var(--text-secondary)]">Can&apos;t find your place? Move the pin to pick on the interactive map.</p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveSearchField(null);
                      setMapSelectionMode("drop");
                    }}
                    className="min-h-11 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] text-xs font-bold transition"
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
      <div role="group" aria-label="Trip type" className="grid grid-cols-2 gap-1 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-subtle)] p-1">
        <button
          type="button"
          aria-pressed={serviceMode === "passenger"}
          onClick={() => {
            setServiceMode("passenger");
            if (vehicle === "loading" || vehicle === "truck") setVehicle("car");
          }}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-transparent px-2 text-sm font-semibold aria-pressed:border-[var(--text-primary)] aria-pressed:bg-[var(--surface-raised)]"
        >
          <Car size={16} aria-hidden="true" />
          Rides
        </button>
        <button
          type="button"
          aria-pressed={serviceMode === "logistics"}
          onClick={() => {
            setServiceMode("logistics");
            if (vehicle !== "loading" && vehicle !== "truck") setVehicle("loading");
          }}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-transparent px-2 text-sm font-semibold aria-pressed:border-[var(--text-primary)] aria-pressed:bg-[var(--surface-raised)]"
        >
          <Package size={16} aria-hidden="true" />
          Cargo
        </button>
      </div>

      <TripVehicleChooser
        mode={serviceMode}
        selected={vehicle}
        onSelect={setVehicle}
        isAvailable={(id) => checkLimit(id, effectiveDistance)}
        fareFor={(id) => estimateFare(id, effectiveDistance)}
        recommended={smartMatchResult?.vehicleId}
        distance={effectiveDistance}
        noRoad={routeDistance === -1}
        schedule={bookingMode === "schedule"}
        scheduledDateTime={scheduledDateTime}
      />

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
        <div className="p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[10px] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
              <p className="text-[11px] font-bold uppercase text-[var(--text-primary)] tracking-wider">
                📍 Recommended Pickups
              </p>
            </div>
            <span className="text-[10px] text-[var(--text-primary)] font-bold">Suggested</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {smartPickups.map((spot) => {
              const isSelected = selectedSmartPickup?.id === spot.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => handleSelectSmartPickup(spot)}
                  className={`min-h-11 shrink-0 rounded-[8px] border p-2 text-left transition-colors max-w-[200px] cursor-pointer ${
                    isSelected
                      ? "bg-[var(--brand-primary)] text-[var(--on-primary)] border-[var(--border-interactive)]"
                      : "bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-[var(--border-interactive)]"
                  }`}
                >
                  <p className="font-bold text-[11px] leading-tight truncate">{spot.spotName}</p>
                  <p className={`text-[9px] mt-0.5 truncate ${isSelected ? "text-[var(--on-primary)]/90" : "text-[var(--text-secondary)]"}`}>
                    {spot.venueName} • 🚶 {spot.walkingTimeText}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── GOODS TRANSPORT (LOGISTICS) DETAILS INPUTS ── */}
      {serviceMode === "logistics" && (
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-[var(--text-primary)] text-xs font-black uppercase tracking-wider">
            <Package size={14} className="text-[var(--text-secondary)]" />
            <span>Goods & Consignment Details</span>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">Cargo type</p>
            <div role="group" aria-label="Cargo type" className="flex flex-wrap gap-1.5">
              {["Boxes & Cartons", "Furniture & Home", "Commercial Goods", "Machinery & Parts"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCargoType(type)}
                  aria-pressed={cargoType === type}
                  className={`min-h-11 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    cargoType === type
                      ? "bg-[var(--surface-subtle)] text-[var(--text-primary)] border-[var(--text-primary)]"
                      : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Receiver contact (optional)
              <input
                type="tel"
                placeholder="Alternate phone" inputMode="tel"
                value={receiverContact}
                onChange={(e) => setReceiverContact(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-2.5 text-sm text-[var(--text-primary)]"
              />
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Delivery instructions
              <input
                type="text"
                placeholder="e.g. 2nd floor, handle with care"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-2.5 text-sm text-[var(--text-primary)]"
              />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── SELECTION CONFIRMATION TOAST ── */}
      <AnimatePresence>
        {selectionToast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="status" className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2 text-sm font-semibold"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[var(--text-primary)] dark:text-[var(--text-primary)] shrink-0" />
              <span>{selectionToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectionToast(null)}
              aria-label="Dismiss notification"
              className="grid size-11 shrink-0 place-items-center rounded-[8px] text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SMART RIDE ASSISTANT ENTRY CARD ── */}
      {pickupLat && dropLat && (
        <div className="flex flex-col justify-between gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3.5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Sparkles size={13} aria-hidden="true" />
              Not sure which ride to choose?
            </span>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
              Let Jaatri find the right ride for your {effectiveDistance ? `${effectiveDistance} km ` : ""}journey.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSmartAssistantModal(true)}
            className="w-full sm:w-auto px-3.5 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] rounded-[8px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[44px] touch-manipulation active:scale-[0.99]"
          >
            <Sparkles size={14} />
            <span>Help me choose</span>
          </button>
        </div>
      )}

      {/* 🛡️ DRIVER SAFETY PREFERENCE (ABOVE VEHICLE GRID) */}
      {serviceMode === "passenger" && (
        <div className="bg-[var(--surface-subtle)] dark:bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-[12px] p-3.5 mb-1">
          <DriverPreferenceSelector
            value={driverPreference}
            onChange={setDriverPreference}
            womenDriversCount={womenDriversCount}
          />
          {driverPreference === "woman" && womenDriversCount === 0 && (
            <div className="mt-2.5 p-2.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--accent-vermilion)]/30 text-xs text-[var(--accent-vermilion)] flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-bold">No verified women drivers online nearby right now.</span>{" "}
                <span>You can still select this preference (our dispatch engine will search for 3 minutes before prompting), or choose &quot;Any driver&quot; for instant pickup.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Itemized Fare Receipt Accordion */}
      <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[10px] p-3.5 space-y-2 shadow-xs">
        <button
          type="button"
          aria-expanded={showFareReceipt}
          onClick={() => setShowFareReceipt(!showFareReceipt)}
          className="w-full min-h-[44px] py-1 flex items-center justify-between gap-3 text-left cursor-pointer rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] flex-shrink-0">
              <FileText size={14} />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--text-primary)] block leading-tight">
                Fare Breakdown
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] font-medium">Upfront guaranteed pricing</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-primary)] text-base sm:text-lg font-black tabular-nums">
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
              className="pt-2.5 border-t border-[var(--border-default)] space-y-2 text-xs text-[var(--text-secondary)] font-medium"
            >
              <div className="flex justify-between">
                <span>Base Fare</span>
                <span className="font-bold text-[var(--text-primary)]">₹{currentBreakdown.baseFare}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Distance Fare ({currentBreakdown.distanceKm} km × ₹{currentBreakdown.pricePerKm}/km)</span>
                <span className="font-bold text-[var(--text-primary)]">₹{currentBreakdown.distanceFare}</span>
              </div>
              {currentBreakdown.surgeAmount > 0 && (
                <div className="flex justify-between text-[11px] text-[var(--accent-gold)] font-bold">
                  <span>High Demand Surge ({currentBreakdown.surgeMultiplier}x)</span>
                  <span>+₹{currentBreakdown.surgeAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px]">
                <span>Platform Tech Fee</span>
                <span className="font-bold text-[var(--text-primary)]">₹{currentBreakdown.platformFee}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Govt GST / Taxes (5%)</span>
                <span className="font-bold text-[var(--text-primary)]">₹{currentBreakdown.taxes}</span>
              </div>
              {currentBreakdown.isStudentDiscountApplied && (
                <div className="flex justify-between text-[11px] text-[var(--text-primary)] font-bold pt-1 border-t border-[var(--border-default)] dark:border-[var(--border-interactive)]/50">
                  <span>🎓 Student Pass Discount (-10%)</span>
                  <span>-₹{currentBreakdown.studentDiscount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-dashed border-[var(--border-default)] flex flex-col gap-1 text-[10px] text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
                <span>Payment Accepted:</span>
                <span className="font-bold text-[var(--text-primary)]">⚡ UPI (GPay/PhonePe) • Cash • Card</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Student Pass Banner & Verification Modal */}
      <div className="p-3 bg-[var(--brand-primary)] dark:bg-[var(--surface-subtle)] text-white rounded-[10px] border border-[var(--border-interactive)] dark:border-[var(--border-default)] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[var(--surface-subtle)] text-amber-400 flex items-center justify-center border border-[var(--border-interactive)]/40 dark:border-[var(--border-default)] flex-shrink-0">
            <GraduationCap size={15} />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold tracking-tight text-[var(--on-primary)]">Student Pass (10% OFF)</p>
            <p className="text-[11px] text-[var(--on-primary)] font-medium">
              {isStudent ? "Active & Applied" : "Save 10% with college email"}
            </p>
          </div>
        </div>
        {!isStudent && (
          <button
            type="button"
            onClick={() => setShowStudentForm(true)}
            className="min-h-11 px-2.5 py-1 bg-[var(--accent-mint)] text-[#142238] font-semibold text-xs rounded-[6px] transition cursor-pointer shadow-xs"
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
      <div className="flex items-center gap-2.5 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] px-3.5 py-2 min-h-[46px] focus-within:border-[var(--border-interactive)] dark:focus-within:border-[var(--border-interactive)] transition-all">
        <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] bg-[var(--surface-raised)] border border-[var(--border-default)] px-2 py-1 rounded-[6px] flex items-center gap-1 flex-shrink-0 select-none">
          +91
        </span>
        <input
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
          aria-label="Mobile number"
          autoComplete="tel-national"
          inputMode="numeric"
          placeholder="10-digit mobile number"
          className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)] tabular-nums min-w-0"
        />
        {mobile.length === 10 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--text-primary)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded-[6px] border border-[var(--border-default)] dark:border-[var(--border-interactive)] flex-shrink-0">
            <CheckCircle2 size={13} className="text-[var(--text-primary)] dark:text-[var(--text-primary)]" />
            Verified
          </span>
        ) : (
          <span className="hidden shrink-0 text-[11px] font-medium text-[var(--text-secondary)] min-[380px]:inline">
            OTP on arrival
          </span>
        )}
      </div>
    </div>
  );

  const renderTripAction = () => {
    const selectedLabel = t(`fleet.${vehicle}.title`, VEHICLE_OPTIONS[vehicle]?.label || "Ride");
    const blockReason = activeExistingRide
      ? "Complete or cancel your active trip first."
      : !drop
      ? "Add your destination."
      : routeDistance === -1
      ? "No road connection found. Try another location."
      : mobile.length !== 10
      ? "Enter a valid 10-digit mobile number below the fare details."
      : !distanceValidity.valid
      ? distanceValidity.message
      : !isScheduleValid
      ? "Choose a pickup time at least 25 minutes ahead."
      : "Complete the pickup, destination, and any added stops.";

    return (
      <div className="shrink-0 border-t border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:px-4 xl:px-6">
        {hasRoute && routeDistance !== -1 && distanceValidity.valid && (
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
            <span className="min-w-0">Estimated fare <span className="text-[var(--text-primary)]">· {selectedLabel}</span></span>
            <strong className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">₹{currentBreakdown.totalFare.toLocaleString("en-IN")}</strong>
          </div>
        )}
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleConfirmRide}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--border-interactive)] bg-[var(--action-bg)] px-3 py-2 text-sm font-semibold text-[var(--action-fg)] hover:brightness-95 disabled:cursor-not-allowed disabled:border-[var(--border-default)] disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-secondary)]"
        >
          <span>{!hasRoute ? "Choose a destination" : bookingMode === "schedule" ? "Review scheduled ride" : `Choose ${selectedLabel}`}</span>
          <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
        </button>
        {hasRoute && !canContinue && (
          <p role="status" className="mt-1.5 text-xs text-[var(--text-secondary)]">{blockReason}</p>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[var(--background)] text-[var(--text-primary)] font-sans flex flex-col md:flex-row">
      
      {/* ══ 1. DESKTOP / TABLET UNIFIED EDITORIAL PANEL (BOOKING SIDE) ══ */}
      <div inert={mapSelectionMode !== "none"} className={`hidden md:flex w-full md:w-[min(46%,30rem)] h-full flex-col bg-[var(--surface-raised)] border-r border-[var(--border-default)] z-10 rounded-none overflow-hidden transition-all duration-300 flex-shrink-0 ${
        mapSelectionMode !== "none" ? "opacity-0 pointer-events-none -translate-x-12" : "opacity-100 translate-x-0"
      }`}>
        
        {/* Pinned Card Header */}
        <div className="flex-shrink-0 px-4 py-4 xl:px-6 border-b border-[var(--border-default)] bg-[var(--surface-raised)] space-y-3 relative z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/" prefetch={true}
                className="w-11 h-11 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-primary)] transition cursor-pointer shrink-0"
                aria-label="Go Home"
                title="Go Home"
              >
                <HomeIcon size={15} />
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-11 h-11 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-primary)] transition cursor-pointer shrink-0"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <Link href="/" prefetch={true} className="flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer">
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
                <span className="text-[11px] font-black uppercase tracking-wider bg-[var(--brand-primary)] text-[var(--text-primary)] border border-[var(--border-interactive)] px-2.5 py-1 rounded-[8px] tabular-nums">
                  {effectiveDistance} km
                </span>
              )}
              {!isAuthenticated && sessionStatus !== "loading" && (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] text-xs font-bold rounded-[8px] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Plan your trip</p>
            <h1 className="text-[clamp(1.65rem,4vw,2.25rem)] font-semibold leading-tight tracking-[-0.045em]">Where are you headed?</h1>
          </div>

          {/* Active Ride Recovery & Double Booking Protection */}
          <ActiveRideBanner variant="inline" onActiveRideFound={setActiveExistingRide} />

          {/* Location Inputs */}
          {renderLocationInputs()}
        </div>

        {/* Scrollable Card Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scroll-padding-block:0.75rem] xl:px-6">
          {!hasRoute ? (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 xl:p-6">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-[8px] bg-[var(--surface-subtle)]">
                <MapPin size={19} aria-hidden="true" />
              </div>
              <p className="text-base font-semibold">Your ride starts here</p>
              <p className="mt-2 max-w-[35ch] text-sm leading-relaxed text-[var(--text-secondary)]">
                Add a pickup and destination to see ride options and estimated fares.
              </p>
            </div>
          ) : (
            renderRideSelection()
          )}
        </div>

        {renderTripAction()}

      </div>

      {/* ══ 2. DESKTOP / TABLET MAP CANVAS (TAKES THE OTHER 50%, FULLSCREEN ONLY DURING PIN SELECTION) ══ */}
      <div className={`hidden md:block ${
        mapSelectionMode !== "none"
          ? "fixed inset-0 z-40 bg-[var(--background)]"
          : "w-full md:w-1/2 flex-1 h-full relative z-0 bg-[var(--background)]"
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
      <div className="md:hidden flex flex-col w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[var(--background)]">
        {/* Fullscreen Map when user is picking location pin on mobile */}
        {mapSelectionMode !== "none" ? (
          <div className="fixed inset-0 z-40 bg-[var(--background)]">
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
            <div className="p-3.5 bg-[var(--surface-raised)] border-b border-[var(--border-default)] z-10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link
                    href="/" prefetch={true}
                    className="w-11 h-11 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-primary)] transition shrink-0"
                    aria-label="Go Home"
                    title="Go Home"
                  >
                    <HomeIcon size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-11 h-11 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-primary)] shrink-0"
                    aria-label="Go back"
                    title="Go back"
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <Link href="/" prefetch={true} className="flex items-center gap-1.5 hover:opacity-90 transition">
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
              <div className="pt-1">
                <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Plan your trip</p>
                <h1 className="text-[1.7rem] leading-tight font-semibold tracking-[-0.045em]">Where are you headed?</h1>
              </div>
              <ActiveRideBanner variant="inline" onActiveRideFound={setActiveExistingRide} />
              {renderLocationInputs()}
            </div>
            <div className="flex-1 relative z-0 bg-[var(--background)]">
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
            <h1 className="sr-only">Plan your trip</h1>
            {/* Floating Top-Left Home / Back CTA over Mobile Map */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 pointer-events-auto">
              <Link
                href="/" prefetch={true}
                className="min-h-[44px] px-3 bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[8px] flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition"
                title="Home"
              >
                <HomeIcon size={13} />
                <span>Home</span>
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="min-w-[44px] min-h-[44px] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[8px] flex items-center justify-center transition"
                title="Back"
                aria-label="Go back"
              >
                <ArrowLeft size={14} />
              </button>
            </div>

            {/* Floating Top-Right Sign In CTA for Mobile when unauthenticated */}
            {!isAuthenticated && sessionStatus !== "loading" && (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="absolute top-3 right-3 z-30 min-h-[44px] px-3.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] rounded-[8px] shadow-md flex items-center gap-1.5 text-xs font-bold pointer-events-auto transition cursor-pointer"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}

            {/* Stable Fullscreen Map: NEVER changes container height during gestures */}
            <div className="absolute inset-0 z-0 bg-[var(--background)]">
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
                hideMapControls={mobileSheetState !== "down"}
                compactRouteSummary
                selectionMode={mapSelectionMode}
                onSelectionModeChange={setMapSelectionMode}
                onConfirmPinSelection={handleConfirmPinSelection}
              />
            </div>

            {/* Header and confirmation are outside the scroll region, so they never cover focused options. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end">
              <motion.div
                animate={{
                  height: mobileSheetState === "up" ? "88dvh" : mobileSheetState === "down" ? 64 : "65dvh",
                }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 36 }}
                className="pointer-events-auto flex flex-col overflow-hidden rounded-t-[16px] border-t border-[var(--border-default)] bg-[var(--surface-raised)]"
              >
                <div
                  className="flex shrink-0 touch-none items-center justify-between gap-1 border-b border-[var(--border-default)] px-2 py-1.5"
                  onTouchStart={(event) => {
                    const touch = event.touches[0];
                    if (touch) sheetGesture.current = { y: touch.clientY, time: Date.now() };
                  }}
                  onTouchCancel={() => { sheetGesture.current = null; }}
                  onTouchEnd={(event) => {
                    const gesture = sheetGesture.current;
                    sheetGesture.current = null;
                    const touch = event.changedTouches[0];
                    if (!gesture || !touch) return;
                    const delta = touch.clientY - gesture.y;
                    const velocity = delta / Math.max(1, Date.now() - gesture.time);
                    if (delta < -35 || velocity < -0.35) setMobileSheetState((prev) => prev === "down" ? "half" : "up");
                    else if (delta > 35 || velocity > 0.35) setMobileSheetState((prev) => prev === "up" ? "half" : "down");
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={mobileSheetState !== "down"}
                    ref={sheetControlRef}
                    aria-label={mobileSheetState === "down" ? "Show ride options" : mobileSheetState === "up" ? "Show more map" : "Expand ride options"}
                    onClick={() => setMobileSheetState((prev) => prev === "down" ? "up" : prev === "up" ? "half" : "up")}
                    className="grid size-11 shrink-0 place-items-center rounded-[8px] border border-[var(--border-default)]"
                  >
                    {mobileSheetState === "up" ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronUp size={17} aria-hidden="true" />}
                  </button>
                  <div className="flex min-w-0 flex-1 items-center justify-center gap-1 text-xs font-medium">
                    <span className="truncate">{pickup.split(",")[0]}</span>
                    <ArrowRight size={12} aria-hidden="true" className="shrink-0 text-[var(--text-secondary)]" />
                    <span className="truncate font-semibold">{drop.split(",")[0]}</span>
                    {effectiveDistance > 0 && <span className="hidden shrink-0 text-[var(--text-secondary)] min-[385px]:inline">· {effectiveDistance} km</span>}
                  </div>
                  {mobileSheetState !== "down" && (
                    <>
                      <button
                        type="button"
                        aria-expanded={isEditingRoute}
                        onClick={() => setIsEditingRoute((value) => !value)}
                        className="min-h-11 shrink-0 rounded-[8px] px-2 text-xs font-semibold underline underline-offset-4"
                      >
                        {isEditingRoute ? "Done" : "Edit route"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sheetControlRef.current?.focus({ preventScroll: true });
                          setMobileSheetState("down");
                        }}
                        aria-label="Minimize ride options"
                        className="grid size-11 shrink-0 place-items-center rounded-[8px] border border-[var(--border-default)]"
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
                {mobileSheetState !== "down" && (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5 [scroll-padding-block:0.75rem]">
                      {isEditingRoute && <div className="mb-3 border-b border-[var(--border-default)] pb-3">{renderLocationInputs()}</div>}
                      {renderRideSelection()}
                    </div>
                    {renderTripAction()}
                  </>
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
              className="bg-[var(--surface-raised)] rounded-[12px] p-6 max-w-sm w-full shadow-2xl border border-[var(--border-default)] text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-[8px] bg-amber-50 dark:bg-amber-950/30 text-[var(--accent-gold)] border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight uppercase">Service unavailable</h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                  {effectiveDistance > 500
                    ? `Selected route (${effectiveDistance} km) exceeds our maximum service radius of 500 km. Please select a closer destination.`
                    : "We currently do not operate trips on this route or location. Please adjust your pickup or drop location."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceUnavailableModal(false)}
                className="w-full py-2.5 rounded-[8px] bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
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
              className="bg-[var(--surface-raised)] rounded-[12px] p-5 sm:p-6 max-w-md w-full shadow-2xl border border-[var(--border-default)] relative space-y-4"
            >
              <div className="flex items-start justify-between border-b border-[var(--border-default)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[8px] bg-[var(--brand-primary)] dark:bg-[var(--surface-subtle)] text-white flex items-center justify-center flex-shrink-0">
                    <Settings size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-tight font-heading">
                      Enable Location Access
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">Browser permission steps</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationSettingsGuide(false)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-white transition p-1 cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs text-[var(--text-primary)]">
                <div className="p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] flex items-start gap-3 shadow-xs">
                  <span className="w-5 h-5 bg-[var(--brand-primary)] text-[var(--on-primary)] text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-[11px] leading-relaxed">
                    Look for the <strong>Padlock 🔒</strong> or <strong>Tune/Sliders ⚙️</strong> icon in your browser address bar next to the website URL.
                  </p>
                </div>
                <div className="p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] flex items-start gap-3 shadow-xs">
                  <span className="w-5 h-5 bg-[var(--brand-primary)] text-[var(--on-primary)] text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-[11px] leading-relaxed">
                    Click <strong>&quot;Permissions&quot;</strong> or <strong>&quot;Site settings&quot;</strong>.
                  </p>
                </div>
                <div className="p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] flex items-start gap-3 shadow-xs">
                  <span className="w-5 h-5 bg-[var(--brand-primary)] text-[var(--on-primary)] text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-[11px] leading-relaxed">
                    Find <strong>&quot;Location&quot;</strong> and switch from &quot;Block&quot; to <strong className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">&quot;Allow&quot;</strong>.
                  </p>
                </div>
                <div className="p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] flex items-start gap-3 shadow-xs">
                  <span className="w-5 h-5 bg-[var(--brand-primary)] text-[var(--on-primary)] text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">4</span>
                  <p className="text-[11px] leading-relaxed">
                    Return here and click <strong>&quot;Ask Permission Again&quot;</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLocationSettingsGuide(false)}
                  className="px-4 py-2 border border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs font-bold rounded-[8px] transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationSettingsGuide(false);
                    locateCurrentLocation();
                  }}
                  className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] text-xs font-bold uppercase tracking-wider rounded-[8px] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
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

      {/* ── SMART RIDE ASSISTANT MODAL / BOTTOM SHEET ── */}
      <SmartRideAssistantModal
        isOpen={showSmartAssistantModal}
        onClose={() => setShowSmartAssistantModal(false)}
        serviceMode={serviceMode}
        distanceKm={effectiveDistance}
        estimateFare={estimateFare}
        checkLimit={checkLimit}
        currentVehicle={vehicle}
        onSelectVehicle={handleSelectFromAssistant}
      />

    </div>
  );
}
