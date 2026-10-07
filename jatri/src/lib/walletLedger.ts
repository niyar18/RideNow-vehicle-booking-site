/**
 * RideNow Unified Wallet & Ledger Engine (Phase 8)
 *
 * Enforces:
 * 1. Immutable ledger history with unique transaction IDs (TXN_...)
 * 2. Absolute duplicate-earning prevention (idempotent ride settlements)
 * 3. Atomic deductions: balance cannot become negative unintentionally
 * 4. Comprehensive withdrawal lifecycle (pending -> processing -> success | failed/refunded)
 * 5. Cancellation refunds and driver compensation ledger updates
 * 6. Audited admin ledger adjustments
 * 7. Guaranteed synchronization between Wallet document and User.walletBalance
 */
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Wallet, { IWallet } from "@/models/wallet.model";
import WalletTransaction, {
  CleanWalletType,
  TransactionCategory,
} from "@/models/wallet-transaction.model";
import Withdrawal, { IWithdrawal, WithdrawalStatus } from "@/models/withdrawal.model";
import Booking from "@/models/booking.model";
import PartnerBank from "@/models/partnerBank.model";
import { Types } from "mongoose";
import crypto from "crypto";

export function generateTransactionId(prefix = "TXN"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

export function generateWithdrawalId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `WTH_${timestamp}_${random}`;
}

/**
 * Finds or initializes the authoritative Wallet for a user.
 */
export async function getOrCreateWallet(userId: string | Types.ObjectId): Promise<IWallet> {
  await connectDb();
  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    const user = await User.findById(userId).select("walletBalance");
    const initialBalance = user?.walletBalance || 0;

    wallet = await Wallet.create({
      userId,
      balance: initialBalance,
      currency: "INR",
      totalEarnings: 0,
      totalCommission: 0,
      totalWithdrawn: 0,
    });
  }

  return wallet;
}

/**
 * Credits driver ride earnings upon ride completion.
 * Strictly prevents duplicate earnings.
 */
export async function creditDriverRideEarnings(params: {
  bookingId: string | Types.ObjectId;
  driverId: string | Types.ObjectId;
  fare: number;
  adminCommission?: number;
  partnerAmount?: number;
  paymentMethod?: string;
}) {
  await connectDb();
  const { bookingId, driverId, fare } = params;

  // 1. Idempotency Check: Prevent duplicate earning credits for the same ride
  const existingCredit = await WalletTransaction.findOne({
    userId: driverId,
    bookingId,
    transactionType: "EARNING",
  });

  if (existingCredit) {
    return {
      alreadyProcessed: true,
      transactionId: existingCredit.transactionId,
      message: "Driver earnings already credited for this ride",
    };
  }

  const commission =
    typeof params.adminCommission === "number" && params.adminCommission >= 0
      ? Math.round(params.adminCommission)
      : Math.round(fare * 0.15);

  const netEarnings =
    typeof params.partnerAmount === "number" && params.partnerAmount >= 0
      ? Math.round(params.partnerAmount)
      : Math.max(0, fare - commission);

  const wallet = await getOrCreateWallet(driverId);
  const currentDues = wallet.platformDues || 0;
  const balanceBefore = wallet.balance || 0;

  let duesSettled = 0;
  let remainingDues = currentDues;
  let netWithdrawableCredit = netEarnings;

  // Auto-settle outstanding platform dues from new online ride net earnings
  if (currentDues > 0) {
    duesSettled = Math.min(currentDues, netEarnings);
    remainingDues = currentDues - duesSettled;
    netWithdrawableCredit = netEarnings - duesSettled;
  }

  const balanceAfter = balanceBefore + netWithdrawableCredit;

  // Atomic wallet update: credit withdrawable earnings, deduct settled dues, update lifetime counters
  await Wallet.findByIdAndUpdate(wallet._id, {
    balance: balanceAfter,
    platformDues: remainingDues,
    $inc: {
      totalEarnings: netEarnings,
      totalCommission: commission,
    },
  });

  // Sync user legacy balance
  await User.findByIdAndUpdate(driverId, {
    walletBalance: balanceAfter,
  });

  const earningTxnId = generateTransactionId("TXN_EARN");
  const commissionTxnId = generateTransactionId("TXN_COM");

  // Record EARNING transaction
  await WalletTransaction.create({
    transactionId: earningTxnId,
    walletId: wallet._id,
    userId: driverId,
    rideId: bookingId,
    bookingId,
    type: "credit",
    transactionType: "EARNING",
    category: "partner_earning",
    amount: netEarnings,
    balanceBefore,
    balanceAfter: balanceBefore + netEarnings,
    platformDuesBefore: currentDues,
    platformDuesAfter: remainingDues,
    description: `Driver earnings (${Math.round((netEarnings / fare) * 100)}%) for ride #${bookingId.toString().slice(-6)}`,
    status: "success",
    metadata: {
      grossFare: fare,
      commission,
      netEarnings,
      duesSettled,
    },
  });

  // If dues were auto-settled from earnings, log audit transaction
  if (duesSettled > 0) {
    const settleTxnId = generateTransactionId("TXN_DUES");
    await WalletTransaction.create({
      transactionId: settleTxnId,
      walletId: wallet._id,
      userId: driverId,
      rideId: bookingId,
      bookingId,
      type: "debit",
      transactionType: "SETTLE_DUES",
      category: "settle_dues",
      amount: duesSettled,
      balanceBefore: balanceBefore + netEarnings,
      balanceAfter,
      platformDuesBefore: currentDues,
      platformDuesAfter: remainingDues,
      description: `Auto-settled ₹${duesSettled} platform dues from online ride #${bookingId.toString().slice(-6)}`,
      status: "success",
      metadata: {
        settledAmount: duesSettled,
        remainingDues,
      },
    });
  }

  // Record platform COMMISSION audit transaction
  await WalletTransaction.create({
    transactionId: commissionTxnId,
    walletId: wallet._id,
    userId: driverId,
    rideId: bookingId,
    bookingId,
    type: "debit",
    transactionType: "COMMISSION",
    category: "commission_deduct",
    amount: commission,
    balanceBefore: balanceAfter,
    balanceAfter,
    platformDuesBefore: remainingDues,
    platformDuesAfter: remainingDues,
    description: `Platform commission (15%) recorded for ride #${bookingId.toString().slice(-6)}`,
    status: "success",
    metadata: {
      grossFare: fare,
      commission,
    },
  });

  return {
    alreadyProcessed: false,
    success: true,
    earningTxnId,
    driverEarnings: netEarnings,
    duesSettled,
    remainingDues,
    commission,
    newBalance: balanceAfter,
  };
}

