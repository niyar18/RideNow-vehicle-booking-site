"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Landmark,
  CreditCard,
  BadgeCheck,
  Pencil,
  Phone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

/* ================= VALIDATION ================= */

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function PartnerBankPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upi, setUpi] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  const [completed, setCompleted] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= FETCH EXISTING BANK ================= */

  useEffect(() => {
    axios
      .get("/api/partner/bank")
      .then((res) => {
        if (res.data?.bank) {
          const bank = res.data.bank;
          setName(bank.accountHolderName || "");
          setIfsc(bank.ifsc || "");
          setAccount(bank.accountNumber || "" )
          setUpi(bank.upi || "");
          setMobileNumber(bank.mobileNumber || "");
          setCompleted(true);
        }
      })
      .catch(() => {});
  }, []);

  /* ================= VALIDATION ================= */

  const sanitizedIfsc = ifsc.trim().toUpperCase();

  const isNameValid = name.trim().length >= 3;
  const isAccountValid = account.trim().length >= 9;
  const isIfscValid =
    sanitizedIfsc.length === 11 &&
    IFSC_REGEX.test(sanitizedIfsc);
  const isMobileValid = mobileNumber.trim().length === 10;

  const canSubmit =
    isNameValid && isAccountValid && isIfscValid && isMobileValid;

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (completed && !editMode) {
      router.push("/");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await axios.post("/api/partner/bank", {
        name: name.trim(),
        account,
        ifsc: sanitizedIfsc,
        upi: upi.trim() || undefined,
        mobileNumber: mobileNumber.trim(),
      });

      router.push("/");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to save bank details"
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
        className="w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-[0_25px_70px_rgba(0,0,0,0.15)] p-6 sm:p-8"
      >
        {/* ================= HEADER ================= */}
        <div className="relative text-center">
          <button
            onClick={() => router.back()}
            className="absolute left-0 top-0 w-9 h-9 rounded-full border flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <p className="text-xs text-gray-500 font-medium">
            Step 3 of 3
          </p>

          <h1 className="text-2xl font-bold mt-1">
            Bank & Payout Setup
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Used for vendor payouts
          </p>

          {completed && !editMode && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <CheckCircle size={16} />
                Bank details added
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditMode(true)}
                className="text-xs font-semibold underline flex items-center gap-1"
              >
                <Pencil size={12} />
                Edit details
              </motion.button>
            </div>
          )}
        </div>

        {/* ================= FORM ================= */}
        <div
          className={`mt-8 space-y-6 ${
            completed && !editMode
              ? "opacity-50 pointer-events-none"
              : ""
          }`}
        >
          <InputField
            label="Account holder name"
            placeholder="As per bank records"
            icon={<BadgeCheck size={16} />}
            value={name}
            onChange={setName}
            error={!isNameValid && name.length > 0}
            errorText="Minimum 3 characters required"
          />

          <InputField
            label="Bank account number"
            placeholder="Enter account number"
            icon={<CreditCard size={16} />}
            value={account}
            onChange={(v) =>
              setAccount(v.replace(/\D/g, ""))
            }
            error={!isAccountValid && account.length > 0}
            errorText="Account number must be at least 9 digits"
          />

          <InputField
            label="IFSC code"
            placeholder="HDFC0001234"
            icon={<Landmark size={16} />}
            value={ifsc}
            onChange={(v) =>
              setIfsc(v.replace(/\s/g, "").toUpperCase())
            }
            maxLength={11}
            error={ifsc.length === 11 && !isIfscValid}
            errorText="Invalid IFSC code"
          />

          <InputField
            label="Mobile number"
            placeholder="10 digit mobile number"
            icon={<Phone size={16} />}
            value={mobileNumber}
            onChange={(v) => setMobileNumber(v.replace(/\D/g, "").slice(0, 10))}
            maxLength={10}
            error={mobileNumber.length === 10 && !isMobileValid}
            errorText="Enter a valid 10-digit mobile number"
          />

          <InputField
            label="UPI ID (optional)"
            placeholder="name@upi"
            value={upi}
            onChange={setUpi}
            optional
          />
        </div>

        {/* ================= WHY DISABLED ================= */}
        {!canSubmit && editMode && (
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p className="font-semibold">
              Complete the following to continue:
            </p>
            {!isNameValid && <p>• Valid account holder name</p>}
            {!isAccountValid && <p>• Valid bank account number</p>}
            {!isIfscValid && <p>• Correct IFSC code</p>}
            {!isMobileValid && <p>• Valid 10-digit mobile number</p>}
          </div>
        )}

        {/* ================= INFO ================= */}
        <div className="mt-6 flex items-start gap-3 text-xs text-gray-500">
          <CheckCircle size={16} className="mt-0.5" />
          <p>
            Bank details are verified before first payout.
            This usually takes 24–48 hours.
          </p>
        </div>

        {/* ================= ERROR ================= */}
        {error && (
          <p className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}

        {/* ================= CTA ================= */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={!canSubmit || loading}
          onClick={handleSubmit}
          className="mt-8 w-full h-14 rounded-2xl bg-black text-white font-semibold disabled:opacity-40 transition"
        >
          {completed && !editMode
            ? "Continue"
            : loading
            ? "Saving..."
            : "Save & Continue"}
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ================= INPUT ================= */

function InputField({
  label,
  placeholder,
  value,
  onChange,
  icon,
  optional,
  maxLength,
  error,
  errorText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  optional?: boolean;
  maxLength?: number;
  error?: boolean;
  errorText?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500">
        {label}{" "}
        {optional && (
          <span className="text-gray-400 font-normal">
            (optional)
          </span>
        )}
      </label>

      <div className="flex items-center gap-2 mt-2">
        {icon && <div className="text-gray-400">{icon}</div>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`flex-1 border-b pb-2 text-sm focus:outline-none ${
            error
              ? "border-red-400 focus:border-red-500"
              : "border-gray-300 focus:border-black"
          }`}
        />
      </div>

      {error && errorText && (
        <p className="mt-1 text-xs text-red-500">
          {errorText}
        </p>
      )}
    </div>
  );
}