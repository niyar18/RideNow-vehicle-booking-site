"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // If user already saw the splash screen in this browser session, unmount immediately
    try {
      if (sessionStorage.getItem("jaatri_splash_seen")) {
        setVisible(false);
        document.documentElement.classList.add("splash-hidden");
        return;
      }
    } catch (_) {}

    let unmountTimer: ReturnType<typeof setTimeout> | undefined;

    // Brief handoff after hydration without holding navigation.
    const fadeTimer = setTimeout(() => {
      setFading(true);
      try {
        sessionStorage.setItem("jaatri_splash_seen", "true");
      } catch (_) {}

      // Once fade animation completes (350ms), unmount safely via React state
      unmountTimer = setTimeout(() => {
        setVisible(false);
        document.documentElement.classList.add("splash-hidden");
      }, 200);
    }, 120);

    return () => {
      clearTimeout(fadeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="jaatri-splash-screen"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none bg-[var(--background)] transition-opacity duration-200 ease-out ${
        fading ? "opacity-0 scale-[1.02] pointer-events-none" : "opacity-100 scale-100 pointer-events-auto"
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center text-center px-6 max-w-xs animate-in fade-in zoom-in-95 duration-300">
        {/* Light Theme Logo */}
        <div className="splash-logo-light">
          <Image
            src="/logojatri.webp"
            alt="Jaatri"
            width={180}
            height={56}
            priority
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>

        {/* Dark Theme Logo */}
        <div className="splash-logo-dark">
          <Image
            src="/logojatri-dark.webp"
            alt="Jaatri"
            width={180}
            height={56}
            priority
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>

        {/* Minimalist Subtitle */}
        <p className="mt-4 text-[11px] sm:text-[12px] font-bold tracking-[0.24em] uppercase text-[#4d6374] dark:text-[#b3cbd1]">
          MORE THAN A RIDE
        </p>

        {/* Refined Emerald Loading Bar */}
        <div className="w-28 sm:w-32 h-[3px] bg-[#d5e3e2] dark:bg-[#425b73] rounded-full overflow-hidden mt-6 relative">
          <div className="absolute inset-0 w-full h-full bg-[#213650] dark:bg-[#91f2ce] rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
