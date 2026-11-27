"use client";

import { PartnerSetupFrame, PartnerSetupTitle } from "@/features/partner/components/PartnerWorkspace";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bike,
  Car,
  Truck,
  Package,
  CheckCircle,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";

/* ================= CONFIG ================= */

type VehicleId =
  | "scooty"
  | "bike"
  | "auto"
  | "e-rickshaw"
  | "mini"
  | "car"
  | "priority"
  | "loading"
  | "truck";

const VEHICLES = [
  { id: "scooty", label: "Scooty", icon: Bike, desc: "2-Wheeler Lightweight Commute" },
  { id: "bike", label: "Bike / Moto", icon: Bike, desc: "2-Wheeler Solo Motorcycle" },
  { id: "auto", label: "Auto", icon: Car, desc: "3-Wheeler Doorstep Transit" },
  { id: "e-rickshaw", label: "Toto (E-Rickshaw)", icon: Car, desc: "3-Wheeler Electric Eco Commute" },
  { id: "mini", label: "Mini (Hatchback)", icon: Car, desc: "4-Wheeler Compact AC (WagonR, Tiago)" },
  { id: "car", label: "Premier (Sedan / Cab)", icon: Car, desc: "4-Wheeler Executive AC (Dzire, Amaze)" },
  { id: "priority", label: "XL Priority (SUV)", icon: Car, desc: "6-Seater Spacious SUV (Ertiga, Innova)" },
  { id: "loading", label: "Loading (Cargo Mini)", icon: Package, desc: "Commercial Light Goods (Tata Ace)" },
  { id: "truck", label: "Truck (Heavy Transport)", icon: Truck, desc: "Heavy Commercial Transport Fleet" },
];

const VEHICLE_REGEX =
  /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/;

/* ================= PAGE ================= */

