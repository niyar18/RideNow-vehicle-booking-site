"use client";

import React from "react";
import {
  IndianRupee,
  CheckCircle2,
  Banknote,
  CreditCard,
  X,
  ArrowRight,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FareCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    _id: string;
    fare: number;
    partnerAmount?: number;
    adminCommission?: number;
    paymentStatus: string;
    paymentMethod?: string;
    walletAmountPaid?: number;
    cashAmountDue?: number;
    user?: any;
    driver?: any;
    pickupAddress?: string;
    dropAddress?: string;
  };
  perspective: "vendor" | "rider";
}

export default function FareCollectionModal({
  isOpen,
  onClose,
  booking,
  perspective,
}: FareCollectionModalProps) {
  if (!isOpen || !booking) return null;

  const grossFare = Math.round(Number(booking.fare)) || 0;
  const adminCommission =
    typeof booking.adminCommission === "number" && booking.adminCommission >= 0
      ? Math.round(booking.adminCommission)
      : Math.round(grossFare * 0.15);
  const netPartnerPayout =
    typeof booking.partnerAmount === "number" && booking.partnerAmount >= 0
      ? Math.round(booking.partnerAmount)
      : Math.max(0, grossFare - adminCommission);

  const isCash = booking.paymentStatus === "cash" || booking.paymentMethod === "cash";
  const walletPaid = Math.round(Number((booking as any).walletAmountPaid || 0));
  const cashAmountDue =
    typeof (booking as any).cashAmountDue === "number" && (booking as any).cashAmountDue >= 0
      ? Math.round((booking as any).cashAmountDue)
      : isCash
      ? Math.max(0, grossFare - walletPaid)
      : 0;

  const customerName = booking.user?.name || "Customer";
  const driverName = booking.driver?.name || "Driver Partner";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-xs p-3.5 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md bg-[#f3f8f6] dark:bg-[#1a2d45] border border-[#b3c8ca] dark:border-[#4e697f] rounded-[16px] shadow-2xl overflow-hidden my-auto select-none"
        >
          {/* Top Header Strip */}
          <div className="bg-[#142238] dark:bg-[#101c2f] px-5 py-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isCash && cashAmountDue > 0 ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-sans">
                {perspective === "vendor"
                  ? "Drop-off Completed • Payment Summary"
                  : "Trip Completed • Payment Summary"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Focal Big Fare Callout Box */}
            <div className="bg-white dark:bg-[#263d54] border border-[#b3c8ca] dark:border-[#4e697f] rounded-[12px] p-4 text-center space-y-1 relative shadow-2xs">
              <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#4d6374] dark:text-[#b3cbd1] block">
                {isCash && cashAmountDue > 0
                  ? perspective === "vendor"
                    ? "Cash Amount to Collect"
                    : "Amount to Pay in Cash"
                  : "Total Paid Digitally"}
              </span>

              <div className="flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-[#142238] dark:text-[#f3f8f6] font-mono tracking-tight">
                <IndianRupee size={28} className="stroke-[2.5] mr-0.5" />
                <span>{isCash && cashAmountDue > 0 ? cashAmountDue : grossFare}</span>
              </div>

              <p className="text-[11px] text-[#4d6374] dark:text-[#b3cbd1] font-medium">
                {walletPaid > 0 && cashAmountDue > 0
                  ? `Total Trip Fare: ₹${grossFare} (₹${walletPaid} paid via Wallet)`
                  : "Gross Trip Fare (Inclusive of GST & Platform fees)"}
              </p>
            </div>

            {/* Directive Cash / Online Alert Banner */}
            {isCash && cashAmountDue > 0 ? (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-[10px] p-3.5 text-left space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-tight">
                  <Banknote size={17} className="text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>
                    {perspective === "vendor"
                      ? `Collect ₹${cashAmountDue} Cash from Rider`
                      : `Please Pay ₹${cashAmountDue} Cash to Driver`}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/90 dark:text-amber-300/90 font-medium leading-relaxed">
                  {walletPaid > 0 && (
                    <span className="block font-bold text-emerald-800 dark:text-emerald-400 mb-0.5">
                      ✓ ₹{walletPaid} already paid via Jaatri Wallet.
                    </span>
                  )}
                  {perspective === "vendor"
                    ? `Payment mode is ${
                        walletPaid > 0 ? "PARTIAL CASH" : "CASH"
                      }. Please collect ₹${cashAmountDue} from ${customerName}. Platform commission will be automatically reconciled in your Driver Wallet.`
                    : `Please hand over ₹${cashAmountDue} cash directly to ${driverName}. No additional tip or fees are required.`}
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-[10px] p-3.5 text-left space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-bold text-xs uppercase tracking-tight">
                  <CheckCircle2 size={17} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>
                    {perspective === "vendor"
                      ? "Do Not Collect Cash — Paid Online"
                      : "Paid Online — No Cash Required"}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900/90 dark:text-emerald-300/90 font-medium leading-relaxed">
                  {perspective === "vendor"
                    ? `Customer paid ₹${grossFare} digitally. Guaranteed net payout of ₹${netPartnerPayout} is recorded in your Driver Wallet.`
                    : `Your payment of ₹${grossFare} was successfully processed digitally. You are all set!`}
                </p>
              </div>
            )}

            {/* Reconciliation Breakdown */}
            {perspective === "vendor" ? (
              <div className="bg-[#e8f2ef] dark:bg-[#263d54] border border-[#b3c8ca] dark:border-[#4e697f] rounded-[10px] p-3.5 space-y-1.5 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4d6374] dark:text-[#b3cbd1]">
                  Driver Earnings Breakdown
                </p>
                <div className="flex justify-between text-[#142238] dark:text-[#f3f8f6]">
                  <span className="text-[#4d6374] dark:text-[#b3cbd1]">Customer Gross Fare:</span>
                  <span className="font-mono font-bold">₹{grossFare}</span>
                </div>
                {walletPaid > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Paid via Customer Wallet:</span>
                    <span className="font-mono font-bold">+₹{walletPaid}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#E34222] dark:text-[#E06A50]">
                  <span>Platform Commission (15%):</span>
                  <span className="font-mono font-bold">-₹{adminCommission}</span>
                </div>
                <div className="pt-2 border-t border-[#b3c8ca] dark:border-[#4e697f] flex justify-between text-[#213650] dark:text-[#91f2ce] font-extrabold text-sm">
                  <span>Net Driver Earnings:</span>
                  <span className="font-mono text-sm">₹{netPartnerPayout}</span>
                </div>
              </div>
            ) : (
              <div className="bg-[#e8f2ef] dark:bg-[#263d54] border border-[#b3c8ca] dark:border-[#4e697f] rounded-[10px] p-3.5 space-y-1.5 text-xs text-[#142238] dark:text-[#f3f8f6]">
                <div className="flex items-center justify-between">
                  <span className="text-[#4d6374] dark:text-[#b3cbd1]">Driver Partner:</span>
                  <span className="font-bold">{driverName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4d6374] dark:text-[#b3cbd1]">Payment Method:</span>
                  <span className="font-mono font-bold uppercase text-xs">
                    {walletPaid > 0 && cashAmountDue > 0
                      ? "Wallet + Cash"
                      : isCash
                      ? "Cash to Driver"
                      : "Paid Online"}
                  </span>
                </div>
              </div>
            )}

            {/* Confirmation CTA Button */}
            <button
              onClick={onClose}
              className="w-full py-3 sm:py-3.5 bg-[#213650] hover:bg-[#142238] dark:bg-[#354f68] dark:hover:bg-[#213650] text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-[8px] flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-xs"
            >
              <span>{perspective === "vendor" ? "Confirm & Continue" : "Acknowledge & Rate Ride"}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
