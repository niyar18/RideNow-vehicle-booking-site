import { Types } from "mongoose";
import User, { IUser } from "@/models/user.model";
import Booking from "@/models/booking.model";

export const STUDENT_MONTHLY_DISCOUNT_CAP = 200; // ₹200 per student per month
export const STUDENT_MAX_MONTHLY_RIDES = 10;     // 10 discounted rides per calendar month
export const STUDENT_TIMEZONE = "Asia/Kolkata";

/**
 * Returns current month key in Indian Standard Time (IST), e.g. "2026-10".
 * Resets at 00:00 IST on the 1st of each calendar month.
 */
export function getIstMonthKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(date);
}

export interface StudentMonthlyStatus {
  isStudent: boolean;
  monthKey: string;
  discountUsed: number;
  discountReserved: number;
  remainingAllowance: number;
  ridesCount: number;
  reservedRidesCount: number;
  remainingRides: number;
  monthlyCap: number;
  maxRides: number;
}

/**
 * Retrieves current student allowance and usage in Asia/Kolkata time zone.
 * Automatically synchronizes month roll-overs if a new calendar month has started.
 */
export async function getStudentMonthlyStatus(
  userId: string | Types.ObjectId,
  { readOnly = false }: { readOnly?: boolean } = {},
): Promise<StudentMonthlyStatus> {
  const currentMonth = getIstMonthKey();
  const user = await User.findById(userId)
    .select("isStudent studentVerification studentMonthlyUsage")
    .lean();

  const isVerified =
    Boolean(user?.isStudent) &&
    user?.studentVerification?.status === "verified" &&
    Boolean(user?.studentVerification?.expiresAt) &&
    new Date(user.studentVerification.expiresAt).getTime() > Date.now();

  if (!user || !isVerified) {
    return {
      isStudent: false,
      monthKey: currentMonth,
      discountUsed: 0,
      discountReserved: 0,
      remainingAllowance: 0,
      ridesCount: 0,
      reservedRidesCount: 0,
      remainingRides: 0,
      monthlyCap: STUDENT_MONTHLY_DISCOUNT_CAP,
      maxRides: STUDENT_MAX_MONTHLY_RIDES,
    };
  }

  const usage = user.studentMonthlyUsage;
  const isDifferentMonth = !usage || usage.monthKey !== currentMonth;

  if (isDifferentMonth) {
    // Reset month counters atomically for the new calendar month
    if (!readOnly) await User.updateOne(
      { _id: user._id, "studentMonthlyUsage.monthKey": { $ne: currentMonth } },
      {
        $set: {
          "studentMonthlyUsage.monthKey": currentMonth,
          "studentMonthlyUsage.discountUsed": 0,
          "studentMonthlyUsage.discountReserved": 0,
          "studentMonthlyUsage.ridesCount": 0,
          "studentMonthlyUsage.reservedRidesCount": 0,
          "studentMonthlyUsage.lastResetAt": new Date(),
        },
      }
    );

    return {
      isStudent: true,
      monthKey: currentMonth,
      discountUsed: 0,
      discountReserved: 0,
      remainingAllowance: STUDENT_MONTHLY_DISCOUNT_CAP,
      ridesCount: 0,
      reservedRidesCount: 0,
      remainingRides: STUDENT_MAX_MONTHLY_RIDES,
      monthlyCap: STUDENT_MONTHLY_DISCOUNT_CAP,
      maxRides: STUDENT_MAX_MONTHLY_RIDES,
    };
  }

  const discountUsed = usage.discountUsed || 0;
  const discountReserved = usage.discountReserved || 0;
  const ridesCount = usage.ridesCount || 0;
  const reservedRidesCount = usage.reservedRidesCount || 0;

  const totalCommittedDiscount = discountUsed + discountReserved;
  const totalCommittedRides = ridesCount + reservedRidesCount;

  const remainingAllowance = Math.max(0, STUDENT_MONTHLY_DISCOUNT_CAP - totalCommittedDiscount);
  const remainingRides = Math.max(0, STUDENT_MAX_MONTHLY_RIDES - totalCommittedRides);

  return {
    isStudent: true,
    monthKey: currentMonth,
    discountUsed,
    discountReserved,
    remainingAllowance,
    ridesCount,
    reservedRidesCount,
    remainingRides,
    monthlyCap: STUDENT_MONTHLY_DISCOUNT_CAP,
    maxRides: STUDENT_MAX_MONTHLY_RIDES,
  };
}

