"use client";

import { useEffect, useState } from "react";
import { adminFareFields, validateAdminFareChange, type AdminFareField, type AdminFareRow } from "@/lib/adminFareEditing";
import { calculateFareBreakdown } from "@/lib/fareEngine";
import { fareDistanceLimits } from "@/lib/farePolicy";
import AdminDecisionDialog from "./AdminDecisionDialog";
import styles from "./admin-ui.module.css";

const fields = Object.entries(adminFareFields) as [AdminFareField, (typeof adminFareFields)[AdminFareField]][];
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const label = (id: string) => id === "e-rickshaw" ? "E-rickshaw / Toto" : id.charAt(0).toUpperCase() + id.slice(1);

export function FareControls() {
  const [rows, setRows] = useState<AdminFareRow[]>([]);
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<Partial<Record<AdminFareField, string>>>({});
  const [reason, setReason] = useState("");
  const [distance, setDistance] = useState("10");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [stale, setStale] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const row = rows.find((r) => r.vehicleType === selected) ?? rows[0];
  const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => !value.trim() || Number(value) !== row?.[key as AdminFareField]).map(([key, value]) => [key, value.trim() ? Number(value) : NaN])) as Partial<Record<AdminFareField, number>>;
  const draftRate = row ? { ...row, ...changes } : null;
  const limits = draftRate && fareDistanceLimits(draftRate.vehicleType, { [draftRate.vehicleType]: draftRate });
  const preview = draftRate && limits && distance !== "" && Number(distance) > 0 && Number(distance) >= limits.min && Number(distance) <= limits.max && Object.values(changes).every(Number.isFinite)
    ? calculateFareBreakdown(draftRate.vehicleType, Number(distance), { [draftRate.vehicleType]: draftRate })
    : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/pricing", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Couldn’t load fare rules.");
        const data = await r.json();
        if (!controller.signal.aborted && Array.isArray(data.configs)) setRows(data.configs);
      })
      .catch(() => { if (!controller.signal.aborted) setStatus({ text: "Couldn’t load fare rules.", error: true }); });
    return () => controller.abort();
  }, [attempt]);

  function refresh() {
    setRows([]); setDraft({}); setReason(""); setStatus(null); setStale(false); setAttempt((v) => v + 1);
  }
  async function save() {
    if (!row || busy || stale) return;
    const payload = { vehicleType: row.vehicleType, version: row.version, changes, reason };
    try { validateAdminFareChange(payload, row); }
    catch (error) { setStatus({ text: (error as Error).message, error: true }); return; }
    setBusy(true); setStatus(null);
    try {
      const response = await fetch("/api/admin/pricing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) {
        setStale(response.status === 409);
        throw new Error(data.message || "Couldn’t save fare rules.");
      }
      setRows((items) => items.map((item) => item.vehicleType === row.vehicleType ? data.config : item));
      setDraft({}); setReason(""); setOpen(false);
      setStatus({ text: data.auditRecorded ? "Fare rules saved and recorded in the audit log." : "Fare rules saved, but the audit entry could not be recorded. Check with an administrator." });
    } catch (error) { setStatus({ text: (error as Error).message, error: true }); }
    finally { setBusy(false); }
  }

  return <section className={`${styles.panel} ${styles.panelPad} ${styles.controlPanel}`} aria-labelledby="fare-settings">
    <div className={styles.controlBar}>
      <div><h2 id="fare-settings" className={styles.panelTitle}>Vehicle rates</h2><p className={styles.secondary}>Applies to new quotes. Existing bookings keep their stored fare.</p></div>
      <button type="button" onClick={refresh} className={styles.button} disabled={busy}>Reload rates</button>
    </div>
    {status && !open && <p role={status.error ? "alert" : "status"} className={styles.notice}>{status.text}</p>}
    {!row && !status && <p role="status">Loading fares…</p>}
    {row && <>
      <div className={styles.controlBar}>
        <label>Vehicle class
          <select className={styles.field} value={row.vehicleType} onChange={(e) => { setSelected(e.target.value); setDraft({}); setReason(""); setStatus(null); }}>
            {rows.map((r) => <option key={r.vehicleType} value={r.vehicleType}>{label(r.vehicleType)}</option>)}
          </select>
        </label>
        <label>Preview trip distance (km)
          <input type="number" className={styles.field} min=".1" step=".1" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </label>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setStatus(null); setOpen(true); }}>
        <div className={styles.fareFields}>
          {fields.map(([id, field]) => <label key={id}>{field.label}
            <input type="number" className={styles.field} required min={field.min} max={field.max} step={field.step}
              value={draft[id] ?? row[id]} onChange={(e) => { const value = e.currentTarget.value; setDraft((previous) => ({ ...previous, [id]: value })); }} />
          </label>)}
        </div>
        <div className={styles.controlRow} style={{ marginBlock: 14 }}>
          <h3>Sample quote {preview ? money.format(preview.totalFare) : "unavailable"}</h3>
          <p className={styles.secondary}>{preview ? `Base ${money.format(preview.baseFare)} · Distance ${money.format(preview.distanceFare)} · Platform ${money.format(preview.platformFee)} · Tax ${money.format(preview.taxes)}. Excludes rider-specific discounts and dues.` : `Enter a valid distance${limits ? ` between ${limits.min} and ${limits.max} km` : ""}.`}</p>
        </div>
        <div className={styles.actionRow}>
          <button type="submit" disabled={!Object.keys(changes).length || busy || stale} className={styles.primary}>Review changes</button>
          <button type="button" className={styles.button} disabled={!Object.keys(draft).length} onClick={() => setDraft({})}>Discard edits</button>
        </div>
      </form>
    </>}
    <AdminDecisionDialog open={open} title={`Review ${label(row?.vehicleType ?? "vehicle")} fare changes`} loading={busy}
      confirmLabel="Save rates" confirmDisabled={reason.trim().length < 8 || stale} onClose={() => setOpen(false)} onConfirm={() => void save()}>
      <ul>{Object.entries(changes).map(([key, value]) => <li key={key}>{adminFareFields[key as AdminFareField].label}: {row?.[key as AdminFareField]} → {value}</li>)}</ul>
      <label className={styles.confirmReason}>Reason for the audit log
        <textarea className={styles.field} maxLength={240} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {status?.error && <p role="alert">{status.text}</p>}
    </AdminDecisionDialog>
  </section>;
}