/**
 * Debits platform commission for CASH rides:
 * 1. Records CASH_COLLECTION transaction (+100% fare received by driver in hand).
 * 2. If available balance can cover commission, deducts from balance.
 * 3. Any uncovered commission amount is accrued to platformDues.
 */
export async function debitDriverCashCommission(params: {
  bookingId: string | Types.ObjectId;
  driverId: string | Types.ObjectId;
  fare: number;
  adminCommission?: number;
}) {
  await connectDb();
  const { bookingId, driverId, fare } = params;

  // Idempotency: Prevent duplicate commission deductions
  const existingDeduct = await WalletTransaction.findOne({
    userId: driverId,
    bookingId,
    transactionType: "COMMISSION",
  });

  if (existingDeduct) {
    return {
      alreadyProcessed: true,
      transactionId: existingDeduct.transactionId,
      message: "Commission already recorded for this cash ride",
    };
  }

  const commission =
    typeof params.adminCommission === "number" && params.adminCommission >= 0
      ? Math.round(params.adminCommission)
      : Math.round(fare * 0.15);

  const wallet = await getOrCreateWallet(driverId);
  const balanceBefore = wallet.balance || 0;
  const duesBefore = wallet.platformDues || 0;

  // Log physical CASH_COLLECTION in driver's hand
  const cashTxnId = generateTransactionId("TXN_CASH");
  await WalletTransaction.create({
    transactionId: cashTxnId,
    walletId: wallet._id,
    userId: driverId,
    rideId: bookingId,
    bookingId,
    type: "credit",
    transactionType: "CASH_COLLECTION",
    category: "cash_collection",
    amount: fare,
    balanceBefore,
    balanceAfter: balanceBefore,
    platformDuesBefore: duesBefore,
    platformDuesAfter: duesBefore,
    description: `Cash collected by driver (₹${fare}) for ride #${bookingId.toString().slice(-6)}`,
    status: "success",
    metadata: {
      grossFare: fare,
      cashReceived: true,
    },
  });

  let balanceAfter = balanceBefore;
  let duesAfter = duesBefore;

  if (balanceBefore >= commission) {
    // Available balance fully covers platform commission
    balanceAfter = balanceBefore - commission;
    await Wallet.findByIdAndUpdate(wallet._id, {
      balance: balanceAfter,
      $inc: { totalCommission: commission },
    });
  } else {
    // Available balance partially or non-existent: deduct what's available and add remainder to platformDues
    const covered = Math.max(0, balanceBefore);
    const uncoveredDues = commission - covered;
    balanceAfter = 0;
    duesAfter = duesBefore + uncoveredDues;

    await Wallet.findByIdAndUpdate(wallet._id, {
      balance: 0,
      platformDues: duesAfter,
      $inc: { totalCommission: commission },
    });
  }

  // Sync user legacy balance
  await User.findByIdAndUpdate(driverId, {
    walletBalance: balanceAfter,
  });

  const txnId = generateTransactionId("TXN_COM");
  await WalletTransaction.create({
    transactionId: txnId,
    walletId: wallet._id,
    userId: driverId,
    rideId: bookingId,
    bookingId,
    type: "debit",
    transactionType: "COMMISSION",
    category: "commission_deduct",
    amount: commission,
    balanceBefore,
    balanceAfter,
    platformDuesBefore: duesBefore,
    platformDuesAfter: duesAfter,
    description: `Platform commission for Cash ride #${bookingId.toString().slice(-6)}${
      duesAfter > duesBefore ? ` (₹${duesAfter - duesBefore} added to platform dues)` : ""
    }`,
    status: "success",
    metadata: {
      grossFare: fare,
      commission,
      cashRide: true,
      platformDuesAccrued: duesAfter - duesBefore,
    },
  });

  return {
    alreadyProcessed: false,
    success: true,
    commission,
    newBalance: balanceAfter,
    newPlatformDues: duesAfter,
    transactionId: txnId,
  };
}

