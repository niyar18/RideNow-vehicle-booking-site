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
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import { useTranslation } from "@/context/LanguageContext";
import { validateStudentEmail } from "@/lib/studentVerification";
import { useSession } from "next-auth/react";
import AuthModal from "@/features/auth/components/AuthModal";
import { performFastSignOut } from "@/lib/authLogout";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
  const { data: session, status: sessionStatus } = useSession();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  /* ── WOMEN'S SAFETY MATCHING STATE ── */
  const [safetyProfile, setSafetyProfile] = useState<{
    womenOnlyEligible: boolean;
    consentedAt: string | null;
  } | null>(null);
  const [updatingSafety, setUpdatingSafety] = useState(false);
  const [safetyMessage, setSafetyMessage] = useState<string | null>(null);

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
  const [studentOtp, setStudentOtp] = useState("");
  const [studentRequiresOtp, setStudentRequiresOtp] = useState(false);
  const [studentResendCooldown, setStudentResendCooldown] = useState(0);

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

  /* ── SIGN OUT STATE ── */
  const [isSigningOut, setIsSigningOut] = useState(false);
  const handleSignOut = async () => {
    setIsSigningOut(true);
    await performFastSignOut("/");
  };

  /* ── DPDP ACCOUNT ERASURE STATE ── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      setDeleteError(null);
      const res = await axios.post("/api/user/delete-account");
      if (res.data.success) {
        setDeleteSuccess(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      } else {
        setDeleteError(res.data.error || "Failed to process erasure request");
      }
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.error ||
          err.message ||
          "Failed to process account deletion"
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  useEffect(() => {
    axios
      .get("/api/user/safety-matching")
      .then((res) => {
        if (res.data?.success) {
          setSafetyProfile({
            womenOnlyEligible: Boolean(res.data.safetyMatching?.womenOnlyEligible),
            consentedAt: res.data.safetyMatching?.consentedAt || null,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleWomenSafety = async (enabled: boolean) => {
    try {
      setUpdatingSafety(true);
      setSafetyMessage(null);
      const res = await axios.patch("/api/user/safety-matching", {
        womenOnlyEligible: enabled,
      });
      if (res.data?.success) {
        setSafetyProfile({
          womenOnlyEligible: Boolean(res.data.safetyMatching?.womenOnlyEligible),
          consentedAt: res.data.safetyMatching?.consentedAt || null,
        });
        setSafetyMessage(res.data.message || "Safety preferences updated successfully.");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update safety preference");
    } finally {
      setUpdatingSafety(false);
    }
  };

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
      const emailValidation = validateStudentEmail(eduEmail);
      if (!emailValidation.isValid) {
        setStudentError(
          emailValidation.reason ||
            "Please enter a valid accredited institutional email (.edu / .ac.in / .edu.in / .res.in)."
        );
        return;
      }

      if (studentRequiresOtp && (!studentOtp.trim() || studentOtp.trim().length < 6)) {
        setStudentError("Please enter the 6-digit confirmation code.");
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
      const payload: any = {
        method: verifyMethod,
        institutionName: institutionName.trim(),
        eduEmail: eduEmail.trim(),
        studentName: studentFullName.trim(),
        studentIdNumber: studentIdNumber.trim(),
        documentType,
        academicYear,
      };

      if (verifyMethod === "institutional_email") {
        if (!studentRequiresOtp) {
          payload.action = "send_otp";
        } else {
          payload.action = "verify_otp";
          payload.otp = studentOtp.trim();
        }
      }

      const res = await axios.post("/api/user/verify-student", payload);

      if (res.data.success) {
        if (res.data.requiresOtp) {
          setStudentRequiresOtp(true);
          setStudentResendCooldown(60);
          const timer = setInterval(() => {
            setStudentResendCooldown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setVerifiedResult(res.data);
          setStudentStep(3);
          fetchStudentStatus();
        }
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
    <div className="w-full min-h-screen bg-[#F7F1E5] dark:bg-[#101713] text-[#10251C] dark:text-[#F3F1E8] flex flex-col justify-between font-sans transition-colors duration-200">
      <Nav />

      {/* Background dot grid pattern */}
      <div className="fixed inset-0 pointer-events-none dark:opacity-20"
        style={{ backgroundImage: "radial-gradient(circle, #DED7CA 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.6 }}
      />

      <main className="relative max-w-2xl mx-auto w-full px-3.5 sm:px-4 pt-24 sm:pt-28 pb-12 sm:pb-20 z-10 flex-1">
        {/* Back Button & Title */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.back()}
            className="w-10 h-10 rounded-[8px] bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] shadow-xs flex items-center justify-center hover:bg-[#FAF7F0] dark:hover:bg-[#202B24] transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft size={16} className="text-[#10251C] dark:text-[#F3F1E8]" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] tracking-tight leading-none">Account Profile</h1>
            <p className="text-[#696B64] dark:text-[#B8C2B8] text-xs font-bold mt-1 uppercase tracking-wider">Configure your credentials</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] text-xs font-bold text-[#10251C] dark:text-[#F3F1E8] hover:bg-[#FAF7F0] dark:hover:bg-[#202B24] transition shadow-xs cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            title="App Settings"
          >
            <SettingsIcon size={15} className="text-[#046A38] dark:text-[#058A48]" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        {!userData && !session?.user && sessionStatus === "unauthenticated" ? (
          <div className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-[14px] border border-[#DED7CA] dark:border-[#34443A] p-8 text-center shadow-xs">
            <div className="w-16 h-16 rounded-[12px] bg-[#E5EBDD] dark:bg-[#1D3428] text-[#046A38] dark:text-[#A8E0C0] flex items-center justify-center mx-auto mb-4">
              <User size={30} />
            </div>
            <h2 className="text-xl font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] mb-2">
              Sign in to your Jaatri Account
            </h2>
            <p className="text-sm text-[#696B64] dark:text-[#B8C2B8] mb-6 max-w-sm mx-auto">
              Manage your personal credentials, student passes, family ride members, and data privacy settings.
            </p>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] text-white font-bold text-sm shadow-xs transition active:scale-95 cursor-pointer"
            >
              Sign In with Mobile
            </button>
            <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-[14px] border border-[#DED7CA] dark:border-[#34443A] shadow-xs overflow-hidden"
            >
              <form onSubmit={handleSave} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
            
            {/* Header Avatar info */}
            <div className="flex items-center gap-3.5 sm:gap-4 pb-5 sm:pb-6 border-b border-[#DED7CA]/60 dark:border-[#34443A]">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[10px] bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center font-bold font-serif text-xl sm:text-2xl shadow-xs shrink-0">
                {userData?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] leading-tight truncate">{userData?.name}</h2>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center mt-1">
                  <span className="inline-flex items-center gap-1 bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border border-[#DED7CA] dark:border-[#34443A]">
                    {userData?.role}
                  </span>
                  {userData?.role === "vendor" && (
                    <span className="inline-flex items-center gap-1 bg-white dark:bg-[#1E2B23] text-[#123D32] dark:text-[#A3E635] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border border-[#DED7CA] dark:border-[#34443A]">
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
                <label className="text-xs font-bold text-[#696B64] dark:text-[#B8C2B8] uppercase tracking-widest block mb-2">Display Name</label>
                <div className="flex items-center gap-3 bg-white dark:bg-[#101713] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-4 py-3 focus-within:border-[#123D32] dark:focus-within:border-[#28664D] focus-within:ring-2 focus-within:ring-[#123D32]/10 transition-all">
                  <User size={16} className="text-[#696B64] dark:text-[#B8C2B8] shrink-0" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 bg-transparent text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 outline-none"
                  />
                </div>
              </div>

              {/* Mobile field */}
              <div>
                <label className="text-xs font-bold text-[#696B64] dark:text-[#B8C2B8] uppercase tracking-widest block mb-2">Mobile Number</label>
                <div className="flex items-center gap-3 bg-white dark:bg-[#101713] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-4 py-3 focus-within:border-[#123D32] dark:focus-within:border-[#28664D] focus-within:ring-2 focus-within:ring-[#123D32]/10 transition-all">
                  <Phone size={16} className="text-[#696B64] dark:text-[#B8C2B8] shrink-0" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter your phone number"
                    inputMode="numeric"
                    className="flex-1 bg-transparent text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Read-Only Meta Information */}
            <div className="bg-white/70 dark:bg-[#1E2B23]/70 border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-[#696B64] dark:text-[#B8C2B8] gap-0.5 sm:gap-2">
                <span className="flex items-center gap-2 shrink-0">
                  <Mail size={14} className="text-[#696B64] dark:text-[#B8C2B8] shrink-0" /> Email Address
                </span>
                <span className="font-mono text-[#10251C] dark:text-[#F3F1E8] break-all sm:break-normal text-right sm:text-left">{userData?.email}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-[#696B64] dark:text-[#B8C2B8]">
                <span className="flex items-center gap-2">
                  <Award size={14} className="text-[#696B64] dark:text-[#B8C2B8] shrink-0" /> Account Type
                </span>
                <span className="text-[#10251C] dark:text-[#F3F1E8] uppercase tracking-wide">{userData?.role}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-[#696B64] dark:text-[#B8C2B8]">
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="text-[#696B64] dark:text-[#B8C2B8] shrink-0" /> Created At
                </span>
                <span className="text-[#10251C] dark:text-[#F3F1E8]">
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
                    className="text-xs font-bold text-[#123D32] dark:text-[#A3E635] flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Changes saved
                  </motion.span>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={saving || !name.trim()}
                className="w-full sm:w-auto bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] disabled:opacity-40 text-white font-bold text-sm px-6 py-3 rounded-[8px] flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
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
          className="mt-6 sm:mt-8 bg-[#FAF7F0] dark:bg-[#17211B] rounded-[14px] border border-[#DED7CA] dark:border-[#34443A] shadow-xs overflow-hidden"
        >
          <div className="p-4 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#DED7CA]/60 dark:border-[#34443A]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[10px] bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] flex items-center justify-center font-bold shadow-xs shrink-0">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] leading-tight">
                      {t("student.programTitle", "Jaatri Student Benefits")}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] border border-[#DED7CA] dark:border-[#34443A] px-2 py-0.5 rounded-[4px]">
                      10% OFF
                    </span>
                  </div>
                  <p className="text-xs text-[#696B64] dark:text-[#B8C2B8] font-medium mt-0.5">
                    {t("student.bannerSubtitle", "Save 10% on eligible rides (up to ₹50 per ride) for 12 months.")}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {studentData?.status === "verified" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#E5EBDD] dark:bg-[#1D3428] border border-[#DED7CA] dark:border-[#34443A] text-[#123D32] dark:text-[#A3E635] text-xs font-bold">
                    <Check size={14} className="text-[#123D32] dark:text-[#A3E635]" />
                    {t("student.verified", "Status: Verified")}
                  </span>
                ) : studentData?.status === "pending" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
                    <Clock size={14} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                    Status: Pending Review
                  </span>
                ) : studentData?.status === "rejected" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 text-[#E34222] dark:text-[#E06A50] text-xs font-bold">
                    <AlertCircle size={14} className="text-[#E34222] dark:text-[#E06A50]" />
                    Status: Not Approved
                  </span>
                ) : studentData?.status === "expired" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 text-[#E34222] dark:text-[#E06A50] text-xs font-bold">
                    <AlertCircle size={14} className="text-[#E34222] dark:text-[#E06A50]" />
                    {t("student.expired", "Status: Expired")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] text-[#696B64] dark:text-[#B8C2B8] text-xs font-bold">
                    {t("student.notVerified", "Not Verified")}
                  </span>
                )}
              </div>
            </div>

            {/* Verified Active State */}
            {studentData?.status === "verified" ? (
              <div className="space-y-4">
                <div className="p-4 bg-white/70 dark:bg-[#1E2B23]/70 border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[#123D32] dark:text-[#A3E635] font-bold text-sm">
                      <Sparkles size={16} className="text-[#123D32] dark:text-[#A3E635]" />
                      10% Student Concession Active
                    </div>
                    <p className="text-xs text-[#123D32] dark:text-[#B8C2B8] mt-1">
                      {t("student.validUntil", "Verified until")}{" "}
                      <span className="font-bold underline text-[#10251C] dark:text-[#F3F1E8]">
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
                      <p className="text-[11px] text-[#123D32] dark:text-[#347858] font-semibold mt-0.5">
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
                      className="shrink-0 bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] text-white text-xs font-bold px-4 py-2.5 rounded-[8px] shadow-xs transition cursor-pointer"
                    >
                      {t("student.reverify", "Re-verify Student Status")}
                    </button>
                  )}
                </div>

                {studentData.daysRemaining <= 30 && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-[8px] flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
                    <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      {t("student.expiresIn", "Student status expires in")}{" "}
                      <b>{studentData.daysRemaining} {t("student.days", "days")}</b>.{" "}
                      {t("student.reverifyNotice", "Re-verify now to continue receiving your annual student discount.")}
                    </span>
                  </div>
                )}
              </div>
            ) : studentData?.status === "pending" ? (
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-[10px] space-y-2">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
                  <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                  Student Application Under Administrative Review
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                  Your student credentials for <b>{studentData.verification?.institutionName || "your institution"}</b> have been submitted. An administrator will review and verify your enrollment within 24–48 hours.
                </p>
                <div className="pt-1 text-[11px] text-amber-700 dark:text-amber-500 font-medium">
                  Submitted Method: {studentData.verification?.verificationMethod === "student_id" ? "Student ID Card" : "Enrollment / Bonafide Document"}
                </div>
              </div>
            ) : studentData?.status === "rejected" ? (
              <div className="p-4 bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[#E34222] dark:text-[#E06A50] font-bold text-sm">
                    <AlertCircle size={16} className="text-[#E34222] dark:text-[#E06A50]" />
                    Verification Request Not Approved
                  </div>
                  <p className="text-xs text-[#E34222] dark:text-[#E06A50] mt-1">
                    Reason: {studentData.verification?.rejectionReason || "Could not verify credentials with official records."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentStep(1);
                    setStudentRequiresOtp(false);
                    setStudentOtp("");
                    setShowStudentModal(true);
                  }}
                  className="shrink-0 bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] text-white text-xs font-bold px-4 py-2.5 rounded-[8px] shadow-xs transition cursor-pointer"
                >
                  Re-apply
                </button>
              </div>
            ) : studentData?.status === "expired" ? (
              <div className="p-4 bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[#E34222] dark:text-[#E06A50] font-bold text-sm">
                    <AlertCircle size={16} className="text-[#E34222] dark:text-[#E06A50]" />
                    Student Status Expired
                  </div>
                  <p className="text-xs text-[#E34222] dark:text-[#E06A50] mt-1">
                    Your 12-month annual student discount has concluded. Re-verify your enrollment to resume 10% off on all eligible rides.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentStep(1);
                    setShowStudentModal(true);
                  }}
                  className="shrink-0 bg-[#E34222] hover:bg-[#E34222]/90 dark:bg-[#E06A50] dark:hover:bg-[#E06A50]/90 text-white text-xs font-bold px-4 py-2.5 rounded-[8px] shadow-xs transition cursor-pointer"
                >
                  {t("student.verifyAgain", "Verify Again")}
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-5 bg-white/70 dark:bg-[#1E2B23]/70 border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-[#10251C] dark:text-[#F3F1E8] font-medium">
                    Verified university and college students receive an automatic <b>10% discount</b> (capped at ₹50) on every regular ride for 1 full year.
                  </p>
                  <p className="text-[11px] text-[#696B64] dark:text-[#B8C2B8]">
                    {t("student.noStackingNotice", "Cannot be stacked with promo codes. Minimum ride fare ₹100.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentStep(1);
                    setShowStudentModal(true);
                  }}
                  className="shrink-0 bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] text-white text-xs font-bold px-5 py-3 rounded-[8px] shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GraduationCap size={16} />
                  {t("student.applyNow", "Apply for Student Discount")}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* 🛡️ WOMEN'S SAFETY & PREFERENCE HUB */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-6 sm:mt-8 bg-[#FAF7F0] dark:bg-[#17211B] rounded-[14px] border border-[#DED7CA] dark:border-[#34443A] shadow-xs overflow-hidden"
        >
          <div className="p-4 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#DED7CA]/60 dark:border-[#34443A]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[10px] bg-emerald-50 dark:bg-[#1D3428] text-[#046A38] dark:text-[#A3E635] flex items-center justify-center font-bold shadow-xs shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] leading-tight">
                      Women&apos;s Safety Matching
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-[#1D3428] text-[#046A38] dark:text-[#A3E635] border border-emerald-200 dark:border-[#28664D] px-2 py-0.5 rounded-[4px]">
                      Zero Silent Fallback
                    </span>
                  </div>
                  <p className="text-xs text-[#696B64] dark:text-[#B8C2B8] font-medium mt-0.5">
                    Match with verified female drivers and configure safety preferences.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-bold ${
                  safetyProfile?.womenOnlyEligible
                    ? "bg-emerald-50 dark:bg-[#1D3428] text-[#046A38] dark:text-[#A3E635] border border-emerald-200 dark:border-[#28664D]"
                    : "bg-white dark:bg-[#1E2B23] text-[#696B64] dark:text-[#B8C2B8] border border-[#DED7CA] dark:border-[#34443A]"
                }`}>
                  {safetyProfile?.womenOnlyEligible ? "Enrolled for Women-Only Rides" : "Standard Preference"}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white/70 dark:bg-[#1E2B23]/70 border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-[#10251C] dark:text-[#F3F1E8] font-bold">
                    Women-Only Driver Matching Eligibility
                  </p>
                  <p className="text-[11px] text-[#696B64] dark:text-[#B8C2B8] leading-relaxed max-w-xl">
                    I self-attest that I am a woman passenger and request eligibility to be matched with verified female drivers who choose to receive women-only ride requests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWomenSafety(!safetyProfile?.womenOnlyEligible)}
                  disabled={updatingSafety}
                  className={`shrink-0 px-5 py-2.5 rounded-[8px] text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                    safetyProfile?.womenOnlyEligible
                      ? "bg-white dark:bg-[#1E2B23] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-50"
                      : "bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white shadow-xs"
                  }`}
                >
                  {updatingSafety ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : safetyProfile?.womenOnlyEligible ? (
                    "Opt Out"
                  ) : (
                    "Confirm & Enable"
                  )}
                </button>
              </div>

              {safetyMessage && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {safetyMessage}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* 👨👩👧 FAMILY ACCOUNT HUB */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 sm:mt-8 bg-[#FAF7F0] dark:bg-[#17211B] rounded-[14px] border border-[#DED7CA] dark:border-[#34443A] shadow-xs overflow-hidden"
        >
          <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-[#DED7CA]/60 dark:border-[#34443A]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[10px] bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Users size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] leading-tight">
                      {family?.familyName || "Family Account"}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] border border-[#DED7CA] dark:border-[#34443A] px-2 py-0.5 rounded-[4px]">
                      {family?.members?.length || 0}/5 Members
                    </span>
                  </div>
                  <p className="text-xs text-[#696B64] dark:text-[#B8C2B8] font-medium mt-0.5">
                    Share rides, manage billing, and track loved ones in real-time
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMember(!showAddMember)}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] px-4 py-2.5 rounded-[8px] shadow-xs transition w-full sm:w-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
              >
                <UserPlus size={14} /> {showAddMember ? "Cancel" : "Add Member"}
              </button>
            </div>

            {/* Central Shared Billing Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/70 dark:bg-[#1E2B23]/70 border border-[#DED7CA] dark:border-[#34443A] rounded-[10px]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[6px] bg-[#FAF7F0] dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] text-[#123D32] dark:text-[#A3E635] flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#10251C] dark:text-[#F3F1E8]">Centralized Family Billing</h4>
                  <p className="text-[11px] text-[#696B64] dark:text-[#B8C2B8]">Allow family members to ride using organizer's payment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleCentralBilling}
                className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${family?.sharedPaymentEnabled ? "bg-[#123D32] dark:bg-[#28664D] justify-end" : "bg-[#DED7CA] dark:bg-[#34443A] justify-start"}`}
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
                  className="bg-white/90 dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] p-5 space-y-3 overflow-hidden"
                >
                  <p className="text-xs font-bold uppercase text-[#10251C] dark:text-[#F3F1E8] tracking-wider">Add Family Member</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Full Name *"
                      value={memberName}
                      onChange={e => setMemberName(e.target.value)}
                      className="w-full bg-white dark:bg-[#101713] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-3.5 py-2.5 text-xs text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 outline-none focus:border-[#123D32] dark:focus:border-[#28664D]"
                    />
                    <select
                      value={memberRelation}
                      onChange={e => setMemberRelation(e.target.value)}
                      className="w-full bg-white dark:bg-[#101713] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-3.5 py-2.5 text-xs text-[#10251C] dark:text-[#F3F1E8] outline-none focus:border-[#123D32] dark:focus:border-[#28664D] font-medium"
                    >
                      <option value="Spouse" className="dark:bg-[#101713]">Spouse</option>
                      <option value="Child" className="dark:bg-[#101713]">Child</option>
                      <option value="Parent" className="dark:bg-[#101713]">Parent</option>
                      <option value="Sibling" className="dark:bg-[#101713]">Sibling</option>
                      <option value="Other" className="dark:bg-[#101713]">Other</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Mobile Number (Optional)"
                      value={memberPhone}
                      onChange={e => setMemberPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full bg-white dark:bg-[#101713] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-3.5 py-2.5 text-xs text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 outline-none focus:border-[#123D32] dark:focus:border-[#28664D]"
                    />
                    <input
                      type="email"
                      placeholder="Email Address (Optional)"
                      value={memberEmail}
                      onChange={e => setMemberEmail(e.target.value)}
                      className="w-full bg-white dark:bg-[#101713] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-3.5 py-2.5 text-xs text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 outline-none focus:border-[#123D32] dark:focus:border-[#28664D]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="min-h-[44px] text-xs font-bold text-[#696B64] dark:text-[#B8C2B8] hover:text-[#10251C] dark:hover:text-[#F3F1E8] px-4 py-2 rounded-[8px] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingMember || !memberName.trim()}
                      className="min-h-[44px] bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-[8px] transition shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
                    >
                      {addingMember ? "Adding..." : "Add to Family"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Member List */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#696B64] dark:text-[#B8C2B8] uppercase tracking-widest">
                Active Family Members
              </p>
              {family?.members && family.members.length > 0 ? (
                <div className="divide-y divide-[#DED7CA]/60 dark:divide-[#34443A] border border-[#DED7CA] dark:border-[#34443A] rounded-[10px] overflow-hidden bg-white/70 dark:bg-[#1E2B23]/70">
                  {family.members.map((m: any) => (
                    <div key={m._id} className="p-4 flex items-center justify-between hover:bg-[#FAF7F0] dark:hover:bg-[#202B24] transition">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center font-bold text-xs">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#10251C] dark:text-[#F3F1E8]">{m.name}</p>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] border border-[#DED7CA] dark:border-[#34443A] px-2 py-0.5 rounded-[4px]">
                              {m.relation}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#696B64] dark:text-[#B8C2B8]">
                            {m.phone ? `Phone: ${m.phone}` : m.email || "Family Member"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${m.name || "family member"}`}
                        onClick={() => handleRemoveMember(m._id)}
                        className="min-w-[44px] min-h-[44px] rounded-[6px] hover:bg-[#faebe8] dark:hover:bg-[#341814] text-[#696B64] dark:text-[#B8C2B8] hover:text-[#E34222] dark:hover:text-[#E06A50] flex items-center justify-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E34222]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-[#DED7CA] dark:border-[#34443A] rounded-[10px] bg-white/50 dark:bg-[#1E2B23]/50">
                  <Users size={28} className="text-[#696B64]/50 dark:text-[#B8C2B8]/40 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#10251C] dark:text-[#F3F1E8]">No family members added yet</p>
                  <p className="text-[10px] text-[#696B64] dark:text-[#B8C2B8] mt-0.5">Add your children, spouse, or parents to share rides</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 🔒 DPDP ACT, 2023 - PRIVACY & DATA ERASURE */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 sm:mt-8 bg-[#FAF7F0] dark:bg-[#17211B] rounded-[14px] border border-[#DED7CA] dark:border-[#34443A] shadow-xs overflow-hidden"
        >
          <div className="p-4 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DED7CA]/60 dark:border-[#34443A]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[10px] bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] text-[#10251C] dark:text-[#F3F1E8] flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] leading-tight">
                    Data Privacy & Account Erasure
                  </h3>
                  <p className="text-xs text-[#696B64] dark:text-[#B8C2B8] font-medium mt-0.5">
                    Exercise your statutory rights under Section 12 of the Digital Personal Data Protection Act, 2023
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteSuccess(false);
                  setShowDeleteModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#E34222] dark:text-[#E06A50] bg-[#faebe8] dark:bg-[#341814] hover:bg-[#faebe8]/80 dark:hover:bg-[#341814]/80 border border-[#E34222]/30 dark:border-[#E06A50]/40 px-4 py-2.5 rounded-[8px] transition w-full sm:w-auto cursor-pointer"
              >
                <Trash2 size={14} /> Request Account Deletion
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs text-[#696B64] dark:text-[#B8C2B8]">
              <div className="p-3 bg-white/70 dark:bg-[#1E2B23]/70 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A]">
                <span className="font-bold text-[#10251C] dark:text-[#F3F1E8] block mb-0.5">Instant Identity Scrubbing:</span>
                Your name, phone number, login credentials, and saved addresses are immediately anonymized.
              </div>
              <div className="p-3 bg-white/70 dark:bg-[#1E2B23]/70 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A]">
                <span className="font-bold text-[#10251C] dark:text-[#F3F1E8] block mb-0.5">Statutory Retention:</span>
                Past trip logs and tax receipts are archived in anonymized form for statutory audit periods under Motor Vehicle Guidelines.
              </div>
            </div>
          </div>

          {/* 🚪 SIGN OUT ACTION CARD */}
          <div className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-[12px] border border-[#DED7CA] dark:border-[#34443A] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#faebe8] dark:bg-[#341814] text-[#E34222] dark:text-[#E06A50] flex items-center justify-center shrink-0">
                <LogOut size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold font-serif text-[#10251C] dark:text-[#F3F1E8]">
                  Sign Out of Jaatri
                </h3>
                <p className="text-xs text-[#696B64] dark:text-[#B8C2B8]">
                  Securely sign out of your account on this device.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full sm:w-auto px-5 py-2.5 rounded-[8px] bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSigningOut ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
        </>
        )}

        {/* 🗑️ ACCOUNT DELETION CONFIRMATION MODAL */}
        <AnimatePresence>
          {showDeleteModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-[16px] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#DED7CA] dark:border-[#34443A] relative overflow-hidden"
              >
                <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]/60 dark:border-[#34443A] mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[8px] bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                      <Trash2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] leading-tight">
                        Confirm Account Erasure
                      </h3>
                      <p className="text-[11px] text-[#696B64] dark:text-[#B8C2B8] font-semibold">
                        Permanent Action under DPDP Act, 2023
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close delete account dialog"
                    onClick={() => setShowDeleteModal(false)}
                    className="min-w-[44px] min-h-[44px] rounded-[6px] bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] flex items-center justify-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
                  >
                    <X size={16} />
                  </button>
                </div>

                {deleteError && (
                  <div className="mb-4 p-3 rounded-[8px] bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 text-[#E34222] dark:text-[#E06A50] text-xs flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 text-[#E34222] dark:text-[#E06A50] mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}

                {deleteSuccess ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={28} />
                    </div>
                    <h4 className="text-sm font-bold font-serif text-[#10251C] dark:text-[#F3F1E8]">Account Erased Successfully</h4>
                    <p className="text-xs text-[#696B64] dark:text-[#B8C2B8]">
                      Your personal identifiers have been scrubbed. Redirecting you to home...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-[#696B64] dark:text-[#B8C2B8] leading-relaxed">
                      Are you sure you want to delete your account? This action cannot be reversed.
                    </p>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-[8px] text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-amber-700 dark:text-amber-400" /> Accounting Prerequisites:
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5 pl-1">
                        <li>No active or scheduled rides ongoing</li>
                        <li>No pending cancellation or platform dues</li>
                        <li>Zero wallet balance (withdraw balance first)</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-3 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold bg-white dark:bg-[#1E2B23] hover:bg-[#FAF7F0] dark:hover:bg-[#202B24] transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={deletingAccount}
                        onClick={handleDeleteAccount}
                        className="flex-1 bg-[#E34222] hover:bg-[#E34222]/90 dark:bg-[#E06A50] dark:hover:bg-[#E06A50]/90 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-[8px] flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        {deletingAccount ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Erasing Identifiers...
                          </>
                        ) : (
                          <>
                            <Trash2 size={15} />
                            Permanently Erase My Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 🎓 STUDENT VERIFICATION MODAL (3 STEPS) */}
        <AnimatePresence>
          {showStudentModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#FAF7F0] dark:bg-[#17211B] rounded-[16px] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#DED7CA] dark:border-[#34443A] relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]/60 dark:border-[#34443A] mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[8px] bg-[#E5EBDD] dark:bg-[#1D3428] text-[#123D32] dark:text-[#A3E635] flex items-center justify-center font-bold">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-serif text-[#10251C] dark:text-[#F3F1E8] leading-tight">
                        {t("student.programTitle", "Jaatri Student Benefits")}
                      </h3>
                      <p className="text-[11px] text-[#696B64] dark:text-[#B8C2B8] font-semibold">
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
                    aria-label="Close student verification dialog"
                    onClick={() => setShowStudentModal(false)}
                    className="min-w-[44px] min-h-[44px] rounded-[6px] bg-white dark:bg-[#1E2B23] text-[#10251C] dark:text-[#F3F1E8] border border-[#DED7CA] dark:border-[#34443A] hover:bg-[#F7F1E5] dark:hover:bg-[#202B24] flex items-center justify-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
                  >
                    <X size={16} />
                  </button>
                </div>

                {studentError && (
                  <div className="mb-4 p-3 rounded-[8px] bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 text-[#E34222] dark:text-[#E06A50] text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-[#E34222] dark:text-[#E06A50]" />
                    <span>{studentError}</span>
                  </div>
                )}

                {/* STEP 1: Institution & Method */}
                {studentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-1.5">
                        {t("student.institution", "College / University Name")} *
                      </label>
                      <input
                        type="text"
                        required
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="e.g. Gauhati University, IIT Guwahati, Cotton University"
                        className="w-full px-4 py-3 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#101713] text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 focus:border-[#123D32] dark:focus:border-[#28664D] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-2">
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
                            className={`flex items-start gap-3 p-3.5 rounded-[10px] border cursor-pointer transition ${
                              verifyMethod === m.id
                                ? "border-[#123D32] dark:border-[#28664D] bg-[#E5EBDD]/50 dark:bg-[#1D3428]/50"
                                : "border-[#DED7CA] dark:border-[#34443A] hover:bg-white dark:hover:bg-[#1E2B23]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="verifyMethod"
                              checked={verifyMethod === m.id}
                              onChange={() => {}}
                              className="mt-1 text-[#123D32] focus:ring-[#123D32]"
                            />
                            <div>
                              <p className="text-xs font-bold text-[#10251C] dark:text-[#F3F1E8]">{m.label}</p>
                              <p className="text-[11px] text-[#696B64] dark:text-[#B8C2B8] leading-snug">{m.desc}</p>
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
                      className="w-full bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] disabled:opacity-40 text-white font-bold text-xs py-3.5 rounded-[8px] flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
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
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-1.5">
                            Institutional Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            disabled={studentRequiresOtp}
                            value={eduEmail}
                            onChange={(e) => setEduEmail(e.target.value)}
                            placeholder="e.g. yourname@university.edu or .ac.in"
                            className="w-full px-4 py-3 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#101713] text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 focus:border-[#123D32] dark:focus:border-[#28664D] outline-none disabled:opacity-60"
                          />
                          <p className="text-[10px] text-[#696B64] dark:text-[#B8C2B8] mt-1">
                            Must be an accredited institutional email (.edu, .ac.in, .edu.in, .ac.uk, etc.)
                          </p>
                        </div>

                        {studentRequiresOtp && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-[10px] space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#123D32] dark:text-emerald-300 block">
                              Enter 6-Digit Email Code *
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              placeholder="· · · · · ·"
                              value={studentOtp}
                              onChange={(e) => setStudentOtp(e.target.value.replace(/\D/g, ""))}
                              className="w-full px-4 py-3 text-center text-xl tracking-[0.4em] font-mono font-bold rounded-[8px] border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-[#101713] text-[#10251C] dark:text-[#F3F1E8] outline-none"
                              autoFocus
                              required
                            />
                            <div className="flex items-center justify-between text-xs pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setStudentRequiresOtp(false);
                                  setStudentOtp("");
                                }}
                                className="text-zinc-500 hover:underline cursor-pointer"
                              >
                                Edit Email
                              </button>
                              <button
                                type="button"
                                disabled={studentResendCooldown > 0}
                                onClick={handleVerifyStudent}
                                className="text-[#046A38] dark:text-emerald-400 font-bold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                              >
                                {studentResendCooldown > 0 ? `Resend in ${studentResendCooldown}s` : "Resend Code"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : verifyMethod === "student_id" ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-1">
                            {t("student.studentName", "Student Full Name")} *
                          </label>
                          <input
                            type="text"
                            required
                            value={studentFullName}
                            onChange={(e) => setStudentFullName(e.target.value)}
                            placeholder="Full name as printed on ID"
                            className="w-full px-4 py-2.5 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#101713] text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 focus:border-[#123D32] dark:focus:border-[#28664D] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-1">
                            {t("student.idNumber", "Student ID / Roll Number")} *
                          </label>
                          <input
                            type="text"
                            required
                            value={studentIdNumber}
                            onChange={(e) => setStudentIdNumber(e.target.value)}
                            placeholder="e.g. 2024CS1092"
                            className="w-full px-4 py-2.5 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#101713] text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 focus:border-[#123D32] dark:focus:border-[#28664D] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-1">
                            {t("student.academicYear", "Current Academic Year")}
                          </label>
                          <input
                            type="text"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#101713] text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] focus:border-[#123D32] dark:focus:border-[#28664D] outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-1">
                            {t("student.studentName", "Student Full Name")} *
                          </label>
                          <input
                            type="text"
                            required
                            value={studentFullName}
                            onChange={(e) => setStudentFullName(e.target.value)}
                            placeholder="Full name as per official records"
                            className="w-full px-4 py-2.5 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#101713] text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#B8C2B8]/40 focus:border-[#123D32] dark:focus:border-[#28664D] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-1">
                            Document Type
                          </label>
                          <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#101713] text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] focus:border-[#123D32] dark:focus:border-[#28664D] outline-none"
                          >
                            <option value="Bonafide Certificate" className="dark:bg-[#101713]">Bonafide Certificate</option>
                            <option value="Admission Letter" className="dark:bg-[#101713]">Admission / Enrollment Letter</option>
                            <option value="Current Academic Status" className="dark:bg-[#101713]">Current Academic Status Letter</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#696B64] dark:text-[#B8C2B8] block mb-1">
                            Academic Year
                          </label>
                          <input
                            type="text"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] bg-white dark:bg-[#101713] text-sm font-semibold text-[#10251C] dark:text-[#F3F1E8] focus:border-[#123D32] dark:focus:border-[#28664D] outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-white/70 dark:bg-[#1E2B23]/70 border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] text-[10px] text-[#696B64] dark:text-[#B8C2B8] leading-snug">
                      🔒 <b>DPDP Act Privacy Notice:</b> Your academic data is collected solely to authenticate student discount eligibility and will not be shared with advertisers or third parties.
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setStudentStep(1)}
                        className="px-4 py-3 rounded-[8px] border border-[#DED7CA] dark:border-[#34443A] text-[#10251C] dark:text-[#F3F1E8] text-xs font-bold bg-white dark:bg-[#1E2B23] hover:bg-[#FAF7F0] dark:hover:bg-[#202B24] transition cursor-pointer"
                      >
                        {t("common.back", "Back")}
                      </button>
                      <button
                        type="submit"
                        disabled={submittingStudent}
                        className="flex-1 bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] disabled:opacity-50 text-white font-bold text-xs py-3 rounded-[8px] flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        {submittingStudent ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            {studentRequiresOtp ? "Verifying..." : "Sending..."}
                          </>
                        ) : verifyMethod === "institutional_email" ? (
                          studentRequiresOtp ? "Verify & Activate" : "Send Verification Code"
                        ) : (
                          "Submit for Review"
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: SUCCESS STATE */}
                {studentStep === 3 && (
                  <div className="text-center py-4 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 size={36} />
                    </div>

                    <div>
                      <h4 className="text-base font-bold font-serif text-[#10251C] dark:text-[#F3F1E8]">
                        {verifiedResult?.status === "pending"
                          ? "Application Submitted for Review ⏳"
                          : t("student.verified", "Student Status VERIFIED ✓")}
                      </h4>
                      <p className="text-xs text-[#696B64] dark:text-[#B8C2B8] mt-1">
                        {verifiedResult?.status === "pending"
                          ? "Our administrative team will review your student credentials within 24–48 hours."
                          : "10% discount (up to ₹50 per eligible ride) is now active for 12 months!"}
                      </p>
                    </div>

                    <div className="p-4 bg-[#E5EBDD] dark:bg-[#1D3428] border border-[#DED7CA] dark:border-[#34443A] rounded-[12px] text-left space-y-1.5 text-xs text-[#123D32] dark:text-[#A3E635]">
                      <div className="flex justify-between">
                        <span className="text-[#123D32]/80 dark:text-[#B8C2B8]">Institution:</span>
                        <span className="font-bold">{institutionName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#123D32]/80 dark:text-[#B8C2B8]">Annual Validity:</span>
                        <span className="font-bold">12 Months (365 Days)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#123D32]/80 dark:text-[#B8C2B8]">Max Discount:</span>
                        <span className="font-bold">₹50 per ride</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowStudentModal(false);
                        setStudentStep(1);
                      }}
                      className="w-full bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] text-white text-xs font-bold py-3.5 rounded-[8px] shadow-xs transition cursor-pointer"
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