export default function PartnerVehiclePage() {
  const router = useRouter();
  const { update } = useSession();

  const [vehicleType, setVehicleType] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  const [completed, setCompleted] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH VEHICLE (AUTO-FILL) ================= */

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get("/api/partner/vehicle");

        const { user, vehicle } = res.data;

        if (user?.vendorOnboardingStep >= 1) {
          setCompleted(true);
        }

        if (vehicle) {
          setVehicleType(vehicle.type);
          setVehicleNumber(vehicle.number);
          setVehicleModel(vehicle.model);
        }
      } catch (err) {
        console.error("Vehicle fetch failed");
      }
    }

    load();
  }, []);

  /* ================= SUBMIT ================= */

  const submitVehicle = async () => {
    if (completed && !editMode) {
      router.push("/partner/onboard/documents");
      return;
    }

    if (!vehicleType) {
      setError("Please select a vehicle category.");
      return;
    }

    if (!VEHICLE_REGEX.test(vehicleNumber)) {
      setError("Invalid registration number format (e.g. MH12AB1234 or DL01XY5678).");
      return;
    }

    if (vehicleModel.trim().length < 3) {
      setError("Please enter a valid vehicle model/capacity specification.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await axios.post("/api/partner/vehicle", {
        type: vehicleType,
        number: vehicleNumber,
        vehicleModel,
      });

      await update({ role: "vendor" });

      router.push("/partner/onboard/documents");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save vehicle details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PartnerSetupFrame>
      <header className="mb-6 border-b border-[var(--border-default)] pb-5">
        <PartnerSetupTitle
          step={1}
          title="Add your vehicle"
          description="Choose your vehicle type and enter the details on its registration certificate."
          onBack={() => router.back()}
        />

          {completed && !editMode && (
            <div className="mt-4 p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] flex items-center justify-between ">
              <div className="flex items-center gap-2 text-[var(--text-primary)] text-xs font-semibold">
                <CheckCircle size={15} className="text-[var(--accent-ink)]" />
                <span>Vehicle details recorded on file</span>
              </div>

              <button
                onClick={() => setEditMode(true)}
                className="text-xs tabular-nums font-bold text-[var(--accent-ink)] underline flex items-center gap-1 hover:text-[#0d192b] dark:hover:text-[#263b56] cursor-pointer"
              >
                <Pencil size={12} />
                Edit
              </button>
            </div>
          )}
      </header>

        {/* ================= FORM ================= */}
        <div
          className={`space-y-6 ${
            completed && !editMode ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {/* VEHICLE TYPE */}
          <div>
            <label className="text-[11px] tabular-nums font-semibold text-[var(--text-secondary)] block mb-2.5">
              Vehicle Classification
            </label>

            <div className="grid grid-cols-1 gap-2 min-[375px]:grid-cols-2 sm:grid-cols-3">
              {VEHICLES.map((v) => {
                const Icon = v.icon;
                const active = vehicleType === v.id;

                return (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setVehicleType(v.id)}
                    aria-pressed={active}
                    className={`min-h-11 min-w-0 rounded-[10px] border p-3.5 flex flex-col items-start gap-2 transition-colors text-left cursor-pointer
                      ${
                        active
                          ? "bg-[var(--midnight)] dark:bg-[#263b56] text-white border-[var(--midnight)] dark:border-[#263b56] "
                          : "border-[var(--border-default)] hover:border-[var(--midnight)]/40 dark:hover:border-[#263b56]/50 bg-[var(--surface-raised)] text-[var(--text-primary)]"
                      }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0
                        ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-[var(--surface-subtle)] text-[var(--accent-ink)]"
                        }`}
                    >
                      <Icon size={15} />
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm font-bold leading-tight">
                        {v.label}
                      </p>
                      <p
                        className={`text-[10px] leading-tight mt-0.5 tabular-nums ${
                          active ? "text-[var(--ice)]" : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {v.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VEHICLE NUMBER */}
          <div>
            <label htmlFor="driver-vehicle-registration" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Registration Certificate (RC) Number
            </label>
            <input
              id="driver-vehicle-registration"
              value={vehicleNumber}
              onChange={(e) =>
                setVehicleNumber(e.target.value.toUpperCase())
              }
              placeholder="e.g. AS01AB1234"
              className="w-full border border-[var(--border-interactive)] rounded-[8px] p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] focus:border-[var(--focus-ring)] transition-colors bg-[var(--surface-raised)] text-[var(--text-primary)] uppercase tabular-nums tracking-wider"
            />
            <p className="text-[10px] tabular-nums text-[var(--text-secondary)] mt-1">
              Must match the vehicle RC document uploaded in Step 2.
            </p>
          </div>

          {/* VEHICLE MODEL */}
          <div>
            <label htmlFor="driver-vehicle-model" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Vehicle model
            </label>
            <input
              id="driver-vehicle-model"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="e.g. Maruti Suzuki WagonR 2023 / Tata Ace 1.5T"
              className="w-full border border-[var(--border-interactive)] rounded-[8px] p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] focus:border-[var(--focus-ring)] transition-colors bg-[var(--surface-raised)] text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div role="alert" className="mt-4 p-3 rounded-[8px] bg-[#992f22]/10 dark:bg-red-950/30 border border-[#992f22] dark:border-red-900/50 text-xs text-[#992f22] dark:text-[#ffab9c] tabular-nums">
            {error}
          </div>
        )}

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.99 }}
          disabled={loading}
          onClick={submitVehicle}
          className="mt-8 w-full h-12 sm:h-13 rounded-[8px] bg-[var(--action-bg)] hover:opacity-90 text-[var(--action-fg)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer "
        >
          <span>
            {completed && !editMode
              ? "Continue to Step 2"
              : editMode
              ? "Save & Continue"
              : loading
              ? "Saving Record..."
              : "Continue to Step 2"}
          </span>
          <ArrowRight size={16} />
        </motion.button>
    </PartnerSetupFrame>
  );
}
