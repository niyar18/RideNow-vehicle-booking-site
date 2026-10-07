"use client";



import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, MapPin, Navigation,
  Bike, Car, Truck, LocateFixed, Phone,
  CheckCircle2, ChevronRight, GraduationCap,
  Plus, X, Users, Clock, Calendar,
  Search, Edit2, Info, ChevronDown, ChevronUp,
  User, UserPlus, Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import nextDynamic from "next/dynamic";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import useGetMe from "@/shared/hooks/useGetMe";
import { calculateFareBreakdown } from "@/lib/fareEngine";
import { haversineKm as getHaversineDistance } from "@/lib/routeUtils";
import { validateServiceArea, getRecentDestinations, saveRecentDestination, RecentLocation } from "@/lib/serviceArea";
import { useTranslation } from "@/context/LanguageContext";
import FamilyRiderSelector from "@/features/booking/components/FamilyRiderSelector";
import StudentPassModal from "@/features/booking/components/StudentPassModal";
import ScheduleRidePicker from "@/features/booking/components/ScheduleRidePicker";
import WaypointsManager from "@/features/booking/components/WaypointsManager";
import ActiveRideBanner from "@/features/rides/components/ActiveRideBanner";

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
};

type VehicleType = "bike" | "auto" | "car" | "loading" | "truck";

const VEHICLES = [
  { id: "bike",    label: "Bike",    Icon: Bike,  desc: "Quick & affordable", etaText: "3 min" },
  { id: "auto",    label: "Auto",    Icon: Car,   desc: "Everyday rides",     etaText: "4 min" },
  { id: "car",     label: "Car",     Icon: Car,   desc: "Comfort rides",      etaText: "5 min" },
  { id: "loading", label: "Loading", Icon: Truck, desc: "Small cargo",        etaText: "8 min" },
  { id: "truck",   label: "Truck",   Icon: Truck, desc: "Heavy transport",    etaText: "12 min" },
];

