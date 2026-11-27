"use client";

import { Banknote, Check, CreditCard, Wallet } from "lucide-react";

export type PaymentMethodType = "cash" | "wallet" | "online" | "razorpay";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType | null;
  onSelect: (method: Exclude<PaymentMethodType, "razorpay">) => void;
  walletBalance: number | null;
  fare: number;
  useWallet?: boolean;
  onToggleWallet?: (use: boolean) => void;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  walletBalance,
  fare,
  useWallet = false,
  onToggleWallet,
}: PaymentMethodSelectorProps) {
  const hasBalance = walletBalance !== null && walletBalance > 0;
  const isWalletSufficient = walletBalance !== null && walletBalance >= fare;
  const walletDeduction = useWallet && hasBalance ? Math.min(walletBalance, fare) : 0;
  const remaining = Math.max(0, fare - walletDeduction);
  const methods = [
    {
      id: "wallet",
      icon: Wallet,
      title: "Jaatri Cash",
      hint: walletBalance === null
        ? "Checking balance…"
        : isWalletSufficient
          ? `Balance: ₹${walletBalance}`
          : hasBalance
            ? `Balance: ₹${walletBalance}. Use it with another method.`
            : `Needs ₹${fare}`,
      pressed: selectedMethod === "wallet" || (useWallet && remaining === 0),
      disabled: !isWalletSufficient,
    },
    {
      id: "cash",
      icon: Banknote,
      title: walletDeduction > 0 && remaining > 0 ? `₹${remaining} cash` : "Cash to driver",
      hint: walletDeduction > 0 && remaining > 0 ? `Includes ₹${walletDeduction} from Jaatri Cash` : "Pay after your trip",
      pressed: selectedMethod === "cash",
      disabled: false,
    },
    {
      id: "online",
      icon: CreditCard,
      title: walletDeduction > 0 && remaining > 0 ? `₹${remaining} online` : "Online payment",
      hint: "UPI, card or net banking with Razorpay",
      pressed: selectedMethod === "online" || selectedMethod === "razorpay",
      disabled: false,
    },
  ] as const;

  return (
    <fieldset className="m-0 min-w-0 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-3 sm:p-4">
      <legend className="px-1 text-base font-semibold">Payment method</legend>
      {hasBalance && onToggleWallet && (
        <label className="mb-2 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-subtle)] px-3 py-2">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Use Jaatri Cash</span>
            <span className="block text-xs text-[var(--text-secondary)]">
              {useWallet ? `Applied ₹${walletDeduction} · ₹${remaining} remaining` : `₹${walletBalance} balance available`}
            </span>
          </span>
          <input type="checkbox" checked={useWallet} onChange={(event) => onToggleWallet(event.currentTarget.checked)} className="size-5 shrink-0 accent-[var(--brand-primary)]" />
        </label>
      )}
      <div className="grid gap-1.5">
        {methods.map(({ id, icon: Icon, title, hint, pressed, disabled }) => (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => {
              if (id === "wallet") onToggleWallet?.(true);
              onSelect(id);
            }}
            className="flex min-h-14 items-center gap-2.5 rounded-[8px] border border-[var(--border-default)] px-2.5 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] aria-pressed:border-[var(--text-primary)] aria-pressed:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[var(--surface)]">
              <Icon size={19} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-[var(--text-secondary)]">{hint}</span>
            </span>
            {pressed && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[var(--text-primary)] bg-[var(--accent-mint)] text-[#142238]">
                <Check size={13} aria-hidden="true" strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
