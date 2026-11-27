"use client";

import { useState, useRef, useEffect } from "react";
import { Users, User, UserPlus, Check, X, Phone, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FamilyRiderSelectorProps {
  familyAccount: any;
  selectedFamilyMember: any;
  onSelectRider: (member: any | null) => void;
  onAddNewContact: (member: { name: string; phone: string; relation: string; saveForFuture: boolean }) => Promise<void>;
  userData: any;
}

export default function FamilyRiderSelector({
  familyAccount,
  selectedFamilyMember,
  onSelectRider,
  onAddNewContact,
  userData,
}: FamilyRiderSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Friend");
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = phone.replace(/\D/g, "");
    if (!name.trim()) {
      setError("Please enter contact name");
      return;
    }
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      await onAddNewContact({
        name: name.trim(),
        phone: cleaned.slice(-10),
        relation,
        saveForFuture,
      });
      setName("");
      setPhone("");
      setShowModal(false);
      setDropdownOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to add contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#FAF7F0] hover:bg-[#F7F1E5] dark:bg-[#0B2822] dark:hover:bg-[#143D32] text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-default)] cursor-pointer"
      >
        <Users size={14} className="text-[#046A38] dark:text-[#347858]" />
        <span>
          {selectedFamilyMember ? `For: ${selectedFamilyMember.name}` : "For Me"}
        </span>
      </button>

      {dropdownOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[10px] shadow-xl p-2 z-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-3 py-1.5">
            Who is riding?
          </p>

          <button
            type="button"
            onClick={() => {
              onSelectRider(null);
              setDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs font-semibold transition cursor-pointer ${
              !selectedFamilyMember ? "bg-[#046A38] text-white" : "hover:bg-[#EFE9DC]/60 dark:hover:bg-[#143D32] text-[var(--text-primary)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <User size={14} />
              <span>For Myself ({userData?.name || "Me"})</span>
            </div>
            {!selectedFamilyMember && <Check size={14} />}
          </button>

          {familyAccount?.members?.map((m: any, idx: number) => {
            const active = selectedFamilyMember?.phone === m.phone;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectRider(m);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs font-semibold transition mt-1 cursor-pointer ${
                  active ? "bg-[#046A38] text-white" : "hover:bg-[#EFE9DC]/60 dark:hover:bg-[#143D32] text-[var(--text-primary)]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">👨👩👧</span>
                  <div className="text-left truncate">
                    <p className="truncate font-bold leading-tight">{m.name}</p>
                    <p className="text-[10px] opacity-70 leading-tight">{m.relation}</p>
                  </div>
                </div>
                {active && <Check size={14} />}
              </button>
            );
          })}

          <div className="border-t border-zinc-100 mt-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(true);
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition"
            >
              <UserPlus size={14} />
              <span>Book for Someone Else</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                    <UserPlus size={16} />
                  </div>
                  <h3 className="text-sm font-black text-zinc-900">Book for Family / Friend</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Passenger Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mom, Rahul, Priya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Relation
                  </label>
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 bg-white"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveFuture"
                    checked={saveForFuture}
                    onChange={(e) => setSaveForFuture(e.target.checked)}
                    className="rounded text-zinc-900 focus:ring-0"
                  />
                  <label htmlFor="saveFuture" className="text-xs text-zinc-600 font-medium">
                    Save contact for future rides
                  </label>
                </div>

                {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Select Passenger"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
