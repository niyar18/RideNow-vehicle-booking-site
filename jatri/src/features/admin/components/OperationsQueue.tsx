"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import AdminDecisionDialog from "./AdminDecisionDialog";
import styles from "./admin-ui.module.css";

const configs = {
  students: { endpoint: "/api/admin/students", key: "students", filter: "status", options: ["pending", "verified", "rejected", "expired", "all"], page: true },
  safety: { endpoint: "/api/admin/safety/incidents", key: "incidents", filter: "status", options: ["active", "investigating", "resolved", "false_alarm", "all"], page: false },
  withdrawals: { endpoint: "/api/admin/withdrawals", key: "withdrawals", filter: "status", options: ["pending", "processing", "success", "failed", "reversed", "all"], page: false },
  activity: { endpoint: "/api/admin/audit-logs", key: "logs", filter: "targetType", options: ["all", "PRICING", "USER", "SAFETY_INCIDENT", "VENDOR", "VEHICLE", "WALLET", "WITHDRAWAL"], page: true },
} as const;
export type QueueSection = keyof typeof configs;
type Student = { status?: string; institutionName?: string; verificationMethod?: string; studentName?: string; documentUrl?: string; documentType?: string; untrustedDocument?: boolean; submittedAt?: string; rejectionReason?: string };
type RecordRow = {
  _id: string; type?: string; name?: string; status?: string; severity?: string; description?: string;
  incidentId?: string; withdrawalId?: string; amount?: number; driver?: { name?: string };
  studentVerification?: Student; action?: string; targetId?: string; targetType?: string;
  admin?: { name?: string }; reason?: string; createdAt?: string; beforeState?: Record<string, unknown>; afterState?: Record<string, unknown>;
  booking?: { isPanicActive?: boolean };
};
type Decision = { kind: "approve" | "reject" | "investigate"; id: string; subject: string };
const text = (value?: string) => {
  const clean = (value || "Unavailable").replaceAll("_", " ").toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};
const date = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)) + " IST" : "Date unavailable";
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const simple = (v: unknown) => typeof v === "string" || typeof v === "boolean" || typeof v === "number" ? String(v) : "—";

