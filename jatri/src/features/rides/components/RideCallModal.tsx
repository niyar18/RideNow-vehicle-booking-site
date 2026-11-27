"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, PhoneOff, PhoneCall } from "lucide-react";

interface RideCallModalProps {
  callState: "idle" | "calling" | "incoming" | "connected";
  remoteUserLabel: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
  callDurationSeconds?: number;
}

export default function RideCallModal({
  callState,
  remoteUserLabel,
  isMuted,
  onToggleMute,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  callDurationSeconds = 0,
}: RideCallModalProps) {
  if (callState === "idle") return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl"
        >
          {/* Avatar pulse */}
          <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-emerald-500/20"
            />
            <div className="w-16 h-16 rounded-full bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <PhoneCall size={28} />
            </div>
          </div>

          <h3 className="text-white text-lg font-black mb-1">{remoteUserLabel}</h3>

          <p className="text-xs text-zinc-400 mb-6">
            {callState === "calling" && "Calling driver..."}
            {callState === "incoming" && "Incoming in-ride call..."}
            {callState === "connected" && (
              <span className="text-emerald-400 font-bold">{formatDuration(callDurationSeconds)}</span>
            )}
          </p>

          {/* Action buttons */}
          {callState === "incoming" ? (
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={onRejectCall}
                className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform"
              >
                <PhoneOff size={22} />
              </button>
              <button
                type="button"
                onClick={onAcceptCall}
                className="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform"
              >
                <PhoneCall size={22} />
              </button>
            </div>
          ) : (
            <div className="flex gap-4 justify-center items-center">
              {callState === "connected" && (
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    isMuted
                      ? "bg-amber-500 text-zinc-950 font-bold"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
              <button
                type="button"
                onClick={onEndCall}
                className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
