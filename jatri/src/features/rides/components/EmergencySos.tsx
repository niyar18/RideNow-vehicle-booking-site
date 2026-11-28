"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PhoneCall, Siren } from "lucide-react";

const control = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-semibold leading-snug focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#142238] dark:focus-visible:outline-[#f3f8f6] aria-disabled:opacity-60";
const secondary = `${control} border-[#526478] bg-white text-[#142238] hover:bg-[#eef5f4] dark:border-[#a0b0c1] dark:bg-[#17243a] dark:text-[#f3f8f6] dark:hover:bg-[#263853]`;
export const emergencyAction = secondary;

export function Call112() {
  return <a href="tel:112" className={`${control} border-[#881c30] bg-[#881c30] text-white hover:bg-[#651221] dark:border-[#ffc0c7]`}>
    <PhoneCall size={16} aria-hidden="true" className="shrink-0" /> Call 112
  </a>;
}

const limits = "Jaatri does not contact emergency services or emergency contacts. For immediate help, call 112 directly.";

export function SosStatus({ active }: { active: boolean }) {
  return (
    <div>
      <div role="status" aria-atomic="true">
        {active && (
          <div className="space-y-1">
            <p className="font-bold">SOS active in Jaatri</p>
            <p>{limits}</p>
          </div>
        )}
      </div>
      {active && <div className="mt-2"><Call112 /></div>}
    </div>
  );
}

export function EmergencySosDialog({
  onClose, onRecord, alreadyActive, checkIn, otherAction,
}: {
  onClose: () => void;
  onRecord: () => Promise<void>;
  alreadyActive?: boolean;
  checkIn?: ReactNode;
  otherAction?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const callRef = useRef<HTMLDivElement>(null);
  const title = useId();
  const description = useId();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const isSaving = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement;
    dialog.showModal();
    callRef.current?.querySelector("a")?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected && previouslyFocused !== document.body) {
        previouslyFocused.focus({ preventScroll: true });
      } else {
        Array.from(document.querySelectorAll<HTMLButtonElement>("[data-emergency-options]")).find((button) => button.getClientRects().length)?.focus();
      }
    };
  }, []);

  async function record() {
    if (isSaving.current || alreadyActive || state === "saved") return;
    isSaving.current = true;
    setState("saving");
    try {
      await onRecord();
      setState("saved");
    } catch {
      setState("failed");
    } finally {
      isSaving.current = false;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={title}
      aria-describedby={description}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 z-[9999] m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-auto rounded-xl border border-[#526478] bg-white p-4 text-[#142238] shadow-2xl backdrop:bg-black/70 dark:border-[#a0b0c1] dark:bg-[#17243a] dark:text-[#f3f8f6] sm:p-6"
    >
      <h2 id={title} className="flex items-center gap-2 text-lg font-bold"><Siren size={20} aria-hidden="true" className="shrink-0" /> {checkIn ? "Ride safety check-in" : "Emergency help"}</h2>
      {checkIn && <div className="mt-2 text-sm">{checkIn}</div>}
      <p id={description} className="mb-3 mt-2 text-sm leading-relaxed">{limits}</p>
      <div ref={callRef} className="grid"><Call112 /></div>
      <div role="status" aria-atomic="true" className="mt-2 text-sm leading-relaxed">
        {state === "saving" && "Recording SOS in Jaatri…"}
        {state === "saved" && "SOS recorded in Jaatri."}
        {state === "idle" && alreadyActive && "SOS is already active in Jaatri."}
      </div>
      <div role="alert" aria-atomic="true" className="text-sm font-semibold leading-relaxed">
        {state === "failed" && "Jaatri could not confirm the SOS was recorded. Call 112 directly for immediate help."}
      </div>
      <div className="mt-2 grid gap-2">
        {(!alreadyActive || state !== "idle") && (
          <button type="button" onClick={record} aria-disabled={state === "saving" || state === "saved" || alreadyActive || undefined} className={secondary}>
            {state === "failed" ? "Try recording SOS again" : "Record SOS in Jaatri"}
          </button>
        )}
        {state !== "saving" && state !== "saved" && !alreadyActive && otherAction}
        <button type="button" onClick={onClose} className={secondary}>Close</button>
      </div>
    </dialog>
  );
}

export async function recordRideSos(bookingId: string, fromCheckIn = false) {
  const response = await fetch(`/api/booking/${encodeURIComponent(bookingId)}/${fromCheckIn ? "safety-checkin" : "panic"}`, {
    method: "POST",
    ...(fromCheckIn ? {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger_sos" }),
    } : {}),
  });
  const result = await response.json();
  if (!response.ok || result.incidentRecorded !== true) throw new Error("SOS recording not confirmed");
}
