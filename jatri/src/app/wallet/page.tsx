"use client";



import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import useGetMe from "@/shared/hooks/useGetMe";
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
  Sparkles,
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
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#061A16] text-[#10251C] dark:text-[#F7F5ED] flex flex-col font-sans transition-colors duration-200">
      <Nav />

      {/* Subtle Dot Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #DED7CA 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.6,
        }}
      />

      <main className="relative flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-16 z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
              <div className="h-px w-6 bg-[#123D32] dark:bg-[#28664D]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#123D32] dark:text-[#347858]">
                {t("wallet.paymentAndCredits", "Payment & Credits")}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
              {t("wallet.rideNowCash", "Jaatri Cash")}
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] border border-[#DED7CA] dark:border-[#24483D]">
                <Sparkles size={11} /> {t("wallet.oneTapCheckout", "1-Tap Checkout")}
              </span>
            </h1>
            <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm mt-1 font-medium">
              {t("wallet.zeroPaymentFailure", "Zero payment failure, instant ride dispatch, and immediate refunds.")}
            </p>
          </div>

          <button
            onClick={() => setShowTopupModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> {t("wallet.addMoney", "Add Money")}
          </button>
        </div>

        {/* Success Alert Banner */}
        <AnimatePresence>
          {topupSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-[12px] bg-[#046A38] text-white flex items-center justify-between shadow-xs"
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
                <p className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F7F5ED]">
                  {t("wallet.unpaidDues", "Unpaid Cancellation Dues")}: ₹{outstandingAmount}
                </p>
                <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium">
                  {t("wallet.unpaidDuesDesc", "This outstanding balance will be automatically recovered on your next ride payment or wallet top-up.")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTopupModal(true)}
              className="shrink-0 bg-[#E34222] hover:bg-[#c93517] text-white text-xs font-bold px-4 py-2 rounded-[8px] shadow-xs transition cursor-pointer"
            >
              {t("wallet.clearDues", "Clear Dues")}
            </button>
          </div>
        )}

        {/* HERO WALLET CARD & QUICK STATS */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Main Card */}
          <div className="md:col-span-2 relative overflow-hidden rounded-[14px] bg-linear-to-br from-[#123D32] via-[#0D3027] to-[#10251C] text-[#F7F1E5] p-5 sm:p-9 shadow-lg border border-[#123D32]/50 dark:border-[#28664D]/50 flex flex-col justify-between min-h-[190px] sm:min-h-[220px]">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E5EBDD]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#E34222]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E5EBDD]/80 mb-1">
                  {t("wallet.balance", "Available Balance")}
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl sm:text-5xl font-bold font-serif text-[#F7F1E5] tracking-tight">
                    ₹{balance.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-bold text-[#E5EBDD]/80">INR</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[10px] bg-white/10 border border-white/10 flex items-center justify-center text-[#E5EBDD]">
                <Wallet size={20} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="relative z-10 pt-4 sm:pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-[11px] sm:text-xs text-[#E5EBDD]/80">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-[#E5EBDD] shrink-0" />
                <span>{t("wallet.protectedEncryption", "Payments processed securely through our payment provider")}</span>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                className="text-white hover:text-[#E5EBDD] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {t("wallet.quickRecharge", "Quick Recharge")} <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] p-5 border border-[#DED7CA] dark:border-[#24483D] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-[8px] bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B9C8BF]">{t("wallet.totalAdded", "Total Added")}</p>
                <p className="text-xl font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] mt-0.5">
                  ₹{summary.totalAdded.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] p-5 border border-[#DED7CA] dark:border-[#24483D] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-[8px] bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] text-[#10251C] dark:text-[#F7F5ED] flex items-center justify-center flex-shrink-0">
                <ArrowUpRight size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B9C8BF]">{t("wallet.totalSpent", "Total Spent")}</p>
                <p className="text-xl font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] mt-0.5">
                  ₹{summary.totalSpent.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] p-4 border border-[#DED7CA] dark:border-[#24483D] shadow-xs flex items-center justify-between text-xs font-bold text-[#696B64] dark:text-[#B9C8BF]">
              <span className="flex items-center gap-1.5 text-[#696B64] dark:text-[#B9C8BF] font-medium">
                <Clock size={14} /> {t("wallet.totalTransactions", "Total Transactions")}
              </span>
              <span className="font-mono text-[#10251C] dark:text-[#F7F5ED] bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] px-2.5 py-1 rounded-[6px]">
                {summary.transactionCount}
              </span>
            </div>
          </div>
        </div>

        {/* PASSBOOK / LEDGER SECTION */}
        <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[14px] border border-[#DED7CA] dark:border-[#24483D] shadow-xs overflow-hidden">
          {/* Header & Filter Tabs */}
          <div className="p-6 border-b border-[#DED7CA] dark:border-[#24483D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-[#10251C] dark:text-[#F7F5ED]">{t("wallet.transactions", "Passbook & History")}</h2>
              <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mt-0.5 font-medium">
                {t("wallet.ledgerEncrypted", "Every transaction is encrypted and ledger verified.")}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-white/80 dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] p-1 rounded-[8px] self-start sm:self-auto">
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
                      ? "bg-[#123D32] dark:bg-[#28664D] text-white shadow-xs"
                      : "text-[#696B64] dark:text-[#B9C8BF] hover:text-[#10251C] dark:hover:text-[#F3F1E8]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-[#DED7CA]/60 dark:divide-[#24483D]">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 size={24} className="animate-spin text-[#123D32] dark:text-[#A3E635] mx-auto mb-2" />
                <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] font-medium">{t("common.loading", "Loading ledger records…")}</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-12 h-12 rounded-[10px] bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] text-[#123D32] dark:text-[#A3E635] flex items-center justify-center mx-auto mb-3">
                  <Wallet size={20} />
                </div>
                <p className="text-sm font-bold text-[#10251C] dark:text-[#F7F5ED]">{t("wallet.noTransactions", "No transactions recorded")}</p>
                <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mt-0.5 max-w-xs mx-auto">
                  {t("wallet.addFundsPrompt", "Add funds to enjoy 1-tap booking or pay with cash on your next ride.")}
                </p>
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="mt-4 px-4 py-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white rounded-[8px] text-xs font-bold transition shadow-xs cursor-pointer"
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
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/60 dark:hover:bg-[#10352C]/60 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                          isRefund
                            ? "bg-[#faebe8] dark:bg-[#341814] text-[#E34222] dark:text-[#E06A50] border border-[#E34222]/30 dark:border-[#E06A50]/40"
                            : isCredit
                            ? "bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] border border-[#DED7CA] dark:border-[#24483D]"
                            : "bg-white dark:bg-[#10352C] text-[#10251C] dark:text-[#F7F5ED] border border-[#DED7CA] dark:border-[#24483D]"
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
                          <p className="text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] truncate">
                            {tx.description}
                          </p>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-[4px] border ${
                              isRefund
                                ? "bg-[#faebe8] dark:bg-[#341814] text-[#E34222] dark:text-[#E06A50] border-[#E34222]/30 dark:border-[#E06A50]/40"
                                : isCredit
                                ? "bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] border-[#DED7CA] dark:border-[#24483D]"
                                : "bg-white dark:bg-[#10352C] text-[#696B64] dark:text-[#B9C8BF] border-[#DED7CA] dark:border-[#24483D]"
                            }`}
                          >
                            {tx.category.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] mt-0.5 font-medium">
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
                          isCredit ? "text-[#123D32] dark:text-[#A3E635]" : "text-[#10251C] dark:text-[#F7F5ED]"
                        }`}
                      >
                        {isCredit ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-[#696B64] dark:text-[#B9C8BF] font-medium">
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
                className="w-full max-w-sm bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[14px] p-6 shadow-2xl border border-[#DED7CA] dark:border-[#24483D]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[8px] bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] flex items-center justify-center font-bold">
                      <Wallet size={16} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-serif text-[#10251C] dark:text-[#F7F5ED]">{t("wallet.topupModalTitle", "Add Money to Wallet")}</h3>
                      <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium">UPI · Card · Netbanking</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowTopupModal(false);
                      setTopupError(null);
                    }}
                    className="w-7 h-7 rounded-[6px] bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] hover:bg-[#F7F1E5] dark:hover:bg-[#143D32] flex items-center justify-center text-[#10251C] dark:text-[#F7F5ED] transition cursor-pointer"
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B9C8BF] mb-1.5 block">
                    {t("wallet.selectAmount", "Enter Amount")}
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] border-2 border-[#DED7CA] dark:border-[#24483D] bg-white dark:bg-[#061A16] focus-within:border-[#123D32] dark:focus-within:border-[#28664D] transition">
                    <span className="text-lg font-bold text-[#696B64] dark:text-[#B9C8BF]">₹</span>
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="500"
                      className="w-full text-xl font-bold text-[#10251C] dark:text-[#F7F5ED] bg-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B9C8BF] mb-2">
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
                            ? "bg-[#123D32] text-white border-[#123D32] dark:bg-[#28664D] dark:border-[#28664D] shadow-xs"
                            : "bg-white dark:bg-[#10352C] text-[#10251C] dark:text-[#F7F5ED] border-[#DED7CA] dark:border-[#24483D] hover:bg-[#F7F1E5] dark:hover:bg-[#143D32]"
                        }`}
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security Note */}
                <div className="p-3 bg-white/70 dark:bg-[#10352C]/70 rounded-[8px] border border-[#DED7CA] dark:border-[#24483D] mb-4 text-[11px] text-[#696B64] dark:text-[#B9C8BF] flex items-center gap-2">
                  <Zap size={14} className="text-[#123D32] dark:text-[#A3E635] flex-shrink-0" />
                  <span>{t("wallet.topupSecurityNote", "Money added is immediately available for 1-tap bookings & refunds.")}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTopupModal(false)}
                    className="flex-1 py-3 rounded-[8px] border border-[#DED7CA] dark:border-[#24483D] text-xs font-bold text-[#10251C] dark:text-[#F7F5ED] bg-white dark:bg-[#10352C] hover:bg-[#FAF7F0] dark:hover:bg-[#143D32] transition cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={processingTopup || !customAmount}
                    onClick={handleInitiateTopup}
                    className="flex-1 py-3 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
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
      </main>

      <Footer />
    </div>
  );
}
