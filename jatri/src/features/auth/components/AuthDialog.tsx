"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { MotionConfig } from "framer-motion";
import { X } from "lucide-react";
import styles from "./auth-dialog.module.css";

const tabStops = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex='0']";

export default function AuthDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  phoneLink = false,
  focusKey,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  phoneLink?: boolean;
  focusKey?: string;
}) {
  const titleId = useId();
  const subtitleId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => dialog.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, focusKey]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        className={`${styles.overlay} ${phoneLink ? styles.phoneOverlay : ""}`}
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitle ? subtitleId : undefined}
          tabIndex={-1}
          className={styles.dialog}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onClose();
              return;
            }
            if (event.key !== "Tab") return;
            const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(tabStops))
              .filter((item) => item.tabIndex >= 0 && item.getClientRects().length > 0);
            const first = items.at(0);
            const last = items.at(-1);
            if (!first || !last) {
              event.preventDefault();
              return;
            }
            const active = document.activeElement;
            if (event.shiftKey && (active === first || active === event.currentTarget)) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && (active === last || active === event.currentTarget)) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
          <header className={styles.header}>
            <p className={styles.wordmark}>Jaatri <span lang="as">যাত্ৰী</span></p>
            <h2 className={styles.title} id={titleId}>{title}</h2>
            {subtitle && <p className={styles.muted} id={subtitleId}>{subtitle}</p>}
          </header>
          {children}
        </div>
      </div>
    </MotionConfig>,
    document.body,
  );
}
