"use client";



import { PartnerPageTitle, partnerAction, partnerSecondaryAction } from "@/features/partner/components/PartnerWorkspace";
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
  Percent,
} from "lucide-react";
import Link from "next/link";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import { loadRazorpayScript } from "@/lib/loadRazorpay";

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

  /* Dues Repayment State */
  const [clearingDues, setClearingDues] = useState(false);
  const [duesMsg, setDuesMsg] = useState<string | null>(null);

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

  const handlePayPlatformDues = async (amountToPay?: number) => {
    try {
      setClearingDues(true);
      setDuesMsg(null);
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setDuesMsg("Failed to load payment gateway SDK. Please check your internet connection.");
        setClearingDues(false);
        return;
      }

      // Step 1: Create Order
      const orderRes = await fetch("/api/partner/wallet/settle-dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          amount: amountToPay || platformDues,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) {
        setDuesMsg(orderData.error || "Failed to initialize dues payment order");
        setClearingDues(false);
        return;
      }

      // Step 2: Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: "INR",
        name: "RideNow Partner",
        description: `Clear Platform Dues (₹${orderData.amountToPay})`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/partner/wallet/settle-dues", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "verify_payment",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: orderData.amountToPay,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setDuesMsg(`✓ Success: ${verifyData.message}`);
              fetchDriverWallet();
            } else {
              setDuesMsg(`Payment failed: ${verifyData.error}`);
            }
          } catch (err: any) {
            setDuesMsg("Error confirming dues payment: " + err.message);
          } finally {
            setClearingDues(false);
          }
        },
        modal: {
          ondismiss: () => {
            setClearingDues(false);
          },
        },
        theme: {
          color: "#059669",
        },
      };

      const paymentObj = new (window as any).Razorpay(options);
      paymentObj.open();
    } catch (err: any) {
      setDuesMsg("Payment initialization failed: " + err.message);
      setClearingDues(false);
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col justify-between">
      <div>
        <Nav />

        <main className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-12 sm:pb-16">
          <PartnerPageTitle
            label="Driver workspace"
            title="Wallet & earnings"
            description="Track ride earnings, platform dues and payouts to your bank."
            actions={
              <>
                <button type="button" onClick={fetchDriverWallet} className={partnerSecondaryAction}>Refresh</button>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={availableEarnings < 100 || !bankDetails}
                  className={partnerAction}
                >
                  Withdraw <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </>
            }
          />

          {/* SUCCESS NOTIFICATION */}
          {withdrawSuccess && (
            <div className="mb-6 p-4 rounded-[12px] bg-[#123D32] dark:bg-[#0D3027] text-white flex items-center justify-between border border-[#123D32] dark:border-[#1E3E34]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="text-sm font-bold">{withdrawSuccess}</span>
              </div>
              <button
                onClick={() => setWithdrawSuccess(null)}
                className="text-xs font-semibold px-2 py-1 bg-white/20 dark:bg-black/30 rounded-[6px] hover:bg-white/30 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* OVERVIEW CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr_1fr] gap-3 sm:gap-4 mb-8">
            {/* 1. AVAILABLE EARNINGS */}
            <div className="rounded-[14px] bg-[var(--surface-raised)] border border-[var(--border-default)] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    Available to Withdraw
                  </span>
                  <div className="w-8 h-8 rounded-[8px] bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858] flex items-center justify-center font-bold">
                    <IndianRupee size={16} />
                  </div>
                </div>
                <div className="text-4xl font-semibold tabular-nums text-[#123D32] dark:text-[#347858] tabular-nums tracking-tight">
                  ₹{availableEarnings.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Earnings ready to transfer to your bank.
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-[var(--border-default)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Min. payout: ₹100</span>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={availableEarnings < 100 || !bankDetails}
                  className="text-xs font-bold text-[#123D32] dark:text-[#347858] hover:text-[#0D3027] dark:hover:text-[#28664D] flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  Withdraw now <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* 2. PENDING EARNINGS */}
            <div className="rounded-[14px] bg-[var(--surface-raised)] border border-[var(--border-default)] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    Pending earnings
                  </span>
                  <div className="w-8 h-8 rounded-[8px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="text-4xl font-semibold tabular-nums text-[var(--text-primary)] tabular-nums tracking-tight">
                  ₹{pendingEarnings.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  From rides that haven’t settled yet.
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-[var(--border-default)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Ride completion</span>
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Auto-credit</span>
              </div>
            </div>

            {/* 3. PLATFORM DUES */}
            <div
              className={`rounded-[14px] border p-6 flex flex-col justify-between ${
                platformDues > 0
                  ? "border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20"
                  : "bg-[var(--surface-raised)] border-[var(--border-default)]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    Platform Dues
                  </span>
                  <div
                    className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-bold ${
                      platformDues > 0
                        ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                        : "bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858]"
                    }`}
                  >
                    <AlertCircle size={16} />
                  </div>
                </div>
                <div
                  className={`text-4xl font-semibold tabular-nums tabular-nums tracking-tight ${
                    platformDues > 0 ? "text-amber-800 dark:text-amber-400" : "text-[var(--text-primary)]"
                  }`}
                >
                  ₹{platformDues.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {platformDues > 0
                    ? "Commission owed from cash rides. Auto-settled from future online rides or clear instantly online."
                    : "No outstanding platform commission dues."}
                </p>

                {platformDues > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={clearingDues}
                      onClick={() => handlePayPlatformDues()}
                      className="w-full bg-[#E34222] dark:bg-[#E06A50] hover:bg-[#a0321e] dark:hover:bg-[#E34222] text-white font-bold text-xs py-2 px-3 rounded-[8px] flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    >
                      {clearingDues ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <IndianRupee size={13} />
                      )}
                      {clearingDues
                        ? "Connecting..."
                        : `Clear Dues (₹${platformDues.toLocaleString("en-IN")})`}
                    </button>
                    {duesMsg && (
                      <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200 mt-2 bg-amber-100/70 dark:bg-amber-950/40 p-2 rounded-[6px] leading-tight">
                        {duesMsg}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-5 mt-5 border-t border-[var(--border-default)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">
                  {platformDues > 0 ? "Auto-settling" : "Status"}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-[4px] ${
                    platformDues > 0
                      ? "text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40"
                      : "text-[#123D32] dark:text-[#347858] bg-[#E5EBDD] dark:bg-[#28664D]/20"
                  }`}
                >
                  {platformDues > 0 ? "Outstanding" : "All cleared"}
                </span>
              </div>
            </div>
          </div>

          {/* DRIVER EARNINGS SUMMARY STRIP (TODAY & THIS WEEK) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)] p-4 ">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] ">
                Today&apos;s Earnings
              </span>
              <div className="text-xl font-semibold tabular-nums text-[var(--text-primary)] mt-0.5">
                ₹{todayEarnings.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)] p-4 ">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] ">
                This Week
              </span>
              <div className="text-xl font-semibold tabular-nums text-[var(--text-primary)] mt-0.5">
                ₹{weekEarnings.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)] p-4 ">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] ">
                Total Withdrawn
              </span>
              <div className="text-xl font-semibold tabular-nums text-[#123D32] dark:text-[#347858] mt-0.5">
                ₹{metrics.totalWithdrawn.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)] p-4 ">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] ">
                Lifetime Earnings
              </span>
              <div className="text-xl font-semibold tabular-nums text-[var(--text-primary)] mt-0.5">
                ₹{metrics.totalEarnings.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* LINKED BANK ACCOUNT CARD */}
          <div className="rounded-[14px] bg-[var(--surface-raised)] border border-[var(--border-default)] p-6 mb-8 ">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-[8px] bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-sans font-bold text-[var(--text-primary)]">
                      Payout Destination
                    </h2>
                    {bankDetails?.status === "verified" ? (
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858] text-[10px] font-bold border border-[#123D32]/20 dark:border-[#28664D]/30">
                        Verified
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-[4px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                        Active
                      </span>
                    )}
                  </div>
                  {bankDetails ? (
                    <div className="mt-1 text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        <strong className="text-[var(--text-primary)]">Beneficiary:</strong>{" "}
                        {bankDetails.accountHolderName}
                      </span>
                      <span>
                        <strong className="text-[var(--text-primary)]">Account:</strong>{" "}
                        {bankDetails.maskedAccount}
                      </span>
                      <span>
                        <strong className="text-[var(--text-primary)]">IFSC:</strong>{" "}
                        {bankDetails.ifsc}
                      </span>
                      {bankDetails.upi && (
                        <span>
                          <strong className="text-[var(--text-primary)]">UPI:</strong>{" "}
                          {bankDetails.upi}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium">
                      No bank details configured. Complete your bank step in Onboarding to enable withdrawals.
                    </p>
                  )}
                </div>
              </div>

              <Link
                href="/partner/onboard/bank"
                className="px-3.5 py-2 rounded-[8px] border border-[var(--border-default)] bg-white dark:bg-[#10352C] hover:bg-[#FAF7F0] dark:hover:bg-[#143D32] text-xs font-bold text-[var(--text-primary)] transition self-start sm:self-center cursor-pointer"
              >
                {bankDetails ? "Update Bank" : "Add Bank Account"}
              </Link>
            </div>
          </div>

          {/* TRANSACTIONS SECTION */}
          <div className="rounded-[14px] bg-[var(--surface-raised)] border border-[var(--border-default)] overflow-hidden ">
            {/* Header & Filter Tabs */}
            <div className="p-5 border-b border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-sans font-bold text-[var(--text-primary)]">
                  Transaction History
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Direct ledger of ride credits, commission deductions, and payouts.
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] overflow-x-auto max-w-full scrollbar-none shrink-0">
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
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                      activeFilter === tab.id
                        ? "bg-[#123D32] dark:bg-[#28664D] text-white "
                        : "text-[var(--text-secondary)] hover:text-[#10251C] dark:hover:text-[#F3F1E8]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List / Table */}
            {loading ? (
              <div className="p-12 text-center text-[var(--text-secondary)]">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#123D32] dark:text-[#347858]" />
                <span className="text-xs font-semibold">Loading ledger…</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-secondary)]">
                <Wallet size={32} className="mx-auto mb-2 opacity-50 text-[#123D32] dark:text-[#347858]" />
                <p className="text-sm font-bold text-[var(--text-primary)]">No transactions recorded</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Complete rides to see your earnings and settlements here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#DED7CA]/50 dark:divide-[#1E3E34]">
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
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#F7F1E5] dark:hover:bg-[#101713] transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 font-bold ${
                            isEarning
                              ? "bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858]"
                              : isWithdrawal
                              ? "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300"
                              : isDues
                              ? "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300"
                              : isCash
                              ? "bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                              : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
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
                            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
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
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
                                isEarning
                                  ? "bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858]"
                                  : isWithdrawal
                                  ? "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300"
                                  : isDues
                                  ? "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300"
                                  : isCash
                                  ? "bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                                  : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                              }`}
                            >
                              {tx.transactionType || tx.category}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                            {tx.description}
                          </p>
                          <span className="text-[11px] text-[#696B64]/70 dark:text-[#B9C8BF]/70">
                            {new Date(tx.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-sm sm:text-base font-semibold tabular-nums ${
                            isEarning || isCash ? "text-[#123D32] dark:text-[#347858]" : "text-[var(--text-primary)]"
                          }`}
                        >
                          {isEarning || isCash ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                        </div>
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] capitalize">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ">
          <div role="dialog" aria-labelledby="driver-withdraw-title" className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 sm:p-6">
            <h3 id="driver-withdraw-title" className="text-lg font-semibold text-[var(--text-primary)]">
              Withdraw Available Earnings
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Funds will be disbursed directly to your registered bank account.
            </p>

            {withdrawError && (
              <div className="mt-3 p-3 rounded-[8px] bg-[#E34222]/10 dark:bg-red-950/30 text-[#E34222] dark:text-[#E06A50] text-xs font-semibold flex items-center gap-2 border border-[#E34222] dark:border-[#E34222]/40">
                <AlertCircle size={15} />
                <span>{withdrawError}</span>
              </div>
            )}

            {/* Destination Preview */}
            {bankDetails && (
              <div className="mt-4 p-3.5 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)] text-xs space-y-1 ">
                <div className="text-[10px] font-bold text-[var(--text-secondary)]">
                  Payout To
                </div>
                <div className="font-bold text-[var(--text-primary)]">
                  {bankDetails.accountHolderName}
                </div>
                <div className="text-[var(--text-secondary)]">
                  Account: {bankDetails.maskedAccount} (IFSC: {bankDetails.ifsc})
                </div>
              </div>
            )}

            <form onSubmit={handleWithdraw} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Withdrawal Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">
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
                    className="w-full pl-8 pr-4 py-2.5 rounded-[8px] border border-[var(--border-default)] font-bold text-[var(--text-primary)] text-sm focus:border-[#123D32] dark:focus:border-[#28664D] outline-none bg-[var(--surface-raised)] tabular-nums"
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
                    className="flex-1 py-1.5 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-xs font-bold text-[var(--text-primary)] hover:bg-[#FAF7F0] dark:hover:bg-[#10352C] disabled:opacity-40 cursor-pointer "
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(availableEarnings))}
                  disabled={availableEarnings < 100}
                  className="flex-1 py-1.5 rounded-[6px] bg-[#E5EBDD] dark:bg-[#28664D]/20 text-xs font-bold text-[#123D32] dark:text-[#347858] hover:bg-[#123D32] dark:hover:bg-[#28664D] hover:text-white transition disabled:opacity-40 cursor-pointer"
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
                  className="flex-1 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-white dark:bg-[#10352C] text-xs font-bold text-[var(--text-primary)] hover:bg-[#FAF7F0] dark:hover:bg-[#143D32] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingWithdraw || !withdrawAmount}
                  className="flex-1 py-2.5 rounded-[8px] bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer "
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
