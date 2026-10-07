"use client";



import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Award,
  Calendar,
  Check,
  Loader2,
  Save,
  Users,
  UserPlus,
  Trash2,
  Plus,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  X,
  Sparkles,
  FileText,
  Clock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import { useTranslation } from "@/context/LanguageContext";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── STUDENT PROGRAM STATE ── */
  const [studentData, setStudentData] = useState<any | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentStep, setStudentStep] = useState<1 | 2 | 3>(1);
  const [institutionName, setInstitutionName] = useState("");
  const [verifyMethod, setVerifyMethod] = useState<
    "institutional_email" | "student_id" | "enrollment_document"
  >("institutional_email");
  const [eduEmail, setEduEmail] = useState("");
  const [studentFullName, setStudentFullName] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [documentType, setDocumentType] = useState("Bonafide Certificate");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null);

  /* ── FAMILY ACCOUNT STATE ── */
  const [family, setFamily] = useState<any | null>(null);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRelation, setMemberRelation] = useState("Spouse");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [familyMsg, setFamilyMsg] = useState<string | null>(null);

  const fetchFamily = async () => {
    try {
      setLoadingFamily(true);
      const res = await axios.get("/api/user/family");
      if (res.data.success) {
        setFamily(res.data.family);
      }
    } catch (err) {
      console.error("Fetch family error:", err);
    } finally {
      setLoadingFamily(false);
    }
  };

  const fetchStudentStatus = async () => {
    try {
      setLoadingStudent(true);
      const res = await axios.get("/api/user/verify-student");
      if (res.data.success) {
        setStudentData(res.data);
      }
    } catch (err) {
      console.error("Fetch student status error:", err);
    } finally {
      setLoadingStudent(false);
    }
  };

  useEffect(() => {
    fetchFamily();
    fetchStudentStatus();
  }, []);

  const handleVerifyStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);

    if (!institutionName.trim()) {
      setStudentError("Please enter your college or university name.");
      return;
    }

    if (verifyMethod === "institutional_email") {
      if (!eduEmail.includes("@") || (!eduEmail.includes(".edu") && !eduEmail.includes(".ac."))) {
        setStudentError("Please enter a valid accredited institutional email (.edu / .ac.in / university domain).");
        return;
      }
    } else if (verifyMethod === "student_id") {
      if (!studentFullName.trim() || !studentIdNumber.trim()) {
        setStudentError("Please provide your full student name and Student ID / Roll number.");
        return;
      }
    } else if (verifyMethod === "enrollment_document") {
      if (!studentFullName.trim()) {
        setStudentError("Please provide your student name.");
        return;
      }
    }

    try {
      setSubmittingStudent(true);
      const res = await axios.post("/api/user/verify-student", {
        method: verifyMethod,
        institutionName: institutionName.trim(),
        eduEmail: eduEmail.trim(),
        studentName: studentFullName.trim(),
        studentIdNumber: studentIdNumber.trim(),
        documentType,
        academicYear,
      });

      if (res.data.success) {
        setVerifiedResult(res.data);
        setStudentStep(3);
        fetchStudentStatus();
      } else {
        setStudentError(res.data.message || "Verification failed. Please check your details.");
      }
    } catch (err: any) {
      setStudentError(err.response?.data?.message || "Failed to submit verification. Please try again.");
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;
    try {
      setAddingMember(true);
      const res = await axios.post("/api/user/family/member", {
        name: memberName.trim(),
        relation: memberRelation,
        phone: memberPhone.trim(),
        email: memberEmail.trim(),
      });
      if (res.data.success) {
        setFamily(res.data.family);
        setMemberName("");
        setMemberPhone("");
        setMemberEmail("");
        setShowAddMember(false);
        setFamilyMsg("Member added successfully");
        setTimeout(() => setFamilyMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this family member?")) return;
    try {
      const res = await axios.delete(`/api/user/family/member?memberId=${memberId}`);
      if (res.data.success) {
        setFamily(res.data.family);
      }
    } catch (err: any) {
      alert("Failed to remove member");
    }
  };

  const handleToggleCentralBilling = async () => {
    if (!family) return;
    const nextVal = !family.sharedPaymentEnabled;
    try {
      const res = await axios.post("/api/user/family", {
        sharedPaymentEnabled: nextVal,
      });
      if (res.data.success) {
        setFamily(res.data.family);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

      <main className="relative max-w-2xl mx-auto w-full px-3.5 sm:px-4 pt-24 sm:pt-28 pb-12 sm:pb-20 z-10 flex-1">
        {/* Back Button & Title */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center hover:bg-zinc-50 transition-colors shrink-0"
          >
            <ArrowLeft size={16} className="text-zinc-900" />
          </motion.button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight leading-none">Account Profile</h1>
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

          <form onSubmit={handleSave} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
            
            {/* Header Avatar info */}
            <div className="flex items-center gap-3.5 sm:gap-4 pb-5 sm:pb-6 border-b border-zinc-100">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shadow-zinc-950/20 shrink-0">
                {userData?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-zinc-900 leading-tight truncate">{userData?.name}</h2>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center mt-1">
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
                  <User size={16} className="text-zinc-400 shrink-0" />
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
                  <Phone size={16} className="text-zinc-400 shrink-0" />
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
            <div className="bg-zinc-50 border border-zinc-150 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-zinc-500 gap-0.5 sm:gap-2">
                <span className="flex items-center gap-2 shrink-0">
                  <Mail size={14} className="text-zinc-400 shrink-0" /> Email Address
                </span>
                <span className="font-mono text-zinc-800 break-all sm:break-normal text-right sm:text-left">{userData?.email}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span className="flex items-center gap-2">
                  <Award size={14} className="text-zinc-400 shrink-0" /> Account Type
                </span>
                <span className="text-zinc-800 uppercase tracking-wide">{userData?.role}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="text-zinc-400 shrink-0" /> Created At
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
            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3">
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Changes saved
                  </motion.span>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={saving || !name.trim()}
                className="w-full sm:w-auto bg-zinc-950 hover:bg-black disabled:opacity-40 text-white font-black text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-zinc-950/15 transition-all"
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

        {/* 🎓 STUDENT BENEFITS CARD (ANNUAL 12-MONTH BENEFIT) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 sm:mt-8 bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 w-full" />
          <div className="p-4 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-inner shrink-0">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-zinc-900 leading-tight">
                      {t("student.programTitle", "RideNow Student Benefits")}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      10% OFF
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {t("student.bannerSubtitle", "Save 10% on eligible rides (up to ₹50 per ride) for 12 months.")}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {studentData?.status === "verified" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                    <Check size={14} className="text-emerald-600" />
                    {t("student.verified", "Status: Verified")}
                  </span>
                ) : studentData?.status === "expired" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black">
                    <AlertCircle size={14} className="text-rose-600" />
                    {t("student.expired", "Status: Expired")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 text-xs font-bold">
                    {t("student.notVerified", "Not Verified")}
                  </span>
                )}
              </div>
            </div>

            {/* Verified Active State */}
            {studentData?.status === "verified" ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                      <Sparkles size={16} className="text-emerald-600" />
                      10% Student Concession Active
                    </div>
                    <p className="text-xs text-emerald-800 mt-1">
                      {t("student.validUntil", "Verified until")}{" "}
                      <span className="font-bold underline">
                        {studentData.verification?.expiresAt
                          ? new Date(studentData.verification.expiresAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                          : "12 Months"}
                      </span>{" "}
                      ({studentData.daysRemaining} {t("student.days", "days")} remaining)
                    </p>
                    {studentData.verification?.institutionName && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        🏛️ {studentData.verification.institutionName}
                      </p>
                    )}
                  </div>

                  {studentData.canReverify && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentStep(1);
                        setShowStudentModal(true);
                      }}
                      className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
                    >
                      {t("student.reverify", "Re-verify Student Status")}
                    </button>
                  )}
                </div>

                {studentData.daysRemaining <= 30 && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                    <Clock size={16} className="text-amber-600 shrink-0" />
                    <span>
                      {t("student.expiresIn", "Student status expires in")}{" "}
                      <b>{studentData.daysRemaining} {t("student.days", "days")}</b>.{" "}
                      {t("student.reverifyNotice", "Re-verify now to continue receiving your annual student discount.")}
                    </span>
                  </div>
                )}
              </div>
            ) : studentData?.status === "expired" ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-rose-950 font-black text-sm">
                    <AlertCircle size={16} className="text-rose-600" />
                    Student Status Expired
                  </div>
                  <p className="text-xs text-rose-700 mt-1">
                    Your 12-month annual student discount has concluded. Re-verify your enrollment to resume 10% off on all eligible rides.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentStep(1);
                    setShowStudentModal(true);
                  }}
                  className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition"
                >
                  {t("student.verifyAgain", "Verify Again")}
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-5 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-700 font-medium">
                    Verified university and college students receive an automatic <b>10% discount</b> (capped at ₹50) on every regular ride for 1 full year.
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {t("student.noStackingNotice", "Cannot be stacked with promo codes. Minimum ride fare ₹100.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentStep(1);
                    setShowStudentModal(true);
                  }}
                  className="shrink-0 bg-zinc-950 hover:bg-black text-white text-xs font-black px-5 py-3 rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <GraduationCap size={16} />
                  {t("student.applyNow", "Apply for Student Discount")}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* 👨👩👧 FAMILY ACCOUNT HUB */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 sm:mt-8 bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 w-full" />
          <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-inner shrink-0">
                  <Users size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-zinc-900 leading-tight">
                      {family?.familyName || "Family Account"}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {family?.members?.length || 0}/5 Members
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Share rides, manage billing, and track loved ones in real-time
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMember(!showAddMember)}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-black px-4 py-2.5 rounded-xl shadow-md transition w-full sm:w-auto"
              >
                <UserPlus size={14} /> {showAddMember ? "Cancel" : "Add Member"}
              </button>
            </div>

            {/* Central Shared Billing Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-200 text-zinc-700 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">Centralized Family Billing</h4>
                  <p className="text-[11px] text-zinc-500">Allow family members to ride using organizer's payment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleCentralBilling}
                className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 ${family?.sharedPaymentEnabled ? "bg-emerald-500 justify-end" : "bg-zinc-300 justify-start"}`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Inline Add Member Form */}
            <AnimatePresence>
              {showAddMember && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddMember}
                  className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 space-y-3 overflow-hidden"
                >
                  <p className="text-xs font-black uppercase text-blue-900 tracking-wider">Add Family Member</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Full Name *"
                      value={memberName}
                      onChange={e => setMemberName(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-blue-500"
                    />
                    <select
                      value={memberRelation}
                      onChange={e => setMemberRelation(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Child">Child</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Mobile Number (Optional)"
                      value={memberPhone}
                      onChange={e => setMemberPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Email Address (Optional)"
                      value={memberEmail}
                      onChange={e => setMemberEmail(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="text-xs font-bold text-zinc-600 hover:text-zinc-800 px-4 py-2 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingMember || !memberName.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow"
                    >
                      {addingMember ? "Adding..." : "Add to Family"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Member List */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Active Family Members
              </p>
              {family?.members && family.members.length > 0 ? (
                <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden bg-zinc-50/50">
                  {family.members.map((m: any) => (
                    <div key={m._id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-zinc-900">{m.name}</p>
                            <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {m.relation}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {m.phone ? `Phone: ${m.phone}` : m.email || "Family Member"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m._id)}
                        className="w-8 h-8 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                  <Users size={28} className="text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-zinc-600">No family members added yet</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Add your children, spouse, or parents to share rides</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        {/* 🎓 STUDENT VERIFICATION MODAL (3 STEPS) */}
        <AnimatePresence>
          {showStudentModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-zinc-200 relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-zinc-900 leading-tight">
                        {t("student.programTitle", "RideNow Student Benefits")}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-semibold">
                        {studentStep === 1
                          ? "Step 1 of 2: Select Institution & Method"
                          : studentStep === 2
                          ? "Step 2 of 2: Verification Details"
                          : "Verification Successful"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStudentModal(false)}
                    className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {studentError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
                    <span>{studentError}</span>
                  </div>
                )}

                {/* STEP 1: Institution & Method */}
                {studentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        {t("student.institution", "College / University Name")} *
                      </label>
                      <input
                        type="text"
                        required
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="e.g. Delhi University, IIT Bombay, Cotton University"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-900 focus:bg-white focus:border-zinc-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                        {t("student.method", "Verification Method")}
                      </label>
                      <div className="space-y-2">
                        {[
                          {
                            id: "institutional_email",
                            label: t("student.methodEmail", "College Email (.edu / .ac.in)"),
                            desc: "Fastest verification via your accredited university email",
                          },
                          {
                            id: "student_id",
                            label: t("student.methodId", "Student ID Card"),
                            desc: "Verify using student name, ID/Roll number & enrollment year",
                          },
                          {
                            id: "enrollment_document",
                            label: t("student.methodDoc", "Enrollment / Bonafide Document"),
                            desc: "Admission letter, bonafide certificate or enrollment proof",
                          },
                        ].map((m) => (
                          <label
                            key={m.id}
                            onClick={() => setVerifyMethod(m.id as any)}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                              verifyMethod === m.id
                                ? "border-emerald-600 bg-emerald-50/50"
                                : "border-zinc-200 hover:bg-zinc-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="verifyMethod"
                              checked={verifyMethod === m.id}
                              onChange={() => {}}
                              className="mt-1 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-zinc-900">{m.label}</p>
                              <p className="text-[11px] text-zinc-500 leading-snug">{m.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!institutionName.trim()}
                      onClick={() => {
                        setStudentError(null);
                        setStudentStep(2);
                      }}
                      className="w-full bg-zinc-950 hover:bg-black disabled:opacity-40 text-white font-black text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      {t("common.continue", "Continue")}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* STEP 2: Input Details */}
                {studentStep === 2 && (
                  <form onSubmit={handleVerifyStudent} className="space-y-4">
                    {verifyMethod === "institutional_email" ? (
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                          Institutional Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={eduEmail}
                          onChange={(e) => setEduEmail(e.target.value)}
                          placeholder="e.g. yourname@university.edu or .ac.in"
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-900 focus:bg-white focus:border-zinc-900 outline-none"
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Must be an accredited institutional email (.edu, .ac.in, .edu.in, .ac.uk, etc.)
                        </p>
                      </div>
                    ) : verifyMethod === "student_id" ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            {t("student.studentName", "Student Full Name")} *
                          </label>
                          <input
                            type="text"
                            required
                            value={studentFullName}
                            onChange={(e) => setStudentFullName(e.target.value)}
                            placeholder="Full name as printed on ID"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold outline-none focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            {t("student.idNumber", "Student ID / Roll Number")} *
                          </label>
                          <input
                            type="text"
                            required
                            value={studentIdNumber}
                            onChange={(e) => setStudentIdNumber(e.target.value)}
                            placeholder="e.g. 2024CS1092"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold outline-none focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            {t("student.academicYear", "Current Academic Year")}
                          </label>
                          <input
                            type="text"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold outline-none focus:bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            {t("student.studentName", "Student Full Name")} *
                          </label>
                          <input
                            type="text"
                            required
                            value={studentFullName}
                            onChange={(e) => setStudentFullName(e.target.value)}
                            placeholder="Full name as per official records"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold outline-none focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            Document Type
                          </label>
                          <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold outline-none focus:bg-white"
                          >
                            <option value="Bonafide Certificate">Bonafide Certificate</option>
                            <option value="Admission Letter">Admission / Enrollment Letter</option>
                            <option value="Current Academic Status">Current Academic Status Letter</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                            Academic Year
                          </label>
                          <input
                            type="text"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold outline-none focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] text-zinc-500 leading-snug">
                      🔒 <b>DPDP Act Privacy Notice:</b> Your academic data is collected solely to authenticate student discount eligibility and will not be shared with advertisers or third parties.
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setStudentStep(1)}
                        className="px-4 py-3 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition"
                      >
                        {t("common.back", "Back")}
                      </button>
                      <button
                        type="submit"
                        disabled={submittingStudent}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
                      >
                        {submittingStudent ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Check size={15} />
                            Verify Student Status
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: SUCCESS STATE */}
                {studentStep === 3 && (
                  <div className="text-center py-4 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 size={36} />
                    </div>

                    <div>
                      <h4 className="text-base font-black text-zinc-900">
                        {t("student.verified", "Student Status VERIFIED ✓")}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">
                        10% discount (up to ₹50 per eligible ride) is now active!
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-left space-y-1.5 text-xs text-emerald-900">
                      <div className="flex justify-between">
                        <span className="text-emerald-700">Institution:</span>
                        <span className="font-bold">{institutionName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-700">Annual Validity:</span>
                        <span className="font-bold">12 Months (365 Days)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-700">Max Discount:</span>
                        <span className="font-bold">₹50 per ride</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowStudentModal(false);
                        setStudentStep(1);
                      }}
                      className="w-full bg-zinc-950 hover:bg-black text-white text-xs font-black py-3.5 rounded-xl shadow-lg transition"
                    >
                      {t("common.done", "Done")}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
