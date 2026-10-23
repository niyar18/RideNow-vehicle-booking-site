"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navigation, ClipboardList, Wallet } from "lucide-react";
import {
  HomeIcon,
  CompassIcon,
  WaveformIcon,
  BookingsDocIcon,
  AccountPersonIcon,
} from "@/shared/components/icons/AppIcons";
import { useTranslation } from "@/context/LanguageContext";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useSession } from "next-auth/react";

// Routes where full-screen interaction, map manipulation, or pinned CTAs must NOT be obstructed
const HIDDEN_PATTERNS = [
  /^\/book($|\?)/,           // Interactive map booking sheet & pinned confirm CTA
  /^\/ride\//,               // Live turn-by-turn passenger tracking & panic controls
  /^\/track\//,              // Public live tracking map view
  /^\/video-kyc\//,          // Full-screen camera & video KYC stream
  /^\/admin/,                // Admin management interface (has dedicated operational layout)
  /^\/partner\/active-ride/, // Driver operational turn-by-turn navigation
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { userData } = useSelector((state: RootState) => state.user);
  const { data: session } = useSession();

  // If currently on an excluded full-screen route, do not render
  if (!pathname || HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return null;
  }

  const currentUser = userData || session?.user;
  const isVendor = currentUser?.role === "vendor" || pathname.startsWith("/partner");

  if (isVendor) {
    return (
      <>
        {/* Spacer to prevent page bottom content from being obscured */}
        <div
          className="h-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:hidden pointer-events-none w-full shrink-0"
          aria-hidden="true"
        />

        {/* Vendor/Driver Mobile Dock */}
        <nav
          aria-label="Partner Mobile Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#FAF7F0]/95 dark:bg-[#061A16]/95 backdrop-blur-xl border-t border-[#DED7CA]/90 dark:border-[#1E3E34] shadow-[0_-4px_24px_rgba(18,61,50,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.6)] transition-colors duration-200"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center justify-around h-[64px] px-2 max-w-lg mx-auto relative">
            {/* 1. Dashboard */}
            <Link
              href="/partners/dashboard"
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all select-none active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px] ${
                pathname === "/partners/dashboard" ? "text-[#046A38] dark:text-[#34D399]" : "text-[#696B64] dark:text-[#B9C8BF]"
              }`}
            >
              <HomeIcon size={24} strokeWidth={pathname === "/partners/dashboard" ? 2.4 : 1.9} />
              <span className="text-[10px] tracking-tight mt-1 font-semibold">{t("nav.dashboard", "Dashboard")}</span>
            </Link>

            {/* 2. Requests */}
            <Link
              href="/partner/pending-requests"
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all select-none active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px] ${
                pathname === "/partner/pending-requests" ? "text-[#046A38] dark:text-[#34D399]" : "text-[#696B64] dark:text-[#B9C8BF]"
              }`}
            >
              <ClipboardList size={24} strokeWidth={pathname === "/partner/pending-requests" ? 2.4 : 1.9} />
              <span className="text-[10px] tracking-tight mt-1 font-semibold">{t("nav.requests", "Requests")}</span>
            </Link>

            {/* 3. Central Active Ride */}
            <div className="flex-1 flex justify-center items-center">
              <Link
                href="/partner/active-ride"
                aria-label="Partner Active Ride"
                className="w-13.5 h-13.5 rounded-full bg-[#046A38] hover:bg-[#03532C] dark:bg-[#0B2822] text-white flex items-center justify-center -mt-6 border-[3.5px] border-[#FAF7F0] dark:border-[2px] dark:border-[#34D399]/70 shadow-[0_6px_20px_rgba(4,106,56,0.38)] dark:shadow-[0_0_24px_rgba(52,211,153,0.5)] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
              >
                <Navigation size={24} className="fill-white" />
              </Link>
            </div>

            {/* 4. Bookings */}
            <Link
              href="/partner/bookings"
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all select-none active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px] ${
                pathname === "/partner/bookings" ? "text-[#046A38] dark:text-[#34D399]" : "text-[#696B64] dark:text-[#B9C8BF]"
              }`}
            >
              <BookingsDocIcon size={24} strokeWidth={pathname === "/partner/bookings" ? 2.4 : 1.9} />
              <span className="text-[10px] tracking-tight mt-1 font-semibold">{t("nav.bookings", "Bookings")}</span>
            </Link>

            {/* 5. Wallet */}
            <Link
              href="/partner/wallet"
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all select-none active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px] ${
                pathname === "/partner/wallet" ? "text-[#046A38] dark:text-[#34D399]" : "text-[#696B64] dark:text-[#B9C8BF]"
              }`}
            >
              <Wallet size={24} strokeWidth={pathname === "/partner/wallet" ? 2.4 : 1.9} />
              <span className="text-[10px] tracking-tight mt-1 font-semibold">{t("nav.wallet", "Wallet")}</span>
            </Link>
          </div>
        </nav>
      </>
    );
  }

  // Passenger / Consumer 5-Position Dock matching Reference Screenshot:
  // 1. Home ("/")
  // 2. Explore ("/explore")
  // 3. Central Action (ride search / booking)
  // 4. Bookings ("/bookings")
  // 5. Account ("/profile")
  const isHomeActive = pathname === "/";
  const isExploreActive = pathname === "/explore" || pathname === "/fleet" || pathname === "/search";
  const isBookingsActive = pathname === "/bookings";
  const isAccountActive = pathname === "/profile" || pathname === "/wallet" || pathname === "/settings";

  return (
    <>
      {/* Spacer to prevent page bottom content from being obscured */}
      <div
        className="h-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:hidden pointer-events-none w-full shrink-0"
        aria-hidden="true"
      />

      {/* Fixed Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#FAF7F0]/95 dark:bg-[#061A16]/95 backdrop-blur-xl border-t border-[#DED7CA]/90 dark:border-[#1E3E34] shadow-[0_-4px_24px_rgba(18,61,50,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.6)] transition-colors duration-200"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center justify-between h-[64px] px-2 max-w-md mx-auto relative">
          {/* Position 1: Home */}
          <Link
            href="/"
            aria-label="Home"
            aria-current={isHomeActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-0.5 transition-all select-none active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px] ${
              isHomeActive
                ? "text-[#123D32] dark:text-[#34D399]"
                : "text-[#696B64] dark:text-[#B9C8BF] hover:text-[#10251C] dark:hover:text-[#F7F5ED]"
            }`}
          >
            <div className="h-8.5 flex items-center justify-center">
              {isHomeActive ? (
                <div className="w-8.5 h-8.5 rounded-full bg-[#123D32] dark:bg-[#0E352B] text-white flex items-center justify-center shadow-sm">
                  <HomeIcon size={20} strokeWidth={2.2} />
                </div>
              ) : (
                <HomeIcon size={24} strokeWidth={1.9} />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${
                isHomeActive ? "font-bold text-[#123D32] dark:text-[#34D399]" : "font-medium"
              }`}
            >
              {t("nav.home", "Home")}
            </span>
          </Link>

          {/* Position 2: Explore */}
          <Link
            href="/explore"
            aria-label="Explore"
            aria-current={isExploreActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-0.5 transition-all select-none active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px] ${
              isExploreActive
                ? "text-[#123D32] dark:text-[#34D399]"
                : "text-[#696B64] dark:text-[#B9C8BF] hover:text-[#10251C] dark:hover:text-[#F7F5ED]"
            }`}
          >
            <div className="h-8.5 flex items-center justify-center">
              {isExploreActive ? (
                <div className="w-8.5 h-8.5 rounded-full bg-[#123D32] dark:bg-[#0E352B] text-white flex items-center justify-center shadow-sm">
                  <CompassIcon size={20} active={true} strokeWidth={2.2} />
                </div>
              ) : (
                <CompassIcon size={24} strokeWidth={1.9} />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${
                isExploreActive ? "font-bold text-[#123D32] dark:text-[#34D399]" : "font-medium"
              }`}
            >
              {t("nav.explore", "Explore")}
            </span>
          </Link>

          {/* Position 3: Central Circular Elevated Action Button with Emerald Glow & Audio Waveform */}
          <div className="flex-1 flex justify-center items-center pointer-events-auto">
            <Link
              href="/book?fresh=true"
              aria-label="Book a Ride or Search Trips"
              className="w-13.5 h-13.5 rounded-full bg-[#046A38] hover:bg-[#03532C] dark:bg-[#0B2822] text-white flex items-center justify-center -mt-6 border-[3.5px] border-[#FAF7F0] dark:border-[2.5px] dark:border-[#34D399] shadow-[0_6px_20px_rgba(4,106,56,0.38)] dark:shadow-[0_0_24px_rgba(52,211,153,0.55)] active:scale-90 transition-all cursor-pointer group"
            >
              <WaveformIcon size={28} className="text-white group-hover:scale-105 transition-transform" />
            </Link>
          </div>

          {/* Position 4: Bookings */}
          <Link
            href="/bookings"
            aria-label="Bookings"
            aria-current={isBookingsActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-0.5 transition-all select-none active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px] ${
              isBookingsActive
                ? "text-[#123D32] dark:text-[#34D399]"
                : "text-[#696B64] dark:text-[#B9C8BF] hover:text-[#10251C] dark:hover:text-[#F7F5ED]"
            }`}
          >
            <div className="h-8.5 flex items-center justify-center">
              {isBookingsActive ? (
                <div className="w-8.5 h-8.5 rounded-full bg-[#123D32] dark:bg-[#0E352B] text-white flex items-center justify-center shadow-sm">
                  <BookingsDocIcon size={20} strokeWidth={2.2} />
                </div>
              ) : (
                <BookingsDocIcon size={24} strokeWidth={1.9} />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${
                isBookingsActive ? "font-bold text-[#123D32] dark:text-[#34D399]" : "font-medium"
              }`}
            >
              {t("nav.bookings", "Bookings")}
            </span>
          </Link>

          {/* Position 5: Account */}
          <Link
            href="/profile"
            aria-label="Account"
            aria-current={isAccountActive ? "page" : undefined}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-0.5 transition-all select-none active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px] ${
              isAccountActive
                ? "text-[#123D32] dark:text-[#34D399]"
                : "text-[#696B64] dark:text-[#B9C8BF] hover:text-[#10251C] dark:hover:text-[#F7F5ED]"
            }`}
          >
            <div className="h-8.5 flex items-center justify-center">
              {isAccountActive ? (
                <div className="w-8.5 h-8.5 rounded-full bg-[#123D32] dark:bg-[#0E352B] text-white flex items-center justify-center shadow-sm">
                  <AccountPersonIcon size={20} strokeWidth={2.2} />
                </div>
              ) : (
                <AccountPersonIcon size={24} strokeWidth={1.9} />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight leading-tight mt-0.5 transition-colors ${
                isAccountActive ? "font-bold text-[#123D32] dark:text-[#34D399]" : "font-medium"
              }`}
            >
              {t("nav.account", "Account")}
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}
