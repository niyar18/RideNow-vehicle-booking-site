import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { confirmRideWalletPayment, notifyRidePaymentConfirmed } from "@/lib/rideWalletPayment";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { method, useWallet, walletAmount } = await req.json().catch(() => ({})) ?? {};
    if (method !== "cash") {
      return NextResponse.json(
        { message: "Invalid payment method for offline confirmation. Online payments must be verified through the payment gateway." },
        { status: 400 }
      );
    }

    if (useWallet === true && walletAmount != null && typeof walletAmount !== "number") {
      return NextResponse.json({ message: "Invalid wallet amount" }, { status: 400 });
    }

    if (!(await connectDb())) throw new Error("Database unavailable");
    const user =
      (session.user.id && await User.findById(session.user.id).select("_id role").lean()) ||
      (session.user.email && await User.findOne({ email: session.user.email }).select("_id role").lean());
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const result = await confirmRideWalletPayment({
      bookingId: (await context.params).id,
      actorId: user._id.toString(),
      mode: "cash",
      walletAmount: useWallet === true ? walletAmount ?? 0 : 0,
      canConfirmOfflineForOthers: user.role === "admin",
    });
    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: result.status });
    }
    const { booking, alreadyConfirmed } = result;
    if (!alreadyConfirmed) await notifyRidePaymentConfirmed(booking);
    return NextResponse.json({
      success: true,
      alreadyConfirmed,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      pickupOtp: booking.pickupOtp,
      cashAmountDue: booking.cashAmountDue,
      walletAmountPaid: booking.walletAmountPaid,
      booking,
    });
  } catch (error) {
    console.error("POST confirm-payment error:", error);
    return NextResponse.json({ message: "Could not confirm payment" }, { status: 500 });
  }
}
