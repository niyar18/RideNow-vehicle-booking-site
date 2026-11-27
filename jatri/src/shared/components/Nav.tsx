"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Wallet,
  ArrowRight,
  HelpCircle,
  FileText,
  Star,
  User as UserIcon,
  Tag,
  Car,
  Loader2,
  Settings as SettingsIcon,
} from "lucide-react";
import AuthModal from "@/features/auth/components/AuthModal";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useSession } from "next-auth/react";
import { setUserData } from "@/redux/userSlice";
import { performFastSignOut } from "@/lib/authLogout";
import axios from "axios";
import LanguageSelector from "./LanguageSelector";
import NotificationToggle from "./NotificationToggle";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "@/context/LanguageContext";

const NAV_ITEMS = ["Home", "Bookings", "Fleet", "FAQ", "Contact"];
const NAV_ROUTES: Record<string, string> = {
  Home: "/",
  Bookings: "/bookings",
  Fleet: "/fleet",
  FAQ: "/faq",
  Contact: "/contact",
};
const NAV_KEYS: Record<string, string> = {
  Home: "nav.home",
  Bookings: "nav.bookings",
  Fleet: "nav.fleet",
  FAQ: "nav.faq",
  Contact: "nav.contact",
};

export default function Nav({ user: propUser }: { user?: any } = {}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Auto-open login modal if redirected back with OAuth error parameter or via custom event
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setAuthOpen(true);
    }

    const handleOpenAuth = () => setAuthOpen(true);
    window.addEventListener("open-auth-modal", handleOpenAuth);
    return () => window.removeEventListener("open-auth-modal", handleOpenAuth);
  }, []);
  const [profileOpen, setProfileOpen] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [passengerActiveRide, setPassengerActiveRide] = useState<any | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
  const { data: session, status } = useSession();

  const currentUser = userData || propUser || (status === "authenticated" ? session?.user : null);
  const isVendorRoute = pathname?.startsWith("/partner") || pathname?.startsWith("/partners");

  useEffect(() => {
    if (propUser && !userData) {
      dispatch(setUserData(propUser));
    }
  }, [propUser, userData, dispatch]);

  /* Fetch vendor counts */
  useEffect(() => {
    if (currentUser?.role !== "vendor" && !isVendorRoute) return;

    const fetchCounts = async () => {
      try {
        const res = await axios.get("/api/partner/bookings/counts", {
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        setPendingCount(res.data.pending || 0);
        setActiveCount(res.data.active || 0);
      } catch {}
    };

    fetchCounts();
  }, [currentUser?.role, isVendorRoute]);

  /* Fetch passenger active ride */
  useEffect(() => {
    let isMounted = true;

    if (!currentUser || currentUser?.role === "vendor" || isVendorRoute) {
      Promise.resolve().then(() => {
        if (isMounted) setPassengerActiveRide(null);
      });
      return () => {
        isMounted = false;
      };
    }

    const checkActive = async () => {
      try {
        const res = await axios.get("/api/booking/my-active", {
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        if (!isMounted) return;
        if (res.data?.booking) {
          setPassengerActiveRide(res.data.booking);
        } else {
          setPassengerActiveRide(null);
        }
      } catch {
        if (isMounted) setPassengerActiveRide(null);
      }
    };

    checkActive();
    const interval = setInterval(checkActive, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser, isVendorRoute]);

  /* Close menus on route change */
  useEffect(() => {
    Promise.resolve().then(() => {
      setMenuOpen(false);
      setProfileOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      menuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  /* Desktop outside click for profile */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setProfileOpen(false);
    setMenuOpen(false);
    await performFastSignOut("/");
  };

  /* Desktop navigation items with 300% visual prominence */
  const renderNavItems = () => {
    if (currentUser?.role === "vendor" || isVendorRoute) {
      return (
        <nav className="flex items-center gap-1 sm:gap-2 lg:gap-3" aria-label="Partner Navigation">
          <Link
            href="/partners/dashboard"
            className={`text-[13px] xl:text-[14px] font-semibold px-3 py-2 transition ${
              pathname === "/partners/dashboard"
                ? "jaatri-nav-active rounded-[7px]"
                : "text-[#142238]/80 dark:text-[#f3f8f6]/80 hover:text-[#142238] dark:hover:text-[#F3F1E8] hover:bg-black/5 dark:hover:bg-white/5 rounded-[8px]"
            }`}
          >
            {t("nav.dashboard", "Dashboard")}
          </Link>

          <Link
            href="/partner/active-ride"
            className={`relative text-[13px] xl:text-[14px] font-semibold px-3 py-2 transition ${
              pathname === "/partner/active-ride"
                ? "jaatri-nav-active rounded-[7px]"
                : "text-[#142238]/80 dark:text-[#f3f8f6]/80 hover:text-[#142238] dark:hover:text-[#F3F1E8] hover:bg-black/5 dark:hover:bg-white/5 rounded-[8px]"
            }`}
          >
            {t("nav.activeRide", "Active Ride")}
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 w-5 h-5 bg-[#E34222] dark:bg-[#E06A50] text-white text-[11px] rounded-full flex items-center justify-center font-black">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/partner/pending-requests"
            className={`relative text-[13px] xl:text-[14px] font-semibold px-3 py-2 transition ${
              pathname === "/partner/pending-requests"
                ? "jaatri-nav-active rounded-[7px]"
                : "text-[#142238]/80 dark:text-[#f3f8f6]/80 hover:text-[#142238] dark:hover:text-[#F3F1E8] hover:bg-black/5 dark:hover:bg-white/5 rounded-[8px]"
            }`}
          >
            {t("nav.requests", "Requests")}
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 w-5 h-5 bg-[#E34222] dark:bg-[#E06A50] text-white text-[11px] rounded-full flex items-center justify-center font-black">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/partner/bookings"
            className={`relative text-[13px] xl:text-[14px] font-semibold px-3 py-2 transition ${
              pathname === "/partner/bookings"
                ? "jaatri-nav-active rounded-[7px]"
                : "text-[#142238]/80 dark:text-[#f3f8f6]/80 hover:text-[#142238] dark:hover:text-[#F3F1E8] hover:bg-black/5 dark:hover:bg-white/5 rounded-[8px]"
            }`}
          >
            {t("nav.bookings", "Bookings")}
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-2 w-5 h-5 bg-emerald-600 dark:bg-emerald-500 text-white text-[11px] rounded-full flex items-center justify-center font-black">
                {activeCount}
              </span>
            )}
          </Link>

          <Link
            href="/partner/wallet"
            className={`text-[13px] xl:text-[14px] font-semibold px-3 py-2 transition ${
              pathname === "/partner/wallet"
                ? "jaatri-nav-active rounded-[7px]"
                : "text-[#142238]/80 dark:text-[#f3f8f6]/80 hover:text-[#142238] dark:hover:text-[#F3F1E8] hover:bg-black/5 dark:hover:bg-white/5 rounded-[8px]"
            }`}
          >
            {t("nav.wallet", "Wallet")}
          </Link>
        </nav>
      );
    }

    return (
      <nav className="flex items-center gap-1.5 sm:gap-2 lg:gap-3" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const href = NAV_ROUTES[item];
          const active = pathname === href;
          return (
            <Link
              key={item}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`text-base sm:text-[13px] xl:text-[14px] px-3.5 sm:px-4 py-1.5 sm:py-2 transition-all duration-150 active:scale-[0.97] ${
                active
                  ? "jaatri-nav-active rounded-lg"
                  : "text-[#142238]/85 dark:text-[#f3f8f6]/85 hover:text-[#142238] dark:hover:text-[#F3F1E8] hover:bg-black/5 dark:hover:bg-white/5 font-semibold rounded-[8px]"
              }`}
            >
              {t(NAV_KEYS[item] || item, item)}
            </Link>
          );
        })}

        {currentUser?.role === "admin" && (
          <Link
            href="/admin/dashboard"
            className="text-base sm:text-[17px] lg:text-[18px] font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-[8px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-black/5 dark:hover:bg-white/5 transition active:scale-95"
          >
            Admin Panel
          </Link>
        )}
      </nav>
    );
  };

  return (
    <>
      {/* ================= SEAMLESS HEADER / NAVBAR ================= */}
      <header
        className="jaatri-shell-header fixed top-0 left-0 w-full z-50 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto h-[68px] sm:h-20 md:h-24 pt-1 sm:pt-0 flex items-center justify-between transition-all duration-300">
          {/* LEFT: BRAND LOGO */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <Link
              href={currentUser?.role === "vendor" || isVendorRoute ? "/partners/dashboard" : "/"}
              onClick={() => {
                if (typeof window !== "undefined") {
                  try {
                    sessionStorage.removeItem("ridenow_booking_draft");
                    localStorage.removeItem("ridenow_booking_draft");
                  } catch (_) {}
                }
              }}
              className="flex items-center flex-shrink-0 active:scale-98 transition group py-1"
              aria-label="Jaatri Home"
            >
              <Image
                src="/logojatri.png"
                alt="Jaatri by RideNow"
                width={260}
                height={82}
                className="h-8 sm:h-9 lg:h-11 w-auto object-contain block dark:hidden"
                priority
              />
              <Image
                src="/logojatri-dark.webp"
                alt="Jaatri by RideNow"
                width={260}
                height={82}
                className="h-8 sm:h-9 lg:h-11 w-auto object-contain hidden dark:block"
                priority
              />
            </Link>

            {/* DESKTOP NAV */}
            <div className="hidden lg:flex items-center">{renderNavItems()}</div>
          </div>

          {/* RIGHT: ONGOING RIDE, TOOLS & PROFILE */}
          <div className="flex items-center gap-2 sm:gap-3 relative">
            {/* Passenger Ongoing Ride Indicator */}
            {passengerActiveRide && (
              <Link
                href={`/ride/${passengerActiveRide._id}`}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-xs sm:text-sm font-black animate-pulse transition hover:bg-emerald-500/30 active:scale-95"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Ongoing Ride</span>
              </Link>
            )}

            {/* Desktop Notification, Language & Theme controls */}
            <div className="hidden lg:flex items-center gap-2">
              <NotificationToggle />
              <ThemeToggle variant="pill" />
              <LanguageSelector variant="pill" />
            </div>

            {/* DESKTOP PROFILE BUTTON & DROPDOWN */}
            <div className="hidden lg:block relative" ref={profileRef}>
              {currentUser ? (
                <>
                  <button
                    onClick={() => setProfileOpen((p) => !p)}
                    className="w-11 h-11 rounded-full bg-forest dark:bg-[#365671] text-white font-black text-base flex items-center justify-center shadow-md active:scale-95 transition hover:bg-forest-hover dark:hover:bg-[#406780]"
                    aria-label="Open User Profile Menu"
                  >
                    {currentUser.name?.charAt(0).toUpperCase() || "P"}
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ type: "spring", damping: 28, stiffness: 350 }}
                        className="absolute top-14 right-0 w-[340px] bg-white dark:bg-[#1a2d45] text-zinc-950 dark:text-[#f3f8f6] rounded-[14px] shadow-lg border border-zinc-200 dark:border-[#4e697f] overflow-hidden z-50"
                      >
                        <UberProfileDropdown
                          userData={currentUser}
                          handleLogout={handleLogout}
                          isLoggingOut={isLoggingOut}
                          router={router}
                          onClose={() => setProfileOpen(false)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : status === "loading" || isVendorRoute ? (
                <div className="w-11 h-11 rounded-[8px] bg-stone-200 dark:bg-[#263d54] animate-pulse border border-stone-300 dark:border-[#4e697f]" />
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  data-shell-primary
                  className="px-6 py-2.5 rounded-[8px] font-bold text-[15px] sm:text-[16px] transition shadow-xs active:scale-95 bg-[#213650] hover:bg-[#142238] dark:bg-[#354f68] dark:hover:bg-[#213650] text-white"
                >
                  {t("nav.signIn", "Sign In")}
                </button>
              )}
            </div>

            {/* MOBILE HEADER RIGHT CONTROLS */}
            <div className="lg:hidden flex items-center gap-1.5">
              <NotificationToggle variant="circular" />

              {/* MOBILE QUICK SIGN IN / PROFILE BUTTON */}
              {currentUser ? (
                <button
                  onClick={() => setProfileOpen(true)}
                  className="w-9 h-9 rounded-full bg-[#142238] dark:bg-[#365671] text-white font-black flex items-center justify-center text-xs shadow-sm active:scale-95 transition hover:bg-[#101c2f] dark:hover:bg-[#406780]"
                  aria-label="Open Profile Details"
                >
                  {currentUser.name?.charAt(0).toUpperCase() || "P"}
                </button>
              ) : status === "loading" || isVendorRoute ? (
                <div className="w-9 h-9 rounded-[8px] bg-stone-200 dark:bg-[#263d54] animate-pulse border border-stone-300 dark:border-[#4e697f]" />
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  data-shell-primary
                  className="px-3.5 py-1.5 rounded-[8px] text-xs font-extrabold shadow-2xs active:scale-[0.97] transition bg-[#213650] hover:bg-[#142238] dark:bg-[#354f68] dark:hover:bg-[#213650] text-white"
                >
                  {t("nav.signIn", "Sign In")}
                </button>
              )}

              {/* MOBILE HAMBURGER BUTTON */}
              {(
                <button
                  type="button"
                  ref={menuButtonRef}
                  onClick={() => setMenuOpen((p) => !p)}
                  className="p-1.5 rounded-[8px] active:scale-90 transition cursor-pointer text-[#142238] dark:text-[#f3f8f6] hover:bg-black/5 dark:hover:bg-white/5"
                  aria-expanded={menuOpen}
                  aria-controls={menuOpen ? "jaatri-menu-drawer" : undefined}
                  aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                >
                  {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= UBER-STYLE FULLSCREEN MOBILE MENU DRAWER ================= */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            id="jaatri-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            onKeyDown={(event) => {
              if (event.key === "Escape") setMenuOpen(false);
              if (event.key !== "Tab") return;
              const stops = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex=0]")].filter((item) => item.getClientRects().length);
              const first = stops[0], last = stops.at(-1);
              if (!first || !last) return;
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
              if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }}
            className="fixed inset-0 top-0 left-0 w-full h-[100dvh] bg-[var(--background)] text-[var(--text-primary)] z-50 lg:hidden flex flex-col justify-between overflow-y-auto px-6 py-6"
          >
            {/* TOP BAR INSIDE DRAWER */}
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#b3c8ca]/80 dark:border-[#4e697f]">
                <Link
                  href="/" prefetch={true}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center active:scale-95 transition"
                >
                  <Image
                    src="/logojatri.png"
                    alt="Jaatri"
                    width={180}
                    height={66}
                    className="h-10 w-auto object-contain block dark:hidden"
                  />
                  <Image
                    src="/logojatri-dark.webp"
                    alt="Jaatri"
                    width={180}
                    height={66}
                    className="h-10 w-auto object-contain hidden dark:block"
                  />
                </Link>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-11 h-11 rounded-full bg-white dark:bg-[#263d54] border border-[#b3c8ca] dark:border-[#4e697f] text-[#142238] dark:text-[#f3f8f6] flex items-center justify-center active:scale-90 transition hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Close menu"
                  autoFocus
                >
                  <X size={24} />
                </button>
              </div>

              {/* Passenger Active Ride Banner in Mobile Drawer */}
              {passengerActiveRide && (
                <div className="mt-4">
                  <Link
                    href={`/ride/${passengerActiveRide._id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold text-sm transition active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
                      <span>Active Ride in Progress</span>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}

              {/* NAVIGATION LINKS */}
              <div className="flex flex-col gap-1 pt-6 font-serif">
                {currentUser?.role === "vendor" || isVendorRoute ? (
                  <>
                    <Link
                      href="/partners/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 ${
                        pathname === "/partners/dashboard" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      {t("nav.dashboard", "Dashboard")}
                    </Link>

                    <Link
                      href="/partner/active-ride"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 flex items-center justify-between ${
                        pathname === "/partner/active-ride" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      <span>{t("nav.activeRide", "Active Ride")}</span>
                      {pendingCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#E34222] dark:bg-[#E06A50] text-white text-xs font-sans font-extrabold">
                          {pendingCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/partner/pending-requests"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 flex items-center justify-between ${
                        pathname === "/partner/pending-requests" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      <span>{t("nav.requests", "Requests")}</span>
                      {pendingCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#E34222] dark:bg-[#E06A50] text-white text-xs font-sans font-extrabold">
                          {pendingCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/partner/bookings"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 flex items-center justify-between ${
                        pathname === "/partner/bookings" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      <span>{t("nav.bookings", "Bookings")}</span>
                      {activeCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white text-xs font-sans font-extrabold">
                          {activeCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/partner/wallet"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 ${
                        pathname === "/partner/wallet" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      {t("nav.walletEarnings", "Wallet & Earnings")}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/book"
                      onClick={() => setMenuOpen(false)}
                      className="text-2xl sm:text-3xl font-normal tracking-tight py-2.5 text-[#142238] dark:text-[#f3f8f6] hover:text-[#142238] dark:hover:text-[#388463] transition active:scale-98"
                    >
                      {t("nav.ride", "Ride")}
                    </Link>

                    <Link
                      href="/bookings"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 ${
                        pathname === "/bookings" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      {t("nav.bookings", "Bookings")}
                    </Link>

                    <Link
                      href="/partner/onboard/vehicle"
                      onClick={() => setMenuOpen(false)}
                      className="text-2xl sm:text-3xl font-normal tracking-tight py-2.5 text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8] transition active:scale-98"
                    >
                      {t("nav.drive", "Drive")}
                    </Link>

                    <Link
                      href="/fleet"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 ${
                        pathname === "/fleet" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      {t("nav.fleet", "Fleet")}
                    </Link>

                    <Link
                      href="/faq"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 ${
                        pathname === "/faq" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      {t("nav.help", "Help")}
                    </Link>

                    <Link
                      href="/contact"
                      onClick={() => setMenuOpen(false)}
                      className={`text-2xl sm:text-3xl font-normal tracking-tight py-2.5 transition active:scale-98 ${
                        pathname === "/contact" ? "text-[#142238] dark:text-[#388463] font-semibold" : "text-[#142238]/75 dark:text-[#f3f8f6]/75 hover:text-[#142238] dark:hover:text-[#F3F1E8]"
                      }`}
                    >
                      {t("nav.contact", "Contact")}
                    </Link>

                    {currentUser?.role === "admin" && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="text-2xl sm:text-3xl font-normal tracking-tight py-2.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition active:scale-98"
                      >
                        Admin Panel
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* BOTTOM SECTION OF MOBILE DRAWER */}
            <div className="pt-6 border-t border-[#b3c8ca]/80 dark:border-[#4e697f] space-y-4">
              {currentUser ? (
                <div className="bg-white dark:bg-[#1a2d45] border border-[#b3c8ca] dark:border-[#4e697f] p-4 rounded-[12px] flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#142238] dark:bg-[#365671] text-white font-black text-lg flex items-center justify-center">
                      {currentUser.name?.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div>
                      <p className="font-extrabold text-[#142238] dark:text-[#f3f8f6] text-base truncate">{currentUser.name || "User"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#ddede8] dark:bg-[#1D3428] text-[#142238] dark:text-[#b3cbd1]">
                          {currentUser.role || "user"}
                        </span>
                        {currentUser.role !== "vendor" && (
                          <span className="text-xs font-bold text-[#4d6374] dark:text-[#b3cbd1]">
                            ₹{currentUser.walletBalance || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="p-3 text-[#E34222] dark:text-[#E06A50] hover:bg-[#E34222]/10 rounded-xl transition cursor-pointer disabled:opacity-50"
                    aria-label="Logout"
                  >
                    {isLoggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthOpen(true);
                  }}
                  className="w-full py-3.5 rounded-[8px] bg-[#213650] hover:bg-[#142238] dark:bg-[#354f68] dark:hover:bg-[#213650] text-white font-bold text-base flex items-center justify-center gap-2 active:scale-98 transition shadow-xs hover:bg-[#101c2f] dark:hover:bg-[#406780]"
                >
                  <span>{t("nav.signIn", "Login or Sign Up")}</span>
                  <ArrowRight size={18} />
                </button>
              )}

              {/* Language, theme, and notifications in mobile drawer */}
              <div className="flex items-center justify-between pt-2 gap-2">
                <ThemeToggle variant="pill" />
                <LanguageSelector variant="pill" />
                <NotificationToggle />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MOBILE PROFILE BOTTOM SHEET ================= */}
      <AnimatePresence>
        {profileOpen && currentUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed inset-x-0 bottom-0 bg-[var(--surface-raised)] text-[var(--text-primary)] rounded-t-xl shadow-xl z-50 lg:hidden overflow-hidden max-h-[85vh] overflow-y-auto border-t border-[var(--border-default)]"
            >
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />
              <UberProfileDropdown
                userData={currentUser}
                handleLogout={handleLogout}
                isLoggingOut={isLoggingOut}
                router={router}
                onClose={() => setProfileOpen(false)}
                mobile
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

/* ================= UBER-STYLE PROFILE DROPDOWN COMPONENT ================= */
function UberProfileDropdown({
  userData,
  handleLogout,
  isLoggingOut,
  router,
  onClose,
  mobile,
}: {
  userData: any;
  handleLogout: () => void;
  isLoggingOut?: boolean;
  router: any;
  onClose: () => void;
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? "p-6 pb-10" : "p-5"}>
      {/* 1. USER HEADER WITH STAR RATING & AVATAR */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-[#425b73]">
        <div className="min-w-0 pr-3">
          <p className="font-extrabold text-xl text-zinc-900 dark:text-[#f3f8f6] truncate">
            {userData?.name || "RideNow Member"}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#263d54] text-zinc-800 dark:text-[#f3f8f6] text-xs font-bold">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>{userData?.rating ? Number(userData.rating).toFixed(1) : "5.0"}</span>
            </div>
            <span className="text-xs uppercase font-extrabold text-zinc-400 dark:text-[#b3cbd1] tracking-wider">
              {userData?.role === "vendor" ? "Partner" : "Rider"}
            </span>
          </div>
        </div>

        <div className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-[#365671] text-white flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm">
          {userData?.name?.charAt(0).toUpperCase() || "R"}
        </div>
      </div>

      {/* 2. THREE QUICK-ACTION TILES (HELP, WALLET, ACTIVITY) */}
      <div className="grid grid-cols-3 gap-2 py-3.5 border-b border-zinc-100 dark:border-[#425b73]">
        <button
          onClick={() => {
            onClose();
            router.push("/faq");
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-100 dark:bg-[#263d54] hover:bg-zinc-200 dark:hover:bg-[#2a425a] transition active:scale-95 text-zinc-800 dark:text-[#f3f8f6]"
        >
          <HelpCircle size={22} className="text-zinc-700 dark:text-[#b3cbd1] mb-1" />
          <span className="text-xs font-bold">Help</span>
        </button>

        <button
          onClick={() => {
            onClose();
            router.push(userData?.role === "vendor" ? "/partner/wallet" : "/wallet");
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-100 dark:bg-[#263d54] hover:bg-zinc-200 dark:hover:bg-[#2a425a] transition active:scale-95 text-zinc-800 dark:text-[#f3f8f6]"
        >
          <Wallet size={22} className="text-zinc-700 dark:text-[#b3cbd1] mb-1" />
          <span className="text-xs font-bold">Wallet</span>
        </button>

        <button
          onClick={() => {
            onClose();
            router.push(userData?.role === "vendor" ? "/partner/bookings" : "/bookings");
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-100 dark:bg-[#263d54] hover:bg-zinc-200 dark:hover:bg-[#2a425a] transition active:scale-95 text-zinc-800 dark:text-[#f3f8f6]"
        >
          <FileText size={22} className="text-zinc-700 dark:text-[#b3cbd1] mb-1" />
          <span className="text-xs font-bold">Activity</span>
        </button>
      </div>

      {/* 3. UBER CASH / RIDENOW WALLET BANNER */}
      <div
        onClick={() => {
          onClose();
          router.push(userData?.role === "vendor" ? "/partner/wallet" : "/wallet");
        }}
        className="mt-3.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#263d54] border border-zinc-200/80 dark:border-[#4e697f] flex items-center justify-between cursor-pointer hover:bg-zinc-100 dark:hover:bg-[#2a425a] transition active:scale-98"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-[#b3cbd1]">RideNow Wallet</p>
          <p className="text-sm font-semibold text-zinc-700 dark:text-[#b3cbd1] mt-0.5">Available Balance</p>
        </div>
        <p className="text-2xl font-black text-zinc-950 dark:text-[#f3f8f6]">₹{userData?.walletBalance || 0}</p>
      </div>

      {/* 4. STRUCTURED ACTION LINKS */}
      <div className="py-2 divide-y divide-zinc-100 dark:divide-[#425b73] text-sm font-semibold text-zinc-800 dark:text-[#f3f8f6]">
        <button
          onClick={() => {
            onClose();
            router.push("/profile");
          }}
          className="w-full flex items-center gap-3 py-3 px-2 hover:bg-zinc-100 dark:hover:bg-[#263d54] rounded-xl transition text-left cursor-pointer"
        >
          <UserIcon size={18} className="text-zinc-600 dark:text-[#b3cbd1]" />
          <span>Manage account</span>
          <ChevronRight size={16} className="ml-auto text-zinc-400 dark:text-zinc-600" />
        </button>

        <button
          onClick={() => {
            onClose();
            router.push("/settings");
          }}
          className="w-full flex items-center gap-3 py-3 px-2 hover:bg-zinc-100 dark:hover:bg-[#263d54] rounded-xl transition text-left cursor-pointer"
        >
          <SettingsIcon size={18} className="text-zinc-600 dark:text-[#b3cbd1]" />
          <span>Settings</span>
          <ChevronRight size={16} className="ml-auto text-zinc-400 dark:text-zinc-600" />
        </button>

        {userData?.role !== "vendor" ? (
          <button
            onClick={() => {
              onClose();
              router.push("/partner/onboard/vehicle");
            }}
            className="w-full flex items-center gap-3 py-3 px-2 hover:bg-zinc-100 dark:hover:bg-[#263d54] rounded-xl transition text-left"
          >
            <Car size={18} className="text-zinc-600 dark:text-[#b3cbd1]" />
            <span>Drive with RideNow</span>
            <ChevronRight size={16} className="ml-auto text-zinc-400 dark:text-zinc-600" />
          </button>
        ) : (
          <button
            onClick={() => {
              onClose();
              router.push("/partners/dashboard");
            }}
            className="w-full flex items-center gap-3 py-3 px-2 hover:bg-zinc-100 dark:hover:bg-[#263d54] rounded-xl transition text-left"
          >
            <ShieldCheck size={18} className="text-zinc-600 dark:text-[#b3cbd1]" />
            <span>Partner Dashboard</span>
            <ChevronRight size={16} className="ml-auto text-zinc-400 dark:text-zinc-600" />
          </button>
        )}

        {userData?.role === "admin" && (
          <button
            onClick={() => {
              onClose();
              router.push("/admin/dashboard");
            }}
            className="w-full flex items-center gap-3 py-3 px-2 hover:bg-zinc-100 dark:hover:bg-[#263d54] rounded-xl transition text-left text-amber-600 dark:text-amber-400"
          >
            <ShieldCheck size={18} />
            <span>Admin Control Panel</span>
            <ChevronRight size={16} className="ml-auto text-amber-500 dark:text-amber-400" />
          </button>
        )}
      </div>

      {/* 5. RED SIGN OUT BUTTON */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full mt-2 py-3 rounded-2xl text-red-600 dark:text-[#E06A50] font-bold hover:bg-red-50 dark:hover:bg-[#E34222]/10 transition active:scale-98 text-center text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isLoggingOut ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Signing out...</span>
          </>
        ) : (
          <span>Sign out</span>
        )}
      </button>
    </div>
  );
}