const getCategoryIcon = (category?: string, name?: string) => {
  const c = (category || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (c.includes("aeroway") || c.includes("airport") || n.includes("airport")) return "✈️";
  if (c.includes("station") || c.includes("railway") || n.includes("station") || n.includes("train")) return "🚆";
  if (c.includes("subway") || c.includes("metro") || n.includes("metro")) return "🚇";
  if (c.includes("hospital") || c.includes("clinic") || c.includes("health") || n.includes("hospital")) return "🏥";
  if (c.includes("university") || c.includes("college") || c.includes("school") || n.includes("college") || n.includes("university")) return "🎓";
  if (c.includes("shop") || c.includes("mall") || c.includes("supermarket") || n.includes("mall")) return "🛍️";
  if (c.includes("hotel") || n.includes("hotel")) return "🏨";
  return "📍";
};

export default function BookPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const { userData } = useSelector((state: RootState) => state.user);
  useGetMe(true);

  const [pickup,   setPickup]   = useState("");
  const [drop,     setDrop]     = useState("");
  const [vehicle,  setVehicle]  = useState<VehicleType>("car");
  const [mobile,   setMobile]   = useState("");

  const [rates, setRates] = useState<any>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [activeExistingRide, setActiveExistingRide] = useState<any | null>(null);

  /* ── SEARCH & UI STATE ── */
  const [activeSearchField, setActiveSearchField] = useState<"pickup" | "drop" | null>(null);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [showFareReceipt, setShowFareReceipt] = useState(false);
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);
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

  const isScheduleValid = bookingMode === "now" || (
    Boolean(scheduledDateTime) &&
    new Date(scheduledDateTime).getTime() >= Date.now() + 25 * 60 * 1000
  );

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/vehicles/pricing");
        const data = await res.json();
        if (data.success) {
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
    const defaultLimits: Record<string, { minDistance: number; maxDistance: number }> = {
      bike:    { minDistance: 0, maxDistance: 15 },
      auto:    { minDistance: 0, maxDistance: 30 },
      car:     { minDistance: 0, maxDistance: 100 },
      loading: { minDistance: 0, maxDistance: 150 },
      truck:   { minDistance: 0, maxDistance: 500 },
    };
    const source = rates || defaultLimits;
    const cfg = source[type.toLowerCase()] || defaultLimits.car;
    const min = cfg.minDistance !== undefined ? cfg.minDistance : 0;
    const max = cfg.maxDistance !== undefined ? cfg.maxDistance : 9999;
    return dist >= min && dist <= max;
  };

  const [pickupResults, setPickupResults] = useState<Place[]>([]);
  const [dropResults,   setDropResults]   = useState<Place[]>([]);
  const [pickupCountry, setPickupCountry] = useState<string | null>("in");

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropLat,   setDropLat]   = useState<number | null>(null);
  const [dropLng,   setDropLng]   = useState<number | null>(null);
  const [locating,  setLocating]  = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
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
        return { valid: false, message: `Pickup area: ${pCheck.message || "Outside operational bounds"}` };
      }
    }
    if (dropLat && dropLng) {
      const dCheck = validateServiceArea(dropLat, dropLng);
      if (!dCheck.isSupported) {
        return { valid: false, message: `Drop area: ${dCheck.message || "Outside operational bounds"}` };
      }
    }

    if (routeDistance === -1) {
      return { valid: false, message: "No rides available (no road connection found)" };
    }
    const dist = (routeDistance !== null && routeDistance >= 0)
      ? routeDistance
      : ((pickupLat && pickupLng && dropLat && dropLng) ? getHaversineDistance(pickupLat, pickupLng, dropLat, dropLng) : null);

    if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicle || dist === null) return { valid: true };
    
    const defaultLimits: Record<string, { minDistance: number; maxDistance: number }> = {
      bike:    { minDistance: 0, maxDistance: 15 },
      auto:    { minDistance: 0, maxDistance: 30 },
      car:     { minDistance: 0, maxDistance: 100 },
      loading: { minDistance: 0, maxDistance: 150 },
      truck:   { minDistance: 0, maxDistance: 500 },
    };
    
    const source = rates || defaultLimits;
    const cfg = source[vehicle.toLowerCase()] || defaultLimits.car;
    const min = cfg.minDistance !== undefined ? cfg.minDistance : 0;
    const max = cfg.maxDistance !== undefined ? cfg.maxDistance : 9999;
    
    if (dist < min) {
      return { valid: false, message: `${VEHICLES.find(v => v.id === vehicle)?.label} requires min ${min} km (Current: ${dist.toFixed(1)} km)` };
    }
    if (dist > max) {
      return { valid: false, message: `${VEHICLES.find(v => v.id === vehicle)?.label} is limited to max ${max} km (Current: ${dist.toFixed(1)} km)` };
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

  /* ── AUTOCOMPLETE SEARCH WITH 350ms DEBOUNCE (FROM NIYAR18 COMMIT cf5491d) ── */
  const searchDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  const debouncedSearchAddress = (
    key: string,
    q: string,
    setResults: (r: Place[]) => void,
    restrict?: string | null,
    isDrop?: boolean
  ) => {
    if (searchDebounceRef.current[key]) {
      clearTimeout(searchDebounceRef.current[key]);
    }
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    searchDebounceRef.current[key] = setTimeout(() => {
      searchAddress(q, setResults, restrict, isDrop);
    }, 350);
  };

  const searchAddress = async (q: string, setResults: (r: Place[]) => void, restrict?: string | null, isDrop?: boolean) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    try {
      const countryFilter = restrict || pickupCountry || "in";
      let url = `/api/places?action=autocomplete&input=${encodeURIComponent(q.trim())}&country=${countryFilter}`;
      
      if (isDrop && pickupLat !== null && pickupLng !== null) {
        const defaultLimits: Record<string, { maxDistance: number }> = {
          bike:    { maxDistance: 15 },
          auto:    { maxDistance: 30 },
          car:     { maxDistance: 100 },
          loading: { maxDistance: 150 },
          truck:   { maxDistance: 500 },
        };
        const source = rates || defaultLimits;
        const cfg = source[(vehicle || "car").toLowerCase()] || defaultLimits.car;
        const radiusKm = (cfg.maxDistance || 100) * 1.2;
        
        const deltaLat = radiusKm / 111;
        const deltaLng = radiusKm / (111 * Math.cos((pickupLat * Math.PI) / 180));
        
        const minLat = pickupLat - deltaLat;
        const maxLat = pickupLat + deltaLat;
        const minLon = pickupLng - deltaLng;
        const maxLon = pickupLng + deltaLng;
        
        url += `&bbox=${minLon},${minLat},${maxLon},${maxLat}`;
        url += `&lat=${pickupLat}&lng=${pickupLng}`;
      } else if (!isDrop && pickupLat !== null && pickupLng !== null) {
        url += `&lat=${pickupLat}&lng=${pickupLng}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === "OK" && data.predictions) {
        const results: Place[] = data.predictions.map((p: any) => ({
          id: p.place_id,
          name: p.description,
          title: p.title || p.description,
          subtitle: p.subtitle,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
          countrycode: p.countrycode,
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
    if (typeof p.lat === "number" && typeof p.lng === "number") {
      saveRecentDestination({
        name: p.title || p.name,
        subtitle: p.subtitle,
        lat: p.lat,
        lng: p.lng,
      });
      setRecentDestinations(getRecentDestinations());

      if (isPickup) {
        setPickup(p.title || p.name);
        setPickupCountry(p.countrycode || "in");
        setPickupLat(p.lat);
        setPickupLng(p.lng);
        setPickupResults([]);
      } else {
        setDrop(p.title || p.name);
        setDropLat(p.lat);
        setDropLng(p.lng);
        setDropResults([]);
      }
      setActiveSearchField(null);
      setIsEditingRoute(false);
      return;
    }

    try {
      const res = await fetch(`/api/places?action=details&placeId=${p.id}`);
      const data = await res.json();
      if (data.status === "OK" && data.result) {
        const result = data.result;
        const formattedAddress = result.formatted_address || p.name;
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        
        let countrycode = "in";
        if (result.address_components) {
          const countryComp = result.address_components.find((c: any) => c.types.includes("country"));
          if (countryComp) {
            countrycode = String(countryComp.short_name || "in").toLowerCase();
          }
        }

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
          setPickupResults([]);
        } else {
          setDrop(formattedAddress);
          setDropLat(lat);
          setDropLng(lng);
          setDropResults([]);
        }
      }
    } catch (err) {
      console.error("Error fetching place details:", err);
    }
    setActiveSearchField(null);
    setIsEditingRoute(false);
  };

  const handleGeolocationSuccess = async (coords: GeolocationCoordinates) => {
    const lat = coords.latitude;
    const lng = coords.longitude;

    setLocationError(null);
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
        setPickup(addr);
        setPickupCountry(countryCode);
      } else {
        setPickup(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setPickupCountry("in");
      }
    } catch (err) {
      console.error("Failed to reverse geocode current location:", err);
      setPickup(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
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

  const useCurrentLocation = () => {
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

  /* ── RESTORE BOOKING DRAFT ON MOUNT (E.G. WHEN RETURNING FROM CHECKOUT) ── */
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = sessionStorage.getItem("ridenow_booking_draft");
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.pickup) setPickup(draft.pickup);
      if (draft.drop) setDrop(draft.drop);
      if (draft.vehicle) setVehicle(draft.vehicle);
      if (draft.mobile) setMobile(draft.mobile);
      if (typeof draft.pickupLat === "number") setPickupLat(draft.pickupLat);
      if (typeof draft.pickupLng === "number") setPickupLng(draft.pickupLng);
      if (typeof draft.dropLat === "number") setDropLat(draft.dropLat);
      if (typeof draft.dropLng === "number") setDropLng(draft.dropLng);
      if (Array.isArray(draft.stops) && draft.stops.length > 0) {
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
      if (draft.smartPickupDetails) setSelectedSmartPickup(draft.smartPickupDetails);
      if (draft.familyMemberDetails) setSelectedFamilyMember(draft.familyMemberDetails);
      if (draft.isScheduled) {
        setBookingMode("schedule");
        if (draft.scheduledTime) setScheduledDateTime(draft.scheduledTime);
      }
    } catch (e) {
      console.warn("Failed to restore booking draft from sessionStorage:", e);
    }
  }, []);

  /* ── INITIAL LOCATION ON MOUNT ── */
  useEffect(() => {
    // If user already had a saved draft with pickup location, preserve it!
    try {
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("ridenow_booking_draft");
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft?.pickup || typeof draft?.pickupLat === "number") {
            return;
          }
        }
      }
    } catch (_) {}

    useCurrentLocation();
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

  const handleMapChange = (p: string, d: string, c1?: [number, number] | null, c2?: [number, number] | null, countryCode?: string | null) => {
    setPickup(p);
    setDrop(d);
    if (c1) {
      setPickupLat(c1[0]);
      setPickupLng(c1[1]);
    }
    if (c2) {
      setDropLat(c2[0]);
      setDropLng(c2[1]);
    }
    if (countryCode) {
      setPickupCountry(countryCode);
    }
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
      : 5);
  const effectiveDistance = Number(haversineDist.toFixed(1));

  const currentBreakdown = calculateFareBreakdown(vehicle, effectiveDistance, rates, undefined, 0, isStudent);

  const handleConfirmRide = () => {
    if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicle) return;
    const estFare = estimateFare(vehicle, effectiveDistance);

    const validStops = stops
      .filter(s => s.address && s.lat !== null && s.lng !== null)
      .map((s, idx) => ({
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        order: idx + 1,
      }));

    const draftData = {
      pickup,
      drop,
      vehicle,
      fare: estFare,
      mobileNumber: mobile,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      distanceKm: effectiveDistance,
      isSmartPickup: Boolean(selectedSmartPickup),
      smartPickupDetails: selectedSmartPickup || null,
      stops: validStops,
      isFamilyRide: Boolean(selectedFamilyMember),
      familyMemberDetails: selectedFamilyMember || null,
      isScheduled: bookingMode === "schedule" && Boolean(scheduledDateTime),
      scheduledTime: (bookingMode === "schedule" && scheduledDateTime) ? new Date(scheduledDateTime).toISOString() : null,
    };

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
      }
    } catch (e) {
      console.warn("sessionStorage save error:", e);
    }

    router.push("/checkout");
  };

  /* ── SHARED FORM SECTIONS (REUSABLE ACROSS UNIFIED PANEL) ── */
  const renderLocationInputs = () => (
    <div className="space-y-2.5">
      {locationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center justify-between gap-2">
          <span>⚠️ {locationError}</span>
          <button
            type="button"
            onClick={() => setLocationError(null)}
            className="text-amber-700 hover:text-amber-900 font-bold text-xs shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pickup Row */}
      <div className="relative">
        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-900 focus-within:bg-white transition-all">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 flex-shrink-0" />
          <input
            aria-label="Pickup location"
            value={pickup}
            onFocus={() => setActiveSearchField("pickup")}
            onChange={(e) => {
              setPickup(e.target.value);
              setPickupLat(null);
              setPickupLng(null);
              debouncedSearchAddress("pickup", e.target.value, setPickupResults, pickupCountry || "in", false);
            }}
            placeholder={t("booking.pickup", "Pickup location")}
            className="flex-1 bg-transparent text-xs font-bold text-zinc-900 placeholder:text-zinc-400 outline-none truncate"
          />
          {pickup && (
            <button
              type="button"
              onClick={() => {
                setPickup("");
                setPickupLat(null);
                setPickupLng(null);
                setPickupResults([]);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-700"
            >
              <X size={14} />
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={useCurrentLocation}
            disabled={locating}
            title="Use current location"
            className="w-7 h-7 rounded-lg bg-zinc-200/80 hover:bg-zinc-300 transition flex items-center justify-center flex-shrink-0"
          >
            <LocateFixed size={13} className={`text-zinc-700 ${locating ? "animate-spin" : ""}`} />
          </motion.button>
        </div>

        {/* Pickup Autocomplete Results */}
        <AnimatePresence>
          {activeSearchField === "pickup" && pickupResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-50 divide-y divide-zinc-100"
            >
              {pickupResults.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPlace(p, true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition"
                >
                  <span className="text-base flex-shrink-0">
                    {getCategoryIcon(p.category, p.title || p.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">
                      {p.title || p.name}
                    </p>
                    {p.subtitle && (
                      <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                        {p.subtitle}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={13} className="text-zinc-300 flex-shrink-0" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Intermediate Stops */}
      <WaypointsManager
        stops={stops}
        onAddStop={handleAddStop}
        onRemoveStop={handleRemoveStop}
        onStopChange={handleStopChange}
        onSelectStopPlace={selectStopPlace}
        maxStops={2}
      />

      {/* Destination Row */}
      <div className="relative">
        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-900 focus-within:bg-white transition-all">
          <div className="w-2.5 h-2.5 rounded-sm bg-zinc-900 ring-2 ring-zinc-200 flex-shrink-0" />
          <input
            aria-label="Drop location"
            value={drop}
            onFocus={() => setActiveSearchField("drop")}
            onChange={(e) => {
              setDrop(e.target.value);
              setDropLat(null);
              setDropLng(null);
              debouncedSearchAddress("drop", e.target.value, setDropResults, pickupCountry || "in", true);
            }}
            placeholder={t("booking.whereTo", "Where to?")}
            className="flex-1 bg-transparent text-xs font-black text-zinc-900 placeholder:text-zinc-500 outline-none truncate"
          />
          {drop && (
            <button
              type="button"
              onClick={() => {
                setDrop("");
                setDropLat(null);
                setDropLng(null);
                setDropResults([]);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-700"
            >
              <X size={14} />
            </button>
          )}
          <Navigation size={13} className="text-zinc-400 flex-shrink-0" />
        </div>

        {/* Drop Autocomplete Results & Recent Destinations */}
        <AnimatePresence>
          {activeSearchField === "drop" && dropResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 divide-y divide-zinc-100"
            >
              {dropResults.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPlace(p, false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition"
                >
                  <span className="text-base flex-shrink-0">
                    {getCategoryIcon(p.category, p.title || p.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">
                      {p.title || p.name}
                    </p>
                    {p.subtitle && (
                      <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                        {p.subtitle}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={13} className="text-zinc-300 flex-shrink-0" />
                </button>
              ))}
            </motion.div>
          )}

          {activeSearchField === "drop" && dropResults.length === 0 && recentDestinations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 divide-y divide-zinc-100"
            >
              <div className="px-3.5 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">🕒 Recent Destinations</span>
              </div>
              {recentDestinations.map((recent) => (
                <button
                  key={recent.id}
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
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-zinc-50 transition"
                >
                  <span className="text-sm flex-shrink-0 text-zinc-400">🕒</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">{recent.name}</p>
                    {recent.subtitle && (
                      <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">{recent.subtitle}</p>
                    )}
                  </div>
                  <ChevronRight size={13} className="text-zinc-300 flex-shrink-0" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Destination Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
        {[
          { label: "Airport", icon: "✈️" },
          { label: "Railway Station", icon: "🚆" },
          { label: "City Center", icon: "🛍️" },
          { label: "Metro", icon: "🚇" },
          { label: "Hospital", icon: "🏥" },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => {
              const isTargetDrop = Boolean(pickup);
              if (isTargetDrop) {
                setDrop(chip.label);
                setActiveSearchField("drop");
                debouncedSearchAddress("drop", chip.label, setDropResults, pickupCountry || "in", true);
              } else {
                setPickup(chip.label);
                setActiveSearchField("pickup");
                debouncedSearchAddress("pickup", chip.label, setPickupResults, pickupCountry || "in", false);
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold flex items-center gap-1.5 transition flex-shrink-0 border border-zinc-200/70"
          >
            <span>{chip.icon}</span>
            <span>{chip.label}</span>
          </button>
        ))}
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
        <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">
                📍 Recommended Pickups
              </p>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold">Suggested</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {smartPickups.map((spot) => {
              const isSelected = selectedSmartPickup?.id === spot.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => handleSelectSmartPickup(spot)}
                  className={`flex-shrink-0 text-left p-2 rounded-lg border transition-colors max-w-[200px] ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-zinc-800 border-emerald-200 hover:border-emerald-400"
                  }`}
                >
                  <p className="font-extrabold text-[11px] leading-tight truncate">{spot.spotName}</p>
                  <p className={`text-[9px] mt-0.5 truncate ${isSelected ? "text-emerald-100" : "text-zinc-500"}`}>
                    {spot.venueName} • 🚶 {spot.walkingTimeText}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Vehicle Cards List */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
          Available Rides
        </p>

        {routeDistance === -1 ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <p className="text-rose-600 text-xs font-black uppercase">No Rides Available</p>
            <p className="text-zinc-500 text-[10px] mt-1 font-bold">No road connection found between these points.</p>
          </div>
        ) : (
              VEHICLES.map((v) => {
                const isSelected = vehicle === v.id;
                const isLimitOk = checkLimit(v.id, effectiveDistance);
                const fare = estimateFare(v.id, effectiveDistance);
                const vehicleLabel = t(`fleet.${v.id}.title`, v.label);
                const vehicleDesc = t(`fleet.${v.id}.desc`, v.desc);

                return (
                  <div
                    key={v.id}
                    onClick={() => isLimitOk && setVehicle(v.id as VehicleType)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-950 text-white border-zinc-950"
                        : "bg-zinc-50/80 hover:bg-zinc-100 text-zinc-900 border-zinc-200"
                    } ${!isLimitOk ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-zinc-800 text-white" : "bg-white text-zinc-900 shadow-xs border border-zinc-200"
                      }`}>
                        <v.Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-sm leading-tight truncate">{vehicleLabel}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            isSelected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-600"
                          }`}>
                            {v.etaText}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${isSelected ? "text-zinc-400" : "text-zinc-500"}`}>
                          {vehicleDesc}
                        </p>
                      </div>
                    </div>

                <div className="text-right flex-shrink-0 pl-2">
                  <p className={`font-black text-base leading-tight ${isSelected ? "text-emerald-400" : "text-zinc-900"}`}>
                    ₹{fare}
                  </p>
                  {!isLimitOk && (
                    <span className="text-[8px] font-black uppercase text-rose-500 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                      Limit
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Itemized Fare Receipt Accordion */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 space-y-2">
        <button
          type="button"
          onClick={() => setShowFareReceipt(!showFareReceipt)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">💰</span>
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
              Transparent Fare Breakdown
            </span>
          </div>
          <div className="flex items-center gap-1 text-zinc-500 text-xs font-bold">
            <span>₹{currentBreakdown.totalFare}</span>
            {showFareReceipt ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        <AnimatePresence>
          {showFareReceipt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 border-t border-zinc-200 space-y-1.5 text-xs text-zinc-600 font-medium"
            >
              <div className="flex justify-between">
                <span>Base Fare</span>
                <span className="font-bold text-zinc-900">₹{currentBreakdown.baseFare}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Distance Fare ({currentBreakdown.distanceKm} km × ₹{currentBreakdown.pricePerKm}/km)</span>
                <span className="font-bold text-zinc-900">₹{currentBreakdown.distanceFare}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Platform Service Fee</span>
                <span className="font-bold text-zinc-900">₹{currentBreakdown.platformFee}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Govt GST / Taxes (5%)</span>
                <span className="font-bold text-zinc-900">₹{currentBreakdown.taxes}</span>
              </div>
              {currentBreakdown.isStudentDiscountApplied && (
                <div className="flex justify-between text-[11px] text-emerald-600 font-extrabold pt-1 border-t border-emerald-100">
                  <span>🎓 Student Pass Discount (-10%)</span>
                  <span>-₹{currentBreakdown.studentDiscount}</span>
                </div>
              )}
              <p className="text-[10px] text-zinc-400 font-semibold pt-1 italic">
                Strictly distance-based. Duration ({currentBreakdown.timeMinutes} min) is informational only.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Student Pass Banner & Verification Modal */}
      <div className="p-3 bg-zinc-900 text-white rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 text-amber-400 flex items-center justify-center">
            <GraduationCap size={15} />
          </div>
          <div>
            <p className="text-xs font-black">Student Pass (10% OFF)</p>
            <p className="text-[10px] text-zinc-400">
              {isStudent ? "Active & Applied" : "Save 10% with college email"}
            </p>
          </div>
        </div>
        {!isStudent && (
          <button
            type="button"
            onClick={() => setShowStudentForm(true)}
            className="px-2.5 py-1 bg-amber-400 text-zinc-950 font-black text-[11px] rounded-xl hover:bg-amber-300 transition"
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

      {/* Contact Mobile Input Row */}
      <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-3.5 py-2.5">
        <Phone size={14} className="text-zinc-500 flex-shrink-0" />
        <input
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Enter 10-digit mobile number"
          className="flex-1 bg-transparent text-xs font-bold text-zinc-900 placeholder:text-zinc-400 outline-none"
        />
        {mobile.length === 10 && (
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100 font-sans select-none">
      
      {/* ══ 1. FULLSCREEN MAP CANVAS ══ */}
      <div className="absolute inset-0 z-0">
        <RouteMap
          pickup={pickup}
          drop={drop}
          pickupCoords={memoizedPickupCoords}
          dropCoords={memoizedDropCoords}
          onChange={handleMapChange}
          onCoordinatesChange={handleCoordinatesChange}
          onDistance={setRouteDistance}
          vehicles={vehicles}
          disableFallbackGeocode={false}
          smartPickups={smartPickups}
          onSelectSmartPickup={handleSelectSmartPickup}
          stops={validStopsForMap}
          bottomPadding={hasRoute ? (isMobile ? (mobileSheetExpanded ? 340 : 220) : 360) : 100}
        />
      </div>

      {/* ══ 2. UNIFIED DESKTOP / TABLET PANEL (ONE SINGLE CARD - NEVER OVERLAPS) ══ */}
      <div className="hidden md:flex fixed top-4 bottom-4 left-6 w-[420px] z-30 flex-col bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden">
        
        {/* Pinned Card Header */}
        <div className="flex-shrink-0 p-4 border-b border-zinc-100 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition flex items-center justify-center text-zinc-900"
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-base font-black text-zinc-900 leading-none">Book a Ride</h1>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">RideNow Fleet</p>
              </div>
            </div>

            {hasRoute && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                {effectiveDistance} km
              </span>
            )}
          </div>

          {/* Active Ride Recovery & Double Booking Protection */}
          <ActiveRideBanner variant="inline" onActiveRideFound={setActiveExistingRide} />

          {/* Location Inputs */}
          {renderLocationInputs()}
        </div>

        {/* Scrollable Card Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!hasRoute ? (
            <div className="py-8 text-center space-y-2 text-zinc-400">
              <span className="text-3xl">🗺️</span>
              <p className="text-xs font-bold text-zinc-600">Enter your destination to explore rides</p>
              <p className="text-[11px] text-zinc-400 max-w-[260px] mx-auto">
                Select your pickup and drop-off points to view available vehicles, live ETAs, and transparent pricing.
              </p>
            </div>
          ) : (
            renderRideSelection()
          )}
        </div>

        {/* Pinned Card Footer */}
        <div className="flex-shrink-0 p-4 border-t border-zinc-100 bg-white">
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!canContinue}
            onClick={handleConfirmRide}
            className="w-full py-3.5 rounded-xl bg-zinc-950 hover:bg-black disabled:opacity-35 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition active:scale-98"
          >
            <span>
              {!hasRoute
                ? t("booking.chooseVehicle", "Choose Destination")
                : bookingMode === "schedule"
                ? t("booking.scheduleRide", "Schedule Ride")
                : `${t("booking.confirmRide", "Confirm Ride")} • ${t(`fleet.${vehicle}.title`, VEHICLES.find(v => v.id === vehicle)?.label || "Ride")}`}
            </span>
            <ArrowRight size={16} />
          </motion.button>

          {!canContinue && (
            <p className="text-center text-[10px] font-bold mt-2 text-zinc-400 uppercase tracking-wider truncate">
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

      {/* ══ 3. MOBILE INTERFACE (< md) ══ */}
      <div className="md:hidden">
        {/* Mobile Search Card when route is NOT set */}
        {!hasRoute && (
          <div className="fixed top-3 left-3 right-3 z-30 bg-white rounded-2xl p-3.5 border border-zinc-200 shadow-lg space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-900"
              >
                <ArrowLeft size={15} />
              </button>
              <h1 className="text-sm font-black text-zinc-900">Book a Ride</h1>
            </div>
            <ActiveRideBanner variant="inline" onActiveRideFound={setActiveExistingRide} />
            {renderLocationInputs()}
          </div>
        )}

        {/* Mobile Bottom Sheet when route IS set */}
        <AnimatePresence>
          {hasRoute && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0, height: mobileSheetExpanded ? "82vh" : "285px" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl border-t border-zinc-200 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Interactive Drag Handle Area */}
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.y < -35 || info.velocity.y < -250) {
                    setMobileSheetExpanded(true);
                  } else if (info.offset.y > 35 || info.velocity.y > 250) {
                    setMobileSheetExpanded(false);
                  }
                }}
                onClick={() => setMobileSheetExpanded(prev => !prev)}
                className="w-full pt-3 pb-1 cursor-grab active:cursor-grabbing flex flex-col items-center select-none flex-shrink-0 bg-white"
              >
                <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 mt-1.5">
                  <span>{mobileSheetExpanded ? "Swipe down for map" : "Swipe up for all options"}</span>
                  {mobileSheetExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </div>
              </motion.div>

              {/* Compact Route Summary Header with Edit Toggle */}
              <div className="flex-shrink-0 px-4 py-2 border-b border-zinc-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-zinc-800 truncate max-w-[120px]">{pickup}</span>
                  <span className="text-zinc-400">→</span>
                  <span className="w-2 h-2 rounded-sm bg-zinc-900 flex-shrink-0" />
                  <span className="text-xs font-black text-zinc-900 truncate max-w-[120px]">{drop}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {effectiveDistance} km
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingRoute(!isEditingRoute);
                      if (!isEditingRoute) setMobileSheetExpanded(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Edit2 size={11} />
                    <span>{isEditingRoute ? "Done" : "Edit"}</span>
                  </button>
                </div>
              </div>

              {/* If Mobile User Tapped Edit, Show Inputs Inline */}
              {isEditingRoute && (
                <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex-shrink-0">
                  {renderLocationInputs()}
                </div>
              )}

              {/* Peek Mode Selected Vehicle Preview (Visible when collapsed) */}
              {!mobileSheetExpanded && (
                <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-100/80 bg-zinc-50/50 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
                      {(() => {
                        const Icon = VEHICLES.find(v => v.id === vehicle)?.Icon || Car;
                        return <Icon size={20} />;
                      })()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">
                        {VEHICLES.find(v => v.id === vehicle)?.label || "Car"}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-bold">
                        {VEHICLES.find(v => v.id === vehicle)?.etaText || "4 min away"} • {currentBreakdown.timeMinutes} min trip
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <p className="text-base font-black text-zinc-900">₹{currentBreakdown.totalFare}</p>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase">Guaranteed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileSheetExpanded(true)}
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-[11px] font-bold text-zinc-800 hover:bg-zinc-100"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Rides Body (Fully scrollable when expanded) */}
              {mobileSheetExpanded && (
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                  {renderRideSelection()}
                </div>
              )}

              {/* Mobile Sticky Footer */}
              <div className="flex-shrink-0 p-3.5 border-t border-zinc-100 bg-white">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={!canContinue}
                  onClick={handleConfirmRide}
                  className="w-full py-3.5 rounded-xl bg-zinc-950 hover:bg-black disabled:opacity-35 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition active:scale-98 shadow-md"
                >
                  <span>
                    {bookingMode === "schedule"
                      ? t("booking.scheduleRide", "Schedule Ride")
                      : `${t("booking.confirmRide", "Confirm Ride")} • ${t(`fleet.${vehicle}.title`, VEHICLES.find(v => v.id === vehicle)?.label || "Ride")} • ₹${currentBreakdown.totalFare}`}
                  </span>
                  <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}