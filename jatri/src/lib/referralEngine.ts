/**
 * RideNow Passenger Rewards & Referral Engine (Phase 6)
 *
 * Rules:
 * 1. Referrer gets ₹50 wallet credit when referee completes their first paid ride.
 * 2. Referee gets ₹30 off their first eligible ride (minimum fare ₹100).
 * 3. Maximum 5 successful rewarded referrals per referrer per calendar month (Asia/Kolkata).
 * 4. Referral validity is 30 days from registration / code claiming.
 * 5. Reward credits have 90-day validity.
 * 6. Strict anti-fraud:
 *    - No self-referrals (referrerId !== refereeId).
 *    - Genuinely new user check (0 prior completed rides).
 *    - Single referral per referee lifetime.
 *    - No promo stacking (cannot combine with student discount).
 *    - Atomic status transition to prevent duplicate reward credits.
 */

import crypto from "crypto";
import { Types } from "mongoose";
import connectDb from "@/lib/db";
import User, { IUser } from "@/models/user.model";
import Booking, { IBooking } from "@/models/booking.model";
import Referral, { IReferral } from "@/models/referral.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/wallet-transaction.model";

export const REFERRER_REWARD_AMOUNT = 50; // ₹50 wallet credit
export const REFEREE_DISCOUNT_AMOUNT = 30; // ₹30 off first ride
export const MIN_REFEREE_FARE = 100; // ₹100 minimum fare
export const MAX_MONTHLY_REFERRALS = 5; // 5 per referrer per month
export const REFERRAL_VALIDITY_DAYS = 30; // 30 days validity
export const REWARD_EXPIRY_DAYS = 90; // 90 days reward validity
export const REFERRAL_TIMEZONE = "Asia/Kolkata";

/**
 * Returns canonical IST month key (e.g. "2026-10")
 */
export function getReferralMonthKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: REFERRAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(date); // Format: "YYYY-MM"
}

/**
 * Generates a clean, readable referral code (e.g. RN + 4 alphanumeric uppercase characters, no ambiguous chars).
 */
export function generateReferralCode(): string {
  // Exclude 0, O, 1, I to avoid ambiguity on mobile screens
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(4);
  let code = "RN";
  for (let i = 0; i < 4; i++) {
    code += charset[bytes[i] % charset.length];
  }
  return code;
}

/**
 * Ensures a user has a unique referral code, generating and saving one if missing.
 */
export async function ensureUserReferralCode(userId: string | Types.ObjectId): Promise<string> {
  await connectDb();
  const user = await User.findById(userId).select("referralCode");
  if (!user) throw new Error("User not found");

  if (user.referralCode) {
    return user.referralCode;
  }

  // Generate unique code with collision retry
  let attempts = 0;
  while (attempts < 10) {
    const candidate = generateReferralCode();
    const collision = await User.findOne({ referralCode: candidate });
    if (!collision) {
      user.referralCode = candidate;
      await user.save();
      return candidate;
    }
    attempts++;
  }

  // Fallback with timestamp suffix
  const fallback = `RN${Date.now().toString(36).toUpperCase().slice(-4)}`;
  user.referralCode = fallback;
  await user.save();
  return fallback;
}

/**
 * Retrieves the referrer's current monthly usage against the 5 referrals/month cap.
 */
export async function getReferrerMonthlyAllowance(
  referrerId: string | Types.ObjectId,
  targetDate: Date = new Date()
): Promise<{ monthKey: string; count: number; remainingAllowance: number }> {
  await connectDb();
  const monthKey = getReferralMonthKey(targetDate);

  const user = await User.findById(referrerId).select("monthlyReferrals");
  if (!user) {
    return { monthKey, count: 0, remainingAllowance: MAX_MONTHLY_REFERRALS };
  }

  const currentMonthKey = user.monthlyReferrals?.monthKey || "";
  let count = 0;
  if (currentMonthKey === monthKey) {
    count = user.monthlyReferrals?.count || 0;
  }

  const remainingAllowance = Math.max(0, MAX_MONTHLY_REFERRALS - count);
  return { monthKey, count, remainingAllowance };
}

