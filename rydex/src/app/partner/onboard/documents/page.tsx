"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  FileCheck,
  CheckCircle,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

/* ================= TYPES ================= */

type DocKey = "aadhaar" | "license" | "rc";

/* ================= PAGE ================= */

export default function PartnerDocumentsPage() {
  const router = useRouter();

  const [docs, setDocs] = useState<Record<DocKey, File | null>>({
    aadhaar: null,
    license: null,
    rc: null,
  });

  const [completed, setCompleted] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH EXISTING DOCS ================= */

  useEffect(() => {
    axios
      .get("/api/partner/documents")
      .then((res) => {
        if (res.data?.documents) {
          setCompleted(true);
        }
      })
      .catch(() => {});
  }, []);

  const canContinue =
    completed && !editMode
      ? true
      : docs.aadhaar && docs.license && docs.rc;

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

    if (!docs.aadhaar || !docs.license || !docs.rc) {
      setError("Please upload all required documents");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("aadhaar", docs.aadhaar);
      formData.append("license", docs.license);
      formData.append("rc", docs.rc);

      await axios.post("/api/partner/documents", formData);

      router.push("/partner/onboard/bank");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Document upload failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-[0_25px_70px_rgba(0,0,0,0.15)] p-6 sm:p-8"
      >
        {/* ================= HEADER ================= */}
        <div className="relative text-center">
          <button
            onClick={() => router.back()}
            className="absolute left-0 top-0 w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <p className="text-xs text-gray-500 font-medium">
            Step 2 of 3
          </p>

          <h1 className="text-2xl font-bold mt-1">
            Upload Documents
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Required for verification
          </p>

          {completed && !editMode && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <CheckCircle size={16} />
                Uploaded successfully
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditMode(true)}
                className="text-xs font-semibold text-black underline flex items-center gap-1"
              >
                <Pencil size={12} />
                Edit documents
              </motion.button>
            </div>
          )}
        </div>

        {/* ================= DOCUMENT LIST ================= */}
        <div
          className={`mt-8 space-y-5 ${
            completed && !editMode
              ? "opacity-50 pointer-events-none"
              : ""
          }`}
        >
          <DocUpload
            label="Aadhaar / ID Proof"
            desc="Government issued ID"
            file={docs.aadhaar}
            onChange={(f) =>
              handleFileChange("aadhaar", f)
            }
          />

          <DocUpload
            label="Driving License"
            desc="Valid driving license"
            file={docs.license}
            onChange={(f) =>
              handleFileChange("license", f)
            }
          />

          <DocUpload
            label="Vehicle RC"
            desc="Registration Certificate"
            file={docs.rc}
            onChange={(f) => handleFileChange("rc", f)}
          />
        </div>

        {/* INFO */}
        <div className="mt-6 flex items-start gap-3 text-xs text-gray-500">
          <FileCheck size={16} className="mt-0.5" />
          <p>
            Documents are securely stored and manually verified
            by our team.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <p className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={loading}
          onClick={submitDocuments}
          className="mt-8 w-full h-14 rounded-2xl bg-black text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition"
        >
          {completed && !editMode
            ? "Continue"
            : editMode
            ? "Save & Continue"
            : loading
            ? "Uploading..."
            : "Continue"}
          <ArrowRight size={18} />
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ================= DOC UPLOAD ================= */

function DocUpload({
  label,
  desc,
  file,
  onChange,
}: {
  label: string;
  desc: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <motion.label
      whileHover={{ scale: 1.02 }}
      className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 cursor-pointer hover:border-black transition"
    >
      <div>
        <p className="text-sm font-semibold">
          {label}
        </p>
        <p className="text-xs text-gray-500">
          {desc}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {file ? (
          <span className="text-xs text-green-600 font-medium">
            Selected
          </span>
        ) : (
          <span className="text-xs text-gray-400">
            Upload
          </span>
        )}

        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
          <UploadCloud size={18} />
        </div>
      </div>

      <input
        type="file"
        accept="image/*,.pdf"
        hidden
        onChange={(e) =>
          onChange(e.target.files?.[0] || null)
        }
      />
    </motion.label>
  );
}
