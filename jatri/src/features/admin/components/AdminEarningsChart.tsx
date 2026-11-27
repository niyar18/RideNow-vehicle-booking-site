"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import styles from "./admin-ui.module.css";

type Earnings = { date: string; earnings: number };
const rupees = new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency", maximumFractionDigits: 2 });

export default function AdminEarningsChart() {
  const [series, setSeries] = useState<Earnings[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    axios.get<{ earnings: Earnings[] }>("/api/admin/earnings", { signal: controller.signal })
      .then(({ data }) => {
        setSeries((data.earnings || []).slice(-7));
        setStatus("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, []);

  const total = series.reduce((sum, day) => sum + day.earnings, 0);
  const max = Math.max(1, ...series.map((day) => day.earnings));
  return (
    <section className={`${styles.panel} ${styles.panelPad}`} aria-label="Daily earnings">
      <div className={styles.sectionTop}>
        <div>
          <h3 className={styles.panelTitle}>Daily earnings</h3>
          <p className={styles.secondary}>Last seven days</p>
        </div>
        {status === "ready" && series.length > 0 && <strong className={styles.weekTotal} aria-label="Weekly total">{rupees.format(total)}</strong>}
      </div>
      {status === "loading" && <p className={styles.secondary} role="status">Loading daily earnings…</p>}
      {status === "error" && <p className={styles.secondary} role="alert">Daily earnings are unavailable.</p>}
      {status === "ready" && !series.length && <p className={styles.secondary}>No daily earnings are recorded.</p>}
      {status === "ready" && series.length > 0 && (
        <ul className={styles.earnBars} aria-label="Earnings for each day">
          {series.map((day, index) => (
            <li key={day.date} className={styles.earnBar} aria-label={`${day.date}, ${rupees.format(day.earnings)}`} title={`${day.date}: ${rupees.format(day.earnings)}`}>
              <span className={styles.earnTrack} aria-hidden="true">
                <span className={`${styles.earnFill} ${index === series.length - 1 ? styles.earnNow : ""}`} style={{ height: `${Math.max(0, day.earnings / max * 100)}%` }} />
              </span>
              <span aria-hidden="true">{day.date}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
