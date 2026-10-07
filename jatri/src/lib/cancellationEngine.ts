import { Types } from "mongoose";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/wallet-transaction.model";
import { haversineDistance } from "@/lib/routeUtils";

export interface CancellationAssessment {
  fee: number;
  feeApplied: boolean;
  reason: string;
  elapsedSeconds: number;
  driverArrived: boolean;
  driverCompensation: number;
  platformShare: number;
  policyCategory:
    | "NO_DRIVER"
    | "GRACE_PERIOD"
    | "DRIVER_ARRIVED"
    | "DRIVER_EN_ROUTE"
    | "DRIVER_DELAY_WAIVED"
    | "DRIVER_CANCELLED"
    | "ADMIN_OR_SYSTEM";
}

// Vehicle category tiered cancellation matrix
const VEHICLE_CANCELLATION_TIERS: Record<
  string,
  { enRouteFee: number; arrivedFee: number }
> = {
  bike: { enRouteFee: 25, arrivedFee: 40 },
  auto: { enRouteFee: 35, arrivedFee: 50 },
  car: { enRouteFee: 45, arrivedFee: 60 },
  loading: { enRouteFee: 60, arrivedFee: 80 },
  truck: { enRouteFee: 80, arrivedFee: 100 },
};

/**
 * Calculates authoritative dynamic cancellation fee based on:
 * - Driver assignment status
 * - Elapsed time since driver acceptance (2-minute free grace window)
 * - Driver location & physical proximity to pickup
 * - Driver delay/off-route customer claims
 * - Vehicle category
 */
export function calculateDynamicCancellationFee(params: {
  booking: any;
  cancelledBy: "user" | "driver" | "admin" | "system";
  reason?: string;
  driverLocation?: [number, number];
  driverCompensationShare?: number; // Default 0.70 (70% to driver)
}): CancellationAssessment {
  const {
    booking,
    cancelledBy,
    reason = "",
    driverLocation,
    driverCompensationShare = 0.7,
  } = params;

  // 1. Driver or Admin or System cancellations never penalize passenger
  if (cancelledBy !== "user") {
    return {
      fee: 0,
      feeApplied: false,
      reason:
        cancelledBy === "driver"
          ? "Cancelled by driver — passenger is not charged"
          : "Cancelled by system or admin — no fee applied",
      elapsedSeconds: 0,
      driverArrived: false,
      driverCompensation: 0,
      platformShare: 0,
      policyCategory:
        cancelledBy === "driver" ? "DRIVER_CANCELLED" : "ADMIN_OR_SYSTEM",
    };
  }

  // 2. Check if driver was accepted/assigned
  const isDriverAssigned =
    Boolean(booking.driver) &&
    (booking.status === "confirmed" ||
      booking.status === "awaiting_payment" ||
      Boolean(booking.acceptedAt));

  if (!isDriverAssigned) {
    return {
      fee: 0,
      feeApplied: false,
      reason: "No driver was assigned to this ride yet (Free Cancellation)",
      elapsedSeconds: 0,
      driverArrived: false,
      driverCompensation: 0,
      platformShare: 0,
      policyCategory: "NO_DRIVER",
    };
  }

  // Calculate elapsed time from acceptance
  const acceptedTime = booking.acceptedAt
    ? new Date(booking.acceptedAt).getTime()
    : booking.updatedAt
    ? new Date(booking.updatedAt).getTime()
    : Date.now();

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - acceptedTime) / 1000));

  // Determine vehicle tier
  const vType = String(booking.vehicle?.vehicleType || booking.vehicleType || "car").toLowerCase();
  const tier = VEHICLE_CANCELLATION_TIERS[vType] || VEHICLE_CANCELLATION_TIERS.car;

  // Check driver proximity
  let distanceToPickupKm: number | null = null;
  if (driverLocation && booking.pickupLocation?.coordinates) {
    distanceToPickupKm = Number(
      haversineDistance(driverLocation, booking.pickupLocation.coordinates as [number, number]).toFixed(2)
    );
  }

  const isDriverArrived =
    Boolean(booking.pickupOtp) || (distanceToPickupKm !== null && distanceToPickupKm <= 0.2);

  const lowerReason = reason.toLowerCase();
  const isDriverDelayedClaim =
    lowerReason.includes("taking too long") ||
    lowerReason.includes("wrong direction") ||
    lowerReason.includes("delayed");

  // 3. Condition A: Driver arrived at pickup location
  if (isDriverArrived) {
    const fee = Math.min(tier.arrivedFee, booking.fare || tier.arrivedFee);
    const driverComp = Math.round(fee * driverCompensationShare);
    return {
      fee,
      feeApplied: true,
      reason: `Cancellation after driver reached pickup location (${vType.toUpperCase()} fee applied)`,
      elapsedSeconds,
      driverArrived: true,
      driverCompensation: driverComp,
      platformShare: fee - driverComp,
      policyCategory: "DRIVER_ARRIVED",
    };
  }

  // 4. Condition B: Within 120 seconds (2 minutes grace period)
  if (elapsedSeconds <= 120) {
    return {
      fee: 0,
      feeApplied: false,
      reason: "Cancelled within the 2-minute free cancellation grace period",
      elapsedSeconds,
      driverArrived: false,
      driverCompensation: 0,
      platformShare: 0,
      policyCategory: "GRACE_PERIOD",
    };
  }

  // 5. Condition C: Driver en-route, but significantly delayed or off-route
  if (isDriverDelayedClaim && distanceToPickupKm !== null && distanceToPickupKm > 3.0) {
    return {
      fee: 0,
      feeApplied: false,
      reason: "Penalty waived: Driver is delayed or over 3 km away from pickup",
      elapsedSeconds,
      driverArrived: false,
      driverCompensation: 0,
      platformShare: 0,
      policyCategory: "DRIVER_DELAY_WAIVED",
    };
  }

  // 6. Condition D: Driver en-route after grace window
  const fee = Math.min(tier.enRouteFee, booking.fare || tier.enRouteFee);
  const driverComp = Math.round(fee * driverCompensationShare);
  return {
    fee,
    feeApplied: true,
    reason: `Cancelled after 2-minute grace period with driver en route (${vType.toUpperCase()} fuel & travel compensation)`,
    elapsedSeconds,
    driverArrived: false,
    driverCompensation: driverComp,
    platformShare: fee - driverComp,
    policyCategory: "DRIVER_EN_ROUTE",
  };
}

