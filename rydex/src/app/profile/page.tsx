"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Phone, Mail, Award, Calendar, Check, Loader2, Save } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setMobileNumber(userData.mobileNumber || "");
    }
  }, [userData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      setSaved(false);
      const res = await axios.patch("/api/me", {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
      });

      if (res.status === 200) {
        dispatch(setUserData(res.data));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save profile changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 flex flex-col justify-between">
      <Nav />

      {/* Background dot grid pattern */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #e4e4e7 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }}
      />

      <main className="relative max-w-2xl mx-auto w-full px-4 pt-28 pb-20 z-10 flex-1">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-8">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-zinc-900" />
          </motion.button>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-none">Account Profile</h1>
            <p className="text-zinc-400 text-[10px] font-bold mt-1 uppercase tracking-wider">Configure your credentials</p>
          </div>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden"
        >
          {/* Top banner strip */}
          <div className="h-1.5 bg-zinc-950 w-full" />

          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
            
            {/* Header Avatar info */}
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-100">
              <div className="w-16 h-16 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-zinc-950/20">
                {userData?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900 leading-tight">{userData?.name}</h2>
                <div className="flex gap-2 items-center mt-1">
                  <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-zinc-200">
                    {userData?.role}
                  </span>
                  {userData?.role === "vendor" && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-200">
                      {userData?.vendorStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              {/* Name field */}
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Display Name</label>
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 focus-within:border-zinc-900 focus-within:bg-white transition-all">
                  <User size={16} className="text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none"
                  />
                </div>
              </div>

              {/* Mobile field */}
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Mobile Number</label>
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 focus-within:border-zinc-900 focus-within:bg-white transition-all">
                  <Phone size={16} className="text-zinc-400" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter your phone number"
                    inputMode="numeric"
                    className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Read-Only Meta Information */}
            <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span className="flex items-center gap-2">
                  <Mail size={14} className="text-zinc-400" /> Email Address
                </span>
                <span className="font-mono text-zinc-800">{userData?.email}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span className="flex items-center gap-2">
                  <Award size={14} className="text-zinc-400" /> Account Type
                </span>
                <span className="text-zinc-800 uppercase tracking-wide">{userData?.role}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="text-zinc-400" /> Created At
                </span>
                <span className="text-zinc-800">
                  {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }) : "—"}
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"
                  >
                    <Check size={14} /> Changes saved
                  </motion.span>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={saving || !name.trim()}
                className="bg-zinc-950 hover:bg-black disabled:opacity-40 text-white font-black text-sm px-6 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-zinc-950/15 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </motion.button>
            </div>

          </form>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
