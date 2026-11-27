import PolicyPage from "@/shared/components/public/PolicyPage";
import {
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function CancellationRefundPolicyPage() {
  return (
    <PolicyPage
      current="/cancellation-refund"
      label="Policies / Cancellations"
      title="Cancellation & Refund Policy"
      description={<>Clear guidelines on cancellation grace periods, driver cancellations, duplicate charge reversals, and instant wallet refunds.</>}
      metadata={<>
        <span><strong>Version:</strong> 1.2</span>
            <span><strong>Effective Date:</strong> 1 October 2026</span>
      </>}
    >
        {/* 1. Cancellation Windows */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Clock size={20} className="text-[var(--page-accent)]" /> 1. Customer Cancellation Rules
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-[10px] bg-[var(--page-moss)] dark:bg-[#1D3428] border border-[#cdd6c3] dark:border-[#24483D] text-[var(--page-accent)]">
              <div className="flex items-center gap-2 font-bold mb-1 text-[var(--page-accent)]">
                <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400" />
                <span>Free Cancellation Window</span>
              </div>
              <p className="text-[var(--page-accent)]/90 dark:text-[#B9C8BF] leading-relaxed">
                You can cancel your booking completely free of charge while the system is searching for a driver or within <strong>3 minutes</strong> of a driver accepting your request.
              </p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#faebe8] dark:bg-[#341814] border border-[#f0c8c1] text-[#782313] dark:text-[#E06A50]">
              <div className="flex items-center gap-2 font-bold mb-1 text-[#782313] dark:text-[#E06A50]">
                <XCircle size={16} className="text-[#E34222] dark:text-[#E06A50]" />
                <span>Late Cancellation Fee</span>
              </div>
              <p className="text-[#782313]/90 dark:text-[#B9C8BF] leading-relaxed">
                If cancelled after 3 minutes of acceptance, or after the driver has arrived at the pickup coordinate, a nominal compensation fee (₹25–₹50) is levied to compensate the driver partner for fuel and transit time.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Driver Cancellations & System Timeouts */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <RotateCcw size={20} className="text-[var(--page-accent)]" /> 2. Driver Cancellations & Auto Re-matching
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            If an assigned driver partner cancels your ride or fails to arrive within reasonable time:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <li><strong>Zero Penalty to Customer:</strong> You will never be charged a cancellation fee.</li>
            <li><strong>Auto Re-dispatch:</strong> Our system immediately searches the nearest online driver within 10km.</li>
            <li><strong>Full Automatic Refund:</strong> If you prepaid online or via wallet and choose not to wait, the entire fare is instantly credited back to your account.</li>
          </ul>
        </section>

        {/* 3. Refund Timelines & Wallet Settlement */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Wallet size={20} className="text-[var(--page-accent)]" /> 3. Refund Methods & Timelines
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[var(--text-primary)] uppercase font-bold tracking-wider">
                  <th className="py-2.5 pr-4">Original Payment Mode</th>
                  <th className="py-2.5 pr-4">Refund Destination</th>
                  <th className="py-2.5">Processing Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED7CA]/60 dark:divide-[#24483D] text-xs">
                <tr>
                  <td className="py-3 pr-4 font-bold text-[var(--text-primary)]">Jaatri Wallet Balance</td>
                  <td className="py-3 pr-4 text-[var(--text-secondary)]">Jaatri Wallet Balance</td>
                  <td className="py-3 font-bold text-emerald-700 dark:text-emerald-400">Instant (0 Seconds)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-[var(--text-primary)]">Online UPI / QR</td>
                  <td className="py-3 pr-4 text-[var(--text-secondary)]">Jaatri Wallet (default) or Bank</td>
                  <td className="py-3 text-[var(--text-secondary)]">Instant (Wallet) / 1–3 Business Days (Bank)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-[var(--text-primary)]">Credit / Debit Card</td>
                  <td className="py-3 pr-4 text-[var(--text-secondary)]">Issuing Bank Account</td>
                  <td className="py-3 text-[var(--text-secondary)]">3–7 Business Days (Bank Gateway TAT)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Disputed Fares & Duplicate Deductions */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <AlertCircle size={20} className="text-[var(--page-accent)]" /> 4. Duplicate Charges & Overcharge Disputes
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            In the rare event of a network glitch, bank gateway timeout, or route detour:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <li><strong>Duplicate Deductions:</strong> If money was debited twice for a single ride, the duplicate transaction is automatically detected and reversed within 24 hours.</li>
            <li><strong>Fare Review:</strong> If you believe you were overcharged due to driver route inefficiency, submit a ticket via our <Link href="/contact" className="text-[var(--page-accent)] font-bold underline">Support Portal</Link> or email <a href="mailto:support@ridenow.in" className="text-[var(--page-accent)] font-bold underline">support@ridenow.in</a> with your Booking ID. Our fare dispute team investigates GPS telemetry and issues adjustments.</li>
          </ul>
        </section>
    </PolicyPage>
  );
}
