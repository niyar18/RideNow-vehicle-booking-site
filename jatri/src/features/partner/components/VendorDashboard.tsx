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
  RefreshCw,
  Zap,
  Radio,
  Truck,
  Bike,
  Camera,
  Wallet as WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import PartnerEarningsChart from "./PartnerEarningsChart";
import DriverWalletCard from "./DriverWalletCard";
import DriverWeeklyIncentiveCard from "./DriverWeeklyIncentiveCard";
import DriverPassengerPreferenceCard from "./DriverPassengerPreferenceCard";
import dynamic from "next/dynamic";
import { useTranslation } from "@/context/LanguageContext";
import { useWakeLock } from "@/shared/hooks/useWakeLock";

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#FAF7F0] dark:bg-[#0B2822] text-[#10251C] dark:text-[#F7F5ED] rounded-[16px] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-[#DED7CA] dark:border-[#24483D] shadow-sm font-sans"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[10px] bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] flex items-center justify-center shrink-0">
                <Video size={24} />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#123D32] dark:text-emerald-400">Live Call Session Ready</span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold mt-0.5 tracking-tight">Video KYC Verification Active</h2>
                <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mt-1 font-medium">Verification room is established. Connect now to finalize identity verification.</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/video-kyc/${roomId}`)}
              className="w-full sm:w-auto px-6 py-3 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] text-xs uppercase tracking-wider font-semibold rounded-[8px] transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Video size={16} /> Join Video KYC Call
            </button>
          </motion.div>
        );
      }

      return (
        <ActionCard
          icon={<Video size={22} />}
          title="Step 5: Live Video KYC Verification"
          desc="Your documents are approved. Initiate live verification call to authenticate facial biometrics."
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
            desc="Statutory vehicle exterior inspection photograph is undergoing administrative review."
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
          icon={<ImagePlus size={22} />}
          title="Step 6: Upload Vehicle Photo"
          desc="Your Video KYC is verified. Upload a clear photograph of vehicle exterior to complete onboarding."
          button="Upload Vehicle Photo"
          onClick={() => setShowPricing(true)}
        />
      );
    }

    /* ===== STEP 7: LIVE ===== */
    if (activeStep === 7) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FAF7F0] dark:bg-[#0B2822] text-[#10251C] dark:text-[#F7F5ED] rounded-[16px] p-8 sm:p-10 border border-[#DED7CA] dark:border-[#24483D] shadow-sm font-sans"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="text-[10px] uppercase tracking-widest text-[#123D32] dark:text-emerald-400 font-bold">
              Verification Approved
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Partner Account Activated
          </h2>
          <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mt-1 max-w-md font-medium">
            All identity credentials and statutory vehicle inspections are verified. You can now toggle online duty and receive ride assignments.
          </p>

          <button
            onClick={() => router.push("/partner/bookings")}
            className="mt-6 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] px-6 py-3 rounded-[8px] text-xs uppercase tracking-wider font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            Access Dispatch Orders <ArrowRight size={15} />
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
      <section className="min-h-screen bg-[#FAF7F0] dark:bg-[#061A16] pt-28 pb-20 px-4 md:px-8 font-sans transition-colors">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[8px] w-48 border border-[#DED7CA] dark:border-[#24483D]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] border border-[#DED7CA] dark:border-[#24483D]" />
            <div className="h-40 bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] border border-[#DED7CA] dark:border-[#24483D]" />
            <div className="h-40 bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] border border-[#DED7CA] dark:border-[#24483D]" />
          </div>
          <div className="h-80 bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] border border-[#DED7CA] dark:border-[#24483D]" />
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#FAF7F0] dark:bg-[#061A16] px-3 sm:px-6 pt-20 sm:pt-28 pb-16 font-sans transition-colors">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        <div className="border-b border-[#DED7CA] dark:border-[#24483D] pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#123D32] dark:bg-[#28664D] inline-block" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#123D32] dark:text-[#347858]">
              Partner Verification
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] tracking-tight">
            Vendor Activation Steps
          </h1>
          <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm mt-1">
            Complete compliance onboarding to activate live dispatch and receive bookings.
          </p>
        </div>

        {/* MOBILE STEPPER */}
        <div className="block md:hidden bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[14px] p-4 border border-[#DED7CA] dark:border-[#24483D] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#696B64] dark:text-[#B9C8BF] uppercase tracking-wider">
              Step 0{activeStep} / 0{TOTAL_STEPS}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] rounded-[6px]">
              {STEPS[activeStep - 1]?.title || "Onboarding"}
            </span>
          </div>

          <div className="w-full h-1.5 bg-[#FAF7F0] dark:bg-[#061A16] rounded-full overflow-hidden border border-[#DED7CA] dark:border-[#24483D]">
            <motion.div
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-[#123D32] dark:bg-[#28664D]"
            />
          </div>

          {/* Step Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {STEPS.map((step) => {
              const completed = activeStep > step.id;
              const active = activeStep === step.id;
              const locked = step.id > activeStep;

              return (
                <button
                  key={step.id}
                  disabled={locked}
                  onClick={() => goToStep(step)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium tracking-wide shrink-0 transition-colors ${
                    completed
                      ? "bg-[#123D32]/10 dark:bg-[#28664D]/25 text-[#123D32] dark:text-[#347858] border border-[#123D32]/30 dark:border-[#28664D]/50 font-semibold"
                      : active
                      ? "bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] font-bold shadow-xs"
                      : "bg-[#FAF7F0] dark:bg-[#10352C] text-[#696B64] dark:text-[#B9C8BF] border border-[#DED7CA] dark:border-[#24483D]"
                  }`}
                >
                  <span>{completed ? "✓" : `0${step.id}`}</span>
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DESKTOP STEPPER */}
        <div className="hidden md:block bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[14px] p-6 sm:p-8 border border-[#DED7CA] dark:border-[#24483D] shadow-xs overflow-x-auto">
          <div className="relative min-w-[700px]">
            <div className="absolute top-6 left-0 w-full h-[2px] bg-[#DED7CA] dark:bg-[#34443A]" />

            <motion.div
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4 }}
              className="absolute top-6 left-0 h-[2px] bg-[#123D32] dark:bg-[#28664D]"
            />

            <div className="relative flex justify-between">
              {STEPS.map((step) => {
                const completed = activeStep > step.id;
                const active = activeStep === step.id;
                const locked = step.id > activeStep;

                return (
                  <div
                    key={step.id}
                    onClick={() => goToStep(step)}
                    className="flex flex-col items-center z-10 cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-[10px] flex items-center justify-center border text-xs font-bold transition-all
                      ${
                        completed
                          ? "bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] border-[#123D32] dark:border-[#28664D] shadow-xs"
                          : active
                          ? "border-[#123D32] dark:border-[#28664D] bg-[#FAF7F0] dark:bg-[#10352C] text-[#123D32] dark:text-[#347858] ring-2 ring-[#123D32]/20 dark:ring-[#28664D]/30 font-bold"
                          : "border-[#DED7CA] dark:border-[#24483D] text-[#696B64] dark:text-[#B9C8BF] bg-[#FAF7F0] dark:bg-[#10352C]"
                      }`}
                    >
                      {completed ? (
                        <Check size={16} />
                      ) : locked ? (
                        <Lock size={14} />
                      ) : (
                        `0${step.id}`
                      )}
                    </div>

                    <p className={`mt-2.5 text-xs font-medium uppercase tracking-wider text-center ${
                      active ? "text-[#123D32] dark:text-[#347858] font-bold" : "text-[#696B64] dark:text-[#B9C8BF]"
                    }`}>
                      {step.title}
                    </p>
                  </div>
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
  const [selectedType, setSelectedType] = useState<string>(pricing?.type || "car");
  const [loading, setLoading] = useState(false);

  const FLEET_CATEGORIES = [
    { id: "car", label: "Jaatri Premier (Sedan / Cab)" },
    { id: "mini", label: "Jaatri Mini (Hatchback)" },
    { id: "priority", label: "Jaatri XL Priority (SUV)" },
    { id: "auto", label: "Jaatri Auto (3-Wheeler)" },
    { id: "bike", label: "Jaatri Moto (Motorcycle)" },
    { id: "scooty", label: "Jaatri Scooty (Scooter)" },
    { id: "loading", label: "Jaatri Express Mini (Cargo)" },
    { id: "truck", label: "Jaatri City Truck (Freight)" },
  ];

  const submitPricing = async () => {
    const formData = new FormData();
    if (image) formData.append("image", image);
    if (selectedType) formData.append("type", selectedType);

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
      alert(err?.response?.data?.message || "Failed to update vehicle fleet details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pricing) {
      setPreview(pricing.imageUrl || null);
      if (pricing.type) setSelectedType(pricing.type);
    }
  }, [pricing, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 px-4"
        >
          <motion.div
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            className="bg-[#FAF7F0] dark:bg-[#0B2822] w-full max-w-lg rounded-[16px] border border-[#DED7CA] dark:border-[#24483D] shadow-xl overflow-hidden p-6 font-sans"
          >
            <div className="border-b border-[#DED7CA] dark:border-[#24483D] pb-4 mb-4">
              <span className="text-[10px] uppercase tracking-widest text-[#123D32] dark:text-[#347858] font-bold">
                Vehicle Compliance & Fleet
              </span>
              <h2 className="text-lg font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] tracking-tight mt-0.5">
                Fleet Category & Exterior Inspection
              </h2>
            </div>

            <div className="space-y-4">
              {/* Fleet Category Selector */}
              <div>
                <label className="text-xs font-bold text-[#10251C] dark:text-[#F7F5ED] uppercase tracking-wider block mb-1.5">
                  Select Fleet Specification
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-white dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] text-[#10251C] dark:text-[#F7F5ED] focus:outline-none focus:border-[#123D32] dark:focus:border-[#28664D]"
                >
                  {FLEET_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id} className="dark:bg-[#0B2822]">
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#696B64] dark:text-[#B9C8BF] mt-1 font-medium">
                  Ensure your vehicle matches the customer ride requests in your area.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#10251C] dark:text-[#F7F5ED] uppercase tracking-wider block mb-1.5">
                  Vehicle Exterior Photo
                </label>
                <label className="relative h-40 border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] bg-white dark:bg-[#061A16] flex items-center justify-center cursor-pointer hover:border-[#123D32] dark:hover:border-[#28664D] transition-colors overflow-hidden">
                  {!preview ? (
                    <div className="flex flex-col items-center gap-1.5 text-[#696B64] dark:text-[#B9C8BF]">
                      <ImagePlus size={26} className="text-[#123D32] dark:text-[#347858]" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">Select Vehicle Photo</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="Vehicle preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  <input
                    hidden
                    type="file"
                    accept="image/*"
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
            </div>

            <div className="pt-5 mt-5 border-t border-[#DED7CA] dark:border-[#24483D] flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] text-xs uppercase font-semibold text-[#10251C] dark:text-[#F7F5ED] bg-[#FAF7F0] dark:bg-[#10352C] hover:bg-[#F7F1E5] dark:hover:bg-[#143D32] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitPricing}
                disabled={loading}
                className="flex-1 py-2.5 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] text-xs uppercase tracking-wider font-semibold rounded-[8px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Fleet Details"}
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        bg-[#FAF7F0] dark:bg-[#0B2822] 
        rounded-[12px] 
        border border-[#DED7CA] dark:border-[#24483D] 
        p-5 sm:p-7 
        shadow-sm 
        flex 
        flex-col sm:flex-row 
        gap-4 sm:gap-5
        items-start sm:items-center
      "
    >
      <div className="bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] p-3 rounded-[8px] shrink-0 font-mono">
        {icon}
      </div>

      <div className="flex-1">
        <h3 className="text-base sm:text-lg font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] tracking-tight">
          {title}
        </h3>
        <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm mt-1 font-medium font-body">
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
        bg-[#FAF7F0] dark:bg-[#0B2822] 
        rounded-[12px] 
        border border-[#DED7CA] dark:border-[#24483D] 
        p-5 sm:p-7 
        shadow-sm 
        flex 
        flex-col sm:flex-row 
        justify-between 
        items-start sm:items-center 
        gap-5
      "
    >
      <div className="flex items-center gap-4">
        <div className="bg-[#123D32] dark:bg-[#28664D] text-[#FAF7F0] p-3 rounded-[8px] shrink-0 font-mono">
          {icon}
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] tracking-tight">
            {title}
          </h3>
          {desc && (
            <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm mt-1 font-medium font-body">
              {desc}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onClick}
        className="
          w-full sm:w-auto
          bg-[#123D32] hover:bg-[#0D3027] 
          dark:bg-[#28664D] dark:hover:bg-[#347858] 
          text-[#FAF7F0] 
          px-6 
          py-2.5 
          rounded-[8px] 
          text-xs 
          font-semibold uppercase tracking-wider
          transition-colors 
          shadow-sm
          cursor-pointer
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
        bg-red-50/80 dark:bg-red-950/30 
        border border-red-200 dark:border-red-900/50 
        rounded-[12px] 
        p-5 sm:p-7 
        space-y-4
      "
    >
      <div className="flex items-center gap-2 text-[#E34222] dark:text-[#E06A50] font-bold text-xs uppercase tracking-wider">
        <AlertTriangle size={16} />
        {title}
      </div>

      <div className="bg-[#FAF7F0] dark:bg-[#10352C] border border-red-200 dark:border-red-900/50 rounded-[8px] p-3.5 text-xs sm:text-sm font-medium text-[#10251C] dark:text-[#F7F5ED]">
        {reason || "No specification provided"}
      </div>

      {onAction && (
        <button
          onClick={onAction}
          className="
            w-full sm:w-auto
            px-6 
            py-2.5 
            bg-[#E34222] hover:bg-[#9E2F1B] 
            text-[#FAF7F0] 
            rounded-[8px] 
            text-xs uppercase tracking-wider font-semibold
            transition-colors
            shadow-sm
            cursor-pointer
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
      <p className="text-xs font-semibold uppercase tracking-wider text-[#696B64] dark:text-[#B9C8BF] mb-1">{label}</p>
      <div className="flex items-center gap-2 border border-[#DED7CA] dark:border-[#24483D] rounded-[8px] px-3.5 py-2.5 bg-white dark:bg-[#061A16] text-[#10251C] dark:text-[#F7F5ED]">
        <IndianRupee size={15} className="text-[#123D32] dark:text-[#347858]" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full outline-none bg-transparent text-sm font-mono font-bold"
        />
      </div>
    </div>
  );
}

function LiveVendorDashboard({ userData, pricing, setShowPricing, showPricing }: any) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(false);
  // Keep mobile screen awake while driver is online on duty
  const { isLocked: isWakeLockActive } = useWakeLock(isOnline);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);
  const [requestCountdown, setRequestCountdown] = useState(30);

  // Dynamic countdown timer for incoming ride requests
  useEffect(() => {
    if (!pendingRequest) {
      setRequestCountdown(30);
      return;
    }
    setRequestCountdown(30);
    const interval = setInterval(() => {
      setRequestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPendingRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingRequest]);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [rates, setRates] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(userData?.profilePicture || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const lastLocationSyncRef = useRef<{ time: number; lat: number; lng: number }>({ time: 0, lat: 0, lng: 0 });

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("profilePicture", file);
      const res = await axios.post("/api/partner/profile-picture", formData);
      if (res.data?.success && res.data?.profilePicture) {
        setProfilePicture(res.data.profilePicture);
        if (userData) {
          dispatch(setUserData({ ...userData, profilePicture: res.data.profilePicture }));
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to upload profile picture.");
    } finally {
      setUploadingPhoto(false);
    }
  };

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
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([]);
  const [platformDues, setPlatformDues] = useState<number>(0);
  const [maxAllowedPlatformDues, setMaxAllowedPlatformDues] = useState<number>(300);
  const [isDebtBlocked, setIsDebtBlocked] = useState<boolean>(false);

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
      if (res.data?.bookings && res.data.bookings.length > 0) {
        setPendingRequest(res.data.bookings[0]);
      } else {
        // Only clear if the current request is older than 45 seconds or already resolved
        setPendingRequest((prev: any) => {
          if (!prev) return null;
          const age = prev.createdAt ? Date.now() - new Date(prev.createdAt).getTime() : 0;
          if (age > 45000) return null;
          return prev;
        });
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

    // ðŸ” Fast polling fallback every 2 seconds ensures instant notification even on slow networks
    const interval = setInterval(() => {
      checkActiveRide();
      fetchPendingRequest();
      fetchShiftSummary();
    }, 2000);

    // 3. Setup socket listener for incoming requests
    const activeUserId = userData?._id ? String(userData._id) : undefined;
    const socket = getSocket(activeUserId ? { userId: activeUserId } : undefined);

    const handleConnect = () => {
      fetchPendingRequest();
      checkActiveRide();
      fetchShiftSummary();
    };
    socket.on("connect", handleConnect);

    const handleNewBooking = (booking: any) => {
      setPendingRequest(booking);
      playChime();
    };

    const handleNewScheduledBooking = (booking: any) => {
      setPendingRequest(booking);
      playChime();
    };

    const handleBookingUpdated = (data: any) => {
      setPendingRequest((prev: any) => {
        if (prev && prev._id === data.bookingId) {
          return null;
        }
        return prev;
      });
      fetchPendingRequest();
      checkActiveRide();
      fetchShiftSummary();
    };

    socket.on("new-booking", handleNewBooking);
    socket.on("new-scheduled-booking", handleNewScheduledBooking);
    socket.on("booking-updated", handleBookingUpdated);

    return () => {
      clearInterval(interval);
      socket.off("connect", handleConnect);
      socket.off("new-booking", handleNewBooking);
      socket.off("new-scheduled-booking", handleNewScheduledBooking);
      socket.off("booking-updated", handleBookingUpdated);
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
          if (res.data.profilePicture) {
            setProfilePicture(res.data.profilePicture);
          }
          if (Array.isArray(res.data.expiryAlerts)) {
            setExpiryAlerts(res.data.expiryAlerts);
          }
          if (typeof res.data.platformDues === "number") {
            setPlatformDues(res.data.platformDues);
          }
          if (typeof res.data.maxAllowedPlatformDues === "number") {
            setMaxAllowedPlatformDues(res.data.maxAllowedPlatformDues);
          }
          if (typeof res.data.isDebtBlocked === "boolean") {
            setIsDebtBlocked(res.data.isDebtBlocked);
          }
        }
      })
      .catch((err) => console.error("Error loading partner status:", err));
  }, []);

  const syncDriverLocation = useCallback((forcedLat?: number, forcedLng?: number) => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    const performSync = (lat: number, lng: number) => {
      setCoords({ latitude: lat, longitude: lng });
      setLastSyncedTime(new Date());

      if (isOnline) {
        axios.patch("/api/partner/status", { isOnline: true, latitude: lat, longitude: lng })
          .catch((err) => console.debug("Partner status sync note:", err?.message || err));

        const socket = getSocket();
        if (userData?._id) {
          socket.emit("identity", userData._id);
        }
        socket.emit("update-location", {
          userId: userData?._id,
          latitude: lat,
          longitude: lng,
        });
      }
    };

    if (typeof forcedLat === "number" && typeof forcedLng === "number") {
      performSync(forcedLat, forcedLng);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        performSync(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("High accuracy geolocation timed out, attempting standard accuracy:", err);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLocating(false);
            performSync(pos.coords.latitude, pos.coords.longitude);
          },
          (err2) => {
            setIsLocating(false);
            console.error("Standard geolocation failed:", err2);
            const fallbackLat = coords?.latitude ?? (userData?.location?.coordinates ? userData.location.coordinates[1] : undefined);
            const fallbackLng = coords?.longitude ?? (userData?.location?.coordinates ? userData.location.coordinates[0] : undefined);
            if (typeof fallbackLat === "number" && typeof fallbackLng === "number") {
              performSync(fallbackLat, fallbackLng);
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 }
    );
  }, [isOnline, userData?._id, userData?.location?.coordinates, coords?.latitude, coords?.longitude]);

  // 1. Initial location fix on mount
  useEffect(() => {
    syncDriverLocation();
  }, [syncDriverLocation]);

  // 2. Continuous watchPosition for movement (both online and offline!)
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });

        const now = Date.now();
        const last = lastLocationSyncRef.current;
        const dLat = Math.abs(latitude - last.lat);
        const dLng = Math.abs(longitude - last.lng);
        const hasMovedSignificantly = dLat > 0.0001 || dLng > 0.0001;
        const hasTimeElapsed = now - last.time >= 8000;

        if (hasTimeElapsed || hasMovedSignificantly) {
          lastLocationSyncRef.current = { time: now, lat: latitude, lng: longitude };
          setLastSyncedTime(new Date());

          if (isOnline) {
            axios.patch("/api/partner/status", { isOnline: true, latitude, longitude })
              .catch((err) => console.debug("Live sync note:", err?.message || err));

            const socket = getSocket();
            if (userData?._id) {
              socket.emit("identity", userData._id);
            }
            socket.emit("update-location", {
              userId: userData?._id,
              latitude,
              longitude,
            });
          }
        }
      },
      (err) => console.debug("WatchPosition note:", err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );

    // 3. Heartbeat interval: even when parked / stationary, ping GPS every 15 seconds
    const intervalTimer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ latitude: lat, longitude: lng });
          setLastSyncedTime(new Date());

          if (isOnline) {
            axios.patch("/api/partner/status", { isOnline: true, latitude: lat, longitude: lng })
              .catch((err) => console.debug("Interval sync note:", err?.message || err));

            const socket = getSocket();
            if (userData?._id) {
              socket.emit("identity", userData._id);
            }
            socket.emit("update-location", {
              userId: userData?._id,
              latitude: lat,
              longitude: lng,
            });
          }
        },
        (err) => {
          console.debug("Stationary ping note:", err.message);
          if (isOnline) {
            const fallbackLat = coords?.latitude ?? (userData?.location?.coordinates ? userData.location.coordinates[1] : undefined);
            const fallbackLng = coords?.longitude ?? (userData?.location?.coordinates ? userData.location.coordinates[0] : undefined);
            if (typeof fallbackLat === "number" && typeof fallbackLng === "number") {
              axios.patch("/api/partner/status", { isOnline: true, latitude: fallbackLat, longitude: fallbackLng })
                .catch(() => {});
              const socket = getSocket();
              if (userData?._id) {
                socket.emit("identity", userData._id);
                socket.emit("update-location", { userId: userData._id, latitude: fallbackLat, longitude: fallbackLng });
              }
            }
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    }, 15000);

    return () => {
      navigator.geolocation.clearWatch(watcher);
      clearInterval(intervalTimer);
    };
  }, [isOnline, userData?._id]);

  const handleToggleOnline = async () => {
    try {
      setLoading(true);
      const nextOnline = !isOnline;
      const updatePayload: any = { isOnline: nextOnline };

      if (nextOnline) {
        if (isDebtBlocked) {
          alert(`Dispatch blocked: You have ₹${platformDues.toFixed(2)} in unpaid platform dues (threshold is ₹${maxAllowedPlatformDues}). Please settle your dues in the Driver Wallet to go online.`);
          router.push("/partner/wallet");
          setLoading(false);
          return;
        }

        if (!navigator.geolocation) {
          alert("Geolocation is not supported by your browser. Please use a location-enabled browser to receive rides.");
          setLoading(false);
          return;
        }

        let currentLat = coords?.latitude;
        let currentLng = coords?.longitude;

        if (!currentLat || !currentLng) {
          if (userData?.location?.coordinates && userData.location.coordinates.length >= 2) {
            const uLng = userData.location.coordinates[0];
            const uLat = userData.location.coordinates[1];
            if (typeof uLat === "number" && typeof uLng === "number") {
              currentLng = uLng;
              currentLat = uLat;
              setCoords({ latitude: uLat, longitude: uLng });
            }
          }
        }

        if (!currentLat || !currentLng) {
          await new Promise<void>((resolve) => {
            if (!navigator.geolocation) {
              resolve();
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => {
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;
                setCoords({ latitude: currentLat, longitude: currentLng });
                resolve();
              },
              (error) => {
                console.warn("High accuracy geolocation timed out, attempting standard accuracy:", error);
                navigator.geolocation.getCurrentPosition(
                  (pos2) => {
                    currentLat = pos2.coords.latitude;
                    currentLng = pos2.coords.longitude;
                    setCoords({ latitude: currentLat, longitude: currentLng });
                    resolve();
                  },
                  (err2) => {
                    console.warn("Standard geolocation failed, falling back to profile coordinates:", err2);
                    if (userData?.location?.coordinates && userData.location.coordinates.length >= 2) {
                      const uLng = userData.location.coordinates[0];
                      const uLat = userData.location.coordinates[1];
                      if (typeof uLat === "number" && typeof uLng === "number") {
                        currentLng = uLng;
                        currentLat = uLat;
                        setCoords({ latitude: uLat, longitude: uLng });
                      }
                    }
                    resolve();
                  },
                  { enableHighAccuracy: false, timeout: 8000 }
                );
              },
              { enableHighAccuracy: true, timeout: 6000 }
            );
          });
        }

        if (!currentLat || !currentLng) {
          alert("Please allow device location access to go online. Location is required so nearby riders can find and match with you.");
          setLoading(false);
          return;
        }

        updatePayload.latitude = currentLat;
        updatePayload.longitude = currentLng;
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
            userId: userData?._id,
            latitude: updatePayload.latitude,
            longitude: updatePayload.longitude,
          });
        }
        setLastSyncedTime(new Date());
        fetchShiftSummary();
      }
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.errorCode === "EXCESSIVE_PLATFORM_DUES") {
        setIsDebtBlocked(true);
        if (typeof err.response.data.platformDues === "number") {
          setPlatformDues(err.response.data.platformDues);
        }
      }
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to update status. Please ensure your driver and vehicle documents are verified.";
      alert(errorMsg);
      if (err?.response?.data?.errorCode === "EXCESSIVE_PLATFORM_DUES") {
        router.push("/partner/wallet");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#FAF7F0] dark:bg-[#061A16] px-3 sm:px-6 pt-20 sm:pt-28 pb-16 relative transition-colors">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10"
        style={{ backgroundImage: "radial-gradient(circle, #DED7CA 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      <div className="relative max-w-7xl mx-auto space-y-5 sm:space-y-8 z-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[16px] p-5 sm:p-7 md:p-8 border border-[#DED7CA] dark:border-[#24483D] shadow-sm">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="relative group w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-[12px] border border-[#DED7CA] dark:border-[#24483D] overflow-hidden bg-[#123D32] dark:bg-[#28664D]">
              {profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePicture}
                  alt={userData?.name || "Driver Headshot"}
                  className="w-full h-full object-cover rounded-[12px]"
                />
              ) : (
                <div className="w-full h-full text-[#FAF7F0] flex items-center justify-center font-bold text-xl sm:text-2xl font-serif">
                  {userData?.name?.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                title="Update mandatory profile photo"
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer text-center p-1 rounded-[12px]"
              >
                {uploadingPhoto ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={16} />
                    <span className="text-[8px] font-mono uppercase font-bold mt-0.5">Photo</span>
                  </>
                )}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleProfilePhotoUpload}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight truncate">{userData?.name}</h1>
                <span className="inline-flex items-center gap-1 bg-[#F7F1E5] dark:bg-[#10352C] text-[#123D32] dark:text-[#347858] text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[6px] border border-[#DED7CA] dark:border-[#24483D]">
                  Verified Partner
                </span>
                {!profilePicture && (
                  <span className="inline-flex items-center gap-1 bg-[#E34222] text-white text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[6px]">
                    Photo Required
                  </span>
                )}
              </div>
              <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm mt-0.5 font-medium truncate font-body">
                Manage live duty status, real-time GPS telemetry, and fleet ride dispatching
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => window.location.href = "/partner/pending-requests"}
              className="flex items-center justify-center gap-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] text-xs sm:text-sm font-semibold uppercase tracking-wider px-5 py-3 rounded-[8px] transition cursor-pointer shadow-sm"
            >
              <span>Incoming Requests</span>
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => window.location.href = "/partner/bookings"}
              className="flex items-center justify-center gap-2 border border-[#DED7CA] dark:border-[#24483D] hover:bg-[#F7F1E5] dark:hover:bg-[#10352C] bg-[#FAF7F0] dark:bg-[#0B2822] text-[#10251C] dark:text-[#F7F5ED] text-xs sm:text-sm font-semibold uppercase tracking-wider px-4 py-3 rounded-[8px] transition cursor-pointer shadow-sm"
            >
              Ride History
            </button>
          </div>
        </div>

        {/* Mandatory Profile Picture Alert Banner */}
        {!profilePicture && (
          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] text-[#10251C] dark:text-[#F7F5ED] border border-[#DED7CA] dark:border-[#24483D] rounded-[12px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center font-bold shrink-0">
                <Camera size={16} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#10251C] dark:text-[#F7F5ED]">
                  Mandatory Driver Face Photo Required
                </p>
                <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] mt-0.5">
                  You must upload a clear facial photograph to complete driver verification and remain active on dispatch.
                </p>
              </div>
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="px-4 py-2 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 rounded-[8px] cursor-pointer"
            >
              {uploadingPhoto ? "Uploading..." : "Upload Profile Photo"}
            </button>
          </div>
        )}

        {/* Cash Ride Debt Threshold Alert Banner */}
        {isDebtBlocked && (
          <div className="bg-red-50 dark:bg-red-950/30 text-[#E34222] dark:text-[#E06A50] border border-red-200 dark:border-red-900/50 rounded-[12px] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[8px] bg-[#E34222] text-white flex items-center justify-center font-bold shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#E34222] dark:text-[#E06A50]">
                    Dispatch Blocked &bull; Platform Commission Dues Limit Exceeded
                  </p>
                  <span className="bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-200 text-[10px] font-mono px-2 py-0.5 font-bold uppercase rounded-[4px]">
                    ₹{platformDues.toFixed(2)} Dues
                  </span>
                </div>
                <p className="text-xs text-red-800/90 dark:text-red-300/90 mt-1 font-body">
                  You have exceeded the maximum allowed cash ride commission threshold of ₹{maxAllowedPlatformDues}. Settle your platform dues instantly via UPI or card in your Driver Wallet to resume receiving ride assignments.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/partner/wallet")}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#E34222] hover:bg-[#9E2F1B] text-white text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-2 rounded-[8px] cursor-pointer shadow-sm"
            >
              <WalletIcon size={14} /> Settle Dues Now
            </button>
          </div>
        )}

        {/* Today's Shift Performance Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] p-4 sm:p-5 border border-[#DED7CA] dark:border-[#24483D] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#696B64] dark:text-[#B9C8BF] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#696B64] dark:text-[#B9C8BF]">{t("driver.todayEarnings", "Today's Earnings")}</span>
              <div className="w-7 h-7 rounded-[6px] bg-[#F7F1E5] dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] text-[#123D32] dark:text-[#347858] flex items-center justify-center">
                <IndianRupee size={13} />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight leading-none tabular-nums font-mono">
                ₹{shiftSummary?.todayEarnings ?? 0}
              </p>
              <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium mt-1">Net shift earnings</p>
            </div>
          </div>

          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] p-4 sm:p-5 border border-[#DED7CA] dark:border-[#24483D] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#696B64] dark:text-[#B9C8BF] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#696B64] dark:text-[#B9C8BF]">{t("driver.tripsCompleted", "Trips Completed")}</span>
              <div className="w-7 h-7 rounded-[6px] bg-[#F7F1E5] dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] text-[#123D32] dark:text-[#347858] flex items-center justify-center">
                <CheckCircle2 size={13} />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight leading-none tabular-nums font-mono">
                {shiftSummary?.todayTrips ?? 0}
              </p>
              <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium mt-1 truncate">
                {shiftSummary?.totalCompleted ? `${shiftSummary.totalCompleted} all-time` : "Today's shift"}
              </p>
            </div>
          </div>

          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] p-4 sm:p-5 border border-[#DED7CA] dark:border-[#24483D] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#696B64] dark:text-[#B9C8BF] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#696B64] dark:text-[#B9C8BF]">{t("driver.onlineShift", "Online Shift")}</span>
              <div className="w-7 h-7 rounded-[6px] bg-[#F7F1E5] dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] text-[#123D32] dark:text-[#347858] flex items-center justify-center">
                <Clock size={13} />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight leading-none tabular-nums font-mono">
                {shiftSummary?.hoursOnline ?? 0}<span className="text-sm font-normal text-[#696B64] dark:text-[#B9C8BF] ml-0.5 font-sans">hrs</span>
              </p>
              <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium mt-1">Active duty shift</p>
            </div>
          </div>

          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] p-4 sm:p-5 border border-[#DED7CA] dark:border-[#24483D] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#696B64] dark:text-[#B9C8BF] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#696B64] dark:text-[#B9C8BF]">{t("driver.rating", "Driver Rating")}</span>
              <div className="w-7 h-7 rounded-[6px] bg-[#F7F1E5] dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] text-[#123D32] dark:text-[#347858] flex items-center justify-center">
                <Shield size={13} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 leading-none">
                <p className="text-xl sm:text-3xl font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight tabular-nums font-mono">
                  ★ {shiftSummary?.rating ?? 5.0}
                </p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider ${
                  (shiftSummary?.cancellationRate ?? 0) > 10
                    ? "text-[#E34222] dark:text-[#E06A50] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50"
                    : "text-[#123D32] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60"
                }`}>
                  {shiftSummary?.acceptanceRate ?? 100}% accept
                </span>
              </div>
              <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium mt-1">
                {shiftSummary?.dailyCancellations ? `${shiftSummary.dailyCancellations} cancelled today` : "Clean shift rating"}
              </p>
            </div>
          </div>
        </div>

        {/* Cooldown Alert Banner */}
        {shiftSummary?.isCooldownActive && shiftSummary?.dispatchBlockedUntil && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[12px] p-4 flex items-center gap-3">
            <AlertTriangle className="text-[#E34222] dark:text-[#E06A50] flex-shrink-0" size={20} />
            <div className="text-xs">
              <p className="text-red-900 dark:text-red-200 font-bold uppercase tracking-wide">Dispatch Cooldown Active</p>
              <p className="text-red-800 dark:text-red-300 text-[11px] mt-0.5 font-medium">
                Multiple ride cancellations today have placed new dispatch assignments on temporary cooldown until{" "}
                {new Date(shiftSummary.dispatchBlockedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
              </p>
            </div>
          </div>
        )}

        {/* Document Expiry Proactive Alerts */}
        {expiryAlerts.length > 0 && (
          <div className="space-y-2">
            {expiryAlerts.map((alert: any, idx: number) => {
              const isExpired = alert.status === "expired";
              return (
                <div
                  key={idx}
                  className={`rounded-[12px] p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isExpired
                      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-950 dark:text-red-200"
                      : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={isExpired ? "text-[#E34222] dark:text-[#E06A50] mt-0.5 flex-shrink-0" : "text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"}
                      size={18}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide">
                          {isExpired ? "Document Expired — Service Restricted" : "Document Expiry Warning"}
                        </p>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider border ${
                            isExpired
                              ? "bg-red-200 dark:bg-red-900/60 text-red-950 dark:text-red-200 border-red-300 dark:border-red-800"
                              : alert.status === "urgent_7_days"
                              ? "bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                              : "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700"
                          }`}
                        >
                          {isExpired ? "Expired" : `${alert.daysRemaining} days left`}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] mt-0.5 leading-snug font-medium">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/partner/onboard/documents")}
                    className={`text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-[8px] transition whitespace-nowrap self-start sm:self-center cursor-pointer shadow-sm ${
                      isExpired
                        ? "bg-[#E34222] hover:bg-[#9E2F1B] text-white"
                        : "bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0]"
                    }`}
                  >
                    Renew Document
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Dashboard 3-Card Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">

          {/* Card 1: Duty Status Command */}
          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[16px] border border-[#DED7CA] dark:border-[#1E3E34] p-6 md:p-8 flex flex-col justify-between min-h-[310px] shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#696B64] dark:text-[#B9C8BF] mb-1">
                Dispatch & Duty Status
              </p>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight">
                {isOnline ? "Online — Accepting Trips" : "Offline — Duty Paused"}
              </h2>
              <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs font-medium mt-1 leading-relaxed font-body">
                {isOnline
                  ? "Live radar active. You will receive real-time ride dispatch assignments matching your registered fleet."
                  : "Toggle online to start receiving ride dispatch assignments and passenger bookings."}
              </p>
            </div>

            {isDebtBlocked && (
              <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-[8px] text-[#E34222] dark:text-[#E06A50] text-xs font-medium flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px]">Dues limit reached (₹{platformDues.toFixed(2)} / ₹{maxAllowedPlatformDues})</span>
                <Link href="/partner/wallet" className="underline font-bold text-[#E34222] dark:text-[#E06A50] shrink-0 text-xs uppercase">
                  Settle
                </Link>
              </div>
            )}

            <div className="bg-[#FAF7F0] dark:bg-[#061A16] rounded-[12px] p-4 border border-[#DED7CA] dark:border-[#1E3E34] flex items-center justify-between my-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight">
                    {isOnline ? "Duty: Online" : "Duty: Offline"}
                  </p>
                  {isOnline && isWakeLockActive && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[#123D32] dark:text-[#347858] bg-[#123D32]/10 dark:bg-[#28664D]/20 px-1.5 py-0.5 rounded-[4px] border border-[#123D32]/20 dark:border-[#28664D]/30 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#123D32] dark:bg-[#347858] animate-pulse" />
                      SCREEN AWAKE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#696B64] dark:text-[#B9C8BF] font-semibold uppercase tracking-wider">
                  {isOnline ? "Broadcasting live coordinates" : "Unavailable for dispatch"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleOnline}
                disabled={loading}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                  isOnline ? "bg-[#123D32] dark:bg-[#28664D]" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
                title={isOnline ? "Switch to Offline" : "Switch to Online"}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    isOnline ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#DED7CA] dark:border-[#1E3E34] text-xs text-[#696B64] dark:text-[#B9C8BF]">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin size={13} className="text-[#123D32] dark:text-[#347858] shrink-0" />
                <span className="truncate tabular-nums font-mono text-[11px] text-[#10251C] dark:text-[#F7F5ED]">
                  {coords
                    ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                    : "Detecting GPS..."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => syncDriverLocation()}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#10251C] dark:text-[#F7F5ED] hover:text-[#123D32] dark:hover:text-[#347858] border border-[#DED7CA] dark:border-[#1E3E34] hover:border-[#123D32] dark:hover:border-[#28664D] px-2.5 py-1 rounded-[8px] bg-[#FAF7F0] dark:bg-[#0B2822] transition cursor-pointer shrink-0 ml-2 shadow-xs"
                title="Refresh and sync GPS location now"
              >
                <RefreshCw size={11} className={isLocating ? "animate-spin text-[#123D32] dark:text-[#347858]" : "text-[#123D32] dark:text-[#347858]"} />
                <span>{isLocating ? "Syncing..." : "Sync GPS"}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Live Location Tracker & Radar */}
          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[16px] border border-[#DED7CA] dark:border-[#1E3E34] p-6 flex flex-col justify-between min-h-[310px] shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#696B64] dark:text-[#B9C8BF] mb-1">
                  Live GPS Telemetry
                </p>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight">
                  Location Radar
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[#FAF7F0] dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#1E3E34] text-[#123D32] dark:text-[#347858] text-[10px] font-semibold uppercase tracking-wider">
                <span>Live GPS</span>
              </span>
            </div>

            <div className="flex-1 w-full h-[155px] relative my-3 rounded-[12px] overflow-hidden border border-[#DED7CA] dark:border-[#1E3E34]">
              <DriverLocationMap coords={coords} vehicleType={vType} />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#696B64] dark:text-[#B9C8BF] border-t border-[#DED7CA] dark:border-[#1E3E34] pt-2">
              <span className="truncate">
                {lastSyncedTime
                  ? `Synced ${lastSyncedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Continuous device tracking active"}
              </span>
              <span className="text-[10px] font-semibold uppercase text-[#123D32] dark:text-[#347858] bg-[#FAF7F0] dark:bg-[#061A16] px-2 py-0.5 rounded-[4px] border border-[#DED7CA] dark:border-[#1E3E34] shrink-0 ml-2">
                Active Radar
              </span>
            </div>
          </div>

          {/* Card 3: Fleet Vehicle Specifications */}
          <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[16px] border border-[#DED7CA] dark:border-[#1E3E34] p-6 md:p-8 flex flex-col justify-between min-h-[310px] shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#696B64] dark:text-[#B9C8BF] mb-1">
                  Fleet Specifications
                </p>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight capitalize">
                  {vType} Fleet
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPricing(true)}
                className="text-[#10251C] dark:text-[#F7F5ED] hover:text-[#123D32] dark:hover:text-[#347858] p-2 rounded-[8px] border border-[#DED7CA] dark:border-[#1E3E34] hover:border-[#123D32] dark:hover:border-[#28664D] hover:bg-[#F7F1E5] dark:hover:bg-[#101713] transition-all cursor-pointer shadow-xs"
                title="Edit pricing and vehicle details"
              >
                <Edit3 size={15} />
              </button>
            </div>

            <div className="flex gap-4 items-center my-3">
              {pricing?.imageUrl ? (
                <img
                  src={pricing.imageUrl}
                  alt="Vehicle"
                  className="w-20 h-20 rounded-[12px] object-cover border border-[#DED7CA] dark:border-[#1E3E34] shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-[12px] bg-[#FAF7F0] dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#1E3E34] flex flex-col items-center justify-center text-[#123D32] dark:text-[#347858] shrink-0 gap-1">
                  {vType === "auto" ? (
                    <Car size={26} className="text-amber-600" />
                  ) : vType === "bike" || vType === "scooty" ? (
                    <Bike size={26} className="text-[#123D32] dark:text-[#347858]" />
                  ) : vType === "loading" || vType === "truck" ? (
                    <Truck size={26} className="text-[#10251C] dark:text-[#F7F5ED]" />
                  ) : (
                    <Car size={26} className="text-[#123D32] dark:text-[#347858]" />
                  )}
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B9C8BF]">
                    {vType}
                  </span>
                </div>
              )}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs text-[#696B64] dark:text-[#B9C8BF]">
                  <span className="font-medium">Base Fare:</span>
                  <span className="tabular-nums text-[#10251C] dark:text-[#F7F5ED] font-mono font-bold">₹{cfg.baseFare}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#696B64] dark:text-[#B9C8BF]">
                  <span className="font-medium">Distance Rate:</span>
                  <span className="tabular-nums text-[#10251C] dark:text-[#F7F5ED] font-mono font-bold">₹{cfg.pricePerKm}/km</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#696B64] dark:text-[#B9C8BF]">
                  <span className="font-medium">Time Charge:</span>
                  <span className="tabular-nums text-[#10251C] dark:text-[#F7F5ED] font-mono font-bold">₹{cfg.pricePerMinute}/min</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#696B64] dark:text-[#B9C8BF]">
                  <span className="font-medium">Demand Multiplier:</span>
                  <span className="tabular-nums text-[#10251C] dark:text-[#F7F5ED] font-mono font-bold">{cfg.multiplier}x</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#123D32] dark:text-[#347858] bg-emerald-50 dark:bg-[#1D3428] px-2.5 py-1 rounded-[6px] border border-emerald-200 dark:border-[#28664D] mt-auto self-start uppercase tracking-wider">
              <Check size={12} className="text-[#123D32] dark:text-[#347858]" />
              <span>Pricing Approved & Verified</span>
            </div>
          </div>

        </div>

        {/* Driver Wallet & Bank Withdrawal */}
        <div className="w-full">
          <DriverWalletCard />
        </div>

        {/* Driver Performance & Weekly Incentives Goals */}
        <div className="w-full">
          <DriverWeeklyIncentiveCard />
        </div>

        {/* Women's Safety Matching: Driver Passenger Preference */}
        <div className="w-full">
          <DriverPassengerPreferenceCard />
        </div>

        {/* Recent Trips & Drop-Off Ledger */}
        <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[16px] border border-[#DED7CA] dark:border-[#1E3E34] p-6 md:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#DED7CA] dark:border-[#1E3E34] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#696B64] dark:text-[#B9C8BF]">Shift Activity</p>
              <h2 className="text-xl font-serif font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight">Recent Trips & Drop-Off Ledger</h2>
            </div>
            <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] font-medium">Real-time trip records and drop-off arrival times</p>
          </div>

          {recentTrips.length === 0 ? (
            <div className="text-center py-10 bg-[#FAF7F0] dark:bg-[#061A16] rounded-[12px] border border-dashed border-[#DED7CA] dark:border-[#1E3E34]">
              <p className="text-sm font-bold text-[#10251C] dark:text-[#F7F5ED]">No trips recorded for this shift yet</p>
              <p className="text-xs text-[#696B64] dark:text-[#B9C8BF] mt-1">Toggle online above to start receiving passenger bookings</p>
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
                    className="p-4 rounded-[12px] border border-[#DED7CA] dark:border-[#1E3E34] bg-[#F7F1E5]/60 dark:bg-[#061A16]/60 hover:bg-[#F7F1E5] dark:hover:bg-[#101713] transition flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs"
                  >
                    {/* Route Details */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono uppercase bg-[#F7F1E5] dark:bg-[#0B2822] text-[#10251C] dark:text-[#F7F5ED] px-2 py-0.5 rounded-[4px] border border-[#DED7CA] dark:border-[#1E3E34]">
                          #{trip.id.slice(-6)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[4px] ${
                            isCompleted
                              ? "bg-emerald-100 dark:bg-[#1D3428] text-[#123D32] dark:text-[#347858]"
                              : isCancelled
                              ? "bg-red-100 dark:bg-red-950/40 text-[#E34222] dark:text-[#E06A50]"
                              : "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300"
                          }`}
                        >
                          {trip.status}
                        </span>
                        <span className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium">
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
                          <span className="w-2 h-2 rounded-full bg-[#123D32] dark:bg-[#347858] mt-1 flex-shrink-0" />
                          <span className="text-[#696B64] dark:text-[#B9C8BF] truncate">{trip.pickupAddress}</span>
                        </div>
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full border border-[#123D32] dark:border-[#347858] bg-[#FAF7F0] dark:bg-[#0B2822] mt-1 flex-shrink-0" />
                          <span className="text-[#10251C] dark:text-[#F7F5ED] font-semibold truncate">{trip.dropAddress}</span>
                        </div>
                      </div>

                      {/* Drop-off Time & Timing Info */}
                      <div className="text-[11px] font-medium text-[#696B64] dark:text-[#B9C8BF] flex items-center gap-2 flex-wrap">
                        {isCompleted && dropTime && (
                          <span className="text-[#123D32] dark:text-[#347858] bg-emerald-50 dark:bg-[#1D3428] px-2 py-0.5 rounded-[4px] border border-emerald-200 dark:border-[#28664D] flex items-center gap-1 font-semibold">
                            <CheckCircle2 size={12} /> Dropped off at {dropTime} ({trip.tripDurationMinutes} mins)
                          </span>
                        )}
                        {isInProgress && dropTime && (
                          <span className="text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-[4px] border border-blue-200 dark:border-blue-900/50 flex items-center gap-1 font-semibold">
                            <Clock size={12} /> Est. Drop-off by {dropTime} (~{trip.tripDurationMinutes} mins)
                          </span>
                        )}
                        {isCancelled && (
                          <span className="text-[#E34222] dark:text-[#E06A50] bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-[4px] border border-red-200 dark:border-red-900/50 flex items-center gap-1 font-semibold">
                            ✕ {trip.cancellationReason || "Cancelled"}
                            {trip.cancellationFeeApplied ? " • ₹40 Driver Compensation" : " • Free cancel"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fare / Earnings */}
                    <div className="text-left md:text-right flex-shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-[#DED7CA] dark:border-[#1E3E34]">
                      <p className="text-[10px] uppercase font-bold text-[#696B64] dark:text-[#B9C8BF]">Driver Share</p>
                      <p className="text-lg font-bold text-[#10251C] dark:text-[#F7F5ED] font-mono">₹{trip.partnerAmount}</p>
                      <p className="text-[10px] text-[#696B64] dark:text-[#B9C8BF] font-medium">Fare: ₹{trip.fare}</p>
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
                className="bg-[#FAF7F0] dark:bg-[#0B2822] w-full max-w-md rounded-[16px] shadow-2xl border border-[#DED7CA] dark:border-[#1E3E34] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="bg-[#123D32] dark:bg-[#0D3027] px-6 py-5 flex items-center justify-between text-white border-b border-[#DED7CA]/20 dark:border-[#1E3E34]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="font-bold text-xs uppercase tracking-widest text-[#FAF7F0]">{t("driver.incomingRequest", "Incoming Request")}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 dark:bg-black/30 px-3 py-1 rounded-[8px] text-xs font-semibold text-[#FAF7F0]">
                    <Clock size={12} className={requestCountdown <= 5 ? "text-[#E34222] animate-pulse" : "text-amber-400"} />
                    <span className={requestCountdown <= 5 ? "text-[#E34222] font-black" : "text-[#FAF7F0]"}>{requestCountdown}s left</span>
                  </div>
                </div>

                {/* Ride Details */}
                <div className="p-6 space-y-4">

                  {/* Women's Safety Ride Indicator */}
                  {pendingRequest.driverPreference === "woman" && (
                    <div className="bg-emerald-50 dark:bg-[#1D3428] border border-emerald-200 dark:border-[#28664D] rounded-[10px] p-3 flex items-center gap-2.5 text-xs font-bold text-[#046A38] dark:text-[#A3E635]">
                      <Shield size={18} className="text-[#046A38] dark:text-[#A3E635] flex-shrink-0" />
                      <div>
                        <p className="uppercase tracking-wide text-[10px] font-black text-[#046A38] dark:text-[#A3E635]">Women's Safety Ride</p>
                        <p className="text-[11px] font-medium text-[#10251C] dark:text-[#F7F5ED]">Passenger requested a verified woman driver</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Locations */}
                  <div className="bg-[#FAF7F0] dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#1E3E34] rounded-[12px] p-4 space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="flex flex-col items-center flex-shrink-0 pt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#123D32] dark:bg-[#347858] border-2 border-white dark:border-[#17211B] shadow-sm" />
                        <div className="w-px bg-[#DED7CA] dark:bg-[#29372E] mt-1 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-[#696B64] dark:text-[#B9C8BF] uppercase tracking-wider mb-0.5">{t("booking.pickup", "Pickup Location")}</p>
                        <p className="text-xs text-[#10251C] dark:text-[#F7F5ED] font-bold leading-snug truncate">{pendingRequest.pickupAddress}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="flex-shrink-0 pt-1">
                        <div className="w-2.5 h-2.5 rounded-[2px] bg-[#E34222] dark:bg-[#E06A50] border-2 border-white dark:border-[#17211B] shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-[#696B64] dark:text-[#B9C8BF] uppercase tracking-wider mb-0.5">{t("booking.drop", "Drop Location")}</p>
                        <p className="text-xs text-[#10251C] dark:text-[#F7F5ED] font-bold leading-snug truncate">{pendingRequest.dropAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Trip Duration & Dropoff Time */}
                  <div className="bg-[#FAF7F0] dark:bg-[#061A16] border border-[#DED7CA] dark:border-[#1E3E34] rounded-[12px] p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#696B64] dark:text-[#B9C8BF]">
                      <Clock size={13} className="text-[#696B64] dark:text-[#B9C8BF]" />
                      <span className="font-medium">{t("driver.estDuration", "Est. Duration")}:</span>
                      <span className="font-bold text-[#10251C] dark:text-[#F7F5ED]">~{pendingRequest.tripDurationMinutes || 15} mins</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#696B64] dark:text-[#B9C8BF]">
                      <Navigation size={13} className="text-[#123D32] dark:text-[#347858]" />
                      <span className="font-medium">{t("driver.estDropoff", "Drop-off:")}</span>
                      <span className="font-bold text-[#10251C] dark:text-[#F7F5ED]">
                        {pendingRequest.estimatedDropoffTime
                          ? new Date(pendingRequest.estimatedDropoffTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                          : "Shortly"}
                      </span>
                    </div>
                  </div>

                  {/* Earnings Display: Upfront Net Payout (Commission already deducted) */}
                  <div className="bg-[#123D32] dark:bg-[#0D3027] rounded-[12px] p-5 text-center border border-[#123D32]/30 dark:border-[#1E3E34] flex flex-col items-center justify-center">
                    <p className="text-[#FAF7F0]/80 text-[10px] uppercase tracking-widest font-bold mb-1">{t("driver.netFare", "Your Net Payout (Take-Home)")}</p>
                    <div className="flex items-center gap-1.5 text-[#FAF7F0] text-4xl font-serif font-black tracking-tight leading-none">
                      <IndianRupee size={24} className="text-[#D7AC62]" />
                      <span>{pendingRequest.partnerAmount || Math.round((pendingRequest.fare || 0) * 0.9)}</span>
                    </div>
                    <p className="text-[10px] text-[#FAF7F0]/70 mt-2 font-medium">Guaranteed driver earnings. Platform commission already deducted.</p>
                  </div>

                </div>

                {/* Actions */}
                <div className="px-6 pb-6 pt-2 border-t border-[#DED7CA] dark:border-[#1E3E34] flex gap-3">
                  <button
                    onClick={() => handleRequestAction(pendingRequest._id, "reject")}
                    disabled={processingAction !== null}
                    className="flex-1 border border-[#DED7CA] dark:border-[#1E3E34] bg-[#FAF7F0] dark:bg-[#10352C] hover:bg-[#F7F1E5] dark:hover:bg-[#143D32] text-[#10251C] dark:text-[#F7F5ED] py-3 rounded-[8px] text-xs uppercase tracking-wider font-bold active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    {processingAction === "reject" ? (
                      <Loader2 className="animate-spin w-4 h-4 mx-auto text-[#696B64] dark:text-[#B9C8BF]" />
                    ) : (
                      t("driver.reject", "Reject")
                    )}
                  </button>
                  <button
                    onClick={() => handleRequestAction(pendingRequest._id, "accept")}
                    disabled={processingAction !== null}
                    className="flex-1 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-[#FAF7F0] min-h-[48px] py-3.5 rounded-[8px] text-xs sm:text-sm uppercase tracking-wider font-bold active:scale-[0.98] transition-all shadow-md disabled:opacity-40 cursor-pointer"
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
