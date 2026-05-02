"use client";

import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = "login" | "signup" | "otp";

export default function AuthModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* OTP input handler */
  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < otp.length - 1) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  // 🔐 LOGIN (NextAuth Credentials)
  const handleLogin = async () => {
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      console.log(res.error)
      alert("Invalid email or password");
      return;
    }

    onClose();
  };

  // 🔥 GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    await signIn("google");
  };

  // 📝 SIGNUP
  const handleSignUp = async () => {
    await axios.post("/api/auth/register", {
      name,
      email,
      password,
    });
    setStep("otp");
  };

  // 🔢 OTP VERIFY
  const handleVerifyOtp = async () => {
    await axios.post("/api/auth/verify-otp", {
      email,
      otp: otp.join(""),
    });
    setStep("login");
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
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md"
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          >
            <div className="relative w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-[0_40px_100px_rgba(0,0,0,0.35)] p-6 sm:p-8 text-black">

              {/* CLOSE */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-gray-500 hover:text-black transition"
              >
                <X size={20} />
              </button>

              {/* LOGO */}
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-extrabold tracking-widest">
                  RideNow
                </h1>
                <p className="mt-1 text-xs text-gray-500">
                  Premium Vehicle Booking
                </p>
              </div>

              {/* GOOGLE */}
              <button
                onClick={handleGoogleLogin}
                className="
                  w-full h-11 rounded-xl
                  border border-black/20
                  flex items-center justify-center gap-3
                  text-sm font-semibold
                  hover:bg-black hover:text-white
                  transition
                "
              >
                <Image src="/google.png" alt="Google" width={20} height={20} />
                Continue with Google
              </button>

              {/* DIVIDER */}
              <div className="flex items-center gap-4 my-6">
                <span className="flex-1 h-px bg-black/10" />
                <span className="text-xs text-gray-500">OR</span>
                <span className="flex-1 h-px bg-black/10" />
              </div>

              <AnimatePresence mode="wait">
                {/* LOGIN */}
                {step === "login" && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-xl font-semibold">Welcome back</h2>

                    <div className="mt-5 space-y-4">
                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <Mail size={18} className="text-gray-500" />
                        <input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <Lock size={18} className="text-gray-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-500"
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>

                      <button
                        onClick={handleLogin}
                        className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition"
                      >
                        Login
                      </button>
                    </div>

                    <p className="mt-6 text-center text-sm text-gray-500">
                      Don’t have an account?{" "}
                      <button
                        onClick={() => setStep("signup")}
                        className="text-black font-medium hover:underline"
                      >
                        Sign up
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* SIGNUP */}
                {step === "signup" && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-xl font-semibold">Create account</h2>

                    <div className="mt-5 space-y-4">
                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <User size={18} className="text-gray-500" />
                        <input
                          placeholder="Full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <Mail size={18} className="text-gray-500" />
                        <input
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <Lock size={18} className="text-gray-500" />
                        <input
                          type="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm"
                        />
                      </div>

                      <button
                        onClick={handleSignUp}
                        className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition"
                      >
                        Send OTP
                      </button>
                    </div>

                    <p className="mt-6 text-center text-sm text-gray-500">
                      Already have an account?{" "}
                      <button
                        onClick={() => setStep("login")}
                        className="text-black font-medium hover:underline"
                      >
                        Login
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* OTP */}
                {step === "otp" && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-xl font-semibold">Verify Email</h2>

                    <div className="mt-6 flex justify-between gap-2">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          maxLength={1}
                          value={digit}
                          onChange={(e) =>
                            handleOtpChange(i, e.target.value)
                          }
                          className="
                            w-10 h-12 sm:w-12
                            text-center text-lg font-semibold
                            rounded-xl bg-white
                            border border-black/20
                            outline-none
                          "
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleVerifyOtp}
                      className="mt-6 w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition"
                    >
                      Verify & Create Account
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
