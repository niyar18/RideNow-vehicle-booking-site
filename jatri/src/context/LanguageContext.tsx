"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import en from "@/lib/i18n/dictionaries/en.json";
import as from "@/lib/i18n/dictionaries/as.json";
import hi from "@/lib/i18n/dictionaries/hi.json";
import bn from "@/lib/i18n/dictionaries/bn.json";

export type Language = "en" | "as" | "hi" | "bn";

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", flag: "🇮🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
];

const DICTIONARIES: Record<Language, any> = {
  en,
  as,
  hi,
  bn,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
  textLanguage: (keyPath: string) => Language;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  textLanguage: () => "en",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = (localStorage.getItem("jaatri_lang") || localStorage.getItem("jatri_lang")) as Language;
      if (stored && ["en", "as", "hi", "bn"].includes(stored)) {
        setLanguageState(stored);
      } else {
        // Detect browser language
        const navLang = navigator.language?.toLowerCase() || "";
        if (navLang.startsWith("as")) setLanguageState("as");
        else if (navLang.startsWith("hi")) setLanguageState("hi");
        else if (navLang.startsWith("bn")) setLanguageState("bn");
      }
    } catch {}
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("jaatri_lang", lang);
      localStorage.setItem("jatri_lang", lang);
      document.cookie = `jaatri_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `jatri_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  };

  const readKey = (lang: Language, keyPath: string): string | undefined => {
    let value: unknown = DICTIONARIES[lang];
    for (const key of keyPath.split(".")) {
      value = value && typeof value === "object"
        ? (value as Record<string, unknown>)[key]
        : undefined;
    }
    return typeof value === "string" ? value : undefined;
  };
  const t = (keyPath: string, fallback?: string) =>
    readKey(language, keyPath) ?? readKey("en", keyPath) ?? fallback ?? keyPath;
  const textLanguage = (keyPath: string): Language =>
    readKey(language, keyPath) === undefined ? "en" : language;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, textLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Annotate translated text, including English fallback within a mixed-language view. */
export function LocalizedText({ id, fallback }: { id: string; fallback?: string }) {
  const { t, textLanguage } = useTranslation();
  return <span lang={textLanguage(id)}>{t(id, fallback)}</span>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
