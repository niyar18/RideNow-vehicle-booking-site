"use client";



import Image from "next/image";
import nextDynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, LoaderCircle, MapPin, Siren, UserRound } from "lucide-react";
import { getSocket, joinBookingRoom, leaveBookingRoom } from "@/lib/socket";

const LiveRideMap = nextDynamic(() => import("@/features/maps/components/LiveTrackingMap"), { ssr: false });

type BookingStatus =
  | "requested" | "awaiting_payment" | "confirmed"
  | "started"   | "completed"        | "cancelled"
  | "rejected"  | "expired";

const TERMINAL_TRACKING_STATUSES = new Set([
  "completed", "cancelled", "rejected", "expired", "payment_failed", "no_drivers_available", "disputed",
]);

const STATUS_CONFIG: Record<BookingStatus, { label: string; sublabel: string; dot: string }> = {
  requested:        { label: "Locating Driver", sublabel: "Ride request in progress",       dot: "bg-amber-400" },
  awaiting_payment: { label: "Payment Pending", sublabel: "Awaiting customer payment",      dot: "bg-purple-400" },
  confirmed:        { label: "Driver Arriving", sublabel: "Driver heading to pickup",       dot: "bg-emerald-400" },
  started:          { label: "Trip in Progress",sublabel: "Heading to destination",          dot: "bg-blue-400" },
  completed:        { label: "Trip Completed",  sublabel: "Passenger has arrived safely",   dot: "bg-zinc-400" },
  cancelled:        { label: "Trip Cancelled",  sublabel: "This trip was cancelled",        dot: "bg-red-400" },
  rejected:         { label: "Trip Rejected",   sublabel: "Ride was not accepted",          dot: "bg-red-400" },
  expired:          { label: "Trip Expired",    sublabel: "Booking request timed out",      dot: "bg-orange-400" },
};

