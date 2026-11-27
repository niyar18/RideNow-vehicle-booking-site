"use client";

import { memo, useState } from "react";
import { ArrowRight, Clock, Package, Users } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { VEHICLE_OPTIONS, type VehicleType } from "@/lib/vehicleConfig";
import { VEHICLE_ART_SRC } from "@/lib/vehiclePhotos";
import { calculateFareBreakdown } from "@/lib/fareEngine";
import { isFareDistanceEligible, pricingVehicleForChoice, type FareRateTable } from "@/lib/farePolicy";
import { getEstimatedArrivalInfo } from "@/lib/tripTiming";

interface VehicleProps {
  vehicle: {
    _id: string;
    type: VehicleType;
    vehicleModel: string;
    number: string;
    imageUrl?: string;
    baseFare?: number;
    pricePerKm?: number;
    waitingCharge?: number;
  };
  distanceKm?: number;
  isRecommended?: boolean;
  scheduledPickupTime?: Date | string | null;
  onBook?: () => void;
  rates?: FareRateTable | null;
}

function VehicleBookingCard({
  vehicle, distanceKm = 0, isRecommended, scheduledPickupTime, onBook, rates,
}: VehicleProps) {
  const { t } = useTranslation();
  const { type, vehicleModel, number, imageUrl } = vehicle;
  const [failedUrl, setFailedUrl] = useState<string>();
  const opt = VEHICLE_OPTIONS[type] ?? VEHICLE_OPTIONS.car;
  const image = imageUrl && imageUrl !== failedUrl ? imageUrl : undefined;
  const pricingVehicle = pricingVehicleForChoice(opt.id, distanceKm);
  const breakdown = calculateFareBreakdown(pricingVehicle, distanceKm, rates);
  const canBook = distanceKm > 0 && isFareDistanceEligible(pricingVehicle, distanceKm, rates);
  const label = pricingVehicle === "intercity" ? "Jaatri Intercity" : opt.label;
  const arrival = getEstimatedArrivalInfo({
    vehicleType: pricingVehicle,
    distanceKm,
    etaText: opt.etaText,
    isScheduled: Boolean(scheduledPickupTime),
    scheduledDateTime: scheduledPickupTime,
  });

  return (
    <article className="min-w-0 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
        <div className="min-w-0">
          <img
            src={image ?? VEHICLE_ART_SRC[opt.id]}
            alt={image ? vehicleModel : ""}
            loading="lazy"
            onError={() => { if (image) setFailedUrl(image); }}
            className={`aspect-[4/3] w-full rounded-[8px] ${image ? "object-cover" : "object-contain"}`}
          />
          {!image && <p className="text-center text-[10px] leading-snug text-[var(--text-secondary)]">Illustration</p>}
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-[var(--text-primary)]">{vehicleModel || opt.label}</h3>
          <p className="text-xs text-[var(--text-secondary)]">{label} {number && <>· {number}</>}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            {opt.passengerCapacity ? <Users size={13} aria-hidden="true" /> : <Package size={13} aria-hidden="true" />}
            {opt.passengerCapacity ? `${opt.passengerCapacity} seats` : `Up to ${opt.maxWeightKg} kg`}
          </p>
          {isRecommended && <p className="mt-0.5 text-xs font-semibold text-[var(--text-primary)]">{t("fleet.bestPick", "Best Pick")}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-secondary)]">{t("booking.estFare", "Est. Fare")}</p>
          <p className="text-base font-semibold tabular-nums text-[var(--text-primary)]">{canBook ? `₹${breakdown.totalFare.toLocaleString("en-IN")}` : "—"}</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border-default)] pt-2 text-xs text-[var(--text-secondary)]">
        <p className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" />{distanceKm > 0 ? arrival.displayLine : t("booking.selectDestForArrival", "Select destination for arrival time")}</p>
        {canBook && <p>₹{breakdown.pricePerKm}/km · Final quote at checkout</p>}
      </div>
      {onBook && (
        <button
          type="button"
          onClick={onBook}
          disabled={!canBook}
          aria-label={`Book ${vehicleModel ? `${vehicleModel}, ` : ""}${label}`}
          className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--border-interactive)] bg-[var(--action-bg)] px-3 text-sm font-semibold text-[var(--action-fg)] hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-secondary)]"
        >
          {canBook ? t("fleet.bookNow", "Book") : distanceKm > 0 ? "Unavailable for this route" : "Select your destination"} <ArrowRight size={15} aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
export default memo(VehicleBookingCard);
