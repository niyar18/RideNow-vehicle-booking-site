"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Users,
  Briefcase,
  Compass,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
  Car,
  Package,
  Clock,
  IndianRupee,
} from "lucide-react";
import {
  VehicleType,
  VEHICLE_OPTIONS,
  recommendVehicle,
  RecommendationResult,
} from "@/lib/vehicleConfig";

interface SmartRideAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceMode: "passenger" | "logistics";
  distanceKm: number | null;
  estimateFare: (vehicleId: string, distanceKm: number) => number;
  checkLimit: (vehicleId: string, distanceKm: number) => boolean;
  currentVehicle: VehicleType;
  onSelectVehicle: (vehicleId: VehicleType, recommendation: RecommendationResult) => void;
}

export default function SmartRideAssistantModal({
  isOpen,
  onClose,
  serviceMode,
  distanceKm,
  estimateFare,
  checkLimit,
  currentVehicle,
  onSelectVehicle,
}: SmartRideAssistantModalProps) {
  const [passengers, setPassengers] = useState<number>(1);
  const [luggage, setLuggage] = useState<"none" | "small" | "large">("none");
  const [preference, setPreference] = useState<"budget" | "comfort">("budget");
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(100);

  const titleId = useId();
  const descId = useId();

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Real-time route-aware recommendation calculation
  const recommendation = recommendVehicle({
    passengers,
    luggage,
    preference,
    isGoods: serviceMode === "logistics",
    cargoWeightKg,
    distanceKm: distanceKm ?? undefined,
  });

  const recommendedVehicleMeta = VEHICLE_OPTIONS[recommendation.vehicleId];
  const isEligible = distanceKm ? checkLimit(recommendation.vehicleId, distanceKm) : true;
  const fare = distanceKm && distanceKm > 0 ? estimateFare(recommendation.vehicleId, distanceKm) : null;
  const isAlreadySelected = currentVehicle === recommendation.vehicleId;

  const handleChoose = () => {
    if (!isEligible) return;
    onSelectVehicle(recommendation.vehicleId, recommendation);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* Backdrop click dismiss */}
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-[#17211B] border-t sm:border border-[#DED7CA] dark:border-[#34443A] rounded-t-[20px] sm:rounded-[14px] p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-[#046A38] dark:text-[#90C8A8] shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 id={titleId} className="text-base sm:text-lg font-black tracking-tight text-zinc-950 dark:text-[#F3F1E8]">
                  Find Your Ideal Ride
                </h3>
                <p id={descId} className="text-xs text-zinc-500 dark:text-[#929D93]">
                  {distanceKm && distanceKm > 0
                    ? `Personalized match for your ${distanceKm} km route`
                    : "Answer 3 quick questions to get the best match"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Assistant"
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Interactive Questions */}
          <div className="space-y-3.5 pt-1">
            {serviceMode === "passenger" ? (
              <>
                {/* 1. Who's travelling? */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Users size={13} className="text-[#046A38] dark:text-[#90C8A8]" />
                    Who&apos;s travelling?
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { num: 1, label: "1 person" },
                      { num: 2, label: "2 people" },
                      { num: 4, label: "3–4 people" },
                      { num: 6, label: "5–6 people" },
                    ].map((item) => (
                      <button
                        key={item.num}
                        type="button"
                        aria-pressed={passengers === item.num}
                        onClick={() => setPassengers(item.num)}
                        className={`py-2 px-1 text-center rounded-[8px] text-xs font-bold border transition min-h-[44px] touch-manipulation cursor-pointer ${
                          passengers === item.num
                            ? "bg-[#046A38] text-white border-[#046A38] shadow-xs"
                            : "bg-white dark:bg-[#1E2B23] text-zinc-800 dark:text-zinc-200 border-[#DED7CA] dark:border-[#34443A] hover:border-[#046A38]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. How much luggage? */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Briefcase size={13} className="text-[#046A38] dark:text-[#90C8A8]" />
                    How much luggage?
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "none" as const, label: "No luggage" },
                      { id: "small" as const, label: "Small bag" },
                      { id: "large" as const, label: "Large luggage" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={luggage === item.id}
                        onClick={() => setLuggage(item.id)}
                        className={`py-2 px-1 text-center rounded-[8px] text-xs font-bold border transition min-h-[44px] touch-manipulation cursor-pointer ${
                          luggage === item.id
                            ? "bg-[#046A38] text-white border-[#046A38] shadow-xs"
                            : "bg-white dark:bg-[#1E2B23] text-zinc-800 dark:text-zinc-200 border-[#DED7CA] dark:border-[#34443A] hover:border-[#046A38]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Priority */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Compass size={13} className="text-[#046A38] dark:text-[#90C8A8]" />
                    What&apos;s most important to you?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "budget" as const, label: "💰 Lowest fare", desc: "Best value for route" },
                      { id: "comfort" as const, label: "✨ More comfort", desc: "Spacious AC cabin" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={preference === item.id}
                        onClick={() => setPreference(item.id)}
                        className={`py-2 px-2.5 text-left rounded-[8px] text-xs font-bold border transition min-h-[44px] touch-manipulation cursor-pointer flex flex-col justify-center ${
                          preference === item.id
                            ? "bg-[#046A38] text-white border-[#046A38] shadow-xs"
                            : "bg-white dark:bg-[#1E2B23] text-zinc-800 dark:text-zinc-200 border-[#DED7CA] dark:border-[#34443A] hover:border-[#046A38]"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`text-[10px] font-normal mt-0.5 ${preference === item.id ? "text-white/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Logistics Mode Cargo Weight */
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Package size={13} className="text-[#046A38] dark:text-[#90C8A8]" />
                  Estimated Cargo Weight
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { wt: 100, label: "<100 kg" },
                    { wt: 250, label: "250 kg" },
                    { wt: 500, label: "500 kg" },
                    { wt: 1000, label: "1,000+ kg" },
                  ].map((item) => (
                    <button
                      key={item.wt}
                      type="button"
                      aria-pressed={cargoWeightKg === item.wt}
                      onClick={() => setCargoWeightKg(item.wt)}
                      className={`py-2 px-1 text-center rounded-[8px] text-xs font-bold border transition min-h-[44px] touch-manipulation cursor-pointer ${
                        cargoWeightKg === item.wt
                          ? "bg-[#046A38] text-white border-[#046A38] shadow-xs"
                          : "bg-white dark:bg-[#1E2B23] text-zinc-800 dark:text-zinc-200 border-[#DED7CA] dark:border-[#34443A] hover:border-[#046A38]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── REAL-TIME RECOMMENDATION CARD ── */}
          <div className="p-4 rounded-[12px] bg-[#FAF7F0] dark:bg-[#123D32]/25 border-2 border-[#046A38]/30 dark:border-[#046A38]/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#046A38] dark:text-[#90C8A8] border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <Sparkles size={11} /> Jaatri Recommends
              </span>
              <span className="text-xs font-black text-[#046A38] dark:text-[#90C8A8]">
                {recommendation.matchScore}% Match
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-extrabold text-zinc-950 dark:text-[#F3F1E8] flex items-center gap-2">
                  <Car size={18} className="text-[#046A38] dark:text-[#90C8A8]" />
                  {recommendedVehicleMeta?.label || recommendation.vehicleId}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-[#A2ADA2] mt-0.5">
                  {recommendedVehicleMeta?.tagline}
                </p>
              </div>

              {fare !== null && (
                <div className="text-right shrink-0">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block leading-tight">Est. Fare</span>
                  <span className="text-lg font-black text-zinc-950 dark:text-[#F3F1E8] tabular-nums">
                    ₹{fare}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 pt-1 border-t border-[#DED7CA]/70 dark:border-[#34443A]/60">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-zinc-400" />
                <span>ETA: {recommendedVehicleMeta?.etaText || "3–5 min"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={12} className="text-zinc-400" />
                <span>
                  {recommendedVehicleMeta?.passengerCapacity
                    ? `Capacity: Up to ${recommendedVehicleMeta.passengerCapacity} pax`
                    : `Payload: Up to ${recommendedVehicleMeta?.maxWeightKg || 500} kg`}
                </span>
              </div>
            </div>

            {/* Route & Distance Reason */}
            <div className="p-2.5 rounded-[8px] bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
              <CheckCircle2 size={14} className="text-[#046A38] dark:text-[#90C8A8] shrink-0 mt-0.5" />
              <p className="leading-snug">{recommendation.reason}</p>
            </div>

            {!isEligible && (
              <div className="p-2.5 rounded-[8px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>This vehicle exceeds distance service coverage for the selected route.</span>
              </div>
            )}

            {/* Action CTA */}
            <button
              type="button"
              disabled={!isEligible}
              onClick={handleChoose}
              className={`w-full py-3 px-4 rounded-[8px] font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer min-h-[48px] touch-manipulation ${
                isAlreadySelected
                  ? "bg-emerald-700 dark:bg-emerald-800 text-white hover:bg-emerald-800"
                  : "bg-[#046A38] hover:bg-[#03532C] text-white active:scale-[0.99]"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span>{isAlreadySelected ? "Selected (Choose to confirm)" : "Choose this ride"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