function generateTxnId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

/**
 * Executes full financial ledger settlement for a cancelled ride:
 * - Customer Wallet deduction / refund
 * - Customer Outstanding Balance accumulation if wallet balance is insufficient
 * - Driver Earnings Ledger compensation credit (+70% to driver)
 */
export async function processRideCancellationSettlement(params: {
  bookingId: string | Types.ObjectId;
  riderId: string | Types.ObjectId;
  driverId?: string | Types.ObjectId;
  cancellationFee: number;
  cancellationFeeApplied: boolean;
  reason?: string;
  isPrepaid: boolean;
  paidAmount?: number;
  driverCompensation?: number;
}): Promise<{
  refundAmount: number;
  walletDeducted: number;
  outstandingAccrued: number;
  driverCompCredited: number;
}> {
  await connectDb();

  const {
    bookingId,
    riderId,
    driverId,
    cancellationFee,
    cancellationFeeApplied,
    reason = "Ride cancelled",
    isPrepaid,
    paidAmount = 0,
  } = params;

  let refundAmount = 0;
  let walletDeducted = 0;
  let outstandingAccrued = 0;
  let driverCompCredited = 0;

  // ─── 1. CUSTOMER SIDE SETTLEMENT ───
  const riderWallet =
    (await Wallet.findOne({ userId: riderId })) ||
    (await Wallet.create({ userId: riderId, balance: 0, outstandingAmount: 0 }));

  const currentRiderBalance = riderWallet.balance || 0;

  if (isPrepaid && paidAmount > 0) {
    if (paidAmount >= cancellationFee) {
      // Customer paid more than the fee -> Refund the net difference
      refundAmount = paidAmount - cancellationFee;

      if (refundAmount > 0) {
        await Wallet.findByIdAndUpdate(riderWallet._id, {
          $inc: { balance: refundAmount },
        });
        await User.findByIdAndUpdate(riderId, {
          $inc: { walletBalance: refundAmount },
        });

        await WalletTransaction.create({
          transactionId: generateTxnId("TXN_REF"),
          walletId: riderWallet._id,
          userId: riderId,
          rideId: bookingId,
          bookingId,
          type: "credit",
          transactionType: "REFUND",
          category: "ride_refund",
          amount: refundAmount,
          balanceBefore: currentRiderBalance,
          balanceAfter: currentRiderBalance + refundAmount,
          description: cancellationFeeApplied
            ? `Net refund for ride #${bookingId.toString().slice(-6)} (₹${cancellationFee} cancellation fee retained)`
            : `100% full refund for cancelled ride #${bookingId.toString().slice(-6)}`,
          status: "success",
          metadata: { cancellationFee, paidAmount, reason },
        });
      }
    } else {
      // Customer paid less than cancellation fee -> difference becomes outstanding
      const shortfall = cancellationFee - paidAmount;
      outstandingAccrued = shortfall;

      await User.findByIdAndUpdate(riderId, {
        $inc: { outstandingAmount: shortfall },
      });
      await Wallet.findByIdAndUpdate(riderWallet._id, {
        $inc: { outstandingAmount: shortfall },
      });
    }
  } else {
    // Ride was NOT prepaid (cash ride or awaiting payment)
    if (cancellationFeeApplied && cancellationFee > 0) {
      if (currentRiderBalance >= cancellationFee) {
        // Customer has sufficient wallet balance -> deduct immediately
        walletDeducted = cancellationFee;
        const newBal = currentRiderBalance - cancellationFee;

        await Wallet.findByIdAndUpdate(riderWallet._id, {
          balance: newBal,
        });
        await User.findByIdAndUpdate(riderId, {
          walletBalance: newBal,
        });

        await WalletTransaction.create({
          transactionId: generateTxnId("TXN_CANC_FEE"),
          walletId: riderWallet._id,
          userId: riderId,
          rideId: bookingId,
          bookingId,
          type: "debit",
          transactionType: "CANCELLATION_CHARGE",
          category: "cancellation_charge",
          amount: cancellationFee,
          balanceBefore: currentRiderBalance,
          balanceAfter: newBal,
          description: `Cancellation fee deducted for ride #${bookingId.toString().slice(-6)}`,
          status: "success",
          metadata: { cancellationFee, reason },
        });
      } else {
        // Insufficient wallet balance -> deduct available balance, remainder becomes outstanding
        const availableToDeduct = Math.max(0, currentRiderBalance);
        const unpaidRemainder = cancellationFee - availableToDeduct;

        walletDeducted = availableToDeduct;
        outstandingAccrued = unpaidRemainder;

        if (availableToDeduct > 0) {
          await Wallet.findByIdAndUpdate(riderWallet._id, {
            balance: 0,
            $inc: { outstandingAmount: unpaidRemainder },
          });
          await User.findByIdAndUpdate(riderId, {
            walletBalance: 0,
            $inc: { outstandingAmount: unpaidRemainder },
          });

          await WalletTransaction.create({
            transactionId: generateTxnId("TXN_CANC_FEE"),
            walletId: riderWallet._id,
            userId: riderId,
            rideId: bookingId,
            bookingId,
            type: "debit",
            transactionType: "CANCELLATION_CHARGE",
            category: "cancellation_charge",
            amount: availableToDeduct,
            balanceBefore: currentRiderBalance,
            balanceAfter: 0,
            description: `Partial cancellation fee deducted. Remaining ₹${unpaidRemainder} added to outstanding balance.`,
            status: "success",
            metadata: {
              totalFee: cancellationFee,
              deducted: availableToDeduct,
              unpaidOutstanding: unpaidRemainder,
              reason,
            },
          });
        } else {
          // Zero balance -> Entire fee becomes outstanding dues
          await User.findByIdAndUpdate(riderId, {
            $inc: { outstandingAmount: unpaidRemainder },
          });
          await Wallet.findByIdAndUpdate(riderWallet._id, {
            $inc: { outstandingAmount: unpaidRemainder },
          });
        }
      }
    }
  }

  // ─── 2. DRIVER SIDE COMPENSATION ───
  const compFee =
    params.driverCompensation !== undefined
      ? params.driverCompensation
      : cancellationFeeApplied && cancellationFee > 0
      ? Math.round(cancellationFee * 0.7) // 70% to driver
      : 0;

  if (cancellationFeeApplied && compFee > 0 && driverId) {
    driverCompCredited = compFee;
    const driverWallet =
      (await Wallet.findOne({ userId: driverId })) ||
      (await Wallet.create({ userId: driverId, balance: 0, platformDues: 0 }));

    const dBefore = driverWallet.balance || 0;
    const currentDues = driverWallet.platformDues || 0;

    let duesSettled = 0;
    let netCredit = compFee;
    let remainingDues = currentDues;

    // Settle driver platform dues if any
    if (currentDues > 0) {
      duesSettled = Math.min(currentDues, compFee);
      remainingDues = currentDues - duesSettled;
      netCredit = compFee - duesSettled;
    }

    const dAfter = dBefore + netCredit;

    await Wallet.findByIdAndUpdate(driverWallet._id, {
      balance: dAfter,
      platformDues: remainingDues,
      $inc: { totalEarnings: compFee },
    });

    await User.findByIdAndUpdate(driverId, {
      walletBalance: dAfter,
    });

    await WalletTransaction.create({
      transactionId: generateTxnId("TXN_COMP"),
      walletId: driverWallet._id,
      userId: driverId,
      rideId: bookingId,
      bookingId,
      type: "credit",
      transactionType: "CANCELLATION_COMPENSATION",
      category: "cancellation_compensation",
      amount: compFee,
      balanceBefore: dBefore,
      balanceAfter: dAfter,
      platformDuesBefore: currentDues,
      platformDuesAfter: remainingDues,
      description: `Cancellation compensation (70%) for ride #${bookingId.toString().slice(-6)}`,
      status: "success",
      metadata: {
        totalCancellationFee: cancellationFee,
        driverCompensation: compFee,
        duesSettled,
        reason,
      },
    });
  }

  return {
    refundAmount,
    walletDeducted,
    outstandingAccrued,
    driverCompCredited,
  };
}

