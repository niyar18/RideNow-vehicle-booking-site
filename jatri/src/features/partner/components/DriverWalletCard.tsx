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

export default function DriverWalletCard() {
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
        setWithdrawSuccess(data.message || `₹${amountNum} payout processed!`);
        setShowWithdrawModal(false);
        setWithdrawAmount("");
        fetchDriverWallet();
        setTimeout(() => setWithdrawSuccess(null), 5000);
      } else {
        setWithdrawError(data.error || "Failed to process withdrawal");
      }
    } catch (err: any) {
      setWithdrawError("Network error processing payout");
    } finally {
      setProcessingWithdraw(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeFilter === "earning") return t.category === "partner_earning";
    if (activeFilter === "commission") return t.category === "commission_deduct";
    if (activeFilter === "withdrawal") return t.category === "withdrawal";
    return true;
  });

  return (
    <div className="w-full space-y-6">
      {/* Success Notification */}
      <AnimatePresence>
        {withdrawSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500 text-white flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} />
              <span className="text-sm font-bold">{withdrawSuccess}</span>
            </div>
            <button
              onClick={() => setWithdrawSuccess(null)}
              className="text-xs font-semibold px-2 py-1 bg-white/20 rounded-lg hover:bg-white/30"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRIVER WALLET HERO & METRICS */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Available Earnings Card */}
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900 text-white p-6 sm:p-7 shadow-lg border border-zinc-800 flex flex-col justify-between min-h-[220px]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Driver Wallet · Available Earnings
                </p>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  ₹{availableEarnings.toLocaleString("en-IN")}
                </span>
                <span className="text-xs font-bold text-zinc-400">INR</span>
              </div>
              <p className="text-xs text-zinc-400 mt-2 font-medium">
                Earnings ready for instant bank withdrawal or commission clearing.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <button
                onClick={() => {
                  setWithdrawAmount(availableEarnings > 0 ? Math.min(availableEarnings, 1000).toString() : "");
                  setShowWithdrawModal(true);
                }}
                disabled={availableEarnings < 100}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs sm:text-sm font-bold transition shadow-sm active:scale-98"
              >
                <Building2 size={15} /> Withdraw to Bank
              </button>
              {availableEarnings < 100 && (
                <span className="text-[10px] text-zinc-500 font-medium">Min payout: ₹100</span>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-emerald-400" />
              {bankDetails ? (
                <span>
                  Linked Bank: <strong className="text-white">{bankDetails.maskedAccount}</strong> ({bankDetails.ifsc})
                </span>
              ) : (
                <Link
                  href="/partner/onboard/bank"
                  className="text-amber-400 font-bold hover:underline flex items-center gap-1"
                >
                  Link Bank Account for Payouts <ChevronRight size={13} />
                </Link>
              )}
            </div>
            <Link
              href="/partner/wallet"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Full Ledger Page <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Breakdown Metrics */}
        <div className="flex flex-col gap-3.5">
          {platformDues > 0 && (
            <div className="bg-amber-50 rounded-2xl p-4.5 border border-amber-300 shadow-xs flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Platform Dues (Cash Rides)
                  </p>
                  <p className="text-lg font-black text-amber-900 mt-0.5">
                    ₹{platformDues.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                Auto-settling
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4.5 border border-zinc-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Lifetime Earnings (85%)
              </p>
              <p className="text-lg font-black text-zinc-900 mt-0.5">
                ₹{metrics.totalEarnings.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4.5 border border-zinc-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Percent size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Platform Commission (15%)
              </p>
              <p className="text-lg font-black text-zinc-900 mt-0.5">
                ₹{metrics.totalCommission.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4.5 border border-zinc-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Total Withdrawn
              </p>
              <p className="text-lg font-black text-zinc-900 mt-0.5">
                ₹{metrics.totalWithdrawn.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DRIVER PASSBOOK & LEDGER */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-zinc-900">Driver Ledger & Payout History</h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Transparent breakdown of every ride earning, cash ride commission cut, and bank payout.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl self-start sm:self-auto">
            {[
              { id: "all", label: "All" },
              { id: "earning", label: "Earnings" },
              { id: "commission", label: "Commission" },
              { id: "withdrawal", label: "Payouts" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeFilter === tab.id
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-zinc-100 max-h-[380px] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 size={20} className="animate-spin text-zinc-400 mx-auto mb-2" />
              <p className="text-xs text-zinc-400 font-medium">Loading ledger...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-2">
                <Wallet size={18} />
              </div>
              <p className="text-xs font-bold text-zinc-700">No driver transactions yet</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Complete your first ride to start earning!
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isEarning = tx.category === "partner_earning";
              const isCommission = tx.category === "commission_deduct";
              const isWithdrawal = tx.category === "withdrawal";

              return (
                <div
                  key={tx._id}
                  className="p-4 flex items-center justify-between hover:bg-zinc-50/80 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isEarning
                          ? "bg-emerald-100 text-emerald-800"
                          : isCommission
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {isEarning ? (
                        <ArrowDownLeft size={16} />
                      ) : isCommission ? (
                        <Percent size={15} />
                      ) : (
                        <Building2 size={15} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-zinc-900 truncate">
                          {tx.description}
                        </p>
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isEarning
                              ? "bg-emerald-100 text-emerald-800"
                              : isCommission
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isEarning ? "Earning (90%)" : isCommission ? "Commission (10%)" : "Payout"}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <p
                      className={`text-xs sm:text-sm font-black font-mono ${
                        isEarning ? "text-emerald-600" : isCommission ? "text-amber-700" : "text-zinc-900"
                      }`}
                    >
                      {isEarning ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[9px] text-zinc-400 font-medium">
                      Bal: ₹{tx.balanceAfter.toLocaleString("en-IN")}
                    </p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-900">Withdraw Earnings</h3>
                    <p className="text-[11px] text-zinc-400 font-medium">Direct Bank Transfer</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition"
                >
                  ✕
                </button>
              </div>

              {withdrawError && (
                <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {/* Linked Bank Info Card */}
              {bankDetails ? (
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl mb-4 text-xs">
                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Beneficiary Account
                  </p>
                  <p className="font-bold text-zinc-900">{bankDetails.accountHolderName}</p>
                  <p className="text-zinc-500 text-[11px]">
                    Account: {bankDetails.maskedAccount} · IFSC: {bankDetails.ifsc}
                  </p>
                  {bankDetails.upi && (
                    <p className="text-zinc-400 text-[10px] mt-0.5">UPI ID: {bankDetails.upi}</p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl mb-4 text-xs text-amber-800">
                  <p className="font-bold mb-1">No Bank Account Linked</p>
                  <p className="text-[11px] mb-2">
                    Please link your bank account to enable instant earnings payouts.
                  </p>
                  <Link
                    href="/partner/onboard/bank"
                    className="inline-block px-3 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Add Bank Details
                  </Link>
                </div>
              )}

              <form onSubmit={handleWithdraw}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      Amount to Withdraw
                    </label>
                    <span className="text-[10px] text-zinc-400 font-bold">
                      Available: ₹{availableEarnings.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-zinc-200 focus-within:border-zinc-900 transition">
                    <span className="text-lg font-black text-zinc-400">₹</span>
                    <input
                      type="number"
                      min={100}
                      max={availableEarnings}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full text-xl font-black text-zinc-900 outline-none"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="mb-6">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[500, 1000, 2500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(amt.toString())}
                        disabled={amt > availableEarnings}
                        className="py-1.5 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-40"
                      >
                        ₹{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(availableEarnings.toString())}
                      disabled={availableEarnings <= 0}
                      className="py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingWithdraw || !withdrawAmount || Number(withdrawAmount) < 100 || !bankDetails}
                    className="flex-1 py-3 rounded-2xl bg-zinc-900 text-white text-xs font-black hover:bg-black transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {processingWithdraw ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Processing…
                      </>
                    ) : (
                      <>
                        <span>Confirm Payout</span>
                        <ArrowUpRight size={14} />
                      </>
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
