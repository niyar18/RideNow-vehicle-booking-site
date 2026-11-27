"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown, X } from "lucide-react";
import { useTranslation, SUPPORTED_LANGUAGES, Language } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

export default function LanguageSelector({
  variant = "pill",
  className = "",
}: {
  variant?: "pill" | "minimal" | "footer";
  className?: string;
}) {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dropdownAlign, setDropdownAlign] = useState<"right" | "left">("right");
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute best dropdown alignment when opening to avoid viewport overflow
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const dropdownWidth = 190; // approx dropdown width

      if (rect.right + dropdownWidth > screenWidth && rect.left >= dropdownWidth) {
        setDropdownAlign("right");
      } else if (rect.left < dropdownWidth) {
        setDropdownAlign("left");
      } else {
        setDropdownAlign("right");
      }
    }
  }, [open]);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  if (variant === "footer") {
    return (
      <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
          <Globe size={14} className="text-[#c4d7df]/70 dark:text-[#b3cbd1]/70 mr-0.5 shrink-0" />
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`text-xs px-2 sm:px-2.5 py-1 rounded-[6px] transition-all font-medium active:scale-[0.97] cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? "bg-[#101c2f] dark:bg-[#263d54] text-[#e8f2ef] dark:text-[#f3f8f6] font-bold border border-[#607f90]/80 dark:border-[#4e697f] shadow-2xs"
                    : "text-[#c4d7df] dark:text-[#b3cbd1] hover:text-[#e8f2ef] dark:hover:text-[#F3F1E8] hover:bg-[#101c2f]/50 dark:hover:bg-[#263d54] border border-transparent"
                }`}
              >
                {lang.nativeName}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-[8px] border border-stone-200/90 dark:border-[#4e697f] hover:border-stone-300 dark:hover:border-[#607f90] bg-white/95 dark:bg-[#1a2d45] hover:bg-white dark:hover:bg-[#263d54] text-stone-800 dark:text-[#f3f8f6] text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-[0.97]"
        title="Change Language"
        aria-expanded={open}
      >
        <Globe size={15} className="text-stone-600 dark:text-[#b3cbd1] shrink-0" />
        <span className="font-extrabold truncate max-w-[90px]">{currentOption.nativeName}</span>
        <ChevronDown
          size={13}
          className={`text-stone-500 dark:text-[#b3cbd1] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ─── DESKTOP / TABLET DROPDOWN (Auto-aligned & Screen-bounded) ─── */}
      {open && (
        <div
          className={`hidden sm:block absolute ${
            dropdownAlign === "left" ? "left-0" : "right-0"
          } mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-[#1a2d45] shadow-2xl border border-zinc-200/90 dark:border-[#4e697f] py-1.5 z-[9999] focus:outline-none animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-[#b3cbd1] border-b border-zinc-100 dark:border-[#425b73] mb-1 flex items-center justify-between">
            <span>Select Language</span>
            <Globe size={11} className="text-zinc-400 dark:text-[#b3cbd1]" />
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-zinc-100 dark:bg-[#263d54] font-bold text-zinc-900 dark:text-[#f3f8f6]"
                    : "text-zinc-700 dark:text-[#b3cbd1] hover:bg-zinc-50 dark:hover:bg-[#263d54] hover:text-zinc-950 dark:hover:text-[#F3F1E8]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{lang.nativeName}</span>
                  <span className="text-[11px] text-zinc-400 dark:text-[#b3cbd1]">({lang.name})</span>
                </div>
                {isSelected && <Check size={14} className="text-zinc-900 dark:text-[#f3f8f6]" />}
              </button>
            );
          })}
        </div>
      )}

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
              className="relative bg-white dark:bg-[#1a2d45] rounded-t-3xl p-5 shadow-2xl border-t border-zinc-200 dark:border-[#4e697f] w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#425b73] mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-[#263d54] flex items-center justify-center text-zinc-800 dark:text-[#f3f8f6]">
                    <Globe size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-[#f3f8f6]">Select Language</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-[#b3cbd1] font-medium">Choose your preferred language</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-[#263d54] text-zinc-500 dark:text-[#b3cbd1] flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-[#2a425a] active:scale-95"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === language;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelect(lang.code)}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-sm flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-zinc-900 dark:bg-[#365671] text-white font-bold shadow-sm"
                          : "bg-zinc-50 dark:bg-[#263d54] hover:bg-zinc-100 dark:hover:bg-[#2a425a] text-zinc-800 dark:text-[#f3f8f6]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-base">{lang.nativeName}</span>
                        <span className={`text-xs ${isSelected ? "text-zinc-300" : "text-zinc-500 dark:text-[#b3cbd1]"}`}>
                          ({lang.name})
                        </span>
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
