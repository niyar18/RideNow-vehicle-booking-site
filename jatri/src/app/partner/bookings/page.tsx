"use client";



import { PartnerPageTitle, PartnerWorkspaceNav } from "@/features/partner/components/PartnerWorkspace";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee,
  Loader2,
  Car,
  Bike,
  Truck,
  Calendar,
  ChevronRight,
  MapPin,
  User,
  Phone,
  FileText,
} from "lucide-react";
import { RideCardSkeleton } from "@/shared/components/skeletons/RideCardSkeleton";
import TripDetailsModal from "@/features/booking/components/TripDetailsModal";
import TripInvoiceModal from "@/features/booking/components/TripInvoiceModal";

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
  settlementStatus?: "pending" | "success" | "failed";
  paymentMethod?: string;
  createdAt: string;
  startedAt?: string;
  actualPickupTime?: string;
  completedAt?: string;
  tipAmount?: number;
  rating?: number;
  user?: {
    name: string;
    phone?: string;
  };
  driver?: {
    name: string;
  };
  vehicle?: {
    vehicleModel: string;
    type?: string; // car, bike, auto, truck etc.
    imageUrl?: string;
    number?: string;
  };
  userMobileNumber?: string;
  isScheduled?: boolean;
  scheduledPickupTime?: string;
}

