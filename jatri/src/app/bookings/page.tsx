"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee,
  Loader2,
  Car,
  Calendar,
  ChevronRight,
  MapPin,
  Phone,
  FileText,
  LogIn,
} from "lucide-react";
import axios from "axios";
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
      const res = await axios.get("/api/user/bookings", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      setBookings(res.data.bookings || []);
      setIsUnauthorized(false);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
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
    const colors: Record<string, string> = {
      scheduled: "bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858] border border-[#DED7CA] dark:border-[#28664D]/30 font-bold",
      confirmed: "bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858] border border-[#DED7CA] dark:border-[#28664D]/30",
      completed: "bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858] border border-[#DED7CA] dark:border-[#28664D]/30",
      requested: "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
      awaiting_payment: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
      cancelled: "bg-[#faebe8] dark:bg-red-950/30 text-[#E34222] dark:text-[#E06A50] border border-[#E34222]/30 dark:border-red-900/50",
      rejected: "bg-[#faebe8] dark:bg-red-950/30 text-[#E34222] dark:text-[#E06A50] border border-[#E34222]/30 dark:border-red-900/50",
      expired: "bg-[#FAF7F0] dark:bg-[#10352C] text-[#696B64] dark:text-[#B9C8BF] border border-[#DED7CA] dark:border-[#1E3E34]",
    };
    return colors[status] || "bg-[#FAF7F0] dark:bg-[#10352C] text-[#696B64] dark:text-[#B9C8BF] border border-[#DED7CA] dark:border-[#1E3E34]";
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

  const showAuthPrompt = !loading && sessionStatus !== "loading" && (isUnauthorized || !isAuthenticated);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F0] dark:bg-[#061A16] justify-between font-sans">
      <Nav />
      <div className="flex-1 pt-24 sm:pt-28 pb-12">
        {/* HEADER - CENTERED CONTENT */}
        <div className="bg-[#FAF7F0] dark:bg-[#0B2822] border-b border-[#DED7CA] dark:border-[#1E3E34]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto py-6 sm:py-8">
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#10251C] dark:text-[#F7F5ED]">My Bookings</h1>
              <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm mt-1">
                {showAuthPrompt
                  ? "Sign in to view your rides, live tracking, and invoices"
                  : `${bookings.length} ${bookings.length === 1 ? 'ride' : 'rides'} found`}
              </p>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT - CENTERED CARDS */}
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-3xl mx-auto">
            {/* SKELETON LOADING STATE */}
            {(loading || sessionStatus === "loading") && (
              <div className="py-2">
                <RideCardSkeleton count={3} />
              </div>
            )}

            {/* UNAUTHENTICATED STATE - PROMPT TO SIGN IN */}
            {showAuthPrompt && (
              <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] border border-[#DED7CA] dark:border-[#1E3E34] shadow-xs p-8 sm:p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-[#E5EBDD] dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#28664D]/30 flex items-center justify-center mx-auto mb-4 text-[#046A38] dark:text-[#058A48]">
                  <LogIn className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#10251C] dark:text-[#F7F5ED]">
                  Sign in to view your bookings
                </h2>
                <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm mt-2 max-w-md mx-auto leading-relaxed">
                  Log in with your mobile number or Google account to track ongoing rides, view your past travel history, and download official GST invoices.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="w-full sm:w-auto bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white px-6 py-2.5 rounded-[8px] text-sm font-bold transition active:scale-95 shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In / Register</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/book")}
                    className="w-full sm:w-auto bg-white dark:bg-[#10352C] hover:bg-[#FAF7F0] dark:hover:bg-[#143D32] text-[#10251C] dark:text-[#F7F5ED] border border-[#DED7CA] dark:border-[#1E3E34] px-5 py-2.5 rounded-[8px] text-sm font-semibold transition cursor-pointer"
                  >
                    Book a Ride
                  </button>
                </div>
              </div>
            )}

            {/* AUTHENTICATED CONTENT */}
            {!loading && sessionStatus !== "loading" && !showAuthPrompt && (
              <>
                {/* FILTER BAR */}
                <div className="flex justify-between items-center mb-5 sm:mb-6">
                  <div className="text-xs sm:text-sm text-[#696B64] dark:text-[#B9C8BF]">
                    Showing <span className="text-[#10251C] dark:text-[#F7F5ED] font-bold">{filteredBookings.length}</span> bookings
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#1E3E34] rounded-[8px] px-3 py-1.5 text-xs sm:text-sm text-[#10251C] dark:text-[#F7F5ED] focus:outline-none focus:ring-2 focus:ring-[#123D32]/20 dark:focus:ring-[#28664D]/30"
                  >
                    <option>All</option>
                    <option>Scheduled</option>
                    <option>Confirmed</option>
                    <option>Completed</option>
                    <option>Requested</option>
                    <option>Cancelled</option>
                  </select>
                </div>

                {/* EMPTY STATE */}
                {filteredBookings.length === 0 && (
                  <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] border border-[#DED7CA] dark:border-[#1E3E34] shadow-xs p-8 sm:p-12 text-center">
                    <Car className="w-12 h-12 text-[#123D32]/40 dark:text-[#347858]/40 mx-auto mb-3" />
                    <h3 className="text-lg sm:text-xl font-bold font-serif text-[#10251C] dark:text-[#F7F5ED]">No bookings found</h3>
                    <p className="text-[#696B64] dark:text-[#B9C8BF] text-xs sm:text-sm mt-1">Ready for a ride? Book one now!</p>
                    <button 
                      onClick={() => router.push("/book")}
                      className="mt-5 bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] text-white px-5 py-2.5 rounded-[8px] text-sm font-bold transition active:scale-95 shadow-xs cursor-pointer"
                    >
                      Book a Ride
                    </button>
                  </div>
                )}

                {/* BOOKINGS LIST */}
                {filteredBookings.length > 0 && (
                  <div className="space-y-4">
                    {filteredBookings.map((booking, index) => (
                      <motion.div
                        key={booking._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="bg-[#FAF7F0] dark:bg-[#0B2822] rounded-[12px] border border-[#DED7CA] dark:border-[#1E3E34] shadow-xs hover:border-[#123D32]/40 dark:hover:border-[#28664D]/50 hover:shadow-md transition-all overflow-hidden">
                          
                          {/* VEHICLE INFO WITH IMAGE */}
                          <div className="flex items-start sm:items-center gap-3 p-3.5 sm:p-4 bg-white/70 dark:bg-[#061A16]/70 border-b border-[#DED7CA] dark:border-[#1E3E34]">
                            {/* VEHICLE IMAGE */}
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[8px] overflow-hidden bg-[#FAF7F0] dark:bg-[#0B2822] flex-shrink-0 border border-[#DED7CA] dark:border-[#1E3E34]">
                              {booking.vehicle?.imageUrl ? (
                                <img 
                                  src={booking.vehicle.imageUrl} 
                                  alt={booking.vehicle.vehicleModel}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#FAF7F0] dark:bg-[#0B2822]">
                                  <Car className="w-7 h-7 sm:w-8 sm:h-8 text-[#123D32]/60 dark:text-[#347858]/60" />
                                </div>
                              )}
                            </div>
                            
                            {/* VEHICLE DETAILS */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <h3 className="font-bold text-sm sm:text-base text-[#10251C] dark:text-[#F7F5ED] truncate">
                                  {booking.vehicle?.vehicleModel || "Standard Vehicle"}
                                </h3>
                                <span className={`px-2 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium ${getStatusColor(booking.status)}`}>
                                  {booking.status.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-[#696B64] dark:text-[#B9C8BF] mt-0.5 truncate">
                                {booking.driver?.name && !["requested", "searching_driver", "no_drivers_available", "expired"].includes(booking.status)
                                  ? `Driver: ${booking.driver.name}`
                                  : booking.status === "cancelled" || booking.status === "expired"
                                  ? "No driver assigned"
                                  : "Searching for nearby driver..."}
                              </p>
                              {booking.isScheduled && booking.scheduledPickupTime && (
                                <div className="inline-flex items-center gap-1.5 bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858] border border-[#DED7CA] dark:border-[#1E3E34] text-[11px] sm:text-xs font-bold px-2.5 py-0.5 sm:py-1 rounded-[6px] mt-1.5">
                                  <span>⏰ Scheduled: {formatDate(booking.scheduledPickupTime)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ADDRESS SECTION - CLEARLY LABELED */}
                          <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
                            {/* PICKUP */}
                            <div className="flex items-start gap-2.5 sm:gap-3">
                              <div className="w-5 h-5 rounded-full bg-[#E5EBDD] dark:bg-[#28664D]/30 border border-[#DED7CA] dark:border-[#28664D]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-[#123D32] dark:bg-[#347858]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] sm:text-xs font-bold text-[#696B64] dark:text-[#B9C8BF] uppercase tracking-wider block">Pickup</span>
                                <p className="text-xs sm:text-sm text-[#10251C] dark:text-[#F7F5ED] line-clamp-1">{booking.pickupAddress}</p>
                              </div>
                            </div>

                            {/* DESTINATION */}
                            <div className="flex items-start gap-2.5 sm:gap-3">
                              <div className="w-5 h-5 rounded-full bg-[#faebe8] dark:bg-[#341814] border border-[#E34222]/30 dark:border-[#E06A50]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-[#E34222] dark:bg-[#E06A50]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] sm:text-xs font-bold text-[#696B64] dark:text-[#B9C8BF] uppercase tracking-wider block">Destination</span>
                                <p className="text-xs sm:text-sm text-[#10251C] dark:text-[#F7F5ED] line-clamp-1">{booking.dropAddress}</p>
                              </div>
                            </div>
                          </div>

                          {/* METRICS ROW */}
                          <div className="px-3.5 sm:px-4 py-2.5 bg-white/50 dark:bg-[#061A16]/40 border-t border-[#DED7CA] dark:border-[#1E3E34] flex items-center justify-between text-xs text-[#696B64] dark:text-[#B9C8BF]">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#123D32] dark:text-[#347858]" />
                              <span>{formatDate(booking.createdAt)}</span>
                            </div>
                            <div className="font-bold text-sm sm:text-base text-[#10251C] dark:text-[#F7F5ED] flex items-center">
                              <IndianRupee size={14} className="mr-0.5" />
                              {booking.fare}
                            </div>
                          </div>

                          {/* FOOTER ACTIONS */}
                          <div className="p-3.5 sm:p-4 bg-white/80 dark:bg-[#061A16]/80 border-t border-[#DED7CA] dark:border-[#1E3E34] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {booking.status === "cancelled" || booking.status === "expired" ? (
                                <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full border bg-[#FAF7F0] dark:bg-[#10352C] text-[#696B64] dark:text-[#B9C8BF] border-[#DED7CA] dark:border-[#1E3E34] font-medium">
                                  Not Applicable
                                </span>
                              ) : (
                                <span className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full border ${
                                  booking.paymentStatus === 'paid' 
                                    ? 'bg-[#E5EBDD] dark:bg-[#28664D]/20 text-[#123D32] dark:text-[#347858] border-[#DED7CA] dark:border-[#28664D]/30 font-medium' 
                                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-medium'
                                }`}>
                                  {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {booking.status === "completed" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedBookingForInvoice(booking);
                                    setShowInvoiceModal(true);
                                  }}
                                  className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold text-[#10251C] dark:text-[#F7F5ED] hover:text-[#123D32] dark:hover:text-[#347858] bg-white dark:bg-[#10352C] hover:bg-[#FAF7F0] dark:hover:bg-[#143D32] px-3.5 py-2 transition-colors border border-[#DED7CA] dark:border-[#1E3E34] rounded-[8px] cursor-pointer"
                                  title="Download Official GST Tax Invoice"
                                >
                                  <FileText size={14} />
                                  <span>Invoice</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (["completed", "cancelled"].includes(booking.status)) {
                                    setSelectedBookingForDetails(booking);
                                    setShowDetailsModal(true);
                                  } else {
                                    router.push(`/ride/${booking._id}`);
                                  }
                                }}
                                className="min-h-[44px] flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-[#046A38] hover:bg-[#03532C] dark:bg-[#058A48] dark:hover:bg-[#046A38] px-4 py-2 transition-colors cursor-pointer rounded-[8px] shadow-xs"
                              >
                                <span>View Details</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
