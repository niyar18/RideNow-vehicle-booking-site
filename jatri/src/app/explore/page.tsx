"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  LocateFixed,
  Car,
  CalendarDays,
  Plane,
  CalendarClock,
  Users,
  Package,
  ArrowRight,
  Loader2,
  MapPin,
} from "lucide-react";
import { PublicHeading, PublicPage } from "@/shared/components/public/PublicPage";
import styles from "@/shared/components/public/public-page.module.css";

interface ServiceCardItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  route: string;
}

const KAZIRANGA = "Kaziranga National Park, Assam";
const KAZIRANGA_BOOKING = `/book?drop=${encodeURIComponent(KAZIRANGA)}&dropLat=26.5775&dropLng=93.1711&category=cars&service=outstation`;

const EXPLORE_SERVICES: ServiceCardItem[] = [
  {
    id: "daily-rides",
    title: "Daily Rides",
    subtitle: "From the market to the office",
    image: "/explore/explore_daily_rides.webp",
    icon: Car,
    route: "/book?category=cars",
  },
  {
    id: "outstation",
    title: "Outstation",
    subtitle: "Make a day of it beyond the city",
    image: "/explore/explore_outstation.webp",
    icon: CalendarDays,
    route: "/book?category=cars&service=outstation",
  },
  {
    id: "airport",
    title: "Airport Transfers",
    subtitle: "To and from Guwahati airport",
    image: "/explore/explore_airport.webp",
    icon: Plane,
    route:
      "/book?drop=Lokpriya+Gopinath+Bordoloi+International+Airport,+Guwahati&dropLat=26.1061&dropLng=91.5859&category=cars",
  },
  {
    id: "schedule",
    title: "Schedule Booking",
    subtitle: "Set a pickup for later",
    image: "/explore/explore_schedule.webp",
    icon: CalendarClock,
    route: "/book?reserve=true",
  },
  {
    id: "group",
    title: "Group Booking",
    subtitle: "Share a plan with your group",
    image: "/explore/explore_group.webp",
    icon: Users,
    route: "/group/join",
  },
  {
    id: "cargo",
    title: "Parcel & Cargo",
    subtitle: "For parcels, stock and small moves",
    image: "/explore/explore_cargo.webp",
    icon: Package,
    route: "/book?category=trucks&serviceMode=logistics",
  },
];

type Suggestion = { place_id?: string; title?: string; name?: string; description?: string; subtitle?: string; lat?: number; lng?: number };

