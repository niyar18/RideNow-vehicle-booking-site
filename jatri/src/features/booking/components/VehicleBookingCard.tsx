"use client";

import React, { memo } from "react";

import { motion } from "framer-motion";
import {
  Bike, Car, Truck, Zap,
  IndianRupee, Clock, Gauge,
  ArrowRight, Star, Users, Package
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { VEHICLE_OPTIONS, VehicleType } from "@/lib/vehicleConfig";

interface VehicleProps {
  vehicle: {
    _id: string;
    type: VehicleType;
    vehicleModel: string;
    number: string;
    imageUrl?: string;
    baseFare?: number;
    pricePerKm?: number;
    waitingCharge?: number;
  };
  distanceKm?: number;
  isRecommended?: boolean;
  scheduledPickupTime?: Date | string | null;
  onBook?: () => void;
}

import { VEHICLE_SVG_ICONS } from "@/shared/components/VehicleIcons";
import { getEstimatedArrivalInfo } from "@/lib/tripTiming";

const TYPE_ICONS: Record<VehicleType, any> = {
  scooty: VEHICLE_SVG_ICONS.scooty,
  bike: VEHICLE_SVG_ICONS.bike,
  auto: VEHICLE_SVG_ICONS.auto,
  "e-rickshaw": VEHICLE_SVG_ICONS["e-rickshaw"] || VEHICLE_SVG_ICONS.auto,
  mini: VEHICLE_SVG_ICONS.mini,
  car: VEHICLE_SVG_ICONS.car,
  priority: VEHICLE_SVG_ICONS.priority,
  loading: VEHICLE_SVG_ICONS.loading,
  truck: VEHICLE_SVG_ICONS.truck,
};

function VehicleBookingCard({
  vehicle, distanceKm = 0, isRecommended, scheduledPickupTime, onBook,
}: VehicleProps) {
  const { t } = useTranslation();
  const {
    type, vehicleModel, number,
    imageUrl, baseFare = 0, pricePerKm = 0, waitingCharge = 0,
  } = vehicle;

  const opt = VEHICLE_OPTIONS[type] ?? VEHICLE_OPTIONS.car;
  const label = opt.label;
  const Icon = TYPE_ICONS[type] ?? Car;
  const estimated = Math.round(baseFare + distanceKm * pricePerKm);

  const arrivalInfo = getEstimatedArrivalInfo({
    vehicleType: type,
    distanceKm,
    etaText: opt.etaText,
    isScheduled: Boolean(scheduledPickupTime),
    scheduledDateTime: scheduledPickupTime,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onClick={onBook}
      className="relative bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#24483D] rounded-[14px] overflow-hidden flex flex-col group cursor-pointer select-none transition-all shadow-sm"
    >
      {/* Hover border glow */}
      <div className="absolute inset-0 rounded-[14px] border-2 border-transparent group-hover:border-[#046A38] transition-all duration-300 pointer-events-none z-10" />

      {/* BEST PICK BADGE */}
      {isRecommended && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-[#046A38] text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-[6px] shadow-sm"
        >
          <Zap size={9} className="fill-white" />
          {t("fleet.bestPick", "Best Pick")}
        </motion.div>
      )}

      {/* IMAGE AREA */}
      <div className="relative h-48 bg-white dark:bg-[#10352C] flex items-center justify-center overflow-hidden">

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Vehicle image */}
        <motion.img
          src={imageUrl || "https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&q=80"}
          alt={vehicleModel}
          className="relative z-10 h-32 w-full object-contain"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.14))" }}
          whileHover={{ scale: 1.06, filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.22))" }}
          transition={{ duration: 0.35 }}
        />

        {/* Type pill — bottom right */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-[#123D32] text-[#F7F1E5] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[6px]">
          <Icon size={10} />
          {label}
        </div>

        {/* Rating pill — bottom left */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-white dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#24483D] text-[#10251C] dark:text-[#F7F5ED] text-[10px] font-bold px-2 py-1 rounded-[6px] shadow-xs">
          <Star size={9} className="fill-amber-500 text-amber-500" />
          4.8
        </div>
      </div>

      {/* THIN DIVIDER */}
      <div className="h-px bg-[#DED7CA] dark:bg-[#34443A]" />

      {/* CONTENT */}
      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* Title + plate row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[#10251C] dark:text-[#F7F5ED] text-base font-black tracking-tight leading-tight truncate">
              {vehicleModel}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="inline-flex items-center bg-[#F7F1E5] dark:bg-[#10352C] px-2 py-0.5 rounded-md border border-[#DED7CA] dark:border-[#24483D]">
                <span className="text-[#696B64] dark:text-[#B9C8BF] text-[11px] font-black tracking-[0.15em] font-mono uppercase">
                  {number}
                </span>
              </div>
              <div className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                {opt.passengerCapacity ? (
                  <>
                    <Users size={10} />
                    <span>{opt.passengerCapacity} seats</span>
                  </>
                ) : (
                  <>
                    <Package size={10} />
                    <span>{opt.maxWeightKg} kg</span>
                  </>
                )}
              </div>
            </div>

            {/* Estimated Arrival Time / Location Prompt */}
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#123D32] dark:text-[#90C8A8]">
              <Clock size={12} className="text-[#046A38] dark:text-[#52B788] shrink-0" />
              {distanceKm > 0 ? (
                <span className="font-semibold">{arrivalInfo.displayLine}</span>
              ) : (
                <span className="text-[#696B64] dark:text-[#B9C8BF] italic text-[11px]">
                  {t("booking.selectDestForArrival", "Select destination for arrival time")}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-10 h-10 rounded-[10px] bg-[#F7F1E5] dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] flex items-center justify-center">
            <Icon size={17} className="text-[#123D32] dark:text-[#90C8A8]" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] rounded-[10px] px-3.5 py-3 shadow-2xs">
            <div className="flex items-center gap-1.5 mb-1">
              <Gauge size={11} className="text-[#696B64] dark:text-[#B9C8BF]" />
              <p className="text-[#696B64] dark:text-[#B9C8BF] text-[9px] uppercase tracking-widest font-bold">{t("fleet.perKm", "Per km")}</p>
            </div>
            <p className="text-[#10251C] dark:text-[#F7F5ED] text-sm font-black">₹{pricePerKm}</p>
          </div>
          <div className="bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] rounded-[10px] px-3.5 py-3 shadow-2xs">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={11} className="text-[#696B64] dark:text-[#B9C8BF]" />
              <p className="text-[#696B64] dark:text-[#B9C8BF] text-[9px] uppercase tracking-widest font-bold">{t("booking.waiting", "Waiting")}</p>
            </div>
            <p className="text-[#10251C] dark:text-[#F7F5ED] text-sm font-black">
              ₹{waitingCharge}
              <span className="text-[#696B64] dark:text-[#B9C8BF] text-[10px] font-normal">/min</span>
            </p>
          </div>
        </div>

        {/* FARE + BOOK */}
        <div className="flex items-end justify-between pt-3 border-t border-[#DED7CA] dark:border-[#24483D]">
          <div>
            <p className="text-[#696B64] dark:text-[#B9C8BF] text-[9px] uppercase tracking-widest font-bold mb-0.5">
              {t("booking.estFare", "Est. Fare")}
            </p>
            <motion.div
              key={estimated}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-baseline gap-0.5"
            >
              <IndianRupee size={16} className="text-[#10251C] dark:text-[#F7F5ED] mb-0.5" strokeWidth={2.5} />
              <span className="text-[#10251C] dark:text-[#F7F5ED] text-3xl font-black tracking-tight leading-none font-mono">
                {estimated}
              </span>
            </motion.div>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.04 }}
            onClick={onBook}
            aria-label={`Book ${vehicleModel} ${label}`}
            className="group/btn flex items-center justify-center gap-2 bg-[#046A38] hover:bg-[#03532C] text-white text-sm font-bold px-5 py-3 min-h-[44px] min-w-[44px] rounded-[8px] transition-colors shadow-sm active:scale-95 touch-manipulation"
          >
            {t("fleet.bookNow", "Book")}
            <motion.div
              initial={{ x: 0 }}
              whileHover={{ x: 3 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight size={14} />
            </motion.div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
export default memo(VehicleBookingCard);
