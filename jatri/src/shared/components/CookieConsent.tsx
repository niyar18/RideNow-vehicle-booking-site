"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ChevronDown, ChevronUp, Check, X, SlidersHorizontal, Lock } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "ridenow_cookie_consent_v1";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Show after small delay so initial page paint is uninterrupted
        const timer = setTimeout(() => {
          setMounted(true);
          setVisible(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage disabled or private browsing fallback
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage error
    }
    setVisible(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    });
  };

  const handleRejectNonEssential = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    });
  };

  const handleSaveCustom = () => {
    savePreferences({
      necessary: true,
      analytics,
      marketing,
      timestamp: Date.now(),
    });
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-[9999] isolate"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent banner"
        >
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[12px] shadow-lg p-4 sm:p-5 text-[var(--text-primary)] flex flex-col gap-3.5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] bg-[#142238] dark:bg-[#365671] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Cookie size={18} className="text-[#D7AC62]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Cookie Preferences</h3>
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-[#ddede8] dark:bg-[#1D3428] border border-[#cdd6c3] dark:border-[#4e697f] text-[9px] font-bold uppercase text-[#142238] dark:text-[#A3E635]">
                      Privacy
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4d6374] dark:text-[#b3cbd1] font-medium">Bharat Mobility & Data Choice</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="w-7 h-7 rounded-[8px] text-[#4d6374] dark:text-[#b3cbd1] hover:text-[#142238] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                aria-label="Dismiss cookie notice with essential cookies only"
              >
                <X size={15} />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-[#4d6374] dark:text-[#b3cbd1] leading-relaxed font-normal">
              RideNow uses cookies and secure local storage to remember your pickup points, calculate verified route fares, maintain session safety, and optimize dispatch times.
            </p>

            {/* Granular Preferences Accordion */}
            <AnimatePresence>
              {showPreferences && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2.5 pt-2 border-t border-[#b3c8ca]/60 dark:border-[#4e697f] overflow-hidden"
                >
                  {/* Necessary Category */}
                  <div className="p-2.5 bg-[var(--surface-raised)] rounded-[10px] border border-[#b3c8ca]/70 dark:border-[#4e697f] flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Lock size={12} className="text-[#142238] dark:text-[#A3E635]" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">Strictly Necessary</span>
                      </div>
                      <p className="text-[10px] text-[#4d6374] dark:text-[#b3cbd1] mt-0.5 leading-snug">
                        Essential for booking checkout, GPS coordinate tracking, authentication, and secure payment processing.
                      </p>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-[#ddede8] dark:bg-[#1D3428] text-[#142238] dark:text-[#A3E635] px-2 py-0.5 rounded-[4px] flex-shrink-0">
                      Always Active
                    </span>
                  </div>

                  {/* Analytics Category */}
                  <div className="p-2.5 bg-[var(--surface-raised)] rounded-[10px] border border-[#b3c8ca]/70 dark:border-[#4e697f] flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Performance & Telemetry</span>
                      <p className="text-[10px] text-[#4d6374] dark:text-[#b3cbd1] mt-0.5 leading-snug">
                        Helps measure map route rendering speed, error logs, and driver dispatch latency to improve ride quality.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnalytics(!analytics)}
                      className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
                        analytics ? "bg-[#142238] dark:bg-[#365671] justify-end" : "bg-[#b3c8ca] dark:bg-[#435e76] justify-start"
                      }`}
                      role="switch"
                      aria-checked={analytics}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Personalization Category */}
                  <div className="p-2.5 bg-[var(--surface-raised)] rounded-[10px] border border-[#b3c8ca]/70 dark:border-[#4e697f] flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Personalization & Spots</span>
                      <p className="text-[10px] text-[#4d6374] dark:text-[#b3cbd1] mt-0.5 leading-snug">
                        Saves favorite places, recent pickup history, and language preferences across sessions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMarketing(!marketing)}
                      className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
                        marketing ? "bg-[#142238] dark:bg-[#365671] justify-end" : "bg-[#b3c8ca] dark:bg-[#435e76] justify-start"
                      }`}
                      role="switch"
                      aria-checked={marketing}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle Customize */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setShowPreferences(!showPreferences)}
                className="inline-flex items-center gap-1 font-bold text-[#4d6374] dark:text-[#b3cbd1] hover:text-[#142238] dark:hover:text-[#F3F1E8] transition cursor-pointer"
              >
                <SlidersHorizontal size={12} />
                <span>{showPreferences ? "Hide Options" : "Customize Settings"}</span>
                {showPreferences ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <Link
                href="/privacy"
                className="text-[#4d6374] dark:text-[#b3cbd1] hover:text-[#142238] dark:hover:text-[#F3F1E8] underline transition"
              >
                Privacy Policy
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {showPreferences ? (
                <>
                  <button
                    type="button"
                    onClick={handleRejectNonEssential}
                    className="py-2.5 px-3 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[#f3f8f6] dark:hover:bg-[#2a425a] text-[var(--text-primary)] text-xs font-bold transition active:scale-98 cursor-pointer text-center"
                  >
                    Essential Only
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="py-2.5 px-3 rounded-[8px] bg-[#142238] dark:bg-[#365671] hover:bg-[#101c2f] dark:hover:bg-[#406780] text-white text-xs font-bold transition active:scale-98 shadow-sm cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <Check size={13} className="text-[#A3E635]" />
                    <span>Save Choice</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRejectNonEssential}
                    className="py-2.5 px-3 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[#f3f8f6] dark:hover:bg-[#2a425a] text-[var(--text-primary)] text-xs font-bold transition active:scale-98 cursor-pointer text-center"
                  >
                    Essential Only
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="py-2.5 px-3 rounded-[8px] bg-[#142238] dark:bg-[#365671] hover:bg-[#101c2f] dark:hover:bg-[#406780] text-white text-xs font-bold transition active:scale-98 shadow-sm cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <Check size={13} className="text-[#A3E635]" />
                    <span>Accept All</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
