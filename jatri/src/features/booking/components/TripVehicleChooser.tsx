"use client";

import { useId } from "react";
import Image from "next/image";
import { VEHICLE_ART_SRC } from "@/lib/vehiclePhotos";
import { Check, Clock, Package, Snowflake, User, Zap } from "lucide-react";
import { pricingVehicleForChoice } from "@/lib/farePolicy";
import { getEstimatedArrivalInfo } from "@/lib/tripTiming";
import {
  LOGISTICS_VEHICLES,
  PASSENGER_VEHICLES,
  type ServiceMode,
  type VehicleType,
} from "@/lib/vehicleConfig";

interface TripVehicleChooserProps {
  mode: ServiceMode;
  selected: VehicleType;
  onSelect: (vehicle: VehicleType) => void;
  isAvailable: (vehicle: VehicleType) => boolean;
  fareFor: (vehicle: VehicleType) => number;
  recommended?: VehicleType;
  distance: number;
  noRoad: boolean;
  schedule: boolean;
  scheduledDateTime: string;
}

const formatFare = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function TripVehicleChooser({
  mode, selected, onSelect, isAvailable, fareFor, recommended, distance, noRoad, schedule, scheduledDateTime,
}: TripVehicleChooserProps) {
  const groupId = useId();
  const options = mode === "passenger" ? PASSENGER_VEHICLES : LOGISTICS_VEHICLES;
  const title = mode === "passenger" ? "Choose a trip" : "Choose a cargo vehicle";
  const unavailable = options.some(({ id }) => !isAvailable(id));
  const now = new Date();

  return (
    <section aria-labelledby={`${groupId}-title`} className="min-w-0">
      <div className="mb-2 flex min-w-0 items-baseline justify-between gap-3">
        <h2 id={`${groupId}-title`} className="text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          {title}
        </h2>
        {!noRoad && <span className="text-right text-xs text-[var(--text-secondary)]">Estimated fare</span>}
      </div>
      {noRoad ? (
        <p role="status" className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-subtle)] p-4 text-sm">
          No road connection found. Try a different pickup or destination.
        </p>
      ) : (
        <>
          <fieldset className="m-0 min-w-0 space-y-1 p-0">
            <legend className="sr-only">{title}</legend>
            {options.map((v) => {
              const available = isAvailable(v.id);
              const checked = selected === v.id;
              const optionId = `${groupId}-${v.id}`;
              const pricingVehicle = pricingVehicleForChoice(v.id, distance);
              const intercity = pricingVehicle === "intercity";
              const timing = getEstimatedArrivalInfo({
                vehicleType: pricingVehicle,
                distanceKm: distance,
                etaText: v.etaText,
                isScheduled: schedule,
                scheduledDateTime,
                baseDate: now,
              });
              const price = formatFare.format(fareFor(v.id));
              const capacity = v.passengerCapacity
                ? `${v.passengerCapacity} ${v.passengerCapacity === 1 ? "passenger" : "passengers"}`
                : `Up to ${v.maxWeightKg?.toLocaleString("en-IN")} kilograms`;
              const tag = recommended === v.id ? "Recommended" : intercity ? "Outstation" : undefined;
              return (
                <label
                  key={v.id}
                  className={`relative grid min-h-[88px] grid-cols-[clamp(3.1rem,15vw,4.45rem)_minmax(0,1fr)_auto] items-center gap-x-2 rounded-[10px] border px-1.5 py-2.5 [scroll-margin-block:0.5rem] sm:gap-x-3 sm:px-2.5 ${
                    !available
                      ? "border-transparent bg-[var(--surface-subtle)]"
                      : checked
                      ? "cursor-pointer border-[var(--text-primary)] bg-[var(--surface-subtle)]"
                      : "cursor-pointer border-[var(--border-default)] hover:bg-[var(--surface-subtle)]"
                  } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--focus-ring)]`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name={groupId}
                    value={v.id}
                    checked={checked && available}
                    disabled={!available}
                    onChange={() => onSelect(v.id)}
                    aria-labelledby={`${optionId}-name ${optionId}-fare`}
                    aria-describedby={`${optionId}-details`}
                    data-trip-vehicle={v.id}
                  />
                  <span className="relative block aspect-[4/3] min-w-0" aria-hidden="true">
                    <Image
                      src={VEHICLE_ART_SRC[v.id]}
                      alt=""
                      fill
                      sizes="(max-width: 400px) 60px, 72px"
                      unoptimized
                      className="object-contain"
                    />
                    {(v.id === "priority" || v.id === "mini" || v.id === "car") && (
                      <span className="absolute -top-1 right-0 grid size-5 place-items-center rounded-full bg-[var(--accent-mint)] text-[#142238]">
                        {v.id === "priority" ? <Zap size={13} /> : <Snowflake size={13} />}
                      </span>
                    )}
                  </span>
                  <span className="block min-w-0">
                    <span id={`${optionId}-name`} className="block text-sm font-semibold leading-snug tracking-tight text-[var(--text-primary)] sm:text-[15px]">
                      {intercity ? "Jaatri Intercity" : v.label}
                    </span>
                    <span id={`${optionId}-details`} className="mt-0.5 grid gap-0.5 text-xs leading-snug text-[var(--text-secondary)]">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          {v.passengerCapacity ? <User size={13} aria-hidden="true" /> : <Package size={13} aria-hidden="true" />}
                          <span aria-hidden="true" className="tabular-nums">{v.passengerCapacity ?? `${v.maxWeightKg?.toLocaleString("en-IN")} kg`}</span>
                          <span className="sr-only">{capacity}</span>
                        </span>
                        {available && (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Clock size={13} aria-hidden="true" className="shrink-0" />
                            {schedule
                              ? timing.isScheduled && timing.pickupTimeText
                                ? `Pickup ${timing.pickupTimeText}`
                                : "Set pickup time"
                              : `Pickup ~${v.etaText}`}
                          </span>
                        )}
                      </span>
                      {available ? (
                        <>
                          <span>{intercity ? "Outstation car service" : v.tagline}</span>
                          {timing.arrivalTimeText && <span className="sr-only">Estimated arrival: {timing.arrivalTimeText}</span>}
                          {tag && <span className="font-semibold text-[var(--text-primary)]">{tag}</span>}
                        </>
                      ) : <span>Outside this vehicle’s range</span>}
                    </span>
                  </span>
                  <span className="grid h-full min-w-0 content-center justify-items-end gap-1.5 text-right">
                    <span id={`${optionId}-fare`} className="whitespace-nowrap text-[14px] font-semibold tabular-nums text-[var(--text-primary)] sm:text-base">
                      {available ? price : "Unavailable"}
                    </span>
                    {available && (
                      <span
                        aria-hidden="true"
                        className={`grid size-5 place-items-center rounded-full border ${
                          checked
                            ? "border-[var(--text-primary)] bg-[var(--accent-mint)] text-[#142238]"
                            : "border-[var(--text-muted)] text-transparent"
                        }`}
                      >
                        {checked && <Check size={13} strokeWidth={3} />}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {mode === "passenger" && unavailable && isAvailable("car") && selected !== "car" && (
            <button type="button" onClick={() => onSelect("car")} className="mt-1 min-h-11 rounded-[8px] px-2 text-sm font-semibold text-[var(--text-primary)] underline underline-offset-4">
              Choose an intercity ride
            </button>
          )}
        </>
      )}
    </section>
  );
}