/**
 * Concurrency-Safe Atomic Discount Reservation.
 * Guarantees that simultaneous ride bookings cannot exceed either the ₹200 allowance
 * or the 10-ride limit, including partial discount capping.
 */
/** Undo a reservation that was never attached to a persisted booking. */
export async function undoUnattachedStudentDiscount(userId: string, discountAmount: number) {
  if (discountAmount <= 0) return;
  await User.updateOne({
    _id: userId,
    "studentMonthlyUsage.monthKey": getIstMonthKey(),
    "studentMonthlyUsage.discountReserved": { $gte: discountAmount },
    "studentMonthlyUsage.reservedRidesCount": { $gte: 1 },
  }, {
    $inc: {
      "studentMonthlyUsage.discountReserved": -discountAmount,
      "studentMonthlyUsage.reservedRidesCount": -1,
    },
  });
}

export async function reserveStudentDiscount(
  userId: string | Types.ObjectId,
  requestedDiscount: number
): Promise<{
  success: boolean;
  discountAmount: number;
  remainingAllowance: number;
  remainingRides: number;
  reason?: string;
}> {
  if (requestedDiscount <= 0) {
    return {
      success: false,
      discountAmount: 0,
      remainingAllowance: 0,
      remainingRides: 0,
      reason: "No discount requested",
    };
  }

  const currentMonth = getIstMonthKey();

  // 1. Ensure user's monthKey is up-to-date with current IST month
  await User.updateOne(
    { _id: userId, "studentMonthlyUsage.monthKey": { $ne: currentMonth } },
    {
      $set: {
        "studentMonthlyUsage.monthKey": currentMonth,
        "studentMonthlyUsage.discountUsed": 0,
        "studentMonthlyUsage.discountReserved": 0,
        "studentMonthlyUsage.ridesCount": 0,
        "studentMonthlyUsage.reservedRidesCount": 0,
        "studentMonthlyUsage.lastResetAt": new Date(),
      },
    }
  );

  // 2. Fetch current status to evaluate eligible partial cap
  const status = await getStudentMonthlyStatus(userId);
  if (!status.isStudent) {
    return {
      success: false,
      discountAmount: 0,
      remainingAllowance: 0,
      remainingRides: 0,
      reason: "User is not a verified student or verification has expired",
    };
  }

  if (status.remainingRides <= 0) {
    return {
      success: false,
      discountAmount: 0,
      remainingAllowance: status.remainingAllowance,
      remainingRides: 0,
      reason: "Monthly student ride limit (10 rides) reached for this month",
    };
  }

  if (status.remainingAllowance <= 0) {
    return {
      success: false,
      discountAmount: 0,
      remainingAllowance: 0,
      remainingRides: status.remainingRides,
      reason: "Monthly student discount budget (₹200) reached for this month",
    };
  }

  // Calculate actual allowable reservation (partial cap applied up to remaining budget)
  const actualDiscountToReserve = Math.min(requestedDiscount, status.remainingAllowance);

  // 3. Atomic MongoDB Conditional Reservation Update
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      isStudent: true,
      "studentMonthlyUsage.monthKey": currentMonth,
      $expr: {
        $and: [
          {
            $lte: [
              {
                $add: [
                  { $ifNull: ["$studentMonthlyUsage.discountUsed", 0] },
                  { $ifNull: ["$studentMonthlyUsage.discountReserved", 0] },
                  actualDiscountToReserve,
                ],
              },
              STUDENT_MONTHLY_DISCOUNT_CAP,
            ],
          },
          {
            $lt: [
              {
                $add: [
                  { $ifNull: ["$studentMonthlyUsage.ridesCount", 0] },
                  { $ifNull: ["$studentMonthlyUsage.reservedRidesCount", 0] },
                ],
              },
              STUDENT_MAX_MONTHLY_RIDES,
            ],
          },
        ],
      },
    },
    {
      $inc: {
        "studentMonthlyUsage.discountReserved": actualDiscountToReserve,
        "studentMonthlyUsage.reservedRidesCount": 1,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    return {
      success: false,
      discountAmount: 0,
      remainingAllowance: 0,
      remainingRides: 0,
      reason: "Concurrent booking exceeded monthly student discount limit",
    };
  }

  const updatedUsage = updatedUser.studentMonthlyUsage;
  const newCommittedDiscount =
    (updatedUsage?.discountUsed || 0) + (updatedUsage?.discountReserved || 0);
  const newCommittedRides =
    (updatedUsage?.ridesCount || 0) + (updatedUsage?.reservedRidesCount || 0);

  return {
    success: true,
    discountAmount: actualDiscountToReserve,
    remainingAllowance: Math.max(0, STUDENT_MONTHLY_DISCOUNT_CAP - newCommittedDiscount),
    remainingRides: Math.max(0, STUDENT_MAX_MONTHLY_RIDES - newCommittedRides),
  };
}

