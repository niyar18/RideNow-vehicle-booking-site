"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import ReferralShareCard from "@/features/referral/components/ReferralShareCard";
import AuthModal from "@/features/auth/components/AuthModal";
import {
  Gift,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Users,
  Compass,
} from "lucide-react";

function ReferralContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [urlCode, setUrlCode] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setUrlCode(code.toUpperCase());
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F7F1E5] dark:bg-[#071E18] text-[#10251C] dark:text-[#F7F5ED] flex flex-col font-sans">
      <Nav />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#046A38]/10 text-[#046A38] dark:text-[#52B788] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Jaatri Rewards Club
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#10251C] dark:text-[#F7F5ED]">
            Invite Friends &amp; Ride for Less
          </h1>
          <p className="text-sm sm:text-base text-[#5C6F64] dark:text-[#8FA89B] max-w-xl mx-auto">
            Give your friends ₹30 off their first ride, and earn ₹50 in your Jaatri wallet when they complete their first trip.
          </p>
        </div>

        {/* Guest View Banner if not logged in */}
        {status === "unauthenticated" && (
          <div className="bg-[#FAF7F0] dark:bg-[#10251C] border border-[#E5DEC9] dark:border-[#1E3A2F] rounded-[14px] p-6 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#046A38]/10 text-[#046A38] dark:text-[#52B788] flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#10251C] dark:text-[#F7F5ED]">
                {urlCode ? `Claim ₹30 with Invite Code ${urlCode}` : "Sign In to Access Your Referral Code"}
              </h2>
              <p className="text-xs sm:text-sm text-[#5C6F64] dark:text-[#8FA89B] mt-1 max-w-md mx-auto">
                Sign in with your phone or email to claim discount codes and start earning referral rewards on every ride.
              </p>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] bg-[#046A38] hover:bg-[#03542C] text-white text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer min-h-[44px]"
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
        <div className="bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#24483D] rounded-[14px] p-5 sm:p-6 space-y-4">
          <h3 className="text-sm sm:text-base font-bold font-serif text-[#10251C] dark:text-[#F7F5ED] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#046A38] dark:text-[#52B788]" />
            Referral Programme Guidelines
          </h3>
          <ul className="text-xs text-[#5C6F64] dark:text-[#8FA89B] space-y-2 list-disc list-inside">
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
        <div className="min-h-screen bg-[#F7F1E5] flex items-center justify-center">
          <div className="text-xs text-[#5C6F64]">Loading rewards...</div>
        </div>
      }
    >
      <ReferralContent />
    </Suspense>
  );
}
