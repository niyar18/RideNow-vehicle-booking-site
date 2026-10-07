"use client";



import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
  IndianRupee,
  ChevronRight,
  ArrowLeft,
  Percent,
} from "lucide-react";
import Link from "next/link";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";

export default function PartnerWalletPage() {
  const [loading, setLoading] = useState(true);
  const [availableEarnings, setAvailableEarnings] = useState(0);
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [platformDues, setPlatformDues] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [metrics, setMetrics] = useState({
    totalEarnings: 0,
    totalCommission: 0,
    totalWithdrawn: 0,
    transactionCount: 0,
  });
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "earning" | "commission" | "dues" | "withdrawal"
  >("all");

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
        setWithdrawableBalance(data.withdrawableBalance ?? data.availableEarnings ?? 0);
        setPendingEarnings(data.pendingEarnings || 0);
        setPlatformDues(data.platformDues || data.wallet?.platformDues || 0);
        setTodayEarnings(data.todayEarnings || data.wallet?.todayEarnings || 0);
        setWeekEarnings(data.weekEarnings || data.wallet?.weekEarnings || 0);
        setMetrics(
          data.metrics || {
            totalEarnings: 0,
            totalCommission: 0,
            totalWithdrawn: 0,
            transactionCount: 0,
          }
        );
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

    const maxWithdrawable = withdrawableBalance > 0 ? withdrawableBalance : availableEarnings;
    if (amountNum > maxWithdrawable) {
      setWithdrawError(
        platformDues > 0
          ? `Requested amount exceeds withdrawable balance. You have ₹${platformDues} in platform dues. Max withdrawable: ₹${maxWithdrawable.toLocaleString("en-IN")}`
          : `Requested amount exceeds available balance (₹${availableEarnings.toLocaleString("en-IN")})`
      );
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
    const isEarning =
      t.transactionType === "EARNING" || t.category === "partner_earning";
    const isCommission =
      t.transactionType === "COMMISSION" || t.category === "commission_deduct";
    const isDues =
      t.transactionType === "SETTLE_DUES" || t.category === "settle_dues";
    const isWithdrawal =
      t.transactionType === "WITHDRAWAL" || t.category === "withdrawal";

    if (activeFilter === "earning") return isEarning;
    if (activeFilter === "commission") return isCommission;
    if (activeFilter === "dues") return isDues;
    if (activeFilter === "withdrawal") return isWithdrawal;
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col justify-between">
      <div>
        <Nav />

        <main className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12 sm:pb-16">
          {/* BREADCRUMB / TOP HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 mb-1">
                <Link
                  href="/partners/dashboard"
                  className="hover:text-zinc-900 transition flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Driver Dashboard
                </Link>
                <span>/</span>
                <span className="text-zinc-800">Wallet & Earnings</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                Driver Wallet & Earnings
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Transparent ride payout breakdown (85% Driver share, 15% Platform commission).
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => fetchDriverWallet()}
                className="px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition shadow-xs active:scale-95 shrink-0"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={availableEarnings < 100 || !bankDetails}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <ArrowUpRight size={14} /> Withdraw Earnings
              </button>
            </div>
          </div>

          {/* SUCCESS NOTIFICATION */}
          {withdrawSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-600 text-white flex items-center justify-between shadow-md">
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
            </div>
          )}

          {/* OVERVIEW CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {/* 1. AVAILABLE EARNINGS */}
            <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Available to Withdraw
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <IndianRupee size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-zinc-900 tracking-tight">
                  ₹{availableEarnings.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Settled earnings ready for instant bank/UPI transfer.
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Min. payout: ₹100</span>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={availableEarnings < 100 || !bankDetails}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 disabled:opacity-40"
                >
                  Withdraw now <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* 2. PENDING EARNINGS */}
            <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    In-Flight / Pending
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-zinc-900 tracking-tight">
                  ₹{pendingEarnings.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Ongoing rides currently underway. Settled on ride completion.
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Ride completion</span>
                <span className="text-xs font-bold text-amber-700">Auto-credit</span>
              </div>
            </div>

            {/* 3. PLATFORM DUES */}
            <div
              className={`rounded-2xl bg-white border p-6 shadow-xs flex flex-col justify-between ${
                platformDues > 0
                  ? "border-amber-300 bg-amber-50/20"
                  : "border-zinc-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Platform Dues
                  </span>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      platformDues > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    <AlertCircle size={16} />
                  </div>
                </div>
                <div
                  className={`text-3xl font-black tracking-tight ${
                    platformDues > 0 ? "text-amber-800" : "text-zinc-900"
                  }`}
                >
                  ₹{platformDues.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {platformDues > 0
                    ? "Commission owed from cash rides. Auto-settled from future online rides."
                    : "No outstanding platform commission dues."}
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {platformDues > 0 ? "Auto-settling" : "Status"}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    platformDues > 0
                      ? "text-amber-700 bg-amber-100"
                      : "text-emerald-700 bg-emerald-50"
                  }`}
                >
                  {platformDues > 0 ? "Outstanding" : "All cleared"}
                </span>
              </div>
            </div>
          </div>

          {/* DRIVER EARNINGS SUMMARY STRIP (TODAY & THIS WEEK) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl bg-white border border-zinc-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Today&apos;s Earnings
              </span>
              <div className="text-xl font-black text-zinc-900 mt-0.5">
                ₹{todayEarnings.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-zinc-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                This Week
              </span>
              <div className="text-xl font-black text-zinc-900 mt-0.5">
                ₹{weekEarnings.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-zinc-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Total Withdrawn
              </span>
              <div className="text-xl font-black text-emerald-700 mt-0.5">
                ₹{metrics.totalWithdrawn.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-zinc-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Lifetime Earnings
              </span>
              <div className="text-xl font-black text-zinc-900 mt-0.5">
                ₹{metrics.totalEarnings.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* LINKED BANK ACCOUNT CARD */}
          <div className="rounded-2xl bg-white border border-zinc-200 p-6 mb-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 flex-shrink-0">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-zinc-900">
                      Payout Destination
                    </h2>
                    {bankDetails?.status === "verified" ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        Verified
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                        Active
                      </span>
                    )}
                  </div>
                  {bankDetails ? (
                    <div className="mt-1 text-xs text-zinc-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        <strong className="text-zinc-800">Beneficiary:</strong>{" "}
                        {bankDetails.accountHolderName}
                      </span>
                      <span>
                        <strong className="text-zinc-800">Account:</strong>{" "}
                        {bankDetails.maskedAccount}
                      </span>
                      <span>
                        <strong className="text-zinc-800">IFSC:</strong>{" "}
                        {bankDetails.ifsc}
                      </span>
                      {bankDetails.upi && (
                        <span>
                          <strong className="text-zinc-800">UPI:</strong>{" "}
                          {bankDetails.upi}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      No bank details configured. Complete your bank step in Onboarding to enable withdrawals.
                    </p>
                  )}
                </div>
              </div>

              <Link
                href="/partner/onboard/bank"
                className="px-3.5 py-2 rounded-xl border border-zinc-300 hover:border-zinc-900 text-xs font-bold text-zinc-700 transition self-start sm:self-center"
              >
                {bankDetails ? "Update Bank" : "Add Bank Account"}
              </Link>
            </div>
          </div>

          {/* TRANSACTIONS SECTION */}
          <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden shadow-xs">
            {/* Header & Filter Tabs */}
            <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  Transaction History
                </h2>
                <p className="text-xs text-zinc-500">
                  Direct ledger of ride credits, commission deductions, and payouts.
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl overflow-x-auto max-w-full scrollbar-none shrink-0">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "earning", label: "Earnings (85%)" },
                    { id: "commission", label: "Commission (15%)" },
                    { id: "dues", label: "Dues Settled" },
                    { id: "withdrawal", label: "Withdrawals" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                      activeFilter === tab.id
                        ? "bg-white text-zinc-900 shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List / Table */}
            {loading ? (
              <div className="p-12 text-center text-zinc-400">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                <span className="text-xs font-semibold">Loading ledger…</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-zinc-400">
                <Wallet size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-zinc-700">No transactions recorded</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Complete rides to see your earnings and settlements here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredTransactions.map((tx) => {
                  const isEarning =
                    tx.transactionType === "EARNING" ||
                    tx.category === "partner_earning";
                  const isWithdrawal =
                    tx.transactionType === "WITHDRAWAL" ||
                    tx.category === "withdrawal";
                  const isCommission =
                    tx.transactionType === "COMMISSION" ||
                    tx.category === "commission_deduct";
                  const isDues =
                    tx.transactionType === "SETTLE_DUES" ||
                    tx.category === "settle_dues";
                  const isCash =
                    tx.transactionType === "CASH_COLLECTION" ||
                    tx.category === "cash_collection";

                  return (
                    <div
                      key={tx._id}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-zinc-50 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                            isEarning
                              ? "bg-emerald-50 text-emerald-700"
                              : isWithdrawal
                              ? "bg-blue-50 text-blue-700"
                              : isDues
                              ? "bg-purple-50 text-purple-700"
                              : isCash
                              ? "bg-teal-50 text-teal-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isEarning || isCash ? (
                            <ArrowDownLeft size={16} />
                          ) : (
                            <ArrowUpRight size={16} />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-zinc-900">
                              {isEarning
                                ? "Ride Earning"
                                : isWithdrawal
                                ? "Bank Payout"
                                : isDues
                                ? "Platform Dues Settled"
                                : isCash
                                ? "Cash Ride Collected"
                                : "Platform Commission"}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isEarning
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isWithdrawal
                                  ? "bg-blue-100 text-blue-800"
                                  : isDues
                                  ? "bg-purple-100 text-purple-800"
                                  : isCash
                                  ? "bg-teal-100 text-teal-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {tx.transactionType || tx.category}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                            {tx.description}
                          </p>
                          <span className="text-[11px] text-zinc-400">
                            {new Date(tx.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-sm sm:text-base font-black ${
                            isEarning || isCash ? "text-emerald-700" : "text-zinc-900"
                          }`}
                        >
                          {isEarning || isCash ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                        </div>
                        <span className="text-[10px] font-semibold text-zinc-400 capitalize">
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />

      {/* WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-900">
              Withdraw Available Earnings
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Funds will be disbursed directly to your registered bank account.
            </p>

            {withdrawError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2 border border-red-200">
                <AlertCircle size={15} />
                <span>{withdrawError}</span>
              </div>
            )}

            {/* Destination Preview */}
            {bankDetails && (
              <div className="mt-4 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Payout To
                </div>
                <div className="font-bold text-zinc-800">
                  {bankDetails.accountHolderName}
                </div>
                <div className="text-zinc-500">
                  Account: {bankDetails.maskedAccount} (IFSC: {bankDetails.ifsc})
                </div>
              </div>
            )}

            <form onSubmit={handleWithdraw} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Withdrawal Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={100}
                    max={availableEarnings}
                    step={1}
                    required
                    placeholder="Enter amount (min ₹100)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 font-bold text-zinc-900 text-sm focus:border-zinc-900 outline-none"
                  />
                </div>
              </div>

              {/* Quick amount chips */}
              <div className="flex gap-2">
                {[500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWithdrawAmount(String(amt))}
                    disabled={availableEarnings < amt}
                    className="flex-1 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(availableEarnings))}
                  disabled={availableEarnings < 100}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-900 hover:bg-zinc-200 disabled:opacity-40"
                >
                  Max (₹{availableEarnings})
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingWithdraw || !withdrawAmount}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {processingWithdraw ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Payout…
                    </>
                  ) : (
                    "Confirm Payout"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