/**
 * Settles outstanding platform dues when a driver pays RideNow directly via Razorpay/UPI.
 */
export async function settleDriverPlatformDues(params: {
  driverId: string | Types.ObjectId;
  amount: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
}) {
  await connectDb();
  const { driverId, amount, razorpayPaymentId, razorpayOrderId } = params;
  const payAmount = Math.round(Number(amount));

  if (!payAmount || isNaN(payAmount) || payAmount <= 0) {
    throw new Error("Invalid settlement amount");
  }

  const wallet = await getOrCreateWallet(driverId);
  const duesBefore = wallet.platformDues || 0;
  const duesAfter = Math.max(0, duesBefore - payAmount);

  await Wallet.findByIdAndUpdate(wallet._id, {
    platformDues: duesAfter,
  });

  const txnId = generateTransactionId("TXN_SETTLE");
  await WalletTransaction.create({
    transactionId: txnId,
    walletId: wallet._id,
    userId: driverId,
    type: "credit",
    transactionType: "SETTLE_DUES",
    category: "settle_dues",
    amount: payAmount,
    balanceBefore: wallet.balance,
    balanceAfter: wallet.balance,
    platformDuesBefore: duesBefore,
    platformDuesAfter: duesAfter,
    razorpayPaymentId,
    razorpayOrderId,
    description: `Platform dues cleared (₹${payAmount}) by driver via online settlement`,
    status: "success",
  });

  return {
    success: true,
    paidAmount: payAmount,
    duesBefore,
    duesAfter,
    transactionId: txnId,
  };
}

/**
 * Requests a driver payout/withdrawal with duplicate prevention & balance locking.
 */
