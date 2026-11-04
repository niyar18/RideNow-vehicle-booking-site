"use client";

import { HomeIcon } from "@/shared/components/icons/AppIcons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User as UserIcon,
  Briefcase,
  Star,
  Lock,
  SunMoon,
  FileText,
  Eye,
  Smartphone,
  Globe,
  HeartHandshake,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  Check,
  X,
  LogOut,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
  Bell,
  CheckCircle2,
} from "lucide-react";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import AuthModal from "@/features/auth/components/AuthModal";
import { useTheme, Theme } from "@/context/ThemeContext";
import { useTranslation, Language, SUPPORTED_LANGUAGES } from "@/context/LanguageContext";
import { usePushNotifications } from "@/shared/hooks/usePushNotifications";
import { performFastSignOut } from "@/lib/authLogout";

interface SavedPlace {
  id: string;
  label: string;
  address: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { userData } = useSelector((state: RootState) => state.user);
  const { data: session, status: sessionStatus } = useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  const [mounted, setMounted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    | null
    | "home"
    | "work"
    | "savedPlaces"
    | "privacy"
    | "appearance"
    | "invoice"
    | "accessibility"
    | "communication"
    | "language"
    | "tip"
    | "payment"
    | "deleteAccount"
  >(null);

  // Local preferences state
  const [homeAddress, setHomeAddress] = useState("");
  const [workAddress, setWorkAddress] = useState("");
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [newPlaceLabel, setNewPlaceLabel] = useState("");
  const [newPlaceAddress, setNewPlaceAddress] = useState("");

  const [gstin, setGstin] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  const [defaultTip, setDefaultTip] = useState<number>(0);
  const [defaultPayment, setDefaultPayment] = useState<string>("wallet");

  // Accessibility toggles
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  // Communication toggles
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [smsFallback, setSmsFallback] = useState(true);

  // Privacy toggles
  const [shareTelemetry, setShareTelemetry] = useState(true);
  const [crashReporting, setCrashReporting] = useState(true);

  // Account erasure states
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setHomeAddress(localStorage.getItem("jaatri_home_address") || "");
      setWorkAddress(localStorage.getItem("jaatri_work_address") || "");
      
      const storedPlaces = localStorage.getItem("jaatri_saved_places");
      if (storedPlaces) {
        setSavedPlaces(JSON.parse(storedPlaces));
      }

      setGstin(localStorage.getItem("jaatri_invoice_gstin") || "");
      setBusinessName(localStorage.getItem("jaatri_invoice_business") || "");
      setBillingAddress(localStorage.getItem("jaatri_invoice_address") || "");

      const storedTip = localStorage.getItem("jaatri_default_tip");
      if (storedTip) setDefaultTip(Number(storedTip));

      const storedPayment = localStorage.getItem("jaatri_default_payment");
      if (storedPayment) setDefaultPayment(storedPayment);

      setReduceMotion(localStorage.getItem("jaatri_reduce_motion") === "true");
      setHighContrast(localStorage.getItem("jaatri_high_contrast") === "true");
      setHapticFeedback(localStorage.getItem("jaatri_haptics") !== "false");

      setWhatsappAlerts(localStorage.getItem("jaatri_whatsapp_alerts") !== "false");
      setSmsFallback(localStorage.getItem("jaatri_sms_fallback") !== "false");
      setShareTelemetry(localStorage.getItem("jaatri_telemetry") !== "false");
    } catch {}
  }, []);

  const saveHome = (addr: string) => {
    setHomeAddress(addr);
    try {
      localStorage.setItem("jaatri_home_address", addr);
    } catch {}
    setActiveModal(null);
  };

  const saveWork = (addr: string) => {
    setWorkAddress(addr);
    try {
      localStorage.setItem("jaatri_work_address", addr);
    } catch {}
    setActiveModal(null);
  };

  const addCustomPlace = () => {
    if (!newPlaceLabel.trim() || !newPlaceAddress.trim()) return;
    const updated = [
      ...savedPlaces,
      {
        id: Date.now().toString(),
        label: newPlaceLabel.trim(),
        address: newPlaceAddress.trim(),
      },
    ];
    setSavedPlaces(updated);
    try {
      localStorage.setItem("jaatri_saved_places", JSON.stringify(updated));
    } catch {}
    setNewPlaceLabel("");
    setNewPlaceAddress("");
  };

  const removeCustomPlace = (id: string) => {
    const updated = savedPlaces.filter((p) => p.id !== id);
    setSavedPlaces(updated);
    try {
      localStorage.setItem("jaatri_saved_places", JSON.stringify(updated));
    } catch {}
  };

  const saveInvoiceInfo = () => {
    try {
      localStorage.setItem("jaatri_invoice_gstin", gstin.trim().toUpperCase());
      localStorage.setItem("jaatri_invoice_business", businessName.trim());
      localStorage.setItem("jaatri_invoice_address", billingAddress.trim());
    } catch {}
    setActiveModal(null);
  };

  const selectTip = (val: number) => {
    setDefaultTip(val);
    try {
      localStorage.setItem("jaatri_default_tip", String(val));
    } catch {}
    setActiveModal(null);
  };

  const selectPayment = (val: string) => {
    setDefaultPayment(val);
    try {
      localStorage.setItem("jaatri_default_payment", val);
    } catch {}
    setActiveModal(null);
  };

  const toggleAccessibility = (key: "motion" | "contrast" | "haptics") => {
    try {
      if (key === "motion") {
        const next = !reduceMotion;
        setReduceMotion(next);
        localStorage.setItem("jaatri_reduce_motion", String(next));
      } else if (key === "contrast") {
        const next = !highContrast;
        setHighContrast(next);
        localStorage.setItem("jaatri_high_contrast", String(next));
        if (next) {
          document.documentElement.classList.add("contrast-more");
        } else {
          document.documentElement.classList.remove("contrast-more");
        }
      } else if (key === "haptics") {
        const next = !hapticFeedback;
        setHapticFeedback(next);
        localStorage.setItem("jaatri_haptics", String(next));
      }
    } catch {}
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await performFastSignOut("/");
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      setDeleteError(null);
      const res = await fetch("/api/user/delete-account", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDeleteSuccess(true);
        setTimeout(async () => {
          await performFastSignOut("/");
        }, 2000);
      } else {
        setDeleteError(data.error || "Failed to process account deletion request");
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to process erasure request");
    } finally {
      setDeletingAccount(false);
    }
  };

  const currentUser = userData || session?.user;
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const getAppearanceSubtitle = () => {
    if (theme === "system") return "Use device settings";
    if (theme === "dark") return "Forest Dark";
    return "Warm Ivory (Light)";
  };

  return (
    <div className="w-full min-h-screen bg-[#FAF7F0] dark:bg-[#061A16] text-[#10251C] dark:text-[#F7F5ED] flex flex-col justify-between font-sans transition-colors duration-200">
      <Nav />

      {/* Subtle Background dot pattern */}
      <div
        className="fixed inset-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #DED7CA 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.5,
        }}
      />

      <main className="relative max-w-xl mx-auto w-full px-3.5 sm:px-4 pt-24 sm:pt-28 pb-20 z-10 flex-1">
        {/* Top Header Bar */}
        <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.back()}
            className="w-10 h-10 rounded-[8px] bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] shadow-2xs flex items-center justify-center hover:bg-[#FAF7F0] dark:hover:bg-[#143D32] transition-colors shrink-0 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft size={18} className="text-[#10251C] dark:text-[#F7F5ED]" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] tracking-tight leading-none">
              Settings
            </h1>
          </div>
        </div>

        {/* ── PROFILE HERO TILE (Matching Screenshot) ── */}
        <div className="mb-6">
          {currentUser ? (
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/profile")}
              className="bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#1E3E34] rounded-[14px] p-4 sm:p-5 flex items-center justify-between gap-3 shadow-2xs cursor-pointer hover:border-[#123D32]/40 dark:hover:border-[#34443A] transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-full bg-stone-300 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xl shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <UserIcon size={24} />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-[#10251C] dark:text-[#F7F5ED] truncate">
                    {currentUser.name || "Jaatri Member"}
                  </h2>
                  <p className="text-xs sm:text-[13px] text-[#696B64] dark:text-[#B9C8BF] truncate">
                    {(currentUser as any).mobileNumber
                      ? `+91 ${(currentUser as any).mobileNumber}`
                      : (currentUser as any).phone || "No phone added"}
                  </p>
                  <p className="text-xs sm:text-[13px] text-[#696B64] dark:text-[#B9C8BF] truncate">
                    {currentUser.email || "No email linked"}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#696B64] dark:text-[#B9C8BF] shrink-0" />
            </motion.div>
          ) : (
            <div className="bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#1E3E34] rounded-[14px] p-5 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-stone-300 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold shrink-0">
                  <UserIcon size={22} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#10251C] dark:text-[#F7F5ED]">Sign in to Jaatri</h2>
                  <p className="text-xs text-[#696B64] dark:text-[#B9C8BF]">Sync saved places and preferences</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] text-white text-xs font-bold transition cursor-pointer shrink-0"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* ── GROUP 1: APP SETTINGS ── */}
        <div className="mb-7">
          <h3 className="text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] mb-2 px-1">
            App settings
          </h3>

          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#1E3E34] rounded-[14px] overflow-hidden divide-y divide-[#DED7CA]/70 dark:divide-[#1E3E34] shadow-2xs">
            {/* Home */}
            <SettingRow
              icon={HomeIcon}
              title="Home"
              subtitle={homeAddress || "Add home"}
              onClick={() => setActiveModal("home")}
            />

            {/* Work */}
            <SettingRow
              icon={Briefcase}
              title="Work"
              subtitle={workAddress || "Add work"}
              onClick={() => setActiveModal("work")}
            />

            {/* Saved places */}
            <SettingRow
              icon={Star}
              title="Saved places"
              subtitle={savedPlaces.length > 0 ? `${savedPlaces.length} custom places saved` : "Manage quick-access destinations"}
              onClick={() => setActiveModal("savedPlaces")}
            />

            {/* Privacy */}
            <SettingRow
              icon={Lock}
              title="Privacy"
              subtitle="Manage the data you share with us"
              onClick={() => setActiveModal("privacy")}
            />

            {/* Appearance */}
            <SettingRow
              icon={SunMoon}
              title="Appearance"
              subtitle={getAppearanceSubtitle()}
              onClick={() => setActiveModal("appearance")}
            />

            {/* Invoice information */}
            <SettingRow
              icon={FileText}
              title="Invoice information"
              subtitle={gstin ? `GSTIN: ${gstin}` : "Manage your tax invoices information"}
              onClick={() => setActiveModal("invoice")}
            />

            {/* Accessibility */}
            <SettingRow
              icon={Eye}
              title="Accessibility"
              subtitle="Manage your accessibility settings"
              onClick={() => setActiveModal("accessibility")}
            />

            {/* Communication */}
            <SettingRow
              icon={Smartphone}
              title="Communication"
              subtitle="Choose your preferred contact methods and notification settings"
              onClick={() => setActiveModal("communication")}
            />

            {/* Language */}
            <SettingRow
              icon={Globe}
              title="Language"
              subtitle={currentLang.nativeName}
              onClick={() => setActiveModal("language")}
            />
          </div>
        </div>

        {/* ── GROUP 2: TRIP PREFERENCES ── */}
        <div className="mb-7">
          <h3 className="text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] mb-2 px-1">
            Trip preferences
          </h3>

          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#1E3E34] rounded-[14px] overflow-hidden divide-y divide-[#DED7CA]/70 dark:divide-[#1E3E34] shadow-2xs">
            {/* Tip automatically */}
            <SettingRow
              icon={HeartHandshake}
              title="Tip automatically"
              subtitle={defaultTip > 0 ? `₹${defaultTip} added to every ride` : "Set a default tip amount for every trip"}
              onClick={() => setActiveModal("tip")}
            />

            {/* Default payment */}
            <SettingRow
              icon={CreditCard}
              title="Default payment method"
              subtitle={
                defaultPayment === "wallet"
                  ? "Jaatri Wallet Balance"
                  : defaultPayment === "upi"
                  ? "UPI / QR Code"
                  : "Cash on Drop"
              }
              onClick={() => setActiveModal("payment")}
            />

            {/* Safety & Emergency Contacts */}
            <SettingRow
              icon={ShieldCheck}
              title="Safety & 24/7 SOS"
              subtitle="Configure emergency contacts and ride telemetry"
              onClick={() => router.push("/safety")}
            />
          </div>
        </div>

        {/* ── GROUP 3: ACCOUNT & SESSION ACTIONS ── */}
        {currentUser && (
          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full py-3.5 px-4 rounded-[12px] bg-[#FAF7F0] dark:bg-[#0B2822] border border-red-200 dark:border-red-950/60 text-red-600 dark:text-[#E06A50] font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-98 transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSigningOut ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut size={16} />
                  <span>Sign out</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteSuccess(false);
                setActiveModal("deleteAccount");
              }}
              className="w-full py-2.5 text-xs font-semibold text-[#696B64] dark:text-[#B9C8BF] hover:text-red-500 transition text-center"
            >
              Request Account Erasure (DPDP Act, 2023)
            </button>
          </div>
        )}
      </main>

      <Footer />

      {/* ── MODALS & BOTTOM SHEETS ── */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-lg bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#1E3E34] rounded-t-[20px] sm:rounded-[16px] shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Modal Drag Bar for mobile */}
              <div className="w-12 h-1 bg-stone-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

              {/* HOME MODAL */}
              {activeModal === "home" && (
                <div>
                  <ModalHeader title="Set Home Address" onClose={() => setActiveModal(null)} />
                  <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mb-3">
                    Your home address is saved locally on your device for one-tap pickup or destination selection.
                  </p>
                  <input
                    type="text"
                    defaultValue={homeAddress}
                    id="home-input"
                    placeholder="e.g. Ramani Kanta Bhawan, Dispur, Guwahati"
                    className="w-full bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] px-3.5 py-2.5 text-sm font-medium text-[#10251C] dark:text-[#F7F5ED] mb-4 outline-none focus:border-[#046A38]"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 rounded-[8px] text-xs font-semibold text-[#696B64] hover:bg-black/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const val = (document.getElementById("home-input") as HTMLInputElement)?.value || "";
                        saveHome(val);
                      }}
                      className="px-5 py-2 rounded-[8px] bg-[#046A38] text-white text-xs font-bold hover:bg-[#03532C]"
                    >
                      Save Home
                    </button>
                  </div>
                </div>
              )}

              {/* WORK MODAL */}
              {activeModal === "work" && (
                <div>
                  <ModalHeader title="Set Work Address" onClose={() => setActiveModal(null)} />
                  <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mb-3">
                    Your workplace address enables rapid daily commute booking.
                  </p>
                  <input
                    type="text"
                    defaultValue={workAddress}
                    id="work-input"
                    placeholder="e.g. Tech Park, VIP Road, Guwahati"
                    className="w-full bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] px-3.5 py-2.5 text-sm font-medium text-[#10251C] dark:text-[#F7F5ED] mb-4 outline-none focus:border-[#046A38]"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 rounded-[8px] text-xs font-semibold text-[#696B64] hover:bg-black/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const val = (document.getElementById("work-input") as HTMLInputElement)?.value || "";
                        saveWork(val);
                      }}
                      className="px-5 py-2 rounded-[8px] bg-[#046A38] text-white text-xs font-bold hover:bg-[#03532C]"
                    >
                      Save Work
                    </button>
                  </div>
                </div>
              )}

              {/* SAVED PLACES MODAL */}
              {activeModal === "savedPlaces" && (
                <div className="flex-1 overflow-y-auto">
                  <ModalHeader title="Saved Places" onClose={() => setActiveModal(null)} />
                  <div className="space-y-2 mb-4">
                    {savedPlaces.length === 0 ? (
                      <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] py-2 text-center">
                        No custom places added yet. Add your favorite gym, airport, or family residence below.
                      </p>
                    ) : (
                      savedPlaces.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-[8px] bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D]"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-[#10251C] dark:text-[#F7F5ED] truncate">{p.label}</p>
                            <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] truncate">{p.address}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomPlace(p.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-[6px]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#DED7CA] dark:border-[#1E3E34] space-y-2">
                    <p className="text-xs font-bold text-[#10251C] dark:text-[#F7F5ED]">Add new custom place</p>
                    <input
                      type="text"
                      value={newPlaceLabel}
                      onChange={(e) => setNewPlaceLabel(e.target.value)}
                      placeholder="Label (e.g. Gym, Airport, Parents)"
                      className="w-full bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] px-3 py-2 text-xs text-[#10251C] dark:text-[#F7F5ED] outline-none"
                    />
                    <input
                      type="text"
                      value={newPlaceAddress}
                      onChange={(e) => setNewPlaceAddress(e.target.value)}
                      placeholder="Full Address / Landmark"
                      className="w-full bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] px-3 py-2 text-xs text-[#10251C] dark:text-[#F7F5ED] outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCustomPlace}
                      disabled={!newPlaceLabel.trim() || !newPlaceAddress.trim()}
                      className="w-full py-2 bg-[#046A38] text-white rounded-[8px] text-xs font-bold disabled:opacity-40"
                    >
                      Add Place
                    </button>
                  </div>
                </div>
              )}

              {/* APPEARANCE MODAL */}
              {activeModal === "appearance" && (
                <div>
                  <ModalHeader title="Appearance & Theme" onClose={() => setActiveModal(null)} />
                  <div className="space-y-2 mb-4">
                    {[
                      { key: "system", label: "Use device settings", desc: "Matches your system dark/light mode" },
                      { key: "dark", label: "Forest Dark", desc: "Signature deep emerald & forest aesthetic" },
                      { key: "light", label: "Warm Ivory (Light)", desc: "Soft Assamese ivory & emerald palette" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setTheme(opt.key as Theme);
                          setActiveModal(null);
                        }}
                        className={`w-full p-3.5 rounded-[10px] border flex items-center justify-between text-left transition ${
                          theme === opt.key
                            ? "border-[#046A38] bg-[#E5EBDD] dark:bg-[#1D3428]"
                            : "border-[#DED7CA] dark:border-[#1E3E34] bg-white dark:bg-[#061A16]"
                        }`}
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F7F5ED]">{opt.label}</p>
                          <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF]">{opt.desc}</p>
                        </div>
                        {theme === opt.key && <Check size={18} className="text-[#046A38] dark:text-[#A8E0C0]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* INVOICE INFORMATION MODAL */}
              {activeModal === "invoice" && (
                <div>
                  <ModalHeader title="Tax Invoice Information" onClose={() => setActiveModal(null)} />
                  <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mb-3">
                    These credentials will appear on all your downloaded GST Tax Invoices.
                  </p>
                  <div className="space-y-2.5 mb-4">
                    <div>
                      <label className="text-[11px] font-bold text-[#696B64] uppercase block mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        placeholder="e.g. 18AABCR1234F1Z5"
                        className="w-full bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] px-3 py-2 text-xs text-[#10251C] dark:text-[#F7F5ED] uppercase outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#696B64] uppercase block mb-1">Company / Legal Name</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                        className="w-full bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] px-3 py-2 text-xs text-[#10251C] dark:text-[#F7F5ED] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#696B64] uppercase block mb-1">Billing Address</label>
                      <input
                        type="text"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="e.g. GS Road, Christian Basti, Guwahati"
                        className="w-full bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] px-3 py-2 text-xs text-[#10251C] dark:text-[#F7F5ED] outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 rounded-[8px] text-xs font-semibold text-[#696B64]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveInvoiceInfo}
                      className="px-5 py-2 rounded-[8px] bg-[#046A38] text-white text-xs font-bold"
                    >
                      Save Invoice Info
                    </button>
                  </div>
                </div>
              )}

              {/* ACCESSIBILITY MODAL */}
              {activeModal === "accessibility" && (
                <div>
                  <ModalHeader title="Accessibility Preferences" onClose={() => setActiveModal(null)} />
                  <div className="space-y-3 mb-4">
                    <ToggleOption
                      title="Reduce Motion"
                      description="Minimizes smooth page and sheet spring transitions"
                      checked={reduceMotion}
                      onChange={() => toggleAccessibility("motion")}
                    />
                    <ToggleOption
                      title="High Contrast"
                      description="Maximizes border lines and high-contrast text markers"
                      checked={highContrast}
                      onChange={() => toggleAccessibility("contrast")}
                    />
                    <ToggleOption
                      title="Tactile Feedback"
                      description="Haptic vibration when tapping buttons and tabs"
                      checked={hapticFeedback}
                      onChange={() => toggleAccessibility("haptics")}
                    />
                  </div>
                </div>
              )}

              {/* COMMUNICATION MODAL */}
              {activeModal === "communication" && (
                <div>
                  <ModalHeader title="Communication Channels" onClose={() => setActiveModal(null)} />
                  <div className="space-y-3 mb-4">
                    <ToggleOption
                      title="Push Notifications"
                      description="Instant alerts when driver arrives or trip status updates"
                      checked={isSubscribed}
                      onChange={async () => {
                        if (isSubscribed) await unsubscribe();
                        else await subscribe();
                      }}
                    />
                    <ToggleOption
                      title="WhatsApp Trip Alerts"
                      description="Receive booking confirmation and tracking links on WhatsApp"
                      checked={whatsappAlerts}
                      onChange={() => {
                        const next = !whatsappAlerts;
                        setWhatsappAlerts(next);
                        try {
                          localStorage.setItem("jaatri_whatsapp_alerts", String(next));
                        } catch {}
                      }}
                    />
                    <ToggleOption
                      title="SMS Fallback"
                      description="Emergency SMS receipts if internet connectivity drops"
                      checked={smsFallback}
                      onChange={() => {
                        const next = !smsFallback;
                        setSmsFallback(next);
                        try {
                          localStorage.setItem("jaatri_sms_fallback", String(next));
                        } catch {}
                      }}
                    />
                  </div>
                </div>
              )}

              {/* LANGUAGE MODAL */}
              {activeModal === "language" && (
                <div>
                  <ModalHeader title="Select App Language" onClose={() => setActiveModal(null)} />
                  <div className="space-y-2 mb-4">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.code);
                          setActiveModal(null);
                        }}
                        className={`w-full p-3.5 rounded-[10px] border flex items-center justify-between text-left transition ${
                          language === lang.code
                            ? "border-[#046A38] bg-[#E5EBDD] dark:bg-[#1D3428]"
                            : "border-[#DED7CA] dark:border-[#1E3E34] bg-white dark:bg-[#061A16]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{lang.flag}</span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F7F5ED]">{lang.nativeName}</p>
                            <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF]">{lang.name}</p>
                          </div>
                        </div>
                        {language === lang.code && <Check size={18} className="text-[#046A38] dark:text-[#A8E0C0]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TIP PREFERENCES MODAL */}
              {activeModal === "tip" && (
                <div>
                  <ModalHeader title="Default Tip Amount" onClose={() => setActiveModal(null)} />
                  <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mb-3">
                    Automatically adds a tip to thank your driver partner upon safe trip completion.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { val: 0, label: "No tip (₹0)" },
                      { val: 10, label: "₹10" },
                      { val: 20, label: "₹20" },
                      { val: 50, label: "₹50" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => selectTip(opt.val)}
                        className={`p-3 rounded-[8px] border text-center font-bold text-xs transition ${
                          defaultTip === opt.val
                            ? "border-[#046A38] bg-[#E5EBDD] dark:bg-[#1D3428] text-[#046A38] dark:text-[#A8E0C0]"
                            : "border-[#DED7CA] dark:border-[#24483D] bg-white dark:bg-[#061A16] text-[#10251C] dark:text-[#F7F5ED]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PAYMENT PREFERENCE MODAL */}
              {activeModal === "payment" && (
                <div>
                  <ModalHeader title="Default Payment Method" onClose={() => setActiveModal(null)} />
                  <div className="space-y-2 mb-4">
                    {[
                      { key: "wallet", label: "Jaatri Wallet Balance", desc: "Instant checkout with zero payment failures" },
                      { key: "upi", label: "UPI / QR Code", desc: "Pay with GPay, PhonePe, Paytm, or BHIM" },
                      { key: "cash", label: "Cash on Drop", desc: "Pay driver directly at trip conclusion" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => selectPayment(opt.key)}
                        className={`w-full p-3.5 rounded-[10px] border flex items-center justify-between text-left transition ${
                          defaultPayment === opt.key
                            ? "border-[#046A38] bg-[#E5EBDD] dark:bg-[#1D3428]"
                            : "border-[#DED7CA] dark:border-[#1E3E34] bg-white dark:bg-[#061A16]"
                        }`}
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F7F5ED]">{opt.label}</p>
                          <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF]">{opt.desc}</p>
                        </div>
                        {defaultPayment === opt.key && <Check size={18} className="text-[#046A38] dark:text-[#A8E0C0]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PRIVACY MODAL */}
              {activeModal === "privacy" && (
                <div>
                  <ModalHeader title="Privacy & Data Protection" onClose={() => setActiveModal(null)} />
                  <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mb-3">
                    Your personal information is governed under Section 12 of India&apos;s Digital Personal Data Protection (DPDP) Act, 2023.
                  </p>
                  <div className="space-y-3 mb-4">
                    <ToggleOption
                      title="Route Telemetry Sharing"
                      description="Shares live coordinates with emergency contacts and cloud dispatchers"
                      checked={shareTelemetry}
                      onChange={() => {
                        const next = !shareTelemetry;
                        setShareTelemetry(next);
                        try {
                          localStorage.setItem("jaatri_telemetry", String(next));
                        } catch {}
                      }}
                    />
                    <ToggleOption
                      title="Anonymous Diagnostics"
                      description="Helps improve map routing accuracy without linking identity"
                      checked={crashReporting}
                      onChange={() => setCrashReporting(!crashReporting)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      router.push("/privacy");
                    }}
                    className="w-full py-2.5 rounded-[8px] bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] text-xs font-bold text-[#10251C] dark:text-[#F7F5ED] hover:bg-black/5"
                  >
                    Read Full Privacy Policy
                  </button>
                </div>
              )}

              {/* DELETE ACCOUNT MODAL */}
              {activeModal === "deleteAccount" && (
                <div>
                  <ModalHeader title="Confirm Account Erasure" onClose={() => setActiveModal(null)} />
                  {deleteError && (
                    <div className="mb-3 p-3 rounded-[8px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{deleteError}</span>
                    </div>
                  )}

                  {deleteSuccess ? (
                    <div className="text-center py-4 space-y-2">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                      <h4 className="text-sm font-bold">Account Erased Successfully</h4>
                      <p className="text-xs text-[#696B64]">Redirecting you to home...</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mb-3">
                        Are you sure you want to permanently delete your Jaatri account? Your name, mobile number, and saved locations will be scrubbed immediately.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveModal(null)}
                          className="px-4 py-2 rounded-[8px] text-xs font-semibold text-[#696B64]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                          className="px-5 py-2 rounded-[8px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {deletingAccount ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          <span>Permanently Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

/* ================= HELPER COMPONENTS ================= */

function SettingRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="w-full min-h-[58px] p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        <div className="w-8 h-8 rounded-full bg-stone-200/80 dark:bg-[#10352C] text-[#123D32] dark:text-[#A8E0C0] flex items-center justify-center shrink-0">
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#10251C] dark:text-[#F7F5ED] leading-tight">
            {title}
          </p>
          <p className="text-[12px] text-[#696B64] dark:text-[#B9C8BF] truncate mt-0.5 leading-tight">
            {subtitle}
          </p>
        </div>
      </div>
      <ChevronRight size={17} className="text-[#696B64]/60 dark:text-[#B9C8BF]/60 shrink-0" />
    </motion.button>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-[#DED7CA]/70 dark:border-[#1E3E34] mb-3">
      <h3 className="text-base font-bold font-serif text-[#10251C] dark:text-[#F7F5ED]">{title}</h3>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-[6px] hover:bg-black/5 dark:hover:bg-white/5 text-[#696B64] dark:text-[#B9C8BF]"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function ToggleOption({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-[10px] bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D]">
      <div className="min-w-0 pr-3">
        <p className="text-xs font-bold text-[#10251C] dark:text-[#F7F5ED]">{title}</p>
        <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
          checked ? "bg-[#046A38]" : "bg-stone-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
