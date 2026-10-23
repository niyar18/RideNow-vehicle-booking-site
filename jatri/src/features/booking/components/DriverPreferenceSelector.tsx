"use client";

import React from "react";
import { Users, Shield, Sparkles } from "lucide-react";
import { DriverPreference } from "@/lib/safetyMatching";

interface DriverPreferenceSelectorProps {
  value: DriverPreference;
  onChange: (value: DriverPreference) => void;
  className?: string;
}

export default function DriverPreferenceSelector({
  value,
  onChange,
  className = "",
}: DriverPreferenceSelectorProps) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-[#10251C] dark:text-[#F3F1E8] flex items-center gap-1.5">
          <Shield size={14} className="text-[#046A38] dark:text-[#90C8A8]" />
          Driver Preference
        </label>
        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
          Voluntary Safety Choice
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Option 1: Any available driver */}
        <button
          type="button"
          aria-pressed={value === "any"}
          onClick={() => onChange("any")}
          className={`flex items-start gap-3 p-3.5 rounded-[10px] border text-left transition-all min-h-[56px] touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#17211B] ${
            value === "any"
              ? "border-[#046A38] bg-[#F7F1E5]/70 dark:bg-[#123D32]/30 ring-1 ring-[#046A38]"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17211B] hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-[#046A38]">
            {value === "any" && <div className="w-2 h-2 rounded-full bg-[#046A38]" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Users size={14} className="text-zinc-500" />
              Any available driver
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
              Standard dispatch with highest driver availability nearby.
            </span>
          </div>
        </button>

        {/* Option 2: Woman driver */}
        <button
          type="button"
          aria-pressed={value === "woman"}
          onClick={() => onChange("woman")}
          className={`flex items-start gap-3 p-3.5 rounded-[10px] border text-left transition-all min-h-[56px] touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#17211B] ${
            value === "woman"
              ? "border-[#046A38] bg-[#F7F1E5]/70 dark:bg-[#123D32]/30 ring-1 ring-[#046A38]"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17211B] hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-[#046A38]">
            {value === "woman" && <div className="w-2 h-2 rounded-full bg-[#046A38]" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
              Woman driver
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
              Request a verified woman driver. Availability may be limited.
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
