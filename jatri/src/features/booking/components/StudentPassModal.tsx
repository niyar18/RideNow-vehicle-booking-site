"use client";

import { useState } from "react";
import { GraduationCap, CheckCircle2, Loader2, X, Clock, ArrowLeft, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { validateStudentEmail } from "@/lib/studentVerification";

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
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  if (!isOpen) return null;

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedInst = institution.trim();
    if (!trimmedInst) {
      setError("Please enter your college or university name.");
      return;
    }

    const validation = validateStudentEmail(eduEmail);
    if (!validation.isValid) {
      setError(
        validation.reason ||
          "Please enter a valid accredited college or university email (.edu, .ac.in, .edu.in, .res.in)"
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "institutional_email",
          action: "send_otp",
          eduEmail: eduEmail.trim(),
          institutionName: trimmedInst,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp");
        setResendCooldown(60);
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.message || "Failed to send verification code. Please check your email.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the 6-digit confirmation code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "institutional_email",
          action: "verify_otp",
          otp: cleanOtp,
          eduEmail: eduEmail.trim(),
          institutionName: institution.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.isStudent) {
        onVerified(data.verification || data.studentDetails);
        onClose();
      } else {
        setError(data.message || "Invalid verification code.");
      }
    } catch {
      setError("Network error during verification.");
    } finally {
      setLoading(false);
    }
  };

  const isPending = studentDetails?.status === "pending" && !isStudent;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[var(--text-primary)] flex items-center justify-center">
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
              className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* ACTIVE STATE */}
          {isStudent ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 size={32} className="text-[var(--text-primary)] mx-auto" />
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
              <div className="pt-2 text-[10px] text-emerald-800 font-semibold border-t border-emerald-200/60 flex items-center justify-between">
                <span>Monthly cap: ₹200 (max 10 rides)</span>
                <span className="text-[9px] text-emerald-700">Resets 1st, 00:00 IST</span>
              </div>
              <div className="pt-1 text-[9px] text-emerald-600">
                Minimum fare ₹100 · Cannot combine with promo codes
              </div>
            </div>
          ) : isPending ? (
            /* PENDING ADMINISTRATIVE REVIEW */
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
              <Clock size={32} className="text-amber-600 mx-auto animate-pulse" />
              <p className="text-xs font-black text-amber-900">Verification Under Review ⏳</p>
              <p className="text-[11px] text-amber-700 leading-snug">
                Your student application has been submitted and is currently being verified by an administrator.
              </p>
              <p className="text-[10px] text-amber-600 font-medium">
                Review typically takes 24–48 hours. You will receive an alert once approved.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Okay, Got It
              </button>
            </div>
          ) : step === "email" ? (
            /* STEP 1: Enter email and institution */
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  College / University Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Guwahati University, IIT"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl outline-none focus:border-[var(--border-interactive)]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Institutional Email (.edu / .ac.in) *
                </label>
                <input
                  type="email"
                  placeholder="yourname@college.edu or .ac.in"
                  value={eduEmail}
                  onChange={(e) => setEduEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl outline-none focus:border-[var(--border-interactive)]"
                  required
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  We will send a 6-digit confirmation code to verify your enrollment.
                </p>
              </div>

              {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-50 min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px] cursor-pointer"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  Send Code
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Enter 6-digit OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div className="text-center pb-1">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-[var(--text-primary)] flex items-center justify-center mx-auto mb-2">
                  <KeyRound size={20} />
                </div>
                <p className="text-xs font-bold text-zinc-900">Enter Verification Code</p>
                <p className="text-[11px] text-zinc-500">
                  Sent to <span className="font-semibold text-zinc-800">{eduEmail}</span>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="· · · · · ·"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setError(null);
                  }}
                  className="w-full px-3 py-2.5 text-center text-xl tracking-[0.4em] font-mono font-bold border border-zinc-300 rounded-xl outline-none focus:border-[var(--border-interactive)]"
                  autoFocus
                  required
                />
              </div>

              {error && <p className="text-red-500 text-xs font-semibold text-center">{error}</p>}

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="flex items-center gap-1 text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
                >
                  <ArrowLeft size={12} /> Change Email
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleSendOtp}
                  className="text-[var(--text-primary)] hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-50 min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="flex-1 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] text-[var(--on-primary)] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px] cursor-pointer"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  Verify Code
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
