"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ArrowRight, Sparkles,
  Leaf, Flame, Users, Car, Crown, Truck, Package,
} from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";
import { VehicleType } from "@/lib/vehicleConfig";
import { VEHICLE_SVG_ICONS } from "@/shared/components/VehicleIcons";

interface FleetSliderItem {
  id: VehicleType;
  key: string;
  title: string;
  desc: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  TagIcon?: React.ComponentType<{ size?: number; className?: string }>;
  image: string;
  tagKey: string;
  tag: string;
  tagBg: string;
  rate: string;
}

const FLEET_ITEMS: FleetSliderItem[] = [
  {
    id: "scooty",
    key: "scooty",
    title: "Jatri Scooty",
    desc: "Comfortable and eco-friendly rides",
    Icon: VEHICLE_SVG_ICONS.scooty,
    TagIcon: Leaf,
    image: "/fleet/scooty.webp",
    tagKey: "eco",
    tag: "ECO",
    tagBg: "bg-[#E5EBDD] text-[#123D32] border-[#cdd6c3]",
    rate: "7/km",
  },
  {
    id: "bike",
    key: "bike",
    title: "Jatri Moto",
    desc: "Fast, affordable, everyday rides",
    Icon: VEHICLE_SVG_ICONS.bike,
    TagIcon: Flame,
    image: "/fleet/moto.webp",
    tagKey: "popular",
    tag: "POPULAR",
    tagBg: "bg-[#faebe8] text-[#E34222] border-[#f0c8c1]",
    rate: "8/km",
  },
  {
    id: "auto",
    key: "auto",
    title: "Jatri Auto",
    desc: "Quick and economical for short trips",
    Icon: VEHICLE_SVG_ICONS.auto,
    TagIcon: Users,
    image: "/fleet/auto.webp",
    tagKey: "budget",
    tag: "BUDGET",
    tagBg: "bg-[#eaf3e7] text-[#1e5a28] border-[#c8e3c3]",
    rate: "11.5/km",
  },
  {
    id: "mini",
    key: "mini",
    title: "Jatri Car Mini",
    desc: "Affordable and comfortable for city rides",
    Icon: VEHICLE_SVG_ICONS.mini,
    TagIcon: Car,
    image: "/fleet/car-mini.webp",
    tagKey: "mini",
    tag: "MINI",
    tagBg: "bg-[#e7eff8] text-[#1e4d7d] border-[#c8dcf1]",
    rate: "13.5/km",
  },
  {
    id: "car",
    key: "car",
    title: "Jatri Car Premier",
    desc: "Spacious and premium sedan for a better experience",
    Icon: VEHICLE_SVG_ICONS.car,
    TagIcon: Crown,
    image: "/fleet/premier.webp",
    tagKey: "premier",
    tag: "PREMIER",
    tagBg: "bg-[#fdf3e5] text-[#8a520e] border-[#f5ddbb]",
    rate: "16.5/km",
  },
  {
    id: "priority",
    key: "priority",
    title: "Jatri Car XL",
    desc: "More space for families and groups",
    Icon: VEHICLE_SVG_ICONS.priority,
    TagIcon: Users,
    image: "/fleet/suv.webp",
    tagKey: "xl_priority",
    tag: "XL / PRIORITY",
    tagBg: "bg-[#eee9f8] text-[#51358a] border-[#d8ccf0]",
    rate: "19.5/km",
  },
  {
    id: "loading",
    key: "loading",
    title: "Jatri Express Mini",
    desc: "Small cargo, big convenience",
    Icon: VEHICLE_SVG_ICONS.loading,
    TagIcon: Truck,
    image: "/fleet/express-mini.webp",
    tagKey: "express_mini",
    tag: "EXPRESS MINI",
    tagBg: "bg-[#e5f0fb] text-[#1b589b] border-[#c8e2f8]",
    rate: "25/km",
  },
  {
    id: "truck",
    key: "truck",
    title: "Jatri Freight",
    desc: "Reliable truck service for larger shipments",
    Icon: VEHICLE_SVG_ICONS.truck,
    TagIcon: Package,
    image: "/fleet/freight.webp",
    tagKey: "freight",
    tag: "FREIGHT",
    tagBg: "bg-[#fcf0e4] text-[#9a4f0f] border-[#f4d5b6]",
    rate: "35/km",
  },
];

