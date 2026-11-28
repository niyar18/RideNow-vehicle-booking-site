"use client";

import { PartnerSetupFrame, PartnerSetupTitle } from "@/features/partner/components/PartnerWorkspace";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Landmark,
  CreditCard,
  BadgeCheck,
  Pencil,
  Phone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
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
          setAccount(bank.accountNumber || "");
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
      router.push("/partners/dashboard");
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

      router.push("/partners/dashboard");
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
    <PartnerSetupFrame>
      <header className="mb-6 border-b border-[var(--border-default)] pb-5">
        <PartnerSetupTitle
          step={3}
          title="Set up your payouts"
          description="Enter the bank account details you want Jaatri to use for your ride earnings."
          onBack={() => router.back()}
        />

          {completed && !editMode && (
            <div className="mt-4 p-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] flex items-center justify-between ">
              <div className="flex items-center gap-2 text-[var(--text-primary)] text-xs font-semibold">
                <CheckCircle size={15} className="text-[var(--accent-ink)]" />
                <span>Bank account details recorded</span>
              </div>

              <button
                onClick={() => setEditMode(true)}
                className="text-xs tabular-nums font-bold text-[var(--accent-ink)] underline flex items-center gap-1 hover:text-[#0d192b] dark:hover:text-[#263b56] cursor-pointer"
              >
                <Pencil size={12} />
                Edit Account
              </button>
            </div>
          )}
      </header>

        {/* ================= FORM ================= */}
        <div
          className={`space-y-4 ${
            completed && !editMode ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <InputFieldMinimal
            label="Account Holder Name *"
            placeholder="Name exactly as printed on bank account"
            icon={<BadgeCheck size={16} />}
            value={name}
            onChange={setName}
            error={!isNameValid && name.length > 0}
            errorText="Minimum 3 characters required"
          />

          <InputFieldMinimal
            label="Bank Account Number *"
            placeholder="e.g. 012345678901"
            icon={<CreditCard size={16} />}
            value={account}
            onChange={(v) =>
              setAccount(v.replace(/\D/g, ""))
            }
            error={!isAccountValid && account.length > 0}
            errorText="Bank account number must be at least 9 numeric digits"
          />

          <InputFieldMinimal
            label="IFSC Code *"
            placeholder="e.g. HDFC0001234"
            icon={<Landmark size={16} />}
            value={ifsc}
            onChange={(v) =>
              setIfsc(v.replace(/\s/g, "").toUpperCase())
            }
            maxLength={11}
            error={ifsc.length === 11 && !isIfscValid}
            errorText="Invalid IFSC format (4 alphabetic characters + 0 + 6 alphanumeric digits)"
          />

          <InputFieldMinimal
            label="Bank Registered Mobile Number *"
            placeholder="10-digit registered number"
            icon={<Phone size={16} />}
            value={mobileNumber}
            onChange={(v) => setMobileNumber(v.replace(/\D/g, "").slice(0, 10))}
            maxLength={10}
            error={mobileNumber.length === 10 && !isMobileValid}
            errorText="Enter a valid 10-digit mobile number"
          />

          <InputFieldMinimal
            label="Direct UPI ID (Optional)"
            placeholder="driver@okaxis / driver@paytm"
            value={upi}
            onChange={setUpi}
            optional
          />
        </div>

        {/* ================= WHY DISABLED ================= */}
        {!canSubmit && editMode && (
          <div className="mt-4 text-xs tabular-nums text-[var(--text-primary)] bg-[var(--surface-raised)] p-3 rounded-[8px] border border-[var(--border-default)] space-y-1">
            <p className="font-bold text-[#992f22] dark:text-[#ffab9c]">
              Required Fields Missing:
            </p>
            {!isNameValid && <p>• Valid account holder name</p>}
            {!isAccountValid && <p>• Valid numeric bank account number</p>}
            {!isIfscValid && <p>• Standard 11-character IFSC code</p>}
            {!isMobileValid && <p>• 10-digit verified mobile number</p>}
          </div>
        )}

        {/* ================= INFO ================= */}
        <div className="mt-5 flex items-start gap-2.5 text-xs text-[var(--text-secondary)] bg-[var(--surface-raised)] p-3.5 rounded-[8px] border border-[var(--border-default)] ">
          <CheckCircle size={15} className="mt-0.5 shrink-0 text-[var(--accent-ink)]" />
          <p className="leading-relaxed">
            Direct IMPS/NEFT bank settlement verifies automatically upon first completed dispatch ride. Zero commission deductions on partner payout.
          </p>
        </div>

        {/* ================= ERROR ================= */}
        {error && (
          <div className="mt-4 p-3 rounded-[8px] bg-[#992f22]/10 dark:bg-red-950/30 border border-[#992f22] dark:border-red-900/50 text-xs text-[#992f22] dark:text-[#ffab9c] tabular-nums">
            {error}
          </div>
        )}

        {/* ================= CTA ================= */}
        <motion.button
          whileTap={{ scale: 0.99 }}
          disabled={!canSubmit || loading}
          onClick={handleSubmit}
          className="mt-8 w-full h-12 sm:h-13 rounded-[8px] bg-[var(--action-bg)] hover:opacity-90 text-[var(--action-fg)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer "
        >
          <span>
            {completed && !editMode
              ? "Access Partner Dashboard"
              : loading
              ? "Validating Account..."
              : "Submit & Access Dashboard"}
          </span>
          <ArrowRight size={16} />
        </motion.button>
    </PartnerSetupFrame>
  );
}

/* ================= MINIMALIST INPUT FIELD ================= */

function InputFieldMinimal({
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
  const id = useId();
  const hasError = Boolean(error && errorText);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
        {optional && (
          <span className="text-[10px] tabular-nums text-[var(--text-secondary)]">
            Optional
          </span>
        )}
      </div>

      <div className="flex items-center rounded-[8px] border border-[var(--border-interactive)] bg-[var(--surface-raised)] focus-within:border-[var(--focus-ring)] transition-colors">
        {icon && (
          <div className="pl-3 pr-2 text-[var(--text-secondary)] shrink-0">
            {icon}
          </div>
        )}
        <input
          id={id}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full min-h-11 px-2.5 text-base bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] tabular-nums placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
        />
      </div>

      {error && errorText && (
        <p id={`${id}-error`} role="status" className="mt-1 text-xs text-[#992f22] dark:text-[#ffab9c]">
          {errorText}
        </p>
      )}
    </div>
  );
}