export async function requestDriverWithdrawal(params: {
  driverId: string | Types.ObjectId;
  amount: number;
  idempotencyKey?: string;
}) {
  await connectDb();
  const { driverId, amount, idempotencyKey } = params;
  const withdrawAmount = Math.round(Number(amount));

  if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount < 100) {
    throw new Error("Minimum withdrawal amount is ₹100");
  }

  // Check linked bank account or UPI
  const bank = await PartnerBank.findOne({ owner: driverId });
  if (!bank || (!bank.accountNumber && !bank.upi)) {
    throw new Error("Please link your bank account or UPI ID before requesting a payout");
  }

  // Duplicate Check: Check idempotency key or recent active pending withdrawal
  if (idempotencyKey) {
    const existing = await Withdrawal.findOne({ idempotencyKey });
    if (existing) {
      return {
        success: true,
        isDuplicate: true,
        withdrawal: existing,
        message: "Duplicate withdrawal request prevented",
      };
    }
  }

  const recentPending = await Withdrawal.findOne({
    driver: driverId,
    status: { $in: ["pending", "processing"] },
    createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }, // within last 2 minutes
  });

  if (recentPending) {
    throw new Error("A payout request is already being processed. Please wait a few moments.");
  }

  const wallet = await getOrCreateWallet(driverId);
  const dues = wallet.platformDues || 0;
  const maxWithdrawable = Math.max(0, (wallet.balance || 0) - dues);

  if (withdrawAmount > maxWithdrawable) {
    if (dues > 0) {
      throw new Error(
        `Cannot withdraw ₹${withdrawAmount}. You have ₹${dues} in unpaid platform dues. Max withdrawable amount is ₹${maxWithdrawable.toLocaleString("en-IN")}.`
      );
    }
    throw new Error(`Insufficient balance. Available earnings: ₹${(wallet.balance || 0).toLocaleString("en-IN")}`);
  }

  // Atomic deduction: ensure driver has sufficient available earnings
  const updatedWallet = await Wallet.findOneAndUpdate(
    {
      _id: wallet._id,
      balance: { $gte: withdrawAmount },
    },
    {
      $inc: {
        balance: -withdrawAmount,
      },
    },
    { new: true }
  );

  if (!updatedWallet) {
    throw new Error(`Insufficient balance. Available earnings: ₹${(wallet.balance || 0).toLocaleString("en-IN")}`);
  }

  // Sync user balance
  await User.findByIdAndUpdate(driverId, {
    $inc: { walletBalance: -withdrawAmount },
  });

  const withdrawalId = generateWithdrawalId();
  const txnId = generateTransactionId("TXN_WTH");

  const payoutDestination = bank.accountNumber
    ? `${bank.accountHolderName} (•••• ${bank.accountNumber.slice(-4)}, IFSC: ${bank.ifsc})`
    : `UPI: ${bank.upi}`;

  const withdrawal = await Withdrawal.create({
    withdrawalId,
    driver: driverId,
    wallet: updatedWallet._id,
    amount: withdrawAmount,
    status: "pending",
    payoutDestination,
    bankDetails: {
      accountHolderName: bank.accountHolderName,
      accountNumber: bank.accountNumber ? `•••• ${bank.accountNumber.slice(-4)}` : undefined,
      ifsc: bank.ifsc,
      upi: bank.upi,
    },
    transactionId: txnId,
    idempotencyKey: idempotencyKey || `wth_${driverId}_${Date.now()}`,
  });

  // Record initial debit transaction
  await WalletTransaction.create({
    transactionId: txnId,
    walletId: updatedWallet._id,
    userId: driverId,
    withdrawalId: withdrawal._id,
    type: "debit",
    transactionType: "WITHDRAWAL",
    category: "withdrawal",
    amount: withdrawAmount,
    balanceBefore: wallet.balance,
    balanceAfter: updatedWallet.balance,
    description: `Payout initiated to ${payoutDestination}`,
    status: "pending",
    metadata: {
      withdrawalId,
      payoutDestination,
    },
  });

  return {
    success: true,
    isDuplicate: false,
    withdrawal,
    newBalance: updatedWallet.balance,
    transactionId: txnId,
  };
}

/**
 * Resolves a withdrawal (marks success OR fails and auto-refunds back to wallet).
 */
