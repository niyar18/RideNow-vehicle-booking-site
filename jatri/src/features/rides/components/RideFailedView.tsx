"use client";

import { motion } from "framer-motion";
import { AlertCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface RideFailedViewProps {
  booking: any;
  status: "cancelled" | "rejected" | "expired" | string;
  label: string;
  sublabel: string;
}

export default function RideFailedView({
  booking,
  status,
  label,
  sublabel,
}: RideFailedViewProps) {
  const router = useRouter();
  const isExpired = status === "expired";
  const isNoDriver = status === "no_drivers_available" || status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full bg-[var(--background)] flex flex-col items-center justify-center px-6 py-8"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center ${
            isExpired || isNoDriver
              ? "bg-amber-500/10 border border-amber-500/20"
              : "bg-[#E34222]/10 border border-[#E34222]/20"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isExpired || isNoDriver ? "bg-amber-500/20" : "bg-[#E34222]/20"
            }`}
          >
            {isExpired || isNoDriver ? (
              <AlertCircle size={36} className="text-amber-600 dark:text-amber-400" />
            ) : (
              <XCircle size={36} className="text-[#E34222] dark:text-[#E06A50]" />
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="w-full max-w-sm text-center"
      >
        <h1 className="text-[var(--text-primary)] text-2xl font-black mb-1">{label}</h1>
        <p className="text-[var(--text-secondary)] text-xs mb-6">{sublabel}</p>

        {status === "cancelled" && (
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[14px] p-4 mb-6 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)] font-semibold">Reason</span>
              <span className="text-[var(--text-primary)] font-bold max-w-[200px] truncate text-right">
                {booking.cancellationReason || "Cancelled by passenger"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-default)]">
              <span className="text-[var(--text-secondary)] font-semibold">Cancellation Fee</span>
              <span
                className={`font-bold ${
                  booking.cancellationFeeApplied ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {booking.cancellationFeeApplied && booking.cancellationFee
                  ? `₹${booking.cancellationFee} applied`
                  : "₹0 (Free Cancellation)"}
              </span>
            </div>
            {booking.paymentStatus === "refunded" && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)] font-semibold">Refund Status</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Processed to Wallet</span>
              </div>
            )}
          </div>
        )}

        {/* Route recap */}
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[14px] overflow-hidden mb-6 text-left">
          <div className="flex gap-3 p-4 border-b border-[var(--border-default)]">
            <div className="flex flex-col items-center flex-shrink-0 pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#142238] dark:bg-[#365671]" />
              <div className="w-px bg-[#b3c8ca] dark:bg-[#435e76] mt-1" style={{ height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Pickup</p>
              <p className="text-xs text-[var(--text-primary)] leading-snug line-clamp-1">{booking.pickupAddress || "—"}</p>
            </div>
          </div>

          <div className="flex gap-3 p-4">
            <div className="flex-shrink-0 pt-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#E34222] dark:bg-[#E06A50]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Drop</p>
              <p className="text-xs text-[var(--text-primary)] leading-snug line-clamp-1">{booking.dropAddress || "—"}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full bg-[#142238] hover:bg-[#101c2f] dark:bg-[#365671] dark:hover:bg-[#406780] text-white font-bold py-3.5 rounded-[8px] text-xs transition-colors cursor-pointer"
        >
          Book Another Ride
        </button>
      </motion.div>
    </motion.div>
  );
}
