"use client";

import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useId } from "react";
import { signIn } from "next-auth/react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";
import AuthDialog from "./AuthDialog";
import styles from "./auth-dialog.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type AuthStep =
  | "phone"          // Primary: Enter mobile number
  | "phone_otp"      // Enter 6-digit WhatsApp OTP
  | "email_login"    // Fallback: Login with password
  | "email_signup"   // Create account with email
  | "email_otp";     // Verify email signup OTP

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.42 0-2.81-.37-4.04-1.08l-.29-.17-3.01.79.8-2.93-.19-.3a8.188 8.188 0 0 1-1.25-4.35c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z" />
    </svg>
  );
}

export default function AuthModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<AuthStep>("phone");

  // Phone auth state
  const [mobileNumber, setMobileNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState(["", "", "", "", "", ""]);
  const [selectedChannel, setSelectedChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Email auth state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);

  // Status & error banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const inputPrefix = useId();
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Detect OAuth redirect error if returned from Google */
  useEffect(() => {
    if (typeof window === "undefined" || !open) return;
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (authError) {
      if (authError === "OAuthSignin" || authError === "OAuthCallback" || authError === "OAuthCreateAccount") {
        setErrorMessage("Google sign-in was interrupted or not authorized. Please try again or use Phone/OTP.");
      } else if (authError === "Configuration") {
        setErrorMessage("Google Sign-In is not configured yet (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Please use Phone/OTP or add keys in .env.local.");
      } else if (authError === "AccessDenied") {
        setErrorMessage("Access was denied. Please select a valid Google account.");
      }
    }
  }, [open]);

  /* Resend timer countdown */
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  /* Reset state on modal close or open */
  useEffect(() => {
    if (open) {
      setStep("phone");
      setErrorMessage(null);
      setDevOtpHint(null);
      setPhoneOtp(["", "", "", "", "", ""]);
    }
  }, [open]);

  /* Handle Phone OTP Input */
  const handlePhoneOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const updated = [...phoneOtp];
      updated[index] = "";
      setPhoneOtp(updated);
      return;
    }

    if (clean.length > 1) {
      const digits = clean.slice(0, 6).split("");
      const updated = [...phoneOtp];
      digits.forEach((d, idx) => {
        if (index + idx < 6) updated[index + idx] = d;
      });
      setPhoneOtp(updated);
      const nextIdx = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const updated = [...phoneOtp];
    updated[index] = clean;
    setPhoneOtp(updated);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePhoneOtpPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split("");
    const updated = [...phoneOtp];
    digits.forEach((d, idx) => {
      if (index + idx < 6) updated[index + idx] = d;
    });
    setPhoneOtp(updated);
    const nextIdx = Math.min(index + digits.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  const handlePhoneOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !phoneOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  /* 📲 1. SEND WHATSAPP OR SMS OTP */
  const handleSendPhoneOtp = async (e?: React.FormEvent, channelChoice: "whatsapp" | "sms" = "whatsapp") => {
    if (e) e.preventDefault();

    const cleaned = mobileNumber.replace(/\D/g, "");
    const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;

    if (tenDigits.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setSendingPhoneOtp(true);
      setErrorMessage(null);
      setSelectedChannel(channelChoice);

      const res = await axios.post("/api/auth/phone/send-otp", {
        mobileNumber: tenDigits,
        channel: channelChoice,
      });

      if (res.data.success) {
        if (res.data.devOtp) {
          setDevOtpHint(res.data.devOtp);
        }
        setStep("phone_otp");
        setResendCountdown(30);
      } else {
        setErrorMessage(res.data.error || `Failed to send ${channelChoice === "sms" ? "SMS" : "WhatsApp"} OTP`);
      }
    } catch (err: any) {
      console.error("Failed to send OTP:", err);
      setErrorMessage(err.response?.data?.error || "Could not send verification code");
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  /* 🔐 2. VERIFY PHONE OTP & LOGIN */
  const handleVerifyPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const code = phoneOtp.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code");
      return;
    }

    const cleaned = mobileNumber.replace(/\D/g, "");
    const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;

    try {
      setVerifyingPhoneOtp(true);
      setErrorMessage(null);

      const res = await signIn("credentials", {
        phone: tenDigits,
        otp: code,
        isPhoneLogin: "true",
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage(
          res.error === "CredentialsSignin"
            ? "Invalid or expired verification code. Please check and try again."
            : res.error
        );
        return;
      }

      // Sync user profile into Redux
      const meRes = await axios.get("/api/me");
      dispatch(setUserData(meRes.data));

      onClose();

      if (meRes.data.role === "vendor") {
        router.push("/partners/dashboard");
      } else if (meRes.data.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Phone OTP verification error:", err);
      setErrorMessage(err?.message || "Verification failed");
    } finally {
      setVerifyingPhoneOtp(false);
    }
  };

  /* 🔥 3. GOOGLE LOGIN */
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage(null);
      await signIn("google", {
        callbackUrl: typeof window !== "undefined" ? window.location.href : "/",
      });
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setErrorMessage("Google sign-in could not be completed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ✉️ 4. EMAIL LOGIN */
  const handleEmailLogin = async () => {
    try {
      setErrorMessage(null);
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage("Invalid email or password");
        return;
      }

      const meRes = await axios.get("/api/me");
      dispatch(setUserData(meRes.data));
      onClose();

      if (meRes.data.role === "vendor") {
        router.push("/partners/dashboard");
      } else if (meRes.data.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        window.location.reload();
      }
    } catch (err) {
      setErrorMessage("Login failed. Please check credentials.");
    }
  };

  /* 📝 5. EMAIL SIGNUP */
  const handleEmailSignUp = async () => {
    try {
      setErrorMessage(null);
      const res = await axios.post("/api/auth/register", {
        name,
        email,
        password,
      });
      if (res.data?.devOtp) {
        setDevOtpHint(res.data.devOtp);
      }
      setResendCountdown(30);
      setStep("email_otp");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Sign up failed");
    }
  };

  /* 🔢 6. VERIFY EMAIL OTP */
  const handleVerifyEmailOtp = async () => {
    try {
      setErrorMessage(null);
      const code = emailOtp.join("");
      if (code.length !== 6) {
        setErrorMessage("Please enter the complete 6-digit code");
        return;
      }

      await axios.post("/api/auth/verify-otp", {
        email,
        otp: code,
      });

      // Automatically sign in if password is present
      if (password) {
        const loginRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (!loginRes?.error) {
          const meRes = await axios.get("/api/me");
          dispatch(setUserData(meRes.data));
          onClose();
          if (meRes.data.role === "vendor") {
            router.push("/partners/dashboard");
          } else if (meRes.data.role === "admin") {
            router.push("/admin/dashboard");
          } else {
            window.location.reload();
          }
          return;
        }
      }

      setStep("email_login");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Invalid OTP code");
    }
  };

  return (
    <AuthDialog open={open} onClose={onClose} title={t("nav.signIn", "Sign in")} focusKey={step}>
      {/* ERROR NOTIFICATION */}
      {errorMessage && (
        <div role="alert" className={`${styles.notice} ${styles.error}`}>
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ══ 1. PRIMARY: PHONE NUMBER LOGIN ══ */}
        {step === "phone" && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{t("auth.orPhone", "Enter your Mobile Number")}</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                {t("auth.sendOtpDesc", "Choose WhatsApp or SMS to get your 6-digit verification code.")}
              </p>
            </div>

            <form onSubmit={handleSendPhoneOtp} className="space-y-3.5">
              <label className={styles.inputLabel} htmlFor={`${inputPrefix}-mobile`}>Mobile number</label>
              <div className={styles.inputWrap}>
                <div className="flex items-center gap-1.5 pr-2.5 border-r border-[var(--border-default)] flex-shrink-0">
                  <span className="text-base leading-none">🇮🇳</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">+91</span>
                </div>
                <input
                  type="tel"
                  id={`${inputPrefix}-mobile`}
                  autoComplete="tel-national"
                  inputMode="numeric"
                  required
                  maxLength={10}
                  placeholder={t("auth.phonePlaceholder", "10-digit mobile number")}
                  value={mobileNumber}
                  onChange={(e) =>
                    setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className="bg-transparent"
                />
              </div>

              {/* OTP Channel Buttons: WhatsApp & SMS */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSendPhoneOtp(e, "whatsapp")}
                  disabled={sendingPhoneOtp || mobileNumber.replace(/\D/g, "").length !== 10}
                  className={styles.primary}
                >
                  {sendingPhoneOtp && selectedChannel === "whatsapp" ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSendPhoneOtp(e, "sms")}
                  disabled={sendingPhoneOtp || mobileNumber.replace(/\D/g, "").length !== 10}
                  className={styles.secondary}
                >
                  {sendingPhoneOtp && selectedChannel === "sms" ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <Phone size={15} />
                      <span>SMS OTP</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* DIVIDER */}
            <div className="flex items-center gap-4 my-3">
              <span className="flex-1 h-px bg-[var(--border-default)]" />
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Or continue with
              </span>
              <span className="flex-1 h-px bg-[var(--border-default)]" />
            </div>

            {/* GOOGLE SIGN IN */}
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleLogin}
              className={`w-full ${styles.secondary}`}
            >
              {googleLoading ? (
                <Loader2 className="animate-spin text-[var(--text-secondary)]" size={18} />
              ) : (
                <Image src="/google.webp" alt="" width={18} height={18} />
              )}
              <span>
                {googleLoading ? "Connecting to Google…" : t("auth.continueWithGoogle", "Continue with Google")}
              </span>
            </button>

            {/* SWITCH TO EMAIL */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep("email_login");
                }}
                className={styles.linkAction}
              >
                Login with Email & Password
              </button>
            </div>
          </motion.div>
        )}

        {/* ══ 2. PHONE OTP ENTRY ══ */}
        {step === "phone_otp" && (
          <motion.div
            key="phone_otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <button
                onClick={() => setStep("phone")}
                className={styles.linkAction}
              >
                <ArrowLeft size={14} /> Change Number
              </button>
              <span className={styles.muted}>
                {selectedChannel === "whatsapp" ? "WhatsApp OTP Sent" : "SMS OTP Sent"}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{t("auth.enterOtp", "Verify your Number")}</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                Enter the 6-digit code sent via {selectedChannel === "whatsapp" ? "WhatsApp" : "SMS"} to{" "}
                <strong className="text-[var(--text-primary)]">+91 {mobileNumber}</strong>
              </p>
            </div>

            {/* Dev OTP Helper */}
            {devOtpHint && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-[8px] text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
                <span>Dev OTP: <span className="font-mono text-sm underline">{devOtpHint}</span></span>
                <button
                  onClick={() => {
                    const digits = devOtpHint.split("");
                    setPhoneOtp(digits);
                  }}
                  className="min-h-9 px-2 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-md text-xs font-bold"
                >
                  Auto-Fill
                </button>
              </div>
            )}

            {/* 6 OTP Boxes */}
            <div className={styles.otpGrid}>
              {phoneOtp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpInputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePhoneOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handlePhoneOtpKeyDown(i, e)}
                  onPaste={(e) => handlePhoneOtpPaste(i, e)}
                  aria-label={`Verification code digit ${i + 1} of 6`}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyPhoneOtp}
              disabled={verifyingPhoneOtp || phoneOtp.join("").length !== 6}
              className={`w-full ${styles.primary}`}
            >
              {verifyingPhoneOtp ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{t("auth.verifyAndLogin", "Verify & Log In")}</span>
                </>
              )}
            </button>

            {/* Resend via WhatsApp or SMS */}
            <div className="text-center pt-2 space-y-1.5">
              {resendCountdown > 0 ? (
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  Resend code in <strong className="text-[var(--text-primary)]">{resendCountdown}s</strong>
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-x-3 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleSendPhoneOtp(undefined, "whatsapp")}
                    className={styles.linkAction}
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    <span>Resend on WhatsApp</span>
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleSendPhoneOtp(undefined, "sms")}
                    className={styles.linkAction}
                  >
                    <Phone size={13} />
                    <span>Resend via SMS</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══ 3. EMAIL & PASSWORD LOGIN ══ */}
        {step === "email_login" && (
          <motion.div
            key="email_login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <button
                onClick={() => setStep("phone")}
                className={styles.linkAction}
              >
                <ArrowLeft size={14} /> Back to Phone Login
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Email Login</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Log in with your email and password.
              </p>
            </div>

            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void handleEmailLogin(); }}>
              <div>
                <label className={styles.inputLabel} htmlFor={`${inputPrefix}-email_login-email`}>Email address</label>
                <div className={styles.inputWrap}>
                  <Mail size={16} className="text-[var(--text-secondary)]" />
                  <input
                    id={`${inputPrefix}-email_login-email`} autoComplete="email" required
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className={styles.inputLabel} htmlFor={`${inputPrefix}-email_login-password`}>Password</label>
                <div className={styles.inputWrap}>
                  <Lock size={16} className="text-[var(--text-secondary)]" />
                  <input
                    id={`${inputPrefix}-email_login-password`} autoComplete="current-password" required
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full ${styles.primary}`}
              >
                Log In
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-[var(--text-secondary)] font-medium">
              Don’t have an account?{" "}
              <button
                onClick={() => setStep("email_signup")}
                className={styles.linkAction}
              >
                Sign up with Email
              </button>
            </p>
          </motion.div>
        )}

        {/* ══ 4. EMAIL SIGNUP ══ */}
        {step === "email_signup" && (
          <motion.div
            key="email_signup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <button
              onClick={() => setStep("email_login")}
              className={styles.linkAction}
            >
              <ArrowLeft size={14} /> Back to Login
            </button>

            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Create Account</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Register with your email to get started.
              </p>
            </div>

            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void handleEmailSignUp(); }}>
              <div>
                <label className={styles.inputLabel} htmlFor={`${inputPrefix}-email_signup-name`}>Full name</label>
                <div className={styles.inputWrap}>
                  <User size={16} className="text-[var(--text-secondary)]" />
                  <input
                    id={`${inputPrefix}-email_signup-name`} autoComplete="name" required
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className={styles.inputLabel} htmlFor={`${inputPrefix}-email_signup-email`}>Email address</label>
                <div className={styles.inputWrap}>
                  <Mail size={16} className="text-[var(--text-secondary)]" />
                  <input
                    id={`${inputPrefix}-email_signup-email`} autoComplete="email" required type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className={styles.inputLabel} htmlFor={`${inputPrefix}-email_signup-password`}>Password</label>
                <div className={styles.inputWrap}>
                  <Lock size={16} className="text-[var(--text-secondary)]" />
                  <input
                    id={`${inputPrefix}-email_signup-password`} autoComplete="new-password" required
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full ${styles.primary}`}
              >
                Send Verification Code
              </button>
            </form>
          </motion.div>
        )}

        {/* ══ 5. EMAIL OTP ══ */}
        {step === "email_otp" && (
          <motion.div
            key="email_otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep("email_signup");
                }}
                className={styles.linkAction}
              >
                <ArrowLeft size={14} /> Back to Sign Up
              </button>
              <span className={styles.muted}>
                Email OTP
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Verify Email</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                Enter the 6-digit verification code sent to <strong className="text-[var(--text-primary)]">{email}</strong>
              </p>
            </div>

            {/* Dev OTP Helper */}
            {devOtpHint && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-[8px] text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
                <span>Dev OTP: <span className="font-mono text-sm underline">{devOtpHint}</span></span>
                <button
                  type="button"
                  onClick={() => {
                    const digits = devOtpHint.split("");
                    setEmailOtp(digits);
                  }}
                  className="min-h-9 px-2 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-md text-xs font-bold"
                >
                  Auto-Fill
                </button>
              </div>
            )}

            <div className={styles.otpGrid}>
              {emailOtp.map((digit, i) => (
                <input
                  key={i}
                  id={`${inputPrefix}-email-otp-${i}`}
                  maxLength={1}
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => {
                    if (!/^[0-9]?$/.test(e.target.value)) return;
                    const updated = [...emailOtp];
                    updated[i] = e.target.value;
                    setEmailOtp(updated);
                    if (e.target.value && i < 5) {
                      document.getElementById(`${inputPrefix}-email-otp-${i + 1}`)?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !emailOtp[i] && i > 0) {
                      document.getElementById(`${inputPrefix}-email-otp-${i - 1}`)?.focus();
                    }
                  }}
                  aria-label={`Verification code digit ${i + 1} of 6`}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerifyEmailOtp}
              disabled={emailOtp.join("").length !== 6}
              className={`w-full ${styles.primary}`}
            >
              Verify & Complete Signup
            </button>

            <div className="text-center pt-2">
              {resendCountdown > 0 ? (
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  Resend code in <strong className="text-[var(--text-primary)]">{resendCountdown}s</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleEmailSignUp}
                  className={styles.linkAction}
                >
                  <Mail size={13} />
                  <span>Resend Email OTP</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATUTORY / DPDP ACT 2023 NOTICE */}
      <p className={styles.legal}>
        By proceeding, you agree to Jaatri&apos;s{" "}
        <Link
          href="/terms"
          onClick={onClose}
        >
          Terms of Service
        </Link>
        ,{" "}
        <Link
          href="/privacy"
          onClick={onClose}
        >
          Privacy Policy
        </Link>
        , and{" "}
        <Link
          href="/cancellation-refund"
          onClick={onClose}
        >
          Refund Terms
        </Link>
        .
      </p>
    </AuthDialog>
  );
}
