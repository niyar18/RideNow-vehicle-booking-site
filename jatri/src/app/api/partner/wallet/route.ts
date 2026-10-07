export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import PartnerBank from "@/models/partnerBank.model";
import WalletTransaction from "@/models/wallet-transaction.model";
import Withdrawal from "@/models/withdrawal.model";
import Booking from "@/models/booking.model";
import { getOrCreateWallet } from "@/lib/walletLedger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const driver = await User.findById(session.user.id).select(
      "_id name email role walletBalance vendorStatus"
    );

    if (!driver || driver.role !== "vendor") {
      return NextResponse.json(
        { message: "Driver profile not found or unauthorized" },
        { status: 403 }
      );
    }

    // Find or initialize Driver Wallet
    const wallet = await getOrCreateWallet(driver._id);

    // Check active / in-flight rides for pending earnings calculation
    const inFlightRides = await Booking.find({
      driver: driver._id,
      status: { $in: ["confirmed", "started"] },
    }).select("fare adminCommission partnerAmount");

    let pendingEarnings = 0;
    for (const ride of inFlightRides) {
      const fare = Number(ride.fare) || 0;
      const commission =
        typeof ride.adminCommission === "number" && ride.adminCommission > 0
          ? ride.adminCommission
          : Math.round(fare * 0.15);
      const estEarning =
        typeof ride.partnerAmount === "number" && ride.partnerAmount > 0
          ? ride.partnerAmount
          : Math.max(0, fare - commission);
      pendingEarnings += estEarning;
    }

    // Calculate Today's Earnings and This Week's Earnings
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const [todayEarningsResult, weekEarningsResult] = await Promise.all([
      WalletTransaction.aggregate([
        {
          $match: {
            userId: driver._id,
            transactionType: "EARNING",
            status: "success",
            createdAt: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      WalletTransaction.aggregate([
        {
          $match: {
            userId: driver._id,
            transactionType: "EARNING",
            status: "success",
            createdAt: { $gte: startOfWeek },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const todayEarnings = todayEarningsResult[0]?.total || 0;
    const weekEarnings = weekEarningsResult[0]?.total || 0;
    const platformDues = wallet.platformDues || 0;
    const withdrawableBalance = Math.max(0, (wallet.balance || 0) - platformDues);

    // Fetch driver transactions
    const transactions = await WalletTransaction.find({ userId: driver._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: "bookingId",
        select: "pickupAddress dropAddress fare vehicle paymentStatus status",
      })
      .lean();

    // Fetch recent withdrawals
    const withdrawals = await Withdrawal.find({ driver: driver._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Fetch linked bank details
    const bank = await PartnerBank.findOne({ owner: driver._id }).lean();

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet._id.toString(),
        userId: driver._id.toString(),
        balance: wallet.balance,
        availableEarnings: wallet.balance,
        withdrawableBalance,
        pendingEarnings,
        platformDues,
        currency: wallet.currency || "INR",
        totalEarnings: wallet.totalEarnings || 0,
        totalCommission: wallet.totalCommission || 0,
        totalWithdrawn: wallet.totalWithdrawn || 0,
        todayEarnings,
        weekEarnings,
        updatedAt: wallet.updatedAt,
      },
      availableEarnings: wallet.balance,
      withdrawableBalance,
      pendingEarnings,
      platformDues,
      todayEarnings,
      weekEarnings,
      metrics: {
        totalEarnings: wallet.totalEarnings || 0,
        totalCommission: wallet.totalCommission || 0,
        totalWithdrawn: wallet.totalWithdrawn || 0,
        transactionCount: transactions.length,
      },
      bankDetails: bank
        ? {
            accountHolderName: bank.accountHolderName,
            maskedAccount: bank.accountNumber ? `•••• ${bank.accountNumber.slice(-4)}` : undefined,
            ifsc: bank.ifsc,
            upi: bank.upi,
            status: bank.status,
          }
        : null,
      withdrawals,
      transactions,
    });
  } catch (error: any) {
    console.error("GET /api/partner/wallet error:", error);
    return NextResponse.json(
      { message: `Failed to fetch driver wallet: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
