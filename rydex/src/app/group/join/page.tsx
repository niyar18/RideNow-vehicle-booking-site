"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-5">
          <Users size={32} />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white">Join Group Ride</h1>
          <p className="text-zinc-400 text-xs mt-1">Split the fare automatically with friends</p>
        </div>

        {!joined ? (
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase tracking-widest font-semibold mb-2">
                6-Digit Invite Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-white font-mono font-bold text-center text-2xl tracking-widest uppercase py-3.5 rounded-2xl outline-none transition"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.trim().length < 4}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  Join Ride & Split Fare <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-2" />
              <h2 className="text-white font-bold text-base">You've Joined the Group!</h2>
              <p className="text-emerald-300 text-xs mt-0.5">Your share of the fare has been updated.</p>
            </div>

            {/* Split Fare Card */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-center">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-1">Your Split Share</p>
              <div className="text-4xl font-black text-emerald-400 flex items-center justify-center gap-1">
                <IndianRupee size={28} /> {joinResult.splitFarePerPerson}
              </div>
              <p className="text-zinc-400 text-xs mt-2 font-medium">
                Total trip fare: ₹{joinResult.booking.fare} ÷ {joinResult.memberCount} people
              </p>
            </div>

            {/* Route Summary */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex gap-3 items-center">
                <MapPin size={16} className="text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-zinc-300 truncate">{joinResult.booking.pickupAddress}</p>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex gap-3 items-center">
                <Navigation size={16} className="text-white flex-shrink-0" />
                <p className="text-xs text-zinc-300 truncate">{joinResult.booking.dropAddress}</p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/track/${joinResult.booking.shareToken || joinResult.booking._id}`)}
              className="w-full bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-3.5 rounded-2xl text-sm transition flex items-center justify-center gap-2"
            >
              Track Group Ride Live <Share2 size={15} />
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
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center text-white text-xs uppercase font-semibold">
        Loading Group Join…
      </div>
    }>
      <GroupJoinContent />
    </Suspense>
  );
}
