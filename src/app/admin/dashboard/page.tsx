"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  Truck,
  Video,
} from "lucide-react";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminEarningsChart from "@/components/AdminEarning";
import StatusAreaChart from "@/components/AdminStatusChart";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
/* ================= TYPES ================= */

type Stats = {
  totalVendors: number;
  approved: number;
  pending: number;
  rejected: number;
};

type TabType = "kyc" | "vendor" | "vehicle";

/* ================= PAGE ================= */

export default function AdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [vendorReviews, setVendorReviews] = useState<any[]>([]);
  const [vehicleReviews, setVehicleReviews] = useState<any[]>([]);
  const [videoKycReviews, setVideoKycReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("kyc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [dashboardRes, kycRes] = await Promise.all([
        axios.get("/api/admin/dashboard"),
        axios.get("/api/admin/vendors/video-kyc/pending"),
      ]);

      setStats(dashboardRes.data.stats);
      setVendorReviews(dashboardRes.data.pendingVendors);
      setVehicleReviews(dashboardRes.data.pendingVehicles);
      setVideoKycReviews(kycRes.data || []);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-400">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">

      {/* HEADER */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b z-40">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
              R
            </div>
            <span className="font-bold text-lg tracking-wide">
              RideNow ADMIN
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700">
            <ShieldCheck size={14} />
            Secure Mode
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">

        {/* KPI SECTION */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
  <Kpi
    label="Total Vendors" value={stats.totalVendors}
    icon={<Users size={18} />} variant="totalVendors"
    trend="+12%" trendDir="up" sub="vs last month"
  />
  <Kpi
    label="Approved" value={stats.approved}
    icon={<CheckCircle2 size={18} />} variant="approved"
    trend="+8%" trendDir="up" sub="verified vendors"
  />
  <Kpi
    label="Pending" value={stats.pending}
    icon={<Clock size={18} />} variant="pending"
    trend="0%" trendDir="flat" sub="awaiting review"
  />
  <Kpi
    label="Rejected" value={stats.rejected}
    icon={<XCircle size={18} />} variant="rejected"
    trend="-3%" trendDir="down" sub="declined"
  />
</div>

        {/* ANALYTICS SECTION */}
      

       
           <StatusAreaChart stats={stats}/>
       

        <AdminEarningsChart/>

        {/* TAB NAVIGATION */}
       {/* TAB NAVIGATION */}
{/* TAB NAVIGATION */}
<div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-100 flex flex-wrap gap-2">
  <TabButton active={activeTab === "kyc"} count={videoKycReviews.length}
    onClick={() => setActiveTab("kyc")} icon={<Video size={15} />}>
    Video KYC
  </TabButton>
  <TabButton active={activeTab === "vendor"} count={vendorReviews.length}
    onClick={() => setActiveTab("vendor")} icon={<Users size={15} />}>
    Vendor Reviews
  </TabButton>
  <TabButton active={activeTab === "vehicle"} count={vehicleReviews.length}
    onClick={() => setActiveTab("vehicle")} icon={<Truck size={15} />}>
    Pricing &amp; Images
  </TabButton>
</div>

{/* TAB CONTENT */}
<AnimatePresence mode="wait">
  <motion.div key={activeTab}
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}
    className="space-y-3"
  >
    {activeTab === "kyc"     && <ContentList data={videoKycReviews} type="kyc" />}
    {activeTab === "vendor"  && <ContentList data={vendorReviews}   type="vendor" />}
    {activeTab === "vehicle" && <ContentList data={vehicleReviews}  type="vehicle" />}
  </motion.div>
</AnimatePresence>
      </main>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function TabButton({ active, onClick, children, icon, count }: any) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 select-none
        ${active
          ? "bg-neutral-950 text-white shadow-lg shadow-black/20"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        }`}
    >
      <span className={`flex items-center ${active ? "text-white" : "text-gray-400"}`}>
        {icon}
      </span>

      <span className="hidden sm:inline">{children}</span>

      <span className={`min-w-[22px] h-5 px-1.5 text-[11px] font-bold rounded-full flex items-center justify-center transition-all
        ${active
          ? "bg-white text-black"
          : count > 0
          ? "bg-red-500 text-white"
          : "bg-gray-200 text-gray-400"
        }`}
      >
        {count}
      </span>
    </motion.button>
  );
}

const KYC_STATUS: Record<string, { label: string; pill: string; dot: string }> = {
  pending:     { label: "Pending",     pill: "bg-amber-50 text-amber-800 border border-amber-200",   dot: "bg-amber-500" },
  in_progress: { label: "In Progress", pill: "bg-blue-50  text-blue-800  border border-blue-200",    dot: "bg-blue-500" },
  completed:   { label: "Completed",   pill: "bg-green-50 text-green-800 border border-green-200",   dot: "bg-green-500" },
};

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-800",
  "bg-teal-100 text-teal-800",
  "bg-blue-100 text-blue-800",
  "bg-pink-100 text-pink-800",
];

function ContentList({ data, type }: any) {
  const router = useRouter();

  const startKyc = async (vendorId: string) => {
    try {
      const res = await axios.patch(`/api/admin/vendors/video-kyc/start/${vendorId}`);
      if (res.data.roomId) router.push(`/video-kyc/${res.data.roomId}`);
    } catch (err) {
      console.error("Start KYC error:", err);
    }
  };

  if (data.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="bg-white rounded-2xl py-16 text-center border border-dashed border-gray-200 shadow-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={22} className="text-green-500" />
        </div>
        <p className="font-bold text-gray-800 text-base">All caught up!</p>
        <p className="text-sm text-gray-400 mt-1">No pending items right now.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 mb-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {type === "kyc" ? "Video KYC Queue" : type === "vendor" ? "Vendor Review Queue" : "Vehicle Review Queue"}
        </p>
        <p className="text-xs text-gray-400">{data.length} item{data.length > 1 ? "s" : ""}</p>
      </div>

      {data.map((item: any, i: number) => {
        const name     = item.name || item.ownerName || "—";
        const email    = item.email || item.ownerEmail || "—";
        const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
        const avColor  = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const s        = KYC_STATUS[item.videoKycStatus] ?? KYC_STATUS.pending;

        return (
          <motion.div key={item._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
            className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-sm transition-shadow"
          >
            {/* Avatar + Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avColor}`}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-400 truncate">{email}</p>
                {type === "kyc" && (
                  <span className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${s.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="shrink-0">
              {type === "kyc" ? (
                item.videoKycStatus === "in_progress" ? (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    onClick={() => router.push(`/video-kyc/${item.videoKycRoomId}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    <Video size={13} /> Join Call
                  </motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.96 }}
                    onClick={() => startKyc(item._id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-semibold transition-colors"
                  >
                    <Video size={13} /> Start KYC
                  </motion.button>
                )
              ) : (
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => router.push(type === "vendor" ? `/admin/vendors/${item._id}` : `/admin/vehicles/${item._id}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-semibold transition-colors"
                >
                  Review <ArrowRight size={13} />
                </motion.button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const KPI_CONFIG: Record<string, {
  iconBg: string; iconColor: string; trendBg: string; trendText: string; cardHover: string;
}> = {
  totalVendors: {
    iconBg: "bg-purple-50", iconColor: "text-purple-700",
    trendBg: "bg-purple-50", trendText: "text-purple-800",
    cardHover: "hover:shadow-purple-100/60",
  },
  approved: {
    iconBg: "bg-blue-50", iconColor: "text-blue-800",
    trendBg: "bg-green-50", trendText: "text-green-800",
    cardHover: "hover:shadow-blue-100/60",
  },
  pending: {
    iconBg: "bg-amber-50", iconColor: "text-amber-800",
    trendBg: "bg-gray-100", trendText: "text-gray-600",
    cardHover: "hover:shadow-amber-100/60",
  },
  rejected: {
    iconBg: "bg-red-50", iconColor: "text-red-800",
    trendBg: "bg-red-50", trendText: "text-red-800",
    cardHover: "hover:shadow-red-100/60",
  },
};

function Kpi({
  label,
  value,
  icon,
  trend,
  trendDir = "up",
  sub,
  variant = "totalVendors",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  trendDir?: "up" | "down" | "flat";
  sub?: string;
  variant?: keyof typeof KPI_CONFIG;
}) {
  const cfg = KPI_CONFIG[variant];

  const trendIcon =
    trendDir === "up"   ? <TrendingUp size={11} />   :
    trendDir === "down" ? <TrendingDown size={11} />  :
    <Minus size={11} />;

  const trendColor =
    trendDir === "up"   ? "bg-green-50 text-green-800" :
    trendDir === "down" ? "bg-red-50 text-red-800"     :
    "bg-gray-100 text-gray-600";

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0 20px 48px rgba(0,0,0,0.10)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm
        cursor-default relative overflow-hidden group ${cfg.cardHover}`}
    >
      {/* subtle tinted bg on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
        rounded-2xl ${cfg.iconBg}`} style={{ zIndex: 0 }} />

      <div className="relative z-10">
        {/* Top row: icon + trend badge */}
        <div className="flex items-start justify-between mb-4">
          <motion.div
            whileHover={{ rotate: -6, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}
          >
            {icon}
          </motion.div>

          {trend && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold
              px-2 py-1 rounded-full ${trendColor}`}>
              {trendIcon}
              {trend}
            </span>
          )}
        </div>

        {/* Label */}
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
          {label}
        </p>

        {/* Value — count-up animation */}
        <motion.p
          className="text-3xl font-extrabold text-gray-950 leading-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {value}
        </motion.p>

        {/* Footer */}
        {sub && (
          <div className="flex items-center justify-between mt-3 pt-3
            border-t border-gray-100">
            <p className="text-[11px] text-gray-400">{sub}</p>
            <Clock size={11} className="text-gray-300" />
          </div>
        )}
      </div>
    </motion.div>
  );
}