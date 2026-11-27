import PolicyPage from "@/shared/components/public/PolicyPage";
import {
  CreditCard,
  Wallet,
  Building2,
  Percent,
  Receipt,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

export default function PaymentTermsPage() {
  return (
    <PolicyPage
      current="/payment-terms"
      label="Policies / Payments"
      title="Payment & Settlement Terms"
      description={<>Transparent breakdown of passenger payment processing, Jaatri closed-loop wallet, driver partner splits, commission deductions, and banking settlements.</>}
      metadata={<>
        <span><strong>Version:</strong> 1.0</span>
            <span><strong>Effective Date:</strong> 1 October 2026</span>
            <span><strong>Applicable Law:</strong> Payment and Settlement Systems Act, 2007 & CGST Act s.9(5)</span>
      </>}
    >
        {/* 1. Passenger Payment Methods */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <CreditCard size={20} className="text-[var(--page-accent)]" /> 1. Customer Payment Methods
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Jaatri supports multiple secure payment mechanisms for passenger convenience:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]/70 space-y-1.5">
              <strong className="text-[var(--text-primary)] text-sm block">Unified Payments Interface (UPI)</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Instant zero-touch payments using Google Pay, PhonePe, Paytm, BHIM, or any NPCI-registered UPI handle through certified RBI payment gateways.
              </p>
            </div>
            <div className="p-4 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]/70 space-y-1.5">
              <strong className="text-[var(--text-primary)] text-sm block">Debit & Credit Cards</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                All major Indian cards (RuPay, Visa, MasterCard) processed through PCI-DSS Level 1 compliant gateway with mandatory 2-factor OTP authorization.
              </p>
            </div>
            <div className="p-4 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]/70 space-y-1.5">
              <strong className="text-[var(--text-primary)] text-sm block">Jaatri Closed-Loop Wallet</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Pre-funded digital balance allowing instantaneous 1-tap checkout without waiting for SMS banking OTPs.
              </p>
            </div>
            <div className="p-4 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]/70 space-y-1.5">
              <strong className="text-[var(--text-primary)] text-sm block">Cash to Driver</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Direct physical cash handover to the driver partner at destination completion, subject to driver change availability.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Customer Wallet Architecture */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Wallet size={20} className="text-[var(--page-accent)]" /> 2. Customer Wallet Terms
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            The Jaatri Customer Wallet is a closed-loop digital instrument issued by Jaatri Mobility Technologies Pvt. Ltd.:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <li><strong>Permitted Use:</strong> Balance stored within the customer wallet can exclusively be utilized to settle ride fares on the Jaatri platform. Under Reserve Bank of India (RBI) prepaid payment instrument directions, cash withdrawal from customer wallets is strictly prohibited.</li>
            <li><strong>Instant Auto-Refunds:</strong> When a pre-paid booking is cancelled within the permitted window, the refund is deposited into your Jaatri Wallet within 0 seconds, with zero gateway deduction.</li>
            <li><strong>Expiry & Top-ups:</strong> Customer top-up balances do not expire. Promotional ride credits issued as marketing vouchers may carry explicit promotional validity dates.</li>
            <li><strong>Passbook Ledger:</strong> Every debit, credit, top-up, and refund generates an immutable ledger transaction ID accessible under <Link href="/wallet" className="text-[var(--page-accent)] font-bold underline">My Wallet</Link>.</li>
          </ul>
        </section>

        {/* 3. Driver Earnings & Split */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Percent size={20} className="text-[var(--page-accent)]" /> 3. Fare Split & Aggregator Commission
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            In compliance with the <strong>Motor Vehicle Aggregator Guidelines, 2025 (Clause 13)</strong>, Jaatri enforces fair driver remuneration:
          </p>
          <div className="p-5 rounded-[12px] bg-[#123D32] text-white space-y-3">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/20">
              <span className="font-bold uppercase tracking-wider text-[#F7F1E5]/80">Total Customer Fare</span>
              <span className="font-mono text-emerald-300 font-bold text-sm">100% of Base + Distance + Time</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <p className="text-[#F7F1E5]/75">Driver Partner Remuneration</p>
                <p className="text-xl font-bold text-white mt-0.5">90% of Fare</p>
                <p className="text-[11px] text-[#F7F1E5]/60 mt-1">Directly credited to Driver Earnings Wallet.</p>
              </div>
              <div>
                <p className="text-[#F7F1E5]/75">Platform Convenience Fee</p>
                <p className="text-xl font-bold text-[#E5EBDD] mt-0.5">10% Commission</p>
                <p className="text-[11px] text-[#F7F1E5]/60 mt-1">Covers cloud routing, 24×7 safety response, and gateway fees.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-[var(--text-secondary)] text-xs leading-relaxed">
            <p><strong>Digital Payments:</strong> When a customer pays via UPI/Card/Wallet, the 90% net earning is credited to the Driver Wallet immediately upon OTP drop verification.</p>
            <p><strong>Cash Payments:</strong> When a customer pays cash, the driver partner collects 100% in hand. Jaatri automatically deducts the 10% platform commission from the driver partner&apos;s pending wallet reserve.</p>
          </div>
        </section>

        {/* 4. Driver Partner Bank Payouts */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Building2 size={20} className="text-[var(--page-accent)]" /> 4. Driver Partner Bank Settlements
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <li><strong>Verified Account Only:</strong> Withdrawals are routed strictly to the bank account or UPI VPA verified during the driver partner&apos;s Video KYC onboarding under <Link href="/partner/onboard/bank" className="text-[var(--page-accent)] font-bold underline">Partner Banking Details</Link>.</li>
            <li><strong>Payout Cycle:</strong> Driver partners can initiate on-demand withdrawals. Automated settlement runs every Tuesday and Friday via IMPS/NEFT.</li>
            <li><strong>Minimum Withdrawal:</strong> The minimum bank payout threshold is ₹100. Payout requests below this threshold roll over to the next cycle.</li>
            <li><strong>Negative Balance:</strong> If excessive cash rides push a driver&apos;s platform commission balance into negative territory, new ride allocations will be paused until the commission liability is topped up.</li>
          </ul>
        </section>

        {/* 5. Statutory Tax Compliance */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Receipt size={20} className="text-[var(--page-accent)]" /> 5. GST & Statutory Levies
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            In compliance with <strong>Section 9(5) of the Central Goods and Services Tax (CGST) Act, 2017</strong>, electronic commerce operators providing passenger transport services are required to discharge applicable GST on behalf of driver partners.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>Applicable Goods & Services Tax (5% without Input Tax Credit for passenger transport) is included or itemized in the digital ride invoice.</li>
            <li>Itemized tax invoices are automatically generated upon trip completion and emailed to the rider&apos;s registered address.</li>
            <li>TDS under Section 194-O of the Income Tax Act, 1961 is deducted and deposited for driver partners where legally applicable.</li>
          </ul>
        </section>

        {/* 6. Disputes & Queries */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <HelpCircle size={20} className="text-[var(--page-accent)]" /> 6. Payment Support & Disputes
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            For disputed fares, bank gateway drops where amount was debited but ride was not booked, or driver payout inquiries:
          </p>
          <div className="p-4 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]/70 text-sm text-[var(--text-secondary)] space-y-1">
            <p><strong>Support Email:</strong> <a href="mailto:payments@ridenow.in" className="text-[var(--page-accent)] font-bold underline">payments@ridenow.in</a></p>
            <p><strong>Finance Desk:</strong> Jaatri Mobility Technologies Pvt. Ltd., GS Road, Guwahati, Assam 781005</p>
            <p><strong>Turnaround Time:</strong> Bank gateway reconciliation queries are processed within 24 to 48 banking hours.</p>
          </div>
        </section>
    </PolicyPage>
  );
}