export async function resolveWithdrawal(params: {
  withdrawalId: string;
  status: "success" | "failed" | "reversed";
  failureReason?: string;
  adminId?: string | Types.ObjectId;
}) {
  await connectDb();
  const { withdrawalId, status, failureReason, adminId } = params;

  const withdrawal = await Withdrawal.findOne({ withdrawalId });
  if (!withdrawal) {
    throw new Error("Withdrawal request not found");
  }

  if (["success", "failed", "reversed"].includes(withdrawal.status)) {
    return {
      success: true,
      alreadySettled: true,
      withdrawal,
      message: `Withdrawal is already in '${withdrawal.status}' status`,
    };
  }

  if (status === "success") {
    withdrawal.status = "success";
    withdrawal.processedAt = new Date();
    if (adminId) withdrawal.processedBy = new Types.ObjectId(adminId.toString());
    await withdrawal.save();

    // Increment totalWithdrawn on Wallet
    await Wallet.findByIdAndUpdate(withdrawal.wallet, {
      $inc: { totalWithdrawn: withdrawal.amount },
    });

    // Mark corresponding transaction as success
    if (withdrawal.transactionId) {
      await WalletTransaction.findOneAndUpdate(
        { transactionId: withdrawal.transactionId },
        { $set: { status: "success" } }
      );
    }

    return { success: true, status: "success", withdrawal };
  } else {
    // FAILED or REVERSED: Automatically restore driver's balance
    withdrawal.status = status;
    withdrawal.failureReason = failureReason || "Payout transfer rejected by bank or gateway";
    withdrawal.processedAt = new Date();
    if (adminId) withdrawal.processedBy = new Types.ObjectId(adminId.toString());

    // Restore balance to Wallet and User
    const wallet = await Wallet.findById(withdrawal.wallet);
    const balanceBefore = wallet?.balance || 0;
    const balanceAfter = balanceBefore + withdrawal.amount;

    await Wallet.findByIdAndUpdate(withdrawal.wallet, {
      $inc: { balance: withdrawal.amount },
    });

    await User.findByIdAndUpdate(withdrawal.driver, {
      $inc: { walletBalance: withdrawal.amount },
    });

    // Create refund adjustment transaction
    const refundTxnId = generateTransactionId("TXN_ADJ");
    await WalletTransaction.create({
      transactionId: refundTxnId,
      walletId: withdrawal.wallet,
      userId: withdrawal.driver,
      withdrawalId: withdrawal._id,
      adminId: adminId ? new Types.ObjectId(adminId.toString()) : undefined,
      type: "credit",
      transactionType: "ADJUSTMENT",
      category: "withdrawal_refund",
      amount: withdrawal.amount,
      balanceBefore,
      balanceAfter,
      description: `Payout reversed & refunded to wallet: ${withdrawal.failureReason}`,
      status: "success",
      metadata: {
        withdrawalId,
        failureReason: withdrawal.failureReason,
      },
    });

    withdrawal.refundTransactionId = refundTxnId;
    await withdrawal.save();

    // Mark initial transaction as failed
    if (withdrawal.transactionId) {
      await WalletTransaction.findOneAndUpdate(
        { transactionId: withdrawal.transactionId },
        { $set: { status: "failed" } }
      );
    }

    return {
      success: true,
      status,
      withdrawal,
      refundedAmount: withdrawal.amount,
      restoredBalance: balanceAfter,
    };
  }
}

/**
 * Processes refund on ride cancellation and credits driver compensation if applicable.
 */
export async function processRideCancellationRefund(params: {
  bookingId: string | Types.ObjectId;
  riderId: string | Types.ObjectId;
  driverId?: string | Types.ObjectId;
  refundAmount: number;
  cancellationFee: number;
  cancellationFeeApplied: boolean;
  driverCompensation?: number;
  reason?: string;
}) {
  await connectDb();
  const {
    bookingId,
    riderId,
    driverId,
    refundAmount,
    cancellationFee,
    cancellationFeeApplied,
    reason,
  } = params;

  let riderTxn = null;
  let driverTxn = null;

  // 1. Credit Rider Refund if refundAmount > 0
  if (refundAmount > 0) {
    const riderWallet = await getOrCreateWallet(riderId);
    const rBefore = riderWallet.balance || 0;
    const rAfter = rBefore + refundAmount;

    await Wallet.findByIdAndUpdate(riderWallet._id, {
      $inc: { balance: refundAmount },
    });

    await User.findByIdAndUpdate(riderId, {
      $inc: { walletBalance: refundAmount },
    });

    const riderTxnId = generateTransactionId("TXN_REF");
    riderTxn = await WalletTransaction.create({
      transactionId: riderTxnId,
      walletId: riderWallet._id,
      userId: riderId,
      rideId: bookingId,
      bookingId,
      type: "credit",
      transactionType: "REFUND",
      category: "ride_refund",
      amount: refundAmount,
      balanceBefore: rBefore,
      balanceAfter: rAfter,
      description: cancellationFeeApplied
        ? `Refund for ride #${bookingId.toString().slice(-6)} (₹${cancellationFee} cancellation penalty applied)`
        : `100% full refund for cancelled ride #${bookingId.toString().slice(-6)}`,
      status: "success",
      metadata: {
        cancellationFee,
        cancellationFeeApplied,
        reason,
      },
    });
  }

  // 2. Compensate Driver if penalty was applied
  const compFee = params.driverCompensation || (cancellationFeeApplied && cancellationFee > 0 ? Math.max(30, cancellationFee - 10) : 0);
  if (cancellationFeeApplied && compFee > 0 && driverId) {
    const driverWallet = await getOrCreateWallet(driverId);
    const dBefore = driverWallet.balance || 0;
    const dAfter = dBefore + compFee;

    await Wallet.findByIdAndUpdate(driverWallet._id, {
      $inc: {
        balance: compFee,
        totalEarnings: compFee,
      },
    });

    await User.findByIdAndUpdate(driverId, {
      $inc: { walletBalance: compFee },
    });

    const driverTxnId = generateTransactionId("TXN_COMP");
    driverTxn = await WalletTransaction.create({
      transactionId: driverTxnId,
      walletId: driverWallet._id,
      userId: driverId,
      rideId: bookingId,
      bookingId,
      type: "credit",
      transactionType: "EARNING",
      category: "partner_earning",
      amount: compFee,
      balanceBefore: dBefore,
      balanceAfter: dAfter,
      description: `Driver cancellation compensation for ride #${bookingId.toString().slice(-6)}`,
      status: "success",
      metadata: {
        cancellationFee,
        driverCompensation: compFee,
        reason,
      },
    });
  }

  return {
    success: true,
    refundAmount,
    cancellationFee,
    driverCompensation: compFee,
    riderTxn,
    driverTxn,
  };
}

