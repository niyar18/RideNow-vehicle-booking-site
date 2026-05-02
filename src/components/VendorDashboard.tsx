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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import PartnerEarningsChart from "./PartnerEarningChart";

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
  { id: 4, title: "Review" },
  { id: 5, title: "Video KYC" },
  { id: 6, title: "Pricing" },
  { id: 7, title: "Final Review" },
  { id: 8, title: "Live" },
];

const TOTAL_STEPS = STEPS.length;

/* ================= DASHBOARD ================= */

export default function VendorDashboard({
  vendorStep,
  vendorStatus,
}: {
  vendorStep: number;
  vendorStatus: VendorStatus;
}) {
  const router = useRouter();
  const { userData } = useSelector(
    (state: RootState) => state.user
  );

  const [showPricing, setShowPricing] = useState(false);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const requestKycAgain = async () => {
  try {
    await axios.patch("/api/partner/video-kyc/request");
    window.location.reload();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error");
  }
};

 const getActiveStep = () => {
  let step = vendorStep + 1;

  if (step > 5 && userData?.videoKycStatus !== "approved") {
    return 5;
  }

  return Math.min(step, TOTAL_STEPS);
};

const activeStep = getActiveStep();


  const progressPercent =
    ((activeStep - 1) / (TOTAL_STEPS - 1)) * 100;

  const videoKycStatus: VideoKycStatus =
    userData?.videoKycStatus || "not_required";

  const roomId = userData?.videoKycRoomId;

  /* ================= LOAD PRICING ================= */

  useEffect(() => {
    axios
      .get("/api/partner/vehicle/pricing")
      .then((res) => setPricing(res.data.pricing))
      .catch(() => {});
  }, []);

  /* ================= NAVIGATION ================= */

  const goToStep = (step: Step) => {
    if (step.id === 6 && vendorStatus === "approved") {
      setShowPricing(true);
      return;
    }

    if (step.route && step.id <= activeStep) {
      router.push(step.route);
    }
  };



  /* ================= STATUS SECTION ================= */

 const renderStatus = () => {

  /* ===== DOCUMENT REVIEW REJECTED ===== */
  if (activeStep === 4 && vendorStatus === "rejected") {
    return (
      <RejectionCard
        title="Documents Rejected"
        reason={userData?.vendorRejectionReason}
        actionLabel="Update Documents"
        onAction={() =>
          router.push("/partner/onboard/documents")
        }
      />
    );
  }

  /* ===== DOCUMENT REVIEW PENDING ===== */
  if (activeStep === 4 && vendorStatus === "pending") {
    return (
      <StatusCard
        icon={<Clock size={20} />}
        title="Documents Under Review"
        desc="Admin is verifying your documents."
      />
    );
  }

  /* ===== VIDEO KYC STEP ===== */
  if (activeStep === 5) {

    if (videoKycStatus === "approved") {
      return (
        <StatusCard
          icon={<Check size={20} />}
          title="Video KYC Approved"
          desc="You can now proceed to pricing."
        />
      );
    }

    if (videoKycStatus === "rejected") {
      return (
        <RejectionCard
          title="Video KYC Rejected"
          reason={userData?.videoKycRejectionReason}
          actionLabel="Request Again"
          onAction={requestKycAgain}
        />
      );
    }

    if (videoKycStatus === "in_progress" && roomId) {
      return (
        <ActionCard
          icon={<Video />}
          title="Admin Started Video KYC"
          button="Join Call"
          onClick={() =>
            router.push(`/video-kyc/${roomId}`)
          }
        />
      );
    }

    return (
      <StatusCard
        icon={<Clock size={20} />}
        title="Waiting for Admin"
        desc="Admin will initiate Video KYC shortly."
      />
    );
  }

  /* ===== PRICING REVIEW ===== */
  if (activeStep === 7 && pricing?.status === "pending") {
    return (
      <StatusCard
        icon={<Clock size={20} />}
        title="Pricing Under Review"
        desc="Admin is reviewing your pricing."
      />
    );
  }

  /* ===== PRICING REJECTED ===== */
  if (pricing?.status === "rejected") {
    return (
      <RejectionCard
        title="Pricing Rejected"
        reason={pricing.rejectionReason}
        actionLabel="Edit & Resubmit"
        onAction={() => setShowPricing(true)}
      />
    );
  }

  /* ===== LIVE ===== */
  if (
    activeStep === 8 &&
    pricing?.status === "approved"
  ) {
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
          onClick={() => router.push("/vendor/orders")}
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

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 px-4 pt-28 pb-20">
      <div className="max-w-7xl mx-auto space-y-16">

        <div>
          <h1 className="text-4xl font-bold">
            Vendor Onboarding
          </h1>
          <p className="text-gray-600 mt-3">
            Complete all steps to activate your account
          </p>
        </div>

        {/* PROGRESS UI (UNCHANGED) */}
        <div className="bg-white rounded-3xl p-10 shadow-xl border overflow-x-auto">
          <div className="relative min-w-[800px]">

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
/>
    </section>
  );
}

/* ================= PRICING MODAL ================= */

function PricingModal({ open, onClose, pricing }: any){
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [baseFare, setBaseFare] = useState("");
  const [pricePerKm, setPricePerKm] = useState("");
  const [waitingCharge, setWaitingCharge] = useState("");
  const [loading, setLoading] = useState(false);

  const submitPricing = async () => {
    const formData = new FormData();
    if (image) formData.append("image", image);
    formData.append("baseFare", baseFare);
    formData.append("pricePerKm", pricePerKm);
    formData.append("waitingCharge", waitingCharge);

    setLoading(true);
    await axios.post("/api/partner/vehicle/pricing", formData);
    setLoading(false);
    window.location.reload();
  };

   useEffect(() => {
    if (pricing) {
      setBaseFare(pricing.baseFare?.toString() || "");
      setPricePerKm(pricing.pricePerKm?.toString() || "");
      setWaitingCharge(pricing.waitingCharge?.toString() || "");
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
                Pricing & Vehicle Image
              </h2>
            </div>

            <div className="p-6 space-y-6">
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

              <PriceInput label="Base Fare" value={baseFare} onChange={setBaseFare} />
              <PriceInput label="Price per KM" value={pricePerKm} onChange={setPricePerKm} />
              <PriceInput label="Waiting charge / min" value={waitingCharge} onChange={setWaitingCharge} />
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border rounded-xl py-2"
              >
                Cancel
              </button>
              <button
                onClick={submitPricing}
                disabled={loading}
                className="flex-1 bg-black text-white rounded-xl py-2"
              >
                {loading ? "Saving..." : "Save"}
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

function ActionCard({ icon, title, button, onClick }: any) {
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

        <h3 className="text-base sm:text-lg md:text-xl font-semibold">
          {title}
        </h3>
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
