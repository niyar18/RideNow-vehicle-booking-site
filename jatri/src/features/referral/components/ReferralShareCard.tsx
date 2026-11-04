"use client";

import React, { useState, useEffect } from "react";
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ReferralDashboardData {
  referralCode: string;
  shareUrl: string;
  monthlyAllowance: {
    monthKey: string;
    completedThisMonth: number;
    maxMonthly: number;
    remainingThisMonth: number;
  };
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    totalEarnings: number;
    rewardPerReferral: number;
    refereeDiscount: number;
    minFareRequired: number;
  };
  myReferralStatus?: {
    status: string;
    discountUsed: boolean;
    discountAmount: number;
    expiresAt: string;
  } | null;
  referralsList?: Array<{
    id: string;
    refereeName: string;
    status: string;
    discountUsed: boolean;
    rewardedAt?: string;
    expiresAt: string;
    createdAt: string;
  }>;
}

export default function ReferralShareCard() {
  const [data, setData] = useState<ReferralDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchReferralData = async () => {
    try {
      const res = await fetch("/api/user/referral");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.error("Failed to load referral data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  const handleCopy = async () => {
    if (!data?.referralCode) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(data.referralCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = data.referralCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    if (!data) return;
    const text = encodeURIComponent(
      `Hey! Use my Jaatri invite code *${data.referralCode}* to get ₹${data.stats.refereeDiscount} off your first ride (min fare ₹${data.stats.minFareRequired}). Book toto, autos, bikes & cabs easily here: ${data.shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleClaimCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setClaiming(true);
    setClaimMessage(null);
    try {
      const res = await fetch("/api/user/referral/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: inputCode.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setClaimMessage({ type: "success", text: result.message });
        setInputCode("");
        fetchReferralData();
      } else {
        setClaimMessage({
          type: "error",
          text: result.error || "Failed to apply referral code.",
        });
      }
    } catch {
      setClaimMessage({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-[#FAF7F0] dark:bg-[#10251C] border border-[#E5DEC9] dark:border-[#1E3A2F] rounded-[14px] p-6 shadow-sm flex items-center justify-center min-h-[220px]">
        <div className="flex flex-col items-center gap-2 text-[#123D32] dark:text-[#52B788]">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-xs font-medium">Loading Referral Rewards...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const monthlyCompleted = data.monthlyAllowance.completedThisMonth;
  const maxMonthly = data.monthlyAllowance.maxMonthly;
  const progressPercent = Math.min(100, Math.round((monthlyCompleted / maxMonthly) * 100));

  return (
    <div className="w-full bg-[#FAF7F0] dark:bg-[#10251C] border border-[#E5DEC9] dark:border-[#1E3A2F] rounded-[14px] p-5 sm:p-6 shadow-sm transition-all space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[10px] bg-[#046A38]/10 dark:bg-[#046A38]/25 text-[#046A38] dark:text-[#52B788] flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base sm:text-lg text-[#10251C] dark:text-[#F7F1E5]">
                Refer &amp; Earn ₹{data.stats.rewardPerReferral}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-bold bg-[#046A38] text-white">
                <Sparkles className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-xs text-[#5C6F64] dark:text-[#8FA89B] mt-0.5">
              Invite friends: they get ₹{data.stats.refereeDiscount} off their 1st ride, you earn ₹{data.stats.rewardPerReferral} wallet credit.
            </p>
          </div>
        </div>

        {/* Lifetime Earnings Badge */}
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#5C6F64] dark:text-[#8FA89B]">
            Total Earned
          </span>
          <span className="text-lg font-bold text-[#046A38] dark:text-[#52B788]">
            ₹{data.stats.totalEarnings}
          </span>
        </div>
      </div>

      {/* Share Box & WhatsApp CTA */}
      <div className="bg-[#F2ECE1] dark:bg-[#173026] border border-[#E2D8C3] dark:border-[#204537] rounded-[12px] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5C6F64] dark:text-[#8FA89B]">
            Your Invite Code
          </span>
          <span className="text-xs font-medium text-[#046A38] dark:text-[#52B788]">
            {data.monthlyAllowance.remainingThisMonth} bonus slots left this month
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center justify-between flex-1 bg-white dark:bg-[#0B1A14] border border-[#D5CAAF] dark:border-[#274D3D] rounded-[10px] px-3.5 py-2.5">
            <span className="font-mono font-bold text-lg tracking-widest text-[#10251C] dark:text-[#F7F1E5]">
              {data.referralCode}
            </span>
            <button
              onClick={handleCopy}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[#E7E0CE] dark:bg-[#1B352A] hover:bg-[#DDD5BF] dark:hover:bg-[#234335] text-[#10251C] dark:text-[#F7F1E5] transition-colors min-h-[38px]"
              aria-label="Copy Referral Code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#046A38] dark:text-[#52B788]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleWhatsAppShare}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold bg-[#25D366] hover:bg-[#20BE5B] text-white shadow-sm transition-all min-h-[44px]"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Monthly Cap Progress (Max 5/month) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-[#10251C] dark:text-[#F7F1E5]">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#5C6F64] dark:text-[#8FA89B]" />
            Monthly Referral Cap: {monthlyCompleted} of {maxMonthly} Completed
          </span>
          <span className="font-bold text-[#046A38] dark:text-[#52B788]">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-[#E5DEC9] dark:bg-[#173026] h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-[#046A38] dark:bg-[#52B788] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-[#5C6F64] dark:text-[#8FA89B]">
          Earn up to ₹{maxMonthly * data.stats.rewardPerReferral} every month. Counter resets at the start of each calendar month (IST).
        </p>
      </div>

      {/* Claim a Friend's Code Form (if not yet referred) */}
      {!data.myReferralStatus && (
        <form onSubmit={handleClaimCode} className="pt-2 border-t border-[#E5DEC9] dark:border-[#1E3A2F] space-y-2.5">
          <label
            htmlFor="friend-referral-code"
            className="block text-xs font-semibold text-[#10251C] dark:text-[#F7F1E5]"
          >
            Have a friend&apos;s invite code?
          </label>
          <div className="flex gap-2">
            <input
              id="friend-referral-code"
              type="text"
              placeholder="e.g. RN8K2M"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={12}
              className="flex-1 bg-white dark:bg-[#0B1A14] border border-[#D5CAAF] dark:border-[#274D3D] rounded-[10px] px-3.5 py-2 text-sm uppercase font-mono tracking-wider text-[#10251C] dark:text-[#F7F1E5] placeholder:normal-case placeholder:font-sans placeholder:text-[#8F8D82] focus:outline-none focus:ring-2 focus:ring-[#046A38] min-h-[44px]"
            />
            <button
              type="submit"
              disabled={claiming || !inputCode.trim()}
              className="px-4 py-2 rounded-[10px] text-sm font-semibold bg-[#123D32] hover:bg-[#0D3027] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 min-h-[44px] flex items-center justify-center gap-1.5"
            >
              {claiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Apply</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {claimMessage && (
            <div
              className={`p-3 rounded-[8px] text-xs flex items-center gap-2 ${
                claimMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}
            >
              {claimMessage.type === "success" ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{claimMessage.text}</span>
            </div>
          )}
        </form>
      )}

      {/* My Active First-Ride Benefit Status */}
      {data.myReferralStatus && (
        <div className="bg-[#FAF7F0] dark:bg-[#0B1A14] border border-[#046A38]/30 rounded-[10px] p-3 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#046A38] dark:text-[#52B788]">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {data.myReferralStatus.discountUsed
                ? "First-ride referral discount already enjoyed!"
                : `₹${data.myReferralStatus.discountAmount} First-Ride Discount active (min fare ₹${data.stats.minFareRequired})`}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6F64] dark:text-[#8FA89B]">
            {data.myReferralStatus.status}
          </span>
        </div>
      )}

      {/* 3 Simple Steps */}
      <div className="pt-2 border-t border-[#E5DEC9] dark:border-[#1E3A2F] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-[#046A38] text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
            1
          </span>
          <div>
            <p className="font-semibold text-[#10251C] dark:text-[#F7F1E5]">Share code</p>
            <p className="text-[11px] text-[#5C6F64] dark:text-[#8FA89B]">Send your invite code or WhatsApp link to friends.</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-[#046A38] text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
            2
          </span>
          <div>
            <p className="font-semibold text-[#10251C] dark:text-[#F7F1E5]">They save ₹30</p>
            <p className="text-[11px] text-[#5C6F64] dark:text-[#8FA89B]">Friend gets ₹30 off their 1st ride (min fare ₹100).</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-[#046A38] text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
            3
          </span>
          <div>
            <p className="font-semibold text-[#10251C] dark:text-[#F7F1E5]">You get ₹50</p>
            <p className="text-[11px] text-[#5C6F64] dark:text-[#8FA89B]">Credited to your wallet when trip is completed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
