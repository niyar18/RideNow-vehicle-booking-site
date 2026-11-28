import PolicyPage from "@/shared/components/public/PolicyPage";
import {
  Building,
  UserCheck,
  FileText,
  Clock,
  Eye,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      current="/privacy"
      label="Policies / Privacy"
      title="Privacy Policy"
      description={<>How Jaatri collects, uses, protects, and retains customer and driver partner data under Indian digital personal data protection laws.</>}
      metadata={<>
        <span><strong>Version:</strong> 1.2</span>
            <span><strong>Effective Date:</strong> 1 October 2026</span>
            <span><strong>Applicable Law:</strong> Digital Personal Data Protection Act, 2023</span>
      </>}
    >
        {/* 1. Who We Are */}
        <section>
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Building size={20} className="text-[var(--page-accent)]" /> 1. Who We Are (Data Fiduciary)
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Jaatri Mobility Technologies Private Limited (&ldquo;Jaatri&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates an on-demand mobility platform connecting passengers (&ldquo;Customers&rdquo;) with verified independent vehicle operators and fleet owners (&ldquo;Drivers&rdquo; or &ldquo;Driver Partners&rdquo;). Under the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, Jaatri acts as a <em>Data Fiduciary</em> determining the purposes and means of processing personal data.
          </p>
        </section>

        {/* 2. Customer vs Driver Data */}
        <section className="space-y-6">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <UserCheck size={20} className="text-[var(--page-accent)]" /> 2. Information We Collect
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]">
              <h3 className="font-bold text-[var(--text-primary)] text-sm mb-2.5">A. Customer (Rider) Data</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                <li><strong>Identity:</strong> Name, mobile number, email address.</li>
                <li><strong>Journey Data:</strong> Pickup coordinate, drop destination, road itinerary, stops.</li>
                <li><strong>Live Location:</strong> GPS coordinates during active ride search and transit.</li>
                <li><strong>Financial:</strong> Wallet balances, transaction reference IDs (no raw card CVVs).</li>
                <li><strong>Safety & Support:</strong> Trip OTPs, chat messages, SOS panic alerts, ratings.</li>
              </ul>
            </div>

            <div className="p-5 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]">
              <h3 className="font-bold text-[var(--text-primary)] text-sm mb-2.5">B. Driver Partner Data</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
                <li><strong>Identity & KYC:</strong> Driving Licence, Aadhaar / PAN, Video KYC recordings.</li>
                <li><strong>Vehicle Records:</strong> RC, Commercial Permit, Insurance, Fitness, PUC certificate.</li>
                <li><strong>Telemetry:</strong> Live GPS tracking while toggled online and during active trips.</li>
                <li><strong>Settlement:</strong> Bank account number, IFSC code, UPI ID, earnings and commission ledger.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Purpose-Specific Processing */}
        <section>
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <FileText size={20} className="text-[var(--page-accent)]" /> 3. Purpose-Specific Processing
          </h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            We adhere strictly to purpose specification and data minimization:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[var(--text-primary)] uppercase font-bold tracking-wider">
                  <th className="py-2.5 pr-4">Data Element</th>
                  <th className="py-2.5 pr-4">Specific Purpose</th>
                  <th className="py-2.5">Legal Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED7CA]/60 dark:divide-[#24483D] text-xs">
                <tr>
                  <td className="py-2.5 pr-4 font-bold text-[var(--text-primary)]">Live GPS Location</td>
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">Driver dispatch within 10km, route navigation, real-time safety tracking</td>
                  <td className="py-2.5 text-[var(--page-accent)] font-semibold">Performance of Contract / Safety</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-bold text-[var(--text-primary)]">Mobile Number</td>
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">Authentication OTP, driver-passenger calling, pickup/drop safety OTPs</td>
                  <td className="py-2.5 text-[var(--page-accent)] font-semibold">Consent & Legitimate Use</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-bold text-[var(--text-primary)]">Driver KYC & Vehicle Docs</td>
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">Compliance with Motor Vehicle Aggregator Guidelines 2025</td>
                  <td className="py-2.5 text-[var(--page-accent)] font-semibold">Statutory Legal Obligation</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-bold text-[var(--text-primary)]">Fare & Wallet Ledger</td>
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">1-tap checkout, 90% partner earnings payout, 10% commission accounting</td>
                  <td className="py-2.5 text-[var(--page-accent)] font-semibold">Contractual Performance / Tax Laws</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Location Privacy & Retention Schedule */}
        <section>
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Clock size={20} className="text-[var(--page-accent)]" /> 4. Data Retention & Location Privacy Schedule
          </h2>
          <p className="mb-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Under the MoRTH Motor Vehicle Aggregator Guidelines 2025 and Indian tax statutes, certain journey records must be retained for passenger safety investigations and statutory audits:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <p className="font-bold text-[var(--text-primary)] mb-1">High-Resolution GPS Stream</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">Retained only during active trip + 72 hours post-trip for incident/lost item investigation, then compressed/purged.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <p className="font-bold text-[var(--text-primary)] mb-1">Trip & Fare Summary Records</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">Retained for statutory periods mandated under Motor Vehicle & GST regulations (up to 3 years).</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <p className="font-bold text-[var(--text-primary)] mb-1">Wallet & Bank Settlements</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">Retained as financial transaction books under the Companies Act and PMLA guidelines.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <p className="font-bold text-[var(--text-primary)] mb-1">Account Erasure Requests</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">Directly processed via <code className="bg-[var(--page-tint)] dark:bg-[var(--surface-subtle)] text-[var(--page-accent)] px-1 py-0.5 rounded text-[11px]">/api/user/delete-account</code>; personal IDs permanently anonymized.</p>
            </div>
          </div>
        </section>

        {/* 5. User Rights Under DPDP Act 2023 */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Eye size={20} className="text-[var(--page-accent)]" /> 5. Data Principal Rights
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">As a Data Principal in India, you are entitled to:</p>
          <ul className="list-disc list-inside space-y-1.5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <li><strong>Right to Access:</strong> View a summary of your personal data and processing activities.</li>
            <li><strong>Right to Correction & Updating:</strong> Edit your name, phone number, or bank details via <Link href="/profile" className="text-[var(--page-accent)] font-bold underline">Profile</Link>.</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your account and personal identifiers under Section 12 of the DPDP Act.</li>
            <li><strong>Right of Grievance Redressal:</strong> Direct access to our appointed Grievance Officer.</li>
          </ul>
        </section>

        {/* 6. Grievance Officer */}
        <section className="text-[var(--page-accent)] dark:text-[var(--text-primary)] ">
          <h2 className="font-serif text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2 text-[var(--page-accent)] dark:text-[var(--text-primary)]">
            <HelpCircle size={20} className="text-[var(--policy-danger)]" /> 6. Grievance Officer & Statutory Disclosures
          </h2>
          <p className="text-xs mb-4 text-[var(--page-accent)]/85 dark:text-[var(--text-secondary)] leading-relaxed">
            In compliance with the Digital Personal Data Protection Act, 2023, Consumer Protection (E-Commerce) Rules, 2020, and the Motor Vehicle Aggregator Guidelines 2025:
          </p>
          <div className="bg-[var(--surface-raised)] p-4 rounded-[10px] border border-[var(--border-default)] dark:border-[var(--border-default)] text-xs text-[var(--text-primary)] space-y-1.5">
            <p><strong>Designated Grievance Officer:</strong> Legal & Compliance Officer</p>
            <p><strong>Entity Name:</strong> Jaatri Mobility Technologies Private Limited</p>
            <p><strong>Email:</strong> <a href="mailto:grievance@ridenow.in" className="text-[var(--page-accent)] font-bold underline">grievance@ridenow.in</a></p>
            <p><strong>Grievance Portal:</strong> <Link href="/grievance" className="text-[var(--page-accent)] font-bold underline">ridenow.in/grievance</Link></p>
            <p><strong>Response Timeline:</strong> Acknowledgement within 48 hours; resolution within statutory timeline.</p>
          </div>
        </section>
    </PolicyPage>
  );
}

export const metadata = { title: "Privacy policy" };
