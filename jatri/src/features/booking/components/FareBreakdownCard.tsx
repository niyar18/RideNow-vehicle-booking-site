"use client";

import { motion } from "framer-motion";
import { IndianRupee, ShieldCheck, GraduationCap, Info, Gift } from "lucide-react";

interface FareBreakdownCardProps {
  vehicle: string;
  fare: number;
  breakdown?: {
    baseFare: number;
    distanceKm: number;
    distanceFare: number;
    platformFee: number;
    surgeAmount?: number;
    taxes: number;
    discount?: number;
    isStudentDiscountApplied?: boolean;
    studentDiscount?: number;
    isReferralDiscountApplied?: boolean;
    referralDiscount?: number;
    totalFare: number;
  } | null;
  isStudent?: boolean;
}

export default function FareBreakdownCard({
  vehicle,
  fare,
  breakdown,
  isStudent,
}: FareBreakdownCardProps) {
  const vehicleLabel = vehicle.charAt(0).toUpperCase() + vehicle.slice(1);

  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 mb-6 transition-colors">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Selected Vehicle
          </span>
          <h3 className="text-xl text-[var(--text-primary)]">{vehicleLabel}</h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Estimated Fare
          </span>
          <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center justify-end">
            <IndianRupee size={20} className="stroke-[2.5]" />
            {breakdown?.totalFare || fare}
          </p>
        </div>
      </div>

      {/* Itemized charges */}
      <div className="py-4 space-y-2.5 text-xs border-b border-[var(--border-default)]">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Base Fare</span>
          <span className="font-semibold text-[var(--text-primary)]">₹{breakdown?.baseFare ?? 50}</span>
        </div>

        {breakdown?.distanceKm !== undefined && (
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Distance Fare ({breakdown.distanceKm.toFixed(1)} km)</span>
            <span className="font-semibold text-[var(--text-primary)]">₹{breakdown.distanceFare}</span>
          </div>
        )}

        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Platform & Safety Fee</span>
          <span className="font-semibold text-[var(--text-primary)]">₹{breakdown?.platformFee ?? 15}</span>
        </div>

        {breakdown && breakdown.surgeAmount !== undefined && breakdown.surgeAmount > 0 && (
          <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
            <span>High Demand Surge</span>
            <span>+₹{breakdown.surgeAmount}</span>
          </div>
        )}

        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Applicable GST (5%)</span>
          <span className="font-semibold text-[var(--text-primary)]">₹{breakdown?.taxes ?? Math.round(fare * 0.05)}</span>
        </div>

        {breakdown && breakdown.isStudentDiscountApplied && breakdown.studentDiscount !== undefined && breakdown.studentDiscount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold items-center">
            <span className="flex items-center gap-1">
              <GraduationCap size={14} /> Student Pass Discount (10%)
            </span>
            <span>-₹{breakdown.studentDiscount}</span>
          </div>
        )}

        {breakdown && breakdown.isReferralDiscountApplied && breakdown.referralDiscount !== undefined && breakdown.referralDiscount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold items-center">
            <span className="flex items-center gap-1">
              <Gift size={14} /> Referral First-Ride Discount
            </span>
            <span>-₹{breakdown.referralDiscount}</span>
          </div>
        )}
      </div>

      <div className="pt-3 flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
        <div className="flex items-center gap-1.5 text-[#123D32] dark:text-[#90C8A8] font-semibold">
          <ShieldCheck size={14} />
          <span>Upfront Distance-Based Guarantee</span>
        </div>
        <span>No hidden waiting charges</span>
      </div>
    </div>
  );
}
