import styles from "./admin-ui.module.css";

type Stats = { approved: number; pending: number; rejected: number };

const statuses = [
  { key: "approved", label: "Approved", tone: styles.chartApproved },
  { key: "pending", label: "Pending", tone: styles.chartPending },
  { key: "rejected", label: "Rejected", tone: styles.chartRejected },
] as const;

export default function AdminStatusChart({ stats }: { stats: Stats | null }) {
  const total = stats ? statuses.reduce((sum, status) => sum + stats[status.key], 0) : 0;
  return (
    <section className={`${styles.panel} ${styles.panelPad}`} aria-label="Application status">
      <h3 className={styles.panelTitle}>Application status</h3>
      <p className={styles.secondary}>{stats ? `${total.toLocaleString("en-IN")} classified applications` : "Vendor data not loaded."}</p>
      <div className={styles.distribution} aria-hidden="true">
        {stats && total > 0 && statuses.map(({ key, tone }) => <span key={key} className={tone} style={{ flex: stats[key] }} />)}
      </div>
      <ul className={styles.distributionList}>
        {statuses.map(({ key, label, tone }) => {
          const count = stats?.[key];
          return (
            <li className={styles.distributionRow} key={key}>
              <span><span className={`${styles.legendDot} ${tone}`} aria-hidden="true" />{label}</span>
              <strong>{count?.toLocaleString("en-IN") ?? "—"}</strong>
              <span>{count === undefined ? "—" : `${total ? Math.round(count / total * 100) : 0}%`}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
