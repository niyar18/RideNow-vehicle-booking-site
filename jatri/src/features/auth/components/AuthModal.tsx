"use client";

import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
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
import { useEffect, useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";

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
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
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

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Lock body scroll when modal is open */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
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
    if (!/^[0-9]?$/.test(val)) return;

    const updated = [...phoneOtp];
    updated[index] = val;
    setPhoneOtp(updated);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
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
    await signIn("google");
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
    <AnimatePresence>
      {open && (
        <>
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/60"
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          >
            <div className="relative w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-xl p-6 sm:p-7 text-zinc-900">
              {/* CLOSE BUTTON */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              {/* BRAND HEADER */}
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-black tracking-tight text-zinc-900">RideNow</h1>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  {t("auth.signInSubtitle", "Enter your mobile number to get started")}
                </p>
              </div>

              {/* ERROR NOTIFICATION */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
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
                      <h2 className="text-lg font-black text-zinc-900">{t("auth.orPhone", "Enter your Mobile Number")}</h2>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">
                        {t("auth.sendOtpDesc", "We will send a 6-digit verification code to your WhatsApp.")}
                      </p>
                    </div>

                    <form onSubmit={handleSendPhoneOtp} className="space-y-3.5">
                      {/* Phone Input with +91 Indian Flag badge */}
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-300 focus-within:border-zinc-900 transition">
                        <div className="flex items-center gap-1.5 pr-2.5 border-r border-zinc-200 flex-shrink-0">
                          <span className="text-base leading-none">🇮🇳</span>
                          <span className="text-xs font-bold text-zinc-800">+91</span>
                        </div>
                        <input
                          type="tel"
                          required
                          autoFocus
                          maxLength={10}
                          placeholder={t("auth.phonePlaceholder", "10-digit mobile number")}
                          value={mobileNumber}
                          onChange={(e) =>
                            setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                          }
                          className="w-full text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent"
                        />
                      </div>

                      {/* OTP Channel Buttons: WhatsApp & SMS */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleSendPhoneOtp(e, "whatsapp")}
                          disabled={sendingPhoneOtp || mobileNumber.replace(/\D/g, "").length !== 10}
                          className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-98"
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
                          className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-98"
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
                      <span className="flex-1 h-px bg-zinc-200" />
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Or continue with
                      </span>
                      <span className="flex-1 h-px bg-zinc-200" />
                    </div>

                    {/* GOOGLE SIGN IN */}
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full h-11 rounded-xl border border-zinc-300 hover:border-zinc-900 flex items-center justify-center gap-2.5 text-sm font-semibold text-zinc-800 transition active:scale-98"
                    >
                      <Image src="/google.png" alt="Google" width={18} height={18} />
                      <span>{t("auth.continueWithGoogle", "Continue with Google")}</span>
                    </button>

                    {/* SWITCH TO EMAIL */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setStep("email_login");
                        }}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition underline underline-offset-4"
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
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setStep("phone")}
                        className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900"
                      >
                        <ArrowLeft size={14} /> Change Number
                      </button>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedChannel === "whatsapp"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-zinc-800 bg-zinc-100 border-zinc-200"
                      }`}>
                        {selectedChannel === "whatsapp" ? "WhatsApp OTP Sent" : "SMS OTP Sent"}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-zinc-900">{t("auth.enterOtp", "Verify your Number")}</h2>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        Enter the 6-digit code sent via {selectedChannel === "whatsapp" ? "WhatsApp" : "SMS"} to{" "}
                        <strong className="text-zinc-900">+91 {mobileNumber}</strong>
                      </p>
                    </div>

                    {/* Dev OTP Helper */}
                    {devOtpHint && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold flex items-center justify-between">
                        <span>Dev OTP: <span className="font-mono text-sm underline">{devOtpHint}</span></span>
                        <button
                          onClick={() => {
                            const digits = devOtpHint.split("");
                            setPhoneOtp(digits);
                          }}
                          className="px-2 py-0.5 bg-amber-200 rounded-md text-[10px] font-black"
                        >
                          Auto-Fill
                        </button>
                      </div>
                    )}

                    {/* 6 OTP Boxes */}
                    <div className="flex justify-between gap-1.5 sm:gap-2 my-4">
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
                          className="w-11 h-13 text-center text-lg font-bold rounded-xl bg-zinc-50 border border-zinc-300 focus:border-zinc-900 focus:bg-white outline-none transition"
                        />
                      ))}
                    </div>

                    {/* Verify Button */}
                    <button
                      onClick={handleVerifyPhoneOtp}
                      disabled={verifyingPhoneOtp || phoneOtp.join("").length !== 6}
                      className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-black disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-98"
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
                        <p className="text-xs text-zinc-400 font-medium">
                          Resend code in <strong className="text-zinc-700">{resendCountdown}s</strong>
                        </p>
                      ) : (
                        <div className="flex items-center justify-center gap-3 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => handleSendPhoneOtp(undefined, "whatsapp")}
                            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span>Resend on WhatsApp</span>
                          </button>
                          <span className="text-zinc-300">•</span>
                          <button
                            type="button"
                            onClick={() => handleSendPhoneOtp(undefined, "sms")}
                            className="text-zinc-700 hover:text-zinc-900 flex items-center gap-1"
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
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setStep("phone")}
                        className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900"
                      >
                        <ArrowLeft size={14} /> Back to Phone Login
                      </button>
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-zinc-900">Email Login</h2>
                      <p className="text-xs text-zinc-400 font-medium">
                        Log in with your email and password.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border border-zinc-300 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-900 transition">
                        <Mail size={16} className="text-zinc-400" />
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm font-semibold text-zinc-900"
                        />
                      </div>

                      <div className="flex items-center gap-3 border border-zinc-300 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-900 transition">
                        <Lock size={16} className="text-zinc-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm font-semibold text-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-zinc-400 hover:text-zinc-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <button
                        onClick={handleEmailLogin}
                        className="w-full h-11 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-black transition active:scale-98"
                      >
                        Log In
                      </button>
                    </div>

                    <p className="mt-4 text-center text-xs text-zinc-500 font-medium">
                      Don’t have an account?{" "}
                      <button
                        onClick={() => setStep("email_signup")}
                        className="text-zinc-900 font-bold hover:underline"
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
                      className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900"
                    >
                      <ArrowLeft size={14} /> Back to Login
                    </button>

                    <div>
                      <h2 className="text-lg font-black text-zinc-900">Create Account</h2>
                      <p className="text-xs text-zinc-400 font-medium">
                        Register with your email to get started.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border border-zinc-300 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-900 transition">
                        <User size={16} className="text-zinc-400" />
                        <input
                          placeholder="Full Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm font-semibold text-zinc-900"
                        />
                      </div>

                      <div className="flex items-center gap-3 border border-zinc-300 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-900 transition">
                        <Mail size={16} className="text-zinc-400" />
                        <input
                          placeholder="Email Address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm font-semibold text-zinc-900"
                        />
                      </div>

                      <div className="flex items-center gap-3 border border-zinc-300 rounded-xl px-3.5 py-2.5 focus-within:border-zinc-900 transition">
                        <Lock size={16} className="text-zinc-400" />
                        <input
                          type="password"
                          placeholder="Password (min 6 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm font-semibold text-zinc-900"
                        />
                      </div>

                      <button
                        onClick={handleEmailSignUp}
                        className="w-full h-11 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-black transition active:scale-98"
                      >
                        Send Verification Code
                      </button>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setStep("email_signup");
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900"
                      >
                        <ArrowLeft size={14} /> Back to Sign Up
                      </button>
                      <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                        Email OTP
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-zinc-900">Verify Email</h2>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        Enter the 6-digit verification code sent to <strong>{email}</strong>
                      </p>
                    </div>

                    {/* Dev OTP Helper */}
                    {devOtpHint && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold flex items-center justify-between">
                        <span>Dev OTP: <span className="font-mono text-sm underline">{devOtpHint}</span></span>
                        <button
                          type="button"
                          onClick={() => {
                            const digits = devOtpHint.split("");
                            setEmailOtp(digits);
                          }}
                          className="px-2 py-0.5 bg-amber-200 rounded-md text-[10px] font-black"
                        >
                          Auto-Fill
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between gap-1.5 sm:gap-2 my-4">
                      {emailOtp.map((digit, i) => (
                        <input
                          key={i}
                          id={`email-otp-${i}`}
                          maxLength={1}
                          inputMode="numeric"
                          value={digit}
                          onChange={(e) => {
                            if (!/^[0-9]?$/.test(e.target.value)) return;
                            const updated = [...emailOtp];
                            updated[i] = e.target.value;
                            setEmailOtp(updated);
                            if (e.target.value && i < 5) {
                              document.getElementById(`email-otp-${i + 1}`)?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !emailOtp[i] && i > 0) {
                              document.getElementById(`email-otp-${i - 1}`)?.focus();
                            }
                          }}
                          className="w-11 h-13 text-center text-lg font-bold rounded-xl bg-zinc-50 border border-zinc-300 focus:border-zinc-900 focus:bg-white outline-none transition"
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyEmailOtp}
                      disabled={emailOtp.join("").length !== 6}
                      className="w-full h-11 rounded-xl bg-zinc-900 disabled:opacity-40 text-white font-bold text-sm hover:bg-black transition active:scale-98"
                    >
                      Verify & Complete Signup
                    </button>

                    <div className="text-center pt-2">
                      {resendCountdown > 0 ? (
                        <p className="text-xs text-zinc-400 font-medium">
                          Resend code in <strong className="text-zinc-700">{resendCountdown}s</strong>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleEmailSignUp}
                          className="text-xs font-bold text-zinc-700 hover:text-black flex items-center justify-center gap-1.5 mx-auto underline underline-offset-2"
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
              <p className="mt-5 text-[11px] leading-relaxed text-center text-zinc-400 font-medium">
                By proceeding, you agree to RideNow&apos;s{" "}
                <Link
                  href="/terms"
                  onClick={onClose}
                  className="text-zinc-700 underline font-semibold hover:text-black transition"
                >
                  Terms of Service
                </Link>
                ,{" "}
                <Link
                  href="/privacy"
                  onClick={onClose}
                  className="text-zinc-700 underline font-semibold hover:text-black transition"
                >
                  Privacy Policy
                </Link>
                , and{" "}
                <Link
                  href="/cancellation-refund"
                  onClick={onClose}
                  className="text-zinc-700 underline font-semibold hover:text-black transition"
                >
                  Refund Terms
                </Link>
                .
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
