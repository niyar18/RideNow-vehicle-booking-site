"use client";

import { motion } from "framer-motion";
import {
  Bike, Car, Truck, Zap,
  IndianRupee, Clock, Gauge,
  ArrowRight, Star
} from "lucide-react";

interface VehicleProps {
  vehicle: {
    _id: string;
    type: "bike" | "auto" | "car" | "loading" | "truck";
    vehicleModel: string;
    number: string;
    imageUrl?: string;
    baseFare?: number;
    pricePerKm?: number;
    waitingCharge?: number;
  };
  distanceKm?: number;
  isRecommended?: boolean;
  onBook?: () => void;
}

const TYPE_CONFIG = {
  bike:    { label: "Bike",    Icon: Bike  },
  auto:    { label: "Auto",    Icon: Car   },
  car:     { label: "Car",     Icon: Car   },
  loading: { label: "Loading", Icon: Truck },
  truck:   { label: "Truck",   Icon: Truck },
};

export default function VehicleBookingCard({
  vehicle, distanceKm = 0, isRecommended, onBook,
}: VehicleProps) {
  const {
    type, vehicleModel, number,
    imageUrl, baseFare = 0, pricePerKm = 0, waitingCharge = 0,
  } = vehicle;

  const { label, Icon } = TYPE_CONFIG[type] ?? TYPE_CONFIG.car;
  const estimated = Math.round(baseFare + distanceKm * pricePerKm);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative bg-white border border-zinc-200 rounded-3xl overflow-hidden flex flex-col group cursor-default"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
    >
      {/* Hover border glow */}
      <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-zinc-900 transition-all duration-300 pointer-events-none z-10" />

      {/* BEST PICK BADGE */}
      {isRecommended && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-zinc-900 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg"
        >
          <Zap size={9} className="fill-white" />
          Best Pick
        </motion.div>
      )}

      {/* IMAGE AREA */}
      <div className="relative h-48 bg-zinc-50 flex items-center justify-center overflow-hidden">

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
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
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full">
          <Icon size={10} />
          {label}
        </div>

        {/* Rating pill — bottom left */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-white border border-zinc-200 text-zinc-700 text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-sm">
          <Star size={9} className="fill-zinc-900 text-zinc-900" />
          4.8
        </div>
      </div>

      {/* THIN DIVIDER */}
      <div className="h-px bg-zinc-100" />

      {/* CONTENT */}
      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* Title + plate row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-zinc-900 text-base font-black tracking-tight leading-tight truncate">
              {vehicleModel}
            </h3>
            <div className="mt-1.5 inline-flex items-center bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200">
              <span className="text-zinc-500 text-xs font-black tracking-[0.2em] font-mono uppercase">
                {number}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
            <Icon size={17} className="text-zinc-700" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl px-3.5 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Gauge size={11} className="text-zinc-400" />
              <p className="text-zinc-400 text-[9px] uppercase tracking-widest font-bold">Per km</p>
            </div>
            <p className="text-zinc-900 text-sm font-black">₹{pricePerKm}</p>
          </div>
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl px-3.5 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={11} className="text-zinc-400" />
              <p className="text-zinc-400 text-[9px] uppercase tracking-widest font-bold">Waiting</p>
            </div>
            <p className="text-zinc-900 text-sm font-black">
              ₹{waitingCharge}
              <span className="text-zinc-400 text-[10px] font-normal">/min</span>
            </p>
          </div>
        </div>

        {/* FARE + BOOK */}
        <div className="flex items-end justify-between pt-3 border-t border-zinc-100">
          <div>
            <p className="text-zinc-400 text-[9px] uppercase tracking-widest font-bold mb-0.5">
              Est. Fare
            </p>
            <motion.div
              key={estimated}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-baseline gap-0.5"
            >
              <IndianRupee size={16} className="text-zinc-900 mb-0.5" strokeWidth={2.5} />
              <span className="text-zinc-900 text-3xl font-black tracking-tight leading-none">
                {estimated}
              </span>
            </motion.div>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.04 }}
            onClick={onBook}
            className="group/btn flex items-center gap-2 bg-zinc-900 hover:bg-black text-white text-sm font-black px-6 py-3.5 rounded-2xl transition-colors shadow-md"
          >
            Book
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