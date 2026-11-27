"use client";



import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import useGetMe from "@/shared/hooks/useGetMe";
import RiderPageHead from "@/features/rider/components/RiderPageHead";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { loadRazorpayScript } from "@/lib/loadRazorpay";
import { useTranslation } from "@/context/LanguageContext";
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
  ChevronRight,
} from "lucide-react";

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2000];

export default function WalletPage() {
  const { t } = useTranslation();
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

  const userDataRef = useRef(userData);
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  /* Fetch Wallet Data */
  const fetchWallet = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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

        const currentUser = userDataRef.current;
        if (
          currentUser &&
          (currentUser.walletBalance !== data.balance ||
            currentUser.outstandingAmount !== data.outstandingAmount)
        ) {
          dispatch(
            setUserData({
              ...currentUser,
              walletBalance: data.balance || 0,
              outstandingAmount: data.outstandingAmount || 0,
            })
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

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
        name: "Jaatri Cash",
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
      paymentObject.on("payment.failed", function (resp: any) {
        setProcessingTopup(false);
        setTopupError(resp?.error?.description || "Payment failed or was cancelled");
      });
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
      <Nav />

      <div className="relative z-10 mx-auto w-full max-w-[68rem] flex-1 px-4 pb-16 pt-24 sm:px-7 sm:pt-28">
        <RiderPageHead current="/wallet"
          title={t("wallet.rideNowCash", "Jaatri Cash")}
          description="Manage your ride balance and review payments and refunds."
          action={
            <button type="button" onClick={() => setShowTopupModal(true)} className="inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]">
              <Plus size={16} aria-hidden="true" /> {t("wallet.addMoney", "Add money")}
            </button>
          }
        />

        {/* Success Alert Banner */}
        <AnimatePresence>
          {topupSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-[12px] bg-[#213650] text-white flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} />
                <span className="text-xs sm:text-sm font-bold">{topupSuccessMsg}</span>
              </div>
              <button
                onClick={() => setTopupSuccessMsg(null)}
                className="text-xs font-semibold px-2.5 py-1 bg-white/20 rounded-[6px] hover:bg-white/30 cursor-pointer"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Outstanding Dues Banner */}
        {outstandingAmount > 0 && (
          <div className="mb-5 sm:mb-6 p-4 rounded-[12px] bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 text-[#E34222] dark:text-[#E06A50] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#E34222]/15 dark:bg-[#E34222]/25 text-[#E34222] dark:text-[#E06A50] flex items-center justify-center shrink-0 font-bold">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  {t("wallet.unpaidDues", "Unpaid Cancellation Dues")}: ₹{outstandingAmount}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                  {t("wallet.unpaidDuesDesc", "This outstanding balance will be automatically recovered on your next ride payment or wallet top-up.")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTopupModal(true)}
              className="shrink-0 bg-[#E34222] hover:bg-[#c93517] text-white text-xs font-bold px-4 py-2 rounded-[8px] transition cursor-pointer"
            >
              {t("wallet.clearDues", "Clear Dues")}
            </button>
          </div>
        )}

        {/* HERO WALLET CARD & QUICK STATS */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Main Card */}
          <div className="md:col-span-2 relative overflow-hidden rounded-[14px] bg-[#142238] text-[#f3f8f6] p-5 sm:p-8 border border-[#142238] dark:border-[#476458] flex flex-col justify-between min-h-[190px] sm:min-h-[220px]">
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#e3efde] mb-2">
                  {t("wallet.balance", "Available Balance")}
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl sm:text-5xl font-semibold tabular-nums text-[#f3f8f6] tracking-tight">
                    ₹{balance.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-bold text-[#ddede8]/80">INR</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[10px] bg-white/10 border border-white/10 flex items-center justify-center text-[#ddede8]">
                <Wallet size={20} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="relative z-10 pt-4 sm:pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-[11px] sm:text-xs text-[#ddede8]/80">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-[#ddede8] shrink-0" />
                <span>{t("wallet.protectedEncryption", "Payments processed securely through our payment provider")}</span>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                className="text-white hover:text-[#ddede8] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {t("wallet.quickRecharge", "Quick Recharge")} <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-col gap-4">
            <div className="bg-[var(--surface-raised)] rounded-[12px] p-5 border border-[var(--border-default)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-[8px] bg-[var(--surface-subtle)] text-[#142238] dark:text-[#91f2ce] flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t("wallet.totalAdded", "Total Added")}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                  ₹{summary.totalAdded.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] rounded-[12px] p-5 border border-[var(--border-default)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-[8px] bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center flex-shrink-0">
                <ArrowUpRight size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t("wallet.totalSpent", "Total Spent")}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                  ₹{summary.totalSpent.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] rounded-[12px] p-4 border border-[var(--border-default)] flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
                <Clock size={14} /> {t("wallet.totalTransactions", "Total Transactions")}
              </span>
              <span className="font-mono text-[var(--text-primary)] bg-[var(--surface-raised)] border border-[var(--border-default)] px-2.5 py-1 rounded-[6px]">
                {summary.transactionCount}
              </span>
            </div>
          </div>
        </div>

        {/* PASSBOOK / LEDGER SECTION */}
        <div className="bg-[var(--surface-raised)] rounded-[14px] border border-[var(--border-default)] overflow-hidden">
          {/* Header & Filter Tabs */}
          <div className="p-6 border-b border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("wallet.transactions", "Passbook & History")}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                {t("wallet.activitySummary", "Review your top-ups, ride payments, and refunds.")}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-white/80 dark:bg-[#263d54] border border-[var(--border-default)] p-1 rounded-[8px] self-start sm:self-auto">
              {[
                { id: "all", label: t("common.all", "All") },
                { id: "credit", label: t("wallet.added", "Added") },
                { id: "debit", label: t("wallet.spent", "Spent") },
                { id: "refund", label: t("wallet.refund", "Refunds") },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition cursor-pointer ${
                    activeFilter === tab.id
                      ? "bg-[#142238] dark:bg-[#365671] text-white shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[#142238] dark:hover:text-[#f3f8f6]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-[#b3c8ca]/60 dark:divide-[#4e697f]">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 size={24} className="animate-spin text-[#142238] dark:text-[#91f2ce] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)] font-medium">{t("common.loading", "Loading ledger records…")}</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-12 h-12 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)] text-[#142238] dark:text-[#91f2ce] flex items-center justify-center mx-auto mb-3">
                  <Wallet size={20} />
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{t("wallet.noTransactions", "No transactions recorded")}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-xs mx-auto">
                  {t("wallet.addFundsPrompt", "Add funds to enjoy 1-tap booking or pay with cash on your next ride.")}
                </p>
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="mt-4 px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-white rounded-[8px] text-xs font-bold transition cursor-pointer"
                >
                  {t("wallet.topup", "Top Up")} ₹500
                </button>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isCredit = tx.type === "credit";
                const isRefund = tx.category === "ride_refund";

                return (
                  <div
                    key={tx._id}
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/60 dark:hover:bg-[#263d54]/60 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                          isRefund
                            ? "bg-[#faebe8] dark:bg-[#341814] text-[#E34222] dark:text-[#E06A50] border border-[#E34222]/30 dark:border-[#E06A50]/40"
                            : isCredit
                            ? "bg-[var(--surface-subtle)] text-[#142238] dark:text-[#91f2ce] border border-[var(--border-default)]"
                            : "bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-default)]"
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
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {tx.description}
                          </p>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-[4px] border ${
                              isRefund
                                ? "bg-[#faebe8] dark:bg-[#341814] text-[#E34222] dark:text-[#E06A50] border-[#E34222]/30 dark:border-[#E06A50]/40"
                                : isCredit
                                ? "bg-[var(--surface-subtle)] text-[#142238] dark:text-[#91f2ce] border-[var(--border-default)]"
                                : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border-default)]"
                            }`}
                          >
                            {tx.category.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
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
                        className={`text-sm sm:text-base font-bold font-mono ${
                          isCredit ? "text-[#142238] dark:text-[#91f2ce]" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {isCredit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">
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
                className="w-full max-w-sm bg-[var(--surface-raised)] rounded-[14px] p-6 shadow-2xl border border-[var(--border-default)]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--surface-subtle)] text-[#142238] dark:text-[#91f2ce] flex items-center justify-center font-bold">
                      <Wallet size={16} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">{t("wallet.topupModalTitle", "Add Money to Wallet")}</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium">UPI · Card · Netbanking</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowTopupModal(false);
                      setTopupError(null);
                    }}
                    className="w-7 h-7 rounded-[6px] bg-[var(--surface-raised)] border border-[var(--border-default)] hover:bg-[#e8f2ef] dark:hover:bg-[#2a425a] flex items-center justify-center text-[var(--text-primary)] transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {topupError && (
                  <div className="p-3 mb-3 bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 rounded-[8px] text-xs text-[#E34222] dark:text-[#E06A50] font-medium flex items-center gap-2">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{topupError}</span>
                  </div>
                )}

                {/* Amount Input */}
                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 block">
                    {t("wallet.selectAmount", "Enter Amount")}
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] border-2 border-[var(--border-default)] bg-white dark:bg-[#142238] focus-within:border-[#142238] dark:focus-within:border-[#365671] transition">
                    <span className="text-lg font-bold text-[var(--text-secondary)]">₹</span>
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="500"
                      className="w-full text-xl font-bold text-[var(--text-primary)] bg-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    {t("wallet.quickAmounts", "Quick Amounts")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCustomAmount(amt.toString())}
                        className={`py-2 rounded-[8px] text-xs font-bold border transition cursor-pointer ${
                          customAmount === amt.toString()
                            ? "bg-[#142238] text-white border-[#142238] dark:bg-[#365671] dark:border-[#365671] shadow-xs"
                            : "bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[#e8f2ef] dark:hover:bg-[#2a425a]"
                        }`}
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security Note */}
                <div className="p-3 bg-white/70 dark:bg-[#263d54]/70 rounded-[8px] border border-[var(--border-default)] mb-4 text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
                  <Zap size={14} className="text-[#142238] dark:text-[#91f2ce] flex-shrink-0" />
                  <span>{t("wallet.topupSecurityNote", "Money added is immediately available for 1-tap bookings & refunds.")}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTopupModal(false)}
                    className="flex-1 py-3 rounded-[8px] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] bg-[var(--surface-raised)] hover:bg-[#f3f8f6] dark:hover:bg-[#2a425a] transition cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={processingTopup || !customAmount}
                    onClick={handleInitiateTopup}
                    className="flex-1 py-3 rounded-[8px] bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {processingTopup ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> {t("checkout.processing", "Processing…")}
                      </>
                    ) : (
                      <>
                        <span>{t("wallet.rechargeNow", "Proceed to Pay")}</span>
                        <ArrowUpRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
