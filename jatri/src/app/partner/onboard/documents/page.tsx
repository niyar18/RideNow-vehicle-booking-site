"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  FileCheck,
  CheckCircle,
  Pencil,
  ShieldCheck,
  AlertCircle,
  Car,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

/* ================= TYPES ================= */

type DocKey = "aadhaar" | "license" | "rc" | "insurance" | "puc" | "fitness";

/* ================= PAGE ================= */

export default function PartnerDocumentsPage() {
  const router = useRouter();

  const [docs, setDocs] = useState<Record<DocKey, File | null>>({
    aadhaar: null,
    license: null,
    rc: null,
    insurance: null,
    puc: null,
    fitness: null,
  });

  const [metadata, setMetadata] = useState({
    licenseNumber: "",
    rcNumber: "",
    insurancePolicyNumber: "",
    insuranceExpiry: "",
  });

  const [completed, setCompleted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [existingSummary, setExistingSummary] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH EXISTING DOCS ================= */

  useEffect(() => {
    axios
      .get("/api/partner/documents")
      .then((res) => {
        if (res.data?.documents) {
          setCompleted(true);
          setExistingSummary(res.data.documents);
          if (res.data.documents.licenseNumber) {
            setMetadata((prev) => ({
              ...prev,
              licenseNumber: res.data.documents.licenseNumber || "",
              rcNumber: res.data.documents.rcNumber || "",
              insurancePolicyNumber: res.data.documents.insurancePolicyNumber || "",
              insuranceExpiry: res.data.documents.insuranceExpiry
                ? new Date(res.data.documents.insuranceExpiry).toISOString().split("T")[0]
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
  };

  /* ================= SUBMIT ================= */

  const submitDocuments = async () => {
    if (completed && !editMode) {
      router.push("/partner/onboard/bank");
      return;
    }

    // Required files: DL, Identity, RC, Insurance
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
    <div className="min-h-screen bg-gray-50/50 sm:bg-white flex flex-col justify-center px-3 sm:px-4 py-6 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl mx-auto bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.06)] sm:shadow-[0_25px_70px_rgba(0,0,0,0.15)] p-5 sm:p-8"
      >
        {/* ================= HEADER ================= */}
        <div className="relative text-center">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="absolute left-0 top-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition active:scale-95"
          >
            <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          <p className="text-[11px] sm:text-xs text-gray-500 font-semibold tracking-wide uppercase">
            Step 2 of 3 • Compliance Verification
          </p>

          <h1 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight text-gray-900">
            Driver &amp; Vehicle Verification
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Mandatory documents required under Motor Vehicle Aggregator Guidelines, 2025
          </p>

          {completed && !editMode && (
            <div className="mt-3 sm:mt-4 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5 text-green-600 text-xs sm:text-sm font-semibold bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <CheckCircle size={15} />
                Compliance Documents Submitted
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditMode(true)}
                className="text-xs font-semibold text-black underline flex items-center gap-1 py-1"
              >
                <Pencil size={12} />
                Update / Replace Documents
              </motion.button>
            </div>
          )}
        </div>

        {/* ================= SECTION 1: DRIVER IDENTITY ================= */}
        <div className={`mt-6 sm:mt-8 space-y-4 ${completed && !editMode ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <UserCheck size={16} className="text-orange-600" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
              1. Driver Identity Verification
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DocUpload
              label="Driving Licence (DL) *"
              desc="Valid driver licence"
              file={docs.license}
              existing={existingSummary?.licenseUrl}
              onChange={(f) => handleFileChange("license", f)}
            />

            <DocUpload
              label="Aadhaar / PAN Card *"
              desc="Government identity proof"
              file={docs.aadhaar}
              existing={existingSummary?.aadhaarUrl}
              onChange={(f) => handleFileChange("aadhaar", f)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
              Driving Licence Number
            </label>
            <input
              type="text"
              placeholder="e.g. AS01 20210012345"
              value={metadata.licenseNumber}
              onChange={(e) => setMetadata({ ...metadata, licenseNumber: e.target.value.toUpperCase() })}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-black uppercase font-mono"
            />
          </div>

          {/* ================= SECTION 2: VEHICLE COMPLIANCE ================= */}
          <div className="flex items-center gap-2 pt-3 pb-1 border-b border-gray-100">
            <Car size={16} className="text-orange-600" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
              2. Vehicle Statutory Compliance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DocUpload
              label="Registration Certificate (RC) *"
              desc="Vehicle RC (Front & Back)"
              file={docs.rc}
              existing={existingSummary?.rcUrl}
              onChange={(f) => handleFileChange("rc", f)}
            />

            <DocUpload
              label="Commercial Insurance *"
              desc="Active Insurance Policy"
              file={docs.insurance}
              existing={existingSummary?.insuranceUrl}
              onChange={(f) => handleFileChange("insurance", f)}
            />

            <DocUpload
              label="PUC Certificate"
              desc="Pollution Under Control"
              file={docs.puc}
              existing={existingSummary?.pucUrl}
              onChange={(f) => handleFileChange("puc", f)}
            />

            <DocUpload
              label="Fitness / Permit"
              desc="Commercial Fitness or Permit"
              file={docs.fitness}
              existing={existingSummary?.fitnessUrl}
              onChange={(f) => handleFileChange("fitness", f)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                Vehicle Registration Number (RC)
              </label>
              <input
                type="text"
                placeholder="e.g. AS01AB1234"
                value={metadata.rcNumber}
                onChange={(e) => setMetadata({ ...metadata, rcNumber: e.target.value.toUpperCase() })}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-black uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                Insurance Expiry Date
              </label>
              <input
                type="date"
                value={metadata.insuranceExpiry}
                onChange={(e) => setMetadata({ ...metadata, insuranceExpiry: e.target.value })}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* DPDP 2025 INFO */}
        <div className="mt-5 flex items-start gap-2.5 text-xs text-gray-500 bg-orange-50/50 p-3.5 rounded-xl border border-orange-100">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-orange-600" />
          <p className="leading-relaxed">
            <strong className="text-gray-900 font-semibold">DPDP Rules 2025 Compliance:</strong> Driver and vehicle documents are encrypted (AES-256) and used strictly for identity and safety verification. Raw Aadhaar numbers are never stored.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <AlertCircle size={15} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          onClick={submitDocuments}
          className="mt-6 sm:mt-8 w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-black text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-40 transition shadow-lg active:scale-98"
        >
          {completed && !editMode
            ? "Continue to Bank Verification"
            : editMode
            ? "Save & Continue"
            : loading
            ? "Uploading & Encrypting..."
            : "Save & Continue"}
          <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ================= DOC UPLOAD COMPONENT ================= */

function DocUpload({
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
    <label className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-gray-200 cursor-pointer hover:border-black active:scale-[0.99] transition bg-white shadow-sm">
      <div className="min-w-0 pr-2">
        <p className="text-xs sm:text-sm font-semibold truncate text-gray-900">
          {label}
        </p>
        <p className="text-[11px] text-gray-500 truncate">
          {file ? file.name : existing ? "Already uploaded" : desc}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {file ? (
          <span className="text-[10px] sm:text-[11px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            Selected
          </span>
        ) : existing ? (
          <span className="text-[10px] sm:text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Uploaded
          </span>
        ) : (
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
            Upload
          </span>
        )}

        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black text-white flex items-center justify-center shadow-sm">
          <UploadCloud size={14} className="sm:w-[16px] sm:h-[16px]" />
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