export default function VehicleCategoriesSlider() {
  const { t } = useTranslation();
  const router = useRouter();
  const sliderRef  = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView     = useInView(sectionRef, { once: true, margin: "-80px" });
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const vehicleCategories = FLEET_ITEMS.map((c) => ({
    ...c,
    title: t(`fleet.${c.key}`, c.title),
    desc: t(`fleet.${c.key}Desc`, c.desc),
    tag: t(`fleet.${c.tagKey}`, c.tag),
  }));

  const scroll = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    const cardWidth = sliderRef.current.firstElementChild?.clientWidth || 280;
    const scrollAmount = cardWidth + 20; // 1 full card + gap
    sliderRef.current.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const onScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanLeft(scrollLeft > 8);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 8);
  };

  const handleSelectVehicle = (vehicleId: string) => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("ridenow_booking_draft");
        localStorage.removeItem("ridenow_booking_draft");
      } catch (_) {}
    }
    router.push(`/book?vehicle=${vehicleId}&fresh=true`);
  };

  return (
    <section
      ref={sectionRef}
      className="w-full bg-[#FAF7F0] dark:bg-[#061A16] border-t border-[#DED7CA]/80 dark:border-[#1E3E34] pt-10 sm:pt-14 lg:pt-16 pb-8 sm:pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-label="Jaatri Vehicle Categories"
    >
      <div className="max-w-7xl mx-auto">

        {/* ── SECTION HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between mb-4 sm:mb-6"
        >
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="h-[2px] w-6 sm:w-8 bg-[#E34222] dark:bg-[#E06A50] rounded-full" />
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.2em] text-[#E34222] dark:text-[#E06A50]">
                {t("fleet.eyebrow", "FLEET")}
              </span>
            </div>
            {/* Main Editorial Heading: DM Serif Display, 22-34px */}
            <h2
              style={{ fontFamily: "var(--font-serif), 'DM Serif Display', Georgia, serif" }}
              className="text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-[#10251C] dark:text-[#F7F5ED] leading-[1.12]"
            >
              {t("fleet.title", "Choose Your Ride")}
            </h2>
            {/* Subtitle: 13-15px */}
            <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-[14px] mt-1 font-normal leading-normal">
              {t("fleet.subtitle", "Find the right vehicle for your journey.")}
            </p>
          </div>

          {/* Nav buttons: Aligned with heading, 8px radius geometry */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => scroll("left")}
              disabled={!canLeft}
              aria-label="Scroll left"
              className="w-9 h-9 rounded-[8px] border border-[#DED7CA] dark:border-[#24483D] bg-white dark:bg-[#0B2822] flex items-center justify-center hover:bg-[#046A38] dark:hover:bg-[#046A38] hover:border-[#046A38] hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-all duration-150 text-[#10251C] dark:text-[#F7F5ED] shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <ChevronLeft size={16} strokeWidth={2.4} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => scroll("right")}
              disabled={!canRight}
              aria-label="Scroll right"
              className="w-9 h-9 rounded-[8px] border border-[#DED7CA] dark:border-[#24483D] bg-white dark:bg-[#0B2822] flex items-center justify-center hover:bg-[#046A38] dark:hover:bg-[#046A38] hover:border-[#046A38] hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-all duration-150 text-[#10251C] dark:text-[#F7F5ED] shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <ChevronRight size={16} strokeWidth={2.4} />
            </motion.button>
          </div>
        </motion.div>

        {/* ── CAROUSEL WRAPPER ── */}
        <div className="relative">

          {/* Left atmospheric edge fade */}
          <AnimatePresence>
            {canLeft && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-r from-[#FAF7F0] dark:from-[#061A16] to-transparent z-10 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Right atmospheric edge fade */}
          <AnimatePresence>
            {canRight && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-l from-[#FAF7F0] dark:from-[#061A16] to-transparent z-10 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Horizontal scroll track with smooth snap behavior */}
          <div
            ref={sliderRef}
            onScroll={onScroll}
            className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 px-1 snap-x snap-mandatory scrollbar-hide"
          >
            {vehicleCategories.map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.04 + i * 0.04, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleSelectVehicle(item.id)}
                aria-label={`${item.title}: ${item.desc}. Starting from ₹${item.rate}. Book this vehicle.`}
                className="group relative w-[75vw] sm:w-[260px] min-w-[210px] sm:min-w-[250px] max-w-[280px] flex-shrink-0 cursor-pointer select-none snap-start text-left font-[inherit] border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#061A16] rounded-[14px]"
              >
                {/* Card Container: Refined surface matching mobile theme tokens (#0B2822 in dark) */}
                <div className="relative rounded-[14px] border border-[#DED7CA]/85 dark:border-[#24483D] bg-white dark:bg-[#0B2822] p-3.5 sm:p-4 overflow-hidden h-full flex flex-col justify-between shadow-[0_2px_8px_rgba(18,61,50,0.04)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.4)] group-hover:shadow-[0_8px_20px_rgba(18,61,50,0.08)] dark:group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)] group-hover:border-[#046A38]/50 dark:group-hover:border-[#34D399]/50 transition-all duration-200">
                  <div>
                    {/* CARD TOP MEDIA: Hero vehicle artwork with mobile-native proportions */}
                    <div className="-mx-3.5 -mt-3.5 sm:-mx-4 sm:-mt-4 mb-3 relative overflow-hidden select-none h-38 sm:h-46 rounded-t-[13px] bg-[#FAF7F0] dark:bg-[#061A16]">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover object-bottom transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />

                      {/* Unified category badge in upper-left */}
                      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 pointer-events-none">
                        <span className="inline-flex items-center gap-1 border border-[#DED7CA]/90 dark:border-[#24483D] bg-[#FAF7F0]/95 dark:bg-[#10352C]/95 text-[#046A38] dark:text-[#34D399] text-[9.5px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full shadow-2xs backdrop-blur-xs">
                          {item.TagIcon ? (
                            <item.TagIcon size={10} className="stroke-[2.2]" />
                          ) : (
                            <Sparkles size={9} />
                          )}
                          {item.tag}
                        </span>
                      </div>

                      {/* Subtle fleet numbering in upper-right */}
                      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 text-[10px] font-semibold text-[#10251C]/40 dark:text-[#F7F5ED]/40 tabular-nums pointer-events-none">
                        0{i + 1}
                      </div>
                    </div>

                    {/* Title: 16-17px, bold, high contrast */}
                    <h3 className="text-[16px] sm:text-[17px] font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight leading-snug mb-1">
                      {item.title}
                    </h3>

                    {/* Description: 12-13px, clamped */}
                    <p className="text-[12px] sm:text-[12.5px] text-[#696B64] dark:text-[#B9C8BF] font-normal leading-relaxed line-clamp-2 min-h-[34px]">
                      {item.desc}
                    </p>
                  </div>

                  {/* Bottom Pricing & Action Row */}
                  <div className="mt-3 pt-2.5 border-t border-[#DED7CA]/70 dark:border-[#24483D] flex items-center justify-between">
                    {/* Price Badge with emerald styling */}
                    <div className="inline-flex items-baseline gap-1 bg-[#FAF7F0] dark:bg-[#061A16] text-[#046A38] dark:text-[#34D399] border border-[#DED7CA]/80 dark:border-[#24483D] px-2.5 py-1 rounded-[8px]">
                      <span className="text-[9.5px] font-semibold text-[#696B64] dark:text-[#B9C8BF] uppercase tracking-wider">From</span>
                      <span className="text-[13px] sm:text-[14px] font-extrabold tracking-tight">₹{item.rate}</span>
                    </div>

                    {/* Refined Arrow Affordance with 8px radius */}
                    <div className="w-8 h-8 rounded-[8px] border border-[#DED7CA] dark:border-[#24483D] bg-white dark:bg-[#061A16] group-hover:border-[#046A38] dark:group-hover:border-[#046A38] group-hover:bg-[#046A38] dark:group-hover:bg-[#046A38] text-[#10251C] dark:text-[#F7F5ED] group-hover:text-white transition-all duration-200 flex items-center justify-center shadow-2xs">
                      <ArrowRight size={13} strokeWidth={2.4} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── FLEET STATISTICS ROW ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-wrap items-center justify-between sm:justify-start gap-4 sm:gap-8 mt-5 sm:mt-7 pt-3.5 sm:pt-4 border-t border-[#DED7CA]/80 dark:border-[#1E3E34]"
        >
          {[
            { num: "8",    label: "Fleet Options" },
            { num: "100%", label: "Verified Drivers" },
            { num: "24/7", label: "Instant Dispatch" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 sm:gap-3">
              <p className="text-[#046A38] dark:text-[#34D399] text-lg sm:text-xl font-extrabold tracking-tight tabular-nums leading-none">
                {s.num}
              </p>
              <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-[12.5px] font-medium leading-tight">
                {s.label}
              </p>
              {i < 2 && <div className="hidden sm:block w-px h-3.5 bg-[#DED7CA] dark:bg-[#24483D] ml-3 sm:ml-4" />}
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}