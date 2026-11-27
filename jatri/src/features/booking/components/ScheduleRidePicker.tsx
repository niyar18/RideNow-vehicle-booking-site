"use client";

import { Clock, Calendar } from "lucide-react";

interface ScheduleRidePickerProps {
  bookingMode: "now" | "schedule";
  onModeChange: (mode: "now" | "schedule") => void;
  scheduledTime: string;
  onTimeChange: (time: string) => void;
  minScheduledTime: string;
}

export default function ScheduleRidePicker({
  bookingMode,
  onModeChange,
  scheduledTime,
  onTimeChange,
  minScheduledTime,
}: ScheduleRidePickerProps) {
  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[10px] p-2 mb-3 shadow-xs">
      <div className="flex bg-[#EFE9DC] dark:bg-[#061A16] p-1 rounded-[8px] gap-1">
        <button
          type="button"
          onClick={() => onModeChange("now")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
            bookingMode === "now"
              ? "bg-[var(--surface-raised)] text-[#123D32] dark:text-[#F7F5ED] shadow-xs"
              : "text-[var(--text-secondary)] hover:text-[#10251C] dark:hover:text-white"
          }`}
        >
          <Clock size={13} className={bookingMode === "now" ? "text-[#046A38]" : ""} />
          <span>Ride Now</span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange("schedule")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
            bookingMode === "schedule"
              ? "bg-[#046A38] text-white font-bold shadow-xs"
              : "text-[var(--text-secondary)] hover:text-[#10251C] dark:hover:text-white"
          }`}
        >
          <Calendar size={13} />
          <span>Schedule Later</span>
        </button>
      </div>

      {bookingMode === "schedule" && (
        <div className="mt-2.5 pt-2 border-t border-[var(--border-default)] px-1 space-y-1">
          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
            Pickup Date & Time (Min 25 min ahead)
          </label>
          <input
            type="datetime-local"
            value={scheduledTime}
            min={minScheduledTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full text-xs font-bold bg-white dark:bg-[#061A16] border border-[var(--border-default)] rounded-[8px] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[#046A38]"
          />
        </div>
      )}
    </div>
  );
}
