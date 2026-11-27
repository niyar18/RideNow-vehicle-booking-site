"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./admin-ui.module.css";

export default function AdminDecisionDialog({
  open, title, children, loading, confirmLabel, destructive, confirmDisabled, onClose, onConfirm,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  loading?: boolean;
  confirmLabel: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const labelId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (open && el && !el.open) el.showModal();
    if (!open && el?.open) el.close();
    return () => { if (el?.open) el.close(); };
  }, [open]);

  return (
    <dialog ref={dialog} aria-labelledby={labelId} className={`${styles.dialog} ${styles.nativeDialog}`}
      onCancel={(event) => { event.preventDefault(); if (!loading) onClose(); }}>
      <h2 id={labelId}>{title}</h2>
      {children}
      <div className={styles.dialogButtons}>
        <button autoFocus type="button" className={styles.button} disabled={loading} onClick={onClose}>Cancel</button>
        <button type="button" className={destructive ? styles.danger : styles.primary} disabled={loading || confirmDisabled} onClick={onConfirm}>
          {loading ? "Processing…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
