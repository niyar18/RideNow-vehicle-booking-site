"use client";

import {
  ArrowRight, CheckCircle2, Clock, RefreshCw, Truck, Users, Video, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import AdminEarningsChart from "@/features/admin/components/AdminEarningsChart";
import StatusAreaChart from "@/features/admin/components/AdminStatusChart";
import styles from "@/features/admin/components/admin-ui.module.css";
import { AdminShortcuts } from "@/features/admin/components/AdminShortcuts";

type Stats = { totalVendors: number; approved: number; pending: number; rejected: number };
type Tab = "kyc" | "vendor" | "vehicle";

type QueueItem = {
  _id: string;
  name?: string;
  email?: string;
  ownerName?: string;
  ownerEmail?: string;
  vehicleType?: string;
  videoKycStatus?: string;
  videoKycRoomId?: string;
};
type Dashboard = { stats: Stats; pendingVendors: QueueItem[]; pendingVehicles: QueueItem[] };

const tabs = [
  { key: "kyc", label: "Video KYC", icon: Video },
  { key: "vendor", label: "Vendors", icon: Users },
  { key: "vehicle", label: "Vehicles", icon: Truck },
] as const;

const kpis = [
  { key: "totalVendors", label: "Total vendors", icon: Users },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "rejected", label: "Rejected", icon: XCircle },
] as const;

export default function AdminDashboardClient() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [videoReviews, setVideoReviews] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("kyc");
  const [request, setRequest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal, headers: { "Cache-Control": "no-cache" } };
    Promise.all([
      axios.get<Dashboard>("/api/admin/dashboard", options),
      axios.get<QueueItem[]>("/api/admin/vendors/video-kyc/pending", options),
    ]).then(([data, video]) => {
      setDashboard(data.data);
      setVideoReviews(video.data || []);
      setLoadError(false);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [request]);

  const data = {
    kyc: videoReviews,
    vendor: dashboard?.pendingVendors || [],
    vehicle: dashboard?.pendingVehicles || [],
  };
  const hasSnapshot = dashboard !== null;

  function refresh() {
    setLoading(true);
    setLoadError(false);
    setRequest((n) => n + 1);
  }

  return (
    <main id="admin-content" tabIndex={-1} className={styles.content}>
      <section className={styles.hero} aria-labelledby="admin-page-title">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Jaatri &nbsp;/&nbsp; operations</p>
          <h1 id="admin-page-title" className={styles.title}>Operations dashboard</h1>
          <p className={styles.introText}>See what needs attention, review applications and get to the settings that affect daily service.</p>
        </div>
        <div className={styles.heroArtwork} aria-hidden="true">
          <svg viewBox="0 0 240 105" fill="none" preserveAspectRatio="none">
            <path d="M0 88C35 88 26 31 65 31c30 0 24 47 53 47 30 0 32-54 60-54 24 0 28 29 62 29" stroke="currentColor" strokeWidth="1.5" />
            <path d="M0 97C35 97 30 43 65 43c28 0 20 45 53 45 34 0 40-52 60-52 26 0 28 29 62 28" stroke="currentColor" />
            <path d="M0 80C31 80 16 19 65 19c34 0 32 49 53 49 27 0 24-55 60-55 22 0 29 29 62 29" stroke="currentColor" />
            <path d="M0 104C35 104 34 54 65 54c24 0 16 44 53 44 38 0 49-49 60-49 22 0 28 23 62 24" stroke="currentColor" />
          </svg>
          <span className={styles.heroPlace}>Assam &nbsp;/&nbsp; Behind the ride</span>
        </div>
      </section>

      <dl className={styles.stats} aria-label="Vendor totals">
        {kpis.map(({ key, label, icon: Icon }) => (
          <div className={styles.stat} key={key}>
            <dt><Icon size={14} aria-hidden="true" />{label}</dt>
            <dd>{dashboard ? dashboard.stats[key].toLocaleString("en-IN") : "—"}</dd>
          </div>
        ))}
      </dl>

      <AdminShortcuts />

      <section aria-labelledby="reviews-title">
        <div className={styles.sectionTop}>
          <div>
            <h2 className={styles.sectionTitle} id="reviews-title">Verification queues</h2>
            <p className={styles.secondary}>Review vendor, vehicle and video KYC applications.</p>
          </div>
          <button type="button" className={styles.button} onClick={refresh} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" /> {loading ? "Refreshing…" : "Refresh queues"}
          </button>
        </div>
        <div className={styles.panel}>
          <div className={styles.tabList} role="group" aria-label="Review categories">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" aria-pressed={activeTab === key}
                onClick={() => setActiveTab(key)} className={styles.tab}>
                <span className={styles.tabIcon}><Icon size={16} aria-hidden="true" /></span>
                <span>{label}</span>
                {hasSnapshot && <span className={styles.tabCount}>{data[key].length}</span>}
              </button>
            ))}
          </div>

          {loadError && (
                <div className={styles.notice} role="alert">
                  <strong>Couldn’t refresh the review queues.</strong>
                  <span>{hasSnapshot ? "Showing the last loaded data." : "Try refreshing the queues."}</span>
                </div>
              )}
              {!hasSnapshot && loading && <p className={styles.notice} role="status">Loading the review queues…</p>}
          {hasSnapshot && <Queue key={activeTab} items={data[activeTab]} type={activeTab} />}
        </div>
      </section>

      <section aria-labelledby="overview-title">
        <div className={styles.sectionTop}>
          <h2 className={styles.sectionTitle} id="overview-title">At a glance</h2>
        </div>
        <div className={styles.chartGrid}>
          <StatusAreaChart stats={dashboard?.stats ?? null} />
          <AdminEarningsChart />
        </div>
      </section>
    </main>
  );
}

