import PolicyPage from "@/shared/components/public/PolicyPage";
import {
  CheckCircle2,
  Scale,
  Shield,
  CreditCard,
  Ban,
} from "lucide-react";
import Link from "next/link";

export default function TermsAndConditionsPage() {
  return (
    <PolicyPage
      current="/terms"
      label="Policies / Terms"
      title="Terms & Conditions"
      description={<>Contractual agreement governing ride booking, fares, payments, user conduct, and services provided by Jaatri (যাত্ৰী), by RideNow.</>}
      metadata={<>
        <span><strong>Version:</strong> 1.2</span>
            <span><strong>Effective Date:</strong> 1 October 2026</span>
            <span><strong>Jurisdiction:</strong> Courts of Guwahati / Assam, India</span>
      </>}
    >
        {/* 1. Acceptance & Eligibility */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <CheckCircle2 size={20} className="text-[var(--page-accent)]" /> 1. Acceptance & Eligibility
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            By accessing or using Jaatri (&ldquo;Platform&rdquo;), you confirm that you are at least 18 years of age and legally competent to enter into a binding contract under the Indian Contract Act, 1872. If you book a ride on behalf of another individual or family contact, you confirm that you have obtained their authorization.
          </p>
        </section>

        {/* 2. Platform Role as an Aggregator */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Shield size={20} className="text-[var(--page-accent)]" /> 2. Aggregator Intermediary Role
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Jaatri operates as an electronic marketplace and aggregator under the <strong>Motor Vehicle Aggregator Guidelines, 2025</strong> and an intermediary under Section 79 of the Information Technology Act, 2000. Jaatri connects passengers with independent third-party commercial vehicle operators. Drivers are independent contractors and not direct employees of Jaatri.
          </p>
        </section>

        {/* 3. Fare Structure & Transparency */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <CreditCard size={20} className="text-[var(--page-accent)]" /> 3. Fare Calculation & Transparency
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Under Section 13 of the Motor Vehicle Aggregator Guidelines 2025, Jaatri provides upfront fare disclosure before booking confirmation. Fares are calculated dynamically based on:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <strong className="text-[var(--text-primary)] block mb-1">Base Fare:</strong>
              <p className="text-[var(--text-secondary)]">Initial vehicle pickup and flag-down fee.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <strong className="text-[var(--text-primary)] block mb-1">Distance Charge:</strong>
              <p className="text-[var(--text-secondary)]">Road network distance computed via Valhalla/OSRM routing engines.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <strong className="text-[var(--text-primary)] block mb-1">Waiting & Stoppage Fee:</strong>
              <p className="text-[var(--text-secondary)]">Applicable if intermediate stops exceed complimentary time.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <strong className="text-[var(--text-primary)] block mb-1">Platform Commission:</strong>
              <p className="text-[var(--text-secondary)]">10% platform service fee deducted from driver settlement.</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Toll charges, parking fees, and statutory municipal entry taxes incurred during the trip are added directly to the receipt.
          </p>
        </section>

        {/* 4. Payment Modes */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <CreditCard size={20} className="text-[var(--page-accent)]" /> 4. Payment Methods & Wallet
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">The Customer may settle ride fares through:</p>
          <ul className="list-disc list-inside space-y-1.5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <li><strong>Jaatri Wallet (Digital Cash):</strong> Instant 1-tap deduction from prepaid wallet balance.</li>
            <li><strong>Online Payment:</strong> UPI, Credit/Debit Cards, Net Banking processed via secure gateways.</li>
            <li><strong>Direct Cash:</strong> Cash handed directly to the driver partner at the conclusion of the ride.</li>
          </ul>
        </section>

        {/* 5. Conduct & Safety */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Ban size={20} className="text-[#E34222] dark:text-[#E06A50]" /> 5. Prohibited Conduct & Safety
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">Customers and drivers must adhere to safety norms:</p>
          <ul className="list-disc list-inside space-y-1.5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <li>No smoking, alcohol consumption, or carrying illegal substances or firearms inside the vehicle.</li>
            <li>Mutual respect: verbal abuse, harassment, or physical altercation results in immediate account suspension and reporting to law enforcement authorities.</li>
            <li>Seatbelts (cars/trucks) and certified BIS helmets (bikes) are mandatory under the Motor Vehicles Act, 1988.</li>
          </ul>
        </section>

        {/* 6. Dispute Resolution */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Scale size={20} className="text-[var(--page-accent)]" /> 6. Dispute Resolution & Governing Law
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            These Terms are governed by the laws of the Republic of India. Any disputes arising out of or in connection with the Platform shall be subject to the exclusive jurisdiction of the competent courts in Guwahati, Assam.
          </p>
          <div className="pt-2 text-xs">
            For support and dispute filings, refer to our <Link href="/grievance" className="text-[var(--page-accent)] font-bold underline">Grievance Redressal Portal</Link>.
          </div>
        </section>
    </PolicyPage>
  );
}
