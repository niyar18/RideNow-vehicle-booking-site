"use client";

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
} from "lucide-react";

interface Booking {
  _id: string;
  pickupAddress: string;
  dropAddress: string;
  fare: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  createdAt: string;
  user?: {
    name: string;
    phone?: string;
  };
  vehicle?: {
    vehicleModel: string;
    type?: string; // car, bike, auto, truck etc.
    imageUrl?: string;
    number?: string;
  };
  userMobileNumber?: string;
}

export default function PartnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/partner/bookings");
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
      confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      completed: "bg-teal-50 text-teal-700 border-teal-200",
      requested: "bg-amber-50 text-amber-700 border-amber-200",
      awaiting_payment: "bg-blue-50 text-blue-700 border-blue-200",
      cancelled: "bg-rose-50 text-rose-700 border-rose-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
      expired: "bg-gray-50 text-gray-700 border-gray-200",
    };
    return colors[status] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getVehicleIcon = (vehicleType?: string) => {
    switch(vehicleType?.toLowerCase()) {
      case 'bike':
      case 'motorcycle':
        return <Bike className="w-4 h-4 text-gray-400" />;
      case 'auto':
      case 'rickshaw':
        return <Car className="w-4 h-4 text-gray-400" />; // You can add Auto icon if available
      case 'truck':
      case 'lorry':
        return <Truck className="w-4 h-4 text-gray-400" />;
      case 'suv':
      case 'sedan':
      case 'hatchback':
      default:
        return <Car className="w-4 h-4 text-gray-400" />;
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
    <div className="min-h-screen bg-gray-50">
      
      {/* HEADER - PARTNER SPECIFIC */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto py-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Partner Bookings</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {bookings.length} {bookings.length === 1 ? 'ride' : 'rides'} assigned to you
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          
          {/* FILTER BAR */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-500">
              Showing {filteredBookings.length} bookings
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All</option>
              <option>Confirmed</option>
              <option>Completed</option>
              <option>Requested</option>
              <option>Cancelled</option>
            </select>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && filteredBookings.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No bookings yet</h3>
              <p className="text-gray-500 text-sm mt-1">When customers book rides, they'll appear here</p>
            </div>
          )}

          {/* BOOKINGS LIST */}
          {!loading && filteredBookings.length > 0 && (
            <div className="space-y-4">
              {filteredBookings.map((booking, index) => (
                <motion.div
                  key={booking._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    
                    {/* CUSTOMER INFO - PARTNER SPECIFIC */}
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                      {/* CUSTOMER AVATAR */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-200 flex-shrink-0 border-2 border-white shadow-sm flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      {/* CUSTOMER DETAILS */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">
                            {booking.user?.name || "Customer"}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status.replace("_", " ")}
                          </span>
                        </div>
                        
                        {/* USER MOBILE NUMBER - UPDATED */}
                        {(booking.userMobileNumber || booking.user?.phone) && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{booking.userMobileNumber || booking.user?.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* VEHICLE INFO - WITH DYNAMIC ICON */}
                    {booking.vehicle && (
                      <div className="px-4 pt-3">
                        <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2">
                          {getVehicleIcon(booking.vehicle.type)}
                          <span className="text-xs text-gray-600">
                            {booking.vehicle.vehicleModel} • {booking.vehicle.number || "Not assigned"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ADDRESS SECTION */}
                    <div className="p-4 space-y-3">
                      {/* PICKUP */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-3 h-3 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-green-600 uppercase tracking-wider">PICKUP</span>
                          <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">
                            {booking.pickupAddress}
                          </p>
                        </div>
                      </div>

                      {/* DROP */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-3 h-3 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-red-600 uppercase tracking-wider">DROP</span>
                          <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">
                            {booking.dropAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DATE AND FARE */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(booking.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-gray-900">
                        <IndianRupee className="w-4 h-4" />
                        <span>₹{booking.fare}</span>
                      </div>
                    </div>

                    {/* PAYMENT AND ACTIONS */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Payment:</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          booking.paymentStatus === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {booking.paymentStatus || 'pending'}
                        </span>
                        {booking.paymentMethod && (
                          <span className="text-xs text-gray-500 capitalize">
                            • {booking.paymentMethod}
                          </span>
                        )}
                      </div>

                      {booking.status!=="completed" &&  <div className="flex items-center gap-2">
                        {/* STATUS UPDATE BUTTONS - PARTNER SPECIFIC */}
                        
                        <button
                          onClick={() => window.location.href = `/partner/active-ride`}
                          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-lg transition-colors"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>}
                     
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}