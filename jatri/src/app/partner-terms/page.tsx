import PolicyPage from "@/shared/components/public/PolicyPage";
import {
  Car,
  FileCheck,
  Percent,
  ShieldCheck,
  AlertTriangle,

} from "lucide-react";

export default function DriverPartnerTermsPage() {
  return (
    <PolicyPage
      current="/partner-terms"
      label="Policies / Driving"
      title="Driver Partner Agreement"
      description={<>Terms governing driver eligibility, document verification, vehicle roadworthiness, fare split, platform commission, and bank settlements.</>}
      metadata={<>
        <span><strong>Version:</strong> 1.2</span>
            <span><strong>Effective Date:</strong> 1 October 2026</span>
            <span><strong>Regulatory Framework:</strong> MV Aggregator Guidelines 2025</span>
      </>}
    >
        {/* 1. Engagement & Nature of Relationship */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Car size={20} className="text-[var(--page-accent)]" /> 1. Nature of Relationship
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Under the <strong>Motor Vehicle Aggregator Guidelines 2025</strong>, the relationship between Jaatri and the Driver Partner is that of an independent commercial service provider and digital technology aggregator on a principal-to-principal basis. Nothing in this Agreement shall be construed to create an employment, partnership, or joint venture relationship.
          </p>
        </section>

        {/* 2. Mandatory Document Compliance */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <FileCheck size={20} className="text-[var(--page-accent)]" /> 2. Driver & Vehicle Onboarding Verification
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Before accepting ride dispatches on the Platform, the Driver Partner must submit and maintain valid statutory documents:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <strong className="text-[var(--text-primary)] block mb-1">Driving Licence (Commercial / Transport):</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">Valid unexpired driving licence for the corresponding category (Bike, Auto, Four-wheeler, Loading, Truck).</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <strong className="text-[var(--text-primary)] block mb-1">Vehicle Registration (RC) & Permit:</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">Valid Certificate of Registration and statutory state transport permit.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <strong className="text-[var(--text-primary)] block mb-1">Commercial Insurance & Fitness:</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">Third-party/comprehensive passenger insurance and Certificate of Fitness.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <strong className="text-[var(--text-primary)] block mb-1">Pollution Under Control (PUC) & Video KYC:</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">Valid emission compliance and identity verification completed via admin Video KYC.</p>
            </div>
          </div>
          <p className="text-xs text-[var(--policy-danger)] bg-[var(--policy-danger-bg)] p-3.5 rounded-[8px] border border-[var(--policy-danger-border)] font-medium leading-relaxed">
            The Platform reserves the right to automatically deactivate or place on hold any driver profile whose statutory vehicle documents have expired.
          </p>
        </section>

        {/* 3. Fare Split, Commission & Payouts */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Percent size={20} className="text-[var(--page-accent)]" /> 3. Fare Split & Commission Ledger
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            In compliance with the 2025 aggregator economics standards:
          </p>
          <div className="p-5 bg-[var(--policy-inverse)] text-white rounded-[12px] space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-white/20 pb-2">
              <span className="text-[var(--policy-inverse-text)]">Driver Partner Earnings Share</span>
              <strong className="text-[var(--accent-mint)] text-sm font-bold">90% of Base Trip Fare</strong>
            </div>
            <div className="flex justify-between border-b border-white/20 pb-2">
              <span className="text-[var(--policy-inverse-text)]">Platform Service Commission</span>
              <strong className="text-[var(--accent-mint)] text-sm font-bold">10% of Trip Fare</strong>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[var(--policy-inverse-text)]">Settlement Mode</span>
              <span className="text-white font-medium">Jaatri Driver Wallet & Bank IMPS/UPI</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            <p>
              <strong>Online & Wallet Rides:</strong> 90% of the trip fare is credited directly to your Driver Wallet upon passenger OTP verification at destination drop-off.
            </p>
            <p>
              <strong>Cash Rides:</strong> The passenger hands 100% of the fare directly to you in cash. Jaatri automatically debits the 10% platform commission from your Driver Wallet balance.
            </p>
            <p>
              <strong>Withdrawals:</strong> Drivers may withdraw their available wallet earnings to their linked bank account (<code className="bg-[var(--page-tint)] px-1 py-0.5 rounded text-[var(--page-accent)] font-bold">PartnerBank</code>) at any time (minimum withdrawal: ₹100).
            </p>
          </div>
        </section>

        {/* 4. Safety & Standards */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck size={20} className="text-[var(--page-accent)]" /> 4. Safety & Operating Standards
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <li><strong>Zero Tolerance on Intoxication:</strong> Operating a vehicle under the influence of alcohol or drugs results in immediate permanent ban and criminal referral.</li>
            <li><strong>Route Fidelity:</strong> Drivers must follow the designated digital route or passenger-requested itinerary. Unwarranted detours or route refusal are subject to penalties.</li>
            <li><strong>OTP Verification:</strong> Drivers must only start or complete a ride after verifying the passenger&rsquo;s 4-digit pickup and drop OTPs.</li>
          </ul>
        </section>

        {/* 5. Suspension & Deactivation */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <AlertTriangle size={20} className="text-[var(--policy-danger)]" /> 5. Suspension, Deactivation & Appeals
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Driver accounts may be temporarily suspended or permanently deactivated for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>Expiry of Driving Licence, Commercial Insurance, Fitness, or PUC certificate.</li>
            <li>Safety violations, customer harassment, or reckless driving incidents.</li>
            <li>Frequent refusal of accepted bookings or demanding off-platform cash surcharges.</li>
            <li>Unpaid platform commission resulting in negative wallet balance below allowed threshold.</li>
          </ul>
          <p className="text-sm text-[var(--text-secondary)] pt-2">
            Deactivated driver partners may appeal decisions by contacting our Driver Grievance Cell at <a href="mailto:partners@ridenow.in" className="text-[var(--page-accent)] font-bold underline">partners@ridenow.in</a>.
          </p>
        </section>
    </PolicyPage>
  );
}

export const metadata = { title: "Driver partner agreement" };
