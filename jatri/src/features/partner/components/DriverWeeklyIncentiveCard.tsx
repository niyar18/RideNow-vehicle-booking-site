"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Target, Sparkles, TrendingUp, CheckCircle2, ChevronRight, IndianRupee } from "lucide-react";
import axios from "axios";

interface IncentiveTier {
  targetRides: number;
  bonusAmount: number;
}

interface IncentiveData {
  weekKey: string;
  monthKey: string;
  completedRides: number;
  currentBonus: number;
  tierAchieved: number;
  nextTarget: number | null;
  ridesToNextTarget: number;
  monthlyEarningsThisMonth: number;
  monthlyCapRemaining: number;
  tiers: IncentiveTier[];
  cyclePeriod: {
    start: string;
    end: string;
  };
}

export default function DriverWeeklyIncentiveCard() {
  const [data, setData] = useState<IncentiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/partner/incentives")
      .then((res) => {
        if (res.data?.success && res.data?.incentives) {
          setData(res.data.incentives);
        }
      })
      .catch((err) => {
        console.warn("Incentive card fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--surface-raised)] rounded-[14px] p-5 border border-[var(--border-default)] motion-safe:animate-pulse">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-3" />
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2" />
      </div>
    );
  }

  if (!data) return null;

  const maxTierRides = data.tiers[data.tiers.length - 1]?.targetRides || 50;
  const progressPercent = Math.min(100, Math.round((data.completedRides / maxTierRides) * 100));

  return (
    <div className="bg-[var(--surface-raised)] rounded-[14px] p-4 sm:p-5 border border-[var(--border-default)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[8px] bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-[var(--accent-ink)]">
            <Trophy size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5 leading-tight">
              Weekly Performance Goals
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">
              Monday – Sunday (IST) · Highest Tier Bonus
            </p>
          </div>
        </div>

        {data.currentBonus > 0 && (
          <div className="bg-emerald-100 dark:bg-emerald-950 text-[var(--accent-ink)] border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-2xs">
            <Sparkles size={12} />
            <span>₹{data.currentBonus} Earned</span>
          </div>
        )}
      </div>

      {/* Progress Bar & Next Target */}
      <div className="bg-white dark:bg-[#243751] rounded-[10px] p-3.5 border border-[var(--border-default)] flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
            <Target size={13} className="text-[var(--accent-ink)]" />
            <span>{data.completedRides} Completed Rides</span>
          </span>
          {data.nextTarget ? (
            <span className="text-[var(--accent-ink)] font-semibold text-[11px]">
              {data.ridesToNextTarget} more to reach {data.nextTarget} rides
            </span>
          ) : (
            <span className="text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
              Top Target Reached! 🚀
            </span>
          )}
        </div>

        {/* Multi-tier Visual Bar */}
        <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-[var(--midnight)] dark:bg-[#263b56] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {data.tiers.map((tier) => {
            const isUnlocked = data.completedRides >= tier.targetRides;
            const isCurrent = data.tierAchieved === tier.targetRides;

            return (
              <div
                key={tier.targetRides}
                className={`p-2.5 rounded-[8px] border text-center transition-all ${
                  isCurrent
                    ? "border-[var(--midnight)] bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-[var(--midnight)]"
                    : isUnlocked
                    ? "border-emerald-200 dark:border-emerald-900 bg-[var(--surface-raised)]"
                    : "border-zinc-200 dark:border-zinc-800 bg-[var(--ice)]/60 dark:bg-[#0d192b]/40 opacity-75"
                }`}
              >
                <div className="flex items-center justify-center gap-0.5 text-xs font-semibold text-[var(--text-primary)]">
                  {isUnlocked && <CheckCircle2 size={12} className="text-[var(--accent-ink)]" />}
                  <span>{tier.targetRides} Rides</span>
                </div>
                <div className="text-sm font-extrabold text-[var(--accent-ink)] mt-0.5">
                  ₹{tier.bonusAmount}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Terms & Monthly Budget Safeguard */}
      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] px-0.5">
        <span>Monthly limit: ₹1,000 max (₹{data.monthlyCapRemaining} remaining)</span>
        <span>Reconciled weekly</span>
      </div>
    </div>
  );
}
