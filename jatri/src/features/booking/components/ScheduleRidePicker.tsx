"use client";

import { useId } from "react";
import { Clock, Calendar } from "lucide-react";

interface ScheduleRidePickerProps {
  bookingMode: "now" | "schedule";
  onModeChange: (mode: "now" | "schedule") => void;
  scheduledTime: string;
  onTimeChange: (time: string) => void;
  minScheduledTime: string;
}

export default function ScheduleRidePicker({
  bookingMode, onModeChange, scheduledTime, onTimeChange, minScheduledTime,
}: ScheduleRidePickerProps) {
  const dateId = useId();
  const option = "flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] border border-transparent px-2 text-sm font-semibold aria-pressed:border-[var(--text-primary)] aria-pressed:bg-[var(--surface-raised)]";
  return (
    <div className="rounded-[10px] border border-[var(--border-default)] p-2">
      <div role="group" aria-label="Pickup timing" className="grid grid-cols-2 gap-1 rounded-[8px] bg-[var(--surface-subtle)] p-1">
        <button type="button" aria-pressed={bookingMode === "now"} onClick={() => onModeChange("now")} className={option}>
          <Clock size={16} aria-hidden="true" />
          Ride now
        </button>
        <button type="button" aria-pressed={bookingMode === "schedule"} onClick={() => onModeChange("schedule")} className={option}>
          <Calendar size={16} aria-hidden="true" />
          Schedule
        </button>
      </div>
      {bookingMode === "schedule" && (
        <div className="mt-3 grid gap-1">
          <label htmlFor={dateId} className="text-sm font-semibold">Pickup date and time</label>
          <input
            id={dateId}
            type="datetime-local"
            aria-describedby={`${dateId}-help`}
            value={scheduledTime}
            min={minScheduledTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="min-h-11 w-full min-w-0 rounded-[8px] border border-[var(--border-interactive)] bg-[var(--surface-raised)] px-2 text-sm text-[var(--text-primary)]"
          />
          <p id={`${dateId}-help`} className="text-xs text-[var(--text-secondary)]">Choose a pickup time at least 25 minutes ahead.</p>
        </div>
      )}
    </div>
  );
}
