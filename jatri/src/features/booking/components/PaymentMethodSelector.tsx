"use client";

import { motion } from "framer-motion";
import { Wallet, Banknote, CreditCard, CheckCircle2 } from "lucide-react";

export type PaymentMethodType = "cash" | "wallet" | "online" | "razorpay";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType | null;
  onSelect: (method: any) => void;
  walletBalance: number | null;
  fare: number;
  useWallet?: boolean;
  onToggleWallet?: (use: boolean) => void;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  walletBalance,
  fare,
  useWallet = false,
  onToggleWallet,
}: PaymentMethodSelectorProps) {
  const hasBalance = walletBalance !== null && walletBalance > 0;
  const isWalletSufficient = walletBalance !== null && walletBalance >= fare;
  const isOnlineActive = selectedMethod === "online" || selectedMethod === "razorpay";

  const walletDeduction = useWallet && hasBalance ? Math.min(walletBalance, fare) : 0;
  const remainingFare = Math.max(0, fare - walletDeduction);

  return (
    <div className="bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[14px] p-4 sm:p-6 shadow-sm mb-6 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#696B64] dark:text-[#929D93]">
          Payment Method
        </h3>
        {walletDeduction > 0 && remainingFare > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#046A38] dark:text-[#90C8A8] border border-emerald-300 dark:border-emerald-800">
            Split Payment Active
          </span>
        )}
      </div>

      {/* ─── WALLET TOGGLE FOR SPLIT / COMBINED PAYMENT ─── */}
      {hasBalance && onToggleWallet && (
        <div className="mb-4 p-3 sm:p-3.5 rounded-[10px] bg-[#E5EBDD] dark:bg-[#1D3428] border border-[#cdd6c3] dark:border-[#2D4E3A] flex items-center justify-between transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center shrink-0">
              <Wallet size={15} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#10251C] dark:text-[#F3F1E8] flex items-center gap-1.5">
                <span>Use Jaatri Wallet Balance</span>
                <span className="text-[11px] font-mono text-[#046A38] dark:text-[#90C8A8]">
                  (₹{walletBalance})
                </span>
              </p>
              <p className="text-[10.5px] text-[#696B64] dark:text-[#929D93] mt-0.5">
                {isWalletSufficient
                  ? "Covers full fare of ₹" + fare
                  : `Covers ₹${walletDeduction}, remaining ₹${remainingFare} to pay via Cash or Online`}
              </p>
            </div>
          </div>

          <label className="relative inline-flex min-w-[44px] min-h-[44px] items-center justify-center cursor-pointer shrink-0 ml-2 rounded-[8px]">
            <input
              type="checkbox"
              aria-label="Use Jaatri Wallet Balance"
              checked={useWallet}
              onChange={(e) => onToggleWallet(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-stone-300 rounded-full peer dark:bg-stone-700 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#046A38] peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-stone-600 peer-checked:bg-[#046A38]"></div>
          </label>
        </div>
      )}

      {/* ─── PAYMENT CHANNELS GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Wallet (Full Payment) */}
        <button
          type="button"
          aria-pressed={selectedMethod === "wallet" || (useWallet && remainingFare === 0)}
          onClick={() => {
            if (isWalletSufficient) {
              if (onToggleWallet) onToggleWallet(true);
              onSelect("wallet");
            }
          }}
          disabled={!isWalletSufficient}
          className={`p-4 rounded-[10px] border text-left transition-all relative flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#17211B] ${
            isWalletSufficient ? "cursor-pointer" : "cursor-not-allowed opacity-60"
          } ${
            selectedMethod === "wallet" || (useWallet && remainingFare === 0)
              ? "border-[#123D32] dark:border-[#28664D] bg-[#123D32] dark:bg-[#28664D] text-white shadow-md"
              : isWalletSufficient
              ? "border-[#DED7CA] dark:border-[#34443A] hover:border-[#123D32] dark:hover:border-[#90C8A8] bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8]"
              : "border-[#DED7CA]/50 dark:border-[#34443A]/50 bg-white/50 dark:bg-[#1E2B23]/50 text-[#696B64] dark:text-[#929D93]"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${
                selectedMethod === "wallet" || (useWallet && remainingFare === 0)
                  ? "bg-white/20 text-white"
                  : "bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#90C8A8]"
              }`}
            >
              <Wallet size={18} />
            </div>
            {(selectedMethod === "wallet" || (useWallet && remainingFare === 0)) && (
              <CheckCircle2 size={16} className="text-white" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">100% Wallet</p>
            <p
              className={`text-[11px] mt-0.5 ${
                selectedMethod === "wallet" || (useWallet && remainingFare === 0)
                  ? "text-white/80"
                  : "text-[#696B64] dark:text-[#929D93]"
              }`}
            >
              {walletBalance !== null ? `Balance: ₹${walletBalance}` : "Loading..."}
            </p>
            {!isWalletSufficient && walletBalance !== null && (
              <span className="text-[10px] text-[#E34222] dark:text-[#E06A50] font-semibold block mt-1">
                {hasBalance ? "Use toggle above for split" : `Needs ₹${fare}`}
              </span>
            )}
          </div>
        </button>

        {/* Cash */}
        <button
          type="button"
          aria-pressed={selectedMethod === "cash"}
          onClick={() => onSelect("cash")}
          className={`p-4 rounded-[10px] border text-left transition-all relative flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#17211B] ${
            selectedMethod === "cash"
              ? "border-[#123D32] dark:border-[#28664D] bg-[#123D32] dark:bg-[#28664D] text-white shadow-md"
              : "border-[#DED7CA] dark:border-[#34443A] hover:border-[#123D32] dark:hover:border-[#90C8A8] bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8]"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${
                selectedMethod === "cash"
                  ? "bg-white/20 text-white"
                  : "bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#90C8A8]"
              }`}
            >
              <Banknote size={18} />
            </div>
            {selectedMethod === "cash" && <CheckCircle2 size={16} className="text-white" />}
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">
              {walletDeduction > 0 && remainingFare > 0
                ? `Pay ₹${remainingFare} in Cash`
                : "Cash to Driver"}
            </p>
            <p
              className={`text-[11px] mt-0.5 ${
                selectedMethod === "cash" ? "text-white/80" : "text-[#696B64] dark:text-[#929D93]"
              }`}
            >
              {walletDeduction > 0 && remainingFare > 0
                ? `(₹${walletDeduction} from wallet)`
                : "Pay upon dropoff"}
            </p>
          </div>
        </button>

        {/* Online / Razorpay */}
        <button
          type="button"
          aria-pressed={isOnlineActive}
          onClick={() => onSelect("online")}
          className={`p-4 rounded-[10px] border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
            isOnlineActive
              ? "border-[#123D32] dark:border-[#28664D] bg-[#123D32] dark:bg-[#28664D] text-white shadow-md"
              : "border-[#DED7CA] dark:border-[#34443A] hover:border-[#123D32] dark:hover:border-[#90C8A8] bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8]"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${
                isOnlineActive
                  ? "bg-white/20 text-white"
                  : "bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#90C8A8]"
              }`}
            >
              <CreditCard size={18} />
            </div>
            {isOnlineActive && <CheckCircle2 size={16} className="text-white" />}
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">
              {walletDeduction > 0 && remainingFare > 0
                ? `Pay ₹${remainingFare} Online`
                : "UPI / Card / NetBanking"}
            </p>
            <p
              className={`text-[11px] mt-0.5 ${
                isOnlineActive ? "text-white/80" : "text-[#696B64] dark:text-[#929D93]"
              }`}
            >
              {walletDeduction > 0 && remainingFare > 0
                ? `(₹${walletDeduction} from wallet)`
                : "Instant Razorpay checkout"}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
