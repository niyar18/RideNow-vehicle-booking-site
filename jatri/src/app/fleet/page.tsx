"use client";

import { motion } from "framer-motion";
import { ArrowRight, Car, Zap, Shield, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import { VEHICLE_OPTIONS } from "@/lib/vehicleConfig";

interface FleetCategory {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  capacity: string;
  promo?: string; // Placeholder for special promos, account-specific discounts, or seasonal offers
}

const FLEET_CATEGORIES: FleetCategory[] = [
  {
    id: "scooty",
    name: VEHICLE_OPTIONS.scooty.label,
    description: VEHICLE_OPTIONS.scooty.tagline,
    price: "Starting from ₹7/km",
    image: "/fleet/scooty.webp",
    capacity: "1 Passenger",
    promo: undefined, // E.g. "Flat 20% Off" for promo placeholders
  },
  {
    id: "bike",
    name: VEHICLE_OPTIONS.bike.label,
    description: VEHICLE_OPTIONS.bike.tagline,
    price: "Starting from ₹8/km",
    image: "/fleet/moto.webp",
    capacity: "1 Passenger",
    promo: undefined,
  },
  {
    id: "auto",
    name: VEHICLE_OPTIONS.auto.label,
    description: VEHICLE_OPTIONS.auto.tagline,
    price: "Starting from ₹11.5/km",
    image: "/fleet/auto.webp",
    capacity: "3 Passengers",
    promo: undefined,
  },
  {
    id: "e-rickshaw",
    name: VEHICLE_OPTIONS["e-rickshaw"].label,
    description: VEHICLE_OPTIONS["e-rickshaw"].tagline,
    price: "Starting from ₹8/km",
    image: "/fleet/auto.webp",
    capacity: "3 Passengers (Eco)",
    promo: "Eco-Friendly ♻",
  },
  {
    id: "mini",
    name: VEHICLE_OPTIONS.mini.label,
    description: VEHICLE_OPTIONS.mini.tagline,
    price: "Starting from ₹13.5/km",
    image: "/fleet/car-mini.webp",
    capacity: "4 Passengers (AC)",
    promo: undefined,
  },
  {
    id: "car",
    name: VEHICLE_OPTIONS.car.label,
    description: VEHICLE_OPTIONS.car.tagline,
    price: "Starting from ₹16.5/km",
    image: "/fleet/premier.webp",
    capacity: "4 Passengers (Sedan)",
    promo: undefined,
  },
  {
    id: "priority",
    name: VEHICLE_OPTIONS.priority.label,
    description: VEHICLE_OPTIONS.priority.tagline,
    price: "Starting from ₹21/km",
    image: "/fleet/suv.webp",
    capacity: "6 Passengers (SUV)",
    promo: undefined,
  },
  {
    id: "loading",
    name: VEHICLE_OPTIONS.loading.label,
    description: VEHICLE_OPTIONS.loading.tagline,
    price: "Starting from ₹20/km",
    image: "/fleet/express-mini.webp",
    capacity: "Up to 500 kg Cargo",
    promo: undefined,
  },
  {
    id: "truck",
    name: VEHICLE_OPTIONS.truck.label,
    description: VEHICLE_OPTIONS.truck.tagline,
    price: "Starting from ₹35/km",
    image: "/fleet/freight.webp",
    capacity: "Up to 2,000 kg Freight",
    promo: undefined,
  },
];

const FLEET_STANDARDS = [
  {
    icon: Car,
    title: "8 Dedicated Vehicle Classes",
    description: "From micro-mobility two-wheelers to multi-ton commercial trucks, choose the right vehicle for every journey across Assam.",
  },
  {
    icon: Zap,
    title: "Instant Dispatch & Live GPS",
    description: "Real-time dispatch algorithm pairs you with verified local driver partners in seconds with live telemetry.",
  },
  {
    icon: Shield,
    title: "Rigorous 100% Vetting",
    description: "Commercial fitness certificates, valid insurance, driving licenses, and background checks verified on every vehicle.",
  },
  {
    icon: TrendingUp,
    title: "Transparent Upfront Fares",
    description: "No hidden surge surprises or arbitrary fees. Know your exact toll, distance, and base fare before confirmation.",
  },
];

export default function FleetPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F0] dark:bg-[#061A16] text-[#10251C] dark:text-[#F7F5ED] justify-between">
      <Nav />

      <main className="flex-1 pt-20 sm:pt-36 pb-24 sm:pb-20">
        {/* ================= HERO INTRO (DESKTOP) ================= */}
        <section className="hidden sm:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#90C8A8] border border-[#cdd6c3] dark:border-[#2D4E3A] text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles size={13} className="text-[#E34222]" />
              <span>Verified Fleet Architecture</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#10251C] dark:text-[#F7F5ED] tracking-tight leading-[1.08] mb-4">
              Our Complete Fleet
            </h1>
            <p className="text-[#696B64] dark:text-[#B9C8BF] text-base sm:text-lg leading-relaxed max-w-2xl">
              Engineered for Assam&apos;s diverse transit landscape. Whether navigating Guwahati&apos;s bustling city corridors or transporting cargo along national highways, Jaatri guarantees inspected vehicles, upfront fares, and professional driver partners.
            </p>
          </motion.div>
        </section>

        {/* ================= HERO INTRO (MOBILE COMPACT UBER REFERENCE) ================= */}
        <section className="sm:hidden max-w-7xl mx-auto px-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#90C8A8] border border-[#cdd6c3] dark:border-[#2D4E3A] text-[9.5px] font-bold uppercase tracking-wider mb-1.5">
                <Sparkles size={10} className="text-[#E34222]" />
                <span>Verified Fleets</span>
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#10251C] dark:text-[#F7F5ED]">
                Services &amp; Fleet
              </h1>
              <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mt-0.5">
                Go anywhere, get anything across Assam
              </p>
            </div>
            <Link
              href="/book?fresh=true"
              className="text-xs font-bold text-[#046A38] dark:text-[#90C8A8] bg-[#E5EBDD]/80 dark:bg-[#1D3428]/80 hover:bg-[#E5EBDD] px-2.5 py-1.5 rounded-[8px] border border-[#cdd6c3] dark:border-[#2D4E3A] shrink-0 inline-flex items-center gap-1 transition"
            >
              <span>Estimate</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        {/* ================= VEHICLE CATEGORIES SHOWCASE ================= */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-12 sm:mb-24">
          <div className="hidden sm:flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <p className="text-xs sm:text-[13px] font-semibold uppercase tracking-[0.16em] text-[#E34222] mb-2">
                TRANSIT TIERS &amp; COMMUTE OPTIONS
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#10251C] dark:text-[#F7F5ED] tracking-tight mb-2">
                Choose Your Vehicle Class
              </h2>
              <p className="text-[#696B64] dark:text-[#B9C8BF] text-sm sm:text-base leading-relaxed max-w-xl">
                From micro-mobility two-wheelers for rapid city transit to comfortable family sedans and commercial logistics carriers across Assam.
              </p>
            </div>
            <Link
              href="/book?fresh=true"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#123D32] dark:text-[#90C8A8] hover:text-[#0D3027] dark:hover:text-[#A8E0C0] group self-start sm:self-end shrink-0 py-2 px-3.5 rounded-[8px] bg-[#E5EBDD]/60 dark:bg-[#1D3428]/60 border border-[#cdd6c3]/60 dark:border-[#2D4E3A]/60 transition"
            >
              <span>Instant ride estimate</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform text-[#046A38] dark:text-[#90C8A8]" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
            {FLEET_CATEGORIES.map((category, idx) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: idx * 0.04 }}
                className="h-full"
              >
                <Link
                  href={`/book?vehicle=${category.id}&fresh=true`}
                  aria-label={`${category.name}: ${category.capacity}. ${category.price}. Tap to book directly.`}
                  className="bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#24483D] rounded-[14px] overflow-hidden flex flex-col justify-between h-full group hover:border-[#046A38] dark:hover:border-[#90C8A8]/60 hover:shadow-md transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
                >
                  {/* Top Edge-to-Edge Heroic Vehicle Artwork with Overlay Badges */}
                  <div className="relative w-full h-32 sm:h-44 overflow-hidden bg-[#FAF7F0] dark:bg-[#061A16] border-b border-[#DED7CA]/60 dark:border-[#24483D]/60">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      unoptimized
                      priority={idx < 4}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                      className={`object-cover ${
                        category.id === "scooty"
                          ? "object-[center_82%]"
                          : "object-center"
                      } group-hover:scale-105 transition-transform duration-300`}
                    />

                    {/* Integrated Overlay Badges (Promo/Discount placeholder & Cargo Weight only) */}
                    {(category.promo || category.capacity?.toLowerCase().includes("kg")) && (
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        {category.promo ? (
                          <span className={`text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-white ${
                            category.id === "e-rickshaw"
                              ? "bg-[#046A38]/95"
                              : "bg-[#E34222]/90"
                          } backdrop-blur-xs px-2 py-0.5 rounded-full shadow-2xs truncate max-w-[65%]`}>
                            {category.promo}
                          </span>
                        ) : (
                          <span />
                        )}
                        {category.capacity?.toLowerCase().includes("kg") ? (
                          <span className="text-[8px] sm:text-[9.5px] font-semibold text-[#123D32] dark:text-[#F7F5ED] bg-[#FAF7F0]/90 dark:bg-[#0B2822]/90 backdrop-blur-xs border border-[#DED7CA]/60 dark:border-[#24483D]/60 px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs shrink-0 ml-auto">
                            {category.capacity.replace(" Cargo", "").replace(" Freight", "")}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Card Content & Action Area */}
                  <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-serif text-[13.5px] sm:text-base font-bold text-[#10251C] dark:text-[#F7F5ED] truncate group-hover:text-[#046A38] dark:group-hover:text-[#90C8A8] transition-colors">
                        {category.name}
                      </h3>
                    </div>

                    {/* Pricing & Direct Tap CTA */}
                    <div className="pt-2 border-t border-[#DED7CA]/60 dark:border-[#24483D]/60 flex items-center justify-between mt-2">
                      <div>
                        <span className="text-[8.5px] sm:text-[10px] text-[#696B64] dark:text-[#B9C8BF] block leading-tight">
                          <span className="sm:hidden">From</span>
                          <span className="hidden sm:inline">Transparent rate</span>
                        </span>
                        <p className="text-[#10251C] dark:text-[#F7F5ED] text-xs sm:text-sm font-extrabold sm:font-bold tracking-tight">
                          <span className="hidden sm:inline">Starting from </span>
                          {category.price.replace("Starting from ", "")}
                        </p>
                      </div>

                      {/* Direct Click Affordance on Mobile */}
                      <div className="sm:hidden w-6 h-6 rounded-full bg-[#E5EBDD] dark:bg-[#1D3428] text-[#046A38] dark:text-[#90C8A8] flex items-center justify-center shrink-0 group-hover:bg-[#046A38] group-hover:text-white transition-colors shadow-2xs">
                        <ArrowRight size={11} strokeWidth={2.4} />
                      </div>

                      {/* Desktop Book CTA Button */}
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#046A38] group-hover:bg-[#03532C] dark:bg-[#058A48] dark:group-hover:bg-[#046A38] text-white text-xs font-bold transition shadow-2xs">
                        <span>Book</span>
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ================= FLEET STANDARDS GRID (REASSURANCE & TRUST) ================= */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-12 sm:mb-24">
          <div className="max-w-3xl mb-6 sm:mb-12">
            <p className="text-[10px] sm:text-[13px] font-semibold uppercase tracking-[0.16em] text-[#E34222] mb-1.5 sm:mb-2">
              VERIFIED MOBILITY STANDARDS
            </p>
            <h2 className="font-serif text-2xl sm:text-4xl text-[#10251C] dark:text-[#F7F5ED] tracking-tight mb-1.5 sm:mb-2">
              Engineered for Safety, Speed &amp; Transparency
            </h2>
            <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-base leading-relaxed">
              Every trip on Jaatri is backed by multi-point physical inspections, real-time GPS telemetry, and honest upfront fare metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {FLEET_STANDARDS.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: idx * 0.08 }}
                  className="bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#24483D] rounded-[12px] p-4 sm:p-6 shadow-2xs hover:border-[#123D32]/40 dark:hover:border-[#90C8A8]/40 transition duration-200"
                >
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-[8px] bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#90C8A8] flex items-center justify-center mb-3 sm:mb-4">
                    <Icon size={19} className="sm:hidden" />
                    <Icon size={22} className="hidden sm:block" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-[#10251C] dark:text-[#F7F5ED] mb-1 sm:mb-2">{feature.title}</h3>
                  <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ================= BOTTOM CTA ================= */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#24483D] rounded-[14px] sm:rounded-[16px] p-5 sm:p-12 text-center shadow-xs">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] text-[#E34222] mb-1 sm:mb-2 block">
              READY TO COMMUTE?
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl text-[#10251C] dark:text-[#F7F5ED] max-w-xl mx-auto mb-2 sm:mb-4">
              Fast, reliable rides at your fingertips across Assam.
            </h2>
            <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-base max-w-lg mx-auto mb-6 sm:mb-8">
              Experience seamless booking with transparent upfront pricing, real-time vehicle dispatch, and verified local drivers.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
              <Link
                href="/book?fresh=true"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white font-bold rounded-[8px] transition active:scale-95 shadow-xs text-sm sm:text-base text-center"
              >
                Book a Ride Now
              </Link>
              <Link
                href="/partner/onboard/vehicle"
                className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] hover:border-[#123D32] dark:hover:border-[#90C8A8] text-[#10251C] dark:text-[#F7F5ED] font-bold rounded-[8px] transition active:scale-95 text-sm sm:text-base text-center"
              >
                Drive with Jaatri
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