export function OperationsQueue({ section }: { section: QueueSection }) {
  const { endpoint, key, filter, options, page: hasPages } = configs[section];
  const [selection, setSelection] = useState<string>(options[0]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [total, setTotal] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [confirmedEvidence, setConfirmedEvidence] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedStatus = selection as string;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), limit: hasPages ? "18" : "50" });
    if (selectedStatus !== "all" || section === "students") query.set(filter, selectedStatus);
    fetch(`${endpoint}?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data[key])) throw new Error("Unable to load this queue");
        if (!controller.signal.aborted) {
          setRows(data[key]); setTotal(Math.max(1, data.pagination?.pages ?? data.pagination?.totalPages ?? 1)); setLoadError(false);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt, endpoint, filter, hasPages, key, page, section, selectedStatus]);

  function refresh() { setLoadError(false); setLoading(true); setAttempt((n) => n + 1); }
  function choose(next: Decision) { setReason(""); setError(""); setConfirmedEvidence(false); setDecision(next); }
  async function submit() {
    if (!decision || busy || reason.trim().length < 8 || (decision.kind === "approve" && !confirmedEvidence)) return;
    setBusy(true); setError(""); setNotice("");
    const { kind, id } = decision;
    try {
      const endpoint = kind === "investigate" ? configs.safety.endpoint : `/api/admin/students/${encodeURIComponent(id)}/${kind}`;
      const response = await fetch(endpoint, {
        method: kind === "investigate" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "investigate" ? { incidentId: id, reason } : { reason }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Couldn’t save this decision.");
      setDecision(null);
      setNotice(data.auditRecorded ? "Decision saved and recorded in the audit log." : "Decision saved, but the audit entry could not be recorded.");
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      refresh();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  return <section aria-label="Management queue" className={`${styles.panel} ${styles.panelPad} ${styles.controlPanel}`}>
    <div className={styles.controlBar}>
      <label>{section === "activity" ? "Target type" : "Status"}
        <select className={styles.field} value={selection} onChange={(e) => {
          setSelection(e.target.value); setPage(1); setLoading(true); setLoadError(false); setNotice("");
        }}>
          {options.map((option) => <option key={option} value={option}>{text(option)}</option>)}
        </select>
      </label>
      <button type="button" className={styles.button} onClick={refresh} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
    </div>
    {section === "withdrawals" && <p className={styles.secondary}>Latest 50 matching requests. This screen does not send, settle, or reverse funds.</p>}
    {section === "safety" && <p className={styles.secondary}>Latest 50 matching reports. Taking an incident into investigation does not close it or clear an SOS alert.</p>}
    {loadError && <p role="alert" className={styles.notice}>Couldn’t load these records. Refresh to try again.</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {loading && <p role="status">Loading records…</p>}
    {!loading && !loadError && (rows.length ? <ul className={styles.controlRows}>{rows.map((row) =>
      <li key={row._id} className={styles.controlRow}>
        {section === "students" && <>
          <h3>{row.studentVerification?.studentName || row.name || "Student application"}</h3>
          <p className={styles.secondary}>{row.studentVerification?.institutionName || "Institution unavailable"} · {text(row.studentVerification?.verificationMethod)} · {text(row.studentVerification?.status)}</p>
          <p className={styles.secondary}>{date(row.studentVerification?.submittedAt)}</p>
          {row.studentVerification?.documentUrl && <a className={styles.button} href={row.studentVerification.documentUrl} target="_blank" rel="noopener noreferrer">View uploaded document (new tab)</a>}
          {row.studentVerification?.untrustedDocument && <p className={styles.secondary}>The submitted document link is outside trusted storage. Verify it independently.</p>}
          {row.studentVerification?.rejectionReason && <p className={styles.secondary}>Decision reason: {row.studentVerification.rejectionReason}</p>}
          {row.studentVerification?.status === "pending" && <div className={styles.actionRow}>
            <button className={styles.primary} type="button" onClick={() => choose({ kind: "approve", id: row._id, subject: row.name || "this student" })}>Approve</button>
            <button className={styles.button} type="button" onClick={() => choose({ kind: "reject", id: row._id, subject: row.name || "this student" })}>Reject</button>
          </div>}
        </>}
        {section === "safety" && <>
          <h3>{text(row.type)} · {text(row.severity)}</h3>
          <p className={styles.secondary}>{text(row.status)} · {row.incidentId} · {date(row.createdAt)}</p>
          {row.description && <p>{row.description}</p>}
          {row.booking?.isPanicActive && <strong>Active SOS on this ride</strong>}
          {row.status === "active" && row.incidentId && <button className={styles.button} type="button" onClick={() => choose({ kind: "investigate", id: row.incidentId!, subject: row.incidentId! })}>Mark investigating</button>}
        </>}
        {section === "withdrawals" && <>
          <h3>{typeof row.amount === "number" ? money.format(row.amount) : "Amount unavailable"} · {text(row.status)}</h3>
          <p className={styles.secondary}>{row.driver?.name || "Driver unavailable"} · {row.withdrawalId} · {date(row.createdAt)}</p>
        </>}
        {section === "activity" && <>
          <h3>{text(row.action)}</h3>
          <p className={styles.secondary}>{row.admin?.name || "Administrator"} · {text(row.targetType)} · {row.targetId} · {date(row.createdAt)}</p>
          {row.reason && <p>{row.reason}</p>}
          {(row.beforeState || row.afterState) && <details>
            <summary>View changes</summary>
            <dl>{Object.keys({ ...row.beforeState, ...row.afterState }).map((key) => <div key={key} style={{ display: "contents" }}>
              <dt>{key}</dt><dd>{simple(row.beforeState?.[key])} → {simple(row.afterState?.[key])}</dd>
            </div>)}</dl>
          </details>}
        </>}
      </li>)}</ul> : <p className={styles.notice}>No records match this filter.</p>)}
    {hasPages && !loadError && total > 1 && <div className={styles.actionRow}>
      <button type="button" className={styles.button} disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((p) => p - 1); }}>Previous</button>
      <span>Page {page} of {total}</span>
      <button type="button" className={styles.button} disabled={page >= total || loading} onClick={() => { setLoading(true); setPage((p) => p + 1); }}>Next</button>
    </div>}
    <AdminDecisionDialog open={decision !== null} title={`${decision?.kind === "investigate" ? "Investigate" : decision?.kind === "approve" ? "Approve" : "Reject"} ${decision?.subject ?? "record"}`}
      loading={busy} confirmLabel="Confirm decision" destructive={decision?.kind === "reject"} onClose={() => setDecision(null)}
      confirmDisabled={reason.trim().length < 8 || (decision?.kind === "approve" && !confirmedEvidence)} onConfirm={() => void submit()}>
      {decision?.kind === "approve" && <label className={styles.confirmReason}>
        <span><input type="checkbox" checked={confirmedEvidence} onChange={(e) => setConfirmedEvidence(e.target.checked)} /> I reviewed the enrollment evidence.</span>
      </label>}
      {decision?.kind === "reject" && <p className={styles.secondary}>The student will see this reason.</p>}
      <label className={styles.confirmReason}>Reason for this decision
        <textarea value={reason} maxLength={240} className={styles.field} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
    </AdminDecisionDialog>
  </section>;
}
