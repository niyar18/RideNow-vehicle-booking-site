import { isObjectIdOrHexString, type ClientSession } from "mongoose";
import connectDb from "@/lib/db";
import Booking, { type IBooking } from "@/models/booking.model";
import User from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/wallet-transaction.model";
import { generateTransactionId } from "@/lib/walletLedger";
import { calculateCommissionSplit } from "@/lib/commission";
import { generateSecureOtp } from "@/lib/cryptoOtp";
import { emitSocketEvent } from "@/lib/socketServerEmit";

type Input = {
  bookingId: string;
  actorId: string;
  mode: "wallet" | "cash";
  walletAmount?: number;
  canConfirmOfflineForOthers?: boolean;
};

type PaymentSuccess = {
  booking: IBooking;
  alreadyConfirmed: boolean;
  transactionId?: string;
  newBalance?: number;
};
type PaymentFailure = {
  status: 400 | 403 | 404 | 409;
  error: string;
  insufficientBalance?: true;
  balance?: number;
  required?: number;
  shortfall?: number;
  rideFare?: number;
  outstandingDues?: number;
};
type Result = PaymentSuccess | PaymentFailure;

const toPaise = (amount: number | undefined) => Math.round((amount ?? 0) * 100);
const toRupees = (amount: number) => amount / 100;

