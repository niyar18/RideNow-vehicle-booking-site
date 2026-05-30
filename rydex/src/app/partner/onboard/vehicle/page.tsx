"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
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

type VehicleId = "bike" | "auto" | "car" | "loading" | "truck";

const VEHICLES = [
  { id: "bike", label: "Bike", icon: Bike, desc: "2 wheeler" },
  { id: "auto", label: "Auto", icon: Car, desc: "3 wheeler ride" },
  { id: "car", label: "Car", icon: Car, desc: "4 wheeler ride" },
  { id: "loading", label: "Loading", icon: Package, desc: "Small goods" },
  { id: "truck", label: "Truck", icon: Truck, desc: "Heavy transport" },
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

        // 🔥 AUTO FILL FROM API
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
      setError("Select vehicle type");
      return;
    }

    if (!VEHICLE_REGEX.test(vehicleNumber)) {
      setError("Invalid vehicle number (e.g. MH12AB1234)");
      return;
    }

    if (vehicleModel.trim().length < 3) {
      setError("Invalid vehicle model");
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
      setError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-[0_25px_70px_rgba(0,0,0,0.15)] p-6 sm:p-8"
      >
        {/* ================= HEADER ================= */}
        <div className="relative text-center">
          <button
            onClick={() => router.back()}
            className="absolute left-0 top-0 w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <p className="text-xs text-gray-500 font-medium">
            Step 1 of 3
          </p>

          <h1 className="text-2xl font-bold mt-1">
            Vehicle Details
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Add your vehicle information
          </p>

          {completed && !editMode && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <CheckCircle size={16} />
                Completed
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditMode(true)}
                className="text-xs font-semibold text-black underline flex items-center gap-1"
              >
                <Pencil size={12} />
                Edit details
              </motion.button>
            </div>
          )}
        </div>

        {/* ================= FORM ================= */}
        <div
          className={`mt-8 space-y-6 ${
            completed && !editMode
              ? "opacity-50 pointer-events-none"
              : ""
          }`}
        >
          {/* VEHICLE TYPE */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-3">
              Vehicle type
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {VEHICLES.map((v) => {
                const Icon = v.icon;
                const active = vehicleType === v.id;

                return (
                  <motion.button
                    key={v.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setVehicleType(v.id)}
                    className={`rounded-2xl border p-4 flex flex-col items-center gap-2 transition
                      ${
                        active
                          ? "bg-black text-white border-black"
                          : "border-gray-200 hover:border-black"
                      }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center
                        ${
                          active
                            ? "bg-white text-black"
                            : "bg-black text-white"
                        }`}
                    >
                      <Icon size={20} />
                    </div>

                    <p className="text-sm font-semibold">
                      {v.label}
                    </p>

                    <p
                      className={`text-xs ${
                        active
                          ? "text-gray-300"
                          : "text-gray-500"
                      }`}
                    >
                      {v.desc}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* VEHICLE NUMBER */}
          <div>
            <label className="text-xs font-semibold text-gray-500">
              Vehicle number
            </label>
            <input
              value={vehicleNumber}
              onChange={(e) =>
                setVehicleNumber(e.target.value.toUpperCase())
              }
              placeholder="MH12AB1234"
              className="mt-2 w-full border-b border-gray-300 pb-2 text-sm focus:outline-none focus:border-black transition"
            />
          </div>

          {/* VEHICLE MODEL */}
          <div>
            <label className="text-xs font-semibold text-gray-500">
              Vehicle model / capacity
            </label>
            <input
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Tata Ace / 1.5 Ton"
              className="mt-2 w-full border-b border-gray-300 pb-2 text-sm focus:outline-none focus:border-black transition"
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <p className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={loading}
          onClick={submitVehicle}
          className="mt-8 w-full h-14 rounded-2xl bg-black text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition"
        >
          {completed && !editMode
            ? "Continue"
            : editMode
            ? "Save & Continue"
            : loading
            ? "Submitting..."
            : "Continue"}
          <ArrowRight size={18} />
        </motion.button>
      </motion.div>
    </div>
  );
}