const queueTitles = { kyc: "Video verification", vendor: "Vendor applications", vehicle: "Vehicle reviews" };
const kycStates: Record<string, string> = { pending: "Pending", in_progress: "Call in progress", completed: "Completed", approved: "Approved" };

function Queue({ items, type }: { items: QueueItem[]; type: Tab }) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function startKyc(id: string) {
    setStartingId(id);
    setError(null);
    try {
      const { data } = await axios.patch<{ roomId?: string }>(`/api/admin/vendors/video-kyc/start/${id}`);
      if (!data.roomId) throw new Error("No room ID");
      router.push(`/video-kyc/${data.roomId}`);
    } catch {
      setError("Couldn’t start the verification call. Try again.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div>
      <div className={styles.queueHeading}>
        <h3 className={styles.panelTitle}>{queueTitles[type]}</h3>
        <span className={styles.secondary}>{items.length} {items.length === 1 ? "item" : "items"}</span>
      </div>
      {error && <p className={styles.notice} role="alert">{error}</p>}
      {!items.length ? (
        <p className={styles.notice}><CheckCircle2 size={17} aria-hidden="true" /><strong>No pending reviews.</strong></p>
      ) : (
        <ul className={styles.queueList}>
          {items.map((item) => {
            const name = item.name || item.ownerName || "Name unavailable";
            const email = item.email || item.ownerEmail;
            const initials = name.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join("").toUpperCase();
            const href = type === "vehicle" ? `/admin/vehicles/${item._id}` : `/admin/vendors/${item._id}`;
            const activeCall = item.videoKycStatus === "in_progress";
            const status = kycStates[item.videoKycStatus ?? "pending"] || "Awaiting verification";
            return (
              <li className={styles.queueRow} key={item._id}>
                <Link href={href} className={styles.queueIdentity}>
                  <span className={styles.avatar} aria-hidden="true">{initials}</span>
                  <span><strong>{name}</strong>{(email || item.vehicleType) &&
                    <small>{[email, item.vehicleType].filter(Boolean).join(" · ")}</small>}</span>
                </Link>
                <div className={styles.queueActions}>
                  {type === "kyc" ? (
                    <>
                      <span className={`${styles.status} ${activeCall ? styles.statusLive : ""}`}>{status}</span>
                      {activeCall && item.videoKycRoomId ? (
                        <Link href={`/video-kyc/${item.videoKycRoomId}`} className={styles.primary} aria-label={`Join call for ${name}`}>
                          <Video size={15} aria-hidden="true" />Join call
                        </Link>
                      ) : (
                        <button type="button" className={styles.primary} disabled={startingId !== null} aria-label={`Start KYC for ${name}`} onClick={() => startKyc(item._id)}>
                          <Video size={15} aria-hidden="true" />{startingId === item._id ? "Starting…" : "Start KYC"}
                        </button>
                      )}
                    </>
                  ) : (
                    <Link href={href} aria-label={`Review ${name}`} className={styles.button}>Review<ArrowRight size={14} aria-hidden="true" /></Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
