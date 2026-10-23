"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users, MapPin, Navigation, IndianRupee,
  CheckCircle2, ArrowRight, Loader2, AlertCircle, Share2
} from "lucide-react";

function GroupJoinContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [code, setCode] = useState(params.get("code") || "");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinResult, setJoinResult] = useState<any>(null);

  const handleJoinGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code || code.trim().length < 4) {
      setError("Please enter a valid 6-character invite code");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/booking/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase(), action: "accept" }),
      });

      const data = await res.json();
      if (data.success && data.booking) {
        setJoinResult(data);
        setJoined(true);
      } else {
        throw new Error(data.message || "Failed to join group ride");
      }
    } catch (err: any) {
      setError(err.message || "Invalid invite code or network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get("code")) {
      handleJoinGroup();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F1E5] text-[#10251C] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#FAF7F0] border border-[#DED7CA] w-full max-w-md rounded-[14px] p-6 sm:p-8 shadow-md relative overflow-hidden"
      >
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-[10px] bg-[#E5EBDD] border border-[#cdd6c3] flex items-center justify-center text-[#123D32] mx-auto mb-4">
          <Users size={28} />
        </div>

        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#10251C]">Join Group Ride</h1>
          <p className="text-[#696B64] text-xs sm:text-sm mt-1">Split the trip fare automatically with friends</p>
        </div>

        {!joined ? (
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label className="block text-[#10251C] text-[11px] uppercase tracking-wider font-bold mb-2 text-center">
                6-Digit Invite Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                className="w-full bg-white border border-[#DED7CA] focus:border-[#123D32] text-[#10251C] font-mono font-bold text-center text-2xl tracking-widest uppercase py-3 rounded-[8px] outline-none transition shadow-2xs"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-[#faebe8] border border-[#f0c8c1] text-[#782313] p-3 rounded-[8px] text-xs font-semibold">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.trim().length < 4}
              className="w-full bg-[#123D32] hover:bg-[#0D3027] active:scale-95 disabled:opacity-50 text-white font-bold py-3.5 rounded-[8px] text-sm transition shadow-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <span>Join Ride & Split Fare</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-[#E5EBDD] border border-[#cdd6c3] p-4 rounded-[10px] text-center">
              <CheckCircle2 size={32} className="text-[#123D32] mx-auto mb-1.5" />
              <h2 className="text-[#10251C] font-bold text-base">You&apos;ve Joined the Group!</h2>
              <p className="text-[#123D32] text-xs mt-0.5">Your share of the fare has been updated.</p>
            </div>

            {/* Split Fare Card */}
            <div className="bg-white border border-[#DED7CA] rounded-[10px] p-5 text-center shadow-2xs">
              <p className="text-[#696B64] text-[10px] uppercase tracking-wider font-bold mb-1">Your Split Share</p>
              <div className="text-3xl font-bold text-[#123D32] flex items-center justify-center gap-1 font-mono">
                <IndianRupee size={24} /> {joinResult.splitFarePerPerson}
              </div>
              <p className="text-[#696B64] text-xs mt-1.5 font-medium">
                Total trip fare: ₹{joinResult.booking.fare} ÷ {joinResult.memberCount} people
              </p>
            </div>

            {/* Route Summary */}
            <div className="bg-white border border-[#DED7CA] rounded-[10px] p-4 space-y-2.5 shadow-2xs">
              <div className="flex gap-2.5 items-center">
                <MapPin size={15} className="text-[#123D32] flex-shrink-0" />
                <p className="text-xs text-[#10251C] truncate">{joinResult.booking.pickupAddress}</p>
              </div>
              <div className="h-px bg-[#DED7CA]/60" />
              <div className="flex gap-2.5 items-center">
                <Navigation size={15} className="text-[#E34222] flex-shrink-0" />
                <p className="text-xs text-[#10251C] truncate">{joinResult.booking.dropAddress}</p>
              </div>
            </div>

            <button
              type="button"
              disabled={!joinResult.booking.shareToken}
              onClick={() => {
                const token = joinResult.booking.shareToken;
                if (typeof token === "string" && token.trim()) {
                  router.push(`/track/${token}`);
                }
              }}
              className="w-full bg-[#123D32] hover:bg-[#0D3027] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-[8px] text-sm transition flex items-center justify-center gap-2 shadow-xs"
            >
              <span>{joinResult.booking.shareToken ? "Track Group Ride Live" : "Live tracking unavailable"}</span>
              <Share2 size={15} />
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function GroupJoinPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-[#F7F1E5] flex items-center justify-center text-[#10251C] text-xs uppercase font-semibold">
        Loading Group Join…
      </div>
    }>
      <GroupJoinContent />
    </Suspense>
  );
}
