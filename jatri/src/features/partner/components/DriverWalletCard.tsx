"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Percent,
  ChevronRight,
  ShieldCheck,
  IndianRupee,
  Clock,
  Car,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/context/LanguageContext";

export default function DriverWalletCard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [availableEarnings, setAvailableEarnings] = useState(0);
  const [platformDues, setPlatformDues] = useState(0);
  const [metrics, setMetrics] = useState({
    totalEarnings: 0,
    totalCommission: 0,
    totalWithdrawn: 0,
    transactionCount: 0,
  });
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "earning" | "commission" | "withdrawal">("all");

  /* Withdrawal Modal State */
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [processingWithdraw, setProcessingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const fetchDriverWallet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/partner/wallet", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (data.success) {
        setAvailableEarnings(data.availableEarnings || 0);
        setPlatformDues(data.platformDues || data.wallet?.platformDues || 0);
        setMetrics(data.metrics || {
          totalEarnings: 0,
          totalCommission: 0,
          totalWithdrawn: 0,
          transactionCount: 0,
        });
        setBankDetails(data.bankDetails);
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to load driver wallet:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDriverWallet();
  }, [fetchDriverWallet]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Math.round(Number(withdrawAmount));

    if (!amountNum || isNaN(amountNum) || amountNum < 100) {
      setWithdrawError("Minimum withdrawal amount is ₹100");
      return;
    }

    if (amountNum > availableEarnings) {
      setWithdrawError(`Requested amount exceeds available balance (₹${availableEarnings.toLocaleString("en-IN")})`);
      return;
    }

    try {
      setProcessingWithdraw(true);
      setWithdrawError(null);

      const res = await fetch("/api/partner/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum }),
      });

      const data = await res.json();

      if (data.success) {
        setWithdrawSuccess(`Payout request for ₹${amountNum.toLocaleString("en-IN")} submitted successfully.`);
        setShowWithdrawModal(false);
        setWithdrawAmount("");
        fetchDriverWallet();
      } else {
        setWithdrawError(data.message || "Failed to process payout.");
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      setWithdrawError("Connection error while requesting payout.");
    } finally {
      setProcessingWithdraw(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === "all") return true;
    return tx.type === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Alert Banner for Success */}
      <AnimatePresence>
        {withdrawSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-[8px] bg-[var(--midnight)] dark:bg-[#0d192b] text-[var(--ice)] flex items-center justify-between border border-[var(--midnight)] dark:border-[#536779]"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-xs tabular-nums font-bold">{withdrawSuccess}</span>
            </div>
            <button
              onClick={() => setWithdrawSuccess(null)}
              className="text-[10px] tabular-nums font-bold px-2 py-1 bg-[var(--ice)] text-[var(--midnight)] dark:bg-[#243751] dark:text-[var(--ice)] hover:bg-[#e4eeeb] dark:hover:bg-[#2b4160] rounded-[6px] cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRIVER WALLET HERO & METRICS */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main Available Earnings Card */}
        <div className="lg:col-span-2 rounded-[14px] bg-[#0d192b] dark:bg-[#0d192b] text-[var(--ice)] p-6 sm:p-7 border border-[var(--midnight)] dark:border-[#263b56]/40 flex flex-col justify-between min-h-[220px] ">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <p className="text-[10px] tabular-nums font-bold text-[var(--ice)]/70">
                  {t("wallet.driverTitle", "Driver Earnings & Settlement")}
                </p>
              </div>
              <div className="flex items-baseline gap-1 mt-1 tabular-nums">
                <span className="text-3xl sm:text-4xl font-bold text-[var(--ice)] tracking-tight tabular-nums">
                  ₹{availableEarnings.toLocaleString("en-IN")}
                </span>
                <span className="text-xs font-bold text-[var(--ice)]/60">INR</span>
              </div>
              <p className="text-xs text-[var(--ice)]/80 mt-2 font-sans">
                {t("wallet.driverEarningsDesc", "Net balance ready for instant automated bank disbursement.")}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <button
                onClick={() => {
                  setWithdrawAmount(availableEarnings > 0 ? Math.min(availableEarnings, 1000).toString() : "");
                  setShowWithdrawModal(true);
                }}
                disabled={availableEarnings < 100}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] bg-[var(--ice)] text-[var(--midnight)] hover:bg-[#e4eeeb] disabled:opacity-40 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Building2 size={14} className="text-[var(--midnight)]" /> {t("wallet.withdraw", "Withdraw to Bank")}
              </button>
              {availableEarnings < 100 && (
                <span className="text-[10px] tabular-nums text-[var(--ice)]/60">Min payout threshold: ₹100</span>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--midnight)] dark:border-[#263b56]/30 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ice)]/80 font-sans">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-[var(--ice)]/70" />
              {bankDetails ? (
                <span>
                  Linked Account: <strong className="text-white">{bankDetails.maskedAccount}</strong> ({bankDetails.ifsc})
                </span>
              ) : (
                <Link
                  href="/partner/onboard/bank"
                  className="text-white font-bold underline flex items-center gap-1 text-[11px]"
                >
                  Link Bank Account for Payouts <ChevronRight size={13} />
                </Link>
              )}
            </div>
            <Link
              href="/partner/wallet"
              className="text-xs font-semibold text-[var(--ice)] hover:underline flex items-center gap-1 "
            >
              Full Ledger Page <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Breakdown Metrics */}
        <div className="flex flex-col gap-3">
          {platformDues > 0 && (
            <div className="bg-[var(--surface-raised)] rounded-[12px] p-4 border border-[var(--border-default)] flex items-center justify-between gap-3 ">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-red-100 dark:bg-red-950/30 text-[#992f22] dark:text-[#ffab9c] flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)]">
                    {t("wallet.platformDues", "Platform Dues")}
                  </p>
                  <p className="text-base font-bold text-[var(--text-primary)] tabular-nums tabular-nums mt-0.5">
                    ₹{platformDues.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] tabular-nums font-bold text-[var(--text-secondary)] bg-[var(--background)] px-1.5 py-0.5 rounded-[4px]">
                  Auto-settling
                </span>
                <Link
                  href="/partner/wallet"
                  className="text-[10px] font-bold text-[#992f22] dark:text-[#ffab9c] underline hover:text-[var(--midnight)] dark:hover:text-[var(--ice)] "
                >
                  Clear Online →
                </Link>
              </div>
            </div>
          )}

          <div className="bg-[var(--surface-raised)] rounded-[12px] p-4 border border-[var(--border-default)] flex items-center gap-3 ">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--background)] text-[var(--accent-ink)] border border-[var(--border-default)] flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)]">
                {t("wallet.lifetimeEarnings", "Lifetime Earnings")}
              </p>
              <p className="text-base font-bold text-[var(--text-primary)] tabular-nums tabular-nums mt-0.5">
                ₹{metrics.totalEarnings.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="bg-[var(--surface-raised)] rounded-[12px] p-4 border border-[var(--border-default)] flex items-center gap-3 ">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--background)] text-[var(--accent-ink)] border border-[var(--border-default)] flex items-center justify-center flex-shrink-0">
              <Percent size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)]">
                {t("wallet.platformCommission", "Platform Commission")}
              </p>
              <p className="text-base font-bold text-[var(--text-primary)] tabular-nums tabular-nums mt-0.5">
                ₹{metrics.totalCommission.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="bg-[var(--surface-raised)] rounded-[12px] p-4 border border-[var(--border-default)] flex items-center gap-3 ">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--background)] text-[var(--accent-ink)] border border-[var(--border-default)] flex items-center justify-center flex-shrink-0">
              <Building2 size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)]">
                Total Withdrawn
              </p>
              <p className="text-base font-bold text-[var(--text-primary)] tabular-nums tabular-nums mt-0.5">
                ₹{metrics.totalWithdrawn.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DRIVER PASSBOOK & LEDGER */}
      <div className="bg-[var(--surface-raised)] rounded-[14px] border border-[var(--border-default)] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight">Driver Ledger &amp; Payout History</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans">
              Transparent log of ride fare earnings, commission allocations, and bank payouts.
            </p>
          </div>

          <div className="flex items-center gap-1 border border-[var(--border-default)] p-0.5 bg-[var(--background)] rounded-[8px] self-start sm:self-auto">
            {[
              { id: "all", label: "All" },
              { id: "earning", label: "Earnings" },
              { id: "commission", label: "Commission" },
              { id: "withdrawal", label: "Payouts" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
                  activeFilter === tab.id
                    ? "bg-[var(--midnight)] dark:bg-[#263b56] text-[var(--ice)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--midnight)] dark:hover:text-[var(--ice)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Rows */}
        <div className="divide-y divide-[#b8c7ca] dark:divide-[#536779]">
          {loading ? (
            <div className="p-8 text-center text-xs font-sans text-[var(--text-secondary)]">Loading ledger data...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs font-sans text-[var(--text-secondary)]">
              No ledger records found for this category.
            </div>
          ) : (
            filteredTransactions.slice(0, 10).map((tx, idx) => {
              const isCredit = tx.type === "earning";
              return (
                <div key={tx._id || idx} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#e4eeeb] dark:hover:bg-[#0d192b] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] border border-[var(--border-default)] bg-[var(--background)] text-[var(--accent-ink)] flex items-center justify-center tabular-nums text-xs font-bold">
                      {isCredit ? "+" : "-"}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                        {tx.description || (isCredit ? "Ride Fare Credited" : "Commission/Payout Deducted")}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString()} · {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-xs sm:text-sm font-bold tabular-nums tabular-nums ${isCredit ? "text-[var(--accent-ink)]" : "text-[#992f22] dark:text-[#ffab9c]"}`}>
                      {isCredit ? "+" : "-"}₹{Number(tx.amount || 0).toLocaleString("en-IN")}
                    </p>
                    <span className="text-[9px] tabular-nums text-[var(--text-secondary)]">
                      {tx.type}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* WITHDRAWAL MODAL */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-sm bg-[var(--surface-raised)] rounded-[14px] p-6 border border-[var(--border-default)] "
            >
              <div className="flex items-center justify-between mb-4 border-b border-[var(--border-default)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] bg-[var(--midnight)] dark:bg-[#263b56] text-[var(--ice)] flex items-center justify-center font-bold">
                    <Building2 size={14} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">Withdraw Earnings</h3>
                    <p className="text-[10px] text-[var(--text-secondary)]">Automated Direct Bank Payout</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-6 h-6 rounded-[6px] border border-[var(--border-default)] hover:bg-[#e4eeeb] dark:hover:bg-[#0d192b] flex items-center justify-center text-[var(--text-secondary)] text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {withdrawError && (
                <div className="p-3 mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-[8px] text-xs text-[#992f22] dark:text-[#ffab9c] flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {/* Linked Bank Info Card */}
              {bankDetails ? (
                <div className="p-3 bg-[var(--background)] border border-[var(--border-default)] rounded-[8px] mb-4 text-xs font-sans">
                  <p className="text-[9px] font-bold text-[var(--text-secondary)] mb-1">
                    Beneficiary Account
                  </p>
                  <p className="font-bold text-[var(--text-primary)]">{bankDetails.accountHolderName}</p>
                  <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">
                    Account: {bankDetails.maskedAccount} · IFSC: {bankDetails.ifsc}
                  </p>
                  {bankDetails.upi && (
                    <p className="text-[var(--text-secondary)] text-[10px] mt-0.5">UPI ID: {bankDetails.upi}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-[var(--background)] border border-[var(--border-default)] rounded-[8px] mb-4 text-xs font-sans">
                  <p className="font-bold mb-1 text-[var(--text-primary)]">No Bank Account Linked</p>
                  <p className="text-[11px] mb-2 text-[var(--text-secondary)]">
                    Link bank details to receive automated disbursements.
                  </p>
                  <Link
                    href="/partner/onboard/bank"
                    className="inline-block px-3 py-1 bg-[var(--midnight)] dark:bg-[#263b56] text-[var(--ice)] rounded-[6px] text-[10px] font-semibold "
                  >
                    Add Bank Details
                  </Link>
                </div>
              )}

              <form onSubmit={handleWithdraw}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">
                      Amount to Withdraw
                    </label>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      Available: ₹{availableEarnings.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center rounded-[8px] border border-[var(--border-interactive)] focus-within:border-[var(--focus-ring)] transition-colors px-3 py-2 bg-[var(--surface-raised)]">
                    <span className="text-base font-bold text-[var(--text-secondary)] mr-1.5 tabular-nums">₹</span>
                    <input
                      type="number"
                      min={100}
                      max={availableEarnings}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full text-lg font-bold text-[var(--text-primary)] outline-none bg-transparent tabular-nums"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="mb-5">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[500, 1000, 2500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(amt.toString())}
                        disabled={amt > availableEarnings}
                        className="py-1.5 rounded-[6px] text-xs font-semibold border border-[var(--border-default)] bg-[var(--background)] hover:bg-[var(--ice)] dark:hover:bg-[#243751] disabled:opacity-40 cursor-pointer text-[var(--text-primary)]"
                      >
                        ₹{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(availableEarnings.toString())}
                      disabled={availableEarnings <= 0}
                      className="py-1.5 rounded-[6px] text-xs font-semibold border border-[var(--midnight)] dark:border-[#263b56] bg-[var(--midnight)] dark:bg-[#263b56] text-[var(--ice)] hover:bg-[#0d192b] dark:hover:bg-[#354b66] disabled:opacity-40 cursor-pointer"
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-2.5 rounded-[8px] border border-[var(--border-default)] text-xs uppercase font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[#e4eeeb] dark:hover:bg-[#2b4160] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingWithdraw || !withdrawAmount || Number(withdrawAmount) < 100 || !bankDetails}
                    className="flex-1 py-2.5 rounded-[8px] bg-[var(--midnight)] dark:bg-[#263b56] text-[var(--ice)] text-xs font-semibold hover:bg-[#0d192b] dark:hover:bg-[#354b66] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer "
                  >
                    {processingWithdraw ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Confirm Payout"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
