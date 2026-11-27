import Link from "next/link";
import { ArrowUpRight, ClipboardList, GraduationCap, IndianRupee, ShieldAlert, Wallet, type LucideIcon } from "lucide-react";
import styles from "./admin-ui.module.css";

export const adminTools = [
  { key: "pricing", title: "Fare rules", description: "Update vehicle tariffs, tax and distance limits.", icon: IndianRupee },
  { key: "students", title: "Student reviews", description: "Review enrollment evidence and decide applications.", icon: GraduationCap },
  { key: "safety", title: "Safety incidents", description: "Triage reports without clearing an active alert.", icon: ShieldAlert },
  { key: "withdrawals", title: "Withdrawals", description: "Check payout status without exposing bank details.", icon: Wallet },
  { key: "activity", title: "Audit log", description: "See who changed what, when and why.", icon: ClipboardList },
] satisfies { key: string; title: string; description: string; icon: LucideIcon }[];

export function AdminShortcuts() {
  return <section aria-labelledby="admin-tools-title">
    <div className={styles.sectionTop}>
      <div><p className={styles.eyebrow}>Control center</p><h2 className={styles.sectionTitle} id="admin-tools-title">Manage Jaatri</h2></div>
    </div>
    <ul className={styles.toolsGrid}>
      {adminTools.map(({ key, title, description, icon: Icon }) => <li key={key}>
        <Link className={styles.toolCard} href={`/admin/${key}`}>
          <Icon size={20} aria-hidden="true" className={styles.toolIcon} />
          <strong>{title}</strong>
          <span className={styles.secondary}>{description}</span>
          <ArrowUpRight size={16} aria-hidden="true" className={styles.toolArrow} />
        </Link>
      </li>)}
    </ul>
  </section>;
}
