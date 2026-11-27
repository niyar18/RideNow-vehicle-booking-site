"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Sparkles, Shield, Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { DriverPassengerPolicy } from "@/lib/safetyMatching";

export default function DriverPassengerPreferenceCard() {
  const [policy, setPolicy] = useState<DriverPassengerPolicy>("all_eligible");
  const [initialPolicy, setInitialPolicy] = useState<DriverPassengerPolicy>("all_eligible");
  const [canActivateWomenOnly, setCanActivateWomenOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function fetchPreferences() {
      try {
        setLoading(true);
        const res = await axios.get("/api/partner/preferences/safety");
        if (isSubscribed && res.data?.success) {
          setPolicy(res.data.driverPassengerPolicy || "all_eligible");
          setInitialPolicy(res.data.driverPassengerPolicy || "all_eligible");
          setCanActivateWomenOnly(Boolean(res.data.canActivateWomenOnly));
        }
      } catch (err: any) {
        console.warn("Could not load driver safety preferences:", err);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    fetchPreferences();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await axios.put("/api/partner/preferences/safety", {
        driverPassengerPolicy: policy,
      });
      if (res.data?.success) {
        setInitialPolicy(policy);
        setMessage({
          type: "success",
          text: res.data.message || "Passenger preferences updated successfully.",
        });
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || "Failed to update preference. Please try again.";
      setMessage({ type: "error", text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 rounded-[12px] bg-[var(--surface-raised)] border border-[var(--border-default)] flex items-center justify-center min-h-[100px]">
        <Loader2 size={20} className="animate-spin text-[var(--accent-ink)]" />
      </div>
    );
  }

  const hasChanges = policy !== initialPolicy;

  return (
    <div className="p-5 rounded-[12px] bg-[var(--surface-raised)] border border-[var(--border-default)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Shield size={18} className="text-[var(--accent-ink)]" />
            Passenger Preferences
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Choose which passenger requests you want to receive.
          </p>
        </div>
        {canActivateWomenOnly && (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[var(--accent-ink)] border border-emerald-300 dark:border-emerald-800">
            <Sparkles size={11} /> Verified Woman Driver
          </span>
        )}
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Option 1: All eligible passengers */}
        <button
          type="button"
          onClick={() => setPolicy("all_eligible")}
          className={`flex items-start gap-3 p-4 rounded-[10px] border text-left transition-all min-h-[64px] touch-manipulation cursor-pointer ${
            policy === "all_eligible"
              ? "border-[var(--midnight)] bg-[var(--ice)] dark:bg-[var(--midnight)]/30 ring-1 ring-[var(--midnight)]"
              : "border-zinc-200 dark:border-zinc-800 bg-[var(--surface-raised)] hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-[var(--midnight)]">
            {policy === "all_eligible" && <div className="w-2 h-2 rounded-full bg-[var(--midnight)]" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Users size={15} className="text-zinc-500" />
              All eligible passengers
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
              Receive all ride requests that match your vehicle type and service area.
            </span>
          </div>
        </button>

        {/* Option 2: Women passengers only */}
        <button
          type="button"
          disabled={!canActivateWomenOnly}
          onClick={() => canActivateWomenOnly && setPolicy("women_only")}
          className={`flex items-start gap-3 p-4 rounded-[10px] border text-left transition-all min-h-[64px] touch-manipulation ${
            !canActivateWomenOnly
              ? "opacity-60 cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
              : policy === "women_only"
              ? "border-[var(--midnight)] bg-[var(--ice)] dark:bg-[var(--midnight)]/30 ring-1 ring-[var(--midnight)] cursor-pointer"
              : "border-zinc-200 dark:border-zinc-800 bg-[var(--surface-raised)] hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
          }`}
        >
          <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-[var(--midnight)]">
            {policy === "women_only" && <div className="w-2 h-2 rounded-full bg-[var(--midnight)]" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles size={15} className="text-emerald-600 dark:text-emerald-400" />
              Women passengers only
              {!canActivateWomenOnly && <Lock size={12} className="text-zinc-400 ml-1" />}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
              {canActivateWomenOnly
                ? "Receive requests only from passengers eligible for women-only matching."
                : "Available to approved woman drivers. Complete verification to activate."}
            </span>
          </div>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-3 rounded-[8px] text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[var(--midnight)] hover:bg-[#243751] text-white text-xs font-semibold transition-colors min-h-[44px] touch-manipulation cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Preference</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
