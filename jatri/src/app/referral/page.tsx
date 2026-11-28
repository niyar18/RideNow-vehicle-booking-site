"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import RiderPageHead from "@/features/rider/components/RiderPageHead";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import ReferralShareCard from "@/features/referral/components/ReferralShareCard";
import AuthModal from "@/features/auth/components/AuthModal";
import {
  Gift,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

function ReferralContent() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [urlCode, setUrlCode] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setUrlCode(code.toUpperCase());
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col font-sans">
      <Nav />

      <main tabIndex={-1} className="mx-auto w-full max-w-[57rem] flex-1 space-y-6 px-4 pb-16 pt-24 sm:px-7 sm:pt-28">
        <RiderPageHead section="Invite a friend"
          title="Good rides are worth sharing"
          description="Give a friend ₹30 off their first ride and earn ₹50 in Jaatri Cash when they complete it."
        />

        {/* Guest View Banner if not logged in */}
        {status === "unauthenticated" && (
          <div className="bg-[var(--surface-raised)] border border-[#E5DEC9] dark:border-[#1E3A2F] rounded-[14px] p-6 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#213650]/10 text-[#213650] dark:text-[#91f2ce] flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {urlCode ? `Claim ₹30 with Invite Code ${urlCode}` : "Sign In to Access Your Referral Code"}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                Sign in with your phone or email to claim discount codes and start earning referral rewards on every ride.
              </p>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] bg-[#213650] hover:bg-[#03542C] text-white text-sm font-bold transition cursor-pointer min-h-[44px]"
            >
              <span>Sign In to Claim</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Authenticated Dashboard */}
        {status === "authenticated" && (
          <div className="space-y-6">
            <ReferralShareCard />
          </div>
        )}

        {/* Rules & Transparency Section */}
        <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#213650] dark:text-[#91f2ce]" />
            Referral Programme Guidelines
          </h3>
          <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc list-inside">
            <li>
              <strong>New User Benefit:</strong> ₹30 discount applies automatically at checkout on the referee&apos;s first ride with a minimum fare of ₹100.
            </li>
            <li>
              <strong>Referrer Payout:</strong> ₹50 wallet credit is automatically issued to the referrer upon referee trip completion.
            </li>
            <li>
              <strong>Monthly Cap:</strong> Maximum of 5 successful rewarded referrals per referrer each calendar month (IST).
            </li>
            <li>
              <strong>Code Validity:</strong> Referral invitation codes remain valid for 30 days from generation.
            </li>
            <li>
              <strong>Credit Expiry:</strong> Issued wallet promotional credits remain valid for 90 days.
            </li>
            <li>
              <strong>Fair Usage:</strong> Self-referrals and accounts created on the same device are strictly prohibited. Promo discounts cannot be stacked with Student Pass concessions.
            </li>
          </ul>
        </div>
      </main>

      {showAuthModal && <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      <Footer />
    </div>
  );
}

export default function ReferralPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#e8f2ef] flex items-center justify-center">
          <div className="text-xs text-[#5C6F64]">Loading rewards...</div>
        </div>
      }
    >
      <ReferralContent />
    </Suspense>
  );
}
