import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import {
  creditDriverRideEarnings,
  debitDriverCashCommission,
} from "@/lib/walletLedger";
import { calculateCommissionSplit } from "@/lib/commission";
import { recoverCustomerOutstandingDues } from "@/lib/cancellationEngine";
import { Types } from "mongoose";
import logger from "@/lib/logger";

/**
 * Ride Payment Settlement Architecture:
 *
 * CUSTOMER (pays ₹300)
 *    │
 *    ├── 💵 Cash: collected by driver in hand
 *    ├── 💳 Wallet: deducted from customer wallet
 *    └── ⚡ Online: paid via Razorpay
 *
 * Split Payment Driver Reconciliation:
 * 1. If customer uses wallet + cash:
 *    - If walletAmountPaid > adminCommission:
 *      Platform keeps its commission, and surplus (walletAmountPaid - adminCommission)
 *      is credited to the Driver Wallet!
 *    - If walletAmountPaid < adminCommission:
 *      Wallet covers part of commission; the shortfall (adminCommission - walletAmountPaid)
 *      is deducted from driver's wallet balance, with any remainder added to platformDues.
 *    - If walletAmountPaid === adminCommission:
 *      Platform commission is fully covered by wallet payment; driver keeps full cash collected.
 * 2. If 100% Cash ride:
 *    - Full platform commission is debited from Driver Wallet / added to platformDues.
 * 3. If 100% Online / 100% Wallet / Split Online:
 *    - Driver net earnings (85%) credited to Driver Wallet.
 */
export interface SettlementResult {
  success: boolean;
  settlementStatus: "success" | "failed" | "skipped";
  error?: string;
}

export async function settleCompletedRidePayment(
  bookingId: string | Types.ObjectId
): Promise<SettlementResult> {
  try {
    await connectDb();

    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.driver) {
      return { success: false, settlementStatus: "skipped", error: "Booking or driver not found" };
    }

    const fare = Math.round(Number(booking.fare)) || 0;
    if (fare <= 0) {
      return { success: true, settlementStatus: "skipped" };
    }

    // Platform commission via authoritative commission engine (15% standard or booking value)
    const { adminCommission: defaultCommission, partnerAmount: defaultDriverEarning } =
      calculateCommissionSplit(fare);

    const adminCommission =
      typeof booking.adminCommission === "number" && booking.adminCommission > 0
        ? Math.round(booking.adminCommission)
        : defaultCommission;

    const driverEarning =
      typeof booking.partnerAmount === "number" && booking.partnerAmount > 0
        ? Math.round(booking.partnerAmount)
        : defaultDriverEarning;

    const walletPaid = Math.round(Number(booking.walletAmountPaid || 0));

    if (booking.paymentStatus === "cash") {
      // 💵 CASH RIDE (or Split: Partial Wallet + Cash):
      if (walletPaid > 0) {
        // Customer used wallet balance along with cash!
        // Rule: If wallet amount > commission, credit excess to driver after commission.
        //       If wallet amount < commission, deduct from wallet balance and add rest to platform dues.
        if (walletPaid > adminCommission) {
          const surplusCredit = walletPaid - adminCommission;
          await creditDriverRideEarnings({
            bookingId: booking._id,
            driverId: booking.driver,
            fare,
            adminCommission,
            partnerAmount: surplusCredit,
            paymentMethod: "wallet_split_surplus",
          });
        } else if (walletPaid < adminCommission) {
          const commissionShortfall = adminCommission - walletPaid;
          await debitDriverCashCommission({
            bookingId: booking._id,
            driverId: booking.driver,
            fare,
            adminCommission: commissionShortfall,
          });
        } else {
          // walletPaid === adminCommission: platform commission fully covered by wallet payment.
          // Driver collected exact net share in cash. No ledger deduction or dues needed.
        }
      } else {
        // Standard 100% cash ride:
        await debitDriverCashCommission({
          bookingId: booking._id,
          driverId: booking.driver,
          fare,
          adminCommission,
        });
      }
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

    // Recover customer outstanding cancellation dues if included in this ride
    if (!booking.walletPaymentConfirmedAt && booking.user && booking.cancellationDuesIncluded && booking.cancellationDuesIncluded > 0) {
      try {
        await recoverCustomerOutstandingDues({
          userId: booking.user,
          paidAmount: booking.cancellationDuesIncluded,
          bookingId: booking._id,
        });
      } catch (recErr: any) {
        logger.error("settlement.cancellation_dues_recovery_failed", {
          bookingId: String(booking._id),
          userId: String(booking.user),
          amount: booking.cancellationDuesIncluded,
          error: recErr?.message || String(recErr),
        });
      }
    }

    // Flag booking as authoritatively settled
    await Booking.findByIdAndUpdate(bookingId, {
      settlementStatus: "success",
      settledAt: new Date(),
      settlementError: null,
    });

    logger.info("settlement.completed", {
      bookingId: String(bookingId),
      driverId: String(booking.driver),
      paymentStatus: booking.paymentStatus,
      fare: booking.fare,
    });

    return { success: true, settlementStatus: "success" };
  } catch (err: any) {
    logger.critical("settlement.failed", {
      bookingId: String(bookingId),
      error: err?.message || String(err),
      stack: err?.stack,
    });
    await Booking.findByIdAndUpdate(bookingId, {
      settlementStatus: "failed",
      settlementError: String(err?.message || err),
      settlementFailedAt: new Date(),
    }).catch((markErr) => {
      logger.critical("settlement.persist_failed_status_error", {
        bookingId: String(bookingId),
        error: markErr?.message || String(markErr),
      });
    });

    return {
      success: false,
      settlementStatus: "failed",
      error: err?.message || "Settlement failed",
    };
  }
}