/**
 * Claims a referral code for a new user.
 */
export async function claimReferralCode(params: {
  refereeId: string | Types.ObjectId;
  referralCode: string;
}): Promise<{
  success: boolean;
  message: string;
  referral?: IReferral;
  discountAmount?: number;
}> {
  await connectDb();
  const { refereeId, referralCode } = params;

  if (!referralCode || typeof referralCode !== "string") {
    return { success: false, message: "Please provide a valid referral code." };
  }

  const normalizedCode = referralCode.trim().toUpperCase();

  // 1. Look up referrer by code
  const referrer = await User.findOne({ referralCode: normalizedCode }).select("_id name");
  if (!referrer) {
    return { success: false, message: "Invalid referral code. Please check and try again." };
  }

  // 2. Anti-fraud check: Self-referral prevention
  if (referrer._id.toString() === refereeId.toString()) {
    return { success: false, message: "You cannot use your own referral code." };
  }

  // 3. Anti-fraud check: User has already been referred
  const existingReferral = await Referral.findOne({ refereeId });
  if (existingReferral) {
    return {
      success: false,
      message: "You have already claimed a referral code on this account.",
    };
  }

  // 4. Anti-fraud check: Genuinely new user check (0 completed rides)
  const priorCompletedRides = await Booking.countDocuments({
    user: refereeId,
    status: "completed",
  });

  if (priorCompletedRides > 0) {
    return {
      success: false,
      message: "Referral discounts are only available to new riders for their first trip.",
    };
  }

  // 5. Expiration calculation: 30 days from claiming
  const expiresAt = new Date(Date.now() + REFERRAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  // 6. Create referral record
  try {
    const referral = await Referral.create({
      referrerId: referrer._id,
      refereeId,
      referralCode: normalizedCode,
      status: "pending",
      refereeDiscountUsed: false,
      refereeDiscountAmount: REFEREE_DISCOUNT_AMOUNT,
      referrerRewardAmount: REFERRER_REWARD_AMOUNT,
      expiresAt,
    });

    // Link user.referredBy
    await User.findByIdAndUpdate(refereeId, {
      referredBy: referrer._id,
    });

    return {
      success: true,
      message: `Referral code applied! You get ₹${REFEREE_DISCOUNT_AMOUNT} off your first ride (min fare ₹${MIN_REFEREE_FARE}).`,
      referral,
      discountAmount: REFEREE_DISCOUNT_AMOUNT,
    };
  } catch (err: any) {
    if (err?.code === 11000) {
      return { success: false, message: "A referral has already been claimed for this account." };
    }
    throw err;
  }
}

/**
 * Checks if a user is eligible for a referral discount on an upcoming booking.
 * Enforces:
 * - Must have an active, non-expired pending referral.
 * - Minimum fare: ₹100.
 * - First ride only (0 completed rides).
 * - No promo stacking with student pass discount.
 */
export async function evaluateReferralDiscountForBooking(params: {
  userId: string | Types.ObjectId;
  baseFare: number;
  isStudent?: boolean;
  readOnly?: boolean;
}): Promise<{
  isEligible: boolean;
  discountAmount: number;
  referralId?: string;
  reason?: string;
}> {
  await connectDb();
  const { userId, baseFare, isStudent, readOnly = false } = params;

  // 1. Strict anti-stacking: Cannot combine referral discount with student pass
  if (isStudent) {
    return {
      isEligible: false,
      discountAmount: 0,
      reason: "Promotional discounts cannot be stacked with Student Pass benefits.",
    };
  }

  // 2. Minimum fare requirement: ₹100
  if (baseFare < MIN_REFEREE_FARE) {
    return {
      isEligible: false,
      discountAmount: 0,
      reason: `Referral discount requires a minimum fare of ₹${MIN_REFEREE_FARE}.`,
    };
  }

  // 3. Find active pending referral
  const referral = await Referral.findOne({
    refereeId: userId,
    status: "pending",
    refereeDiscountUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!referral) {
    return {
      isEligible: false,
      discountAmount: 0,
      reason: "No active referral promotion found for this account.",
    };
  }

  // 4. Verify 0 prior completed rides
  const priorCompleted = await Booking.countDocuments({
    user: userId,
    status: "completed",
  });

  if (priorCompleted > 0) {
    // If the user already finished a ride, mark referral as expired/invalid
    if (!readOnly) {
      referral.status = "expired";
      referral.rejectionReason = "User has already completed prior rides.";
      await referral.save();
    }
    return {
      isEligible: false,
      discountAmount: 0,
      reason: "Referral discount only applies to your first completed ride.",
    };
  }

  return {
    isEligible: true,
    discountAmount: REFEREE_DISCOUNT_AMOUNT,
    referralId: referral._id.toString(),
  };
}

/**
 * Processes referral reward payout to the referrer upon referee ride completion.
 *
 * Enforces:
 * 1. Booking must be "completed".
 * 2. Fare >= ₹100.
 * 3. Referee must have completed 0 other rides before this one.
 * 4. Referrer monthly cap (max 5 successful referrals per month).
 * 5. Atomic state update from "pending" to "rewarded" to guarantee strict idempotency.
 * 6. Credits ₹50 to referrer's wallet with 90-day expiry metadata.
 */
export async function processReferralRewardOnRideCompletion(
  bookingId: string | Types.ObjectId
): Promise<{
  success: boolean;
  rewarded: boolean;
  message: string;
  bonusAmount?: number;
}> {
  await connectDb();
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return { success: false, rewarded: false, message: "Booking not found." };
  }

  if (booking.status !== "completed") {
    return { success: false, rewarded: false, message: "Ride is not completed." };
  }

  // Check if booking fare meets the minimum ₹100 requirement
  const fare = booking.fare || booking.fareBreakdown?.totalFare || 0;
  if (fare < MIN_REFEREE_FARE) {
    return {
      success: true,
      rewarded: false,
      message: `Fare was ₹${fare}, below minimum ₹${MIN_REFEREE_FARE} threshold for referral rewards.`,
    };
  }

  const refereeId = booking.user;

  // Find active referral for this referee
  const referral = await Referral.findOne({
    refereeId,
    status: "pending",
  });

  if (!referral) {
    return {
      success: true,
      rewarded: false,
      message: "No pending referral found for this passenger.",
    };
  }

  // Check if this was indeed their first completed ride
  const priorCompletedCount = await Booking.countDocuments({
    user: refereeId,
    status: "completed",
    _id: { $ne: booking._id },
  });

  if (priorCompletedCount > 0) {
    referral.status = "flagged";
    referral.rejectionReason = "Referee already completed prior rides before this booking.";
    await referral.save();
    return {
      success: true,
      rewarded: false,
      message: "Referee already completed a prior trip; referral reward flagged.",
    };
  }

  const referrerId = referral.referrerId;
  const monthKey = getReferralMonthKey(new Date());

  // Check referrer's monthly cap
  const allowance = await getReferrerMonthlyAllowance(referrerId);
  if (allowance.remainingAllowance <= 0) {
    // Referrer reached their monthly limit of 5 referrals
    referral.status = "qualified";
    referral.rejectionReason = `Monthly referrer cap of ${MAX_MONTHLY_REFERRALS} reached for ${monthKey}.`;
    referral.qualifyingBookingId = booking._id;
    await referral.save();
    return {
      success: true,
      rewarded: false,
      message: `Referrer reached monthly cap of ${MAX_MONTHLY_REFERRALS} successful referrals.`,
    };
  }

  // Atomic state transition: ONLY one concurrent execution can transition "pending" -> "rewarded"
  const updatedReferral = await Referral.findOneAndUpdate(
    { _id: referral._id, status: "pending" },
    {
      $set: {
        status: "rewarded",
        rewardedAt: new Date(),
        qualifyingBookingId: booking._id,
        refereeDiscountUsed: true,
      },
    },
    { new: true }
  );

  if (!updatedReferral) {
    // Already transitioned by another concurrent call
    return {
      success: true,
      rewarded: false,
      message: "Referral already processed or credited concurrently.",
    };
  }

  // Credit ₹50 to referrer wallet
  const rewardAmount = REFERRER_REWARD_AMOUNT;
  const expiryDate = new Date(Date.now() + REWARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Atomic wallet balance update
  const wallet = await Wallet.findOneAndUpdate(
    { userId: referrerId },
    {
      $inc: {
        balance: rewardAmount,
        totalEarnings: rewardAmount,
      },
    },
    { new: true, upsert: true }
  );

  const balanceBefore = wallet.balance - rewardAmount;
  const balanceAfter = wallet.balance;

  // Create audit transaction
  const txnId = `REF_${Date.now().toString(36).toUpperCase()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const tx = await WalletTransaction.create({
    transactionId: txnId,
    userId: referrerId,
    walletId: wallet._id,
    type: "credit",
    transactionType: "REFERRAL_REWARD",
    category: "promo_bonus",
    amount: rewardAmount,
    balanceBefore,
    balanceAfter,
    description: `Referral Reward: A friend completed their first ride on RideNow`,
    status: "success",
    metadata: {
      referralId: updatedReferral._id,
      refereeId,
      bookingId: booking._id,
      monthKey,
      rewardExpiresAt: expiryDate,
    },
  });

  // Synchronize User.walletBalance and update referrer monthly/total stats
  const referrerUser = await User.findById(referrerId).select("monthlyReferrals");
  const isSameMonth = referrerUser?.monthlyReferrals?.monthKey === monthKey;
  const newMonthlyCount = isSameMonth ? (referrerUser?.monthlyReferrals?.count || 0) + 1 : 1;

  await User.findByIdAndUpdate(referrerId, {
    $inc: {
      walletBalance: rewardAmount,
      referralCount: 1,
    },
    $set: {
      "monthlyReferrals.monthKey": monthKey,
      "monthlyReferrals.count": newMonthlyCount,
      "monthlyReferrals.lastResetAt": new Date(),
    },
  });

  updatedReferral.walletTransactionId = tx._id;
  await updatedReferral.save();

  return {
    success: true,
    rewarded: true,
    bonusAmount: rewardAmount,
    message: `₹${rewardAmount} referral reward successfully credited to referrer wallet.`,
  };
}

/**
 * Fetches dashboard details for the passenger referral programme.
 */
export async function getUserReferralDashboard(userId: string | Types.ObjectId) {
  await connectDb();
  const code = await ensureUserReferralCode(userId);
  const allowance = await getReferrerMonthlyAllowance(userId);

  const referrals = await Referral.find({ referrerId: userId })
    .populate("refereeId", "name email createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const totalReferrals = referrals.length;
  const successfulReferrals = referrals.filter((r) => r.status === "rewarded").length;
  const totalEarnings = successfulReferrals * REFERRER_REWARD_AMOUNT;

  // Check if current user was referred by someone
  const user = await User.findById(userId).select("referredBy");
  let myReferralStatus = null;
  if (user?.referredBy) {
    const myRef = await Referral.findOne({ refereeId: userId }).lean();
    if (myRef) {
      myReferralStatus = {
        status: myRef.status,
        discountUsed: myRef.refereeDiscountUsed,
        discountAmount: myRef.refereeDiscountAmount,
        expiresAt: myRef.expiresAt,
      };
    }
  }

  return {
    referralCode: code,
    shareUrl: `https://ridenow.in/referral?code=${code}`,
    monthlyAllowance: {
      monthKey: allowance.monthKey,
      completedThisMonth: allowance.count,
      maxMonthly: MAX_MONTHLY_REFERRALS,
      remainingThisMonth: allowance.remainingAllowance,
    },
    stats: {
      totalReferrals,
      successfulReferrals,
      totalEarnings,
      rewardPerReferral: REFERRER_REWARD_AMOUNT,
      refereeDiscount: REFEREE_DISCOUNT_AMOUNT,
      minFareRequired: MIN_REFEREE_FARE,
    },
    myReferralStatus,
    referralsList: referrals.map((r: any) => ({
      id: r._id.toString(),
      refereeName: r.refereeId?.name || "Passenger",
      status: r.status,
      discountUsed: r.refereeDiscountUsed,
      rewardedAt: r.rewardedAt,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    })),
  };
}