async function confirmWithinTransaction(input: Input, session: ClientSession): Promise<Result> {
  const booking = await Booking.findById(input.bookingId).session(session);
  if (!booking) return { status: 404, error: "Booking not found" };
  if (
    booking.user?.toString() !== input.actorId &&
    !(input.mode === "cash" && input.canConfirmOfflineForOthers)
  ) {
    return { status: 403, error: "Forbidden" };
  }

  const idempotencyKey = `RIDE_WALLET_PAYMENT:${booking._id}`;
  if (booking.paymentStatus === "paid" || (booking.status === "confirmed" && booking.paymentStatus === "cash")) {
    if (input.mode === "wallet" && booking.paymentStatus === "cash") {
      return { status: 409, error: "This booking is already confirmed for cash payment." };
    }
    const receipt = await WalletTransaction.findOne({ idempotencyKey })
      .select("transactionId balanceAfter metadata").session(session).lean();
    return {
      booking,
      alreadyConfirmed: true,
      transactionId: receipt?.transactionId,
      newBalance: receipt?.metadata?.finalBalance ?? receipt?.balanceAfter,
    };
  }

  if (!booking.user || !["awaiting_payment", "confirmed"].includes(booking.status)) {
    return { status: 400, error: "Invalid booking status for payment confirmation" };
  }

  const fare = toPaise(booking.fare);
  if (!Number.isSafeInteger(fare) || fare < 0 || (input.mode === "wallet" && fare === 0)) {
    return { status: 400, error: "Invalid booking fare" };
  }

  const requested = toPaise(input.walletAmount);
  if (!Number.isSafeInteger(requested) || requested < 0) {
    return { status: 400, error: "Invalid wallet amount" };
  }

  // A legacy interrupted charge must be reconciled, not charged a second time.
  const priorDebit = await WalletTransaction.exists({
    userId: booking.user,
    bookingId: booking._id,
    transactionType: "RIDE_PAYMENT",
    status: "success",
  }).session(session);
  if (priorDebit) {
    return { status: 409, error: "An existing wallet charge needs reconciliation before payment can be retried." };
  }

  let transactionId: string | undefined;
  let newBalance: number | undefined;
  let farePaid = 0;
  if (input.mode === "wallet" || requested > 0) {
    const rider = await User.findById(booking.user)
      .select("walletBalance outstandingAmount").session(session).lean();
    if (!rider) return { status: 404, error: "Booking owner not found" };

    let wallet = await Wallet.findOne({ userId: booking.user }).session(session);
    const balance = toPaise(wallet?.balance ?? rider.walletBalance);
    const currentDues = Math.max(0, toPaise(rider.outstandingAmount));
    const includedDues = Math.min(fare, Math.max(0, toPaise(booking.cancellationDuesIncluded)));
    if (![balance, currentDues, includedDues].every(Number.isSafeInteger)) {
      throw new Error("Invalid stored wallet amounts");
    }
    const extraDues = input.mode === "wallet" ? Math.max(0, currentDues - includedDues) : 0;
    const totalRequired = fare + extraDues;
    if (!Number.isSafeInteger(totalRequired)) throw new Error("Invalid stored payment total");

    if (input.mode === "wallet" && balance < totalRequired) {
      return {
        status: 400, error: "Insufficient wallet balance", insufficientBalance: true,
        balance: toRupees(balance), required: toRupees(totalRequired),
        shortfall: toRupees(totalRequired - balance), rideFare: toRupees(fare),
        outstandingDues: toRupees(extraDues),
      };
    }

    farePaid = input.mode === "wallet" ? fare : Math.min(fare, requested, Math.max(0, balance));
    const debit = farePaid + extraDues;

    if (debit > 0) {
      if (wallet?.status === "frozen") return { status: 400, error: "Wallet is frozen" };
      if (!wallet) {
        [wallet] = await Wallet.create([{
          userId: booking.user, balance: toRupees(balance),
          outstandingAmount: toRupees(currentDues), currency: "INR",
        }], { session });
      }

      // A partial wallet payment leaves the included dues to the normal cash settlement.
      const recoveredDues = farePaid === fare ? Math.min(currentDues, includedDues + extraDues) : 0;
      const remainingDues = toRupees(currentDues - recoveredDues);
      newBalance = toRupees(balance - debit);
      const updatedWallet = await Wallet.updateOne(
        { _id: wallet!._id, balance: { $gte: toRupees(debit) } },
        { $set: { balance: newBalance, outstandingAmount: remainingDues } },
        { session }
      );
      if (updatedWallet.matchedCount !== 1) throw new Error("Wallet balance changed during payment");

      const updatedUser = await User.updateOne(
        { _id: booking.user },
        { $set: { walletBalance: newBalance, outstandingAmount: remainingDues } },
        { session }
      );
      if (updatedUser.matchedCount !== 1) throw new Error("Booking owner was removed during payment");

      transactionId = generateTransactionId("TXN_PAY");
      const paymentDebit = debit - recoveredDues;
      const afterRideDebit = toRupees(balance - paymentDebit);
      const chargeDetails = {
        walletId: wallet!._id, userId: booking.user, bookingId: booking._id,
        type: "debit", status: "success",
      };
      await WalletTransaction.create([{
        ...chargeDetails, transactionId, idempotencyKey,
        transactionType: "RIDE_PAYMENT",
        category: "ride_payment",
        amount: toRupees(paymentDebit),
        balanceBefore: toRupees(balance),
        balanceAfter: afterRideDebit,
        description: `Wallet payment for ride #${booking._id.toString().slice(-6)}`,
        metadata: { rideWalletAmount: toRupees(farePaid), finalBalance: newBalance },
      }], { session });
      if (recoveredDues > 0) {
        await WalletTransaction.create([{
          ...chargeDetails,
          transactionId: generateTransactionId("TXN_REC"),
          transactionType: "OUTSTANDING_RECOVERY",
          category: "outstanding_recovery",
          amount: toRupees(recoveredDues),
          balanceBefore: afterRideDebit,
          balanceAfter: newBalance,
          description: "Cancellation dues recovered with ride wallet payment",
          metadata: { rideId: booking._id, recoveredAmount: toRupees(recoveredDues) },
        }], { session });
      }

      if (farePaid === fare) {
        // Included dues were reconciled above, even when nothing remained to recover.
        booking.walletPaymentConfirmedAt = new Date();
        const split = calculateCommissionSplit(toRupees(fare - includedDues));
        booking.adminCommission = split.adminCommission + toRupees(recoveredDues);
        booking.partnerAmount = split.partnerAmount;
      }
    }
  }

  booking.walletAmountPaid = toRupees(farePaid);
  booking.cashAmountDue = toRupees(fare - farePaid);
  booking.status = "confirmed";
  booking.paymentStatus = farePaid === fare ? "paid" : "cash";
  booking.paymentDeadline = undefined;
  if (!booking.pickupOtp) {
    booking.pickupOtp = generateSecureOtp(4);
    booking.pickupOtpExpires = new Date(Date.now() + 60 * 60 * 1000);
  }
  // A concurrent state write conflicts with this transaction and causes a snapshot retry.
  await booking.save({ session });
  return { booking, alreadyConfirmed: false, transactionId, newBalance };
}

export async function confirmRideWalletPayment(input: Input): Promise<Result> {
  if (!isObjectIdOrHexString(input.bookingId)) return { status: 400, error: "Invalid booking ID" };
  const connection = await connectDb();
  if (!connection) throw new Error("Database unavailable");
  try {
    // Never fall back to independent writes: MongoDB transactions require a replica set.
    return await connection.transaction((session) => confirmWithinTransaction(input, session));
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      return { status: 409, error: "Payment is being updated. Check the booking before retrying." };
    }
    throw error;
  }
}

export async function notifyRidePaymentConfirmed(booking: IBooking) {
  const data = {
    bookingId: booking._id.toString(),
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    cashAmountDue: booking.cashAmountDue,
    walletAmountPaid: booking.walletAmountPaid,
  };
  // The public and participant booking room must never receive a rider-only OTP.
  await emitSocketEvent({
    event: "booking-updated", data,
    userId: booking.driver?.toString(), directBookingId: data.bookingId,
  });
  await emitSocketEvent({
    event: "booking-updated",
    userId: booking.user.toString(),
    data: { ...data, pickupOtp: booking.pickupOtp },
  });
}
