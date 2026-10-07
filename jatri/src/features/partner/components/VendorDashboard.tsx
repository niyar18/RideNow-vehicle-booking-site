"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Lock,
  ArrowRight,
  Clock,
  IndianRupee,
  ImagePlus,
  AlertTriangle,
  Video,
  MapPin,
  Edit3,
  Loader2,
  Navigation,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Shield,
  Car,
  FileText,
  Landmark,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getSocket } from "@/lib/socket";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import PartnerEarningsChart from "./PartnerEarningsChart";
import DriverWalletCard from "./DriverWalletCard";
import dynamic from "next/dynamic";
import { useTranslation } from "@/context/LanguageContext";

const DriverLocationMap = dynamic(() => import("@/features/maps/components/DriverLocationMap"), { ssr: false });


/* ================= TYPES ================= */

type VendorStatus = "pending" | "approved" | "rejected";

type ReviewStatus = "pending" | "approved" | "rejected";

type VideoKycStatus =
  | "not_required"
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected";

type PricingData = {
  baseFare?: number;
  pricePerKm?: number;
  waitingCharge?: number;
  imageUrl?: string;
  status?: ReviewStatus;
  rejectionReason?: string;
};

type Step = {
  id: number;
  title: string;
  route?: string;
};

/* ================= STEPS ================= */

const STEPS: Step[] = [
  { id: 1, title: "Vehicle", route: "/partner/onboard/vehicle" },
  { id: 2, title: "Documents", route: "/partner/onboard/documents" },
  { id: 3, title: "Bank", route: "/partner/onboard/bank" },
  { id: 4, title: "Doc Review" },
  { id: 5, title: "Video KYC" },
  { id: 6, title: "Vehicle Photo" },
  { id: 7, title: "Live" },
];

const TOTAL_STEPS = STEPS.length;

/* ================= DASHBOARD ================= */

