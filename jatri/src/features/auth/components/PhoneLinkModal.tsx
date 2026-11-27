"use client";

import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, useRef, useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import AuthDialog from "./AuthDialog";
import styles from "./auth-dialog.module.css";

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.42 0-2.81-.37-4.04-1.08l-.29-.17-3.01.79.8-2.93-.19-.3a8.188 8.188 0 0 1-1.25-4.35c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z" />
    </svg>
  );
}

export default function PhoneLinkModal() {
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const phoneInputId = useId();
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Listen for programmatic open requests (e.g. user clicked Book on /book)
  useEffect(() => {
    const handleOpen = () => {
      setErrorMessage(null);
      setIsOpen(true);
    };
    window.addEventListener("open-phone-link-modal", handleOpen);
    return () => window.removeEventListener("open-phone-link-modal", handleOpen);
  }, []);

  // Automatic check for logged in users without a verified phone number (e.g. Google login)
  useEffect(() => {
    if (userData && (!userData.mobileNumber || !userData.isMobileVerified)) {
      const dismissed = sessionStorage.getItem("ridenow_phone_modal_dismissed");
      if (!dismissed) {
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    } else if (userData?.isMobileVerified) {
      setIsOpen(false);
    }
  }, [userData]);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleDismiss = () => {
    sessionStorage.setItem("ridenow_phone_modal_dismissed", "true");
    setIsOpen(false);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleaned = mobileNumber.replace(/\D/g, "");
    const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;

    if (tenDigits.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setSendingOtp(true);
      setErrorMessage(null);

      const res = await axios.post("/api/auth/phone/send-otp", {
        mobileNumber: tenDigits,
      });

      if (res.data.success) {
        if (res.data.devOtp) {
          setDevOtp(res.data.devOtp);
        }
        setStep("otp");
        setCountdown(30);
      } else {
        setErrorMessage(res.data.error || "Failed to send WhatsApp code");
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || "Error dispatching WhatsApp OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const code = otp.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code");
      return;
    }

    const cleaned = mobileNumber.replace(/\D/g, "");
    const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;

    try {
      setVerifyingOtp(true);
      setErrorMessage(null);

      const res = await axios.post("/api/auth/phone/link", {
        mobileNumber: tenDigits,
        otp: code,
      });

      if (res.data.success) {
        setSuccessMessage("Phone verified and linked successfully!");
        // Update user state in Redux
        if (userData) {
          dispatch(
            setUserData({
              ...userData,
              mobileNumber: tenDigits,
              isMobileVerified: true,
            })
          );
        }
        sessionStorage.removeItem("ridenow_phone_modal_dismissed");
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMessage(null);
        }, 1500);
      } else {
        setErrorMessage(res.data.error || "Verification failed");
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || "Invalid OTP code");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <AuthDialog open={isOpen} onClose={handleDismiss} title="Verify your WhatsApp number" subtitle="Used to coordinate pickups with your driver." phoneLink focusKey={step}>
      {errorMessage && (
        <div role="alert" className={`${styles.notice} ${styles.error}`}>
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div role="status" className={`${styles.notice} ${styles.success}`}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "phone" ? (
          <motion.form
            key="phone_step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSendOtp}
            className="space-y-3.5"
          >
            <div>
              <label className={styles.inputLabel} htmlFor={phoneInputId}>
                Mobile Number
              </label>
              <div className={styles.inputWrap}>
                <div className="flex items-center gap-1.5 pr-2 border-r border-[var(--border-default)] flex-shrink-0">
                  <span className="text-sm">🇮🇳</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">+91</span>
                </div>
                <input
                  type="tel"
                  id={phoneInputId}
                  autoComplete="tel-national"
                  inputMode="numeric"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) =>
                    setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className="bg-transparent"
                />
              </div>
            </div>

            <div className={`${styles.notice} ${styles.success}`}>
              <ShieldCheck size={14} className="shrink-0" />
              <span>Your pickup PIN and driver ETA will be delivered directly to your WhatsApp.</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className={`flex-1 ${styles.secondary}`}
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={sendingOtp || mobileNumber.replace(/\D/g, "").length !== 10}
                className={`flex-1 ${styles.primary}`}
              >
                {sendingOtp ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <WhatsAppIcon className="w-3.5 h-3.5" /> Send Code
                  </>
                )}
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.form
            key="otp_step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleVerifyOtp}
            className="space-y-4"
          >
            <div>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className={styles.linkAction}
              >
                <ArrowLeft size={12} /> Change +91 {mobileNumber}
              </button>
              <p className={styles.muted}>
                Enter the 6-digit verification code sent to your WhatsApp:
              </p>
            </div>

            {devOtp && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-bold flex flex-wrap gap-2 items-center justify-between">
                <span>Dev OTP: <span className="font-mono text-sm underline">{devOtp}</span></span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp.split(""))}
                  className="min-h-9 px-2 bg-amber-200 hover:bg-amber-300 rounded text-xs font-bold"
                >
                  Fill
                </button>
              </div>
            )}

            <div className={styles.otpGrid}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpInputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (!val) {
                      const copy = [...otp];
                      copy[i] = "";
                      setOtp(copy);
                      return;
                    }
                    if (val.length > 1) {
                      const digits = val.slice(0, 6).split("");
                      const copy = [...otp];
                      digits.forEach((d, idx) => {
                        if (i + idx < 6) copy[i + idx] = d;
                      });
                      setOtp(copy);
                      const nextIdx = Math.min(i + digits.length, 5);
                      otpInputRefs.current[nextIdx]?.focus();
                      return;
                    }
                    const copy = [...otp];
                    copy[i] = val;
                    setOtp(copy);
                    if (val && i < 5) otpInputRefs.current[i + 1]?.focus();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    if (!pasted) return;
                    const digits = pasted.split("");
                    const copy = [...otp];
                    digits.forEach((d, idx) => {
                      if (i + idx < 6) copy[i + idx] = d;
                    });
                    setOtp(copy);
                    const nextIdx = Math.min(i + digits.length, 5);
                    otpInputRefs.current[nextIdx]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otp[i] && i > 0) {
                      otpInputRefs.current[i - 1]?.focus();
                    }
                  }}
                  aria-label={`Verification code digit ${i + 1} of 6`}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || otp.join("").length !== 6}
              className={`w-full ${styles.primary}`}
            >
              {verifyingOtp ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Verify & Link Number
                </>
              )}
            </button>

            <div className="text-center">
              {countdown > 0 ? (
                <p className={styles.muted}>
                  Resend in <strong className="text-[var(--text-primary)]">{countdown}s</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  className={styles.linkAction}
                >
                  <WhatsAppIcon className="w-3 h-3" /> Resend WhatsApp OTP
                </button>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthDialog>
  );
}
