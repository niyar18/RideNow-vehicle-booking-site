"use client";

import { Check, Shield, UserRoundCheck, Users } from "lucide-react";
import type { DriverPreference } from "@/lib/safetyMatching";

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
}: DriverPreferenceSelectorProps) {
  const choices = [
    { id: "any", name: "Any driver", hint: "Standard dispatch for the fastest available pickup.", icon: Users },
    { id: "woman", name: "Woman driver", hint: "Look for a verified woman driver first. We won’t switch without your permission.", icon: UserRoundCheck },
  ] as const;

  return (
    <fieldset className={`m-0 min-w-0 p-0 ${className}`}>
      <legend className="flex items-center gap-1.5 text-sm font-semibold">
        <Shield size={15} aria-hidden="true" />
        Driver preference
      </legend>
      {womenDriversCount !== undefined && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {womenDriversCount > 0
            ? `${womenDriversCount} verified ${womenDriversCount === 1 ? "woman driver" : "women drivers"} nearby`
            : "Limited availability for verified women drivers"}
        </p>
      )}
      <div className="mt-2 grid gap-2">
        {choices.map(({ id, name, hint, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className="flex min-h-14 items-center gap-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-2.5 text-left hover:bg-[var(--surface-subtle)] aria-pressed:border-[var(--text-primary)] aria-pressed:bg-[var(--surface-subtle)]"
          >
            <Icon size={17} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{name}</span>
              <span className="block text-xs leading-snug text-[var(--text-secondary)]">{hint}</span>
            </span>
            {value === id && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[var(--text-primary)] bg-[var(--accent-mint)] text-[#142238]">
                <Check size={13} aria-hidden="true" strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
