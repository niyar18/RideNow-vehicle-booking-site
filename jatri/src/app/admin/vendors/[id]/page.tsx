"use client";

import { motion } from "framer-motion";
import { ReviewIntro } from "@/features/admin/components/AdminChrome";
import AdminDecisionDialog from "@/features/admin/components/AdminDecisionDialog";
import ui from "@/features/admin/components/admin-ui.module.css";
import {
  CheckCircle,
  Clock,
  XCircle,
  Car,
  FileText,
  Landmark,
  ShieldCheck,
  Video,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* ================= PAGE ================= */

export default function AdminVendorReviewPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`/api/admin/vendors/${id}`);
        setData(res.data.vendor);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const approveVendor = async () => {
    try {
      setActionLoading(true);
      const res = await axios.post(`/api/admin/vendors/${id}/approve`);
      if (res.data.success) {
        router.push("/admin/dashboard");
      } else {
        alert(res.data.message || "Approval failed");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Approval failed due to a server error");
    } finally {
      setActionLoading(false);
      setShowApprove(false);
    }
  };

  const rejectVendor = async () => {
    if (!rejectReason.trim()) return;
    try {
      setActionLoading(true);
      const res = await axios.post(`/api/admin/vendors/${id}/reject`, {
        reason: rejectReason,
      });
      if (res.data.success) {
        router.push("/admin/dashboard");
      } else {
        alert(res.data.message || "Rejection failed");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Rejection failed due to a server error");
    } finally {
      setActionLoading(false);
      setShowReject(false);
    }
  };

  const handleVerifyWoman = async (action: "approve" | "reject" | "revoke", notes?: string) => {
    try {
      setActionLoading(true);
      const res = await axios.post(`/api/admin/drivers/${id}/verify-woman`, {
        action,
        notes: notes || (action === "approve" ? "Verified by Admin" : "Status updated by Admin"),
      });
      if (res.data?.success) {
        setData((prev: any) => ({
          ...prev,
          safetyMatching: res.data.safetyMatching,
        }));
      } else {
        alert(res.data?.message || "Failed to update women driver status");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Error updating women driver status");
    } finally {
      setActionLoading(false);
    }
  };

  const updatePillarStatus = async (pillar: string, status: string) => {
    try {
      setActionLoading(true);
      const res = await axios.post(`/api/admin/vendors/${id}/verify-pillar`, {
        pillar,
        status,
      });
      if (res.data.success) {
        setData((prev: any) => ({
          ...prev,
          driverVerificationStatus: res.data.driverVerificationStatus,
          vendorStatus: res.data.vendorStatus,
        }));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update pillar status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className={ui.content} role="status">
        Loading vendor review…
      </div>
    );

  if (!data) return (
    <main className={ui.content}>
      <ReviewIntro eyebrow="Vendor review" title="Review unavailable" />
      <p className={ui.secondary} role="alert">This vendor record couldn’t be loaded.</p>
    </main>
  );

  return (
    <div>
      <ReviewIntro eyebrow="Vendor application" title={data.name || "Vendor review"} detail={data.email}
        status={<StatusBadge status={data.vendorStatus} />} />

      {/* ================= MAIN ================= */}
      <main className={`${ui.reviewWrap} grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 lg:gap-5`}>

        {/* LEFT SIDE */}
        <div className="min-w-0 space-y-4">

          {/* WOMEN'S SAFETY DRIVER VERIFICATION ENGINE */}
          <AnimatedCard title="Women's Safety Driver Verification" icon={<ShieldCheck size={18} className="text-emerald-600" />}>
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Declared Driver Category</p>
                  <p className="text-[11px] text-[var(--admin-muted)] capitalize">
                    {data.safetyMatching?.driverCategory === "woman" ? "Female Driver (Woman)" : "Standard / Not Specified"}
                  </p>
                </div>
                <span className={`inline-block text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                  data.safetyMatching?.driverVerificationStatus === "verified"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : data.safetyMatching?.driverVerificationStatus === "pending"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : data.safetyMatching?.driverVerificationStatus === "rejected"
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : "bg-[var(--admin-subtle)] text-[var(--admin-muted)] border border-[var(--admin-rule)]"
                }`}>
                  {data.safetyMatching?.driverVerificationStatus || "not_submitted"}
                </span>
              </div>

              {data.safetyMatching?.verifiedAt && (
                <p className="text-[11px] text-[var(--admin-muted)]">
                  Verified On: {new Date(data.safetyMatching.verifiedAt).toLocaleDateString()}
                </p>
              )}
              {data.safetyMatching?.verificationNotes && (
                <p className="text-[11px] text-[var(--admin-muted)] italic bg-[var(--admin-subtle)] p-2 rounded-lg border border-[var(--admin-rule)]">
                  Notes: {data.safetyMatching.verificationNotes}
                </p>
              )}

              <div className="pt-2 border-t border-[var(--admin-rule)] flex flex-wrap items-center gap-2">
                {data.safetyMatching?.driverVerificationStatus !== "verified" ? (
                  <button
                    type="button"
                    onClick={() => handleVerifyWoman("approve", "Approved after document & video KYC review")}
                    disabled={actionLoading}
                    className={`flex-1 ${ui.primary}`}
                  >
                    Approve as Verified Woman Driver
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVerifyWoman("revoke", "Revoked by admin")}
                    disabled={actionLoading}
                    className={`flex-1 ${ui.button}`}
                  >
                    Revoke Woman Driver Status
                  </button>
                )}
                {data.safetyMatching?.driverVerificationStatus === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleVerifyWoman("reject", "Application rejected by admin")}
                    disabled={actionLoading}
                    className={ui.danger}
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </AnimatedCard>

          {/* VERIFICATION CHECKLIST */}
          <AnimatedCard title="Verification checklist" icon={<ShieldCheck size={18} className="text-orange-600" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "identity", label: "1. Digital Identity (Aadhaar/PAN)" },
                { key: "drivingLicense", label: "2. Driving Licence (DL Class)" },
                { key: "face", label: "3. Face Match & Video KYC" },
                { key: "background", label: "4. Criminal & Police Clearance" },
                { key: "address", label: "5. Address & Domicile" },
                { key: "bank", label: "6. Bank Account & UPI Binding" },
                { key: "vehicle", label: "7. Vehicle Compliance (RC/Ins/PUC)" },
              ].map((p) => {
                const currentStatus = data.driverVerificationStatus?.[p.key] || "pending";
                return (
                  <div key={p.key} className="p-3 bg-[var(--admin-subtle)] rounded-xl border border-[var(--admin-rule)]/80 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{p.label}</p>
                      <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-1 ${
                        currentStatus === "verified"
                          ? "bg-green-100 text-green-700"
                          : currentStatus === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {currentStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updatePillarStatus(p.key, "verified")}
                        disabled={actionLoading || currentStatus === "verified"}
                        className={ui.primary}
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => updatePillarStatus(p.key, "rejected")}
                        disabled={actionLoading || currentStatus === "rejected"}
                        className={ui.danger}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedCard>

          <AnimatedCard title="Vehicle compliance" icon={<Car size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Vehicle Type" value={data.vehicle?.type} />
              <InfoRow label="Model" value={data.vehicle?.model} />
              <InfoRow label="Registration Plate" value={data.vehicle?.number || data.documents?.rcNumber} />
              <InfoRow label="Driving Licence No." value={data.documents?.licenseNumber || "—"} />
              <InfoRow label="Insurance Policy No." value={data.documents?.insurancePolicyNumber || "—"} />
              <InfoRow
                label="Insurance Expiry"
                value={data.documents?.insuranceExpiry ? new Date(data.documents.insuranceExpiry).toLocaleDateString() : "—"}
              />
            </div>
          </AnimatedCard>

          <AnimatedCard title="Compliance Documents" icon={<FileText size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
              <DocPreview label="Aadhaar / Identity Proof" url={data.documents?.aadhaarUrl} />
              <DocPreview label="Driving License" url={data.documents?.licenseUrl} />
              <DocPreview label="Vehicle RC" url={data.documents?.rcUrl} />
              <DocPreview label="Commercial Insurance" url={data.documents?.insuranceUrl} />
              <DocPreview label="PUC Certificate" url={data.documents?.pucUrl} />
              <DocPreview label="Fitness / Commercial Permit" url={data.documents?.fitnessUrl || data.documents?.permitUrl} />
            </div>
          </AnimatedCard>

        </div>

        {/* RIGHT SIDE */}
        <div className="min-w-0 space-y-4">

          {/* DRIVER SHIFT & COOLDOWN CARD */}
          <AnimatedCard title="Driver Shift & Cooldown" icon={<AlertTriangle size={18} />}>
            <div className="space-y-4">
              {/* Cooldown Status Badge & Summary */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-rule)]">
                <div>
                  <p className="text-[11px] font-bold text-[var(--admin-muted)] uppercase tracking-wider">
                    Dispatch Cooldown Status
                  </p>
                  <p className="text-xs text-[var(--admin-muted)] mt-0.5">
                    Triggered after 3+ cancellations in a single shift
                  </p>
                </div>
                {data.shiftAnalytics?.isCooldownActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    Cooldown Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
                    <CheckCircle size={13} className="text-emerald-600" />
                    Normal / Eligible
                  </span>
                )}
              </div>

              {/* Cooldown Details when Active */}
              {data.shiftAnalytics?.isCooldownActive && (
                <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl text-xs space-y-1.5 text-red-950">
                  <div className="flex justify-between items-center font-bold">
                    <span>Remaining Timeout:</span>
                    <span className="font-mono text-red-700 bg-red-100 px-2 py-0.5 rounded-lg">
                      {data.shiftAnalytics.cooldownRemainingMinutes} min
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-red-800">
                    <span>Blocked Until:</span>
                    <span className="font-medium">
                      {new Date(data.shiftAnalytics.dispatchBlockedUntil).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {data.shiftAnalytics.latestCancellationReason && (
                    <div className="pt-1.5 border-t border-red-200/80 text-[11px] text-red-900">
                      <span className="font-bold">Reason: </span>
                      <span>{data.shiftAnalytics.latestCancellationReason}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Shift Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-[var(--admin-subtle)] rounded-2xl border border-[var(--admin-rule)]">
                  <span className="block text-[10px] font-bold text-[var(--admin-muted)] uppercase tracking-wider">
                    Current Shift Date
                  </span>
                  <span className="text-sm font-black text-[var(--text-primary)]">
                    {data.shiftAnalytics?.shiftDate || new Date().toISOString().split("T")[0]}
                  </span>
                </div>

                <div className="p-3 bg-[var(--admin-subtle)] rounded-2xl border border-[var(--admin-rule)]">
                  <span className="block text-[10px] font-bold text-[var(--admin-muted)] uppercase tracking-wider">
                    Today's Cancellations
                  </span>
                  <span className={`text-sm font-black ${
                    (data.shiftAnalytics?.dailyCancellations || 0) >= 3 ? "text-red-600" : "text-[var(--text-primary)]"
                  }`}>
                    {data.shiftAnalytics?.dailyCancellations ?? 0}
                  </span>
                </div>

                <div className="p-3 bg-[var(--admin-subtle)] rounded-2xl border border-[var(--admin-rule)]">
                  <span className="block text-[10px] font-bold text-[var(--admin-muted)] uppercase tracking-wider">
                    Total All-Time Driver Cancelled
                  </span>
                  <span className="text-sm font-black text-[var(--text-primary)]">
                    {data.shiftAnalytics?.totalDriverCancellations ?? 0}
                  </span>
                </div>

                <div className="p-3 bg-[var(--admin-subtle)] rounded-2xl border border-[var(--admin-rule)]">
                  <span className="block text-[10px] font-bold text-[var(--admin-muted)] uppercase tracking-wider">
                    Driver Shift State
                  </span>
                  <span className={`text-sm font-black ${
                    data.isOnline ? "text-emerald-600" : "text-[var(--admin-muted)]"
                  }`}>
                    {data.isOnline ? "Online (On Shift)" : "Offline"}
                  </span>
                </div>
              </div>

              {data.shiftAnalytics?.lastCancellationDate && (
                <p className="text-[10px] text-[var(--admin-muted)] font-medium italic pt-1">
                  Last cancellation logged: {new Date(data.shiftAnalytics.lastCancellationDate).toLocaleString()}
                </p>
              )}
            </div>
          </AnimatedCard>

          <AnimatedCard title="Bank Details" icon={<Landmark size={18} />}>
            <InfoRow label="Account Holder" value={data.bank?.accountHolderName} />
            <InfoRow label="IFSC Code" value={data.bank?.ifsc} />
            <InfoRow label="UPI ID" value={data.bank?.upi || "—"} />
          </AnimatedCard>

          {data.vendorStatus === "rejected" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className={ui.reviewCard}
            >
              <div className="flex items-center gap-2 font-semibold text-red-600">
                <XCircle size={18} />
                Documents Rejected
              </div>
              <p className="text-sm text-[var(--text-primary)] bg-red-50 p-4 rounded-2xl border border-red-100">
                <span className="font-semibold block text-red-900 mb-1">Reason:</span>
                {data.vendorRejectionReason || "Documents were rejected by admin."}
              </p>
            </motion.div>
          )}

          {data.vendorStatus === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className={ui.reviewCard}
            >
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck size={18} />
                Admin Decision
              </div>

              <p className="text-sm text-[var(--admin-muted)]">
                Verify documents carefully before approving.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowApprove(true)}
                  className={ui.primary}
                >
                  Approve Vendor
                </button>

                <button
                  onClick={() => setShowReject(true)}
                  className={ui.button}
                >
                  Reject Vendor
                </button>
              </div>
            </motion.div>
          )}

          {data.vendorStatus === "approved" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className={ui.reviewCard}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Video size={18} />
                Video KYC Verification
              </div>

              {data.videoKycStatus === "approved" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-2xl text-sm font-semibold">
                    <CheckCircle size={18} />
                    Video KYC Approved
                  </div>
                  <p className="text-xs text-[var(--admin-muted)]">
                    Vendor identity confirmed. Vendor is eligible to upload vehicle photo and submit fares.
                  </p>
                </div>
              ) : data.videoKycStatus === "in_progress" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 px-4 py-3 rounded-2xl text-sm font-semibold">
                    <Clock size={18} />
                    Call Currently In Progress
                  </div>
                  <button
                    onClick={() => router.push(`/video-kyc/${data.videoKycRoomId}`)}
                    className={`w-full ${ui.primary}`}
                  >
                    <Video size={16} /> Join Ongoing Call
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--admin-muted)]">
                    Documents are verified. Initiate live video verification call with this vendor.
                  </p>
                  {data.videoKycStatus === "rejected" && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                      <span className="font-bold">Last KYC Rejected:</span> {data.videoKycRejectionReason || "No reason given"}
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        const res = await axios.patch(`/api/admin/vendors/video-kyc/start/${id}`);
                        if (res.data?.roomId) {
                          router.push(`/video-kyc/${res.data.roomId}`);
                        }
                      } catch (err: any) {
                        alert(err?.response?.data?.message || "Failed to start Video KYC");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className={`w-full ${ui.primary}`}
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Video size={16} />}
                    Start Video KYC
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* APPROVE MODAL */}
      <ConfirmModal
        open={showApprove}
        title="Approve Vendor?"
        description="Confirm all information has been verified."
        confirmText="Yes, Approve"
        loading={actionLoading}
        onClose={() => setShowApprove(false)}
        onConfirm={approveVendor}
      />

      {/* REJECT MODAL */}
      <RejectModal
        open={showReject}
        reason={rejectReason}
        setReason={setRejectReason}
        loading={actionLoading}
        onClose={() => setShowReject(false)}
        onConfirm={rejectVendor}
      />
    </div>
  );
}

/* ================= REUSABLE UI ================= */

function AnimatedCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={ui.reviewCard}>
      <h2 className={ui.reviewCardTitle}>{icon}{title}</h2>
      {children}
    </section>
  );
}

function DocPreview({ label, url }: any) {
  const isImage = url?.match(/\.(jpg|jpeg|png|webp)$/i);
  const isPdf = url?.endsWith(".pdf");

  return (
    <div className={ui.documentPreview}>
      <div className="px-3.5 py-2 border-b text-xs sm:text-sm font-semibold truncate">
        {label}
      </div>

      <div className="h-44 sm:h-52 flex items-center justify-center bg-[var(--admin-subtle)] overflow-hidden">
        {!url && <span className="text-xs text-[var(--admin-muted)]">Not uploaded</span>}

        {isImage && (
          <img src={url} alt={label} className="w-full h-full object-contain" />
        )}

        {isPdf && <iframe src={url} title={label} className="w-full h-full" />}
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs py-2 font-medium hover:bg-[var(--admin-subtle)] text-[var(--admin-accent)] transition"
        >
          Open full document
        </a>
      )}
    </div>
  );
}

function ConfirmModal({ open, title, description, confirmText, loading, onClose, onConfirm }: {
  open: boolean; title: string; description?: React.ReactNode; confirmText: string; loading: boolean;
  onClose: () => void; onConfirm: () => void;
}) {
  return (
    <AdminDecisionDialog open={open} title={title} confirmLabel={confirmText} loading={loading} onClose={onClose} onConfirm={onConfirm}>
      <div className={ui.secondary}>{description}</div>
    </AdminDecisionDialog>
  );
}

function RejectModal({ open, reason, setReason, loading, onClose, onConfirm }: {
  open: boolean; reason: string; setReason: (reason: string) => void; loading: boolean;
  onClose: () => void; onConfirm: () => void;
}) {
  return (
    <AdminDecisionDialog open={open} title="Reject vendor" confirmLabel="Reject" loading={loading} destructive
      confirmDisabled={!reason.trim()} onClose={onClose} onConfirm={onConfirm}>
      <label className={ui.secondary}>
        Rejection reason
        <textarea value={reason} onChange={(e) => setReason(e.currentTarget.value)} className={ui.field} rows={3} />
      </label>
    </AdminDecisionDialog>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className={ui.reviewRow}><span className={ui.secondary}>{label}</span><span>{value ?? "—"}</span></div>;
}

function StatusBadge({ status }: { status?: string }) {
  const tone = status === "approved" || status === "rejected" ? status : "pending";
  const Icon = tone === "approved" ? CheckCircle : tone === "rejected" ? XCircle : Clock;
  return <span className={ui.statusDetail} data-tone={tone}><Icon size={14} aria-hidden="true" /><span className="capitalize">{tone}</span></span>;
}