export default function ExplorePage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Places autocomplete debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/places?action=autocomplete&input=${encodeURIComponent(trimmed)}&country=in`, { signal: controller.signal }
        );
        const data = await res.json();
        if (data?.predictions && Array.isArray(data.predictions)) {
          setSuggestions(data.predictions);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn("Explore search autocomplete error:", err);
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 280);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  // Handle current GPS location click
  const handleCurrentLocationClick = () => {
    if (!navigator.geolocation) {
      router.push("/book?fresh=true");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/places?action=reverse&lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          const placeName = data?.name || data?.address || "Current Location";

          const draftData = {
            pickup: placeName,
            pickupLat: latitude,
            pickupLng: longitude,
            category: "cars",
          };

          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
              localStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
            } catch { /* A private browsing session may not allow storage. */ }
          }

          router.push(
            `/book?pickup=${encodeURIComponent(placeName)}&pickupLat=${latitude}&pickupLng=${longitude}&category=cars`
          );
        } catch {
          router.push(`/book?pickupLat=${latitude}&pickupLng=${longitude}&category=cars`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        router.push("/book?fresh=true");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle selecting a search suggestion
  const handleSelectSuggestion = (item: Suggestion) => {
    const placeName = item.title || item.name || item.description;
    if (!placeName) return;
    const draftData: { drop: string; category: string; dropLat?: number; dropLng?: number } = {
      drop: placeName,
      category: "cars",
    };
    if (typeof item.lat === "number" && typeof item.lng === "number") {
      draftData.dropLat = item.lat;
      draftData.dropLng = item.lng;
    }
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
        localStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
      } catch { /* A private browsing session may not allow storage. */ }
    }
    const params = new URLSearchParams();
    params.set("drop", placeName);
    if (typeof item.lat === "number" && typeof item.lng === "number") {
      params.set("dropLat", String(item.lat));
      params.set("dropLng", String(item.lng));
    }
    params.set("category", "cars");
    setShowDropdown(false);
    router.push(`/book?${params.toString()}`);
  };

  // Submit search query
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) {
      router.push("/book?fresh=true");
      return;
    }
    const draftData = {
      drop: query.trim(),
      category: "cars",
    };
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
        localStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
      } catch { /* A private browsing session may not allow storage. */ }
    }
    router.push(`/book?drop=${encodeURIComponent(query.trim())}&category=cars`);
  };

  const saveGetawayDraft = () => {
    const draftData = {
      drop: KAZIRANGA,
      dropLat: 26.5775,
      dropLng: 93.1711,
      category: "cars",
      service: "outstation",
    };
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
        localStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
      } catch { /* A private browsing session may not allow storage. */ }
    }
  };

  return (
    <PublicPage>
      <PublicHeading label="Explore / Assam" title="Where are you headed?">
        A quick errand in Guwahati, a lift to the airport, or a weekend away. Find a ride for the day you have planned.
      </PublicHeading>

      <div className={styles.serviceSearch} ref={searchContainerRef}>
        <label className={styles.searchLabel} htmlFor="explore-destination">Plan a ride</label>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm} role="search" aria-label="Find a destination">
          <Search size={20} aria-hidden="true" />
          <input
            id="explore-destination"
            type="search"
            value={query}
            aria-controls={showDropdown && suggestions.length ? "explore-suggestions" : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestions([]);
              setIsSearching(false);
              setShowDropdown(false);
            }}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            onKeyDown={(e) => { if (e.key === "Escape") setShowDropdown(false); }}
            placeholder="Search a destination"
            autoComplete="off"
          />
          <button type="button" className={styles.iconButton} onClick={handleCurrentLocationClick} disabled={isLocating} aria-label="Use current location" title="Use current location">
            {isLocating ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={18} aria-hidden="true" />}
          </button>
          <button type="submit" className={styles.action}>Find rides</button>
        </form>
        <span className="sr-only" role="status">{isSearching ? "Searching destinations" : ""}</span>
        {showDropdown && suggestions.length > 0 && (
          <ul id="explore-suggestions" className={styles.searchList} aria-label="Suggested destinations">
            {suggestions.map((item, idx) => (
              <li key={item.place_id || idx}>
                <button type="button" onClick={() => handleSelectSuggestion(item)}>
                  <MapPin size={17} aria-hidden="true" />
                  <span>
                    <strong>{item.title || item.name || item.description}</strong>
                    {item.subtitle ? <small>{item.subtitle}</small> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section aria-label="Ride options" className={styles.cardGrid}>
        {EXPLORE_SERVICES.map((service, index) => (
          <Link href={service.route} key={service.id} className={styles.card}>
            <div className={styles.cardImage}>
              <Image src={service.image} alt="" fill sizes="(max-width: 669px) 48vw, (max-width: 1250px) 31vw, 390px" />
            </div>
            <div className={styles.cardBody}>
              <p className={styles.number} aria-hidden="true">0{index + 1}</p>
              <h2 className={styles.cardName}>{service.title}</h2>
              <p className={styles.cardDescription}>{service.subtitle}</p>
              <div className={styles.cardMeta}>
                <service.icon size={16} aria-hidden="true" />
                <ArrowRight size={17} aria-hidden="true" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      <Link href={KAZIRANGA_BOOKING} className={styles.getaway} onClick={saveGetawayDraft}>
        <div className={styles.getawayImage}>
          <Image src="/explore/explore_weekend_getaways.webp" alt="" fill sizes="(max-width: 669px) 95vw, 55vw" />
        </div>
        <div className={styles.getawayText}>
          <p className={styles.kicker}>Out of town / Kaziranga</p>
          <h2 className={styles.sectionTitle}>Take the long way.</h2>
          <p className={styles.sectionNote}>Plan an outstation ride to Kaziranga National Park.</p>
          <span className={styles.textLink}>Plan a weekend ride <ArrowRight size={16} aria-hidden="true" /></span>
        </div>
      </Link>
    </PublicPage>
  );
}
