"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, Globe, X } from "lucide-react";
import { useTranslation, SUPPORTED_LANGUAGES } from "@/context/LanguageContext";
import AccessibleDialog from "./AccessibleDialog";

export default function LanguageSelector({
  variant = "pill", className = "",
}: { variant?: "pill" | "minimal" | "footer"; className?: string }) {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const title = useId();
  const current = SUPPORTED_LANGUAGES.find((item) => item.code === language) ?? SUPPORTED_LANGUAGES[0];

  if (variant === "footer") {
    return (
      <div role="group" aria-label="Site language" className={`flex flex-wrap items-center gap-1 ${className}`}>
        <Globe size={14} aria-hidden="true" className="text-[#c4d7df]" />
        {SUPPORTED_LANGUAGES.map((item) => (
          <button key={item.code} type="button" aria-pressed={item.code === language} lang={item.code}
            onClick={() => setLanguage(item.code)}
            className={`min-h-8 rounded-md border px-2 text-xs font-semibold text-[#e8f2ef] hover:bg-[#263d54] focus-visible:outline-white ${item.code === language ? "border-[#b3cbd1] bg-[#263d54]" : "border-transparent"}`}>
            {item.nativeName}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border-interactive)] bg-[var(--surface-raised)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]">
        <Globe size={15} aria-hidden="true" />
        <span lang={current.code}>{current.nativeName}</span><span className="sr-only">, change language</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <AccessibleDialog labelledBy={title} onClose={() => setOpen(false)}
          className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-auto rounded-xl border border-[var(--border-interactive)] bg-[var(--surface-raised)] p-4 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/70">
          <div className="flex items-center justify-between gap-3">
            <h2 id={title} data-dialog-heading tabIndex={-1} className="text-lg font-bold">Choose a language</h2>
            <button type="button" aria-label="Close language options" onClick={() => setOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-[var(--surface-subtle)]">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 grid gap-2">
            {SUPPORTED_LANGUAGES.map((item) => (
              <button key={item.code} type="button" aria-pressed={item.code === language}
                onClick={() => { setLanguage(item.code); setOpen(false); }}
                className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-[var(--border-interactive)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-subtle)]">
                <span><span lang={item.code} className="font-semibold">{item.nativeName}</span>{item.code !== "en" && ` (${item.name})`}</span>
                {item.code === language && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
}
