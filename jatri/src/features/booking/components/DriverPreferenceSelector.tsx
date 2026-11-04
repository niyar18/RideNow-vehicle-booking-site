"use client";

import React from "react";
import { Users, Shield, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { DriverPreference } from "@/lib/safetyMatching";

interface DriverPreferenceSelectorProps {
  value: DriverPreference;
  onChange: (value: DriverPreference) => void;
  className?: string;
  womenDriversCount?: number;
  isLoadingCount?: boolean;
}

export default function DriverPreferenceSelector({
  value,
  onChange,
  className = "",
  womenDriversCount,
  isLoadingCount = false,
}: DriverPreferenceSelectorProps) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-[#10251C] dark:text-[#F7F5ED] flex items-center gap-1.5">
          <Shield size={14} className="text-[#046A38] dark:text-[#90C8A8]" />
          <span>Safety Preferences</span>
        </label>
        {womenDriversCount !== undefined && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              womenDriversCount > 0
                ? "bg-emerald-100 text-[#046A38] dark:bg-emerald-950/60 dark:text-[#90C8A8] border border-emerald-300 dark:border-emerald-800"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
            }`}
          >
            {womenDriversCount > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                <span>{womenDriversCount} {womenDriversCount === 1 ? "driver" : "drivers"} nearby</span>
              </>
            ) : (
              <>
                <AlertCircle size={10} />
                <span>Limited availability</span>
              </>
            )}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Option 1: Any available driver */}
        <button
          type="button"
          aria-pressed={value === "any"}
          aria-label="Any available driver standard dispatch"
          onClick={() => onChange("any")}
          className={`flex items-start gap-3 p-3.5 rounded-[10px] border text-left transition-all min-h-[56px] touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#061A16] ${
            value === "any"
              ? "border-[#046A38] bg-[#F7F1E5]/80 dark:bg-[#123D32]/40 ring-1 ring-[#046A38]"
              : "border-[#DED7CA] dark:border-[#24483D] bg-white dark:bg-[#0B2822] hover:border-[#046A38]/50 dark:hover:border-[#34D399]/50"
          }`}
        >
          <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-[#046A38]">
            {value === "any" && <div className="w-2 h-2 rounded-full bg-[#046A38]" />}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-[#696B64] dark:text-[#B9C8BF]" />
                <span>Any driver</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                Fastest pickup
              </span>
            </span>
            <span className="text-xs text-[#696B64] dark:text-[#B9C8BF] mt-0.5 leading-snug">
              Standard dispatch with highest driver availability nearby.
            </span>
          </div>
        </button>

        {/* Option 2: Woman driver */}
        <button
          type="button"
          aria-pressed={value === "woman"}
          aria-label="Prefer verified woman driver voluntary safety choice"
          onClick={() => onChange("woman")}
          className={`flex items-start gap-3 p-3.5 rounded-[10px] border text-left transition-all min-h-[56px] touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#061A16] ${
            value === "woman"
              ? "border-[#046A38] bg-[#F7F1E5]/80 dark:bg-[#123D32]/40 ring-1 ring-[#046A38]"
              : "border-[#DED7CA] dark:border-[#24483D] bg-white dark:bg-[#0B2822] hover:border-[#046A38]/50 dark:hover:border-[#34D399]/50"
          }`}
        >
          <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-[#046A38]">
            {value === "woman" && <div className="w-2 h-2 rounded-full bg-[#046A38]" />}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Woman driver</span>
              </span>
              <span className="text-[10px] font-bold text-[#046A38] dark:text-[#90C8A8] bg-[#FAF7F0] dark:bg-[#10352C] px-1.5 py-0.2 rounded border border-[#DED7CA] dark:border-[#24483D]">
                Verified
              </span>
            </span>
            <span className="text-xs text-[#696B64] dark:text-[#B9C8BF] mt-0.5 leading-snug">
              Priority match with verified women drivers. Never auto-swapped without consent.
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
