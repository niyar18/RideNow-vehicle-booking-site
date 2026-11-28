"use client";

import { PartnerSetupFrame, PartnerSetupTitle } from "@/features/partner/components/PartnerWorkspace";

import { motion } from "framer-motion";
import {
  ArrowRight,
  UploadCloud,
  CheckCircle,
  Pencil,
  ShieldCheck,
  AlertCircle,
  Car,
  UserCheck,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import axios from "axios";

/* ================= TYPES ================= */

type DocKey = "profilePicture" | "aadhaar" | "license" | "rc" | "insurance" | "puc" | "fitness";

/* ================= PAGE ================= */

export default function PartnerDocumentsPage() {
  const router = useRouter();
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<Record<DocKey, File | null>>({
    profilePicture: null,
    aadhaar: null,
    license: null,
    rc: null,
    insurance: null,
    puc: null,
    fitness: null,
  });

  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const [metadata, setMetadata] = useState({
    licenseNumber: "",
    rcNumber: "",
    insurancePolicyNumber: "",
    insuranceExpiry: "",
  });

  const [completed, setCompleted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [existingSummary, setExistingSummary] = useState<any>(null);
  const [applyForWomenSafety, setApplyForWomenSafety] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* DigiLocker Instant KYC State */
  const [digiLockerLoading, setDigiLockerLoading] = useState(false);
  const [digiLockerSuccess, setDigiLockerSuccess] = useState(false);
  const [aadhaarLast4Input, setAadhaarLast4Input] = useState("");

  const handleDigiLockerVerify = async () => {
    try {
      setDigiLockerLoading(true);
      setError(null);
      const res = await axios.post("/api/partner/documents/digilocker", {
        dlNumber: metadata.licenseNumber || undefined,
        aadhaarLast4: aadhaarLast4Input || "8821",
      });
      if (res.data?.success) {
        setDigiLockerSuccess(true);
        setExistingSummary((prev: any) => ({
          ...prev,
          isDigiLockerVerified: true,
          digiLockerDlRef: res.data.documents?.digiLockerDlRef,
          digiLockerAadhaarRef: res.data.documents?.digiLockerAadhaarRef,
          licenseNumber: res.data.documents?.licenseNumber,
          licenseStatus: "verified",
          panStatus: "verified",
        }));
        if (res.data.documents?.licenseNumber) {
          setMetadata((prev) => ({
            ...prev,
            licenseNumber: res.data.documents.licenseNumber,
          }));
        }
      } else {
        setError(res.data?.message || "DigiLocker verification failed.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "DigiLocker gateway connection error.");
    } finally {
      setDigiLockerLoading(false);
    }
  };

  /* ================= FETCH EXISTING DOCS ================= */

  useEffect(() => {
    axios
      .get("/api/partner/documents")
      .then((res) => {
        if (res.data?.documents || res.data?.profilePicture) {
          setCompleted(true);
          const docsData = res.data.documents || {};
          const profPic = res.data.profilePicture || docsData.profilePictureUrl;
          if (profPic) {
            setProfilePreview(profPic);
          }
          if (res.data?.safetyMatching?.driverCategory === "woman") {
            setApplyForWomenSafety(true);
          }
          setExistingSummary({
            ...docsData,
            profilePictureUrl: profPic,
          });

          if (docsData.licenseNumber) {
            setMetadata((prev) => ({
              ...prev,
              licenseNumber: docsData.licenseNumber || "",
              rcNumber: docsData.rcNumber || "",
              insurancePolicyNumber: docsData.insurancePolicyNumber || "",
              insuranceExpiry: docsData.insuranceExpiry
                ? new Date(docsData.insuranceExpiry).toISOString().split("T")[0]
                : "",
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (key: DocKey, file: File | null) => {
    if (!file) return;
    setDocs((prev) => ({ ...prev, [key]: file }));
    if (key === "profilePicture") {
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  /* ================= SUBMIT ================= */

  const submitDocuments = async () => {
    if (completed && !editMode) {
      router.push("/partner/onboard/bank");
      return;
    }

    // Mandatory Profile Picture Check
    const hasProfilePic = Boolean(docs.profilePicture || existingSummary?.profilePictureUrl);
    if (!hasProfilePic) {
      setError("Mandatory driver profile picture is required. Please upload a clear photo of yourself.");
      return;
    }

    // Required files: DL, RC, Insurance
    if (!docs.license || !docs.rc || !docs.insurance) {
      if (!existingSummary?.licenseUrl || !existingSummary?.rcUrl || !existingSummary?.insuranceUrl) {
        setError("Please upload Driving License, Vehicle RC, and Vehicle Commercial Insurance.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (docs.profilePicture) formData.append("profilePicture", docs.profilePicture);
      if (docs.aadhaar) formData.append("aadhaar", docs.aadhaar);
      if (docs.license) formData.append("license", docs.license);
      if (docs.rc) formData.append("rc", docs.rc);
      if (docs.insurance) formData.append("insurance", docs.insurance);
      if (docs.puc) formData.append("puc", docs.puc);
      if (docs.fitness) formData.append("fitness", docs.fitness);

      if (metadata.licenseNumber) formData.append("licenseNumber", metadata.licenseNumber);
      if (metadata.rcNumber) formData.append("rcNumber", metadata.rcNumber);
      if (metadata.insurancePolicyNumber) formData.append("insurancePolicyNumber", metadata.insurancePolicyNumber);
      if (metadata.insuranceExpiry) formData.append("insuranceExpiry", metadata.insuranceExpiry);
      if (applyForWomenSafety) formData.append("applyForWomenSafety", "true");

      await axios.post("/api/partner/documents", formData);

      router.push("/partner/onboard/bank");
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Document upload failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PartnerSetupFrame>
      <header className="mb-6 border-b border-[var(--border-default)] pb-5">
        <PartnerSetupTitle
          step={2}
          title="Verify your documents"
          description="Upload your profile photo and the driver and vehicle documents needed for verification."
          onBack={() => router.back()}
        />

          {completed && !editMode && (
            <div className="mt-4 p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] flex items-center justify-between ">
              <div className="flex items-center gap-2 text-[var(--text-primary)] text-xs font-semibold">
                <CheckCircle size={15} className="text-[var(--accent-ink)]" />
                <span>Verification documents on file</span>
              </div>

              <button
                onClick={() => setEditMode(true)}
                className="text-xs tabular-nums font-bold text-[var(--accent-ink)] underline flex items-center gap-1 hover:text-[#0d192b] dark:hover:text-[#263b56] cursor-pointer"
              >
                <Pencil size={12} />
                Update Documents
              </button>
            </div>
          )}
      </header>

        {/* ================= SECTION 0: MANDATORY PROFILE PICTURE ================= */}
        <div className={`mb-6 p-4 border border-[var(--border-default)] rounded-[12px] bg-[var(--surface-raised)]  ${completed && !editMode ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[var(--midnight)] dark:bg-[#263b56] text-white rounded-[4px] flex items-center justify-center tabular-nums text-[10px] font-bold">
                01
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight uppercase">
                Mandatory Driver Profile Photo *
              </h2>
            </div>
            <span className="text-[9px] tabular-nums font-bold px-2 py-0.5 rounded-[4px] bg-[var(--surface-subtle)] text-[var(--accent-ink)] border border-[var(--midnight)]/10 dark:border-[#263b56]/30">
              Strictly Required
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
            Must be a clear, front-facing photograph taken in good lighting. Sunglass or face-mask photos will be rejected during automatic validation.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* PHOTO PREVIEW BOX */}
            <div className="w-28 h-32 sm:w-32 sm:h-36 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] flex flex-col items-center justify-center relative overflow-hidden shrink-0 ">
              {profilePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePreview}
                  alt="Driver Profile Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[var(--text-secondary)] p-2 text-center">
                  <Camera size={26} className="mb-1 text-[var(--text-secondary)]" />
                  <span className="text-[10px] tabular-nums ">No Photo</span>
                </div>
              )}
            </div>

            {/* UPLOAD CONTROLS */}
            <div className="flex-1 w-full space-y-2">
              <input
                ref={profilePicInputRef}
                hidden aria-label="Upload profile photograph"
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => handleFileChange("profilePicture", e.target.files?.[0] || null)}
              />

              <button
                type="button"
                onClick={() => profilePicInputRef.current?.click()}
                className="w-full h-10 rounded-[8px] bg-[var(--action-bg)] hover:opacity-90 text-[var(--action-fg)] text-xs tabular-nums font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer "
              >
                <Camera size={14} />
                <span>{profilePreview ? "Change Profile Photo" : "Take / Upload Profile Photo"}</span>
              </button>

              <p className="text-[10px] tabular-nums text-[var(--text-secondary)]">
                Supports JPG, PNG or WEBP · Maximum 5MB · Clear headshot
              </p>

              {profilePreview && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--accent-ink)] font-semibold">
                  <CheckCircle size={13} className="text-[var(--accent-ink)]" />
                  <span>Photo selected and staged for encryption</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= DIGILOCKER INSTANT VERIFICATION CARD ================= */}
        <div className="mb-6 p-4 rounded-[12px] bg-[var(--surface-raised)] border border-[var(--border-default)] space-y-3 ">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">
                  DigiLocker National Identity Gateway
                </span>
                <span className="text-[9px] tabular-nums font-bold bg-[var(--surface-subtle)] text-[var(--accent-ink)] px-1.5 py-0.5 rounded-[4px]">
                  Fast Track
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Instant digital authentication for Aadhaar &amp; Driving Licence credentials.
              </p>
            </div>

            {(existingSummary?.isDigiLockerVerified || digiLockerSuccess) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--surface-subtle)] text-[var(--accent-ink)] text-[10px] tabular-nums font-bold rounded-[4px] shrink-0">
                <CheckCircle size={11} />
                Verified
              </span>
            )}
          </div>

          {existingSummary?.isDigiLockerVerified || digiLockerSuccess ? (
            <div className="p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] text-xs text-[var(--text-primary)] flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-[var(--text-primary)]">Govt DigiLocker Verified</p>
                <p className="text-[10px] text-[var(--text-secondary)] tabular-nums mt-0.5">
                  Ref: {existingSummary?.digiLockerDlRef || "DL-VERIFIED"} • {existingSummary?.digiLockerAadhaarRef || "AADHAAR-MKYC"}
                </p>
              </div>
              <span className="text-[10px] tabular-nums text-[var(--accent-ink)] font-bold uppercase">Verified</span>
            </div>
          ) : (
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Aadhaar Last 4 digits (e.g. 8821)"
                maxLength={4}
                value={aadhaarLast4Input}
                onChange={(e) => setAadhaarLast4Input(e.target.value.replace(/\D/g, ""))}
                className="min-h-11 px-3 text-sm rounded-[8px] border border-[var(--border-interactive)] bg-[var(--surface-raised)] text-[var(--text-primary)] tabular-nums placeholder:text-[#475a65] dark:placeholder:text-[#c9d8df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] focus:border-[var(--focus-ring)] sm:w-56"
              />
              <button
                type="button"
                disabled={digiLockerLoading}
                onClick={handleDigiLockerVerify}
                className="h-9 px-4 rounded-[8px] bg-[var(--action-bg)] hover:opacity-90 disabled:opacity-50 text-[var(--action-fg)] font-bold text-xs tabular-nums flex items-center justify-center gap-1.5 transition-colors cursor-pointer "
              >
                {digiLockerLoading ? "Verifying with Gateway..." : "Verify via DigiLocker"}
              </button>
            </div>
          )}
        </div>

        {/* ================= SECTION 1: DRIVER IDENTITY ================= */}
        <div className={`space-y-4 ${completed && !editMode ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-default)]">
            <div className="w-5 h-5 bg-[var(--midnight)] dark:bg-[#263b56] text-white rounded-[4px] flex items-center justify-center tabular-nums text-[10px] font-bold">
              02
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-sans">
              Driver Identification Proof
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DocUploadMinimal
              label="Driving Licence (DL) *"
              desc="Front & rear scan"
              file={docs.license}
              existing={existingSummary?.licenseUrl}
              onChange={(f) => handleFileChange("license", f)}
            />

            <DocUploadMinimal
              label="Aadhaar / Identity Proof *"
              desc="Government identity card"
              file={docs.aadhaar}
              existing={existingSummary?.aadhaarUrl}
              onChange={(f) => handleFileChange("aadhaar", f)}
            />
          </div>

          <div>
            <label htmlFor="driver-licence-number" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Driving Licence Number
            </label>
            <input
              id="driver-licence-number"
              type="text"
              placeholder="e.g. AS01 20210012345"
              value={metadata.licenseNumber}
              onChange={(e) => setMetadata({ ...metadata, licenseNumber: e.target.value.toUpperCase() })}
              className="w-full min-h-11 px-3 text-base rounded-[8px] border border-[var(--border-interactive)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] focus:border-[var(--focus-ring)] uppercase tabular-nums bg-[var(--surface-raised)] text-[var(--text-primary)]"
            />
          </div>

          {/* ================= SECTION 2: VEHICLE COMPLIANCE ================= */}
          <div className="flex items-center gap-2 pt-4 pb-2 border-b border-[var(--border-default)]">
            <div className="w-5 h-5 bg-[var(--midnight)] dark:bg-[#263b56] text-white rounded-[4px] flex items-center justify-center tabular-nums text-[10px] font-bold">
              03
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-sans">
              Vehicle documents
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DocUploadMinimal
              label="Registration Certificate (RC) *"
              desc="Vehicle RC document"
              file={docs.rc}
              existing={existingSummary?.rcUrl}
              onChange={(f) => handleFileChange("rc", f)}
            />

            <DocUploadMinimal
              label="Commercial Insurance *"
              desc="Active policy certificate"
              file={docs.insurance}
              existing={existingSummary?.insuranceUrl}
              onChange={(f) => handleFileChange("insurance", f)}
            />

            <DocUploadMinimal
              label="PUC Certificate"
              desc="Pollution under control"
              file={docs.puc}
              existing={existingSummary?.pucUrl}
              onChange={(f) => handleFileChange("puc", f)}
            />

            <DocUploadMinimal
              label="Fitness / Permit"
              desc="Commercial permit document"
              file={docs.fitness}
              existing={existingSummary?.fitnessUrl}
              onChange={(f) => handleFileChange("fitness", f)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="driver-document-registration" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                Vehicle Registration Number (RC)
              </label>
              <input
                id="driver-document-registration"
                type="text"
                placeholder="e.g. AS01AB1234"
                value={metadata.rcNumber}
                onChange={(e) => setMetadata({ ...metadata, rcNumber: e.target.value.toUpperCase() })}
                className="w-full min-h-11 px-3 text-base rounded-[8px] border border-[var(--border-interactive)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] focus:border-[var(--focus-ring)] uppercase tabular-nums bg-[var(--surface-raised)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label htmlFor="driver-insurance-expiry" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                Insurance Expiry Date
              </label>
              <input
                id="driver-insurance-expiry"
                type="date"
                value={metadata.insuranceExpiry}
                onChange={(e) => setMetadata({ ...metadata, insuranceExpiry: e.target.value })}
                className="w-full min-h-11 px-3 text-base rounded-[8px] border border-[var(--border-interactive)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] focus:border-[var(--focus-ring)] bg-[var(--surface-raised)] text-[var(--text-primary)] tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* ================= WOMEN'S SAFETY MATCHING PROGRAM ================= */}
        <div className="mt-6 p-4 rounded-[12px] border border-emerald-200 dark:border-[#263b56]/60 bg-emerald-50/60 dark:bg-[#203f41]/30">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyForWomenSafety}
              onChange={(e) => setApplyForWomenSafety(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="space-y-1">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-[var(--accent-mint)]" />
                Apply for Women&apos;s Safety Driver Matching (Female Drivers)
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Check this if you are a woman driver. Once verified by our safety team, you can receive requests from passengers who specifically prefer a woman driver, and you will have the option to receive only women-passenger requests.
              </p>
            </div>
          </label>
        </div>

        {/* DPDP 2025 INFO */}
        <div className="mt-6 flex items-start gap-2.5 text-xs text-[var(--text-secondary)] bg-[var(--surface-raised)] p-3.5 rounded-[8px] border border-[var(--border-default)] ">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent-ink)]" />
          <p className="leading-relaxed">
            <strong className="text-[var(--text-primary)] font-bold">DPDP Rules 2025 Compliance:</strong> All driver photographs and statutory credentials are encrypted (AES-256) and strictly maintained for safety dispatch verification.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div role="alert" className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-[#992f22] dark:text-[#ffab9c] bg-[#992f22]/10 dark:bg-red-950/30 p-3 rounded-[8px] border border-[#992f22] dark:border-red-900/50 tabular-nums">
            <AlertCircle size={15} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.99 }}
          disabled={loading}
          onClick={submitDocuments}
          className="mt-8 w-full h-12 sm:h-13 rounded-[8px] bg-[var(--action-bg)] hover:opacity-90 text-[var(--action-fg)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer "
        >
          <span>
            {completed && !editMode
              ? "Continue to Step 3: Bank Setup"
              : editMode
              ? "Save Documents & Continue"
              : loading
              ? "Encrypting & Storing Documents..."
              : "Save Documents & Continue"}
          </span>
          <ArrowRight size={16} />
        </motion.button>
    </PartnerSetupFrame>
  );
}

/* ================= MINIMALIST DOC UPLOAD COMPONENT ================= */

function DocUploadMinimal({
  label,
  desc,
  file,
  existing,
  onChange,
}: {
  label: string;
  desc: string;
  file: File | null;
  existing?: string;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3.5 rounded-[10px] border border-[var(--border-default)] cursor-pointer hover:border-[var(--midnight)]/50 dark:hover:border-[#263b56]/60 transition-colors bg-[var(--surface-raised)] ">
      <div className="min-w-0 pr-2">
        <p className="text-xs sm:text-sm font-bold truncate text-[var(--text-primary)]">
          {label}
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] truncate tabular-nums mt-0.5">
          {file ? file.name : existing ? "Document on file" : desc}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {file ? (
          <span className="text-[10px] text-[var(--accent-ink)] tabular-nums font-bold bg-[var(--surface-subtle)] px-2 py-0.5 rounded-[4px] border border-[var(--midnight)]/10 dark:border-[#263b56]/30">
            Selected
          </span>
        ) : existing ? (
          <span className="text-[10px] text-[var(--accent-ink)] tabular-nums font-bold bg-[var(--surface-subtle)] px-2 py-0.5 rounded-[4px] border border-[var(--midnight)]/10 dark:border-[#263b56]/30">
            Uploaded
          </span>
        ) : (
          <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
            Browse
          </span>
        )}

        <div className="w-7 h-7 rounded-[6px] bg-[var(--midnight)] dark:bg-[#263b56] text-white flex items-center justify-center">
          <UploadCloud size={14} />
        </div>
      </div>

      <input
        type="file"
        accept="image/*,.pdf"
        hidden
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </label>
  );
}