export default function VendorDashboard({
  vendorStep,
  vendorStatus,
  videoKycStatus: propVideoKycStatus,
  initialPricing,
  initialUserData,
}: {
  vendorStep: number;
  vendorStatus: VendorStatus;
  videoKycStatus?: string;
  initialPricing?: PricingData | null;
  initialUserData?: any;
}) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector(
    (state: RootState) => state.user
  );

  const currentUser = userData || initialUserData;

  useEffect(() => {
    if (initialUserData && !userData) {
      dispatch(setUserData(initialUserData));
    }
  }, [initialUserData, userData, dispatch]);

  const [showPricing, setShowPricing] = useState(false);
  const [pricing, setPricing] = useState<PricingData | null>(initialPricing || null);
  const [loadingPricing, setLoadingPricing] = useState(!initialPricing);
  const [startingKyc, setStartingKyc] = useState(false);

  const startDriverKyc = async () => {
    try {
      setStartingKyc(true);
      const res = await axios.post("/api/partner/video-kyc/start");
      if (res.data?.roomId) {
        router.push(`/video-kyc/${res.data.roomId}`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to start Video KYC");
    } finally {
      setStartingKyc(false);
    }
  };

  const requestKycAgain = async () => {
    try {
      await axios.patch("/api/partner/video-kyc/request");
      const meRes = await axios.get("/api/me");
      if (meRes?.data) {
        dispatch(setUserData(meRes.data));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Error requesting Video KYC");
    }
  };

  const videoKycStatus: VideoKycStatus =
    (propVideoKycStatus as any) ||
    currentUser?.videoKycStatus ||
    "not_required";

  const getActiveStep = () => {
    if (pricing?.status === "approved" || vendorStep >= 7) {
      return 7; // Live
    }

    if (vendorStep < 1) return 1;
    if (vendorStep < 2) return 2;
    if (vendorStep < 3) return 3;

    // Step 4: Documents under review by admin
    if (vendorStatus !== "approved" || vendorStep < 4) {
      return 4;
    }

    // Step 5: Video KYC
    if (videoKycStatus !== "approved" && videoKycStatus !== "not_required") {
      return 5;
    }

    // Step 6: Vehicle Photo & Review
    return 6;
  };

  const activeStep = getActiveStep();

  const progressPercent =
    ((activeStep - 1) / (TOTAL_STEPS - 1)) * 100;

  const roomId = currentUser?.videoKycRoomId;

  /* ================= LOAD PRICING ================= */

  useEffect(() => {
    axios
      .get("/api/partner/vehicle/pricing")
      .then((res) => {
        if (res.data?.pricing) {
          setPricing(res.data.pricing);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPricing(false));
  }, []);

  const isLive =
    activeStep === 7 ||
    vendorStep >= 7 ||
    (pricing?.status === "approved" && videoKycStatus === "approved");

  /* ================= BACKGROUND POLLING (AUTO REFRESH STEPS) ================= */

  useEffect(() => {
    const fetchSync = async () => {
      try {
        const [meRes, pricingRes] = await Promise.all([
          axios.get("/api/me", { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }).catch(() => null),
          axios.get("/api/partner/vehicle/pricing", { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }).catch(() => null),
        ]);

        if (meRes?.data) {
          dispatch(setUserData(meRes.data));
        }
        if (pricingRes?.data?.pricing) {
          setPricing(pricingRes.data.pricing);
        }
      } catch (e) {}
    };

    fetchSync();

    if (isLive) return;

    const interval = setInterval(fetchSync, 4000);
    return () => clearInterval(interval);
  }, [isLive, dispatch]);

  /* ================= NAVIGATION ================= */

  const goToStep = (step: Step) => {
    if (step.route && step.id <= activeStep) {
      router.push(step.route);
    } else if (step.id === 6 && activeStep === 6) {
      setShowPricing(true);
    }
  };

  /* ================= STATUS SECTION ================= */

  const renderStatus = () => {
    /* ===== STEP 1: VEHICLE DETAILS ===== */
    if (activeStep === 1) {
      return (
        <ActionCard
          icon={<Car size={24} />}
          title="Step 1: Vehicle Information"
          desc="Add your vehicle type, registration number, and model to begin partner onboarding."
          button="Enter Vehicle Details"
          onClick={() => router.push("/partner/onboard/vehicle")}
        />
      );
    }

    /* ===== STEP 2: DOCUMENTS UPLOAD ===== */
    if (activeStep === 2) {
      return (
        <ActionCard
          icon={<FileText size={24} />}
          title="Step 2: Upload Documents"
          desc="Upload your Driving License, Vehicle RC, and Aadhaar card for verification."
          button="Upload Documents"
          onClick={() => router.push("/partner/onboard/documents")}
        />
      );
    }

    /* ===== STEP 3: BANK DETAILS ===== */
    if (activeStep === 3) {
      return (
        <ActionCard
          icon={<Landmark size={24} />}
          title="Step 3: Bank Account & Payouts"
          desc="Provide your bank account details or UPI ID for direct trip payouts and earnings."
          button="Enter Bank Details"
          onClick={() => router.push("/partner/onboard/bank")}
        />
      );
    }

    /* ===== STEP 4: DOCUMENT REVIEW REJECTED ===== */
    if (activeStep === 4 && vendorStatus === "rejected") {
      return (
        <RejectionCard
          title="Documents Rejected"
          reason={currentUser?.vendorRejectionReason || "Some documents could not be verified."}
          actionLabel="Update Documents"
          onAction={() =>
            router.push("/partner/onboard/documents")
          }
        />
      );
    }

    /* ===== STEP 4: DOCUMENT REVIEW PENDING ===== */
    if (activeStep === 4) {
      return (
        <StatusCard
          icon={<Clock size={20} />}
          title="Documents Under Review"
          desc="Admin is reviewing your documents. Once approved, you will proceed to Video KYC."
        />
      );
    }

    /* ===== STEP 5: VIDEO KYC STEP ===== */
    if (activeStep === 5) {
      if (videoKycStatus === "approved") {
        return (
          <StatusCard
            icon={<Check size={20} />}
            title="Video KYC Approved"
            desc="Your identity is verified! Please proceed to upload your vehicle photograph."
          />
        );
      }

      if (videoKycStatus === "rejected") {
        return (
          <RejectionCard
            title="Video KYC Rejected"
            reason={currentUser?.videoKycRejectionReason || "Verification call could not be completed."}
            actionLabel="Request Again"
            onAction={requestKycAgain}
          />
        );
      }

      if (videoKycStatus === "in_progress" && roomId) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-blue-900 via-indigo-950 to-neutral-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-blue-500/30"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0 animate-pulse">
                <Video size={28} className="text-blue-400" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-blue-400">Call Session Ready</span>
                <h2 className="text-xl sm:text-2xl font-bold mt-0.5">Video KYC Call Active</h2>
                <p className="text-sm text-blue-200/80 mt-1">A verification room is open. Join now to complete your identity check.</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/video-kyc/${roomId}`)}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition transform hover:scale-105 shrink-0 flex items-center justify-center gap-2"
            >
              <Video size={18} /> Join Video KYC Call
            </button>
          </motion.div>
        );
      }

      return (
        <ActionCard
          icon={<Video size={24} />}
          title="Step 5: Live Video KYC Verification"
          desc="Your documents are approved! You can initiate your live 2-minute verification call now or wait for an admin to call."
          button={startingKyc ? "Connecting..." : "Start Video KYC"}
          onClick={startDriverKyc}
        />
      );
    }

    /* ===== STEP 6: VEHICLE PHOTO & REVIEW ===== */
    if (activeStep === 6) {
      if (pricing?.status === "pending") {
        return (
          <StatusCard
            icon={<Clock size={20} />}
            title="Vehicle Under Review"
            desc="Admin is reviewing your vehicle photograph. You'll be live as soon as it is approved."
          />
        );
      }

      if (pricing?.status === "rejected") {
        return (
          <RejectionCard
            title="Vehicle Photo Rejected"
            reason={pricing?.rejectionReason || "Please upload a clearer vehicle exterior photo."}
            actionLabel="Re-upload Vehicle Photo"
            onAction={() => setShowPricing(true)}
          />
        );
      }

      return (
        <ActionCard
          icon={<ImagePlus size={24} />}
          title="Step 6: Upload Vehicle Photo"
          desc="Your Video KYC is verified! Upload a clear photo of your vehicle exterior to finish onboarding."
          button="Upload Vehicle Photo"
          onClick={() => setShowPricing(true)}
        />
      );
    }

    /* ===== STEP 7: LIVE ===== */
    if (activeStep === 7) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black text-white rounded-3xl p-10 shadow-2xl"
        >
          <h2 className="text-2xl font-bold">
            🚀 You’re Live
          </h2>

          <button
            onClick={() => router.push("/partner/bookings")}
            className="mt-6 bg-white text-black px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
          >
            Go to Orders <ArrowRight size={16} />
          </button>
        </motion.div>
      );
    }

    return null;
  };

  /* ================= UI ================= */

  if (isLive) {
    return (
      <LiveVendorDashboard
        userData={currentUser}
        pricing={pricing}
        setShowPricing={setShowPricing}
        showPricing={showPricing}
      />
    );
  }

  /* Guard against flash while pricing is loading for onboarded or nearly onboarded partners */
  if ((activeStep >= 6 || vendorStep >= 6) && loadingPricing && !initialPricing) {
    return (
      <section className="min-h-screen bg-zinc-50 pt-28 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          <div className="h-10 bg-zinc-200 rounded-2xl w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-44 bg-zinc-200 rounded-3xl" />
            <div className="h-44 bg-zinc-200 rounded-3xl" />
            <div className="h-44 bg-zinc-200 rounded-3xl" />
          </div>
          <div className="h-96 bg-zinc-200 rounded-3xl" />
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 px-3 sm:px-6 pt-20 sm:pt-28 pb-16">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-12">

        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
            Vendor Onboarding
          </h1>
          <p className="text-zinc-600 text-xs sm:text-sm mt-1 sm:mt-2">
            Complete all steps to activate your partner driver account
          </p>
        </div>

        {/* MOBILE STEPPER (NATIVE APP STYLE) */}
        <div className="block md:hidden bg-white rounded-2xl p-4 shadow-lg border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Step {activeStep} of {TOTAL_STEPS}
            </span>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-black text-white">
              {STEPS[activeStep - 1]?.title || "Onboarding"}
            </span>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-black rounded-full"
            />
          </div>

          {/* Swipeable Step Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {STEPS.map((step) => {
              const completed = activeStep > step.id;
              const active = activeStep === step.id;
              const locked = step.id > activeStep;

              return (
                <button
                  key={step.id}
                  disabled={locked}
                  onClick={() => goToStep(step)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    completed
                      ? "bg-zinc-100 text-zinc-900 border border-zinc-300"
                      : active
                      ? "bg-black text-white shadow-md shadow-black/20"
                      : "bg-zinc-50 text-zinc-400 border border-zinc-200/60"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      completed ? "text-emerald-600" : active ? "text-white" : "text-zinc-400"
                    }`}
                  >
                    {completed ? "✓" : step.id}
                  </span>
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DESKTOP STEPPER */}
        <div className="hidden md:block bg-white rounded-3xl p-8 sm:p-10 shadow-xl border overflow-x-auto">
          <div className="relative min-w-[700px]">

            <div className="absolute top-7 left-0 w-full h-[3px] bg-gray-200 rounded-full" />

            <motion.div
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6 }}
              className="absolute top-7 left-0 h-[3px] bg-black rounded-full"
            />

            <div className="relative flex justify-between">
              {STEPS.map((step) => {
                const completed = activeStep > step.id;
                const active = activeStep === step.id;
                const locked = step.id > activeStep;

                return (
                  <motion.div
                    key={step.id}
                    whileHover={!locked ? { scale: 1.1 } : {}}
                    onClick={() => goToStep(step)}
                    className="flex flex-col items-center z-10 cursor-pointer"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all
                      ${
                        completed
                          ? "bg-black text-white border-black"
                          : active
                          ? "border-black bg-white"
                          : "border-gray-300 text-gray-400 bg-white"
                      }`}
                    >
                      {completed ? (
                        <Check size={20} />
                      ) : locked ? (
                        <Lock size={18} />
                      ) : (
                        step.id
                      )}
                    </div>

                    <p className="mt-3 text-sm font-semibold text-center">
                      {step.title}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {renderStatus()}
        <PartnerEarningsChart/>
      </div>

      <PricingModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        pricing={pricing}
        isLive={isLive}
        onSaved={(newPricing: any, newUserData: any) => {
          if (newPricing) setPricing(newPricing);
          if (newUserData) dispatch(setUserData(newUserData));
        }}
      />
    </section>
  );
}

/* ================= PRICING MODAL ================= */

function PricingModal({ open, onClose, pricing, isLive, onSaved }: any){
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitPricing = async () => {
    const formData = new FormData();
    if (image) formData.append("image", image);

    setLoading(true);
    try {
      if (isLive) {
        await axios.patch("/api/partner/vehicle/pricing/edit", formData);
      } else {
        await axios.post("/api/partner/vehicle/pricing", formData);
      }
      onClose();
      const [pricingRes, meRes] = await Promise.all([
        axios.get("/api/partner/vehicle/pricing").catch(() => null),
        axios.get("/api/me").catch(() => null),
      ]);
      if (onSaved) {
        onSaved(pricingRes?.data?.pricing, meRes?.data);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to submit vehicle photo");
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
    if (pricing) {
      setPreview(pricing.imageUrl || null);
    }
  }, [pricing, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
        >
          <motion.div
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                Vehicle Image Upload
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
                Please upload a clear picture of your vehicle. This helps passengers identify you during pickup.
              </p>

              <label className="relative h-44 border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer">
                {!preview ? (
                  <ImagePlus size={28} />
                ) : (
                  <img
                    src={preview}
                    className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                  />
                )}

                <input
                  hidden
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setImage(e.target.files[0]);
                      setPreview(
                        URL.createObjectURL(e.target.files[0])
                      );
                    }
                  }}
                />
              </label>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border rounded-xl font-semibold text-zinc-700 hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitPricing}
                disabled={loading || !image}
                className="flex-1 py-3 bg-black text-white font-semibold rounded-xl hover:bg-zinc-900 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Image"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= SMALL COMPONENTS ================= */

/* ================= STATUS CARD ================= */

function StatusCard({ icon, title, desc }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        bg-white 
        rounded-2xl md:rounded-3xl 
        p-5 sm:p-6 md:p-8 
        shadow-lg 
        border 
        flex 
        flex-col sm:flex-row 
        gap-4 sm:gap-5
        items-start sm:items-center
      "
    >
      <div className="bg-black text-white p-3 md:p-4 rounded-xl shrink-0">
        {icon}
      </div>

      <div className="flex-1">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold">
          {title}
        </h3>
        <p className="text-gray-600 text-sm sm:text-base mt-1">
          {desc}
        </p>
      </div>
    </motion.div>
  );
}


/* ================= ACTION CARD ================= */

function ActionCard({ icon, title, desc, button, onClick }: any) {
  return (
    <div
      className="
        bg-white 
        rounded-2xl md:rounded-3xl 
        p-5 sm:p-6 md:p-8 
        shadow-lg 
        border 
        flex 
        flex-col sm:flex-row 
        justify-between 
        items-start sm:items-center 
        gap-5
      "
    >
      <div className="flex items-center gap-4">
        <div className="bg-black text-white p-3 md:p-4 rounded-xl shrink-0">
          {icon}
        </div>

        <div>
          <h3 className="text-base sm:text-lg md:text-xl font-semibold">
            {title}
          </h3>
          {desc && (
            <p className="text-gray-600 text-sm mt-1">
              {desc}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onClick}
        className="
          w-full sm:w-auto
          bg-black 
          text-white 
          px-6 
          py-2.5 
          rounded-xl 
          text-sm sm:text-base 
          font-medium
          transition 
          hover:bg-gray-800
        "
      >
        {button}
      </button>
    </div>
  );
}


/* ================= REJECTION CARD ================= */

function RejectionCard({
  title,
  reason,
  actionLabel,
  onAction,
}: any) {
  return (
    <div
      className="
        bg-red-50 
        border border-red-200 
        rounded-2xl md:rounded-3xl 
        p-5 sm:p-6 md:p-8 
        space-y-4
      "
    >
      <div className="flex items-center gap-2 text-red-600 font-semibold text-sm sm:text-base">
        <AlertTriangle size={18} />
        {title}
      </div>

      <div className="bg-white border rounded-xl p-4 text-sm sm:text-base">
        {reason || "No reason provided"}
      </div>

      {onAction && (
        <button
          onClick={onAction}
          className="
            w-full sm:w-auto
            px-6 
            py-2.5 
            bg-black 
            text-white 
            rounded-xl 
            text-sm sm:text-base
            font-medium
            hover:bg-gray-800 
            transition
          "
        >
          {actionLabel || "Retry"}
        </button>
      )}
    </div>
  );
}


function PriceInput({ label, value, onChange }: any) {
  return (
    <div>
      <p className="text-sm font-semibold mb-1">{label}</p>
      <div className="flex items-center gap-2 border rounded-xl px-4 py-3 bg-white">
        <IndianRupee size={16} />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full outline-none"
        />
      </div>
    </div>
  );
}

function LiveVendorDashboard({ userData, pricing, setShowPricing, showPricing }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [rates, setRates] = useState<any>(null);
  const lastLocationSyncRef = useRef<{ time: number; lat: number; lng: number }>({ time: 0, lat: 0, lng: 0 });

  const standardRates: Record<string, { baseFare: number; pricePerKm: number; pricePerMinute: number; multiplier: number }> = {
    bike:    { baseFare: 30,  pricePerKm: 8,   pricePerMinute: 1.5, multiplier: 1.0 },
    auto:    { baseFare: 50,  pricePerKm: 12,  pricePerMinute: 2.0, multiplier: 1.2 },
    car:     { baseFare: 80,  pricePerKm: 18,  pricePerMinute: 3.0, multiplier: 1.5 },
    loading: { baseFare: 120, pricePerKm: 24,  pricePerMinute: 4.0, multiplier: 1.8 },
    truck:   { baseFare: 180, pricePerKm: 30,  pricePerMinute: 5.0, multiplier: 2.2 },
  };

  const vType = pricing?.type || "car";
  const cfg = (rates && rates[vType.toLowerCase()]) || standardRates[vType.toLowerCase()] || standardRates.car;

  useEffect(() => {
    axios.get("/api/vehicles/pricing")
      .then((res) => {
        if (res.data.success) {
          setRates(res.data.rates);
        }
      })
      .catch((err) => console.error("Error loading rates:", err));
  }, []);

  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);

  const fetchShiftSummary = async () => {
    try {
      const res = await axios.get("/api/partner/shift-summary", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.data.success) {
        setShiftSummary(res.data.shift);
        if (res.data.recentTrips) {
          setRecentTrips(res.data.recentTrips);
        }
      }
    } catch (err) {
      console.error("Failed to load shift summary:", err);
    }
  };

  const fetchPendingRequest = async () => {
    try {
      const res = await axios.get("/api/partner/bookings/pending", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.data.bookings && res.data.bookings.length > 0) {
        setPendingRequest(res.data.bookings[0]);
      } else {
        setPendingRequest(null);
      }
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
    }
  };

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  useEffect(() => {
    // 1. Check if there is an active booking on mount
    const checkActiveRide = () => {
      axios.get("/api/partner/bookings/active", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      })
        .then((res) => {
          if (res.data && res.data._id) {
            router.push("/partner/active-ride");
          }
        })
        .catch(() => {});
    };

    checkActiveRide();

    // 2. Check for pending requests and shift summary on mount
    fetchPendingRequest();
    fetchShiftSummary();

    // 🔁 Polling fallback every 12 seconds in case socket drops (Socket.IO handles real-time alerts)
    const interval = setInterval(() => {
      checkActiveRide();
      fetchPendingRequest();
      fetchShiftSummary();
    }, 12000);

    // 3. Setup socket listener for incoming requests
    const socket = getSocket();
    if (userData?._id) {
      socket.emit("identity", userData._id);
    }
    const handleConnect = () => {
      if (userData?._id) {
        socket.emit("identity", userData._id);
      }
    };
    socket.on("connect", handleConnect);

    socket.on("new-booking", (booking: any) => {
      setPendingRequest(booking);
      playChime();
    });

    socket.on("new-scheduled-booking", (booking: any) => {
      setPendingRequest(booking);
      playChime();
    });

    socket.on("booking-updated", (data: any) => {
      setPendingRequest((prev: any) => {
        if (prev && prev._id === data.bookingId) {
          return null;
        }
        return prev;
      });
    });

    return () => {
      clearInterval(interval);
      socket.off("connect", handleConnect);
      socket.off("new-booking");
      socket.off("new-scheduled-booking");
      socket.off("booking-updated");
    };
  }, [userData?._id]);

  const handleRequestAction = async (bookingId: string, action: "accept" | "reject") => {
    try {
      setProcessingAction(action);
      await axios.post(`/api/booking/${bookingId}/${action}`);
      setPendingRequest(null);
      if (action === "accept") {
        router.push("/partner/active-ride");
      }
    } catch (err) {
      console.error("Failed to process request action:", err);
      alert("Action failed");
    } finally {
      setProcessingAction(null);
    }
  };


  useEffect(() => {
    axios.get("/api/partner/status", {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((res) => {
        if (res.data.success) {
          setIsOnline(res.data.isOnline || false);
          if (res.data.location?.coordinates) {
            setCoords({
              longitude: res.data.location.coordinates[0],
              latitude: res.data.location.coordinates[1]
            });
          }
        }
      })
      .catch((err) => console.error("Error loading partner status:", err));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    // Get current position on mount so map centers on their current location immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });

        if (isOnline) {
          axios.patch("/api/partner/status", { isOnline: true, latitude, longitude })
            .catch(err => console.error("Initial db location update error:", err));
        }
      },
      (error) => console.error("Initial geolocation error:", error),
      { enableHighAccuracy: true }
    );
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline || !navigator.geolocation) return;

    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });

        const now = Date.now();
        const last = lastLocationSyncRef.current;
        const dLat = Math.abs(latitude - last.lat);
        const dLng = Math.abs(longitude - last.lng);
        const hasMovedSignificantly = dLat > 0.00015 || dLng > 0.00015;
        const hasTimeElapsed = now - last.time >= 10000;

        if (hasTimeElapsed || hasMovedSignificantly) {
          lastLocationSyncRef.current = { time: now, lat: latitude, lng: longitude };
          axios.patch("/api/partner/status", { isOnline: true, latitude, longitude })
            .catch(err => console.error("Continuous location sync error:", err));
        }
      },
      (error) => {
        console.error("Watch location error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watcher);
    };
  }, [isOnline]);

  const handleToggleOnline = async () => {
    try {
      setLoading(true);
      const nextOnline = !isOnline;
      let updatePayload: any = { isOnline: nextOnline };

      if (nextOnline) {
        if (!navigator.geolocation) {
          alert("Geolocation is not supported by your browser. Please use a location-enabled browser to receive rides.");
          setLoading(false);
          return;
        }

        let geoSuccess = false;
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setCoords({ latitude, longitude });
              updatePayload.latitude = latitude;
              updatePayload.longitude = longitude;
              geoSuccess = true;
              resolve();
            },
            (error) => {
              console.error("Geolocation check error:", error);
              resolve();
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        });

        if (!geoSuccess && !coords) {
          alert("Please allow device location access to go online. Location is required so nearby riders can find and match with you.");
          setLoading(false);
          return;
        }

        if (!geoSuccess && coords) {
          updatePayload.latitude = coords.latitude;
          updatePayload.longitude = coords.longitude;
        }
      }

      const res = await axios.patch("/api/partner/status", updatePayload);
      if (res.data.success) {
        setIsOnline(res.data.isOnline);
        const socket = getSocket();
        if (userData?._id) {
          socket.emit("identity", userData._id);
        }
        if (updatePayload.latitude && updatePayload.longitude) {
          socket.emit("update-location", {
            latitude: updatePayload.latitude,
            longitude: updatePayload.longitude,
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to update status. Please ensure your driver and vehicle documents are verified.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-zinc-50 px-3 sm:px-6 pt-20 sm:pt-28 pb-16 relative">
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #e4e4e7 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }}
      />

      <div className="relative max-w-7xl mx-auto space-y-5 sm:space-y-8 z-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-zinc-200/65 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shadow-zinc-950/20 shrink-0">
              {userData?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-zinc-900 tracking-tight truncate">{userData?.name}</h1>
                <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-zinc-200">
                  Live Partner
                </span>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 font-semibold truncate">Manage online status and live fleet rides</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => window.location.href = "/partner/pending-requests"}
              className="flex items-center justify-center gap-2 bg-zinc-950 hover:bg-black text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl sm:rounded-2xl shadow-lg shadow-zinc-950/10 transition-all active:scale-[0.98]"
            >
              <span>Incoming Requests</span>
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => window.location.href = "/partner/bookings"}
              className="flex items-center justify-center gap-2 border border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-800 text-xs sm:text-sm font-bold px-4 py-3 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98]"
            >
              Ride History
            </button>
          </div>
        </div>

        {/* Today's Shift Performance Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">{t("driver.todayEarnings", "Today's Earnings")}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee size={13} />
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-black text-zinc-900 tracking-tight leading-none">
                ₹{shiftSummary?.todayEarnings ?? 0}
              </p>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-semibold mt-1">Net take-home</p>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">{t("driver.tripsCompleted", "Trips Completed")}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 size={13} className="sm:w-[15px] sm:h-[15px]" />
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-black text-zinc-900 tracking-tight leading-none">
                {shiftSummary?.todayTrips ?? 0}
              </p>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-semibold mt-1 truncate">
                {shiftSummary?.totalCompleted ? `${shiftSummary.totalCompleted} all-time` : "Today's shift"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">{t("driver.onlineShift", "Online Shift")}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={13} className="sm:w-[15px] sm:h-[15px]" />
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-black text-zinc-900 tracking-tight leading-none">
                {shiftSummary?.hoursOnline ?? 0}<span className="text-xs sm:text-sm font-normal text-zinc-400 ml-0.5">hrs</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-semibold mt-1">Active driving shift</p>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">{t("driver.rating", "Driver Rating")}</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Shield size={13} className="sm:w-[15px] sm:h-[15px]" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1 sm:gap-1.5 leading-none">
                <p className="text-lg sm:text-2xl font-black text-zinc-900 tracking-tight">
                  ★ {shiftSummary?.rating ?? 4.9}
                </p>
                <span className="text-[9px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1 sm:px-1.5 py-0.5 rounded">
                  {shiftSummary?.acceptanceRate ?? 96}%
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-semibold mt-1">Acceptance rate</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Online Toggle Card */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 md:p-8 shadow-sm flex flex-col justify-between min-h-[280px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Service Status</p>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{t("driver.statusCommand", "Status Command")}</h2>
              <p className="text-zinc-400 text-xs font-semibold mt-1">Toggle your availability to start receiving passenger requests</p>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 flex items-center justify-between my-4">
              <div className="flex items-center gap-3">
                <span className={`relative flex h-3.5 w-3.5 flex-shrink-0`}>
                  {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isOnline ? "bg-emerald-500" : "bg-zinc-300"}`}></span>
                </span>
                <div>
                  <p className="text-sm font-bold text-zinc-900">{isOnline ? t("driver.online", "Online") : t("driver.offline", "Offline")}</p>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    {isOnline ? t("driver.receivingBookings", "Receiving Bookings") : t("driver.inactive", "Inactive")}
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleOnline}
                disabled={loading}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                  isOnline ? "bg-emerald-500" : "bg-zinc-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    isOnline ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <MapPin size={13} />
              <span>
                {coords
                  ? `Lat: ${coords.latitude.toFixed(5)}, Lng: ${coords.longitude.toFixed(5)}`
                  : "Location tracking enabled"}
              </span>
            </div>
          </div>

          {/* Driver Location Map Card */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm flex flex-col min-h-[280px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Your Location</p>
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Live Tracker</h2>
              </div>
            </div>
            <div className="flex-1 w-full h-[140px] relative">
              <DriverLocationMap coords={coords} />
            </div>
            <p className="text-[10px] text-zinc-400 font-semibold mt-2 text-center">
              💡 Showing your live GPS coordinates tracked from your device.
            </p>
          </div>

          {/* Vehicle & Pricing Card */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 md:p-8 shadow-sm flex flex-col justify-between min-h-[280px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Vehicle specs</p>
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Active Vehicle</h2>
              </div>
              <button
                onClick={() => setShowPricing(true)}
                className="text-zinc-500 hover:text-zinc-950 p-2 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all"
              >
                <Edit3 size={16} />
              </button>
            </div>

            <div className="flex gap-4 items-center my-4">
              {pricing?.imageUrl ? (
                <img
                  src={pricing.imageUrl}
                  alt="Vehicle"
                  className="w-20 h-20 rounded-2xl object-cover border"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                  No Image
                </div>
              )}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                  <span>Base Fare:</span>
                  <span className="font-mono text-zinc-900 font-bold">₹{cfg.baseFare}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                  <span>Price / KM:</span>
                  <span className="font-mono text-zinc-900 font-bold">₹{cfg.pricePerKm}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                  <span>Time / Min:</span>
                  <span className="font-mono text-zinc-900 font-bold">₹{cfg.pricePerMinute}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                  <span>Multiplier:</span>
                  <span className="font-mono text-zinc-900 font-bold">{cfg.multiplier}x</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 mt-auto self-start">
              <Check size={12} /> Pricing Approved
            </div>
          </div>

        </div>

        {/* Driver Wallet & Bank Withdrawal */}
        <div className="w-full">
          <DriverWalletCard />
        </div>

        {/* Recent Trips & Drop-Off Ledger */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 md:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Shift Activity</p>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">Recent Trips & Drop-Off Ledger</h2>
            </div>
            <p className="text-xs text-zinc-400 font-semibold">Real-time trip records and drop-off arrival times</p>
          </div>

          {recentTrips.length === 0 ? (
            <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
              <p className="text-sm font-bold text-zinc-600">No trips recorded for this shift yet</p>
              <p className="text-xs text-zinc-400 mt-1">Toggle online above to start receiving passenger bookings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrips.map((trip) => {
                const isCompleted = trip.status === "completed";
                const isCancelled = trip.status === "cancelled";
                const isInProgress = trip.status === "started" || trip.status === "confirmed";

                const formatTimeStr = (iso?: string) => {
                  if (!iso) return null;
                  try {
                    const d = new Date(iso);
                    if (isNaN(d.getTime())) return null;
                    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
                  } catch {
                    return null;
                  }
                };

                const dropTime = isCompleted
                  ? formatTimeStr(trip.actualDropoffTime)
                  : formatTimeStr(trip.estimatedDropoffTime);

                return (
                  <div
                    key={trip.id}
                    className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    {/* Route Details */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black font-mono uppercase bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded">
                          #{trip.id.slice(-6)}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : isCancelled
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {trip.status}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {trip.createdAt
                            ? new Date(trip.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })
                            : ""}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-zinc-900 mt-1 flex-shrink-0" />
                          <span className="text-zinc-600 truncate">{trip.pickupAddress}</span>
                        </div>
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-sm bg-emerald-500 mt-1 flex-shrink-0" />
                          <span className="text-zinc-900 font-semibold truncate">{trip.dropAddress}</span>
                        </div>
                      </div>

                      {/* Drop-off Time & Timing Info */}
                      <div className="text-[11px] font-semibold text-zinc-500 flex items-center gap-2 flex-wrap">
                        {isCompleted && dropTime && (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Dropped off at {dropTime} ({trip.tripDurationMinutes} mins)
                          </span>
                        )}
                        {isInProgress && dropTime && (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                            <Clock size={12} /> Est. Drop-off by {dropTime} (~{trip.tripDurationMinutes} mins)
                          </span>
                        )}
                        {isCancelled && (
                          <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 flex items-center gap-1">
                            ✕ {trip.cancellationReason || "Cancelled"}
                            {trip.cancellationFeeApplied ? " • ₹40 Driver Compensation" : " • Free cancel"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fare / Earnings */}
                    <div className="text-left md:text-right flex-shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-zinc-200">
                      <p className="text-[10px] uppercase font-bold text-zinc-400">Driver Share</p>
                      <p className="text-lg font-black text-zinc-900">₹{trip.partnerAmount}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">Fare: ₹{trip.fare}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance & Charts */}
        <div className="w-full">
          <PartnerEarningsChart />
        </div>

        <PricingModal
          open={showPricing}
          onClose={() => setShowPricing(false)}
          pricing={pricing}
          isLive={true}
        />

        {/* ── NEW RIDE REQUEST POPUP MODAL ── */}
        <AnimatePresence>
          {pendingRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] px-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="bg-zinc-950 px-6 py-5 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="font-black text-sm uppercase tracking-widest text-zinc-300">{t("driver.incomingRequest", "Incoming Request")}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold">
                    <Clock size={12} className="text-amber-400" />
                    <span>20s left</span>
                  </div>
                </div>

                {/* Ride Details */}
                <div className="p-6 space-y-5">
                  
                  {/* Locations */}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 space-y-4">
                    <div className="flex gap-3 items-start">
                      <div className="flex flex-col items-center flex-shrink-0 pt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                        <div className="w-px bg-zinc-200 mt-1 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{t("booking.pickup", "Pickup Location")}</p>
                        <p className="text-xs text-zinc-800 font-bold leading-snug truncate">{pendingRequest.pickupAddress}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="flex-shrink-0 pt-1">
                        <div className="w-2.5 h-2.5 rounded-sm bg-zinc-900 border-2 border-white shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{t("booking.drop", "Drop Location")}</p>
                        <p className="text-xs text-zinc-800 font-bold leading-snug truncate">{pendingRequest.dropAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Trip Duration & Dropoff Time */}
                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Clock size={13} className="text-zinc-500" />
                      <span className="font-medium">{t("driver.estDuration", "Est. Duration")}:</span>
                      <span className="font-bold text-zinc-900">~{pendingRequest.tripDurationMinutes || 15} mins</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Navigation size={13} className="text-emerald-600" />
                      <span className="font-medium">{t("driver.estDropoff", "Drop-off:")}</span>
                      <span className="font-bold text-zinc-900">
                        {pendingRequest.estimatedDropoffTime
                          ? new Date(pendingRequest.estimatedDropoffTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                          : "Shortly"}
                      </span>
                    </div>
                  </div>

                  {/* Earnings Display */}
                  <div className="bg-zinc-950 rounded-2xl p-5 text-center border border-zinc-800 flex flex-col items-center justify-center">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mb-1">{t("driver.netFare", "Your Net Fare")}</p>
                    <div className="flex items-center gap-1.5 text-white text-4xl font-black tracking-tight leading-none">
                      <IndianRupee size={24} className="text-amber-400" />
                      <span>{pendingRequest.fare}</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-2 font-medium">90% partner amount. Cash or Digital payment.</p>
                  </div>

                </div>

                {/* Actions */}
                <div className="px-6 pb-6 pt-2 border-t border-zinc-100 flex gap-3">
                  <button
                    onClick={() => handleRequestAction(pendingRequest._id, "reject")}
                    disabled={processingAction !== null}
                    className="flex-1 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 py-3.5 rounded-2xl text-sm font-bold active:scale-[0.97] transition-all disabled:opacity-40"
                  >
                    {processingAction === "reject" ? (
                      <Loader2 className="animate-spin w-4 h-4 mx-auto text-zinc-500" />
                    ) : (
                      t("driver.reject", "Reject")
                    )}
                  </button>
                  <button
                    onClick={() => handleRequestAction(pendingRequest._id, "accept")}
                    disabled={processingAction !== null}
                    className="flex-1 bg-zinc-950 hover:bg-black text-white py-3.5 rounded-2xl text-sm font-black tracking-wide active:scale-[0.97] transition-all shadow-lg shadow-zinc-900/10 disabled:opacity-40"
                  >
                    {processingAction === "accept" ? (
                      <Loader2 className="animate-spin w-4 h-4 mx-auto text-white" />
                    ) : (
                      t("driver.acceptRide", "Accept Ride")
                    )}
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