/**
 * Recovers unpaid customer cancellation dues during next ride payment or wallet top-up.
 */
export async function recoverCustomerOutstandingDues(params: {
  userId: string | Types.ObjectId;
  paidAmount: number;
  bookingId?: string | Types.ObjectId;
}): Promise<{ recoveredAmount: number; remainingOutstanding: number }> {
  await connectDb();
  const { userId, paidAmount, bookingId } = params;

  const user = await User.findById(userId).select("outstandingAmount").lean();
  const currentOutstanding = (user as any)?.outstandingAmount || 0;

  if (currentOutstanding <= 0) {
    return { recoveredAmount: 0, remainingOutstanding: 0 };
  }

  const recoveredAmount = Math.min(currentOutstanding, paidAmount);
  const remainingOutstanding = currentOutstanding - recoveredAmount;

  await User.findByIdAndUpdate(userId, {
    outstandingAmount: remainingOutstanding,
  });

  const wallet = await Wallet.findOne({ userId });
  if (wallet) {
    wallet.outstandingAmount = remainingOutstanding;
    await wallet.save();

    await WalletTransaction.create({
      transactionId: generateTxnId("TXN_REC"),
      walletId: wallet._id,
      userId,
      bookingId,
      type: "debit",
      transactionType: "OUTSTANDING_RECOVERY",
      category: "outstanding_recovery",
      amount: recoveredAmount,
      balanceBefore: wallet.balance || 0,
      balanceAfter: wallet.balance || 0,
      description: `Recovered previous outstanding cancellation dues for ride #${bookingId?.toString().slice(-6) || "recent"}`,
      status: "success",
      metadata: {
        previousOutstanding: currentOutstanding,
        recoveredAmount,
        remainingOutstanding,
      },
    });
  }

  return { recoveredAmount, remainingOutstanding };
}
