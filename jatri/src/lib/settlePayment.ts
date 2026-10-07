import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import {
  creditDriverRideEarnings,
  debitDriverCashCommission,
} from "@/lib/walletLedger";
import { Types } from "mongoose";

/**
 * Ride Payment Settlement Architecture:
 *
 * CUSTOMER (pays ₹300)
 *    │
 *    ▼
 * RIDE PAYMENT (₹300)
 *    │
 *    ├── Platform Commission (15% = ₹45) ──► Recorded as COMMISSION
 *    │
 *    └── Driver Earnings (85% = ₹255)
 *             │
 *             ▼
 *       DRIVER WALLET (+₹255 Available Earnings)
 *             │
 *             ▼
 *        WITHDRAWAL (to verified Bank/UPI)
 *
 * For Cash rides: Passenger pays ₹300 directly in driver's hand.
 * Platform commission (₹45) is debited from Driver Wallet.
 */
export async function settleCompletedRidePayment(bookingId: string | Types.ObjectId) {
  try {
    await connectDb();

    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.driver) return;

    const fare = Math.round(Number(booking.fare)) || 0;
    if (fare <= 0) return;

    // Platform commission is 10% standard (or booking.adminCommission if set)
    const adminCommission =
      typeof booking.adminCommission === "number" && booking.adminCommission > 0
        ? Math.round(booking.adminCommission)
        : Math.round(fare * 0.10);

    const driverEarning =
      typeof booking.partnerAmount === "number" && booking.partnerAmount > 0
        ? Math.round(booking.partnerAmount)
        : Math.max(0, fare - adminCommission);

    if (booking.paymentStatus === "cash") {
      // 💵 CASH RIDE:
      // Passenger handed 100% fare in cash to driver.
      // Debit platform commission (10%) from Driver's Wallet via authoritative ledger service.
      await debitDriverCashCommission({
        bookingId: booking._id,
        driverId: booking.driver,
        fare,
        adminCommission,
      });
    } else {
      // 💳 ONLINE / UPI / CARD / WALLET RIDE:
      // Passenger paid online to RideNow; credit driver's share (85%) to Driver Wallet via ledger service.
      await creditDriverRideEarnings({
        bookingId: booking._id,
        driverId: booking.driver,
        fare,
        adminCommission,
        partnerAmount: driverEarning,
        paymentMethod: booking.paymentStatus,
      });
    }
  } catch (err) {
    console.error("Error in settleCompletedRidePayment:", err);
  }
}
