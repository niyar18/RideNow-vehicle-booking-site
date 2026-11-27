import PolicyPage from "@/shared/components/public/PolicyPage";
import {
  HelpCircle,
  Building,
  Clock,

} from "lucide-react";
import Link from "next/link";

export default function GrievancePage() {
  return (
    <PolicyPage
      current="/grievance"
      label="Policies / Grievances"
      title="Grievance Redressal & Company Details"
      description={<>Published pursuant to the Consumer Protection (E-Commerce) Rules 2020, Digital Personal Data Protection Act 2023, and Motor Vehicle Aggregator Guidelines 2025.</>}
    >
        {/* 1. Legal Entity Identification */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Building size={20} className="text-[var(--page-accent)]" /> 1. Legal Entity Details
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <span className="text-[var(--text-secondary)] block font-bold uppercase text-[10px] tracking-wider mb-1">Legal Entity Name</span>
              <strong className="text-[var(--text-primary)] text-sm">Jaatri Mobility Technologies Private Limited</strong>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <span className="text-[var(--text-secondary)] block font-bold uppercase text-[10px] tracking-wider mb-1">Registered Office</span>
              <span className="text-[var(--text-primary)] font-semibold">G.S. Road, Christian Basti, Guwahati, Assam 781005, India</span>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <span className="text-[var(--text-secondary)] block font-bold uppercase text-[10px] tracking-wider mb-1">Customer Care Email</span>
              <a href="mailto:support@ridenow.in" className="text-[var(--page-accent)] font-bold underline">support@ridenow.in</a>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <span className="text-[var(--text-secondary)] block font-bold uppercase text-[10px] tracking-wider mb-1">Operating Jurisdiction</span>
              <span className="text-[var(--text-primary)] font-semibold">Guwahati / Assam & Northeast Region, India</span>
            </div>
          </div>
        </section>

        {/* 2. Statutory Grievance Officer */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <HelpCircle size={20} className="text-[var(--page-accent)]" /> 2. Statutory Grievance Officer
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            In accordance with Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020 and the DPDP Act, 2023, the contact details of the Grievance Officer are set out below:
          </p>
          <div className="p-5 bg-[var(--page-moss)] rounded-[10px] border border-[#cdd6c3] text-xs text-[var(--page-accent)] space-y-2">
            <p><strong className="text-[var(--text-primary)]">Designation:</strong> Head of Legal & Grievance Redressal</p>
            <p><strong className="text-[var(--text-primary)]">Officer Name:</strong> Grievance Officer, Jaatri Mobility Technologies</p>
            <p><strong className="text-[var(--text-primary)]">Email Address:</strong> <a href="mailto:grievance@ridenow.in" className="text-[var(--page-accent)] font-bold underline">grievance@ridenow.in</a></p>
            <p><strong className="text-[var(--text-primary)]">Postal Address:</strong> Jaatri Legal Grievance Cell, G.S. Road, Guwahati, Assam 781005</p>
            <p><strong className="text-[var(--text-primary)]">Working Hours:</strong> Monday to Friday, 09:30 AM to 06:30 PM IST</p>
          </div>
        </section>

        {/* 3. Three-Tier Escalation Matrix */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Clock size={20} className="text-[var(--page-accent)]" /> 3. Complaint Escalation Matrix
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <div className="flex items-center justify-between font-bold text-[var(--text-primary)] mb-1">
                <span>Level 1: 24×7 In-App & Email Customer Support</span>
                <span className="text-[10px] font-black uppercase bg-[var(--page-moss)] text-[var(--page-accent)] px-2 py-0.5 rounded-full">TAT: 2–24 Hours</span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Submit an inquiry via our <Link href="/contact" className="text-[var(--page-accent)] font-bold underline">Help Center</Link> or email <a href="mailto:support@ridenow.in" className="text-[var(--page-accent)] underline">support@ridenow.in</a>. Most booking, fare, and wallet queries are resolved within 24 hours.
              </p>
            </div>

            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <div className="flex items-center justify-between font-bold text-[var(--text-primary)] mb-1">
                <span>Level 2: Escalation to Grievance Officer</span>
                <span className="text-[10px] font-black uppercase bg-[var(--page-moss)] text-[var(--page-accent)] px-2 py-0.5 rounded-full">TAT: 48 Hours Ack / 15 Days Resolution</span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                If your issue remains unresolved after Level 1, quote your Ticket/Booking ID and email <a href="mailto:grievance@ridenow.in" className="text-[var(--page-accent)] underline">grievance@ridenow.in</a>. Acknowledged within 48 hours under statutory guidelines.
              </p>
            </div>

            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]/70">
              <div className="flex items-center justify-between font-bold text-[var(--text-primary)] mb-1">
                <span>Level 3: Regulatory & Consumer Fora</span>
                <span className="text-[10px] font-black uppercase bg-[#faebe8] text-[#782313] px-2 py-0.5 rounded-full">Statutory Escalation</span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Users may approach the National Consumer Helpline (NCH: 1915 / <a href="https://consumerhelpline.gov.in" target="_blank" rel="noreferrer" className="text-[var(--page-accent)] underline">consumerhelpline.gov.in</a>) or the State Transport Department as provided under applicable law.
              </p>
            </div>
          </div>
        </section>
    </PolicyPage>
  );
}
