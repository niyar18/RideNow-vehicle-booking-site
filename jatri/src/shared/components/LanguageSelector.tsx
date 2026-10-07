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
        <div className="flex items-center gap-1.5 flex-wrap">
          <Globe size={14} className="text-zinc-500 mr-1" />
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all font-medium ${
                  isSelected
                    ? "bg-zinc-800 text-white font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-all shadow-xs active:scale-95"
        title="Change Language"
        aria-expanded={open}
      >
        <Globe size={14} className="text-zinc-500 shrink-0" />
        <span className="font-semibold truncate max-w-[80px]">{currentOption.nativeName}</span>
        <ChevronDown
          size={12}
          className={`text-zinc-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ─── DESKTOP / TABLET DROPDOWN (Auto-aligned & Screen-bounded) ─── */}
      {open && (
        <div
          className={`hidden sm:block absolute ${
            dropdownAlign === "left" ? "left-0" : "right-0"
          } mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl border border-zinc-200/90 py-1.5 z-[9999] focus:outline-none animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 mb-1 flex items-center justify-between">
            <span>Select Language</span>
            <Globe size={11} className="text-zinc-400" />
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
                    ? "bg-zinc-100 font-bold text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{lang.nativeName}</span>
                  <span className="text-[11px] text-zinc-400">({lang.name})</span>
                </div>
                {isSelected && <Check size={14} className="text-zinc-900" />}
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
              className="relative bg-white rounded-t-3xl p-5 shadow-2xl border-t border-zinc-200 w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                    <Globe size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Select Language</h3>
                    <p className="text-[11px] text-zinc-500 font-medium">Choose your preferred language</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 active:scale-95"
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
                          ? "bg-zinc-900 text-white font-bold shadow-sm"
                          : "bg-zinc-50 hover:bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-base">{lang.nativeName}</span>
                        <span className={`text-xs ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
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
