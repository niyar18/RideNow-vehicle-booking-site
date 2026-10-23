"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { RootState } from "@/redux/store";
import {
  MapPin,
  ArrowRight,
  Briefcase,
  Plane,
  Plus,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { HomeIcon } from "@/shared/components/icons/AppIcons";

interface SavedPlace {
  id: string;
  label: string;
  address: string;
}

const DESTINATIONS = [
  {
    name: "Guwahati",
    tagline: "Gateway of the Northeast",
    image: "/mobile-home/dest_guwahati.webp",
    lat: 26.1445,
    lng: 91.7362,
  },
  {
    name: "Shillong",
    tagline: "Scotland of the East",
    image: "/mobile-home/dest_shillong.webp",
    lat: 25.5788,
    lng: 91.8933,
  },
  {
    name: "Kaziranga",
    tagline: "Rhino Wildlife Sanctuary",
    image: "/mobile-home/dest_kaziranga.webp",
    lat: 26.5775,
    lng: 93.1711,
  },
  {
    name: "Majuli",
    tagline: "World's Largest River Island",
    image: "/mobile-home/dest_majuli.webp",
    lat: 26.9602,
    lng: 94.1973,
  },
];

const SERVICES = [
  {
    id: "car",
    title: "Car Rides",
    subtitle: "Anywhere in Assam",
    image: "/mobile-home/jaatri-car-rides.webp",
    route: "/book?category=cars",
  },
  {
    id: "outstation",
    title: "Outstation",
    subtitle: "Explore beyond",
    image: "/mobile-home/jaatri-outstation.webp",
    route: "/book?category=cars&service=outstation",
  },
  {
    id: "cargo",
    title: "Parcel & Cargo",
    subtitle: "Send with trust",
    image: "/mobile-home/jaatri-parcel-cargo.webp",
    route: "/book?category=trucks&serviceMode=logistics",
  },
  {
    id: "schedule",
    title: "Schedule Booking",
    subtitle: "For car, rental & cargo",
    image: "/mobile-home/jaatri-schedule-booking.webp",
    route: "/book?reserve=true",
  },
];

export default function MobileHome({
  onAuthRequired,
}: {
  onAuthRequired?: () => void;
}) {
  const router = useRouter();
  const { userData } = useSelector((state: RootState) => state.user);
  const { data: session } = useSession();

  const currentUser = userData || session?.user;
  const firstName = currentUser?.name?.trim()?.split(" ")[0] || "";

  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Good Day");

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) setGreeting("Good Morning");
    else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // Saved places from localStorage
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("jaatri_saved_places");
        if (stored) {
          setSavedPlaces(JSON.parse(stored));
        }
      } catch (_) {}
    }
  }, []);

  const handleDestinationClick = (dest: typeof DESTINATIONS[number]) => {
    const draftData = {
      drop: dest.name,
      dropLat: dest.lat,
      dropLng: dest.lng,
      category: "cars",
    };
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
        localStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
      } catch (_) {}
    }
    router.push(
      `/book?drop=${encodeURIComponent(dest.name)}&dropLat=${dest.lat}&dropLng=${dest.lng}&category=cars`
    );
  };

  const handleShortcutClick = (type: "home" | "work" | "airport" | "add") => {
    if (type === "airport") {
      const airportName = "Lokpriya Gopinath Bordoloi International Airport, Guwahati";
      const draftData = {
        drop: airportName,
        dropLat: 26.1061,
        dropLng: 91.5859,
        category: "cars",
      };
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
          localStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
        } catch (_) {}
      }
      router.push(
        `/book?drop=${encodeURIComponent(airportName)}&dropLat=26.1061&dropLng=91.5859&category=cars`
      );
      return;
    }

    if (type === "add") {
      router.push("/settings");
      return;
    }

    // Check saved places for home or work
    const query = type === "home" ? "home" : "work";
    const found = savedPlaces.find((p) =>
      p.label?.toLowerCase().includes(query) ||
      (type === "work" && p.label?.toLowerCase().includes("office"))
    );

    if (found?.address) {
      const draftData = {
        drop: found.address,
        category: "cars",
      };
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
          localStorage.setItem("ridenow_booking_draft", JSON.stringify(draftData));
        } catch (_) {}
      }
      router.push(`/book?drop=${encodeURIComponent(found.address)}&category=cars`);
    } else {
      router.push("/settings");
    }
  };

  const handleSearchClick = () => {
    router.push("/book?fresh=true");
  };

  return (
    <div className="w-full bg-[#FAF7F0] dark:bg-[#061A16] text-[#10251C] dark:text-[#F7F5ED] pb-10">
      {/* =========================================================================
          SECTION 3B: CINEMATIC ASSAMESE HERO
          Light: Warm sunset sky over Brahmaputra valley
          Dark: Moody twilight dusk sunset over mountain ridges with deep shadows
          Generous vertical scenic window keeping the road & SUV clear
          ========================================================================= */}
      <section className="relative isolate w-full overflow-hidden pt-22 sm:pt-26 pb-5 px-4 sm:px-6 min-h-[480px] sm:min-h-[520px] flex flex-col justify-between">
        {/* Background Scenic Landscape Images (Light vs Dark) */}
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none select-none">
          {/* Light Theme Landscape */}
          <div className="relative w-full h-full block dark:hidden bg-[url('/mobile-home/hero_landscape.webp')] bg-cover bg-[center_40%]">
            <Image
              src="/mobile-home/hero_landscape.webp"
              alt="Scenic Assamese Landscape at Sunset"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover object-[center_40%] pointer-events-none"
            />
            {/* Top-left soft shadow for text contrast + bottom natural fade into ivory */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[#FAF7F0]"
              aria-hidden="true"
            />
          </div>

          {/* Dark Theme Landscape */}
          <div className="relative w-full h-full hidden dark:block bg-[url('/mobile-home/hero_landscape_dark.webp')] bg-cover bg-[center_40%]">
            <Image
              src="/mobile-home/hero_landscape_dark.webp"
              alt="Assamese Landscape at Twilight Dusk"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover object-[center_40%] pointer-events-none"
            />
            {/* Top-left soft shadow for text contrast + bottom natural fade into dark forest */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#061A16]"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* TOP: Greeting & Eyebrow in the sky */}
        <div className="relative z-10 max-w-md mx-auto w-full pt-1 sm:pt-2">
          {/* Main Heading in display serif */}
          <div>
            <h1
              suppressHydrationWarning
              className="font-serif text-[32px] sm:text-[36px] leading-[1.12] font-normal tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]"
            >
              <span suppressHydrationWarning>
                {mounted ? greeting : "Good Day"}
                {mounted && firstName ? `, ${firstName}` : ""}
              </span>
              <br />
              <span className="font-serif italic font-normal text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                Ready to move?
              </span>
            </h1>
          </div>

          {/* Tagline / Eyebrow directly underneath headline, matching reference */}
          <p className="mt-2 text-[11px] sm:text-[11.5px] font-bold tracking-[0.18em] uppercase text-white/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)]">
            EXPLORE ASSAM, YOUR WAY
          </p>
        </div>

        {/* BOTTOM: Destination search bar & shortcuts positioned lower down so road & vehicle remain clear */}
        <div className="relative z-10 max-w-md mx-auto w-full mt-auto pt-8">
          {/* SECTION 3C: DESTINATION SEARCH BAR */}
          <button
            type="button"
            onClick={handleSearchClick}
            aria-label="Search destination for booking a ride"
            className="w-full min-h-[52px] text-left bg-white dark:bg-[#FAF7F0] rounded-full shadow-[0_8px_25px_rgba(18,61,50,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.65)] border border-[#DED7CA]/90 dark:border-white/30 p-1.5 pl-4 sm:pl-5 flex items-center justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#061A16]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <MapPin
                size={20}
                strokeWidth={2.4}
                className="text-[#046A38] dark:text-[#046A38] shrink-0"
              />
              <span className="text-[15px] sm:text-[16px] text-[#10251C]/80 font-medium truncate">
                Where are you going?
              </span>
            </div>

            {/* Circular Forest Green Arrow Action */}
            <div
              className="w-10 h-10 rounded-full bg-[#046A38] hover:bg-[#03532C] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95"
              aria-hidden="true"
            >
              <ArrowRight size={18} strokeWidth={2.5} />
            </div>
          </button>

          {/* SECTION 3D: SAVED-LOCATION SHORTCUTS */}
          <div className="mt-3.5 flex items-center justify-between gap-1.5 sm:gap-2">
            {/* Home Shortcut */}
            <button
              type="button"
              onClick={() => handleShortcutClick("home")}
              className="flex-1 min-w-0 min-h-[44px] bg-white/90 dark:bg-[#0B2822]/85 backdrop-blur-md rounded-full py-2 px-2.5 sm:px-3 border border-[#DED7CA]/70 dark:border-[#24483D] shadow-2xs flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 hover:bg-white dark:hover:bg-[#10352C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <HomeIcon size={16} className="text-[#046A38] dark:text-[#34D399] shrink-0" />
              <span className="text-[12px] font-bold text-[#10251C] dark:text-[#F7F5ED] truncate">
                Home
              </span>
            </button>

            {/* Work Shortcut */}
            <button
              type="button"
              onClick={() => handleShortcutClick("work")}
              className="flex-1 min-w-0 bg-white/90 dark:bg-[#0B2822]/85 backdrop-blur-md rounded-full py-2 px-2.5 sm:px-3 border border-[#DED7CA]/70 dark:border-[#24483D] shadow-2xs flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 hover:bg-white dark:hover:bg-[#10352C] cursor-pointer"
            >
              <Briefcase size={16} className="text-[#046A38] dark:text-[#34D399] shrink-0" />
              <span className="text-[12px] font-bold text-[#10251C] dark:text-[#F7F5ED] truncate">
                Work
              </span>
            </button>

            {/* Airport Shortcut */}
            <button
              type="button"
              onClick={() => handleShortcutClick("airport")}
              className="flex-1 min-w-0 bg-white/90 dark:bg-[#0B2822]/85 backdrop-blur-md rounded-full py-2 px-2.5 sm:px-3 border border-[#DED7CA]/70 dark:border-[#24483D] shadow-2xs flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 hover:bg-white dark:hover:bg-[#10352C] cursor-pointer"
            >
              <Plane size={16} className="text-[#046A38] dark:text-[#34D399] shrink-0" />
              <span className="text-[12px] font-bold text-[#10251C] dark:text-[#F7F5ED] truncate">
                Airport
              </span>
            </button>

            {/* Add Shortcut */}
            <button
              type="button"
              onClick={() => handleShortcutClick("add")}
              className="flex-1 min-w-0 bg-white/90 dark:bg-[#0B2822]/85 backdrop-blur-md rounded-full py-2 px-2.5 sm:px-3 border border-[#DED7CA]/70 dark:border-[#24483D] shadow-2xs flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 hover:bg-white dark:hover:bg-[#10352C] cursor-pointer"
            >
              <Plus size={16} className="text-[#046A38] dark:text-[#34D399] shrink-0" />
              <span className="text-[12px] font-bold text-[#10251C] dark:text-[#F7F5ED] truncate">
                Add
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3E: TWO-COLUMN SERVICE CARDS
          Car Rides, Outstation, Parcel & Cargo, Schedule Booking
          Deep forest-green surfaces in dark mode (#0B2822) with subtle border (#24483D)
          ========================================================================= */}
      <section className="max-w-md mx-auto px-4 sm:px-6 pt-2 pb-5">
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => router.push(service.route)}
              className="w-full min-h-[76px] text-left bg-white dark:bg-[#0B2822] rounded-[14px] p-3 sm:p-3.5 border border-[#DED7CA]/85 dark:border-[#24483D] shadow-[0_2px_8px_rgba(18,61,50,0.04)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.4)] flex items-center justify-between gap-2.5 cursor-pointer transition-all duration-150 active:scale-[0.97] hover:border-[#046A38]/40 dark:hover:border-[#34D399]/40 group select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Service Thumbnail */}
                <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-[10px] bg-[#FAF7F0] dark:bg-[#061A16] border border-[#DED7CA]/60 dark:border-[#24483D] overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                  <Image
                    src={service.image}
                    alt={service.title}
                    width={56}
                    height={56}
                    sizes="(max-width: 640px) 48px, 52px"
                    className="w-full h-full object-cover object-center rounded-[8px]"
                  />
                </div>

                {/* Text Content */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-[13.5px] sm:text-[14px] font-bold leading-tight text-[#10251C] dark:text-[#F7F5ED] truncate">
                    {service.title}
                  </h2>
                  <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium leading-tight mt-0.5 truncate">
                    {service.subtitle}
                  </p>
                </div>
              </div>

              {/* Discreet Chevron */}
              <ChevronRight
                size={16}
                className="text-[#696B64]/70 dark:text-[#B9C8BF]/70 group-hover:text-[#046A38] dark:group-hover:text-[#34D399] group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </button>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: POPULAR DESTINATIONS
          Horizontally scrollable row of portrait image tiles: Guwahati, Shillong, Kaziranga, Majuli
          ========================================================================= */}
      <section className="max-w-md mx-auto pt-3 pb-8">
        <div className="px-4 sm:px-6 flex items-center justify-between mb-3">
          <h2 className="font-serif text-[18px] sm:text-[20px] font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight">
            Popular Destinations
          </h2>
          <button
            type="button"
            onClick={() => router.push("/explore")}
            className="min-h-[44px] min-w-[44px] text-[12.5px] font-bold text-[#046A38] dark:text-[#34D399] hover:underline flex items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px]"
          >
            <span>See all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Horizontal Scroll Track */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory px-4 sm:px-6 py-1">
          {DESTINATIONS.map((dest) => (
            <button
              key={dest.name}
              type="button"
              onClick={() => handleDestinationClick(dest)}
              aria-label={`Book a ride to ${dest.name}, ${dest.tagline}`}
              className="relative w-[130px] sm:w-[145px] h-[175px] sm:h-[195px] text-left rounded-[14px] overflow-hidden shrink-0 snap-start border border-[#DED7CA]/80 dark:border-[#24483D] shadow-[0_4px_12px_rgba(18,61,50,0.06)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.5)] cursor-pointer group active:scale-[0.96] transition-transform select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#061A16]"
            >
              {/* Destination Image */}
              <Image
                src={dest.image}
                alt={dest.name}
                fill
                sizes="(max-width: 640px) 145px, 160px"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
              />

              {/* Bottom Readability Gradient */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              {/* Content Label */}
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <p className="font-serif text-[15px] sm:text-[16px] font-bold leading-tight drop-shadow-sm">
                  {dest.name}
                </p>
                <p className="text-[10px] text-white/80 font-medium leading-tight mt-0.5 truncate">
                  {dest.tagline}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
