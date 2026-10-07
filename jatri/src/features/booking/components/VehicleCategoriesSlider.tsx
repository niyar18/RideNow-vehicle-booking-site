"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Bike, Car, Truck, Bus, CarTaxiFront,
  ChevronLeft, ChevronRight, ArrowRight, Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

const VEHICLE_CATEGORIES_RAW = [
  { key: "allVehicles", title: "All Vehicles",  desc: "Browse the full fleet",        Icon: CarTaxiFront, tagKey: "popular", tag: "Popular"  },
  { key: "bikes",       title: "Bikes",         desc: "Fast & affordable rides",      Icon: Bike,         tagKey: "quick",   tag: "Quick"    },
  { key: "cars",        title: "Cars",          desc: "Comfortable city travel",      Icon: Car,          tagKey: "comfort", tag: "Comfort"  },
  { key: "suvs",        title: "SUVs",          desc: "Premium & spacious",           Icon: Car,          tagKey: "premium", tag: "Premium"  },
  { key: "vans",        title: "Vans",          desc: "Family & group transport",     Icon: Bus,          tagKey: "family",  tag: "Family"   },
  { key: "trucks",      title: "Trucks",        desc: "Heavy & commercial transport", Icon: Truck,        tagKey: "cargo",   tag: "Cargo"    },
];

export default function VehicleCategoriesSlider() {
  const { t } = useTranslation();
  const sliderRef  = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView     = useInView(sectionRef, { once: true, margin: "-80px" });
  const [hovered, setHovered] = useState<number | null>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const vehicleCategories = VEHICLE_CATEGORIES_RAW.map(c => ({
    ...c,
    title: t(`fleet.${c.key}`, c.title),
    desc: t(`fleet.${c.key}Desc`, c.desc),
    tag: t(`fleet.${c.tagKey}`, c.tag)
  }));

  const scroll = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const onScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanLeft(scrollLeft > 8);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 8);
  };

  return (
    <section ref={sectionRef} className="w-full bg-white py-10 sm:py-20 px-3 sm:px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between mb-6 sm:mb-10"
        >
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="h-px w-8 bg-zinc-900" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{t("fleet.eyebrow", "Fleet")}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900 leading-none">
              {t("fleet.title", "Vehicle Categories")}
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2 sm:mt-3 font-medium">{t("fleet.subtitle", "Choose the ride that fits your journey")}</p>
          </div>

          {/* Nav buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => scroll("left")}
              disabled={!canLeft}
              className="w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-900 hover:border-zinc-900 hover:text-white disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-zinc-900 disabled:hover:border-zinc-200 transition-all text-zinc-700 shadow-sm"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => scroll("right")}
              disabled={!canRight}
              className="w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-900 hover:border-zinc-900 hover:text-white disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-zinc-900 disabled:hover:border-zinc-200 transition-all text-zinc-700 shadow-sm"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>

        {/* ── SLIDER ── */}
        <div className="relative">

          {/* Left fade */}
          <AnimatePresence>
            {canLeft && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Right fade */}
          <AnimatePresence>
            {canRight && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <div
            ref={sliderRef}
            onScroll={onScroll}
            className="flex gap-3.5 sm:gap-5 pt-2 sm:pt-4 overflow-x-auto scroll-smooth pb-4 px-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {vehicleCategories.map((item, i) => {
              const isHovered = hovered === i;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 28 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  onHoverStart={() => setHovered(i)}
                  onHoverEnd={() => setHovered(null)}
                  whileHover={{ y: -6 }}
                  className="group relative min-w-[200px] sm:min-w-[260px] flex-shrink-0 cursor-pointer select-none"
                  
                >
                  {/* Card */}
                  <motion.div
                    animate={{
                      backgroundColor: isHovered ? "#09090b" : "#ffffff",
                      borderColor: isHovered ? "#09090b" : "#e4e4e7",
                      boxShadow: isHovered
                        ? "0 20px 48px rgba(0,0,0,0.18)"
                        : "0 2px 14px rgba(0,0,0,0.05)",
                    }}
                    transition={{ duration: 0.25 }}
                    className="relative rounded-2xl sm:rounded-3xl border p-5 sm:p-7 overflow-hidden h-full"
                  >

                    {/* BG dot pattern on hover */}
                    <motion.div
                      animate={{ opacity: isHovered ? 0.06 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />

                    {/* TAG */}
                    <motion.div
                      animate={{
                        backgroundColor: isHovered ? "rgba(255,255,255,0.12)" : "#f4f4f5",
                        color: isHovered ? "#ffffff" : "#71717a",
                        borderColor: isHovered ? "rgba(255,255,255,0.15)" : "#e4e4e7",
                      }}
                      className="inline-flex items-center gap-1.5 border text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1.5 rounded-full mb-5 transition-colors"
                    >
                      <Sparkles size={8} />
                      {item.tag}
                    </motion.div>

                    {/* ICON BOX */}
                    <motion.div
                      animate={{
                        backgroundColor: isHovered ? "rgba(255,255,255,0.1)" : "#f4f4f5",
                        borderColor: isHovered ? "rgba(255,255,255,0.15)" : "#e4e4e7",
                      }}
                      className="w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 transition-colors"
                    >
                      <motion.div
                        animate={{ color: isHovered ? "#ffffff" : "#3f3f46" }}
                        transition={{ duration: 0.2 }}
                      >
                        <item.Icon size={24} strokeWidth={1.8} />
                      </motion.div>
                    </motion.div>

                    {/* TEXT */}
                    <motion.h3
                      animate={{ color: isHovered ? "#ffffff" : "#09090b" }}
                      transition={{ duration: 0.2 }}
                      className="text-lg font-black tracking-tight leading-none mb-2"
                    >
                      {item.title}
                    </motion.h3>
                    <motion.p
                      animate={{ color: isHovered ? "rgba(255,255,255,0.5)" : "#a1a1aa" }}
                      transition={{ duration: 0.2 }}
                      className="text-xs font-medium leading-relaxed"
                    >
                      {item.desc}
                    </motion.p>

                    {/* Arrow CTA */}
               

                    {/* Static index number — subtle */}
                    <div className="absolute bottom-5 right-5 text-[10px] font-black tabular-nums" style={{ color: isHovered ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}>
                      0{i + 1}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}

            {/* View all card */}
          
          </div>
        </div>

        {/* ── BOTTOM COUNTER ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-zinc-100"
        >
          {[
            { num: "6+",   label: "Categories"   },
            { num: "50+",  label: "Vehicle types" },
            { num: "24/7", label: "Availability"  },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3">
              <p className="text-zinc-900 text-base sm:text-lg font-black tracking-tight">{s.num}</p>
              <p className="text-zinc-400 text-[11px] sm:text-xs font-medium">{s.label}</p>
              {i < 2 && <div className="hidden sm:block w-px h-5 bg-zinc-200 ml-3" />}
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}