import PolicyPage from "@/shared/components/public/PolicyPage";
import {
  PhoneCall,
  Share2,
  Lock,
  UserCheck,
  CheckCircle2,
  HeartHandshake,
  Search,
  FileCheck2,
} from "lucide-react";
import Link from "next/link";

import styles from "@/shared/components/public/public-page.module.css";

export default function SafetyPolicyPage() {
  return (
    <PolicyPage
      current="/safety"
      label="Rider information / Safety"
      title="Safety & Emergency Standards"
      description={<>Stringent driver verification, live GPS journey telemetry, in-ride emergency SOS, and statutory insurance under the Motor Vehicle Aggregator Guidelines 2025.</>}
    >
        <div className={styles.emergency}>
          <strong>Need emergency help?</strong>
          <p className="text-sm text-[var(--text-secondary)]">Call 112 directly for immediate help. Jaatri’s in-app SOS does not contact emergency services or emergency contacts.</p>
          <a href="tel:112"><PhoneCall size={16} aria-hidden="true" />Call 112</a>
        </div>

        {/* 1. In-App Emergency Assistance */}
        <section className="text-[var(--policy-danger)] space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2 text-[var(--policy-danger)]">
            <PhoneCall size={20} className="text-[var(--policy-danger)]" /> In-Ride Emergency Assistance & SOS
          </h2>
          <p className="text-xs text-[var(--policy-danger)] leading-relaxed">
            Calling 112 and recording SOS in Jaatri are separate actions:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="bg-[var(--surface-raised)] p-4 rounded-[10px] border border-[var(--policy-danger-border)] dark:border-[var(--border-default)]">
              <strong className="text-[var(--policy-danger)] block mb-1">India’s emergency number (112):</strong>
              <p className="text-[var(--policy-danger)] dark:text-[var(--text-secondary)] leading-relaxed">Call 112 to reach India’s Emergency Response Support System for police, fire, or medical help.</p>
            </div>
            <div className="bg-[var(--surface-raised)] p-4 rounded-[10px] border border-[var(--policy-danger-border)] dark:border-[var(--border-default)]">
              <strong className="text-[var(--policy-danger)] block mb-1">In-app SOS record:</strong>
              <p className="text-[var(--policy-danger)] dark:text-[var(--text-secondary)] leading-relaxed">Recording SOS flags the ride in Jaatri. It is not a request for emergency dispatch and does not notify emergency contacts.</p>
            </div>
          </div>
        </section>

        {/* 2. Before Every Trip: Verification */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <UserCheck size={20} className="text-[var(--page-accent)]" /> 1. Driver & Vehicle Verification Standards
          </h2>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <FileCheck2 size={18} className="text-[var(--page-accent)] mb-1.5" />
              <strong className="text-[var(--text-primary)] block mb-1">Document Verification</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">Verification of Driving Licence, Registration Certificate (RC), Commercial Insurance, and Pollution (PUC).</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <Lock size={18} className="text-[var(--page-accent)] mb-1.5" />
              <strong className="text-[var(--text-primary)] block mb-1">Admin Video KYC</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">Live video verification via WebRTC to confirm physical identity against government photo IDs.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <CheckCircle2 size={18} className="text-[var(--page-accent)] mb-1.5" />
              <strong className="text-[var(--text-primary)] block mb-1">Vehicle Fitness</strong>
              <p className="text-[var(--text-secondary)] leading-relaxed">Mandatory statutory inspection verifying vehicle roadworthiness, tyre conditions, and safety harnesses.</p>
            </div>
          </div>
        </section>

        {/* 3. During the Trip: Live Tracking & Safety PIN */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Share2 size={20} className="text-[var(--page-accent)]" /> 2. Live Tracking & Start PIN Verification
          </h2>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <strong className="text-[var(--text-primary)] block mb-1">Pickup OTP (Start Code):</strong>
              <p className="leading-relaxed">Never get into a vehicle without confirming the driver&rsquo;s name and vehicle registration plate matching your app screen. A trip can only begin once you provide your 4-digit pickup OTP to the verified driver partner.</p>
            </div>
            <div className="p-4 bg-[var(--surface-raised)] rounded-[10px] border border-[var(--border-default)]">
              <strong className="text-[var(--text-primary)] block mb-1">Share Live Trip with Family & Friends:</strong>
              <p className="leading-relaxed">Our tracking URLs enable family members to view your real-time vehicle movement, driver details, and estimated arrival time on any browser without needing an app login.</p>
            </div>
          </div>
        </section>

        {/* 4. Passenger Insurance Coverage */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <HeartHandshake size={20} className="text-[var(--page-accent)]" /> 3. Passenger Insurance Under MoRTH Guidelines 2025
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            In compliance with the <strong>Motor Vehicle Aggregator Guidelines 2025</strong>, every passenger on a confirmed Jaatri trip is covered under statutory transit insurance providing coverage for accidental medical expenses, hospitalization, and emergency evacuation during the trip.
          </p>
        </section>

        {/* 5. Lost & Found Protocol */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] flex items-center gap-2">
            <Search size={20} className="text-[var(--page-accent)]" /> 4. Lost & Found Policy
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            If you leave an item in a Jaatri vehicle, report it immediately through your <Link href="/bookings" className="text-[var(--page-accent)] font-bold underline">Booking History</Link> or email our support desk at <a href="mailto:lostandfound@ridenow.in" className="text-[var(--page-accent)] font-bold underline">lostandfound@ridenow.in</a> with your Booking ID. We coordinate directly with the assigned driver partner for safe recovery.
          </p>
        </section>
    </PolicyPage>
  );
}

export const metadata = { title: "Safety and emergency guidance" };
