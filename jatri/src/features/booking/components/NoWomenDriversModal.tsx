"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Compass, Users, X, AlertTriangle } from "lucide-react";

interface NoWomenDriversModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepSearching: () => void;
  onSearchWiderArea: () => void;
  onSwitchToAnyDriver: () => void;
}

export default function NoWomenDriversModal({
  isOpen,
  onClose,
  onKeepSearching,
  onSearchWiderArea,
  onSwitchToAnyDriver,
}: NoWomenDriversModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full sm:max-w-md bg-white dark:bg-[#0B2822] border-t sm:border border-[var(--border-default)] rounded-t-[20px] sm:rounded-[14px] p-6 shadow-2xl flex flex-col gap-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-[#046A38] dark:text-[#90C8A8]">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  Woman Driver
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verified Safety Matching Notice
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Explanation Banner */}
          <div className="p-3.5 rounded-[10px] bg-[#FAF7F0] dark:bg-[#123D32]/20 border border-[var(--border-default)] text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              No eligible woman drivers available nearby right now.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              RideNow never silently assigns a male driver when you request a woman driver. You can keep searching, expand the search area, or explicitly choose any available driver.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            {/* Option 1: Keep Searching */}
            <button
              type="button"
              onClick={onKeepSearching}
              className="w-full flex items-center justify-center gap-2 bg-[#046A38] hover:bg-[#03532C] text-white font-bold py-3.5 px-4 rounded-[8px] text-sm transition-colors min-h-[44px] touch-manipulation cursor-pointer active:scale-[0.98]"
            >
              <Sparkles size={16} />
              Keep Searching for Woman Driver
            </button>

            {/* Option 2: Search Wider Area */}
            <button
              type="button"
              onClick={onSearchWiderArea}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-[#0B2822] border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-bold py-3.5 px-4 rounded-[8px] text-sm transition-colors min-h-[44px] touch-manipulation cursor-pointer active:scale-[0.98]"
            >
              <Compass size={16} className="text-zinc-500" />
              Search a Wider Area (25 km)
            </button>

            {/* Option 3: Choose Any Available Driver */}
            <button
              type="button"
              onClick={onSwitchToAnyDriver}
              className="w-full flex items-center justify-center gap-2 bg-[#FAF7F0] dark:bg-[#123D32]/30 border border-[var(--border-default)] text-[#123D32] dark:text-[#90C8A8] font-bold py-3.5 px-4 rounded-[8px] text-sm transition-colors min-h-[44px] touch-manipulation cursor-pointer active:scale-[0.98]"
            >
              <Users size={16} />
              Choose Any Available Driver
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
