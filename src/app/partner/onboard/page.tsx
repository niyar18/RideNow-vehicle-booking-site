"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bike, Car, Truck } from "lucide-react";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    icon: Bike,
    title: "Vehicle Details",
    desc: "Add vehicle type, number & capacity",
  },
  {
    icon: Car,
    title: "Document Verification",
    desc: "Upload RC, license & ID proof",
  },
  {
    icon: Truck,
    title: "Bank & Payout",
    desc: "Set up bank account for earnings",
  },
];

export default function PartnerOnboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="
          w-full max-w-xl
          bg-white
          rounded-3xl
          border border-gray-200
          shadow-[0_20px_60px_rgba(0,0,0,0.12)]
          p-6 sm:p-8
        "
      >
        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-black">
            Become a Partner
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Start earning by listing your vehicle on our platform
          </p>
        </div>

        {/* STEPS */}
        <div className="mt-10 space-y-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                className="
                  flex items-center gap-4
                  p-4 sm:p-5
                  rounded-2xl
                  border border-gray-200
                  bg-gray-50
                "
              >
                <div className="
                  w-11 h-11 rounded-full
                  bg-black text-white
                  flex items-center justify-center
                  flex-shrink-0
                ">
                  <Icon size={20} />
                </div>

                <div>
                  <p className="font-semibold text-black text-sm sm:text-base">
                    {step.title}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/partner/onboard/vehicle")}
          className="
            mt-10 w-full h-14
            rounded-2xl
            bg-black text-white
            font-semibold
            flex items-center justify-center gap-2
            hover:bg-gray-900
            transition
          "
        >
          Start Registration
          <ArrowRight size={18} />
        </motion.button>

        {/* FOOT NOTE */}
        <p className="text-[11px] text-gray-400 text-center mt-4">
          Takes less than 5 minutes to complete
        </p>
      </motion.div>
    </div>
  );
}
