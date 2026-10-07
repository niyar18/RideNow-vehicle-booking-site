export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import WalletTransaction from "@/models/wallet-transaction.model";
import { getOrCreateWallet } from "@/lib/walletLedger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email: session.user.email }).select("_id name email walletBalance outstandingAmount role");

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const wallet = await getOrCreateWallet(user._id);
    const currentBalance = wallet.balance ?? user.walletBalance ?? 0;
    const outstandingAmount = wallet.outstandingAmount ?? (user as any).outstandingAmount ?? 0;

    // Fetch last 50 transactions
    const transactions = await WalletTransaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: "bookingId",
        select: "pickup drop fare vehicle status",
      })
      .lean();

    // Calculate aggregated summary
    let totalAdded = 0;
    let totalSpent = 0;

    for (const tx of transactions) {
      if (tx.status === "success") {
        if (tx.type === "credit") {
          totalAdded += tx.amount;
        } else if (tx.type === "debit") {
          totalSpent += tx.amount;
        }
      }
    }

    return NextResponse.json({
      success: true,
      balance: currentBalance,
      outstandingAmount,
      summary: {
        totalAdded,
        totalSpent,
        transactionCount: transactions.length,
      },
      transactions,
    });
  } catch (error: any) {
    console.error("GET /api/wallet error:", error);
    return NextResponse.json(
      { message: `Failed to fetch wallet: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
