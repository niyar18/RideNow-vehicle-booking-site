"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldAlert, Siren, PhoneCall } from "lucide-react";

interface RideSafetyAlertProps {
  isDeviated: boolean;
  onConfirmSafe: () => void;
  onTriggerSos: () => void;
  isPanicActive?: boolean;
}

export default function RideSafetyAlert({
  isDeviated,
  onConfirmSafe,
  onTriggerSos,
  isPanicActive,
}: RideSafetyAlertProps) {
  return (
    <>
      {/* Route deviation banner */}
      <AnimatePresence>
        {isDeviated && !isPanicActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-3 right-3 sm:left-4 sm:right-4 z-40 max-w-lg mx-auto bg-amber-500/95 text-zinc-950 px-3 sm:px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-black/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-zinc-950" />
              </div>
              <div>
                <p className="text-xs font-black leading-tight">Route Deviation Detected</p>
                <p className="text-[10px] font-semibold opacity-90 leading-tight">
                  Your vehicle appears to have diverged from the planned route.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 flex-shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={onConfirmSafe}
                aria-label="Confirm you are safe"
                className="min-h-[44px] px-3 bg-zinc-950 text-white font-bold text-xs rounded-lg active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                I am Safe
              </button>
              <button
                type="button"
                onClick={onTriggerSos}
                aria-label="Trigger emergency SOS"
                className="min-h-[44px] px-3 bg-red-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 active:scale-95 transition-transform shadow-md shadow-red-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Siren size={12} />
                SOS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active SOS Banner */}
      <AnimatePresence>
        {isPanicActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed top-4 left-3 right-3 sm:left-4 sm:right-4 z-40 max-w-lg mx-auto bg-red-600 text-white px-3 sm:px-4 py-3.5 rounded-2xl shadow-2xl border border-red-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <Siren size={20} className="animate-bounce" />
              <div>
                <p className="text-xs font-black">Emergency SOS Active</p>
                <p className="text-[10px] opacity-90">Authorities and emergency contacts notified.</p>
              </div>
            </div>
            <a
              href="tel:112"
              className="min-h-[44px] px-3.5 py-2 bg-white text-red-600 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-600 self-end sm:self-auto"
            >
              <PhoneCall size={14} />
              Call 112
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
