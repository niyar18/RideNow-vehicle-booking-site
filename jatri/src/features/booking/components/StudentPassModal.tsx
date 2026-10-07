"use client";

import { useState } from "react";
import { GraduationCap, CheckCircle2, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StudentPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStudent: boolean;
  studentDetails: any;
  onVerified: (details: any) => void;
}

export default function StudentPassModal({
  isOpen,
  onClose,
  isStudent,
  studentDetails,
  onVerified,
}: StudentPassModalProps) {
  const [eduEmail, setEduEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!eduEmail.includes("@") || !eduEmail.toLowerCase().includes(".edu") && !eduEmail.toLowerCase().includes(".ac.")) {
      setError("Please enter a valid college or university email (.edu / .ac.in)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eduEmail, institution }),
      });
      const data = await res.json();
      if (data.success) {
        onVerified(data.studentDetails);
        onClose();
      } else {
        setError(data.message || "Student verification failed");
      }
    } catch {
      setError("Network error during verification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900">Student Pass (10% Off)</h3>
                <p className="text-[10px] text-zinc-500 font-semibold">Special student concession on all rides</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>

          {isStudent ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
              <p className="text-xs font-black text-emerald-900">Student Pass Active ✓</p>
              <p className="text-[11px] text-emerald-700 leading-snug">
                10% discount (up to ₹50 per ride) is automatically applied on eligible rides.
              </p>
              {studentDetails?.institution && (
                <p className="text-[10px] text-emerald-800 font-bold">🏛️ {studentDetails.institution}</p>
              )}
              {studentDetails?.expiresAt && (
                <p className="text-[10px] text-emerald-600 font-medium">
                  Valid until: {new Date(studentDetails.expiresAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
              <div className="pt-1 text-[9px] text-emerald-600 border-t border-emerald-100">
                Minimum fare ₹100 • Cannot combine with promo codes
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  placeholder="yourname@college.edu or .ac.in"
                  value={eduEmail}
                  onChange={(e) => setEduEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Guwahati University, IIT"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  Verify Student Pass
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
