"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  // Apply theme class to documentElement
  const applyTheme = (targetTheme: Theme) => {
    if (typeof window === "undefined") return;

    let resolved: ResolvedTheme = "dark";
    if (targetTheme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      resolved = systemDark ? "dark" : "light";
    } else {
      resolved = targetTheme;
    }

    setResolvedTheme(resolved);
    const root = document.documentElement;

    if (resolved === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = 'dark';
      root.style.backgroundColor = '#101c30';
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.style.colorScheme = 'light';
      root.style.backgroundColor = '#f3f8f6';
    }
  };

  useEffect(() => {
    let initialTheme: Theme = "system";
    try {
      const stored = localStorage.getItem("ridenow_theme") as Theme;
      if (stored && ["system", "light", "dark"].includes(stored)) {
        initialTheme = stored;
      }
    } catch {}

    setThemeState(initialTheme);
    applyTheme(initialTheme);
    try { if (initialTheme) { document.cookie = `ridenow_theme=${initialTheme}; path=/; max-age=31536000; SameSite=Lax`; } } catch(_) {}
    setMounted(true);

    // Listen for system theme preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      const currentStored = (localStorage.getItem("ridenow_theme") as Theme) || "system";
      if (currentStored === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem("ridenow_theme", newTheme);
      document.cookie = `ridenow_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
