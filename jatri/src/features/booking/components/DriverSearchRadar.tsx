"use client";

import { motion } from "framer-motion";
import { Loader2, Navigation, AlertCircle } from "lucide-react";

interface DriverSearchRadarProps {
  countdown: number;
  pickup: string;
  drop: string;
  vehicle: string;
  onCancel: () => void;
  cancelling?: boolean;
}

export default function DriverSearchRadar({
  countdown,
  pickup,
  drop,
  vehicle,
  onCancel,
  cancelling,
}: DriverSearchRadarProps) {
  const vehicleLabel = vehicle.charAt(0).toUpperCase() + vehicle.slice(1);

  return (
    <div className="bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-[16px] p-6 sm:p-8 text-center max-w-md mx-auto">
      {/* Animated radar rings */}
      <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 2], opacity: [0.6, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 border-[#123D32] dark:border-[#28664D]"
        />
        <motion.div
          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border border-[#123D32] dark:border-[#28664D]"
        />
        <div className="w-16 h-16 rounded-full bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center shadow-xl relative z-10">
          <Navigation size={28} className="animate-pulse" />
        </div>
      </div>

      <h3 className="text-xl font-black text-[var(--text-primary)] mb-1">Connecting to Nearby {vehicleLabel}...</h3>
      <p className="text-[var(--text-secondary)] text-xs mb-4">
        Dispatching your request to the nearest verified drivers.
      </p>

      {/* Countdown timer pill */}
      <div className="inline-flex items-center gap-2 bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-default)] px-4 py-2 rounded-full text-xs font-bold mb-6">
        <Loader2 size={14} className="animate-spin text-[#123D32] dark:text-[#D7AC62]" />
        <span>Response expected in {countdown}s</span>
      </div>

      {/* Route summary box */}
      <div className="bg-[#FAF7F0]/80 dark:bg-[#0B2822]/80 border border-[var(--border-default)] rounded-[12px] p-3.5 mb-6 text-left space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-xs text-[var(--text-primary)] truncate">{pickup}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-[#E34222] dark:bg-[#E06A50] flex-shrink-0" />
          <p className="text-xs text-[var(--text-primary)] truncate">{drop}</p>
        </div>
      </div>

      <button
        type="button"
        disabled={cancelling}
        onClick={onCancel}
        className="w-full border border-[var(--border-default)] hover:border-[#10251C] dark:hover:border-[#F3F1E8] text-[var(--text-primary)] font-bold py-3 rounded-[8px] text-xs transition-colors disabled:opacity-50 cursor-pointer"
      >
        {cancelling ? "Cancelling..." : "Cancel Search"}
      </button>
    </div>
  );
}
