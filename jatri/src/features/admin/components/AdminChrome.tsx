"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminTools } from "./AdminShortcuts";
import { ArrowLeft, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { performFastSignOut } from "@/lib/authLogout";
import styles from "./admin-ui.module.css";

export default function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const nav = [{ key: "dashboard", title: "Overview" }, ...adminTools];
  return (
    <div className={styles.shell}>
      <a href="#admin-content" className={styles.skipLink}>Skip to main content</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/admin/dashboard" className={styles.brand} aria-label="Jaatri Operations">
            <span className={styles.brandGlyph} lang="as" aria-hidden="true">য</span>
            <span className={styles.brandText}>
              Jaatri <small>Operations</small>
            </span>
          </Link>
          <button type="button" className={styles.button} onClick={() => performFastSignOut("/")}>
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
        <nav className={styles.adminNav} aria-label="Admin sections">
          {nav.map(({ key, title }) => {
            const href = `/admin/${key}`;
            return <Link key={key} href={href} aria-current={pathname === href ? "page" : undefined}>{title}</Link>;
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}

export function ReviewIntro({
  eyebrow, title, detail, status,
}: { eyebrow: string; title: string; detail?: string; status?: ReactNode }) {
  return (
    <div className={styles.reviewIntro}>
      <Link href="/admin/dashboard" className={`${styles.reviewBack} ${styles.button}`}>
        <ArrowLeft size={15} aria-hidden="true" /> Review desk
      </Link>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.reviewTitle}>{title}</h1>
        {detail && <p className={styles.reviewMeta}>{detail}</p>}
      </div>
      {status}
    </div>
  );
}