export default function PartnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any | null>(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/partner/bookings", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch (err) {
        console.error("Failed to fetch bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-bold",
      confirmed: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      completed: "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      requested: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      awaiting_payment: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      cancelled: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      rejected: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      expired: "bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700",
    };
    return colors[status] || "bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700";
  };

  const getVehicleIcon = (vehicleType?: string) => {
    switch(vehicleType?.toLowerCase()) {
      case 'bike':
      case 'motorcycle':
        return <Bike className="w-4 h-4 text-[var(--text-secondary)]" />;
      case 'auto':
      case 'rickshaw':
        return <Car className="w-4 h-4 text-[var(--text-secondary)]" />;
      case 'truck':
      case 'lorry':
        return <Truck className="w-4 h-4 text-[var(--text-secondary)]" />;
      case 'suv':
      case 'sedan':
      case 'hatchback':
      default:
        return <Car className="w-4 h-4 text-[var(--text-secondary)]" />;
    }
  };

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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <PartnerWorkspaceNav current="trips" />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
        <PartnerPageTitle label="Driver workspace" title="Your trips" description="View the rides assigned to you, open trip details and download completed trip invoices." />
        <div>
          {/* FILTER BAR */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3 mb-4">
            <div className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              <span className="text-[var(--text-primary)] font-bold">{filteredBookings.length}</span> of {bookings.length} trips
            </div>
            <select aria-label="Filter trips by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[8px] min-h-11 px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#123D32] dark:focus:ring-[#28664D] focus:border-[#123D32] dark:focus:border-[#28664D] font-medium "
            >
              <option>All</option>
              <option>Scheduled</option>
              <option>Confirmed</option>
              <option>Completed</option>
              <option>Requested</option>
              <option>Cancelled</option>
            </select>
          </div>

          {/* SKELETON LOADING STATE */}
          {loading && (
            <div className="py-2">
              <RideCardSkeleton count={3} />
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && filteredBookings.length === 0 && (
            <div className="bg-[var(--surface-raised)] rounded-[14px] border border-[var(--border-default)] p-8 sm:p-12 text-center ">
              <Car className="w-12 h-12 text-[#696B64]/40 dark:text-[#B9C8BF]/40 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-sans font-bold text-[var(--text-primary)]">No bookings yet</h3>
              <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1">Trips will appear here once they are assigned to you.</p>
            </div>
          )}

          {/* BOOKINGS LIST */}
          {!loading && filteredBookings.length > 0 && (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {filteredBookings.map((booking, index) => (
                <motion.div
                  key={booking._id}
                  className="only:col-span-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="bg-[var(--surface-raised)] rounded-[14px] border border-[var(--border-default)] transition-all overflow-hidden">
                    
                    {/* CUSTOMER INFO - PARTNER SPECIFIC */}
                    <div className="flex items-start sm:items-center gap-3 p-3.5 sm:p-4 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]">
                      {/* CUSTOMER AVATAR */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-[#123D32]/10 dark:bg-[#28664D]/20 flex-shrink-0 border-2 border-white dark:border-[#17211B] flex items-center justify-center">
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#123D32] dark:text-[#347858]" />
                      </div>
                      
                      {/* CUSTOMER DETAILS */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <h3 className="font-semibold text-sm sm:text-base text-[var(--text-primary)] truncate">
                            {booking.user?.name || "Customer"}
                          </h3>
                          <span className={`px-2.5 py-0.5 sm:py-1 rounded-[6px] border text-[11px] sm:text-xs font-semibold ${getStatusColor(booking.status)}`}>
                            {booking.status.replace("_", " ")}
                          </span>
                        </div>
                        
                        {/* USER MOBILE NUMBER */}
                        {(booking.userMobileNumber || booking.user?.phone) && (
                          <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-[var(--text-secondary)]">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>
                              {(() => {
                                const num = booking.userMobileNumber || booking.user?.phone;
                                if (!num) return "";
                                const cleaned = num.replace(/\D/g, "");
                                return cleaned.length >= 4 
                                  ? `XXXXXX${cleaned.slice(-4)}`
                                  : "Masked for Security";
                              })()}
                            </span>
                          </div>
                        )}
                        {booking.isScheduled && booking.scheduledPickupTime && (
                          <div className="inline-flex items-center gap-1.5 bg-[var(--surface-subtle)] text-[#E34222] dark:text-[#E06A50] border border-[#E34222]/30 dark:border-[#E06A50]/30 text-[11px] sm:text-xs font-bold px-2.5 py-0.5 sm:py-1 rounded-[6px] mt-1.5">
                            <span>⏰ Scheduled: {formatDate(booking.scheduledPickupTime)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* VEHICLE INFO - WITH DYNAMIC ICON */}
                    {booking.vehicle && (
                      <div className="px-3.5 sm:px-4 pt-2.5 sm:pt-3">
                        <div className="bg-[var(--background)] border border-[var(--border-default)] rounded-[8px] p-2 flex items-center gap-2">
                          {getVehicleIcon(booking.vehicle.type)}
                          <span className="text-xs text-[var(--text-secondary)] font-medium truncate">
                            {booking.vehicle.vehicleModel} • {booking.vehicle.number || "Not assigned"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ADDRESS SECTION */}
                    <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
                      {/* PICKUP */}
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-[#123D32]/10 dark:bg-[#28664D]/20 rounded-full flex items-center justify-center mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#123D32] dark:text-[#347858]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] sm:text-xs font-bold text-[#123D32] dark:text-[#347858] ">PICKUP</span>
                          <p className="text-xs sm:text-sm text-[var(--text-primary)] mt-0.5 leading-relaxed font-medium">
                            {booking.pickupAddress}
                          </p>
                        </div>
                      </div>

                      {/* DROP */}
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-[#E34222]/10 dark:bg-[#E06A50]/20 rounded-full flex items-center justify-center mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#E34222] dark:text-[#E06A50]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] sm:text-xs font-bold text-[#E34222] dark:text-[#E06A50] ">DROP</span>
                          <p className="text-xs sm:text-sm text-[var(--text-primary)] mt-0.5 leading-relaxed font-medium">
                            {booking.dropAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DATE AND FARE */}
                    <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#F7F1E5]/70 dark:bg-[#061A16]/70 border-t border-[var(--border-default)]">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-secondary)]" />
                        <span>{formatDate(booking.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-[var(--text-primary)] text-sm sm:text-base">
                        <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#123D32] dark:text-[#347858]" />
                        <span>₹{booking.fare}</span>
                      </div>
                    </div>

                    {/* PAYMENT AND ACTIONS */}
                    <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-t border-[var(--border-default)]">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-[11px] sm:text-xs text-[var(--text-secondary)]">Payment:</span>
                        <span className={`text-[11px] sm:text-xs px-2.5 py-0.5 rounded-[6px] font-semibold border ${
                          booking.paymentStatus === 'paid' 
                            ? 'bg-[#123D32]/10 dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858] border-[#123D32]/30 dark:border-[#28664D]/40' 
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                        }`}>
                          {booking.paymentStatus || 'pending'}
                        </span>
                        {booking.paymentMethod && (
                          <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] capitalize">
                            • {booking.paymentMethod}
                          </span>
                        )}
                        {booking.status === "completed" && (
                          <span
                            className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-[6px] font-semibold border flex items-center gap-1 ${
                              booking.settlementStatus === "failed"
                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                                : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                booking.settlementStatus === "failed" ? "bg-amber-500 animate-pulse" : "bg-emerald-600"
                              }`}
                            />
                            {booking.settlementStatus === "failed" ? "Queued" : "Settled"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {booking.status === "completed" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBookingForInvoice(booking);
                                setShowInvoiceModal(true);
                              }}
                              className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] hover:text-[#123D32] dark:hover:text-[#347858] bg-[var(--surface-subtle)] hover:bg-[#F7F1E5] dark:hover:bg-[#143D32] px-2.5 sm:px-3 min-h-11 transition-colors border border-[var(--border-default)] rounded-[8px] cursor-pointer"
                              title="Download Official GST Tax Invoice"
                            >
                              <FileText size={13} />
                              <span>Invoice</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBookingForDetails(booking);
                                setShowDetailsModal(true);
                              }}
                              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#FAF7F0] bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] px-3 sm:px-4 min-h-11 transition-colors cursor-pointer rounded-[8px]"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => window.location.href = `/partner/active-ride`}
                            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#FAF7F0] bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)] px-3 sm:px-4 min-h-11 rounded-[8px] transition-colors"
                          >
                            <span>Live Ride</span>
                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ══ TRIP DETAILS MODAL (UBER STYLE ROUTE & RECEIPT) ══ */}
      <TripDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        booking={selectedBookingForDetails}
        perspective="vendor"
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
    </div>
  );
}