import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { confirmRideWalletPayment, notifyRidePaymentConfirmed } from "@/lib/rideWalletPayment";
import { rateLimiter } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await req.json().catch(() => ({})) ?? {};
    if (typeof bookingId !== "string" || !bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    if (!(await connectDb())) throw new Error("Database unavailable");
    const user = session.user.id
      ? await User.findById(session.user.id).select("_id").lean()
      : await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const actorId = user._id.toString();
    if (!rateLimiter.check(`wallet:pay:${actorId}`, 10, 60_000).allowed) {
      return NextResponse.json(
        { error: "Too many payment attempts. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const result = await confirmRideWalletPayment({ bookingId, actorId, mode: "wallet" });
    if ("error" in result) {
      const { status, ...body } = result;
      return NextResponse.json(body, { status });
    }
    const { booking, alreadyConfirmed, transactionId, newBalance } = result;
    if (!alreadyConfirmed) await notifyRidePaymentConfirmed(booking);
    return NextResponse.json({
      success: true,
      isIdempotentReplay: alreadyConfirmed,
      message: alreadyConfirmed ? "Booking is already paid" : "Payment successful via RideNow Wallet",
      transactionId,
      newBalance,
      pickupOtp: booking.pickupOtp,
      booking,
    });
  } catch (error) {
    console.error("POST /api/wallet/pay error:", error);
    return NextResponse.json({ error: "Payment via wallet failed" }, { status: 500 });
  }
}
