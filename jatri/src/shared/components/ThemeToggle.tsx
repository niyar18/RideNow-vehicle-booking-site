"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, ChevronDown, Check, X } from "lucide-react";
import { useTheme, Theme } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle({
  variant = "pill",
  className = "",
}: {
  variant?: "pill" | "footer" | "icon";
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<"down" | "up">("down");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenHeight = window.innerHeight;
      if (rect.bottom + 220 > screenHeight && rect.top > 220) {
        setDropdownDirection("up");
      } else {
        setDropdownDirection("down");
      }
    }
  }, [open]);

  const THEME_OPTIONS: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "system", label: "Auto (Device)", icon: Laptop },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];

  const currentOption = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  const CurrentIcon =
    theme === "system"
      ? resolvedTheme === "dark"
        ? Moon
        : Sun
      : currentOption.icon;

  if (variant === "footer") {
    return (
      <div className={`inline-flex items-center gap-1 bg-[#101c2f]/70 dark:bg-[#263d54]/70 border border-[#607f90]/80 dark:border-[#4e697f] rounded-[8px] p-1 ${className}`}>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = opt.id === theme;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold transition active:scale-95 ${
                isSelected
                  ? "bg-[#142238] dark:bg-[#365671] text-[#e8f2ef] dark:text-[#f3f8f6] shadow-2xs font-bold"
                  : "text-[#c4d7df] dark:text-[#b3cbd1] hover:text-[#e8f2ef] dark:hover:text-[#F3F1E8] hover:bg-[#142238]/50 dark:hover:bg-[#263d54]"
              }`}
              title={opt.label}
            >
              <Icon size={12} strokeWidth={2.5} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-stone-200/90 dark:border-[#4e697f] hover:border-stone-300 dark:hover:border-[#607f90] bg-white/95 dark:bg-[#1a2d45] hover:bg-white dark:hover:bg-[#263d54] text-stone-800 dark:text-[#f3f8f6] text-xs font-bold transition-all shadow-xs active:scale-95"
        title="Toggle Theme (Device Auto / Light / Dark)"
        aria-expanded={open}
      >
        <CurrentIcon size={13} className="text-stone-500 dark:text-[#b3cbd1] shrink-0" strokeWidth={2.5} />
        <span className="font-semibold">{currentOption.label}</span>
        <ChevronDown
          size={12}
          className={`text-stone-400 dark:text-[#b3cbd1] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ─── DESKTOP DROPDOWN (Auto-detects viewport bounds and flips up/down) ─── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: dropdownDirection === "up" ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: dropdownDirection === "up" ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            className={`hidden sm:block absolute right-0 ${
              dropdownDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
            } w-44 rounded-[12px] bg-white dark:bg-[#1a2d45] border border-zinc-200 dark:border-[#4e697f] shadow-xl overflow-hidden z-50 p-1.5`}
          >
            <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-[#b3cbd1]">
              Appearance
            </div>
            {THEME_OPTIONS.map((opt) => {
              const isSelected = opt.id === theme;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs font-bold transition text-left ${
                    isSelected
                      ? "bg-zinc-100 dark:bg-[#263d54] text-zinc-950 dark:text-[#f3f8f6] font-black"
                      : "text-zinc-600 dark:text-[#b3cbd1] hover:bg-zinc-50 dark:hover:bg-[#263d54]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-[#b3cbd1]"} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={3} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MOBILE BOTTOM-SHEET MODAL (100% Guaranteed Zero Viewport Overflow) ─── */}
      <AnimatePresence>
        {open && (
          <div className="sm:hidden fixed inset-0 z-[99999] flex flex-col justify-end bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white dark:bg-[#1a2d45] rounded-t-3xl p-5 shadow-2xl border-t border-zinc-200 dark:border-[#4e697f] w-full max-h-[85vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#425b73] mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-[#263d54] flex items-center justify-center text-zinc-800 dark:text-[#f3f8f6]">
                    <CurrentIcon size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-[#f3f8f6]">Appearance &amp; Theme</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-[#b3cbd1] font-medium">Select your display preference</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-[#263d54] text-zinc-500 dark:text-[#b3cbd1] flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-[#2a425a] active:scale-95"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {THEME_OPTIONS.map((opt) => {
                  const isSelected = opt.id === theme;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setTheme(opt.id);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl text-sm flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-zinc-900 dark:bg-[#365671] text-white font-bold shadow-sm"
                          : "bg-zinc-50 dark:bg-[#263d54] hover:bg-zinc-100 dark:hover:bg-[#2a425a] text-zinc-800 dark:text-[#f3f8f6]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={isSelected ? "text-emerald-400" : "text-zinc-500 dark:text-[#b3cbd1]"} />
                        <span className="font-bold text-base">{opt.label}</span>
                      </div>
                      {isSelected && <Check size={18} className="text-white" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
