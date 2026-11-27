import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import styles from "./public-page.module.css";

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}

export function PublicHeading({
  label, title, children, side,
}: { label: string; title: ReactNode; children: ReactNode; side?: ReactNode }) {
  return (
    <header className={styles.heading}>
      <div>
        <p className={styles.kicker}>{label}</p>
        <h1>{title}</h1>
        <div className={styles.deck}>{children}</div>
      </div>
      {side ? <div className={styles.headingSide}>{side}</div> : null}
    </header>
  );
}

export function PublicLink({ href, children, muted = false }: {
  href: string; children: ReactNode; muted?: boolean;
}) {
  return (
    <Link href={href} className={muted ? styles.textLink : styles.action}>
      {children}<ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}
