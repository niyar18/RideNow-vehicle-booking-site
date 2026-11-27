"use client";

import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/shared/hooks/usePushNotifications";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

export default function NotificationToggle({
  variant = "button",
  className = "",
}: {
  variant?: "button" | "banner" | "circular";
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } =
    usePushNotifications();
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { userData } = useSelector((state: RootState) => state.user);

  if (!mounted || !isSupported) return null;

  const handleClick = async () => {
    // Require authentication before requesting push permission
    if (!userData) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
      }
      return;
    }

    if (isSubscribed) {
      await unsubscribe();
    } else {
      const ok = await subscribe();
      if (ok) {
        setJustEnabled(true);
        setTimeout(() => setJustEnabled(false), 3000);
      }
    }
  };

  if (variant === "banner") {
    if (isSubscribed || permission === "denied") return null;

    return (
      <div className={`bg-zinc-950 border border-zinc-800 rounded-none p-3.5 text-white flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-none bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 text-amber-400">
            <BellRing size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">Live Trip Alerts</p>
            <p className="text-xs text-zinc-300 font-medium truncate">
              Get notified when driver arrives or starts your trip
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="bg-white hover:bg-zinc-100 text-zinc-950 px-3.5 py-2 rounded-none text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex-shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Bell size={13} />
              <span>Enable</span>
            </>
          )}
        </button>
      </div>
    );
  }

  if (variant === "circular") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label="Notifications"
        className={`relative w-10 h-10 rounded-md bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center active:scale-95 transition hover:bg-white dark:hover:bg-[#263d54] cursor-pointer ${className}`}
        title={
          isSubscribed
            ? "Notifications Enabled (Tap to manage)"
            : "Enable Trip Notifications"
        }
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#213650] dark:text-[#91f2ce]" />
        ) : isSubscribed ? (
          <>
            <BellRing size={18} className="text-[#213650] dark:text-[#91f2ce]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#213650] dark:bg-[#91f2ce] animate-pulse" />
          </>
        ) : (
          <>
            <Bell size={18} className="text-[#142238]/80 dark:text-[#f3f8f6]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E34222]" />
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`relative p-2 rounded-[8px] transition-all flex items-center justify-center active:scale-95 ${
        isSubscribed
          ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
          : "text-[#142238]/70 hover:text-[#142238] hover:bg-black/5 dark:text-[#b3cbd1] dark:hover:text-[#F3F1E8] dark:hover:bg-white/5"
      } ${className}`}
      title={
        isSubscribed
          ? "Push Notifications Enabled (Click to disable)"
          : "Enable Push Notifications"
      }
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isSubscribed ? (
        <>
          <BellRing size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </>
      ) : (
        <Bell size={16} />
      )}
    </button>
  );
}