export default function PublicTrackPage() {
  const { token } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [pickupPos, setPickupPos] = useState<[number, number] | null>(null);
  const [dropPos, setDropPos] = useState<[number, number] | null>(null);
  const [eta, setEta] = useState<number>(0);

  const fetchPublicTrip = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/track/${token}`, { cache: "no-store" });
      if (!res.ok) {
        const message = res.status === 410
          ? "This tracking link has expired."
          : "Trip not found or invalid link";
        setError(message);
        setBooking(null);
        setDriverPos(null);
        setPickupPos(null);
        setDropPos(null);
        throw new Error(message);
      }
      const data = await res.json();
      if (data.success && data.booking) {
        const b = data.booking;
        setBooking(b);
        if (b.pickupLocation?.coordinates?.length >= 2) {
          setPickupPos([b.pickupLocation.coordinates[1], b.pickupLocation.coordinates[0]]);
        }
        if (b.dropLocation?.coordinates?.length >= 2) {
          setDropPos([b.dropLocation.coordinates[1], b.dropLocation.coordinates[0]]);
        }
        if (TERMINAL_TRACKING_STATUSES.has(String(b.status || "").toLowerCase())) {
          setDriverPos(null);
          setEta(0);
        } else if (b.driver?.location?.coordinates?.length >= 2) {
          setDriverPos([b.driver.location.coordinates[1], b.driver.location.coordinates[0]]);
        } else {
          setDriverPos(null);
        }
      } else {
        throw new Error("Invalid tracking payload");
      }
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load tracking data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (error) return;
    fetchPublicTrip();
    const interval = setInterval(() => fetchPublicTrip(true), 5000);
    return () => clearInterval(interval);
  }, [token, error]);

  useEffect(() => {
    if (!booking?.bookingId || TERMINAL_TRACKING_STATUSES.has(String(booking.status || "").toLowerCase())) return;
    const bookingIdStr = String(booking.bookingId);
    const tokenStr = typeof token === "string" ? token : Array.isArray(token) ? token[0] : "";
    const socket = getSocket();
    joinBookingRoom(bookingIdStr, tokenStr);

    const handleDriverLocation = (data: any) => {
      if (typeof data?.latitude === "number" && typeof data?.longitude === "number") {
        setDriverPos([data.latitude, data.longitude]);
      }
    };

    const handleBookingUpdated = (data: any) => {
      if (TERMINAL_TRACKING_STATUSES.has(String(data?.status || "").toLowerCase())) {
        setDriverPos(null);
        setEta(0);
      }
      setBooking((prev: any) => (prev ? { ...prev, ...data } : null));
    };

    socket.on("driver-location", handleDriverLocation);
    socket.on("booking-updated", handleBookingUpdated);

    return () => {
      leaveBookingRoom(bookingIdStr);
      socket.off("driver-location", handleDriverLocation);
      socket.off("booking-updated", handleBookingUpdated);
    };
  }, [booking?.bookingId, booking?.status, token]);

  if (loading || error || !booking) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--background)] px-4 text-[var(--text-primary)]">
        <div className="w-full max-w-md rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 sm:p-8">
          {loading ? <LoaderCircle className="mb-4 animate-spin motion-reduce:animate-none text-[var(--text-secondary)]" aria-hidden="true" /> : <AlertCircle className="mb-4 text-[var(--text-secondary)]" aria-hidden="true" />}
          <h1 className="text-xl font-semibold">{loading ? "Opening trip" : "This trip is unavailable"}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]" role="status">
            {loading ? "Checking the shared tracking link." : error || "This tracking link may be invalid or expired."}
          </p>
          {!loading && <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Back to Jaatri</Link>}
        </div>
      </div>
    );
  }

  const status: BookingStatus = booking.status || "requested";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.requested;
  const hasEnded = TERMINAL_TRACKING_STATUSES.has(String(status).toLowerCase());
  const mapStatus = status === "started" ? "ongoing" : status === "completed" ? "completed" : "arriving";
  const showMap = pickupPos && dropPos && !hasEnded;

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex min-h-16 max-w-[86rem] items-center justify-between gap-3 px-4 sm:px-7">
          <Link href="/" aria-label="Jaatri home" className="inline-flex min-h-11 items-center rounded-[6px]">
            <Image
              src="/logojatri.png"
              alt="Jaatri"
              width={120}
              height={38}
              className="h-8 w-auto object-contain dark:brightness-0 dark:invert"
              priority
            />
          </Link>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Shared trip</p>
        </div>
      </header>

      <main tabIndex={-1} className="mx-auto grid w-full max-w-[86rem] flex-1 gap-4 p-4 sm:gap-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:items-start">
          {booking.isPanicActive && (
            <aside role="alert" className="lg:col-span-2 rounded-[12px] border border-red-400 bg-red-50 p-4 text-red-950 dark:border-red-700 dark:bg-red-950/60 dark:text-red-100">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Siren size={17} aria-hidden="true" /> Emergency SOS activated
              </p>
              <p className="mt-1 text-sm leading-relaxed">An SOS is active for this trip in Jaatri. The app does not contact emergency services. In India, call 112 directly for immediate help.</p>
            </aside>
          )}

        <section aria-label="Trip map" className="relative isolate aspect-[4/3] w-full overflow-hidden rounded-[13px] border border-[var(--border-default)] bg-[var(--surface-subtle)] lg:aspect-auto lg:h-[min(68dvh,45rem)]">
          {showMap ? (
            <LiveRideMap
              driverLocation={driverPos}
              pickupLocation={pickupPos}
              dropLocation={dropPos}
              pickupAddress={booking.pickupAddress}
              dropAddress={booking.dropAddress}
              status={mapStatus}
              onStats={({ durationToPickup, durationToDrop }) => {
                setEta(Math.round(mapStatus === "arriving" ? durationToPickup : durationToDrop));
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-sm text-[var(--text-secondary)]">
              <MapPin size={23} aria-hidden="true" />
              {hasEnded ? "Live tracking has ended for this trip." : "Waiting for map coordinates."}
            </div>
          )}
        </section>

        <div className="min-w-0 space-y-4 lg:space-y-5">
          <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 sm:p-6" aria-label="Trip status">
            <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <span aria-hidden="true" className={`size-2 rounded-full ${cfg.dot}`} />
              Trip status
            </p>
            <h1 className="mt-2 text-[clamp(1.5rem,5vw,2.15rem)] font-semibold leading-tight tracking-tight" aria-live="polite">{cfg.label}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{cfg.sublabel}</p>
            {eta > 0 && ["confirmed", "started"].includes(status) && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-[8px] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-semibold tabular-nums">
                <Clock size={16} aria-hidden="true" /> {eta} min estimated
              </p>
            )}
          </section>

          {booking.driver && (
            <section aria-label="Driver and vehicle" className="flex min-w-0 flex-wrap items-center gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 sm:p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[var(--surface-subtle)]">
                <UserRound size={20} aria-hidden="true" />
              </div>
              <div className="min-w-[8rem] flex-1">
                <p className="text-xs text-[var(--text-secondary)]">Driver</p>
                <p className="break-words text-sm font-semibold">{booking.driver.name}</p>
                {booking.vehicle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{booking.vehicle.vehicleModel}</p>}
              </div>
              {booking.vehicle?.number && (
                <p className="rounded-md border border-[var(--border-default)] px-2.5 py-1.5 font-mono text-xs tracking-wide">{booking.vehicle.number}</p>
              )}
            </section>
          )}

          <section aria-label="Trip route" className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold">Route</h2>
            <dl className="space-y-3">
              <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2">
                <dt className="col-start-2 text-xs text-[var(--text-secondary)]">Pickup</dt>
                <dd className="col-start-2 break-words text-sm font-medium">{booking.pickupAddress || "Not available"}</dd>
              </div>
              <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2">
                <dt className="col-start-2 text-xs text-[var(--text-secondary)]">Destination</dt>
                <dd className="col-start-2 break-words text-sm font-medium">{booking.dropAddress || "Not available"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