/**
 * Executes an audited admin balance adjustment (credit or debit).
 */
export async function executeAdminAdjustment(params: {
  adminId: string | Types.ObjectId;
  targetUserId: string | Types.ObjectId;
  amount: number;
  type: "credit" | "debit";
  reason: string;
  notes?: string;
}) {
  await connectDb();
  const { adminId, targetUserId, amount, type, reason, notes } = params;
  const adjustAmount = Math.round(Number(amount));

  if (!adjustAmount || isNaN(adjustAmount) || adjustAmount <= 0) {
    throw new Error("Adjustment amount must be a positive number");
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error("A clear justification reason is required for admin ledger adjustments");
  }

  const wallet = await getOrCreateWallet(targetUserId);

  if (type === "debit") {
    // Enforce non-negative balance guard on intentional debit adjustments
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        balance: { $gte: adjustAmount },
      },
      {
        $inc: { balance: -adjustAmount },
      },
      { new: true }
    );

    if (!updatedWallet) {
      throw new Error(`Cannot debit ₹${adjustAmount}. User balance is only ₹${wallet.balance || 0}`);
    }

    await User.findByIdAndUpdate(targetUserId, {
      $inc: { walletBalance: -adjustAmount },
    });

    const txnId = generateTransactionId("TXN_ADJ");
    const txn = await WalletTransaction.create({
      transactionId: txnId,
      walletId: wallet._id,
      userId: targetUserId,
      adminId,
      type: "debit",
      transactionType: "ADJUSTMENT",
      category: "admin_adjustment",
      amount: adjustAmount,
      balanceBefore: wallet.balance,
      balanceAfter: updatedWallet.balance,
      description: `Admin Debit: ${reason}`,
      status: "success",
      metadata: { notes, adminId: adminId.toString() },
    });

    return { success: true, type, amount: adjustAmount, newBalance: updatedWallet.balance, transaction: txn };
  } else {
    // Credit adjustment
    const balanceBefore = wallet.balance || 0;
    const balanceAfter = balanceBefore + adjustAmount;

    await Wallet.findByIdAndUpdate(wallet._id, {
      $inc: { balance: adjustAmount },
    });

    await User.findByIdAndUpdate(targetUserId, {
      $inc: { walletBalance: adjustAmount },
    });

    const txnId = generateTransactionId("TXN_ADJ");
    const txn = await WalletTransaction.create({
      transactionId: txnId,
      walletId: wallet._id,
      userId: targetUserId,
      adminId,
      type: "credit",
      transactionType: "ADJUSTMENT",
      category: "admin_adjustment",
      amount: adjustAmount,
      balanceBefore,
      balanceAfter,
      description: `Admin Credit: ${reason}`,
      status: "success",
      metadata: { notes, adminId: adminId.toString() },
    });

    return { success: true, type, amount: adjustAmount, newBalance: balanceAfter, transaction: txn };
  }
}
