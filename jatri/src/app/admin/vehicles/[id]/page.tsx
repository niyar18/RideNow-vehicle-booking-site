"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { ReviewIntro } from "@/features/admin/components/AdminChrome";
import AdminDecisionDialog from "@/features/admin/components/AdminDecisionDialog";
import ui from "@/features/admin/components/admin-ui.module.css";
import {
  Clock,
  IndianRupee,
  CheckCircle,
  XCircle,
  Truck,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";

export default function AdminVehicleReviewPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [rates, setRates] = useState<any>(null);

  /* ================= LOAD ================= */

  useEffect(() => {
    async function loadRates() {
      try {
        const res = await axios.get("/api/vehicles/pricing");
        if (res.data.success) {
          setRates(res.data.rates);
        }
      } catch (err) {
        console.error("Failed to load rates:", err);
      }
    }
    loadRates();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`/api/admin/vehicles/${id}`);
        setData(res.data.vehicle);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  /* ================= ACTIONS ================= */

  const approve = async () => {
    try {
      setActionLoading(true);
      await axios.post(`/api/admin/vehicles/${id}/approve`);
      router.push("/admin/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      setShowApprove(false);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) return;

    try {
      setActionLoading(true);
      await axios.post(`/api/admin/vehicles/${id}/reject`, {
        reason: rejectReason,
      });
      router.push("/admin/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      setShowReject(false);
    }
  };

  if (loading)
    return (
      <main id="admin-content" tabIndex={-1} className={ui.content}><p role="status">
        Loading vehicle review…
      </p></main>
    );

  if (!data) return (
    <main id="admin-content" tabIndex={-1} className={ui.content}>
      <ReviewIntro eyebrow="Vehicle review" title="Review unavailable" />
      <p className={ui.secondary} role="alert">This vehicle record couldn’t be loaded.</p>
    </main>
  );

  const standardRates: Record<string, { baseFare: number; pricePerKm: number; pricePerMinute: number; multiplier: number }> = {
    bike:    { baseFare: 30,  pricePerKm: 8,   pricePerMinute: 1.5, multiplier: 1.0 },
    auto:    { baseFare: 50,  pricePerKm: 12,  pricePerMinute: 2.0, multiplier: 1.2 },
    car:     { baseFare: 80,  pricePerKm: 18,  pricePerMinute: 3.0, multiplier: 1.5 },
    loading: { baseFare: 120, pricePerKm: 24,  pricePerMinute: 4.0, multiplier: 1.8 },
    truck:   { baseFare: 180, pricePerKm: 30,  pricePerMinute: 5.0, multiplier: 2.2 },
  };

  const vType = data.type || "car";
  const cfg = (rates && rates[vType.toLowerCase()]) || standardRates[vType.toLowerCase()] || standardRates.car;

  return (
    <main id="admin-content" tabIndex={-1}>
      <ReviewIntro eyebrow="Vehicle application" title={data.model || data.number || "Vehicle review"}
        detail={[data.owner?.name, data.owner?.email].filter(Boolean).join(" · ")}
        status={<StatusBadge status={data.status} />} />

      {/* MAIN */}
      <div className={`${ui.reviewWrap} grid lg:grid-cols-2 gap-4 lg:gap-5`}>

        {/* IMAGE */}
        <div
          className={ui.reviewPhoto}
        >
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt="Vehicle"
              className="w-full"
            />
          ) : (
            <div className="h-[220px] sm:h-[420px] grid place-items-center text-[var(--admin-muted)]">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={32} aria-hidden="true" />
                <span className={ui.secondary}>No vehicle photo was submitted.</span>
              </div>
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div className="min-w-0 space-y-4">

          <Card title="Vehicle Details" icon={<Truck size={18} />}>
            <Info label="Vehicle Type" value={data.type} />
            <Info label="Registration Number" value={data.number} />
            <Info label="Model" value={data.model} />
          </Card>

          <Card title="Pricing Configuration (Standard)" icon={<IndianRupee size={18} />}>
            <Info label="Base Fare" value={`₹${cfg.baseFare}`} />
            <Info label="Price per KM" value={`₹${cfg.pricePerKm}`} />
            <Info label="Price per Minute" value={`₹${cfg.pricePerMinute}`} />
            <Info label="Multiplier" value={`${cfg.multiplier}x`} />
          </Card>

          {data.status === "pending" && (
            <div
              className={ui.reviewCard}
            >
              <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                <ShieldCheck size={18} />
                Admin Decision
              </div>

              <div className="flex gap-2.5 sm:gap-4">
                <button
                  onClick={() => setShowApprove(true)}
                  className={`flex-1 ${ui.primary}`}
                >
                  Approve
                </button>

                <button
                  onClick={() => setShowReject(true)}
                  className={`flex-1 ${ui.button}`}
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* APPROVE MODAL */}
      <ConfirmModal
        open={showApprove}
        title="Approve this vehicle?"
        loading={actionLoading}
        onClose={() => setShowApprove(false)}
        onConfirm={approve}
      />

      {/* REJECT MODAL */}
      <RejectModal
        open={showReject}
        reason={rejectReason}
        setReason={setRejectReason}
        loading={actionLoading}
        onClose={() => setShowReject(false)}
        onConfirm={reject}
      />
    </main>
  );
}

/* ================= UI COMPONENTS ================= */

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={ui.reviewCard}>
      <h2 className={ui.reviewCardTitle}>{icon}{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className={ui.reviewRow}><span className={ui.secondary}>{label}</span><span>{value ?? "—"}</span></div>;
}

function StatusBadge({ status }: { status?: string }) {
  const tone = status === "approved" || status === "rejected" ? status : "pending";
  const Icon = tone === "approved" ? CheckCircle : tone === "rejected" ? XCircle : Clock;
  return <span className={ui.statusDetail} data-tone={tone}><Icon size={14} aria-hidden="true" /><span className="capitalize">{tone}</span></span>;
}

function ConfirmModal({ open, title, loading, onClose, onConfirm }: {
  open: boolean; title: string; loading: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return <AdminDecisionDialog open={open} title={title} confirmLabel="Approve" loading={loading} onClose={onClose} onConfirm={onConfirm} />;
}

function RejectModal({ open, reason, setReason, loading, onClose, onConfirm }: {
  open: boolean; reason: string; setReason: (reason: string) => void; loading: boolean;
  onClose: () => void; onConfirm: () => void;
}) {
  return (
    <AdminDecisionDialog open={open} title="Reject vehicle" confirmLabel="Reject" loading={loading} destructive
      confirmDisabled={!reason.trim()} onClose={onClose} onConfirm={onConfirm}>
      <label className={ui.secondary}>
        Rejection reason
        <textarea value={reason} onChange={(e) => setReason(e.currentTarget.value)} className={ui.field} rows={3} />
      </label>
    </AdminDecisionDialog>
  );
}
