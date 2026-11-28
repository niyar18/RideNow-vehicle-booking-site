"use client";

import { motion } from "framer-motion";
import { Users, Share2, IndianRupee, UserPlus, Loader2 } from "lucide-react";

interface GroupRideCardProps {
  isGroupRide: boolean;
  effectiveFare: number;
  fare: number;
  groupInviteCode: string | null;
  groupMembers: any[];
  splitFarePerPerson: number | null;
  inviteName: string;
  inviteEmail: string;
  inviting: boolean;
  onToggle: () => void;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onSendInvite: () => void;
}

export default function GroupRideCard({
  isGroupRide,
  effectiveFare,
  fare,
  groupInviteCode,
  groupMembers,
  splitFarePerPerson,
  inviteName,
  inviteEmail,
  inviting,
  onToggle,
  onNameChange,
  onEmailChange,
  onSendInvite,
}: GroupRideCardProps) {
  return (
    <div className="mt-6 border-t border-[#DED7CA]/60 dark:border-[#24483D]/60 pt-6">
      <div className="flex items-center justify-between bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-[14px] p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Group Ride & Split Fare</h4>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Split ₹{effectiveFare} with friends</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          role="switch" aria-checked={isGroupRide} aria-label="Group ride"
          className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 ${
            isGroupRide ? "bg-[#123D32] dark:bg-[#28664D] justify-end" : "bg-[#DED7CA] dark:bg-[#34443A] justify-start"
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white shadow-md" />
        </button>
      </div>

      {isGroupRide && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[14px] p-5 text-[var(--text-primary)] space-y-4"
        >
          {/* Invite Code Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Invite Code</p>
              <p className="text-lg font-black text-[#123D32] dark:text-[#D7AC62] font-mono tracking-widest">
                {groupInviteCode || "GEN123"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") return;
                const codeStr = groupInviteCode || "GEN123";
                const joinUrl = `${window.location.origin}/group/join?code=${codeStr}`;
                navigator.clipboard.writeText(joinUrl);
                alert(`Group invite link copied!\n${joinUrl}`);
              }}
              className="flex items-center gap-1.5 bg-[var(--surface-subtle)] hover:bg-[#EAE4D7] dark:hover:bg-[#25362C] text-[var(--text-primary)] text-xs font-semibold px-3 py-2 rounded-[8px] border border-[var(--border-default)] transition"
            >
              <Share2 size={13} /> Copy Link
            </button>
          </div>

          {/* Dynamic Per-Person Split Banner */}
          <div className="bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-[10px] p-3 text-center">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">
              Split Fare Per Person
            </p>
            <p className="text-2xl font-black text-[#123D32] dark:text-[#D7AC62] flex items-center justify-center gap-0.5 mt-0.5">
              <IndianRupee size={18} /> {splitFarePerPerson || fare}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Total ₹{fare} ÷{" "}
              {Math.max(1, groupMembers.filter((m: any) => m.status !== "declined").length)} members
            </p>
          </div>

          {/* Member List */}
          {groupMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Group Members</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {groupMembers.map((m: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-[var(--surface-subtle)] px-3 py-2 rounded-[8px] text-xs border border-[#DED7CA]/60 dark:border-[#24483D]/60"
                  >
                    <div>
                      <p className="font-bold text-[var(--text-primary)] truncate max-w-[160px]">{m.name}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{m.email}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          m.status === "creator"
                            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                            : m.status === "accepted"
                            ? "bg-blue-500/20 text-blue-800 dark:text-blue-300"
                            : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {m.status}
                      </span>
                      <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">₹{m.shareAmount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite Friend Input */}
          <div className="pt-2 border-t border-[var(--border-default)] space-y-2">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Invite a Friend</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Friend Name"
                value={inviteName}
                onChange={(e) => onNameChange(e.target.value)}
                className="bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs px-3 py-2 rounded-[8px] text-[var(--text-primary)] placeholder-[#929D93] outline-none"
              />
              <input
                type="email"
                placeholder="Friend Email"
                value={inviteEmail}
                onChange={(e) => onEmailChange(e.target.value)}
                className="bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs px-3 py-2 rounded-[8px] text-[var(--text-primary)] placeholder-[#929D93] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onSendInvite}
              disabled={inviting || !inviteEmail || !inviteName}
              className="w-full bg-[#123D32] dark:bg-[#28664D] hover:bg-[#0D3027] dark:hover:bg-[#347858] disabled:opacity-40 text-white font-bold py-2.5 rounded-[8px] text-xs transition flex items-center justify-center gap-1.5"
            >
              {inviting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={14} /> Send Invite
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
