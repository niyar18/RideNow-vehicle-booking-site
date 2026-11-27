"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Car,
  Calendar,
  ChevronRight,
  MapPin,
  FileText,
  LogIn,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import RiderPageHead from "@/features/rider/components/RiderPageHead";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import { RideCardSkeleton } from "@/shared/components/skeletons/RideCardSkeleton";
import TripDetailsModal from "@/features/booking/components/TripDetailsModal";
import TripInvoiceModal from "@/features/booking/components/TripInvoiceModal";
import AuthModal from "@/features/auth/components/AuthModal";

interface Booking {
  _id: string;
  pickupAddress: string;
  dropAddress: string;
  pickupLocation?: { coordinates: [number, number] };
  dropLocation?: { coordinates: [number, number] };
  routeCoordinates?: [number, number][];
  routeDistanceKm?: number;
  fare: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  createdAt: string;
  startedAt?: string;
  actualPickupTime?: string;
  completedAt?: string;
  tipAmount?: number;
  rating?: number;
  userMobileNumber?: string;
  driverMobileNumber?: string;
  vehicle?: {
    vehicleModel: string;
    imageUrl?: string;
    number?: string;
    type?: string;
  };
  driver?: {
    name: string;
    profilePicture?: string;
  };
  isScheduled?: boolean;
  scheduledPickupTime?: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { userData } = useSelector((state: RootState) => state.user);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any | null>(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const isAuthenticated = Boolean(userData || session?.user);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await axios.get("/api/user/bookings", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      setBookings(res.data.bookings || []);
      setIsUnauthorized(false);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
      } else {
        setLoadError(true);
      }
      console.error("Bookings fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!isAuthenticated && sessionStatus === "unauthenticated") {
      setIsUnauthorized(true);
      setLoading(false);
      setShowAuthModal(true);
      return;
    }

    if (isAuthenticated) {
      fetchBookings();
    }
  }, [sessionStatus, isAuthenticated, fetchBookings]);

  const getStatusColor = (status: string) => {
    if (["cancelled", "rejected", "expired"].includes(status)) {
      return "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200";
    }
    if (["requested", "searching_driver", "awaiting_payment"].includes(status)) {
      return "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
    }
    return "bg-[var(--surface-subtle)] text-[var(--text-primary)]";
  };

  const readableStatus = (status: string) =>
    status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  };

  const filteredBookings = statusFilter === "All" 
    ? bookings 
    : bookings.filter(b => b.status === statusFilter.toLowerCase());

  const showAuthPrompt = !loading && sessionStatus !== "loading" && (isUnauthorized || !isAuthenticated);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col">
      <Nav />
      <div className="mx-auto w-full max-w-[70rem] flex-1 px-4 pb-16 pt-24 sm:px-7 sm:pt-28">
        <RiderPageHead
          current="/bookings"
          title="Your trips"
          description="Find upcoming rides, revisit past trips, and download receipts."
          action={
            <Link href="/book" className="inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]">
              Book a ride <ChevronRight size={16} aria-hidden="true" />
            </Link>
          }
        />

        {(loading || sessionStatus === "loading") && (
          <div role="status" aria-label="Loading your trips" className="max-w-3xl">
            <RideCardSkeleton count={3} />
          </div>
        )}

        {showAuthPrompt && (
          <section className="max-w-2xl rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-8">
            <div className="mb-5 grid h-11 w-11 place-items-center rounded-[9px] bg-[var(--surface-subtle)]">
              <LogIn size={20} aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold">Sign in to see your trips</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              Use your mobile number or Google account to pick up where you left off.
            </p>
            <button type="button" onClick={() => setShowAuthModal(true)} className="mt-5 min-h-11 rounded-[9px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]">
              Sign in
            </button>
          </section>
        )}

        {!loading && sessionStatus !== "loading" && !showAuthPrompt && loadError && (
          <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-8">
            <h2 className="text-lg font-semibold">Could not load your trips</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Check your connection and try again.</p>
            <button type="button" onClick={fetchBookings} className="mt-4 min-h-11 rounded-[9px] border border-[var(--border-default)] px-4 text-sm font-semibold">Try again</button>
          </section>
        )}

        {!loading && sessionStatus !== "loading" && !showAuthPrompt && !loadError && (
          <section aria-label="Trips" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
                {filteredBookings.length} {filteredBookings.length === 1 ? "trip" : "trips"}
              </p>
              <label className="flex items-center gap-2 text-sm font-medium">
                Status
                <select
                  aria-label="Trip status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="min-h-11 rounded-[9px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-sm"
                >
                  <option>All</option>
                  <option>Scheduled</option>
                  <option>Confirmed</option>
                  <option>Completed</option>
                  <option>Requested</option>
                  <option>Cancelled</option>
                </select>
              </label>
            </div>
            {filteredBookings.length === 0 ? (
              <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-8">
                <Car size={23} aria-hidden="true" className="mb-4 text-[var(--text-secondary)]" />
                <h2 className="text-lg font-semibold">{statusFilter === "All" ? "No trips yet" : "No trips with this status"}</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {statusFilter === "All" ? "Your rides will appear here after you book." : "Choose a different filter to see more trips."}
                </p>
                {statusFilter !== "All" && <button type="button" onClick={() => setStatusFilter("All")} className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-4">Show all trips</button>}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredBookings.map((booking) => (
                  <li key={booking._id} className="flex min-w-0 flex-col rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[var(--surface-subtle)]">
                        {booking.vehicle?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- User vehicle photo with an arbitrary provider URL.
                          <img loading="lazy" src={booking.vehicle.imageUrl} alt="" className="size-full object-cover" />
                        ) : <Car size={20} aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-base font-semibold">{booking.vehicle?.vehicleModel || "Jaatri ride"}</h2>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          {booking.driver?.name && !["requested", "searching_driver", "no_drivers_available", "expired"].includes(booking.status)
                            ? booking.driver.name
                            : formatDate(booking.createdAt)}
                        </p>
                      </div>
                      <span className={`max-w-[8.5rem] shrink-0 rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {readableStatus(booking.status)}
                      </span>
                    </div>

                    <dl className="relative my-4 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[var(--brand-primary)] dark:border-[#91f2ce]" aria-hidden="true" />
                        <div className="min-w-0">
                          <dt className="text-xs text-[var(--text-secondary)]">Pickup</dt>
                          <dd className="break-words text-sm font-medium">{booking.pickupAddress}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <MapPin size={13} aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--text-secondary)]" />
                        <div className="min-w-0">
                          <dt className="text-xs text-[var(--text-secondary)]">Destination</dt>
                          <dd className="break-words text-sm font-medium">{booking.dropAddress}</dd>
                        </div>
                      </div>
                    </dl>

                    <div className="mt-auto flex flex-wrap items-start justify-between gap-3 border-t border-[var(--border-default)] pt-3 text-sm">
                      <p className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <Calendar size={14} aria-hidden="true" />
                        {formatDate(booking.isScheduled && booking.scheduledPickupTime ? booking.scheduledPickupTime : booking.createdAt)}
                      </p>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">₹{booking.fare}</p>
                        {booking.paymentStatus && <p className="text-xs text-[var(--text-secondary)]">{readableStatus(booking.paymentStatus)}</p>}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {booking.status === "completed" && (
                        <button type="button" onClick={() => {
                          setSelectedBookingForInvoice(booking);
                          setShowInvoiceModal(true);
                        }} className="inline-flex min-h-11 items-center gap-1.5 rounded-[8px] px-3 text-sm font-semibold hover:bg-[var(--surface-subtle)]">
                          <FileText size={15} aria-hidden="true" /> Invoice
                        </button>
                      )}
                      <button type="button" onClick={() => {
                        if (["completed", "cancelled"].includes(booking.status)) {
                          setSelectedBookingForDetails(booking);
                          setShowDetailsModal(true);
                        } else {
                          router.push(`/ride/${booking._id}`);
                        }
                      }} className="inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] px-3 text-sm font-semibold hover:bg-[var(--surface-subtle)]">
                        View trip <ChevronRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* ══ TRIP DETAILS MODAL (UBER STYLE ROUTE & RECEIPT) ══ */}
      <TripDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        booking={selectedBookingForDetails}
        onOpenInvoice={(b) => {
          setSelectedBookingForInvoice(b);
          setShowInvoiceModal(true);
        }}
      />

      {/* ══ GST TAX INVOICE MODAL & PRINT VIEW ══ */}
      <TripInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        booking={selectedBookingForInvoice}
      />

      {/* ══ AUTH MODAL ══ */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <Footer />
    </div>
  );
}