/**
 * Idempotently releases student discount reservation back to student's balance
 * when a booking is cancelled, expired, or matching fails.
 */
export async function releaseStudentDiscountReservation(
  bookingId: string | Types.ObjectId,
  userId?: string | Types.ObjectId
): Promise<{ released: boolean; releasedAmount: number }> {
  const booking = await Booking.findById(bookingId).select(
    "user studentDiscountReserved studentDiscountFinalized fareBreakdown"
  );

  if (!booking) {
    return { released: false, releasedAmount: 0 };
  }

  // Only release if reservation was active and not already finalized or released
  if (!booking.studentDiscountReserved || booking.studentDiscountFinalized) {
    return { released: false, releasedAmount: 0 };
  }

  const discountAmount = booking.fareBreakdown?.studentDiscount || 0;
  const targetUserId = userId || booking.user;

  // Mark booking as no longer reserved atomically
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      studentDiscountReserved: true,
      studentDiscountFinalized: { $ne: true },
    },
    {
      $set: { studentDiscountReserved: false },
    }
  );

  if (!updatedBooking || discountAmount <= 0) {
    return { released: false, releasedAmount: 0 };
  }

  // Restore user's reserved counters
  await User.updateOne(
    { _id: targetUserId },
    {
      $inc: {
        "studentMonthlyUsage.discountReserved": -discountAmount,
        "studentMonthlyUsage.reservedRidesCount": -1,
      },
    }
  );

  return { released: true, releasedAmount: discountAmount };
}

/**
 * Idempotently finalizes student discount usage when a ride is completed and paid for.
 * Transfers the amount from reserved to finalized (used).
 */
export async function finalizeStudentDiscountUsage(
  bookingId: string | Types.ObjectId,
  userId?: string | Types.ObjectId
): Promise<{ finalized: boolean; finalizedAmount: number }> {
  const booking = await Booking.findById(bookingId).select(
    "user studentDiscountReserved studentDiscountFinalized fareBreakdown"
  );

  if (!booking) {
    return { finalized: false, finalizedAmount: 0 };
  }

  // If already finalized, do nothing (idempotent)
  if (booking.studentDiscountFinalized) {
    return { finalized: false, finalizedAmount: 0 };
  }

  const discountAmount = booking.fareBreakdown?.studentDiscount || 0;
  const targetUserId = userId || booking.user;

  // Atomically claim finalization on the booking
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      studentDiscountFinalized: { $ne: true },
    },
    {
      $set: {
        studentDiscountFinalized: true,
        studentDiscountReserved: false,
      },
    }
  );

  if (!updatedBooking || discountAmount <= 0) {
    return { finalized: false, finalizedAmount: 0 };
  }

  // Transfer from discountReserved to discountUsed, and reservedRidesCount to ridesCount
  await User.updateOne(
    { _id: targetUserId },
    {
      $inc: {
        "studentMonthlyUsage.discountReserved": -discountAmount,
        "studentMonthlyUsage.reservedRidesCount": -1,
        "studentMonthlyUsage.discountUsed": discountAmount,
        "studentMonthlyUsage.ridesCount": 1,
      },
    }
  );

  return { finalized: true, finalizedAmount: discountAmount };
}
