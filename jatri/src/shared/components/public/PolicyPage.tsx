import type { ReactNode } from "react";
import Link from "next/link";
import { PublicHeading, PublicPage } from "./PublicPage";
import styles from "./public-page.module.css";

const policies = [
  ["Safety", "/safety"],
  ["Terms and conditions", "/terms"],
  ["Privacy", "/privacy"],
  ["Cookies", "/cookies"],
  ["Cancellations & refunds", "/cancellation-refund"],
  ["Payment terms", "/payment-terms"],
  ["Driver partner terms", "/partner-terms"],
  ["Grievances", "/grievance"],
] as const;

function PolicyLinks({ current }: { current: string }) {
  return policies.map(([label, href]) => (
    <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>
      {label}
    </Link>
  ));
}

export default function PolicyPage({
  current, label, title, description, metadata, children,
}: {
  current: string; label: string; title: string;
  description: ReactNode; metadata?: ReactNode; children: ReactNode;
}) {
  return (
    <PublicPage>
      <PublicHeading label={label} title={title}>
        <p>{description}</p>
        {metadata ? <div className={styles.docsMeta}>{metadata}</div> : null}
      </PublicHeading>
      <div className={styles.docsLayout}>
        <nav aria-label="Related policies" className={styles.docsSidebar}>
          <p className={styles.kicker}>Rider information</p>
          <PolicyLinks current={current} />
        </nav>
        <article className={styles.docsContent}>{children}</article>
        <details className={styles.docsMobile}>
          <summary>Related policies</summary>
          <nav aria-label="Related policies"><PolicyLinks current={current} /></nav>
        </details>
      </div>
    </PublicPage>
  );
}
