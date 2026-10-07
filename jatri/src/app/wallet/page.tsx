"use client";



import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import useGetMe from "@/shared/hooks/useGetMe";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { loadRazorpayScript } from "@/lib/loadRazorpay";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Plus,
  ShieldCheck,
  Zap,
  CreditCard,
  IndianRupee,
  Clock,
  Car,
  AlertCircle,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2000];

export default function WalletPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
  useGetMe(true);

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [outstandingAmount, setOutstandingAmount] = useState<number>(0);
  const [summary, setSummary] = useState({ totalAdded: 0, totalSpent: 0, transactionCount: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "credit" | "debit" | "refund">("all");

  /* Top-Up State */
  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>("500");
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [processingTopup, setProcessingTopup] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupSuccessMsg, setTopupSuccessMsg] = useState<string | null>(null);

  /* Fetch Wallet Data */
  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wallet", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.status === 401) {
        return;
      }
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance || 0);
        setOutstandingAmount(data.outstandingAmount || 0);
        setSummary(data.summary || { totalAdded: 0, totalSpent: 0, transactionCount: 0 });
        setTransactions(data.transactions || []);

        if (userData) {
          dispatch(setUserData({ ...userData, walletBalance: data.balance || 0, outstandingAmount: data.outstandingAmount || 0 }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
    } finally {
      setLoading(false);
    }
  }, [userData, dispatch]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  /* Handle Top-Up Flow */
  const handleInitiateTopup = async () => {
    const amountNum = Math.round(Number(customAmount));
    if (!amountNum || isNaN(amountNum) || amountNum < 10) {
      setTopupError("Please enter a valid amount (minimum ₹10)");
      return;
    }

    try {
      setProcessingTopup(true);
      setTopupError(null);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setTopupError("Payment gateway SDK failed to load. Please check your connection.");
        return;
      }

      // Step 1: Create Razorpay Order
      const createRes = await fetch("/api/wallet/topup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum }),
      });
      const orderData = await createRes.json();

      if (!orderData.success) {
        setTopupError(orderData.error || "Failed to create payment order");
        return;
      }

      // Step 2: Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: "INR",
        name: "RideNow Cash",
        description: `Top-up Wallet with ₹${amountNum}`,
        order_id: orderData.orderId,
        prefill: {
          name: userData?.name || "",
          email: userData?.email || "",
          contact: userData?.mobileNumber || "",
        },
        theme: {
          color: "#18181b",
        },
        handler: async function (response: any) {
          try {
            // Step 3: Verify and Credit Wallet
            const verifyRes = await fetch("/api/wallet/topup/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                amount: amountNum,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setTopupSuccessMsg(`₹${amountNum} added successfully to your wallet!`);
              setShowTopupModal(false);
              fetchWallet();
              setTimeout(() => setTopupSuccessMsg(null), 4000);
            } else {
              setTopupError(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
            setTopupError("Network error verifying payment");
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingTopup(false);
          },
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      console.error("Topup error:", err);
      setTopupError(err?.message || "An unexpected error occurred");
    } finally {
      setProcessingTopup(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeFilter === "credit") return t.type === "credit" && t.category !== "ride_refund";
    if (activeFilter === "debit") return t.type === "debit";
    if (activeFilter === "refund") return t.category === "ride_refund";
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      <Nav />

      {/* Subtle Dot Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.45,
        }}
      />

      <main className="relative flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-12 z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
              <div className="h-px w-6 bg-zinc-900" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Payment & Credits
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              RideNow Cash
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                <Sparkles size={11} /> 1-Tap Checkout
              </span>
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1 font-medium">
              Zero payment failure, instant ride dispatch, and immediate refunds.
            </p>
          </div>

          <button
            onClick={() => setShowTopupModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-zinc-900 hover:bg-black text-white text-xs sm:text-sm font-black transition-all shadow-md active:scale-95"
          >
            <Plus size={16} /> Add Money
          </button>
        </div>

        {/* Success Alert Banner */}
        <AnimatePresence>
          {topupSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500 text-white flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} />
                <span className="text-xs sm:text-sm font-bold">{topupSuccessMsg}</span>
              </div>
              <button
                onClick={() => setTopupSuccessMsg(null)}
                className="text-xs font-semibold px-2 py-1 bg-white/20 rounded-lg hover:bg-white/30"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Outstanding Dues Banner */}
        {outstandingAmount > 0 && (
          <div className="mb-5 sm:mb-6 p-4 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black">
                  Unpaid Cancellation Dues: ₹{outstandingAmount}
                </p>
                <p className="text-[11px] text-rose-700 font-medium">
                  This outstanding balance will be automatically recovered on your next ride payment or wallet top-up.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTopupModal(true)}
              className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs transition"
            >
              Clear Dues
            </button>
          </div>
        )}

        {/* HERO WALLET CARD & QUICK STATS */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Main Card */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-br from-zinc-900 via-zinc-950 to-black text-white p-5 sm:p-9 shadow-xl sm:shadow-2xl border border-zinc-800 flex flex-col justify-between min-h-[190px] sm:min-h-[220px]">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
                  Available Balance
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    ₹{balance.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">INR</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-amber-400">
                <Wallet size={20} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="relative z-10 pt-4 sm:pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-[11px] sm:text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Protected by RBI compliant 256-bit encryption</span>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                className="text-white hover:text-amber-300 font-bold flex items-center gap-1 transition"
              >
                Quick Recharge <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Added</p>
                <p className="text-xl font-black text-zinc-900 mt-0.5">
                  ₹{summary.totalAdded.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center flex-shrink-0">
                <ArrowUpRight size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Spent</p>
                <p className="text-xl font-black text-zinc-900 mt-0.5">
                  ₹{summary.totalSpent.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-sm flex items-center justify-between text-xs font-bold text-zinc-600">
              <span className="flex items-center gap-1.5 text-zinc-500 font-medium">
                <Clock size={14} /> Total Transactions
              </span>
              <span className="font-mono text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-xl">
                {summary.transactionCount}
              </span>
            </div>
          </div>
        </div>

        {/* PASSBOOK / LEDGER SECTION */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          {/* Header & Filter Tabs */}
          <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-zinc-900">Passbook & History</h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                Every transaction is encrypted and ledger verified.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl self-start sm:self-auto">
              {[
                { id: "all", label: "All" },
                { id: "credit", label: "Added" },
                { id: "debit", label: "Spent" },
                { id: "refund", label: "Refunds" },
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

          {/* Transactions List */}
          <div className="divide-y divide-zinc-100">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 size={24} className="animate-spin text-zinc-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-medium">Loading ledger records…</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                  <Wallet size={20} />
                </div>
                <p className="text-sm font-bold text-zinc-700">No transactions recorded</p>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-xs mx-auto">
                  Add funds to enjoy 1-tap booking or pay with cash on your next ride.
                </p>
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black transition"
                >
                  Top Up ₹500
                </button>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isCredit = tx.type === "credit";
                const isRefund = tx.category === "ride_refund";

                return (
                  <div
                    key={tx._id}
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          isRefund
                            ? "bg-amber-100 text-amber-800"
                            : isCredit
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {isRefund ? (
                          <RotateCcw size={16} />
                        ) : isCredit ? (
                          <ArrowDownLeft size={16} />
                        ) : (
                          <Car size={16} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-zinc-900 truncate">
                            {tx.description}
                          </p>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isRefund
                                ? "bg-amber-100 text-amber-800"
                                : isCredit
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {tx.category.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 font-medium">
                          {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      <p
                        className={`text-sm sm:text-base font-black font-mono ${
                          isCredit ? "text-emerald-600" : "text-zinc-900"
                        }`}
                      >
                        {isCredit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        Bal: ₹{tx.balanceAfter.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TOP-UP MODAL DIALOG */}
        <AnimatePresence>
          {showTopupModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                      <Wallet size={16} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-zinc-900">Add Money to Wallet</h3>
                      <p className="text-[11px] text-zinc-400 font-medium">UPI · Card · Netbanking</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowTopupModal(false);
                      setTopupError(null);
                    }}
                    className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition"
                  >
                    ✕
                  </button>
                </div>

                {topupError && (
                  <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{topupError}</span>
                  </div>
                )}

                {/* Amount Input */}
                <div className="mb-4">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 block">
                    Enter Amount
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-zinc-200 focus-within:border-zinc-900 transition">
                    <span className="text-lg font-black text-zinc-400">₹</span>
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="500"
                      className="w-full text-xl font-black text-zinc-900 outline-none"
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="mb-6">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                    Quick Amounts
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCustomAmount(amt.toString())}
                        className={`py-2 rounded-xl text-xs font-bold transition ${
                          customAmount === amt.toString()
                            ? "bg-zinc-900 text-white shadow-xs"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        }`}
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security Note */}
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 mb-4 text-[11px] text-zinc-500 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500 flex-shrink-0" />
                  <span>Money added is immediately available for 1-tap bookings & refunds.</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTopupModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={processingTopup || !customAmount}
                    onClick={handleInitiateTopup}
                    className="flex-1 py-3 rounded-2xl bg-zinc-900 text-white text-xs font-black hover:bg-black transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {processingTopup ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Processing…
                      </>
                    ) : (
                      <>
                        <span>Proceed to Pay</span>
                        <ArrowUpRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
