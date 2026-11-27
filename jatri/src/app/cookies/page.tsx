import PolicyPage from "@/shared/components/public/PolicyPage";
import {
  Cookie,
  Database,
  Cpu,
  SlidersHorizontal,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <PolicyPage
      current="/cookies"
      label="Policies / Cookies"
      title="Cookie & Tracking Technologies Policy"
      description={<>How Jaatri utilizes cookies, web storage, and telemetry to maintain your authentication session, cache map routing, and safeguard platform operations.</>}
      metadata={<>
        <span><strong>Version:</strong> 1.0</span>
            <span><strong>Effective Date:</strong> 1 October 2026</span>
            <span><strong>Data Controller:</strong> Jaatri Mobility Technologies Pvt. Ltd.</span>
      </>}
    >
        {/* 1. What are Cookies */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Cookie size={20} className="text-[var(--page-accent)]" /> 1. Overview of Tracking Technologies
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Cookies and browser web storage (SessionStorage and LocalStorage) are compact text records saved on your smartphone, tablet, or computer when you visit or book a ride on Jaatri.
          </p>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Jaatri follows a strict <strong>data minimization philosophy</strong> under the <strong>Digital Personal Data Protection Act, 2023</strong>. We do not sell your browsing behavior to third-party ad networks, and our tracking mechanisms are strictly purpose-bound to service delivery, account authentication, and transport safety.
          </p>
        </section>

        {/* 2. Categories of Storage */}
        <section className="space-y-5">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Database size={20} className="text-[var(--page-accent)]" /> 2. Types of Cookies We Use
          </h2>

          <div className="space-y-4">
            {/* Essential */}
            <div className="p-4 sm:p-5 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]/70 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm">A. Strictly Necessary & Authentication Cookies</h3>
              </div>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                Essential for the core platform functionality. Without these tokens, logging in, maintaining your active trip session, or authenticating WebSocket telematics is technically impossible.
              </p>
              <div className="bg-[var(--surface)] p-3 rounded-[8px] border border-[var(--border-default)]/60 font-mono text-[11px] text-[var(--text-primary)] space-y-1">
                <div><strong>next-auth.session-token:</strong> Encrypted JWT validating your logged-in user profile (Session-based).</div>
                <div><strong>next-auth.csrf-token:</strong> Mitigates Cross-Site Request Forgery attacks during checkout and bookings.</div>
              </div>
            </div>

            {/* Functional */}
            <div className="p-4 sm:p-5 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]/70 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--policy-inverse)]" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm">B. Functional & Local Experience Storage</h3>
              </div>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                Used to preserve your booking form selections across page reloads without burdening our cloud servers repeatedly.
              </p>
              <div className="bg-[var(--surface)] p-3 rounded-[8px] border border-[var(--border-default)]/60 font-mono text-[11px] text-[var(--text-primary)] space-y-1">
                <div><strong>sessionStorage (bookingDraft):</strong> Temporarily holds selected pickup coordinates, destination, and vehicle type during the checkout journey. Cleared upon booking completion.</div>
                <div><strong>localStorage (savedContacts):</strong> Stores your family and emergency contact nicknames on your device for one-tap passenger selection.</div>
              </div>
            </div>

            {/* Map & Telematics */}
            <div className="p-4 sm:p-5 rounded-[10px] bg-[var(--surface-raised)] border border-[var(--border-default)]/70 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm">C. Routing & Telematics Cache</h3>
              </div>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                Caches OpenStreetMap and OSRM road geometry vectors locally in your browser memory to render 60fps driver tracking without depleting mobile cellular data.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Third-Party Integrations */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Cpu size={20} className="text-[var(--page-accent)]" /> 3. Third-Party Infrastructure Providers
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Jaatri partners with specialized service providers who may set technical cookies required to complete their services:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[var(--text-secondary)] text-xs leading-relaxed">
            <li><strong>Payment Gateways:</strong> PCI-DSS compliance and fraud risk assessment cookies during UPI and card checkout.</li>
            <li><strong>ZegoCloud:</strong> WebRTC connectivity cookies to facilitate real-time encrypted driver-rider audio calls and video KYC verification.</li>
            <li><strong>Google Identity Services:</strong> Required exclusively if you initiate authentication through Google OAuth.</li>
          </ul>
        </section>

        {/* 4. Cookie Management */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-[var(--page-accent)]" /> 4. Controlling Your Cookie Preferences
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            You maintain full sovereignty over your browser data:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)] text-xs leading-relaxed">
            <li><strong>Browser Settings:</strong> You can block or delete cookies through your browser preferences (Chrome, Safari, Firefox, Edge). Note that blocking essential cookies will prevent authentication and booking execution.</li>
            <li><strong>Right to Erasure:</strong> To delete all server-stored identifiers and anonymize your account records under DPDP Act 2023, you can use our <Link href="/privacy" className="text-[var(--page-accent)] font-bold underline">Account Erasure API</Link>.</li>
          </ul>
        </section>

        {/* 5. Contact */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <HelpCircle size={20} className="text-[var(--page-accent)]" /> 5. Questions Regarding Cookies
          </h2>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed">
            For technical inquiries regarding Jaatri data telemetry or session management, contact our Data Privacy Officer at <a href="mailto:privacy@ridenow.in" className="text-[var(--page-accent)] font-bold underline">privacy@ridenow.in</a> or visit our <Link href="/grievance" className="text-[var(--page-accent)] font-bold underline">Grievance Redressal Desk</Link>.
          </p>
        </section>
    </PolicyPage>
  );
}
