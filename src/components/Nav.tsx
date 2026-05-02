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
  Bike,
  Car,
  Truck,
  ChevronRight,
} from "lucide-react";
import AuthModal from "./AuthModal";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { signOut } from "next-auth/react";
import { setUserData } from "@/redux/userSlice";
import axios from "axios";

const NAV_ITEMS = ["Home", "Bookings", "Fleet", "FAQ", "Contact"];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  const pathname = usePathname();
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);

  /* Scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Fetch vendor counts */
  useEffect(() => {
    if (userData?.role !== "vendor") return;

    const fetchCounts = async () => {
      try {
        const res = await axios.get("/api/partner/bookings/counts");
        setPendingCount(res.data.pending || 0);
        setActiveCount(res.data.active || 0);
      } catch {}
    };

    fetchCounts();
 
  }, [userData]);

  /* Close on route change */
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  /* Desktop outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    dispatch(setUserData(null));
    setProfileOpen(false);
    router.push("/");
  };

  const renderNavItems = () => {
    if (userData?.role === "vendor") {
      return (
        <>
         <Link
            href="/partner/active-ride"
            className="relative text-sm font-medium text-gray-300 hover:text-white transition"
          >
            Active Ride
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-5 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/partner/pending-requests"
            className="relative text-sm font-medium text-gray-300 hover:text-white transition"
          >
            Pending Requests
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-5 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/partner/bookings"
            className="relative text-sm font-medium text-gray-300 hover:text-white transition"
          >
            My Bookings
            {activeCount > 0 && (
              <span className="absolute -top-2 -right-5 w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </Link>
        </>
      );
    }

    return NAV_ITEMS.map((item) => {
      const href = `/${item.toLowerCase()}`;
      const active = pathname === href;
      return (
        <Link
          key={item}
          href={href}
          className={`text-sm font-medium transition ${
            active
              ? "text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {item}
        </Link>
      );
    });
  };

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`fixed top-3 left-1/2 -translate-x-1/2
        w-[94%] md:w-[86%]
        z-50 rounded-full bg-[#0B0B0B] text-white
        shadow-[0_15px_50px_rgba(0,0,0,0.7)]
        ${scrolled ? "py-2" : "py-3"}`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-center">
            <Image src="/logo.jpeg" alt="RideNow" width={44} height={44} priority />
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-10">
            {renderNavItems()}
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3 relative">

            {/* DESKTOP PROFILE */}
            <div className="hidden md:block relative" ref={profileRef}>
              {!userData ? (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-6 py-2.5 rounded-full border border-white/20 text-sm font-semibold hover:bg-white hover:text-black transition"
                >
                  Login
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setProfileOpen((p) => !p)}
                    className="w-11 h-11 rounded-full bg-white text-black font-bold"
                  >
                    {userData.name?.charAt(0).toUpperCase()}
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-14 right-0 w-[300px] bg-white text-black rounded-2xl shadow-xl border"
                      >
                        <ProfileContent userData={userData} handleLogout={handleLogout} router={router} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {/* MOBILE PROFILE BUTTON */}
            <div className="md:hidden">
              {!userData ? (
                <button onClick={() => setAuthOpen(true)} className="px-4 py-1.5 rounded-full bg-white text-black text-sm">
                  Login
                </button>
              ) : (
                <button
                  onClick={() => setProfileOpen(true)}
                  className="w-9 h-9 rounded-full bg-white text-black font-bold"
                >
                  {userData.name?.charAt(0).toUpperCase()}
                </button>
              )}
            </div>

            {/* BURGER */}
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="md:hidden text-white"
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* MOBILE MENU */}
      {/* MOBILE MENU */}
<AnimatePresence>
  {menuOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        onClick={() => setMenuOpen(false)}
        className="fixed inset-0 bg-black z-30 md:hidden"
      />

      {/* Menu Panel */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="
          fixed top-[85px] left-1/2 -translate-x-1/2
          w-[92%]
          bg-[#0B0B0B]
          rounded-2xl
          shadow-2xl
          z-40
          md:hidden
          overflow-hidden
        "
      >
        <div className="flex flex-col divide-y divide-white/10">

          {userData?.role === "vendor" ? (
            <>
            <Link
                href="/partner/active-ride"
                className="flex justify-between items-center px-6 py-4 text-gray-300 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                <span>Active Ride</span>
               
              </Link>
              <Link
                href="/partner/pending-requests"
                className="flex justify-between items-center px-6 py-4 text-gray-300 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                <span>Pending Requests</span>
                {pendingCount > 0 && (
                  <span className="w-6 h-6 bg-red-500 text-xs rounded-full flex items-center justify-center font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>

              <Link
                href="/partner/bookings"
                className="flex justify-between items-center px-6 py-4 text-gray-300 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                <span>My Bookings</span>
                {activeCount > 0 && (
                  <span className="w-6 h-6 bg-green-500 text-xs rounded-full flex items-center justify-center font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </Link>
            </>
          ) : (
            NAV_ITEMS.map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                className="px-6 py-4 text-gray-300 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </Link>
            ))
          )}

        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>

      {/* MOBILE PROFILE SHEET */}
      <AnimatePresence>
        {profileOpen && userData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden"
            >
              <ProfileContent userData={userData} handleLogout={handleLogout} router={router} mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

function ProfileContent({ userData, handleLogout, router, mobile }: any) {
  return (
    <div className={`${mobile ? "p-6 pb-10" : "p-5"}`}>
      <p className="font-semibold text-lg">{userData.name}</p>
      <p className="text-xs uppercase text-gray-500 mb-4">{userData.role}</p>

      {userData.role !== "vendor" && (
        <button
          onClick={() => router.push("/partner/onboard/vehicle")}
          className="w-full flex items-center gap-3 py-3 hover:bg-gray-100 rounded-xl"
        >
          <VehicleStack />
          Become a Partner
          <ChevronRight size={16} className="ml-auto" />
        </button>
      )}

      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 py-3 hover:bg-gray-100 rounded-xl mt-2"
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}

function VehicleStack() {
  return (
    <div className="flex -space-x-2">
      <Icon><Bike size={14} /></Icon>
      <Icon><Car size={14} /></Icon>
      <Icon><Truck size={14} /></Icon>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center">
      {children}
    </div>
  );
}