"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  IndianRupee,
  CheckCircle,
  XCircle,
  Truck,
  Image as ImageIcon,
  ShieldCheck,
  Loader2,
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

  /* ================= LOAD ================= */

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
      <div className="min-h-screen grid place-items-center text-gray-400">
        Loading vehicle review...
      </div>
    );

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="sticky top-0 bg-white border-b shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1">
            <p className="font-semibold text-lg">{data.owner.name}</p>
            <p className="text-xs text-gray-500">{data.owner.email}</p>
          </div>

          <StatusBadge status={data.status} />
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12">

        {/* IMAGE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden shadow-xl bg-white"
        >
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              className="w-full h-[450px] object-cover"
            />
          ) : (
            <div className="h-[450px] grid place-items-center text-gray-300">
              <ImageIcon size={50} />
            </div>
          )}
        </motion.div>

        {/* DETAILS */}
        <div className="space-y-8">

          <Card title="Vehicle Details" icon={<Truck size={18} />}>
            <Info label="Vehicle Type" value={data.type} />
            <Info label="Registration Number" value={data.number} />
            <Info label="Model" value={data.model} />
          </Card>

          <Card title="Pricing Configuration" icon={<IndianRupee size={18} />}>
            <Info label="Base Fare" value={`₹${data.baseFare}`} />
            <Info label="Price per KM" value={`₹${data.pricePerKm}`} />
            <Info label="Waiting Charge" value={`₹${data.waitingCharge}`} />
          </Card>

          {data.status === "pending" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-3xl p-8 shadow-lg border space-y-6"
            >
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck size={18} />
                Admin Decision
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowApprove(true)}
                  className="flex-1 py-3 rounded-xl bg-black text-white font-semibold"
                >
                  Approve
                </button>

                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 py-3 rounded-xl border font-semibold"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

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
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

function Card({ title, icon, children }: any) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="bg-white rounded-3xl p-8 shadow-lg border space-y-6"
    >
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </motion.div>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: any) {
  if (status === "approved")
    return (
      <span className="px-4 py-2 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-2">
        <CheckCircle size={14} />
        Approved
      </span>
    );

  if (status === "rejected")
    return (
      <span className="px-4 py-2 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-2">
        <XCircle size={14} />
        Rejected
      </span>
    );

  return (
    <span className="px-4 py-2 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
      Pending
    </span>
  );
}

/* ================= MODALS ================= */

function ConfirmModal({ open, title, loading, onClose, onConfirm }: any) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            <h2 className="text-lg font-bold">{title}</h2>

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl border">
                Cancel
              </button>

              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-black text-white flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RejectModal({ open, reason, setReason, loading, onClose, onConfirm }: any) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            <h2 className="text-lg font-bold">Reject Vehicle</h2>

            <textarea
              placeholder="Enter rejection reason (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-4 border rounded-xl p-3 text-sm"
            />

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl border">
                Cancel
              </button>

              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-black text-white flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                Reject
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}